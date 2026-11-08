/* Persistent 128x250 BWR photos; capability-gated CE and no CE 2.13. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),T=window.VNTransport;
let busy=false,mask=0,deleting=false;
const tr=s=>window.EpdWebsiteI18n?.translate(s)||s;
function deleteSupported(){return supported()&&({289:33,290:33,291:41,292:41})[nrf52FirmwareVersion]===nrf52PanelProfile;}
function deleteControls(){
 const ready=deleteSupported(),locked=busy||!!T.busy?.()||!!window.EpdDfuBusy?.()||!!window.countdownOperationBusy;
 for(const b of document.querySelectorAll('[data-photo-delete]')){b.disabled=!ready||locked;if(b.dataset.photoDelete!=='all')b.setAttribute('aria-label',tr('Xóa ảnh trong ô')+' '+(Number(b.dataset.photoDelete)+1));}
 $('photo-delete-stop').disabled=!deleting;$('photo-delete-stop').hidden=!deleting;
 $('photo-delete-help').textContent=tr(ready?'Ảnh trong album dùng chung với Đồng hồ và ảnh. Xóa ảnh không xóa bộ chữ hoặc nội dung cá nhân.':'Kết nối đồng hồ và cập nhật phần mềm để sử dụng chức năng xóa ảnh.');
}
const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
function say(s){$('photo-status').textContent=s;if(window.ArtClock?.selected())$('clock-image-status').textContent=window.ArtClock.text(s);const other=$('clock-album-status');if(other)other.textContent=s;if(typeof addLog==='function')addLog('Album ảnh: '+s);}
function supported(){return window.VNCountdownSupport?.()&&gattServer?.connected&&((nrf52PanelProfile===0x21&&[128,129,130,131,132,137,138,139,140,141,142,143,144,149,150,151,152,153,154,155,156,159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))||(nrf52PanelProfile===0x29&&[135,136,145,146,147,148,157,158,167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)));}
function geometry(){return nrf52PanelProfile===0x29?{width:296,photo:0x30000,span:0x6000,step:0x3000,schedule:0x2e000}:{width:250,photo:0x40000,span:0x4000,step:0x2000,schedule:0x3e000};}
function assertConnection(){if(!supported())throw Error('Đồng hồ này chưa hỗ trợ lưu nhiều ảnh. Bạn vẫn có thể dùng mục tải ảnh thông thường.');}
function controls(v){busy=v;window.SmallClockAlbum?.controls(v);for(const x of document.querySelectorAll('#photo-album-controls button,#photo-album-controls input,#photo-album-controls select'))x.disabled=v;deleteControls();}
async function action(fn){
 if(busy)return;controls(true);$('photo-progress').value=0;
 try{assertConnection();await T.run(fn,v=>$('photo-progress').value=v);}
 catch(e){say('Chưa hoàn tất: '+e.message);}
 finally{controls(false);}
}
function modeChanged(){const mode=Number($('photo-cycle-mode').value);$('photo-interval-row').hidden=mode!==1;$('photo-daily-note').hidden=mode!==2;for(let i=0;i<8;i++)$('photo-time-'+i).hidden=mode!==2;}
for(let i=0;i<8;i++){
 const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap';
 const text=document.createElement('span');text.id='photo-state-'+i;text.textContent='Ảnh '+(i+1)+': chưa đọc';text.style.minWidth='155px';
 const time=document.createElement('input');time.type='time';time.id='photo-time-'+i;time.setAttribute('aria-label','Giờ hiển thị ảnh '+(i+1));time.style.width='140px';time.hidden=true;
 const show=document.createElement('button');show.type='button';show.textContent='Xem ảnh '+(i+1);show.onclick=()=>action(async()=>{await caps(false);if(!(mask&(1<<i)))throw Error('Ảnh này chưa được lưu. Chọn và lưu ảnh trước.');await T.request(21,[i]);say('Đang hiển thị ảnh '+(i+1)+'. Lịch tự đổi ảnh đã lưu vẫn tiếp tục.');});
 const choose=document.createElement('button');choose.type='button';choose.textContent='Chọn / thay ảnh';choose.setAttribute('aria-label','Chọn hoặc thay ảnh '+(i+1));choose.onclick=()=>{$('photo-slot').value=String(i);$('photo-choose').click();};
 const remove=document.createElement('button');remove.type='button';remove.textContent='Xóa ảnh';remove.dataset.photoDelete=String(i);remove.id='photo-delete-'+i;remove.disabled=true;remove.style.background='#b43737';remove.setAttribute('aria-label','Xóa ảnh trong ô '+(i+1));remove.onclick=()=>removePhotos([i]);
 row.append(text,time,show,choose,remove);$('photo-slots').append(row);
}
const deleteBar=document.createElement('div');deleteBar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0';
const deleteAll=document.createElement('button');deleteAll.id='photo-delete-all';deleteAll.type='button';deleteAll.dataset.photoDelete='all';deleteAll.textContent='Xóa toàn bộ ảnh trong album';deleteAll.style.background='#b43737';deleteAll.disabled=true;deleteAll.onclick=()=>removePhotos([0,1,2,3,4,5,6,7]);
const deleteStop=document.createElement('button');deleteStop.id='photo-delete-stop';deleteStop.type='button';deleteStop.textContent='Dừng xóa';deleteStop.disabled=true;deleteStop.onclick=()=>{if(deleting)T.cancel();};
const deleteHelp=document.createElement('p');deleteHelp.id='photo-delete-help';deleteHelp.dataset.noI18n='';deleteHelp.style.cssText='font-size:13px;line-height:1.5';
deleteBar.append(deleteAll,deleteStop);$('photo-slots').after(deleteBar,deleteHelp);
async function caps(loadSchedule=true){
 assertConnection();await (T.probeBasic||T.probe)();const r=await T.request(16);
 if(r.length!==16||r[6]!==1)throw Error('Đồng hồ chưa hỗ trợ album này.');
 mask=r[7];
 const saved=Array.from({length:8},(_,i)=>i+1).filter(i=>mask&(1<<(i-1)));
 if($('clock-album-slots'))$('clock-album-slots').textContent=saved.length?tr('Ảnh đã lưu:')+' '+saved.join(', '):tr('Chưa có ảnh đã lưu.');
 for(let i=0;i<8;i++)$('photo-state-'+i).textContent='Ảnh '+(i+1)+': '+(mask&(1<<i)?'đã lưu':'chưa có ảnh');
 if(loadSchedule){
  $('photo-cycle-mode').value=String(r[8]>=3?0:r[8]);$('photo-interval').value=String((r[9]|r[10]<<8)||30);
  const base=new DataView(r.buffer,r.byteOffset).getUint32(12,true);
  let bytes=new Uint8Array(20);bytes.fill(255,4);
  if(base){const start=geometry().schedule;if(base!==start&&base!==start+0x1000)throw Error('Vùng lưu lịch không phù hợp.');bytes=await T.read(base+16,20);}
  for(let i=0;i<8;i++){const m=bytes[4+i*2]|bytes[5+i*2]<<8;$('photo-time-'+i).value=m<1440?String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'):'';}
  modeChanged();
 }
 return r;
}
async function removePhotos(slots){
 if(deleting||busy||T.busy?.())return;
 if(!deleteSupported()){say(tr('Kết nối đồng hồ và cập nhật phần mềm để sử dụng chức năng xóa ảnh.'));return;}
 const device=bleDevice,channel=epdCharacteristic,version=nrf52FirmwareVersion,profile=nrf52PanelProfile;
 const guard=()=>{if(device!==bleDevice||channel!==epdCharacteristic||!device.gatt?.connected||!gattServer?.connected||nrf52FirmwareVersion!==version||nrf52PanelProfile!==profile)throw Error(tr('Kết nối đã đổi. Kết nối lại rồi kiểm tra album trước khi xóa tiếp.'));};
 deleting=true;
 try{await action(async()=>{
  guard();const cap=await (T.probeBasic||T.probe)();guard();
  if(cap[6]!==8||cap[8])throw Error(tr('Đồng hồ chưa sẵn sàng xóa ảnh. Cập nhật phần mềm hoặc kết nối lại rồi thử lại.'));
  let r=await caps(false);guard();
  const all=slots.length===8,selected=slots.reduce((m,i)=>m|(1<<i),0),remaining=r[7]&~selected;
  const question=tr(all?'Xóa toàn bộ ảnh đã lưu trong album?':'Xóa ảnh đã lưu trong ô đã chọn?')+'\n'+(all?'':tr('Ô ảnh:')+' '+slots.map(i=>i+1).join(', ')+'\n')+tr('Ảnh này cũng bị xóa khỏi Đồng hồ và ảnh. Bộ chữ và nội dung cá nhân được giữ nguyên.');
  if(!confirm(question)){say(tr('Đã hủy xóa ảnh.'));return;}
  guard();
  // Stop the persisted schedule before removing its final/held image, including across reboot.
  let stop=r[8]&&(all||!remaining);
  let scheduleBytes=null;
  if(r[8]){
   const base=new DataView(r.buffer,r.byteOffset).getUint32(12,true),g=geometry();
   if(base!==g.schedule&&base!==g.schedule+0x1000)throw Error(tr('Chưa đọc được lịch đổi ảnh. Kết nối lại rồi thử lại.'));
   scheduleBytes=await T.read(base+16,20);guard();await verify(base,scheduleBytes,0x31534856);guard();
   stop=stop||([5,6].includes(r[8])&&!!(selected&(1<<scheduleBytes[4])));
  }
  if(stop){
   scheduleBytes=stoppedSchedule(scheduleBytes);say(tr('Đang tắt tự đổi ảnh trước khi xóa…'));
   await upload(20,[...u32(0xc0decafe),...u32(T.crc32(scheduleBytes))],scheduleBytes);guard();
   r=await caps(false);guard();const base=new DataView(r.buffer,r.byteOffset).getUint32(12,true);
   if(r[8]!==0||![geometry().schedule,geometry().schedule+0x1000].includes(base))throw Error(tr('Chưa xác nhận tắt tự đổi ảnh. Chưa xóa ảnh.'));
   await verify(base,scheduleBytes,0x31534856);guard();
   if(nrf52DisplayMode===14||nrf52DisplayMode===15){await sendNrf52Mode(0);guard();}
  }
  const geo=geometry(),blank=new Uint8Array(geo.span);blank.fill(255);const blankCRC=T.crc32(blank);
  for(let k=0;k<slots.length;k++){
   const slot=slots[k];guard();say(tr('Đang xóa ảnh trong ô:')+' '+(slot+1)+'. '+tr('Giữ kết nối và không tháo pin.'));
   await T.request(22,[...u32(0xc0decafe),slot],{timeout:20000});guard();
   const crc=await T.request(8,[...u32(geo.photo+slot*geo.span),geo.span&255,geo.span>>8]);guard();
   if(crc.length!==10||new DataView(crc.buffer,crc.byteOffset).getUint32(6,true)!==blankCRC)throw Error(tr('Chưa xác nhận xóa hết ảnh. Kết nối lại và xóa lại ô này.'));
   r=await caps(false);guard();if(r[7]&(1<<slot))throw Error(tr('Ô ảnh vẫn còn dữ liệu. Kết nối lại rồi kiểm tra album.'));
   $('photo-progress').value=(k+1)/slots.length*100;
  }
  await caps(true);guard();
  say(tr(all?'Đã xóa toàn bộ ảnh trong album.':'Đã xóa ảnh đã chọn khỏi bộ nhớ.')+(stop?' '+tr('Tự đổi ảnh đã tắt.'):'')+' '+tr('Ảnh đang hiện trên màn có thể vẫn được giữ đến khi chọn ảnh hoặc chế độ khác.'));
 });}finally{deleting=false;deleteControls();}
}
function stoppedSchedule(saved){
 // Hold modes store a slot index in byte 4, not a minute-of-day. Once mode
 // becomes zero, firmware validates all eight minute fields, so reset them.
 const b=new Uint8Array(20);b.fill(255,4);b[0]=1;
 const interval=saved[2]|saved[3]<<8;
 b[2]=(interval>=1&&interval<=1440?interval:30)&255;
 b[3]=(interval>=1&&interval<=1440?interval:30)>>8;
 // A picture clock may also store its time corner in byte 19. Its range is
 // valid in a stopped schedule; preserve that preference without the slot.
 if((saved[1]===6||saved[1]===7)&&saved[19]<=3)b[19]=saved[19];
 return b;
}
async function permitWrite(){
 assertConnection();
 return true;
}
function planes(canvas){
 const width=geometry().width,plane=width*16;
 if(canvas.width!==width||canvas.height!==128)throw Error('Ảnh cần đúng '+width+' × 128. Chọn đúng kích thước màn và chỉnh ảnh trước khi lưu.');
 const rgba=canvas.getContext('2d').getImageData(0,0,width,128).data,b=new Uint8Array(plane*2);b.fill(255);
 let bit=0;
 for(let x=width-1;x>=0;x--)for(let y=0;y<128;y++,bit++){
  const p=(y*width+x)*4,r=rgba[p],g=rgba[p+1],blue=rgba[p+2];
  const red=r>120&&r>g*1.4&&r>blue*1.4;
  const black=!red&&(r+g+blue)<384,byte=bit>>3,m=128>>(bit&7);
  if(black)b[byte]&=~m;if(red)b[plane+byte]&=~m;
 }
 return b;
}
async function upload(begin,body,bytes,onProgress=()=>{}){
 const r=await (T.probeBasic||T.probe)();if(r[8])throw Error('Đang có phiên truyền chưa hoàn tất. Kết nối lại và đọc trạng thái.');
 await T.request(begin,body);const chunk=r[9]-1;
 for(let pos=0;pos<bytes.length;pos+=chunk){await T.request(18,[pos&255,pos>>8,...bytes.slice(pos,pos+chunk)]);$('photo-progress').value=Math.min(pos+chunk,bytes.length)/bytes.length*100;onProgress($('photo-progress').value);}
 await T.request(19);
}
async function verify(base,bytes,magic){
 const h=await T.read(base,16),v=new DataView(h.buffer);
 if(v.getUint32(0,true)!==magic||v.getUint32(8,true)!==bytes.length||v.getUint32(12,true)!==T.crc32(bytes))throw Error('Chưa khớp bộ dữ liệu vừa lưu.');
 await T.verify(base+16,bytes);
}
function schedule(){
 const b=new Uint8Array(20);b.fill(255,4);b[0]=1;b[1]=Number($('photo-cycle-mode').value);
 const minutes=Number($('photo-interval').value);if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Khoảng đổi ảnh từ 1 đến 1440 phút.');
 b[2]=minutes&255;b[3]=minutes>>8;const used=new Set();let entries=0;
 for(let i=0;i<8;i++){
  const time=$('photo-time-'+i).value;if(!time)continue;
  if(!/^\d{2}:\d{2}$/.test(time))throw Error('Giờ ảnh không hợp lệ.');
  const parts=time.split(':').map(Number),m=parts[0]*60+parts[1];if(parts[0]>23||parts[1]>59)throw Error('Giờ ảnh không hợp lệ.');
  if(b[1]===2&&mask&(1<<i)){if(used.has(m))throw Error('Hai ảnh không được trùng giờ.');used.add(m);entries++;}
  b[4+i*2]=m&255;b[5+i*2]=m>>8;
 }
 if(b[1]&&!mask)throw Error('Lưu ít nhất một ảnh trước khi bật tự đổi.');
 if(b[1]===2&&!entries)throw Error('Chọn ít nhất một giờ cho ảnh đã lưu.');
 return b;
}
async function saveSchedule(stop=false){
 await caps(false);const b=schedule();if(stop)b[1]=0;
 if(!await permitWrite())return;
 if(b[1])await sendNrf52Mode(0); // Sync clock/timezone without opening a clock face.
 say('Đang lưu lịch đổi ảnh…');
 await upload(20,[...u32(0xc0decafe),...u32(T.crc32(b))],b);
 const r=await caps(false),base=new DataView(r.buffer,r.byteOffset).getUint32(12,true);
 const start=geometry().schedule;if(base!==start&&base!==start+0x1000)throw Error('Không nhận được lịch đã lưu.');
 await verify(base,b,0x31534856);if(!b[1]&&(nrf52DisplayMode===14||nrf52DisplayMode===15))await sendNrf52Mode(0);await caps(true);$('photo-progress').value=100;
 say(b[1]?'Đã lưu lịch và bật tự đổi ảnh. Bạn có thể ngắt kết nối web. Chuyển sang mode đồng hồ/lịch sẽ tạm dừng album.':'Đã tắt tự đổi ảnh; ảnh hiện tại vẫn giữ trên màn.');
}
$('photo-choose').onclick=()=>{$('image_file').click();$('canvas-box').scrollIntoView({behavior:'smooth',block:'center'});};
$('photo-check').onclick=()=>action(async()=>{await caps(true);say(mask?'Đã đọc ảnh đã lưu. Chọn cách đổi ảnh hoặc bấm Xem để hiển thị ngay.':'Chưa có ảnh. Chọn ảnh và lưu vào một ô để bắt đầu.');});
$('photo-save').onclick=()=>action(async()=>{
 const slot=Number($('photo-slot').value);if(!Number.isInteger(slot)||slot<0||slot>7)throw Error('Ô lưu ảnh không hợp lệ.');
 const bytes=planes($('canvas'));await caps(false);
 if(!await permitWrite())return;
 if(mask&(1<<slot)&&!confirm('Thay ảnh đang lưu trong ô '+(slot+1)+'? Các ô khác vẫn được giữ.'))return;
 say('Đang lưu ảnh '+(slot+1)+'. Giữ kết nối; không tháo pin.');
 await upload(17,[...u32(0xc0decafe),slot,...u32(T.crc32(bytes))],bytes);
 let base=0,generation=0;
 const geo=geometry(),first=geo.photo+slot*geo.span;
 for(const a of [first,first+geo.step]){
  const h=await T.read(a,16),v=new DataView(h.buffer),g=v.getUint32(4,true);
  if(v.getUint32(0,true)===0x31504856&&v.getUint32(8,true)===bytes.length&&v.getUint32(12,true)===T.crc32(bytes)&&(!base||(g-generation|0)>0)){base=a;generation=g;}
 }
 if(!base)throw Error('Không tìm thấy ảnh vừa ghi. Kết nối lại và đọc album.');
 await verify(base,bytes,0x31504856);await caps(false);$('photo-progress').value=100;
 say('Đã lưu và kiểm tra ảnh '+(slot+1)+'. Bấm Xem ảnh '+(slot+1)+' để xem hoặc Lưu và bắt đầu để tự đổi.');
});
$('photo-schedule-save').onclick=()=>action(()=>saveSchedule(false));
$('photo-stop').onclick=()=>action(async()=>{$('photo-cycle-mode').value='0';modeChanged();await saveSchedule(true);});
$('photo-cycle-mode').addEventListener('change',modeChanged);modeChanged();
window.PhotoAlbumBeforeDirectUpload=async()=>{
 if(!supported())return true;
 if(busy||window.VNDataBusy?.()||window.EpdDfuBusy?.()){alert('Đồng hồ đang xử lý. Hãy chờ hoàn tất rồi tải ảnh.');return false;}
 try{return await T.run(async()=>{
  const r=await caps(false);
  if(r[8]&&r[8]!==5&&r[8]!==6){
   $('photo-cycle-mode').value=String(r[8]>=3?0:r[8]);modeChanged();
   const message='Đồng hồ đang bật chế độ tự đổi ảnh. Chọn Giữ nguyên ảnh hiện tại trong Đồng hồ và ảnh, hoặc Tắt tự đổi ảnh trong Album ảnh trước khi tải ảnh trực tiếp.';
   say(message);alert(message);$('photo-album-controls').scrollIntoView({behavior:'smooth',block:'center'});return false;
  }return true;
 });}catch(e){say('Chưa kiểm tra được tự đổi ảnh: '+e.message);alert('Chưa đọc được trạng thái album. Hãy kiểm tra kết nối rồi thử lại.');return false;}
};
window.PhotoAlbumShared={action,caps,geometry,permitWrite,upload,verify,planes,say,u32,busy:()=>busy,get mask(){return mask;}};
window.PhotoAlbumTrial={planes,schedule,get mask(){return mask;}};
window.PhotoAlbumDelete={supported:deleteSupported,busy:()=>deleting,stoppedSchedule};
setInterval(deleteControls,500);deleteControls();
})();
