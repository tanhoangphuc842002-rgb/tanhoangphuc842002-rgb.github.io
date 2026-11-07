/* Optional artwork occupies a validated, previously reserved flash sector range. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const store=node?require('./resource_store'):root.EPDResourceStore;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder;
 const album=node?require('./album75'):root.Album75;
 const quotes=node?require('./quote75'):root.Quote75;
 const target={id:18,type:18,offset:0x78000,size:0x4000,schema:1,flags:0};
 function asset(bytes){
  const p=store.parsePackage(bytes),v=new DataView(p.payload.buffer,p.payload.byteOffset,p.payload.byteLength);
  if(p.id!==18||p.payload.length!==12492||v.getUint32(0,true)!==0x31545241||v.getUint16(4,true)!==480||v.getUint16(6,true)!==208||v.getUint32(8,true))throw Error('Ảnh mẫu chưa hợp lệ. Chưa ghi dữ liệu.');return p;
 }
 function layout(parts){
  const next=quotes.layout(parts),art=next.find(p=>p.id===18),free=next.find(p=>p.id===8);
  if(art){if(!Object.keys(target).every(k=>art[k]===target[k])||free.offset!==0x7c000||free.size!==0x4000)throw Error('Vùng lưu ảnh mẫu không phù hợp. Chưa ghi dữ liệu.');return next;}
  if(free.offset!==0x78000||free.size!==0x8000)throw Error('Chưa xác nhận được vùng trống an toàn.');
  const out=next.map(p=>p.id===8?{...p,offset:0x7c000,size:0x4000}:p).concat({...target});album.table(out);return out;
 }
 async function ensure(client,bytes,check=()=>{},write=()=>{},progress=()=>{},stage=()=>{}){
  const pack=asset(bytes);let phase='Kiểm tra dữ liệu đang có',entered=false;const mark=()=>{entered=true;write();};
  try{
   stage(phase);const current=await quotes.ready(client,check);
   if(current.some(p=>p.id===18)){
    const info=await client.inspect(18);check();
    if(info.code&&![1,3,4].includes(info.code))throw Error('Chưa đọc được ảnh mẫu. Hãy kết nối lại.');
    // Do not enter/leave a write session for an already installed picture.
    if(!info.code&&info.length===pack.payload.length&&info.crc===pack.crc){const font=await client.inspect(7);check();if(font.code)throw Error("Chưa đọc được bộ font. Hãy kết nối lại.");album.layout(current,font.length);phase='Áp dụng ảnh đã lưu';stage(phase);await client.leave();check();return true;}
   }
   // Hold display scheduling across the extra setup stage. A screen already
   // refreshing may finish first; only BUSY acquisition is safely retried.
   for(let attempt=0;;attempt++){
    check();try{await client.request(6,Uint8Array.of(77,73,71,49));entered=true;check();break;}
    catch(e){if(e.code!==2||attempt>=59)throw e;await new Promise(resolve=>setTimeout(resolve,1000));}
   }
   phase='Chuẩn bị vùng lưu ảnh';stage(phase);const parts=await album.prepare(client,check,mark,true),next=layout(parts);check();
   if(!parts.some(p=>p.id===18)){
    const old=store.parsePackage(await client.readPackage(parts.find(p=>p.id===1)));check();if(old.revision===0xffffffff)throw Error('Không thể cập nhật vùng lưu ảnh.');
    mark();await client.upload(builder.wrap(1,album.table(next),old.revision+1),()=>check(),parts);check();
    const actual=await client.partitions();check();if(JSON.stringify(actual)!==JSON.stringify(store.parseTable({id:1,payload:album.table(next)})))throw Error('Chưa xác nhận được vùng lưu ảnh.');
   }
   const info=await client.inspect(18);check();
   if(info.code&&![1,3,4].includes(info.code))throw Error('Chưa đọc được ảnh mẫu. Hãy kết nối lại.');
   if(info.code||info.length!==pack.payload.length||info.crc!==pack.crc){
    phase='Ghi và chốt ảnh';stage(phase);mark();await client.upload(bytes,(n,total,durable)=>{check();progress(durable===undefined?n:durable,total);},next);check();
    phase='Kiểm tra ảnh đã ghi';stage(phase);const actual=await client.inspect(18);check();if(actual.code||actual.length!==pack.payload.length||actual.crc!==pack.crc)throw Error('Chưa xác nhận được ảnh đã lưu.');
   }
   if(entered){phase='Áp dụng dữ liệu sau khi lưu ảnh';stage(phase);await client.leave();check();entered=false;}return true;
  }catch(e){e.artPhase=phase;e.message=phase+': '+e.message+(e.operation!==undefined?' [bước '+e.operation+', mã '+e.code+']':'');throw e;}finally{if(entered&&!client.closed){try{await client.request(5);await client.leave();}catch(_){}}}
 }
 async function hasSavedArtwork(client,check=()=>{}){
  const parts=await quotes.ready(client,check),part=parts.find(p=>p.id===18);check();if(!part)return false;
  const info=await client.inspect(18);check();if([1,3,4].includes(info.code))return false;
  if(info.code)throw Error('Chưa đọc được tranh đã lưu. Hãy kết nối lại.');
  if(info.length!==12492)return false;
  const h=await client.readRange(part.offset+32,12);check();
  return [65,82,84,49,224,1,208,0,0,0,0,0].every((v,i)=>h[i]===v);
 }
 async function keepOrInstall(client,bytes,check=()=>{},write=()=>{},progress=()=>{},stage=()=>{}){
  if(await hasSavedArtwork(client,check)){stage('Giữ lại tranh đang lưu trên đồng hồ');return true;}
  return ensure(client,bytes,check,write,progress,stage);
 }
 async function diagnose(client,check=()=>{}){
  const s=store.parseStatus(await client.status());check();const out=['Trạng thái: mã '+s.code+', đang ghi '+s.active+', đã ghi '+s.received+' byte, phiên '+Number(s.entered)];
  if(s.active)return out;
  const parts=await client.partitions();check();
  for(const id of [18,2,3,6,7,9]){if(!parts.some(p=>p.id===id))continue;const v=await client.inspect(id);check();out.push('Dữ liệu '+id+': mã '+v.code+(v.code?'':', '+v.length+' byte, CRC '+v.crc.toString(16)));}
  const font=parts.find(p=>p.id===7),todo=parts.find(p=>p.id===9);
  if(font&&todo){
   const f=await client.readRange(font.offset+32,72),t=await client.readRange(todo.offset+32,16);check();
   const fv=new DataView(f.buffer,f.byteOffset),tv=new DataView(t.buffer,t.byteOffset);
   if(fv.getUint32(0,true)===0x314b5046&&tv.getUint32(0,true)===0x314f4454){
    const count=fv.getUint16(6,true),key=count>=4?fv.getUint32(68,true):0,taskKey=tv.getUint32(12,true);
    out.push('Font công việc: '+count+' ô, khóa '+key.toString(16)+'; công việc: v'+t[4]+', ô '+t[10]+', cỡ '+t[9]+', khóa '+taskKey.toString(16));
    if(t[10]===3&&key!==taskKey)out.push('Phông công việc và danh sách đã lưu không cùng khóa. Chưa thay đổi hoặc xóa dữ liệu này.');
   }
  }return out;
 }
 async function collectReport(client,check=()=>{}){
  const status=store.parseStatus(await client.status());check();
  if(status.active)throw Error('Đang có dữ liệu ghi dở. Dừng thao tác trước rồi thử tải tệp kiểm tra.');
  const parts=await client.partitions();check();const records=[];
  for(const id of [1,2,3,6,7,9,18]){
   const p=parts.find(p=>p.id===id);if(!p)continue;const info=await client.inspect(id);check();
   const head=await client.readRange(p.offset,32);check();const row={id,info,header:Array.from(head)};
   // Only read font bytes and a TODO header: no personal task/date text.
   if(id===7){const v=new DataView(head.buffer,head.byteOffset),n=v.getUint32(12,true);
    if(v.getUint32(0,true)===0x31535245&&v.getUint32(4,true)===0x10007&&n>0&&n<=p.size-32){
     const bytes=new Uint8Array(n+32);bytes.set(head);bytes.set(await client.readRange(p.offset+32,n),32);check();row.fontPackage=Array.from(bytes);
    }
   }else if(id===9){row.todoHeader=Array.from(await client.readRange(p.offset+32,16));check();}
   records.push(row);
  }return {schema:1,web:'61.76',status,partitions:parts,records};
 }
 async function installIntegrated(){
  if(typeof appVersion==='undefined'||![0x65,0x66].includes(appVersion))throw Error('Hãy cập nhật phần mềm đồng hồ trước.');
  const bytes=Uint8Array.from(atob(root.IntegratedClockData),c=>c.charCodeAt(0)),pack=store.parsePackage(bytes);
  return root.ExternalResourceInstaller.countdownOperation(async(client,check,write)=>{
   const parts=await client.partitions();check();const bank=parts.find(p=>p.id===8);
   if(!bank||bank.offset!==0x7c000||bank.size!==0x4000)throw Error('Bấm Cài đặt đồng hồ để chuẩn bị dữ liệu trước.');
   const info=await client.inspect(8);check();
   if(!info.code&&info.length===pack.payload.length&&info.crc===pack.crc)return true;
   if(info.code&&![1,3,4].includes(info.code))throw Error('Chưa đọc được tranh. Hãy kết nối lại.');
   let entered=false;
   try{
    say('Đang lưu tranh cho đồng hồ lớn…');
    for(let attempt=0;;attempt++){
     check();try{await client.request(6,Uint8Array.of(77,73,71,49));entered=true;break;}
     catch(e){if(e.code!==2||attempt>=59)throw e;await new Promise(resolve=>setTimeout(resolve,1000));}
    }
    check();write();await client.upload(bytes,(n,total,durable)=>{check();$('externalResourceProgress').value=(durable===undefined?n:durable)/total;},parts);check();
    const actual=await client.inspect(8);check();if(actual.code||actual.length!==pack.payload.length||actual.crc!==pack.crc)throw Error('Chưa xác nhận được tranh đã lưu. Kết nối lại rồi thử lại.');
    await client.leave();entered=false;check();say('Đồng hồ lớn đã sẵn sàng.');return true;
   }finally{if(entered&&!client.closed){try{await client.request(5);await client.leave();}catch(_){}}}
  });
 }
 const api={installIntegrated,asset,layout,ensure,hasSavedArtwork,keepOrInstall,diagnose,collectReport};if(node){module.exports=api;return;}
 const $=id=>document.getElementById(id);let busy=false,galleryPage=0,pickedId=null;const pageSize=6;
 function supported(){return typeof appVersion!=='undefined'&&[0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66].includes(appVersion)&&typeof gattServer!=='undefined'&&!!gattServer?.connected;}
 function controls(force=false){const locked=force||busy||!!root.DeviceOperations?.current,disabled=locked||!supported();$('art75Mode').disabled=disabled;if($('art75Report'))$('art75Report').disabled=disabled;
  for(const id of ['art75Save','art75Open','art75Place','art75SavePlace','art75ReadPlace'])if($(id))$(id).disabled=disabled;
  root.ArtUpload75?.controls(locked,!supported());
  if($('art75Stop'))$('art75Stop').disabled=!busy;if($('art75Previous'))$('art75Previous').disabled=locked||galleryPage===0;if($('art75Next'))$('art75Next').disabled=locked||(galleryPage+1)*pageSize>=gallery().length;
  for(const el of document.querySelectorAll?.('[name="art75Picture"]')||[])el.disabled=locked;
 }
 function say(text){$('art75Status').textContent=text;root.addLog?.('Đồng hồ tranh: '+text);}
 async function installDefault(){
  const bytes=Uint8Array.from(atob(root.ArtLandscapeData),c=>c.charCodeAt(0));
  say('Đang kiểm tra tranh đã lưu. Giữ kết nối và không tháo pin.');
  let last=-1;
  await root.ExternalResourceInstaller.countdownOperation(async(client,check,write)=>{
   try{await keepOrInstall(client,bytes,check,write,(n,total)=>{
    $('externalResourceProgress').value=.95*n/total;const percent=Math.floor(n/total*100);
    if(percent===100){if(last!==100)say('Đã truyền đủ ảnh. Đang xác nhận ghi và áp dụng dữ liệu…');last=100;}
    else if(Math.floor(percent/10)!==Math.floor(last/10)){say('Đang lưu ảnh mẫu: '+percent+'%.');last=percent;}
   },text=>say(text+'…'));}
   catch(e){try{const lines=await diagnose(client,check);for(const text of lines)root.addLog?.('Kiểm tra cài tranh: '+text);}catch(d){root.addLog?.('Kiểm tra cài tranh: Chưa đọc được trạng thái: '+d.message);}throw e;}
  });$('externalResourceProgress').value=1;say('Tranh đã sẵn sàng. Chọn Đồng hồ tranh để sử dụng.');
 }
 async function open(){
  if(busy||root.DeviceOperations?.current)return;
  if(!supported()){say('Cập nhật phần mềm đồng hồ để sử dụng mẫu này.');return;}
  busy=true;controls();
  try{await installDefault();if(!await root.sendTimeCommand(10,'Đồng hồ tranh'))throw Error('Chưa mở được đồng hồ. Hãy kết nối lại.');say('Đã mở Đồng hồ tranh. Giờ và ngày tự cập nhật.');}
  catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}
  finally{busy=false;controls();}
 }
 function gallery(){return Array.isArray(root.ArtGallery75Data)?root.ArtGallery75Data:[];}
 function selected(){const id=document.querySelector?.('[name="art75Picture"]:checked')?.value||pickedId||gallery()[0]?.id;const picture=gallery().find(p=>p.id===id);if(!picture)throw Error('Hãy chọn một tranh trong kho.');return picture;}
 function initGallery(){const box=$('art75Gallery');if(!box||!document.createElement)return;
  const entries=gallery();if(!pickedId)pickedId=entries[0]?.id;box.replaceChildren();box.setAttribute('data-gallery-count',String(entries.length));
  for(const p of entries.slice(galleryPage*pageSize,(galleryPage+1)*pageSize)){
   const label=document.createElement('label');label.className='art75-card';
   const input=document.createElement('input');input.type='radio';input.name='art75Picture';input.value=p.id;input.checked=p.id===pickedId;
   input.addEventListener('change',()=>{pickedId=p.id;if($('art75ChoiceName'))$('art75ChoiceName').textContent='Đang chọn: '+p.label;});
   const image=document.createElement('img');image.src=p.preview;image.alt=p.label;image.width=480;image.height=208;
   const caption=document.createElement('span');caption.textContent=p.label;label.append(input,image,caption);box.appendChild(label);
  }
  if($('art75Page'))$('art75Page').textContent='Trang '+(galleryPage+1)+' / '+Math.max(1,Math.ceil(entries.length/pageSize));
  if($('art75ChoiceName'))$('art75ChoiceName').textContent='Đang chọn: '+(entries.find(p=>p.id===pickedId)?.label||'');
 }
 function changePage(step){if(busy||root.DeviceOperations?.current)return;galleryPage=Math.max(0,Math.min(Math.ceil(gallery().length/pageSize)-1,galleryPage+step));initGallery();controls();}
 async function savePicture(picture){
  if(busy||root.DeviceOperations?.current)return;if(!supported()){say('Kết nối đồng hồ trước khi lưu tranh.');return;}
  busy=true;controls();if($('art75Progress'))$('art75Progress').value=0;
  try{
   const bytes=picture.bytes||Uint8Array.from(atob(picture.package),c=>c.charCodeAt(0));asset(bytes);say('Đang lưu tranh '+picture.label+'. Giữ kết nối và không tháo pin.');
   await root.ExternalResourceInstaller.countdownOperation((client,check,write)=>ensure(client,bytes,check,write,(n,total)=>{if($('art75Progress'))$('art75Progress').value=n/total;},say));
   if(!await root.sendTimeCommand(10,'Đồng hồ tranh'))throw Error('Đã lưu tranh. Kết nối lại rồi bấm Mở tranh đã lưu.');
   if($('art75Progress'))$('art75Progress').value=1;say('Đã lưu tranh '+picture.label+'. Đồng hồ giữ tranh này khi đóng web và thay pin.');
  }catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}finally{busy=false;controls();}
 }
 function syncPlace(text){for(const id of ['art75Place','quote75Place'])if($(id))$(id).value=text;}
 async function placeAction(save){
  if(busy||root.DeviceOperations?.current)return;if(!supported()){say('Kết nối đồng hồ trước khi thay đổi vị trí.');return;}
  busy=true;controls();
  try{
   if(save){const text=quotes.placeText($('art75Place').value);say('Đang lưu vị trí…');await root.ExternalResourceInstaller.countdownOperation((c,check,write)=>quotes.savePlace(c,text,check,write));syncPlace(text);
    if(!await root.sendTimeCommand(10,'Đồng hồ tranh'))throw Error('Đã lưu vị trí. Kết nối lại rồi bấm Mở tranh đã lưu.');say(text?'Đã lưu vị trí: '+text+'.':'Đã bỏ tên vị trí.');
   }else{say('Đang đọc vị trí đã lưu…');const text=await root.ExternalResourceInstaller.countdownOperation((c,check)=>quotes.readPlace(c,check));syncPlace(text);say(text?'Vị trí đang lưu: '+text+'.':'Chưa đặt vị trí.');}
  }catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}finally{busy=false;controls();}
 }
 function stop(){if(!busy||!confirm('Dừng thao tác và ngắt kết nối? Sau đó có thể kết nối lại để thử tiếp.'))return;
  root.ExternalResourceInstaller.disconnect();if(typeof bleDevice!=='undefined'&&bleDevice?.gatt?.connected)bleDevice.gatt.disconnect();root.disconnect?.();say('Đã dừng. Kết nối lại để lưu tranh hoặc vị trí.');}
 async function downloadReport(){
  if(busy||root.DeviceOperations?.current||!supported())return;
  busy=true;controls();say('Đang đọc tệp kiểm tra. Bước này không ghi hoặc xóa dữ liệu.');
  try{const report=await root.ExternalResourceInstaller.countdownOperation((client,check)=>collectReport(client,check));
   const url=URL.createObjectURL(new Blob([JSON.stringify(report)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='epd75-font-check.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Đã tạo epd75-font-check.json. Tệp chỉ có dữ liệu kiểm tra và font, không chứa nội dung công việc hoặc ngày đã đánh dấu.');
  }catch(e){say('Chưa đọc được tệp kiểm tra: '+e.message);}finally{busy=false;controls();}
 }
 root.ArtClock75={installIntegrated,...api,installDefault,open,controls,downloadReport,saveSelected:()=>savePicture(selected()),saveCustom:bytes=>savePicture({label:'của bạn',bytes}),previous:()=>changePage(-1),next:()=>changePage(1),readLocation:()=>placeAction(false),saveLocation:()=>placeAction(true),stop};initGallery();controls();
})(globalThis);
