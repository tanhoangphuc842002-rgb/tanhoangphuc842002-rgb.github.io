'use strict';
const $=id=>document.getElementById(id),svc='62750001-d828-918d-fb46-b6c11c675aec',chr='62750002-d828-918d-fb46-b6c11c675aec',ver='62750003-d828-918d-fb46-b6c11c675aec';
let displayPending=null;
let device,gatt,ch,pending,seq=0,busy=false,cap=null,session=0,currentMode=null,firmware=0,actionId=0;
const bytes=Uint8Array.from(atob(Font420Bundle.bytes),c=>c.charCodeAt(0));
const errors=['','Đồng hồ hoặc dữ liệu chưa sẵn sàng.','Chưa ghi được bộ nhớ. Hãy kiểm tra pin và kết nối.','Đồng hồ chưa nhận đủ dữ liệu. Hãy thử lại.','Đồng hồ chưa xác nhận dữ liệu. Hãy thử lại.','Lệnh chưa hợp lệ.','Vùng lưu ảnh riêng đã có dữ liệu của thiết bị. Không thể lưu ảnh ở vùng này.'];
function log(t){$('log').textContent+=new Date().toLocaleTimeString('vi-VN')+' — '+t+'\n';$('log').scrollTop=$('log').scrollHeight;}
const serviceNotes = [];
function serviceLog(message) {
    serviceNotes.push(new Date().toLocaleTimeString('vi-VN') + ' — ' + message);
}
function customerError(error) {
    if (!(error instanceof DOMException)) return error.message;
    serviceLog(error.name + ': ' + error.message);
    if (error.name === 'NotFoundError') return 'Chưa chọn được đồng hồ. Hãy thử chọn lại.';
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        return 'Trình duyệt chưa cho phép kết nối. Hãy mở trang bằng Chrome hoặc Edge và cho phép Bluetooth.';
    }
    if (error.name === 'NetworkError') return 'Kết nối Bluetooth bị gián đoạn. Hãy đặt đồng hồ gần hơn rồi thử lại.';
    return 'Kiểm tra kết nối với đồng hồ rồi thử lại.';
}
function status(t){$('status').textContent=t;log(t);}
function controls(){const ok=!!gatt?.connected&&!!cap;for(const id of ['install','check','show','calendar','bigClock','sync'])$(id).disabled=!ok||busy;$('bigClock').disabled=!ok||busy||firmware<0xa4;for(const id of ['art1','artCalendar','art2','common','pictureTear','readTasks','saveTasks','openTasks','taskView'])$(id).disabled=!ok||busy||firmware<0xac||!cap?.ready||cap.crc!==Font420Bundle.crc32;for(const id of ['countdown','saveCountdown','readCountdown']) $(id).disabled=!ok||busy||firmware<0xb1||!cap.ready||cap.crc!==Font420Bundle.crc32;$('connect').disabled=busy||!!gatt?.connected;
 $('reconnect').disabled=busy||!device;
 window.photoControls?.();
 window.dailyControls?.();
 window.ota42Controls?.();
 $('taskView').options[1].disabled=firmware<0xb3;
 $('segmentClock').disabled=!ok||busy||firmware<0xbb||!cap.ready||cap.crc!==Font420Bundle.crc32;
 if(firmware<0xb3&&$('taskView').value==='12')$('taskView').value='8';
 $('taskCompatibility').hidden=!ok||firmware>=0xb3;
 for(const field of document.querySelectorAll('[data-extra-task]'))field.hidden=ok&&taskCapacity()<6;
 $('taskCapacity').hidden=ok&&taskCapacity()<6;
 for(const [id,mode] of [['calendar',1],['bigClock',4],['art1',5],['artCalendar',6],['art2',7],['common',8],['pictureTear',9],['countdown',11],['quoteClock',13],['clockPhoto',14],['segmentClock',15]])
  $(id).setAttribute('aria-current',String(mode===currentMode&&ok));$('stop').disabled=!gatt?.connected||window.ota42Switching?.()===true;}
