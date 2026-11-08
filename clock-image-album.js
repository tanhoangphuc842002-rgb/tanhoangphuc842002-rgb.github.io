/* Four known firmware builds only; never sends these extensions to other clocks. */
(function(root){
 'use strict';
 const $=id=>root.document.getElementById(id),T=root.VNTransport,A=root.PhotoAlbumShared;
 let locked=false,pending=null,ownRunning=false,reconnecting=false;
 const identity=()=>T.key()+'|'+nrf52PanelProfile+'|'+nrf52FirmwareVersion;
 const hasRetry=()=>!!pending&&pending.identity===identity();
 function recoveryControls(){
  $('clock-image-stop').disabled=!ownRunning;
  $('clock-image-retry').disabled=reconnecting||ownRunning||!!A.busy()||!!T.busy()||clockImageUploadBusy||!!root.EpdDfuBusy?.()||!pending;
 }
 const supported=()=>typeof deviceProtocol!=='undefined'&&deviceProtocol===PROTOCOL_NRF52&&nrf52ModelDetected&&nrf52ModelId===2&&
  ((nrf52PanelProfile===0x21&&[242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))||(nrf52PanelProfile===0x29&&[244,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)))&&!!gattServer?.connected;
 function controls(value=false){locked=!!value||!!A.busy()||!!T.busy();for(const e of root.document.querySelectorAll('#clock-album-controls button,#clock-album-controls input,#clock-album-controls select'))e.disabled=locked||!supported();root.ArtClock?.controls();recoveryControls();}
 function status(s){A.say(s);$('clock-image-status').textContent=root.ArtClock?.text(s)||s;}
 function progress(n){$('clock-album-progress').value=n;if(root.ArtClock?.selected())$('clock-image-progress').value=n;}
 function assert(){if(!supported())throw Error('Hãy kết nối đồng hồ đã cập nhật chức năng ảnh luân phiên. Chưa gửi thay đổi.');}
 async function read(loadSettings=false){
  assert();const r=await A.caps(false),slots=[];for(let i=0;i<8;i++)if(r[7]&(1<<i))slots.push(i+1);
  $('clock-album-slots').textContent=slots.length?'Ảnh đã lưu: '+slots.join(', '):'Chưa có ảnh đã lưu.';
  if(loadSettings&&(r[8]===3||r[8]===7))$('clock-album-interval').value=r[9]|r[10]<<8;
  if(loadSettings&&root.ArtClock?.movable()){
   const bytes=await savedSchedule(r);root.ArtClock.acceptPosition(bytes?.[19]??1);
  }
  return r;
 }
 async function savedSchedule(r){
  const base=new DataView(r.buffer,r.byteOffset).getUint32(12,true),start=A.geometry().schedule;
  if(!base)return null;
  if(base!==start&&base!==start+0x1000)throw Error('Vùng lưu cách hiển thị không hợp lệ.');
  const bytes=await T.read(base+16,20);await A.verify(base,bytes,0x31534856);return bytes;
 }
 function slot(){const n=Number($('clock-album-slot').value);if(!Number.isInteger(n)||n<0||n>7)throw Error('Ô ảnh không hợp lệ.');return n;}
 function capture(show){
  assert();const index=slot(),target=getClockImageTarget(),canvas=$('clock-image-canvas');
  if(!clockImageOriginal)throw Error('Chọn và chỉnh một ảnh ở trên trước khi lưu.');
  if(!target||![148,176,194,250,296].includes(target.width)||canvas.width!==target.width||canvas.height!==128)throw Error('Kích thước ảnh chưa đúng. Chưa ghi dữ liệu.');
  renderClockImage();const full=root.document.createElement('canvas');full.width=A.geometry().width;full.height=128;
  const ctx=full.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,full.width,128);ctx.drawImage(root.ArtClock?.rawCanvas()||canvas,0,0);
  return {identity:identity(),device:T.key(),index,art:!!root.ArtClock?.selected(),corner:root.ArtClock?.position(),bytes:A.planes(full),show,approved:false};
 }
 async function committedPhoto(intent){
  const geo=A.geometry(),first=geo.photo+intent.index*geo.span;let record=null;
  for(const address of [first,first+geo.step]){
   const h=await T.read(address,16),v=new DataView(h.buffer,h.byteOffset),generation=v.getUint32(4,true);
   if(v.getUint32(0,true)===0x31504856&&v.getUint32(8,true)===intent.bytes.length&&(!record||(generation-record.generation|0)>0))record={address,generation,crc:v.getUint32(12,true)};
  }
  if(!record||record.crc!==T.crc32(intent.bytes))return false;
  await A.verify(record.address,intent.bytes,0x31504856);return true;
 }
 async function savePhoto(intent,retry=false){
  assert();if(intent.identity!==identity())throw Error('Hãy kết nối lại đúng đồng hồ đã chọn ảnh. Chưa gửi thay đổi.');
  const started=Date.now();status('Đang chờ đồng hồ sẵn sàng và kiểm tra dữ liệu…');progress(0);
  if(retry){
   const cap=await (T.probeBasic||T.probe)();
   if(cap[8]){status('Đang dừng phiên tải bị ngắt để tải lại ảnh…');await T.request(5);}
  }
  await root.ArtClock?.ready();
  if(intent.identity!==identity())throw Error('Kết nối đã đổi. Chưa gửi thay đổi.');
  const index=intent.index,bytes=intent.bytes,r=await read();
  if(retry&&await committedPhoto(intent)){status('Ảnh đã lưu đầy đủ; không cần truyền lại.');return true;}
  if(!await A.permitWrite())return false;
  if(!intent.approved&&(r[7]&(1<<index))&&!confirm('Thay ảnh đang lưu trong ô '+(index+1)+'? Các ô khác được giữ nguyên.'))return false;
  intent.approved=true;
  status('Đã kiểm tra xong ('+((Date.now()-started)/1000).toFixed(1)+' giây). Đang lưu ảnh. Giữ kết nối và không tháo pin.');progress(0);
  await A.upload(17,[...A.u32(0xc0decafe),index,...A.u32(T.crc32(bytes))],bytes,progress);
  status('Đang kiểm tra ảnh vừa lưu…');
  if(!await committedPhoto(intent))throw Error('Chưa xác nhận được ảnh vừa lưu.');
  await read();progress(100);status('Đã lưu ảnh. Chọn Hiển thị ảnh đã chọn và giờ, hoặc Lưu và bắt đầu luân phiên.');return true;
 }
 async function schedule(kind,prepared=null){
  assert();if(!prepared)await root.ArtClock?.ready();const r=await read();if(!r[7])throw Error('Lưu ít nhất một ảnh trước khi bắt đầu.');
  const chosen=prepared?prepared.index:kind==='hold'&&r[11]<8?r[11]:slot();
  if(kind!=='cycle'&&!(r[7]&(1<<chosen)))throw Error('Ô ảnh này chưa có ảnh.');
  const minutes=Number($('clock-album-interval').value);
  if(kind==='cycle'&&(!Number.isInteger(minutes)||minutes<1||minutes>1440))throw Error('Khoảng đổi ảnh từ 1 đến 1440 phút.');
  if(!await A.permitWrite())return false;
  const b=new Uint8Array(20);b.fill(255,4);b[0]=1;b[1]=root.ArtClock?.selected()?(kind==='cycle'?7:6):(kind==='cycle'?3:5);b[2]=(kind==='cycle'?minutes:30)&255;b[3]=(kind==='cycle'?minutes:30)>>8;if(b[1]===5||b[1]===6)b[4]=chosen;
  if(root.ArtClock?.selected()&&root.ArtClock.movable())b[19]=prepared?.corner??root.ArtClock.position();
  if(prepared?.retry){
   const base=new DataView(r.buffer,r.byteOffset).getUint32(12,true),start=A.geometry().schedule;
   if(base===start||base===start+0x1000){
    const h=await T.read(base,16),v=new DataView(h.buffer,h.byteOffset);
    if(v.getUint32(0,true)===0x31534856&&v.getUint32(8,true)===b.length&&v.getUint32(12,true)===T.crc32(b)){
     await A.verify(base,b,0x31534856);const mode=prepared.art?15:14;
     if(nrf52DisplayMode!==mode)await sendNrf52Mode(mode);
     nrf52DisplayMode=mode;progress(100);status('Ảnh và cách hiển thị đã lưu đầy đủ. Bạn có thể sử dụng đồng hồ.');return;
    }
   }
  }
  // Sync local wall-clock seconds without rendering the previous face first.
  const time=new Uint8Array(4),now=new Date();
  new DataView(time.buffer).setUint32(0,Math.floor(now.getTime()/1000)-now.getTimezoneOffset()*60,false);
  await sendCommand(new Uint8Array([NRF52_CMD_SET_TIME,...time,0,255]));
  status('Đang lưu cách đổi ảnh. Giữ kết nối.');progress(0);
  await A.upload(20,[...A.u32(0xc0decafe),...A.u32(T.crc32(b))],b,progress);
  const reply=await A.caps(false),base=new DataView(reply.buffer,reply.byteOffset).getUint32(12,true),start=A.geometry().schedule;
  if(base!==start&&base!==start+0x1000)throw Error('Chưa xác nhận được lịch đổi ảnh.');
  await A.verify(base,b,0x31534856);nrf52DisplayMode=root.ArtClock?.selected()?15:14;progress(100);
  status(kind==='cycle'?'Đã bật đồng hồ và ảnh luân phiên. Bạn có thể ngắt kết nối web.':'Đã giữ một ảnh cùng đồng hồ. Giờ vẫn tiếp tục chạy.');
 }
 async function applyPosition(){
  assert();if(!root.ArtClock?.selected()||!root.ArtClock.movable())return;
  const corner=root.ArtClock.position(),r=await read(),b=await savedSchedule(r);
  if(!b||![6,7].includes(b[1]))throw Error('Lưu và hiển thị một bức tranh trước khi đổi vị trí giờ.');
  if(!await A.permitWrite())return;
  // Change only the corner; keep the slot, interval and album policy intact.
  b[19]=corner;status('Đang lưu vị trí giờ…');progress(0);
  await A.upload(20,[...A.u32(0xc0decafe),...A.u32(T.crc32(b))],b,progress);
  const reply=await read(),base=new DataView(reply.buffer,reply.byteOffset).getUint32(12,true);
  await A.verify(base,b,0x31534856);nrf52DisplayMode=15;progress(100);
  status('Đã lưu vị trí giờ. Chờ đồng hồ làm mới xong.');
 }
 const run=fn=>{if(locked)return;if(clockImageUploadBusy){status('Hãy chờ truyền ảnh xong rồi thử lại.');return;}return A.action(async()=>{assert();return fn();});};
 $('clock-album-read').onclick=()=>run(async()=>{await read(true);status('Đã đọc các ô ảnh đã lưu.');});
 async function perform(intent,retry=false){
  ownRunning=true;recoveryControls();
  try{
   if(await savePhoto(intent,retry)===false){pending=null;return;}
   if(intent.show)await schedule('show',{...intent,retry});
   pending=null;
  }catch(error){
   // Keep the immutable image, slot and device identity for an explicit retry.
   // A lost write ACK is never automatically replayed.
   throw Error((error?.message||String(error))+' Bấm Tải lại tranh để thử lại ảnh đã chọn.');
  }finally{ownRunning=false;recoveryControls();}
 }
 function start(show){return run(()=>{pending=capture(show);return perform(pending);});}
 $('clock-album-save').onclick=()=>start(false);
 $('clock-album-show').onclick=()=>run(()=>schedule('show'));
 $('clock-album-start').onclick=()=>run(()=>schedule('cycle'));
 $('clock-album-hold').onclick=()=>run(()=>schedule('hold'));
 $('clock-image-stop').onclick=()=>{if(ownRunning)T.cancel();};
 $('clock-image-retry').onclick=async()=>{
  if(!pending||reconnecting||ownRunning||A.busy()||T.busy()||clockImageUploadBusy||root.EpdDfuBusy?.())return;
  const intent=pending;
  // Reconnect only on this explicit click, never automatically resend on connect.
  if(intent.device!==T.key()){status('Hãy kết nối lại đúng đồng hồ đã chọn ảnh rồi bấm Tải lại tranh. Chưa gửi thay đổi.');return;}
  if(!gattServer?.connected){
   reconnecting=true;recoveryControls();status('Đang kết nối lại đồng hồ để tải lại tranh…');
   try{await root.reConnect();}catch(error){status('Chưa hoàn tất: '+error.message);return;}
   finally{reconnecting=false;recoveryControls();}
  }
  if(!supported()||intent.identity!==identity()){status('Chưa kết nối đúng đồng hồ. Hãy kết nối lại rồi bấm Tải lại tranh.');return;}
  $('art-clock-layout').value=intent.art?'art':'classic';root.updateClockImageAvailability();
  if(intent.art&&root.ArtClock?.movable())$('art-clock-position').value=String(intent.corner);
  return run(()=>perform(intent,true));
 };
 root.SmallClockAlbum={controls,supported,hasRetry,hasSelection:()=>!!pending,saveAndShow:()=>start(true),loadPosition:()=>run(()=>read(true)),applyPosition:()=>run(applyPosition),discardSelection:()=>{if(!ownRunning&&!locked){pending=null;recoveryControls();}}};controls();
 root.SmallClockBattery={async read(){
  if(!supported())return false;
  const characteristic=epdCharacteristic,device=bleDevice;
  try{return await T.run(async()=>{
   const reply=await T.request(23);
   if(characteristic!==epdCharacteristic||device!==bleDevice||!gattServer?.connected)return false;
   if(reply.length!==7||reply[6]<5||reply[6]>100)throw Error('Số đo điện áp chưa hợp lệ.');
   root.SharedBattery?.notification(new TextEncoder().encode('v='+reply[6]*100));return true;
  });}catch(e){if(typeof addLog==='function')addLog('Chưa đọc được điện áp pin: '+e.message);return false;}
 }};
 if(typeof module!=='undefined'&&module.exports)module.exports={supported};
})(globalThis);
