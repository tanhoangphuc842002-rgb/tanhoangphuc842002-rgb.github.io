/* Dual Nordic DFU: private encrypted applications and existing legacy packages.
 * Public key only; ciphertext stays encrypted until the device bootloader.
 * Based on Web Bluetooth DFU by Rob Moran, retained MIT library alongside. */
(() => {
 'use strict';
 const ids=['file','start-button','new-device-button','clear-log-button','package-info','progress','status','log'];
 const ui=Object.fromEntries(ids.map(n=>[n,document.getElementById('dfu-'+n)]));
 const service='0000fe59-0000-1000-8000-00805f9b34fb';
 let busy=false,waiting=false,images=null,meta=null,info=null,phase=0,device=null,generation=0;
 const status=s=>{ui.status.textContent=s;},log=s=>{ui.log.value+='['+new Date().toLocaleTimeString('vi-VN')+'] '+(typeof t==='function'?t(s):s)+'\n';ui.log.scrollTop=ui.log.scrollHeight;};
 function controls(){ui.file.disabled=busy;ui['start-button'].disabled=busy||!images;ui['new-device-button'].disabled=busy||!images;ui['clear-log-button'].disabled=busy;}
 const message=e=>e?.message||String(e);
 function release(){if(device?.gatt?.connected)device.gatt.disconnect();device=null;}
 function reset(clearApp=false){
  if(busy||(clearApp&&window.EpdAutoUpdate?.busy()))return;release();
  if(clearApp&&typeof bleDevice!=='undefined'&&bleDevice){
   try{if(typeof disconnect==='function')bleDevice.removeEventListener('gattserverdisconnected',disconnect);}catch(_){}
   try{if(bleDevice.gatt?.connected)bleDevice.gatt.disconnect();}catch(_){}
   bleDevice=null;if(typeof resetVariables==='function')resetVariables();
   const button=document.getElementById('connectbutton');if(button)button.textContent=typeof t==='function'?t('Scan Devices'):'Quét thiết bị';
  }
  waiting=false;phase=0;ui.progress.value=0;ui['start-button'].textContent='Bắt đầu cập nhật';status(images?'Sẵn sàng chọn đồng hồ khác.':'Hãy chọn file cập nhật .zip.');controls();window.dispatchEvent?.(new CustomEvent('dh-ota-reset'));
 }
 function timeout(p,ms=15000){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Hết thời gian chờ phản hồi. Kết nối lại rồi thử cùng file.')),ms);})]).finally(()=>clearTimeout(timer));}
 const alreadyExecuted=e=>/Operation not permitted|Operation is not permitted/i.test(message(e));
 function createDfu(){
  SecureDfu.SERVICE_UUID=service;
  const dfu=new SecureDfu(CRC32.buf,navigator.bluetooth,10),control=dfu.sendControl.bind(dfu);
  dfu.sendControl=(...args)=>timeout(control(...args));
  dfu.transfer=async function(data,kind,select,create){
   const ack=await this.sendControl(select);
   if(ack.byteLength!==12)throw Error('Không xác định được trạng thái vùng nạp.');
   const max=ack.getUint32(0,true),crc=ack.getInt32(8,true);let offset=ack.getUint32(4,true);
   if(!max||max>0x100000)throw Error('Thông tin vùng nạp không hợp lệ.');
   const matches=offset<=data.byteLength&&this.checkCrc(data.slice(0,offset),crc);
   if(kind==='init'){
    // A different cached command is replaced through Nordic CREATE_COMMAND.
    // Never mix its resume offset with this package's signed init packet.
    if(!matches)offset=0;
    if(offset===data.byteLength){try{await this.sendControl([4]);}catch(e){if(!alreadyExecuted(e))throw e;}return;}
   }else{
    if(offset>data.byteLength)throw Error('Thông tin vùng nạp không hợp lệ.');
    if(offset&&!matches)throw Error('Dữ liệu của lần cập nhật trước không khớp file đang chọn. Hãy chọn lại đúng file hoặc liên hệ hỗ trợ.');
   }
   this.progress=n=>this.dispatchEvent('progress',{object:kind,totalBytes:data.byteLength,currentBytes:n});
   this.progress(offset);await this.transferObject(data,create,max,offset);
  };
  dfu.transferObject=async function(data,create,max,offset){
   // Commit a complete but unexecuted object before resuming. An already
   // executed object alone may return OPERATION_NOT_PERMITTED; other failures
   // are never swallowed. Partial objects are completed before recreating.
   if(offset&&(offset%max===0||offset===data.byteLength)){
    try{await this.sendControl([4]);}catch(e){if(!alreadyExecuted(e))throw e;}
   }
   let begin=offset-offset%max;
   if(offset%max===0)begin=offset;
   if(offset===data.byteLength)return;
   while(begin<data.byteLength){
    const end=Math.min(begin+max,data.byteLength),size=new DataView(new ArrayBuffer(4));size.setUint32(0,end-begin,true);
    let success=false;
    for(let attempt=0;attempt<3;attempt++){
     const resume=attempt===0&&offset>begin&&offset<end;
     if(!resume){await this.sendControl(create,size.buffer);await this.delayPromise(100);}
     await this.transferData(data.slice(resume?offset:begin,end),resume?offset:begin);
     const ack=await this.sendControl([3]);
     if(ack.byteLength!==8||ack.getUint32(0,true)!==end||!this.checkCrc(data.slice(0,end),ack.getInt32(4,true))){
      if(attempt===2)throw Error('Kiểm tra dữ liệu chưa đạt sau nhiều lần thử. Đã dừng cập nhật; hãy kết nối lại và thử cùng file.');
      log('Đang gửi lại phần dữ liệu chưa được xác nhận.');continue;
     }
     await this.sendControl([4]);success=true;break;
    }
    if(!success)throw Error('Chưa ghi xong vùng dữ liệu.');
    begin=end;offset=end;
   }
  };
  dfu.addEventListener('log',e=>log(e.message));
  dfu.addEventListener('progress',e=>{ui.progress.value=e.totalBytes?100*e.currentBytes/e.totalBytes:0;status('Đang gửi '+(e.object==='init'?'thông tin cập nhật':'phần mềm')+': '+Math.round(ui.progress.value)+'%');});
  return dfu;
 }
 async function load(buffer,name='update.zip'){
  if(busy)throw Error('Đang cập nhật. Chờ hoàn tất trước khi chọn file khác.');
  const token=++generation;images=null;info=null;meta=null;phase=0;waiting=false;release();busy=true;controls();ui.progress.value=0;
  try{
   const pkg=await new SecureDfuPackage(buffer).load(),manifest=JSON.parse(await pkg.zipFile.file('manifest.json').async('string'));
   const base=await pkg.getBaseImage(),app=await pkg.getAppImage();
   if(!base&&!app)throw Error('File không chứa dữ liệu cập nhật.');
   const encrypted=manifest.dh_encrypted_ota;
   if(encrypted){
    if(encrypted.format!=='DHE1'||base||!app||Object.keys(manifest.manifest).length!==1||app.imageData.byteLength>(encrypted.model_id===0x0752?0x11000:encrypted.model_id===0x0751?0x10000:0xd000)||app.initData.byteLength>256)throw Error('Gói mã hóa không hợp lệ.');
    info=await DHOtaVerify(app,encrypted);meta=encrypted;
   }else{
    for(const image of [base,app].filter(Boolean))if(DHOtaInspect(image))throw Error('Gói mã hóa thiếu thông tin xác thực. Đã dừng trước khi gửi.');
   }
   if(token!==generation)return false;
   images=[base,app].filter(Boolean);ui['package-info'].textContent=name+(meta?' — '+meta.model:'');
   ui['start-button'].textContent='Bắt đầu cập nhật';status('Gói đã sẵn sàng. Bấm Bắt đầu cập nhật.');log('Đã kiểm tra gói cập nhật.');return true;
  }catch(e){images=null;info=null;meta=null;ui['package-info'].textContent='Chưa có gói hợp lệ.';status('Chưa tải được gói: '+message(e));log(message(e));return false;}
  finally{busy=false;controls();}
 }
 async function probe(dfu){
  let caps;
  try{caps=await dfu.sendControl([6,0xe1]);}
  catch(e){
   // The Nordic library maps the old bootloader's unsupported SELECT object
   // to INVALID_OBJECT. Network/timeouts must not be mistaken for legacy.
   if(/Data object does not match the firmware and hardware requirements|Unsupported type|Command not supported/i.test(message(e)))return null;
   throw e;
  }
  if(caps.byteLength!==12||caps.getUint32(0,true)!==0x31454844)throw Error('Không xác định được loại cập nhật của thiết bị. Đã dừng trước khi ghi.');
  return {model:caps.getUint32(4,true)&65535,keyId:caps.getUint32(4,true)>>>16,version:caps.getUint32(8,true)};
 }
 async function start(){
  if(busy||!images)return;
  if(window.VNDataBusy?.()||window.EpdAutoUpdate?.busy()||window.countdownOperationBusy||(typeof clockImageUploadBusy!=='undefined'&&clockImageUploadBusy)){status('Chờ thao tác hiện tại hoàn tất rồi cập nhật.');return;}
  if(!navigator.bluetooth?.requestDevice){status('Dùng Chrome/Edge trên máy tính, Chrome trên Android hoặc Bluefy trên iPhone.');return;}
  busy=true;controls();let mark=null;
  try{
   const dfu=createDfu();
   if(!waiting&&typeof bleDevice!=='undefined'&&bleDevice?.gatt?.connected){
    if(typeof deviceProtocol!=='undefined'&&deviceProtocol!==PROTOCOL_NRF52)throw Error('Thiết bị không hỗ trợ mục cập nhật này.');
    device=await timeout(dfu.setDfuMode(bleDevice));
   }else device=await dfu.requestDevice(!waiting,waiting?[{services:[service]}]:[{namePrefix:'NRF_EPD'},{services:[service]}]);
   if(!device){waiting=true;ui['start-button'].textContent='Chọn DFUTAG và cập nhật';status('Đồng hồ đã chuyển sang DFU. Bấm nút lần nữa và chọn DFUTAG để nạp.');return;}
   waiting=true;await timeout(dfu.connect(device));const caps=await probe(dfu);
   if(meta){
    if(!caps)throw Error('Thiết bị chưa hỗ trợ OTA mã hóa. Dùng file OTA riêng cho thiết bị đời cũ.');
    if(caps.model!==info.model||caps.keyId!==info.keyId)throw Error('Gói dành cho loại đồng hồ khác. Đã dừng trước khi gửi.');
    if(info.version<=caps.version)throw Error('Cần gói mới hơn bản đang dùng.');
   }else if(caps)throw Error('Thiết bị này cần file cập nhật mã hóa; không nhận OTA cũ.');
   const image=images[phase];let disconnected=false;mark=()=>{disconnected=true;};device.addEventListener('gattserverdisconnected',mark);
   await dfu.transferInit(image.initData);await dfu.transferFirmware(image.imageData);
   // A reset after the last successfully acknowledged EXECUTE is expected.
   // Earlier disconnects reject control/write promises, never count as success.
   if(!disconnected&&device.gatt.connected)await new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);device.removeEventListener('gattserverdisconnected',done);resolve();};device.addEventListener('gattserverdisconnected',done);timer=setTimeout(done,8000);});
   if(device.gatt.connected)throw Error('Đã gửi dữ liệu nhưng chưa xác nhận được đồng hồ khởi động lại. Kết nối lại để kiểm tra.');
   device.removeEventListener('gattserverdisconnected',mark);mark=null;phase++;ui.progress.value=100;
   if(phase<images.length){waiting=true;ui['start-button'].textContent='Chọn DFUTAG và tiếp tục';status('Đã gửi thành phần hệ thống. Bấm nút và chọn DFUTAG để gửi phần mềm đồng hồ.');}
   else{waiting=false;phase=0;ui['start-button'].textContent='Cập nhật đồng hồ khác';status('Đã gửi cập nhật. Đồng hồ đang khởi động lại; hãy kết nối lại để kiểm tra.');window.dispatchEvent?.(new CustomEvent('dh-ota-sent',{detail:info}));}
  }catch(e){status('Cập nhật chưa hoàn tất: '+message(e));log(message(e));ui['start-button'].textContent=waiting?'Chọn DFUTAG và thử lại':'Thử lại';}
  finally{if(mark&&device)device.removeEventListener('gattserverdisconnected',mark);release();busy=false;controls();}
 }
 ui.file.addEventListener('change',async e=>{const f=e.target.files[0];if(f&&!busy&&!window.EpdAutoUpdate?.busy()){window.dispatchEvent?.(new CustomEvent('dh-ota-reset'));await load(f,f.name);}});
 ui['start-button'].addEventListener('click',start);ui['new-device-button'].addEventListener('click',()=>reset(true));
 ui['clear-log-button'].addEventListener('click',()=>{if(!busy)ui.log.value='';});
 window.EpdDfuBusy=()=>busy;window.EpdDfu={load,start,reset,refresh:controls,unload(){if(busy)return;images=null;meta=null;info=null;waiting=false;phase=0;controls();},busy:()=>busy,info:()=>info};controls();
})();