function u32(n){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;}
function value32(b,at){return new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(at,true);}
function notice(event){if(event.target!==ch)return;const b=new Uint8Array(event.target.value.buffer,event.target.value.byteOffset,event.target.value.byteLength);if(b.length===13&&b[7]===2&&(b[11]<=9||(b[11]>=11&&b[11]<=15))){currentMode=b[11];return;}const text=new TextDecoder().decode(b);if(text==='ink=ok'||text==='ink=timeout'){log(text==='ink=ok'?(firmware===0xad?'Đã dọn nền trắng toàn màn và tô lại đen/đỏ.':'Đã tô lại đen và đỏ, không dọn nền trắng.'):'Tô lại màu chưa hoàn tất; đồng hồ sẽ thử phục hồi ở phút tiếp theo.');return;}if(text==='partial=0'||text==='partial=1'){log(text==='partial=0'?'Đã chọn cập nhật một lượt như v1.2.':'Đã chọn thử xóa nét cũ.');return;}if(text==='display=ok'){if(displayPending)displayPending.finish();log('Đồng hồ đã hoàn tất làm mới màn hình.');return;}if(text==='display=timeout'){if(displayPending)displayPending.finish(Error('Màn hình chưa phản hồi đúng hạn. Đồng hồ sẽ thử lại ở phút tiếp theo; có thể bấm Đồng bộ giờ để thử ngay.'));status('Màn hình chưa phản hồi đúng hạn. Đồng hồ sẽ thử lại ở phút tiếp theo; bấm Đồng bộ giờ để thử ngay.');return;}if(b.length>=5&&b[0]===0xe8&&b[1]===0x42){if(pending&&b[2]===pending.op&&b[3]===pending.seq){const p=pending;p.reply=b.slice();p.complete();}return;}}
async function request(op,payload=new Uint8Array()){
 if(!gatt?.connected||!ch)throw Error('Đã mất kết nối. Kết nối lại rồi thử tiếp.');if(pending)throw Error('Đang chờ đồng hồ xử lý.');
 const packet=new Uint8Array(4+payload.length);packet.set([0xe8,0x42,op,++seq&255]);packet.set(payload,4);
 const connection=ch,token=session;
 return new Promise((resolve,reject)=>{
  const p={op,seq:packet[3],reject,reply:null,written:false};
  p.finish=(error)=>{if(pending!==p)return;pending=null;clearTimeout(p.timer);error?reject(error):resolve(p.reply);};
  p.complete=()=>{
   if(pending!==p||!p.written||!p.reply)return;
   if(session!==token||connection!==ch){p.finish(Error('Kết nối đã đổi. Kết nối lại rồi thử tiếp.'));return;}
   p.finish(p.reply[4]?Error(errors[p.reply[4]]||'Thiết bị báo lỗi '+p.reply[4]):null);
  };
  p.timer=setTimeout(()=>{if(pending!==p)return;log('Đã chờ 45 giây không có phản hồi; web sẽ ngắt kết nối để có thể thử lại.');p.finish(Error('Đồng hồ chưa phản hồi. Kết nối lại rồi thử tiếp.'));if(connection===ch&&device?.gatt?.connected)device.gatt.disconnect();},45000);
  pending=p;
  // A notification can arrive before the browser finishes its GATT write.
  // Keep the packet pending until BOTH have finished before sending the next one.
  Promise.resolve().then(()=>connection.writeValueWithResponse(packet)).then(()=>{p.written=true;p.complete();},e=>p.finish(e));
 });
}
function disconnected(event, preserveAction=false){if(event?.target&&event.target!==device)return;preserveAction ||= !!event && window.ota42Switching?.()===true;const wasBusy=busy;window.photoDisconnected?.();if(displayPending)displayPending.finish(Error('Kết nối đã ngắt trong lúc làm mới màn hình.'));session++;if(!preserveAction)actionId++;if(ch)ch.removeEventListener('characteristicvaluechanged',notice);device?.removeEventListener?.('gattserverdisconnected',disconnected);gatt=null;ch=null;cap=null;if(pending)pending.finish(Error('Kết nối đã ngắt.'));if(!preserveAction)busy=false;$('state').textContent='Đã ngắt kết nối';controls();log('Đã ngắt kết nối.');if(wasBusy&&!preserveAction)status('Đã dừng do mất kết nối. Bấm Kết nối lại để tiếp tục.');}
async function info(){const b=await request(0);if(b.length!==20)throw Error('Phản hồi nhận diện chưa hợp lệ.');cap={present:!!b[5],ready:!!b[6],id:Array.from(b.slice(7,10)),size:b[10]|b[11]<<8,crc:value32(b,12),voltage:(b[16]|b[17]<<8)/1000,safe:!!b[18],chunk:Math.max(1,Math.min(180,b[19]))};$('state').textContent=(device?.name||'Đồng hồ')+' · Pin '+cap.voltage.toFixed(2)+' V'+' · '+(cap.ready?'Đã cài dữ liệu mặt đồng hồ':'Chưa cài dữ liệu mặt đồng hồ');return cap;}
async function action(fn){if(busy)return;const id=++actionId;busy=true;controls();try{await fn();}catch(e){if(id===actionId)status('Chưa hoàn tất. '+customerError(e));}finally{if(id===actionId){busy=false;controls();}}}
async function connect420(selected){
 device=selected;
 device.addEventListener('gattserverdisconnected',disconnected,{once:true});
 try {gatt=await device.gatt.connect();const service=await gatt.getPrimaryService(svc);const version=new Uint8Array((await (await service.getCharacteristic(ver)).readValue()).buffer);
 if(version.length!==4||version[0]<0xa0||version[1]!==4||version[2]!==0x32||version[3]!==1){disconnected(undefined,true);selected.gatt.disconnect();device=null;status('Thiết bị đã chọn không dùng được với trang Đồng hồ 4.2. Hãy chọn lại.');return;}
 firmware=version[0];currentMode=null;ch=await service.getCharacteristic(chr);ch.addEventListener('characteristicvaluechanged',notice);await ch.startNotifications();await request(4);await info();await diagnostics();status('Đã kết nối Đồng hồ 4.2 · Phần mềm '+(version[0]>0xbb?'#'+version[0]:version[0]===0xbb?'v1.23':version[0]===0xba?'v1.22':version[0]===0xb9?'v1.21':version[0]===0xb8?'v1.20':version[0]===0xb7?'v1.19':version[0]===0xb6?'v1.18':version[0]===0xb5?'v1.17.1':version[0]===0xb4?'v1.17':version[0]===0xb3?'v1.16':version[0]===0xb2?'v1.15':version[0]===0xb1?'v1.14':version[0]===0xb0?'v1.13':version[0]===0xaf?'v1.12':version[0]===0xae?'v1.11':version[0]===0xad?'v1.10':version[0]===0xac?'v1.9':version[0]===0xab?'v1.8.2':version[0]===0xaa?'v1.8.1':version[0]===0xa9?'v1.8':version[0]===0xa8?'v1.7':version[0]===0xa7?'v1.6':version[0]===0xa6?'v1.5.1':version[0]===0xa5?'v1.5':version[0]===0xa4?'v1.4':version[0]===0xa3?'v1.3':version[0]===0xa2?'v1.2':version[0]===0xa1?'v1.1':'v1.0')+'.');
 window.ota42ApplicationReady?.(firmware);
 } catch(error) {
    disconnected(undefined,true);
    if(selected.gatt.connected)selected.gatt.disconnect();
    throw error;
 }
}
$('connect').onclick=()=>action(async()=>{
 if(!navigator.bluetooth)throw Error('Hãy mở bằng Chrome hoặc Edge có hỗ trợ Bluetooth.');
 const selected=await navigator.bluetooth.requestDevice({filters:[{namePrefix:'NRF_EPD'}],optionalServices:[svc,ota420DfuService]});
 await connect420(selected);
});
$('reconnect').onclick=()=>action(async()=>{
 const selected=device;
 if(!selected)return;
 if(selected.gatt.connected){
    disconnected(undefined,true);
    selected.gatt.disconnect();
    await new Promise(resolve=>setTimeout(resolve,350));
 }
 await connect420(selected);
});
$('stop').onclick=()=>{if(device?.gatt?.connected)device.gatt.disconnect();};
$('check').onclick=()=>action(async()=>{await info();status(cap.ready?'Bộ chữ và dữ liệu mặt đồng hồ đã sẵn sàng.':'Chưa có dữ liệu mặt đồng hồ. Bấm Cài vào đồng hồ.');});
async function install(){
 await request(4);const c=await info(),token=session;if(!c.safe)throw Error('Đồng hồ chưa thể lưu dữ liệu. Gửi nhật ký để được hỗ trợ.');if(!c.present)throw Error('Đồng hồ chưa đọc được bộ nhớ. Kết nối lại rồi thử cài lần nữa.');
 if(c.ready&&c.size===bytes.length&&c.crc===Font420Bundle.crc32){$('progress').value=100;status('Đồng hồ đã có bộ dữ liệu mới nhất.');return;}
 status('Đang cài bộ chữ và dữ liệu ngày lễ. Không ngắt kết nối.');$('progress').value=0;await request(1,new Uint8Array([...u32(bytes.length),...u32(Font420Bundle.crc32)]));
 let last=0;for(let at=0;at<bytes.length;){if(token!==session)throw Error('Kết nối đã đổi.');const part=bytes.slice(at,at+c.chunk),r=await request(2,new Uint8Array([...u32(at),...part]));at+=part.length;if(value32(r,5)!==at)throw Error('Chưa xác nhận đủ dữ liệu.');const pc=Math.floor(at/bytes.length*100);$('progress').value=pc;if(pc-last>=10){last=pc;log('Đã truyền '+pc+'%.');}}
 status('Đang kiểm tra và hoàn tất…');await request(3);await info();if(!cap.ready||cap.crc!==Font420Bundle.crc32)throw Error('Chưa xác nhận được bộ cài.');currentMode=3;status('Cài đặt hoàn tất. Đồng hồ đang hiển thị ba cỡ chữ.');
}
$('install').onclick=()=>action(install);
async function sync(mode=currentMode){if(mode===0&&firmware<0xb2)mode=1;if(mode===null&&firmware===0xa0)throw Error('Hãy chọn Lịch tháng hoặc Đồng hồ trước khi đồng bộ giờ ở bản v1.0.');const sec=Math.floor(Date.now()/1000),p=new Uint8Array([0x20,sec>>>24,sec>>>16&255,sec>>>8&255,sec&255,7,...(mode===null?[]:[mode])]);if(firmware>=0xa5){
 let job;
 const complete=new Promise((resolve,reject)=>{
  job={finish(error){if(displayPending!==job)return;displayPending=null;clearTimeout(job.timer);error?reject(error):resolve();}};
  job.timer=setTimeout(()=>job.finish(Error('Chưa nhận được xác nhận làm mới màn hình. Kết nối lại để thử tiếp.')),50000);displayPending=job;
 });
 status('Đang làm mới màn hình. Chờ đồng hồ hoàn tất…');
 try{await Promise.all([ch.writeValueWithResponse(p),complete]);}catch(error){job.finish(error);throw error;}
 }else await ch.writeValueWithResponse(p);
 currentMode=mode;}
