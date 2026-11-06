/* Public catalog includes encrypted application ZIPs only, never full HEX. */
(() => {
 'use strict';
 const base=new URL('.',document.currentScript.src||location.href);
 const check=document.getElementById('auto-update-check'),note=document.getElementById('auto-update-status');
 let busy=false,pending=null;
 function current(){
if(typeof deviceProtocol==='undefined'||deviceProtocol!==PROTOCOL_NRF52||!gattServer?.connected)return null;
  // The inspected signed OTA245 release is uniquely no CE 2.9 (model 0x0292).
  // Never override an explicit panel marker or infer a shared/unknown version.
  if(nrf52FirmwareVersion===245&&nrf52PanelProfile==null){
   if(typeof nrf52ModelId!=='undefined'&&nrf52ModelId!==2)return null;
   return {id:'noce290',profile:0x29,device:bleDevice?.id,version:245};
  }
  let id=null;
  if(nrf52PanelProfile===0x21){
   const ce=[127,128,129,130,131,137,139,141,143,149,151,153,155,159,161,163,165,174,178,179,180,181,185,189,193,197,199,203,205,209,213,217,219,223,227,228,232,236,242,246,250,254,256,257,258,259,260,261],nc=[132,138,140,142,144,150,152,154,156,160,162,164,166,175,182,186,190,194,198,200,204,206,210,214,218,220,224,229,233,237,243,247,251,255,256,257,258,259,260,261];
   id=ce.includes(nrf52FirmwareVersion)?'ce213':nc.includes(nrf52FirmwareVersion)?'noce213':null;
  }else if(nrf52PanelProfile===0x29){
   id=[133,135,145,147,157,167,170,172,176,183,187,191,195,207,211,215,221,225,230,234,238,244,248,252,254,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288].includes(nrf52FirmwareVersion)?'ce290':[136,146,148,158,168,171,173,177,184,188,192,196,208,212,216,222,226,231,235,239,241,245,249,253,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288].includes(nrf52FirmwareVersion)?'noce290':null;
  }
  if([256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288].includes(nrf52FirmwareVersion))id=nrf52PanelProfile===33?([256,258,260,262,264,266,268,270,272,274,276,278,280,282,283,285,287].includes(nrf52FirmwareVersion)?'ce213':'noce213'):nrf52PanelProfile===41?([256,258,260,262,264,266,268,270,272,274,276,278,280,282,283,285,287].includes(nrf52FirmwareVersion)?'ce290':'noce290'):null;
  if([279,280,281,282,283,284,285,286,287,288].includes(nrf52FirmwareVersion))id=nrf52PanelProfile===33?({279:'noce213',286:'noce213',282:'ce213',285:'ce213'}[nrf52FirmwareVersion]||null):nrf52PanelProfile===41?({280:'ce290',281:'noce290',283:'ce290',287:'ce290',284:'noce290',288:'noce290'}[nrf52FirmwareVersion]||null):null;
  return id?{id,profile:nrf52PanelProfile,device:bleDevice?.id,version:nrf52FirmwareVersion}:null;
 }
 const say=s=>{note.textContent=s;};
 function unrecognizedMessage(){
  if(typeof deviceProtocol==='undefined'||deviceProtocol!==PROTOCOL_NRF52||!gattServer?.connected)
   return 'Kết nối đồng hồ 2.13 hoặc 2.9 CE/no CE để kiểm tra. Với 7.5 Original-VI, kết nối trong Đồng hồ 7.5 rồi mở mục cập nhật từ đó. Đồng hồ đời cũ vẫn dùng mục chọn file bên dưới.';
  const version=typeof nrf52FirmwareVersion==='number'&&Number.isInteger(nrf52FirmwareVersion)&&nrf52FirmwareVersion>0?nrf52FirmwareVersion:'chưa đọc được';
  const profile=typeof nrf52PanelProfile==='number'&&Number.isInteger(nrf52PanelProfile)?'0x'+nrf52PanelProfile.toString(16).toUpperCase():'chưa nhận được';
  const panel=nrf52PanelProfile===0x21?'2.13':nrf52PanelProfile===0x29?'2.9':'chưa xác định';
  return 'Bluetooth đã kết nối nhưng web chưa xác định được đúng gói OTA. Thông tin kiểm tra: firmware '+version+'; màn '+panel+'; mã màn '+profile+'. Hãy gửi nguyên thông báo này cho hỗ trợ. Chưa chọn hoặc gửi firmware; thiết bị đời cũ có thể cần file OTA riêng.';
 }
 async function read(url){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('Không tải được gói cập nhật.');return await r.arrayBuffer();}
  finally{clearTimeout(timer);}
 }
 async function prepare(){
  if(busy||window.EpdDfuBusy?.()||window.VNDataBusy?.()||window.countdownOperationBusy)return;
  const identity=current();if(!identity){if(!gattServer?.connected&&window.Original75Auto?.identity())return window.Original75Auto.prepare();say(unrecognizedMessage());return;}
  busy=true;check.disabled=true;pending=null;
  for(const id of ['dfu-file','dfu-start-button','dfu-new-device-button']){const el=document.getElementById(id);if(el)el.disabled=true;}
  try{
   say('Đang kiểm tra bản cập nhật phù hợp cho đồng hồ…');
   const cat=JSON.parse(new TextDecoder().decode(await read(new URL('update-catalog.json',base))));
   if(cat.schema!==1||!Array.isArray(cat.products))throw Error('Danh sách cập nhật không hợp lệ.');
   const matches=cat.products.filter(p=>p.id===identity.id);if(matches.length!==1)throw Error('Chưa có bản tự động cho loại đồng hồ này. Hãy dùng file được cung cấp.');
   const p=matches[0],model={ce213:0x0211,noce213:0x0212,ce290:0x0291,noce290:0x0292}[identity.id];
   if(p.model!==model||p.resource_profile!==identity.profile||!Number.isInteger(p.version)||p.version<1||p.version>4294967295||!/^updates\/[a-zA-Z0-9_.-]+\.zip$/.test(p.url)||!/^[0-9a-f]{64}$/.test(p.sha256))throw Error('Thông tin gói cập nhật không phù hợp.');
   if(identity.version>=p.version){say('Phần mềm đã có bản mới nhất trong trang này. Nếu đồng hồ hiện NO DATA, bấm Khôi phục đồng hồ bên dưới.');return;}
   const bytes=await read(new URL(p.url,base)),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
   if([...digest].map(v=>v.toString(16).padStart(2,'0')).join('')!==p.sha256)throw Error('Gói tải xuống chưa đầy đủ hoặc đã bị thay đổi.');
   const now=current();if(!now||now.id!==identity.id||now.device!==identity.device)throw Error('Thiết bị đã đổi. Kết nối lại đúng đồng hồ và kiểm tra lần nữa.');
   if(!await window.EpdDfu.load(bytes,p.label))throw Error('Chưa kiểm tra được gói cập nhật.');
   const info=window.EpdDfu.info();if(!info||info.model!==p.model||info.version!==p.version){window.EpdDfu.unload();throw Error('Gói không khớp danh sách cập nhật.');}
   pending={...identity,target:p.version,model:p.model,sent:false};
   say('Đã chọn đúng bản cho '+p.label+'. Bấm Bắt đầu cập nhật bên dưới; khi được yêu cầu, bấm lần nữa và chọn DFUTAG. Đồng hồ đời cũ hãy dùng file OTA riêng.');
  }catch(e){say((location.protocol==='file:'?'Hãy mở trang GitHub để tải bản tự động, hoặc chọn file ZIP bên dưới. ':'Chưa kiểm tra được bản cập nhật. Thử lại hoặc chọn file ZIP bên dưới. ')+(e.name==='AbortError'?'Kết nối tải file quá chậm.':e.message));}
  finally{busy=false;check.disabled=false;window.EpdDfu.refresh?.();}
 }
 check.addEventListener('click',prepare);
 window.addEventListener('dh-ota-reset',()=>{pending=null;});
 window.addEventListener('dh-ota-sent',e=>{
  if(pending&&e.detail?.model===pending.model&&e.detail?.version===pending.target){pending.sent=true;say('Đã gửi phần mềm. Chờ đồng hồ khởi động rồi kết nối lại. Dữ liệu tiếng Việt đã có sẽ được giữ; chỉ cần cài nếu màn hiện NO DATA.');}
 });
 setInterval(()=>{
  if(!pending?.sent||busy)return;const c=current();if(!c)return;
  if(c.device!==pending.device||c.id!==pending.id){say('Đang kết nối một đồng hồ khác. Hãy kết nối lại đồng hồ vừa cập nhật để kiểm tra.');return;}
  if(c.version!==pending.target){say('Chưa nhận được đúng bản mới từ đồng hồ. Kiểm tra kết nối và thử lại; chưa xác nhận cập nhật thành công.');return;}
  say('Đồng hồ đã chạy đúng phần mềm mới. Nếu màn hình hiện NO DATA, bấm Khôi phục đồng hồ bên dưới; chưa cần cài lại toàn bộ dữ liệu.');pending=null;
 },1500);
 window.EpdAutoUpdate={prepare,current,busy:()=>busy||!!window.Original75Auto?.busy()};
})();
