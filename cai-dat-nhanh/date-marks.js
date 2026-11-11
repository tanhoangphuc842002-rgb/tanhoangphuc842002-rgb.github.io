/* Personal dates are separate from tasks, countdown and photo albums. */
(() => {
'use strict';
const personal=()=>typeof nrf52FirmwareVersion!=='undefined'&&nrf52PanelProfile===33&&nrf52FirmwareVersion===266;
const $=id=>document.getElementById(id),T=window.VNTransport,enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
let busy=false,serial=0;
function supported(){if(typeof nrf52FirmwareVersion!=="undefined"&&nrf52FirmwareVersion===268)return false;return typeof deviceProtocol!=='undefined'&&deviceProtocol===PROTOCOL_NRF52&&nrf52ModelDetected&&nrf52ModelId===2&&((nrf52PanelProfile===0x21&&[180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266].includes(nrf52FirmwareVersion))||(nrf52PanelProfile===0x29&&[183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266].includes(nrf52FirmwareVersion)));}
const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
const clockMode=()=>nrf52PanelProfile===0x29?12:11;
function status(s){$('date-mark-status').textContent=s;if(typeof addLog==='function')addLog('Đánh dấu ngày tháng: '+s);}
function check(){if(!gattServer?.connected)throw Error('Hãy kết nối đồng hồ trước.');if(!supported())throw Error('Đồng hồ này chưa hỗ trợ đánh dấu ngày. Chưa gửi thay đổi.');}
async function ready(){check();const c=await T.probe();if(c[6]<4||!c[7])throw Error('Hãy cài đặt đồng hồ ở mục Cập nhật phần mềm trước.');if(c[8])throw Error('Có lần lưu chưa hoàn tất. Bấm Dừng truyền / khôi phục rồi lưu lại.');return c;}
function draft(){const rows=[];for(let i=0;i<3;i++){
 const date=$('date-mark-date-'+i).value,text=$('date-mark-text-'+i).value.trim().normalize('NFC');if(!date&&!text)continue;
 if(!date||!text)throw Error('Mục '+(i+1)+': cần nhập cả ngày và nội dung.');
 const m=/^(20\d\d)-(\d\d)-(\d\d)$/.exec(date);if(!m)throw Error('Ngày cần nằm trong năm 2000–2099.');
 const [y,mo,d]=m.slice(1).map(Number),dt=new Date(Date.UTC(y,mo-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)throw Error('Ngày đánh dấu không hợp lệ.');
 const bytes=enc.encode(text);if(bytes.length>71||window.VNTrial.width(text)>(nrf52PanelProfile===0x29?148:120))throw Error('Mục '+(i+1)+': nội dung chưa vừa một dòng. Hãy rút ngắn.');
 for(const c of text)if(!window.VNTrial.fonts[0].has(c.codePointAt(0)))throw Error('Chưa hỗ trợ ký tự '+c+'.');
 rows.push({date,y,mo,d,text,bytes});
 }rows.sort((a,b)=>a.date.localeCompare(b.date));for(let i=1;i<rows.length;i++)if(rows[i].date===rows[i-1].date)throw Error('Hai mục trùng ngày. Hãy gộp nội dung vào một mục.');
 const b=empty(),v=new DataView(b.buffer);b[5]=rows.length;rows.forEach((r,i)=>{const at=8+i*80;v.setUint16(at,r.y,true);b[at+2]=r.mo;b[at+3]=r.d;b[at+4]=r.bytes.length;b.set(r.bytes,at+8);});return b;
}
function empty(){const b=new Uint8Array(256);b.set([68,77,75,49,1,0]);return b;}
async function readMarks(){await ready();const r=await T.request(13);if(r.length!==10)throw Error('Chưa đọc được dữ liệu đã lưu.');const a=new DataView(r.buffer,r.byteOffset).getUint32(6,true);if(!a)return null;if(a<0x60010||a+256>0x80000)throw Error('Vị trí dữ liệu không hợp lệ.');const b=await T.read(a,256);if(b.length!==256||new DataView(b.buffer,b.byteOffset).getUint32(0,true)!==0x314b4d44||b[4]!==1||b[5]>3)throw Error('Dữ liệu đánh dấu chưa hợp lệ.');return b;}
function fill(b){for(let i=0;i<3;i++){const at=8+i*80,exists=b&&i<b[5];$('date-mark-date-'+i).value=exists?new DataView(b.buffer,b.byteOffset).getUint16(at,true)+'-'+String(b[at+2]).padStart(2,'0')+'-'+String(b[at+3]).padStart(2,'0'):'';$('date-mark-text-'+i).value=exists?dec.decode(b.slice(at+8,at+8+b[at+4])):'';}}
async function action(fn){const id=++serial;try{if(T.busy())throw Error('Đang có thao tác khác. Chờ hoàn tất hoặc dừng truyền trước.');busy=true;await T.run(fn,v=>{if(id===serial)$('date-mark-progress').value=v;});}catch(e){if(id===serial)status('Chưa hoàn tất: '+e.message);}finally{if(id===serial)busy=false;}}
async function save(bytes){const token=T.current(),cap=await ready(),key=T.key();
 if(!confirm(bytes[5]?'Lưu các ngày đánh dấu vào đồng hồ?':'Xóa tất cả ngày đánh dấu đã lưu trên đồng hồ? Giờ, lịch và ảnh không bị xóa.'))return;
 status(bytes[5]?'Đang lưu. Giữ kết nối đến khi hoàn tất.':'Đang xóa các ngày đã lưu. Giữ kết nối đến khi hoàn tất.');await T.request(12,[...u32(0xc0decafe),...u32(T.crc32(bytes))]);const chunk=cap[9]-1;
 for(let off=0;off<256;off+=chunk){await T.request(3,[off&255,off>>8,...bytes.slice(off,off+chunk)]);$('date-mark-progress').value=Math.min(256,off+chunk)/256*100;}
 await T.request(4,[1]);const saved=await readMarks();if(T.key()!==key||!saved||saved.some((v,i)=>v!==bytes[i]))throw Error('Chưa xác nhận được dữ liệu. Hãy đọc lại trước khi thử tiếp.');
 fill(saved);await sendNrf52Mode(clockMode());T.guard(token);status(personal()?'Đã lưu và mở lịch cá nhân. Các ngày trong tháng hiện tại được đánh dấu trên lịch.':bytes[5]?'Đã lưu và mở đồng hồ lật. Chỉ các ngày thuộc tháng hiện tại được hiển thị.':'Đã xóa các ngày đánh dấu. Đồng hồ và lịch vẫn hiển thị bình thường.');
}
$('date-mark-read').onclick=()=>action(async()=>{fill(await readMarks());status('Đã đọc các ngày đang lưu. Bạn có thể sửa rồi lưu lại.');});
$('date-mark-save').onclick=()=>action(async()=>{await ready();await save(draft());});
$('date-mark-clear').onclick=()=>action(()=>save(empty()));
$('date-mark-open').onclick=()=>action(async()=>{const token=T.current();await ready();await sendNrf52Mode(clockMode());T.guard(token);status(personal()?'Đã mở công việc và lịch tháng.':'Đã mở đồng hồ lật. Không có ngày đánh dấu vẫn xem giờ và lịch bình thường.');});
for(let i=0;i<3;i++)$('date-mark-remove-'+i).onclick=()=>{if(busy||T.busy())return;$('date-mark-date-'+i).value='';$('date-mark-text-'+i).value='';status('Đã bỏ mục '+(i+1)+' khỏi ô nhập. Bấm Lưu và xem trên đồng hồ để cập nhật.');};
$('date-mark-recover').onclick=()=>{
 if(busy){serial++;busy=false;T.cancel();$('date-mark-progress').value=0;status('Đã dừng truyền. Bấm Kết nối lại, rồi bấm Dừng truyền / khôi phục trước khi lưu lại. Nội dung đang nhập được giữ nguyên.');return;}
 if(T.busy()){status('Đang có thao tác khác. Hãy chờ thao tác đó hoàn tất.');return;}
 return action(async()=>{check();const key=T.key();let c=await T.probe();if(c[6]<4)throw Error('Đồng hồ chưa hỗ trợ thao tác này.');
  if(c[8]){await T.request(5);c=await T.probe();}
  if(T.key()!==key||c[8])throw Error('Chưa khôi phục được. Kết nối lại và thử lần nữa.');
  $('date-mark-progress').value=0;status('Đã sẵn sàng để lưu lại. Nội dung đang nhập và dữ liệu đã lưu trước đó được giữ nguyên. Bạn có thể bấm Đọc từ đồng hồ để kiểm tra.');
 });
};
window.DateMarks={supported,draft,read:readMarks};
})();

