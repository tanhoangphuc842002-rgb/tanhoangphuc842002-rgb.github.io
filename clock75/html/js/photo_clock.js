(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const store=node?require('./resource_store'):root.EPDResourceStore;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder;
 const editor=node?require('./photo_editor'):root.PhotoClockEditor;
 const PHOTO=11, SIZE=48016, START=0x5a000, PART_SIZE=0xc000;
 function imagePayload(rgba){
  if(!(rgba instanceof Uint8ClampedArray)||rgba.length!==400*480*4)throw new Error('Ảnh phải có kích thước 400 × 480.');
  const out=new Uint8Array(SIZE);out.set([80,72,84,49,1,0,144,1,224,1,2,0,0,0,0,0]);out.fill(255,16);
  for(let i=0;i<400*480;i++){
   const at=i*4,alpha=rgba[at+3]/255;
   const r=rgba[at]*alpha+255*(1-alpha),g=rgba[at+1]*alpha+255*(1-alpha),b=rgba[at+2]*alpha+255*(1-alpha);
   const red=r>100&&r>g*1.28&&r>b*1.28;
   const black=!red&&(r*.299+g*.587+b*.114)<150;
   if(red||black)out[16+(red?24000:0)+(i>>3)]&=~(128>>(i&7));
  }
  return out;
 }
 function photoPartitions(parts){
  const found=parts.find(p=>p.id===PHOTO);
  if(found){
   if(found.type!==PHOTO||found.offset!==START||found.size!==PART_SIZE||found.schema!==1||found.flags)throw new Error('Vùng ảnh không phù hợp. Chưa ghi dữ liệu.');
   return parts.map(p=>({...p}));
  }
  const old=parts.find(p=>p.id===8);
  if(!parts.some(p=>p.id===10)||!old||old.type!==8||old.schema!==1||old.flags||old.offset!==START||old.size!==0x26000)throw new Error('Hãy cài đặt đồng hồ bằng bộ web đi kèm trước. Chưa ghi dữ liệu.');
  return parts.map(p=>p===old?{...p,offset:START+PART_SIZE,size:old.size-PART_SIZE}:{...p}).concat({id:PHOTO,type:PHOTO,offset:START,size:PART_SIZE,schema:1,flags:0});
 }
 function tablePayload(parts){
  const out=new Uint8Array(parts.length*16),v=new DataView(out.buffer);
  parts.forEach((p,i)=>{const a=i*16;v.setUint16(a,p.id,true);v.setUint16(a+2,p.type,true);v.setUint32(a+4,p.offset,true);v.setUint32(a+8,p.size,true);v.setUint16(a+12,p.schema,true);v.setUint16(a+14,p.flags,true);});
  store.parseTable({id:1,payload:out});return out;
 }
 async function save(client,payload,check=()=>{},onWrite=()=>{},progress=()=>{},onStage=()=>{}){
  if(!(payload instanceof Uint8Array)||payload.length!==SIZE||![80,72,84,49,1,0,144,1,224,1,2,0,0,0,0,0].every((b,i)=>payload[i]===b))throw new Error('Ảnh không hợp lệ.');
  let entered=false,stage='Kiểm tra kết nối';
  const at=name=>{stage=name;onStage(name);};
  try{
   at('Kiểm tra bộ nhớ đồng hồ');
   const status=store.parseStatus(await client.status());check();
   if(status.code||status.active||status.entered)throw new Error('Đồng hồ chưa sẵn sàng. Hãy kết nối lại và hoàn tất cài đặt đồng hồ.');
   at('Đọc bố cục bộ nhớ');
   let parts=await client.partitions();check();const next=photoPartitions(parts);
   if(!parts.some(p=>p.id===PHOTO)){
    at('Chuẩn bị vùng lưu ảnh');
    const old=store.parsePackage(await client.readPackage(parts.find(p=>p.id===1)));check();
    if(old.revision===0xffffffff)throw new Error('Không thể cập nhật bảng dữ liệu.');
    onWrite();entered=true;
    await client.upload(builder.wrap(1,tablePayload(next),old.revision+1),()=>check(),parts);check();parts=next;
   }
   at('Ghi dữ liệu ảnh');
   onWrite();entered=true;
   const revision=Math.floor(Date.now()/1000),bytes=builder.wrap(PHOTO,payload,revision),pack=store.parsePackage(bytes);
   await client.upload(bytes,(n,total,durable)=>{check();progress(durable===undefined?n:durable,total);},parts);check();
   at('Kiểm tra ảnh đã ghi');
   const info=await client.inspect(PHOTO);check();
   if(info.code||info.crc!==pack.crc||info.length!==SIZE||info.revision!==revision)throw new Error('Chưa xác nhận được ảnh đã lưu.');
   at('Áp dụng dữ liệu trên đồng hồ');
   await client.leave();check();entered=false;
  }catch(error){
   error.photoStage=stage;
   throw error;
  }finally{
   if(entered&&!client.closed){try{check();await client.request(5);await client.leave();}catch(_){} }
  }
 }
 const $=id=>root.document.getElementById(id);
 function report(s){$('photoClockStatus').textContent=s;const quick=$('photoClockQuickStatus');if(quick)quick.textContent=s;if(root.addLog)root.addLog('Đồng hồ + ảnh: '+s);}
 let bitmap=null,busy=false,loading=false,loadGeneration=0,frameRequest=0;
 let settings=editor.defaults();
 function controls(force=false){
  if(node)return;
  const locked=force||busy||loading||!!root.DeviceOperations?.current;
  const supported=typeof appVersion!=='undefined'&&[0x40,0x41,0x42,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67].includes(appVersion)&&typeof gattServer!=='undefined'&&!!gattServer?.connected;
  for(const id of ['photoClockFile','photoClockFit'])$(id).disabled=locked;
  for(const element of root.document.querySelectorAll('[data-photo-edit]'))element.disabled=locked||!bitmap;
  $('photoClockSave').disabled=locked||!supported||!bitmap;
  $('photoClockShow').disabled=locked||!supported;
  const quick=$('photoclockmodebutton');if(quick)quick.disabled=locked||!supported;
 }
 function preview(){
  if(!bitmap)return;
  settings.fit=$('photoClockFit').value;
  const ctx=$('photoClockCanvas').getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,400,480);
  const p=editor.placement(bitmap.width,bitmap.height,settings);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.drawImage(bitmap,-p.width/2,-p.height/2,p.width,p.height);ctx.restore();
  const data=ctx.getImageData(0,0,400,480);data.data.set(editor.quantize(data.data,settings,400,480));
  ctx.putImageData(data,0,0);
  $('photoClockZoomValue').textContent=Math.round(settings.zoom*100)+'%';
 }
 function schedulePreview(){
  if(frameRequest)return;
  frameRequest=root.requestAnimationFrame(()=>{frameRequest=0;preview();});
 }
 function reset(){
  if(busy||loading)return;
  settings=editor.defaults();$('photoClockFit').value=settings.fit;
  for(const [id,key] of [['photoClockBrightness','brightness'],['photoClockContrast','contrast'],['photoClockRed','redThreshold'],['photoClockBW','bwThreshold']])$(id).value=settings[key];
  preview();
 }
 function change(action){
  if(!bitmap||busy||loading||root.DeviceOperations?.current)return;
  if(action==='left')settings.x=editor.clamp(settings.x-10,-800,800);
  if(action==='right')settings.x=editor.clamp(settings.x+10,-800,800);
  if(action==='up')settings.y=editor.clamp(settings.y-10,-800,800);
  if(action==='down')settings.y=editor.clamp(settings.y+10,-800,800);
  if(action==='zoomIn')settings.zoom=editor.clamp(settings.zoom*1.1,.2,8);
  if(action==='zoomOut')settings.zoom=editor.clamp(settings.zoom/1.1,.2,8);
  if(action==='rotateLeft')settings.rotation=(settings.rotation+270)%360;
  if(action==='rotateRight')settings.rotation=(settings.rotation+90)%360;
  if(action==='center'){settings.x=settings.y=0;settings.zoom=1;}
  if(action==='reset'){reset();return;}
  preview();
 }
 async function act(upload){
  if(busy)return;
  if(loading)return;
  if(upload&&root.Album75){try{if(!await root.Album75.beforeDirect(1))return;}catch(e){report('Chưa kiểm tra được album: '+e.message);return;}}
  busy=true;controls();
  try{
   if(typeof appVersion==='undefined'||![0x40,0x41,0x42,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67].includes(appVersion)||typeof gattServer==='undefined'||!gattServer?.connected)throw new Error('Hãy kết nối đồng hồ 7.5 có hỗ trợ Đồng hồ + ảnh.');
   if(upload){
    if(!bitmap)throw new Error('Chọn một ảnh trước.');
    if(frameRequest){root.cancelAnimationFrame(frameRequest);frameRequest=0;}preview();
    const payload=imagePayload($('photoClockCanvas').getContext('2d').getImageData(0,0,400,480).data);
    report('Đang lưu ảnh. Giữ kết nối và không tháo pin.');$('photoClockProgress').value=0;
    const saved=await root.ExternalResourceInstaller.countdownOperation(async(client,check,write)=>{
     if(appVersion>=0x43){if(!await root.Album75.confirmReplace(client,1,0,check))return false;}
     else{
      let occupied=false;const parts=await client.partitions();check();
      if(parts.some(p=>p.id===PHOTO)){const info=await client.inspect(PHOTO);check();if(info.code&&![1,3,4].includes(info.code))throw Error('Chưa kiểm tra được ảnh đã lưu.');occupied=!info.code;}
      if(occupied&&!root.confirm('Thay ảnh Đồng hồ+ảnh đang lưu? Các dữ liệu khác được giữ nguyên.'))return false;
     }
     check();
     if(appVersion>=0x43)await root.Album75.save(client,1,0,payload,check,write,(n,total)=>{$('photoClockProgress').value=n/total;});
     else await save(client,payload,check,write,(n,total)=>{$('photoClockProgress').value=n/total;},stage=>report(stage+'…'));
     return true;
    });
    if(saved===false){report('Đã hủy. Ảnh đang lưu được giữ nguyên.');return;}
   }else{
    await root.ExternalResourceInstaller.countdownOperation(async(client,check)=>{
     if(appVersion>=0x43){const m=await root.Album75.masks(client);check();if(!m[1])throw Error('Chưa có ảnh đã lưu.');return;}
     const status=store.parseStatus(await client.status());check();
     if(status.code||status.active||status.entered)throw new Error('Đồng hồ chưa sẵn sàng. Hãy kết nối lại.');
     const parts=await client.partitions();check();
     if(!parts.some(p=>p.id===PHOTO))throw new Error('Chưa có ảnh đã lưu. Hãy chọn và lưu một ảnh trước.');
     photoPartitions(parts);
     const info=await client.inspect(PHOTO);check();
     if(info.code||info.length!==SIZE)throw new Error('Ảnh đã lưu chưa đầy đủ. Hãy lưu lại ảnh.');
    });
   }
   if(!await root.sendTimeCommand(6,'Đồng hồ + ảnh'))throw new Error('Chưa mở được Đồng hồ + ảnh. Hãy cài đặt đồng hồ và lưu ảnh trước.');
   report('Đã mở Đồng hồ + ảnh. Chờ màn hình làm mới; giờ sẽ tự chạy mỗi phút.');
  }catch(e){
   report('Chưa hoàn tất'+(e.photoStage?' ở bước “'+e.photoStage+'”':'')+': '+e.message);
   root.ConsoleUI?.openLog();
  }
  finally{busy=false;controls();}
 }
 const api={imagePayload,photoPartitions,tablePayload,save,controls,change,upload:()=>act(true),show:()=>act(false),hasImage:()=>!!bitmap,flush(){if(frameRequest){root.cancelAnimationFrame(frameRequest);frameRequest=0;}preview();}};
 if(node)module.exports=api;
 else{
  root.PhotoClock=api;
  $('photoClockFile').addEventListener('change',async e=>{
   const file=e.target.files[0];if(!file||busy||root.DeviceOperations?.current)return;
   const generation=++loadGeneration;loading=true;controls();
   try{
    if(file.size>25*1024*1024)throw new Error('Vui lòng chọn ảnh nhỏ hơn 25 MB.');
    let next;
    if(typeof root.createImageBitmap==='function'){try{next=await root.createImageBitmap(file);}catch(_){/* SVG and some browser decoders need the Image fallback. */}}
    if(!next)next=await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Định dạng ảnh chưa được hỗ trợ.'));};img.src=url;});
    if(generation!==loadGeneration){next.close?.();return;}
    if(next.width*next.height>32000000){next.close?.();throw new Error('Ảnh quá lớn. Hãy giảm xuống dưới 32 triệu điểm ảnh.');}
    bitmap?.close?.();bitmap=next;settings=editor.defaults();loading=false;reset();
    $('photoClockFileName').textContent=file.name;report('Ảnh đã sẵn sàng. Chỉnh ảnh nếu cần rồi bấm Lưu ảnh và hiển thị.');
   }catch(error){report('Không đọc được ảnh: '+error.message);}
   finally{if(generation===loadGeneration){loading=false;controls();}}
  });
  $('photoClockFit').addEventListener('change',()=>{settings.zoom=1;settings.x=settings.y=0;preview();});
  for(const [id,key] of [['photoClockBrightness','brightness'],['photoClockContrast','contrast'],['photoClockRed','redThreshold'],['photoClockBW','bwThreshold']])$(id).addEventListener('input',()=>{if(busy||loading)return;settings[key]=Number($(id).value);schedulePreview();});
  root.document.querySelectorAll('[data-photo-action]').forEach(button=>button.addEventListener('click',()=>change(button.dataset.photoAction)));
  const canvas=$('photoClockCanvas');let drag=null;
  canvas.addEventListener('pointerdown',e=>{if(!bitmap||busy||loading||root.DeviceOperations?.current)return;const rect=canvas.getBoundingClientRect();drag={id:e.pointerId,cx:e.clientX,cy:e.clientY,x:settings.x,y:settings.y,sx:400/rect.width,sy:480/rect.height};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||busy||loading||root.DeviceOperations?.current)return;settings.x=editor.clamp(drag.x+(e.clientX-drag.cx)*drag.sx,-800,800);settings.y=editor.clamp(drag.y+(e.clientY-drag.cy)*drag.sy,-800,800);schedulePreview();});
  const endDrag=e=>{if(drag?.id===e.pointerId){drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
  controls();
 }
})(globalThis);
