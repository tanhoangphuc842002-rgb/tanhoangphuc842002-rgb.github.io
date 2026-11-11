/* UI transactions use the existing atomic resource banks. No new firmware is required. */
(()=>{
'use strict';
const Q=window.DailyQuotes,T=window.VNTransport,$=id=>document.getElementById(id),MAGIC=0x31455451;
const names=['Tắt danh ngôn','100 câu có sẵn','Câu riêng của tôi','Kết hợp cả hai'];
let busy=false,serial=0,cache=null,interruptedKey=null,writeKey=null,connection=null,deviceKey='',synced=false;
let mode=1,known=false,defaultsCount=0,personalCount=0,editing=false,loadedKey='',baseline=null,originalRows=[];
const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
function check(){if(!Q.supported())throw Error('Đồng hồ này chưa hỗ trợ danh ngôn. Chưa gửi thay đổi.');if(!gattServer?.connected)throw Error('Hãy kết nối lại đồng hồ trước.');}
function status(s){$('daily-quote-status').textContent=s;if(typeof addLog==='function')addLog('Danh ngôn: '+s);}
function draw(){
 $('daily-quote-enable').checked=mode!==0;
 $('daily-quote-built-in').setAttribute('aria-pressed',String(known&&mode===1&&!editing));
 $('daily-quote-personal').setAttribute('aria-pressed',String(editing||(known&&mode===2)));
 $('daily-quote-mixed').setAttribute('aria-pressed',String(known&&mode===3&&!editing));
 for(const id of ['daily-quote-built-in','daily-quote-personal','daily-quote-save','daily-quote-discard'])$(id).disabled=busy||T.busy();
 $('daily-quote-mixed').disabled=busy||T.busy()||!known||!defaultsCount||!personalCount;
 $('daily-quote-mixed-hint').hidden=!!(known&&defaultsCount&&personalCount);
 $('daily-quote-current').textContent=known?'Đang dùng: '+names[mode]+'.':'Đang đọc lựa chọn trên đồng hồ…';
 $('daily-quote-editor').hidden=!editing;$('daily-quote-recover').hidden=!busy;$('daily-quote-recover').disabled=false;
}
async function action(fn,{quiet=false}={}){
 if(busy||T.busy()){if(!quiet)status('Đang có thao tác khác. Hãy chờ hoàn tất.');draw();return;}
 const id=++serial;busy=true;$('daily-quote-progress').value=0;draw();
 try{return await T.run(fn,v=>{if(serial===id)$('daily-quote-progress').value=v;});}
 catch(e){if(serial===id){if(writeKey){interruptedKey=writeKey;writeKey=null;cache=null;synced=false;}if(!quiet)status('Chưa hoàn tất: '+e.message);}}
 finally{if(serial===id){busy=false;draw();}}
}
async function ready(recover=false){
 check();const token=T.current();let c=await T.probe();T.guard(token);
 // Uploading can hide readiness. Abort the unfinished transaction FIRST; only
 // then let firmware revalidate either committed bank through a fresh probe.
 if(c[8]){if(!recover)throw Error('Có lần truyền dở. Chọn bộ câu có sẵn hoặc mở câu riêng để khôi phục.');cache=null;T.guard(token);await T.request(5);c=await T.probe();T.guard(token);}
 if(c[8])throw Error('Lần truyền dở chưa dừng. Hãy kết nối lại rồi thử lại.');
 if(!c[7]){c=await T.probe();if(!c[7])throw Error('Chưa đọc được bản dữ liệu đã lưu. Không xóa hoặc cài lại tự động; hãy kết nối lại rồi thử lại.');}
 T.guard(token);return c;
}
async function info(recover=false){
 const token=T.current();await ready(recover);T.guard(token);const r=await T.request(14);if(r.length!==10)throw Error('Chưa đọc được lựa chọn.');
 const a=new DataView(r.buffer,r.byteOffset).getUint32(6,true);if(!((a>=0x60010&&a<=0x6fff0)||(a>=0x70010&&a<=0x7fff0)))throw Error('Chưa đọc được dữ liệu danh ngôn đã lưu. Chưa ghi thay đổi.');
 const h=await T.read(a,16),v=new DataView(h.buffer,h.byteOffset);if(v.getUint32(0,true)!==MAGIC||h[4]!==1||h[5]>3||h[6]>100||h[7]>50)throw Error('Dữ liệu danh ngôn chưa được xác nhận.');
 T.guard(token);mode=h[5];defaultsCount=h[6];personalCount=h[7];known=true;draw();return {mode,defaults:defaultsCount,personal:personalCount};
}
async function bank(){
 const key=T.key(),cap=await ready(true),a=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true);if(a!==0x60000&&a!==0x70000)throw Error('Chưa xác nhận được vùng lưu.');
 const h=await T.read(a,16);if(cache&&cache.key===key&&cache.a===a&&same(h,cache.h))return {...cache,cap};
 const b=await Q.readBank();if(key!==T.key())throw Error('Kết nối đã thay đổi. Hãy thử lại.');if(!b.tail.quote)throw Error('Chưa đọc được bản danh ngôn đã lưu. Chưa ghi thay đổi.');cache={...b,key};return cache;
}
async function commit(b,bytes){
 const key=T.key(),token=T.current();if(bytes.length>([213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,242,243,244,241,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?65520:61440))throw Error('Danh sách đã đầy vùng lưu. Hãy rút ngắn hoặc bỏ bớt câu.');
 if(key!==b.key||!same(await T.read(b.a,16),b.h))throw Error('Dữ liệu đã thay đổi. Hãy mở lại câu riêng để đọc bản mới.');
 const crc=T.crc32(bytes);if(!same(bytes,b.bytes)){
  T.guard(token);writeKey=key;await T.request(2,[...u32(0xc0decafe),bytes.length&255,bytes.length>>8,...u32(crc)]);
  const chunk=b.cap[9]-1;for(let at=0;at<bytes.length;at+=chunk){T.guard(token);await T.request(3,[at&255,at>>8,...bytes.slice(at,at+chunk)]);T.guard(token);$('daily-quote-progress').value=Math.min(bytes.length,at+chunk)/bytes.length*100;}
  T.guard(token);await T.request(4,[1]);T.guard(token);cache=null;
 }
 const cap=await T.probe(),a=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true);if(a!==0x60000&&a!==0x70000)throw Error('Chưa xác nhận được vùng đã lưu.');
 const h=await T.read(a,16),v=new DataView(h.buffer,h.byteOffset);if(!cap[7]||cap[8]||v.getUint32(0,true)!==0x31544e56||v.getUint32(8,true)!==bytes.length||v.getUint32(12,true)!==crc)throw Error('Chưa xác nhận được bản lưu. Hãy kết nối lại rồi thử lại.');
 await T.verify(a+16,bytes);T.guard(token);if(key!==T.key())throw Error('Đã đổi thiết bị.');cache={cap,a,h,bytes,tail:Q.locate(bytes),key};
 const saved=Q.decode(cache.tail.quote);mode=saved.mode;defaultsCount=saved.defaults.length;personalCount=saved.custom.length;known=true;writeKey=null;interruptedKey=null;
 await sendNrf52Mode(nrf52PanelProfile===0x29?11:10);T.guard(token);return saved;
}
function parseBulk(){
 const lines=$('daily-quote-bulk').value.replace(/\r/g,'').split('\n').map(s=>s.trim().normalize('NFC')).filter(Boolean);if(lines.length>50)throw Error('Tối đa 50 câu. Mỗi dòng là một câu.');
 return lines.map((text,i)=>{try{const lines=Q.wrap(text,nrf52PanelProfile===0x29?196:160),old=originalRows.find(q=>q.text===text),q={text,lines,author:old?.author||''};Q.pack(2,[q]);return q;}catch(e){throw Error('Câu '+(i+1)+': '+e.message);}});
}
function preview(){
 const count=$('daily-quote-bulk').value.replace(/\r/g,'').split('\n').filter(s=>s.trim()).length;$('daily-quote-count').textContent=count+' / 50 câu riêng';
 const c=$('daily-quote-preview');c.width=nrf52PanelProfile===0x29?204:168;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
 try{const rows=parseBulk();if(rows.length){rows[0].lines.forEach((s,i)=>window.VNTrial.draw(ctx,s,(c.width-window.VNTrial.width(s,1))/2,i*17,1,'black'));$('daily-quote-fit').textContent='Xem trước câu đầu tiên. Các câu đều vừa tối đa hai dòng.';}else $('daily-quote-fit').textContent='Nhập mỗi câu trên một dòng. Chưa thay đổi đồng hồ.';}catch(e){$('daily-quote-fit').textContent=e.message;}
}
async function choose(next){
 check();if(next===2){
  const c=await T.probe();if(c[8]&&interruptedKey!==T.key()&&!confirm('Dừng lần truyền dở để mở các câu đã lưu?'))return;
  await info(true);interruptedKey=null;editing=true;
  if(loadedKey!==T.key()||baseline===null){const b=await bank(),saved=Q.decode(b.tail.quote);originalRows=saved.custom;baseline=JSON.stringify(saved.custom);loadedKey=T.key();$('daily-quote-bulk').value=saved.custom.map(q=>q.text).join('\n');}
  preview();draw();status('Nhập mỗi dòng một câu, rồi bấm Lưu và hiển thị câu riêng một lần.');return;
 }
 if(![0,1,3].includes(next))throw Error('Lựa chọn chưa hợp lệ.');
 if(next===3&&(!known||!defaultsCount||!personalCount))throw Error('Kết hợp cả hai chỉ dùng khi đã lưu ít nhất một câu riêng.');
 const c=await T.probe(),notice=c[8]?' Lần truyền dở sẽ được dừng; các câu đã lưu được giữ.':'';
 if(!confirm((next===0?'Ẩn danh ngôn trên đồng hồ?':'Dùng “'+names[next]+'” trên đồng hồ?')+notice)){draw();status('Đã giữ lựa chọn hiện tại.');return;}
 await info(true);const b=await bank(),saved=Q.decode(b.tail.quote);
 if((next===1||next===3)&&!saved.defaults.length)throw Error('Chưa có bộ câu mặc định đã lưu.');
 if(next===3&&!saved.custom.length)throw Error('Chưa có câu riêng đã lưu. Hãy nhập và lưu trước.');
 status('Đang áp dụng. Giữ kết nối đến khi hoàn tất.');const bytes=Uint8Array.from(b.bytes);bytes[b.tail.prefix+5]=next;await commit(b,bytes);editing=false;draw();status(next===0?'Đã ẩn danh ngôn.':'Đã hiển thị: '+names[next]+'.');
}
async function save(){
 check();const rows=parseBulk();if(!confirm(rows.length?'Lưu '+rows.length+' câu và hiển thị câu riêng trên đồng hồ?':'Xóa các câu riêng đã lưu và dùng lại 100 câu có sẵn?'))return;
 const b=await bank(),saved=Q.decode(b.tail.quote);if(loadedKey!==T.key())throw Error('Hãy mở lại Câu riêng của tôi để đọc danh sách trước khi lưu.');
 if(baseline!==null&&JSON.stringify(saved.custom)!==baseline)throw Error('Danh sách trên đồng hồ đã thay đổi. Bấm Bỏ thay đổi, rồi mở lại câu riêng để đọc bản mới.');
 const bytes=Q.concat(b.bytes.slice(0,b.tail.prefix),Q.pack(rows.length?2:1,rows),b.tail.marks);status('Đang lưu '+rows.length+' câu trong một lần truyền. Không tháo pin.');
 const after=await commit(b,bytes);originalRows=after.custom;baseline=JSON.stringify(after.custom);loadedKey=T.key();editing=false;draw();status(rows.length?'Đã lưu và hiển thị '+rows.length+' câu riêng.':'Đã xóa câu riêng và hiển thị 100 câu có sẵn.');
}
$('daily-quote-built-in').onclick=()=>action(()=>choose(1));$('daily-quote-personal').onclick=()=>action(()=>choose(2));$('daily-quote-mixed').onclick=()=>action(()=>choose(3));
$('daily-quote-enable').onchange=()=>{const next=$('daily-quote-enable').checked?1:0;return action(()=>choose(next));};$('daily-quote-save').onclick=()=>action(save);
$('daily-quote-bulk').addEventListener('input',preview);
$('daily-quote-discard').onclick=()=>{if(busy||T.busy())return;if(!confirm('Bỏ các câu đang sửa mà chưa lưu?'))return;editing=false;loadedKey='';baseline=null;originalRows=[];$('daily-quote-bulk').value='';preview();draw();status('Đã bỏ thay đổi đang soạn. Đồng hồ không thay đổi.');};
$('daily-quote-recover').onclick=()=>{
 if(busy){interruptedKey=T.key();writeKey=null;cache=null;synced=false;serial++;busy=false;T.cancel();draw();status('Đã dừng lưu; các câu đang nhập được giữ. Kết nối lại rồi chọn bộ câu muốn dùng, không cần cài lại dữ liệu.');return;}
 return action(async()=>{cache=null;await info(true);interruptedKey=null;status('Đã khôi phục bản dữ liệu đã lưu. Bạn có thể chọn nội dung ngay.');});
};
function refresh(sync=false){
 const ok=Q.supported()&&gattServer?.connected;$('daily-quote-controls').hidden=!ok;$('daily-quote-availability').textContent=ok?'Mỗi ngày một câu trên đồng hồ.':'Kết nối đồng hồ có hỗ trợ để sử dụng danh ngôn.';
 if(ok&&(deviceKey!==T.key()||connection!==epdCharacteristic)){deviceKey=T.key();connection=epdCharacteristic;synced=false;cache=null;known=false;personalCount=defaultsCount=0;}
 if(ok&&sync&&!synced&&!busy&&!T.busy()){synced=true;action(async()=>{const recovering=interruptedKey===T.key();await info(recovering);if(recovering){interruptedKey=null;status('Đã khôi phục bản dữ liệu đã lưu. Chọn bộ câu muốn dùng.');}},{quiet:true});}
 draw();
}
Object.assign(Q,{parseBulk,choose,save,refresh});preview();refresh();setInterval(()=>refresh(true),500);
})();