$('bigClock').onclick=()=>action(async()=>{if(firmware<0xa4)throw Error('Cập nhật phần mềm để dùng Đồng hồ lớn.');if(!cap.ready||(firmware>=0xaf&&cap.crc!==Font420Bundle.crc32))throw Error('Vào Cài đặt, chọn Cài chữ và mặt đồng hồ trước.');await sync(4);status('Đã gửi yêu cầu mở Đồng hồ lớn.');});
$('sync').onclick=()=>action(async()=>{await sync();status('Đã gửi ngày giờ hiện tại.');});
$('calendar').onclick=()=>action(async()=>{if(!cap.ready)throw Error('Vào Cài đặt, chọn Cài chữ và mặt đồng hồ trước.');await sync(1);status('Đã gửi yêu cầu mở lịch tháng.');});
function sample(){return new TextEncoder().encode($('text').value.normalize('NFC').trim());}
$('text').oninput=()=>{$('count').textContent=sample().length>111?'Nội dung dài quá. Hãy rút ngắn.':'Dùng câu ngắn để chữ cỡ lớn vừa một dòng.';};$('text').oninput();
$('show').onclick=()=>action(async()=>{const b=sample();if(!b.length||b.length>111)throw Error('Nhập một câu ngắn để thử chữ.');if(b.length+4>cap.chunk+8)throw Error('Kết nối hiện tại chỉ cho phép câu ngắn hơn. Kết nối lại để thử câu dài.');await request(5,b);currentMode=3;status('Đã gửi chữ tiếng Việt. Chờ màn hình làm mới.');});
$('saveLog').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([$('log').textContent, '\nThông tin hỗ trợ\n', serviceNotes.join('\n')],{type:'text/plain;charset=utf-8'}));a.download='nhat-ky-dong-ho-4.2.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
window.Font420Test={install,info,request,disconnected,notice,crcExpected:Font420Bundle.crc32};controls();

