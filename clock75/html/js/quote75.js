(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const store=node?require('./resource_store'):root.EPDResourceStore;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder;
 const album=node?require('./album75'):root.Album75;
 const targets=[{id:16,type:16,offset:0x73000,size:0x4000,schema:1,flags:0},{id:17,type:17,offset:0x77000,size:0x1000,schema:1,flags:0}];
 function encode(lines){
  if(!Array.isArray(lines)||lines.length>50)throw Error('Lưu tối đa 50 câu riêng.');
  const strings=lines.map(s=>{
   if(typeof s!=='string')throw Error('Nội dung câu chưa hợp lệ.');
   s=s.normalize('NFC').trim();const b=new TextEncoder().encode(s);
   if(!s||Array.from(s).length>80||b.length>240||/[\x00-\x1f\x7f]/.test(s))throw Error('Mỗi câu từ 1 đến 80 ký tự; hãy viết ngắn để vừa hai dòng.');
   return b;
  });
  const b=new Uint8Array(10+strings.length*2+strings.reduce((n,s)=>n+s.length+1,0)),v=new DataView(b.buffer);
  b.set([81,66,75,49,1,strings.length,0,0]);let at=10+strings.length*2;
  strings.forEach((s,i)=>{v.setUint16(8+i*2,at,true);b.set(s,at);at+=s.length+1;});v.setUint16(8+strings.length*2,at,true);return b;
 }
 function decode(b){
  if(!(b instanceof Uint8Array)||b.length<10||![81,66,75,49,1].every((x,i)=>b[i]===x)||b[5]>50||b[6]||b[7])throw Error('Danh sách câu riêng chưa hợp lệ.');
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength),count=b[5],lines=[];let at=10+count*2;
  if(at>b.length||v.getUint16(8,true)!==at||v.getUint16(8+count*2,true)!==b.length)throw Error('Danh sách câu riêng bị thiếu.');
  for(let i=0;i<count;i++){
   const end=v.getUint16(10+i*2,true);if(end<=at||end>b.length||b[end-1]||b.subarray(at,end-1).includes(0))throw Error('Danh sách câu riêng bị lỗi.');
   lines.push(new TextDecoder('utf-8',{fatal:true}).decode(b.subarray(at,end-1)));at=end;
  }
  if(encode(lines).length!==b.length)throw Error('Danh sách câu riêng chưa hợp lệ.');return lines;
 }
 function layout(parts){
  const free=parts.find(p=>p.id===8);if(!free||!parts.some(p=>p.id===15))throw Error('Chưa chuẩn bị được nơi lưu câu riêng.');
  if(parts.some(p=>p.id===16||p.id===17)){
   if(targets.some(p=>!parts.some(q=>Object.keys(p).every(k=>p[k]===q[k])))||free.offset!==(parts.some(p=>p.id===18)?0x7c000:0x78000)||free.size!==(parts.some(p=>p.id===18)?0x4000:0x8000))throw Error('Vùng lưu câu riêng chưa phù hợp. Chưa ghi dữ liệu.');
   return parts.map(p=>({...p}));
  }
  if(free.offset!==0x73000||free.size!==0xd000)throw Error('Chưa xác nhận được vùng trống an toàn.');
  const next=parts.map(p=>p.id===8?{...p,offset:0x78000,size:0x8000}:{...p}).concat(targets.map(p=>({...p})));album.table(next);return next;
 }
 async function recover(client,check){
  let s=store.parseStatus(await client.status());check();
  if(s.code)throw Error('Hãy cài đặt dữ liệu đồng hồ trước.');
  if(s.active||s.entered){await client.request(5);check();await client.leave();check();s=store.parseStatus(await client.status());check();}
  if(s.code||s.active||s.entered)throw Error('Hãy dừng và kết nối lại rồi thử tiếp.');
 }
 async function ready(client,check=()=>{}){
  await recover(client,check);const parts=await client.partitions(),info=await client.inspect(6);check();
  const p=parts.find(p=>p.id===6);if(!p||info.code||((typeof appVersion!=='undefined'&&appVersion>=0x4E)&&info.revision<8)||info.length<9528)throw Error('Vào Cài đặt đồng hồ để cập nhật dữ liệu cho mẫu lịch xé.');
  const primary=await client.readRange(p.offset+32+396,16);check();
  if(![84,70,71,49].every((x,i)=>primary[i]===x))throw Error('Hãy cập nhật dữ liệu đồng hồ trước.');
  const start=396+148+new DataView(primary.buffer,primary.byteOffset).getUint32(8,true);
  if(start+64>info.length)throw Error('Hãy cập nhật dữ liệu đồng hồ trước.');
  const head=await client.readRange(p.offset+32+start,16);check();const count=head[6];
  if(![70,65,83,49,1,0].every((x,i)=>head[i]===x)||![4,6,9,10].includes(count)||head[7]||start+16+count*12>info.length)throw Error('Hãy cập nhật dữ liệu đồng hồ trước.');
  const h=await client.readRange(p.offset+32+start,16+count*12),v=new DataView(h.buffer,h.byteOffset);check();
  if(v.getUint32(8,true)!==info.length-start||v.getUint32(12,true))throw Error('Hãy cập nhật dữ liệu đồng hồ trước.');
  let at=16+count*12;for(let i=0;i<count;i++){const r=16+i*12,n=v.getUint32(r+8,true);if(v.getUint16(r,true)!==i+1||v.getUint16(r+2,true)||v.getUint32(r+4,true)!==at||n>info.length-start-at)throw Error('Bộ dữ liệu đồng hồ chưa đầy đủ.');at+=n;}
  if(at!==info.length-start)throw Error('Bộ dữ liệu đồng hồ chưa đầy đủ.');
  const q=await client.readRange(p.offset+32+start+v.getUint32(56,true),8);check();
  if(![81,66,75,49,1,100,0,0].every((x,i)=>q[i]===x))throw Error('Chưa có bộ 100 câu. Hãy cập nhật dữ liệu đồng hồ.');
  return parts;
 }
 async function prepare(client,check,write){
  const parts=await album.prepare(client,check,write),next=layout(parts);check();
  if(!parts.some(p=>p.id===17)){
   const old=store.parsePackage(await client.readPackage(parts.find(p=>p.id===1)));check();if(old.revision===0xffffffff)throw Error('Cần cập nhật bộ dữ liệu đồng hồ.');
   write();await client.upload(builder.wrap(1,album.table(next),old.revision+1),()=>check(),parts);check();
   const actual=await client.partitions();check();if(JSON.stringify(actual)!==JSON.stringify(store.parseTable({id:1,payload:album.table(next)})))throw Error('Chưa xác nhận được nơi lưu câu riêng.');
  }
  return next;
 }
 async function read(client,check=()=>{},parts=null){
  if(!parts)parts=await ready(client,check);const p=parts.find(p=>p.id===16);if(!p)return [];
  const info=await client.inspect(16);check();if([1,3,4].includes(info.code))return [];if(info.code)throw Error('Chưa đọc được câu riêng. Hãy kết nối lại.');
  const pack=store.parsePackage(await client.readPackage(p));check();return decode(pack.payload);
 }
 async function put(client,id,payload,parts,check,write,progress=()=>{}){
  const wrapped=builder.wrap(id,payload,Math.floor(Date.now()/1000)),p=store.parsePackage(wrapped);check();write();
  await client.upload(wrapped,(n,total,durable)=>{check();progress(durable===undefined?n:durable,total);},parts);check();
  const info=await client.inspect(id);check();if(info.code||info.length!==payload.length||info.crc!==p.crc||info.revision!==p.revision)throw Error('Chưa xác nhận được dữ liệu đã lưu.');
 }
 function mode(source,previous=null){if(!Number.isInteger(source)||source<0||source>2)throw Error('Hãy chọn nguồn danh ngôn.');const b=previous?previous.slice():Uint8Array.of(81,77,68,49,1,0,0,0);b[5]=source;return b;}
 function placeText(text){
  if(typeof text!=='string')throw Error('Địa điểm chưa hợp lệ.');text=text.normalize('NFC').trim();
  if(Array.from(text).length>20||new TextEncoder().encode(text).length>63||/[\x00-\x1f\x7f]/.test(text)||Array.from(text).some(c=>c.codePointAt(0)>65535))throw Error('Địa điểm tối đa 20 ký tự, có thể dùng tiếng Việt có dấu.');return text;
 }
 function place(bytes){
  if(bytes.length===8)return '';let end=bytes.indexOf(0,8);
  if(bytes.length!==72||end<8||bytes.subarray(end).some(x=>x))throw Error('Địa điểm đã lưu bị lỗi.');
  return placeText(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(8,end)));
 }
 async function settings(client,parts,check){
  if(!parts.some(p=>p.id===17))return mode(0);const info=await client.inspect(17);check();
  if([1,3,4].includes(info.code))return mode(0);if(info.code)throw Error('Chưa đọc được lựa chọn đã lưu. Hãy kết nối lại.');
  const b=store.parsePackage(await client.readPackage(parts.find(p=>p.id===17))).payload;check();
  if(![8,72].includes(b.length)||![81,77,68,49,1].every((x,i)=>b[i]===x)||b[5]>2||b[6]||b[7])throw Error('Lựa chọn đã lưu bị lỗi.');place(b);return b;
 }
 async function readPlace(client,check=()=>{}){const parts=await ready(client,check);return place(await settings(client,parts,check));}
 async function savePlace(client,text,check=()=>{},write=()=>{}){
  text=placeText(text);let entered=false;const mark=()=>{entered=true;write();};
  try{await ready(client,check);const parts=await prepare(client,check,mark),previous=await settings(client,parts,check),b=new Uint8Array(72);b.set(previous.subarray(0,8));b.set(new TextEncoder().encode(text),8);
   await put(client,17,b,parts,check,mark);await client.leave();check();entered=false;
  }finally{await cleanup(client,entered);}
 }
 async function cleanup(client,entered){if(entered&&!client.closed){try{await client.request(5);await client.leave();}catch(_){}}}
 async function choose(client,source,check=()=>{},write=()=>{}){
  mode(source);let entered=false;const mark=()=>{entered=true;write();};
  try{
   let parts=await ready(client,check);
   if(source&&!(await read(client,check,parts)).length)throw Error('Hãy lưu ít nhất một câu riêng trước khi chọn nguồn này.');
   if(source===0&&!parts.some(p=>p.id===17))return;
   parts=await prepare(client,check,mark);const previous=await settings(client,parts,check);await put(client,17,mode(source,previous),parts,check,mark);await client.leave();check();entered=false;
  }finally{await cleanup(client,entered);}
 }
 async function save(client,lines,check=()=>{},write=()=>{},progress=()=>{}){
  const payload=encode(lines);let entered=false;const mark=()=>{entered=true;write();};
  try{
   await ready(client,check);const parts=await prepare(client,check,mark),previous=await settings(client,parts,check);
   // Commit the built-in source first: an interrupted personal bank never hides built-ins.
   await put(client,17,mode(0,previous),parts,check,mark);
   await put(client,16,payload,parts,check,mark,progress);
   if(lines.length)await put(client,17,mode(1,previous),parts,check,mark);
   await client.leave();check();entered=false;
  }finally{await cleanup(client,entered);}
 }
 const api={encode,decode,layout,ready,read,choose,save,placeText,place,readPlace,savePlace};if(node){module.exports=api;return;}
 const $=id=>document.getElementById(id);let busy=false,savedCount=null;
 const supported=()=>typeof appVersion!=='undefined'&&[0x46,0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68].includes(appVersion)&&typeof gattServer!=='undefined'&&!!gattServer?.connected;
 function say(text){$('quote75Status').textContent=text;root.addLog?.('Danh ngôn: '+text);}
 function controls(force=false){
  if(!supported())savedCount=null;
  const locked=force||busy||!!root.DeviceOperations?.current||!supported();
  for(const el of document.querySelectorAll('[data-quote75]'))el.disabled=locked;
  for(const el of document.querySelectorAll('[data-place75]'))el.disabled=locked||![0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68].includes(appVersion);
  $('quote75Source').options[2].disabled=savedCount===0||savedCount===null;
  $('quote75Personal').hidden=$('quote75Source').value==='0';
  $('quote75Stop').disabled=!busy;
 }
 async function action(task){if(busy||root.DeviceOperations?.current)return;busy=true;controls();
  try{if(!supported())throw Error('Kết nối đồng hồ có phần mềm mới để dùng mẫu lịch xé.');await task();}
  catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}finally{busy=false;controls();}}
 async function show(){if(!await root.sendTimeCommand(9,'Đồng hồ lịch xé'))throw Error('Chưa mở được mặt đồng hồ. Hãy kết nối lại rồi thử.');}
 async function load(){return action(async()=>{say('Đang đọc câu riêng đã lưu…');const lines=await root.ExternalResourceInstaller.countdownOperation((c,check)=>read(c,check));savedCount=lines.length;$('quote75Text').value=lines.join('\n');say('Đã đọc '+savedCount+' / 50 câu riêng. Mỗi dòng là một câu.');});}
 async function apply(){return action(async()=>{
  const source=Number($('quote75Source').value),label=['100 câu có sẵn','câu riêng của tôi','cả hai nguồn'][$('quote75Source').value];
  if(!confirm('Dùng '+label+'?'))return;say('Đang áp dụng lựa chọn…');
  await root.ExternalResourceInstaller.countdownOperation((c,check,write)=>choose(c,source,check,write));await show();say('Đã chọn '+label+'. Mỗi ngày đồng hồ tự đổi một câu.');
 });}
 async function saveText(clear=false){return action(async()=>{
  const lines=clear?[]:$('quote75Text').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);encode(lines);
  if(!confirm(clear?'Xóa các câu riêng và trở về 100 câu có sẵn?':'Lưu '+lines.length+' câu và dùng trên đồng hồ?'))return;
  say('Đang lưu câu riêng. Giữ kết nối và không tháo pin.');$('quote75Progress').value=0;
  await root.ExternalResourceInstaller.countdownOperation((c,check,write)=>save(c,lines,check,write,(n,total)=>{$('quote75Progress').value=n/total;}));
  savedCount=lines.length;$('quote75Text').value=lines.join('\n');$('quote75Source').value=lines.length?'1':'0';$('quote75Progress').value=1;
  await show();say(lines.length?'Đã lưu '+lines.length+' câu riêng. Đồng hồ tự đổi câu mỗi ngày.':'Đã xóa câu riêng và dùng 100 câu có sẵn.');
 });}
 async function open(){return action(async()=>{await root.ExternalResourceInstaller.countdownOperation((c,check)=>ready(c,check));await show();say('Đã mở đồng hồ lịch xé. Mỗi ngày tự đổi một câu.');});}
 async function locationAction(save){return action(async()=>{
  if(![0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68].includes(appVersion))throw Error('Cập nhật phần mềm đồng hồ để lưu địa điểm.');
  if(save){const text=placeText($('quote75Place').value);say('Đang lưu địa điểm…');await root.ExternalResourceInstaller.countdownOperation((c,check,write)=>savePlace(c,text,check,write));$('quote75Place').value=text;if($('art75Place'))$('art75Place').value=text;await show();say(text?'Đã lưu địa điểm: '+text+'.':'Đã bỏ tên địa điểm.');}
  else{const text=await root.ExternalResourceInstaller.countdownOperation((c,check)=>readPlace(c,check));$('quote75Place').value=text;if($('art75Place'))$('art75Place').value=text;say(text?'Địa điểm đang lưu: '+text+'.':'Chưa đặt địa điểm.');}
 });}
 function stop(){if(!busy)return;if(!confirm('Dừng thao tác và ngắt kết nối? Sau đó có thể kết nối lại để thử tiếp.'))return;
  root.ExternalResourceInstaller.disconnect();if(typeof bleDevice!=='undefined'&&bleDevice?.gatt?.connected)bleDevice.gatt.disconnect();if(typeof root.disconnect==='function')root.disconnect();say('Đã dừng. Kết nối lại rồi chọn 100 câu có sẵn hoặc lưu lại câu riêng.');}
 root.Quote75={...api,controls,load,apply,saveText,open,stop,loadLocation:()=>locationAction(false),saveLocation:()=>locationAction(true)};$('quote75Source').addEventListener('change',()=>controls());controls();
})(globalThis);