for(const [id,mode]of [['art1',5],['artCalendar',6],['art2',7],['common',8],['pictureTear',9],['segmentClock',15]])$(id).onclick=()=>action(async()=>{
 await info();
 if(firmware<(mode===15?0xbb:0xac))throw Error('Cập nhật phần mềm để dùng mặt này.');
 if(!cap.ready||cap.crc!==Font420Bundle.crc32)throw Error('Vào Cài đặt, chọn Cài chữ và mặt đồng hồ.');
 if(mode===9&&firmware>=0xb6)await ensureSceneSamples();
 await sync(mode);
 status('Đã mở '+$(id).textContent.trim()+'.');
});

async function diagnostics(){
 if(firmware<0xaa)return;const b=await request(6);if(b.length!==19)throw Error('Phản hồi kiểm tra kết nối chưa hợp lệ.');
 serviceLog('Flash: '+cap.id.map(n=>n.toString(16).padStart(2,'0').toUpperCase()).join(' '));
 const word=at=>b[at]|b[at+1]<<8;const reason=b[5],names={8:'hết thời gian giữ liên lạc',19:'phía máy tính/điện thoại yêu cầu ngắt',22:'thiết bị chủ động ngắt',59:'không thỏa thuận được tham số kết nối',62:'không thiết lập được kết nối'};
 serviceLog('Kiểm tra kết nối: lần ngắt từ lúc khởi động '+word(6)+'; mã gần nhất 0x'+reason.toString(16).padStart(2,'0')+(word(6)?' ('+(names[reason]||'mã Bluetooth khác')+')':'')+'; mã khởi động 0x'+value32(b,8).toString(16)+'.');
 serviceLog('Bluetooth: chu kỳ '+(word(12)*1.25)+' ms; độ trễ '+word(14)+'; thời gian giữ liên lạc '+(word(16)*10)+' ms.');
}

function taskCapacity(){return firmware>=0xb4?6:2;}
function taskBytes(id){return new TextEncoder().encode($(id).value.normalize('NFC').trim());}
function taskCounts(){for(let i=1;i<=6;i++)$('taskCount'+i).textContent=taskBytes('task'+i).length>63?'Nội dung dài quá. Hãy rút ngắn.':'';}
for(let i=1;i<=6;i++)$('task'+i).oninput=taskCounts;taskCounts();
function crc32(data){let c=0xffffffff;for(const v of data){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
async function writeSavedObject(start,data,onProgress){
 const token=session;
 await request(4);
 const chunk=cap.chunk;
 try{
  await request(start,Uint8Array.from([...u32(data.length),...u32(crc32(data))]));
  for(let at=0;at<data.length;){
   const part=data.subarray(at,at+chunk);
   const reply=await request(start+1,Uint8Array.from([...u32(at),...part]));
   at+=part.length;
   if(reply.length!==9||value32(reply,5)!==at)throw Error('Chưa xác nhận đủ dữ liệu.');
   onProgress?.(at,data.length);
  }
  await request(start+2);
 }catch(error){if(token===session&&gatt?.connected)await request(4).catch(()=>{});throw error;}
}
$('readTasks').onclick=()=>action(async()=>{
 const a=await request(16);if(a.length!==6||a[5]>taskCapacity())throw Error('Danh sách chưa hợp lệ.');
 const list=[];for(let i=0;i<a[5];i++){const parts=[];let at=0,done=false,len=0;
  do{const b=await request(21,Uint8Array.of(i,at));if(b.length<8||b[7]!==at||b[6]>63||b[6]<at||b.length-8>b[6]-at)throw Error('Dữ liệu việc cần làm chưa hợp lệ.');done=!!b[5];len=b[6];const part=b.slice(8);if(!part.length&&at<len)throw Error('Chưa nhận đủ nội dung.');parts.push(...part);at+=part.length;}while(at<len);
  list.push({text:new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(parts)),done});
 }
 for(let i=1;i<=6;i++){$('task'+i).value=list[i-1]?.text||'';$('done'+i).checked=list[i-1]?.done||false;}taskCounts();status('Đã đọc việc cần làm từ đồng hồ.');
});
$('saveTasks').onclick=()=>action(async()=>{
 if(firmware<0xac)throw Error('Cập nhật phần mềm để lưu việc cần làm.');const rows=[];
 for(let i=1;i<=taskCapacity();i++){const b=taskBytes('task'+i);if(b.length>63)throw Error('Việc '+i+' dài quá. Hãy rút ngắn.');if(b.length)rows.push({b,done:$('done'+i).checked});}
 const data=new Uint8Array(8+rows.length*68);data.set([84,52,50,76,1,rows.length]);rows.forEach((v,i)=>{const at=8+i*68;data[at]=v.done?1:0;data[at+1]=v.b.length;data.set(v.b,at+2);});
 status('Đang lưu việc cần làm. Giữ kết nối cho đến khi hoàn tất.');
 await writeSavedObject(17,data);
 await sync(Number($('taskView').value));
 status(rows.length?'Đã lưu và hiển thị việc cần làm.':'Đã xóa danh sách việc cần làm.');
});
$('openTasks').onclick=()=>action(async()=>{
 await sync(Number($('taskView').value));
 status('Đã mở '+$('taskView').selectedOptions[0].textContent+'.');
});

const countdownMetrics=[{" ":[4,0,0],"!":[4,2,1],"\"":[7,5,1],"#":[7,7,0],"$":[8,6,1],"%":[13,11,1],"&":[11,9,1],"'":[4,2,1],"(":[5,3,1],")":[5,3,1],"*":[5,5,0],"+":[9,7,1],",":[4,2,1],"-":[5,4,1],".":[4,2,1],"/":[4,4,0],"0":[8,6,1],"1":[8,4,2],"2":[8,7,0],"3":[8,6,1],"4":[7,7,0],"5":[7,7,0],"6":[8,7,1],"7":[8,6,1],"8":[8,6,1],"9":[8,7,0],":":[4,2,1],";":[4,2,1],"<":[9,7,1],"=":[9,7,1],">":[9,7,1],"?":[9,7,1],"@":[12,12,0],"A":[10,10,0],"B":[10,8,1],"C":[10,8,1],"D":[10,8,1],"E":[9,7,1],"F":[8,7,1],"G":[11,9,1],"H":[10,8,1],"I":[4,2,1],"J":[7,6,0],"K":[10,8,1],"L":[8,7,1],"M":[12,10,1],"N":[10,8,1],"O":[12,10,1],"P":[10,8,1],"Q":[12,10,1],"R":[10,8,1],"S":[10,8,1],"T":[8,8,0],"U":[10,8,1],"V":[9,9,0],"W":[13,13,0],"X":[9,9,0],"Y":[10,8,1],"Z":[8,8,0],"[":[5,3,1],"\\":[4,4,0],"]":[5,4,0],"^":[8,6,1],"_":[8,8,0],"`":[5,2,1],"a":[7,6,0],"b":[8,7,1],"c":[8,6,1],"d":[9,7,1],"e":[7,7,0],"f":[4,4,0],"g":[9,7,1],"h":[9,7,1],"i":[4,2,1],"j":[4,4,-1],"k":[8,6,1],"l":[4,2,1],"m":[12,10,1],"n":[9,7,1],"o":[8,7,1],"p":[8,7,1],"q":[9,7,1],"r":[6,5,1],"s":[8,6,1],"t":[4,4,0],"u":[9,7,1],"v":[8,7,0],"w":[11,11,0],"x":[8,7,0],"y":[8,7,0],"z":[6,6,0],"{":[4,4,0],"|":[4,2,1],"}":[4,4,0],"~":[7,7,0],"À":[10,10,0],"Á":[10,10,0],"Â":[10,10,0],"Ã":[10,9,0],"È":[9,7,1],"É":[9,7,1],"Ê":[9,7,1],"Ì":[4,2,1],"Í":[4,2,1],"Ò":[12,10,1],"Ó":[12,10,1],"Ô":[12,10,1],"Õ":[12,10,1],"Ù":[10,8,1],"Ú":[10,8,1],"Ý":[10,8,1],"à":[7,6,0],"á":[7,6,0],"â":[7,6,0],"ã":[7,6,0],"è":[7,7,0],"é":[7,7,0],"ê":[7,7,0],"ì":[4,3,0],"í":[4,2,1],"ò":[8,7,1],"ó":[8,7,1],"ô":[8,7,1],"õ":[8,7,1],"ù":[9,7,1],"ú":[9,7,1],"ý":[8,7,0],"Ă":[10,10,0],"ă":[7,6,0],"Đ":[10,9,0],"đ":[9,8,1],"Ĩ":[4,5,0],"ĩ":[4,5,0],"Ũ":[10,8,1],"ũ":[9,7,1],"Ơ":[12,11,1],"ơ":[10,9,1],"Ư":[11,10,1],"ư":[10,9,1],"Ạ":[10,10,0],"ạ":[7,6,0],"Ả":[9,9,0],"ả":[7,6,0],"Ấ":[10,10,0],"ấ":[7,6,0],"Ầ":[10,10,0],"ầ":[7,6,0],"Ẩ":[10,9,0],"ẩ":[7,6,0],"Ẫ":[10,9,1],"ẫ":[7,6,0],"Ậ":[10,10,0],"ậ":[7,6,0],"Ắ":[10,10,0],"ắ":[7,6,0],"Ằ":[10,10,0],"ằ":[7,6,0],"Ẳ":[10,9,0],"ẳ":[7,6,0],"Ẵ":[10,9,1],"ẵ":[7,6,0],"Ặ":[10,10,0],"ặ":[7,6,0],"Ẹ":[9,7,1],"ẹ":[7,6,0],"Ẻ":[9,7,1],"ẻ":[7,7,0],"Ẽ":[9,7,1],"ẽ":[7,7,0],"Ế":[9,7,1],"ế":[7,7,0],"Ề":[9,7,1],"ề":[7,7,0],"Ể":[9,7,1],"ể":[7,7,0],"Ễ":[9,7,1],"ễ":[7,7,0],"Ệ":[9,7,1],"ệ":[7,6,0],"Ỉ":[4,3,1],"ỉ":[3,2,1],"Ị":[4,2,1],"ị":[4,2,1],"Ọ":[11,10,1],"ọ":[9,8,1],"Ỏ":[12,10,1],"ỏ":[9,7,1],"Ố":[12,10,1],"ố":[8,7,1],"Ồ":[12,10,1],"ồ":[8,7,1],"Ổ":[12,10,1],"ổ":[9,7,1],"Ỗ":[12,10,1],"ỗ":[8,7,1],"Ộ":[11,10,1],"ộ":[9,8,1],"Ớ":[12,11,1],"ớ":[10,9,1],"Ờ":[12,11,1],"ờ":[10,9,1],"Ở":[12,11,1],"ở":[10,9,1],"Ỡ":[12,11,1],"ỡ":[10,9,1],"Ợ":[12,11,1],"ợ":[10,9,1],"Ụ":[10,8,1],"ụ":[9,7,1],"Ủ":[10,8,1],"ủ":[9,7,1],"Ứ":[11,10,1],"ứ":[10,9,1],"Ừ":[11,10,1],"ừ":[10,9,1],"Ử":[11,10,1],"ử":[10,9,1],"Ữ":[11,10,1],"ữ":[10,9,1],"Ự":[11,10,1],"ự":[10,9,1],"Ỳ":[10,8,1],"ỳ":[8,7,0],"Ỵ":[10,8,1],"ỵ":[7,7,0],"Ỷ":[10,9,1],"ỷ":[7,7,0],"Ỹ":[9,8,0],"ỹ":[7,7,0]},{" ":[5,0,0],"!":[6,3,2],"\"":[8,7,1],"#":[10,10,0],"$":[10,9,1],"%":[16,15,1],"&":[13,12,1],"'":[4,3,1],"(":[6,4,1],")":[6,5,1],"*":[8,6,1],"+":[11,9,1],",":[5,2,2],"-":[6,5,1],".":[5,3,1],"/":[5,5,0],"0":[10,9,1],"1":[10,6,2],"2":[9,9,0],"3":[10,8,1],"4":[9,9,0],"5":[10,9,1],"6":[10,9,1],"7":[10,8,1],"8":[10,9,1],"9":[10,9,1],":":[6,3,2],";":[6,2,2],"<":[11,9,1],"=":[11,9,1],">":[11,9,1],"?":[11,9,1],"@":[18,17,1],"A":[13,13,0],"B":[12,11,1],"C":[13,11,1],"D":[12,11,1],"E":[12,10,1],"F":[11,9,1],"G":[14,12,1],"H":[12,10,1],"I":[5,3,1],"J":[9,8,0],"K":[13,11,1],"L":[11,9,1],"M":[15,13,1],"N":[12,10,1],"O":[14,13,1],"P":[12,10,1],"Q":[14,13,1],"R":[13,11,1],"S":[12,10,1],"T":[10,10,0],"U":[12,10,1],"V":[12,12,0],"W":[17,17,0],"X":[12,12,0],"Y":[12,11,1],"Z":[10,10,0],"[":[6,4,1],"\\":[5,5,0],"]":[6,5,0],"^":[11,8,1],"_":[10,10,0],"`":[6,3,1],"a":[10,8,1],"b":[11,9,1],"c":[10,9,1],"d":[11,9,1],"e":[10,9,1],"f":[6,7,0],"g":[11,9,1],"h":[11,9,1],"i":[5,3,1],"j":[5,5,-1],"k":[10,8,1],"l":[5,3,1],"m":[16,13,1],"n":[11,9,1],"o":[11,10,1],"p":[11,9,1],"q":[11,9,1],"r":[7,6,1],"s":[10,9,1],"t":[5,5,0],"u":[11,9,1],"v":[10,10,0],"w":[14,14,0],"x":[10,10,0],"y":[10,10,0],"z":[8,8,0],"{":[7,6,1],"|":[6,3,2],"}":[7,6,0],"~":[11,9,1],"À":[13,13,0],"Á":[13,13,0],"Â":[13,13,0],"Ã":[13,12,0],"È":[12,10,1],"É":[12,10,1],"Ê":[12,10,1],"Ì":[5,4,0],"Í":[5,3,1],"Ò":[14,13,1],"Ó":[14,13,1],"Ô":[14,13,1],"Õ":[14,13,1],"Ù":[12,10,1],"Ú":[12,10,1],"Ý":[12,11,1],"à":[10,8,1],"á":[10,8,1],"â":[10,8,1],"ã":[10,8,1],"è":[10,9,1],"é":[10,9,1],"ê":[10,9,1],"ì":[5,4,0],"í":[5,3,1],"ò":[11,10,1],"ó":[11,10,1],"ô":[11,10,1],"õ":[11,10,1],"ù":[11,9,1],"ú":[11,9,1],"ý":[10,10,0],"Ă":[13,13,0],"ă":[10,8,1],"Đ":[13,12,0],"đ":[11,10,1],"Ĩ":[6,6,0],"ĩ":[6,6,0],"Ũ":[12,10,1],"ũ":[11,9,1],"Ơ":[16,15,1],"ơ":[13,12,1],"Ư":[15,14,1],"ư":[13,12,1],"Ạ":[13,13,0],"ạ":[10,8,1],"Ả":[13,12,0],"ả":[10,8,1],"Ấ":[13,13,0],"ấ":[10,8,1],"Ầ":[13,13,0],"ầ":[10,8,1],"Ẩ":[13,13,0],"ẩ":[10,8,1],"Ẫ":[13,12,0],"ẫ":[10,8,1],"Ậ":[13,13,0],"ậ":[10,8,1],"Ắ":[13,13,0],"ắ":[10,8,1],"Ằ":[13,13,0],"ằ":[10,8,1],"Ẳ":[13,13,0],"ẳ":[10,8,1],"Ẵ":[13,13,0],"ẵ":[10,8,1],"Ặ":[13,13,0],"ặ":[10,8,1],"Ẹ":[12,10,1],"ẹ":[10,9,1],"Ẻ":[12,10,1],"ẻ":[10,9,1],"Ẽ":[12,10,1],"ẽ":[10,9,1],"Ế":[12,10,1],"ế":[10,9,1],"Ề":[12,10,1],"ề":[10,9,1],"Ể":[12,10,1],"ể":[10,9,1],"Ễ":[12,10,1],"ễ":[10,9,1],"Ệ":[12,10,1],"ệ":[10,9,1],"Ỉ":[4,3,1],"ỉ":[4,3,1],"Ị":[5,3,1],"ị":[5,3,1],"Ọ":[14,13,1],"ọ":[11,10,1],"Ỏ":[14,13,1],"ỏ":[11,9,1],"Ố":[14,13,1],"ố":[11,10,1],"Ồ":[14,13,1],"ồ":[11,10,1],"Ổ":[14,13,1],"ổ":[11,9,1],"Ỗ":[14,13,1],"ỗ":[11,10,1],"Ộ":[14,13,1],"ộ":[11,10,1],"Ớ":[16,15,1],"ớ":[13,12,1],"Ờ":[16,15,1],"ờ":[13,12,1],"Ở":[16,15,1],"ở":[13,12,1],"Ỡ":[16,15,1],"ỡ":[13,12,1],"Ợ":[16,15,1],"ợ":[13,12,1],"Ụ":[12,10,1],"ụ":[11,9,1],"Ủ":[12,10,1],"ủ":[11,9,1],"Ứ":[15,14,1],"ứ":[13,12,1],"Ừ":[15,14,1],"ừ":[13,12,1],"Ử":[15,14,1],"ử":[13,12,1],"Ữ":[15,14,1],"ữ":[13,12,1],"Ự":[15,14,1],"ự":[13,12,1],"Ỳ":[12,11,1],"ỳ":[10,10,0],"Ỵ":[12,11,1],"ỵ":[10,10,0],"Ỷ":[12,11,1],"ỷ":[10,9,1],"Ỹ":[12,11,0],"ỹ":[10,9,0]}];
function countdownWidth(text, font) {
    let width = 0, last;
    for (const char of text) {
        last = countdownMetrics[font][char];
        if (!last) throw Error('Đồng hồ chưa hiển thị được ký tự «' + char + '».');
        width += last[0];
    }
    return last && last[1] ? width - last[0] + last[1] + last[2] : width;
}

function wrapCountdownName(value) {
    const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
    const chars = Array.from(name);
    if (!chars.length || chars.length > 32 || new TextEncoder().encode(name).length > 96)
        throw Error('Nhập tên sự kiện từ 1 đến 32 ký tự.');
    for (const font of [1, 0]) {
        if (countdownWidth(name, font) <= 180) return {font, a:name, b:'', join:0};
        let best, bestScore = Infinity;
        for (let i = 1; i < chars.length; i++) {
            const a = chars.slice(0, i).join('').trimEnd();
            const b = chars.slice(i).join('').trimStart();
            const join = chars[i - 1] === ' ' || chars[i] === ' ' ? 0 : 1;
            const left = countdownWidth(a, font), right = countdownWidth(b, font);
            const score = Math.abs(left - right) + 1000 * join;
            if (left <= 180 && right <= 180 && score < bestScore) {
                best = {font, a, b, join};
                bestScore = score;
            }
        }
        if (best) return best;
    }
    throw Error('Tên sự kiện dài quá hai dòng. Hãy rút ngắn tên.');
}

function countdownPayload() {
    const {font, a, b, join} = wrapCountdownName($('countdownName').value);
    const date = $('countdownDate').value;
    const timestamp = Date.parse(date + 'T00:00:00Z');
    const day = timestamp / 86400000;
    if (!Number.isInteger(day) || day < 18262 || day > 47481 ||
        new Date(timestamp).toISOString().slice(0, 10) !== date)
        throw Error('Chọn ngày diễn ra từ năm 2020 đến 2099.');
    const encoder = new TextEncoder();
    const left = encoder.encode(a), right = encoder.encode(b);
    const data = new Uint8Array(10 + left.length + right.length);
    data.set(u32(day));
    data.set([font, left.length, right.length, join], 4);
    data.set(left, 8);
    data.set(right, 9 + left.length);
    return data;
}

function showCountdownNameFit() {
    const value = $('countdownName').value;
    if (!value.trim()) {
        $('countdownCount').textContent = 'Tối đa 32 ký tự, hiển thị tối đa hai dòng.';
        return;
    }
    try {
        const lines = wrapCountdownName(value);
        $('countdownCount').textContent = lines.b ? 'Tên sẽ hiển thị trên hai dòng.' : 'Tên vừa một dòng.';
    } catch (error) {
        $('countdownCount').textContent = error.message;
    }
}

$('countdownName').oninput = showCountdownNameFit;
$('countdown').onclick = () => action(async () => {
    await sync(11);
    status('Đã mở Đồng hồ đếm ngược.');
});
$('saveCountdown').onclick = () => action(async () => {
    const data = countdownPayload();
    const connection = session;
    await request(4);
    try {
        await request(25, Uint8Array.from([...u32(data.length), ...u32(crc32(data))]));
        for (let at = 0; at < data.length;) {
            const part = data.slice(at, at + cap.chunk);
            const reply = await request(26, Uint8Array.from([...u32(at), ...part]));
            at += part.length;
            if (reply.length !== 9 || value32(reply, 5) !== at) throw Error('Chưa xác nhận đủ dữ liệu sự kiện.');
        }
        await request(27);
    } catch (error) {
        if (connection === session && gatt?.connected) await request(4).catch(() => {});
        throw error;
    }
    await sync(11);
    status('Đã lưu sự kiện và mở Đồng hồ đếm ngược.');
});
$('readCountdown').onclick = () => action(async () => {
    const header = await request(24);
    if (header.length !== 6 || header[5] > 106 || (header[5] && header[5] < 11))
        throw Error('Phản hồi sự kiện chưa hợp lệ.');
    if (!header[5]) {
        $('countdownName').value = $('countdownDate').value = '';
        showCountdownNameFit();
        status('Chưa cài sự kiện.');
        return;
    }
    const data = new Uint8Array(header[5]);
    for (let at = 0; at < data.length;) {
        const reply = await request(29, Uint8Array.of(at));
        const part = reply.slice(6);
        if (reply[5] !== at || !part.length || part.length > data.length - at)
            throw Error('Chưa nhận đủ dữ liệu sự kiện.');
        data.set(part, at);
        at += part.length;
    }
    const day = value32(data, 0), a = data[5], b = data[6];
    if (day < 18262 || day > 47481 || !a || data.length !== 10 + a + b)
        throw Error('Dữ liệu sự kiện chưa hợp lệ.');
    const decoder = new TextDecoder('utf-8', {fatal:true});
    const left = decoder.decode(data.slice(8, 8 + a));
    const right = decoder.decode(data.slice(9 + a, 9 + a + b));
    $('countdownName').value = right && !data[7] ? left + ' ' + right : left + right;
    $('countdownDate').value = new Date(day * 86400000).toISOString().slice(0, 10);
    showCountdownNameFit();
    status('Đã đọc sự kiện từ đồng hồ.');
});

for (const button of document.querySelectorAll('[data-section]')) {
    button.onclick = () => {
        for (const choice of document.querySelectorAll('[data-section]'))
            choice.setAttribute('aria-pressed', String(choice === button));
        for (const section of document.querySelectorAll('.panel'))
            section.hidden = section.id !== button.dataset.section;
    };
}
