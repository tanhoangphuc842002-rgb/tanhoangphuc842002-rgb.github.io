(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const store=node?require('./resource_store'):root.EPDResourceStore;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder;
 const codec=node?require('./photo_codec75'):root.PhotoCodec75;
 const IDS=[[12,13],[11,14]],META=15;
 const targets=[{id:12,type:12,offset:0x28000,size:0x18000,schema:1,flags:0},{id:13,type:13,offset:0x40000,size:0x18000,schema:1,flags:0},{id:11,type:11,offset:0x5a000,size:0xc000,schema:1,flags:0},{id:14,type:14,offset:0x66000,size:0xc000,schema:1,flags:0},{id:15,type:15,offset:0x72000,size:0x1000,schema:1,flags:0}];
 function layout(parts,fontLength){
  const same=(a,b)=>a&&['id','type','offset','size','schema','flags'].every(k=>a[k]===b[k]);
  const font=parts.find(p=>p.id===7),free=parts.find(p=>p.id===8);
  if(!font||font.type!==7||font.offset!==0x18000||![0x40000,0x10000].includes(font.size)||font.schema!==1||font.flags||!Number.isInteger(fontLength)||fontLength<1||fontLength>0x10000-32)throw Error('Bộ font hiện tại chưa phù hợp để mở album. Chưa ghi dữ liệu.');
  if(compact(parts)){
   const exact=[{id:13,type:19,offset:0x28000,size:0x22000,schema:1,flags:0},{...targets[0],offset:0x4a000,size:0xe000},{...targets[2],size:0x18000},targets[4],{id:16,type:16,offset:0x73000,size:0x4000,schema:1,flags:0},{id:17,type:17,offset:0x77000,size:0x1000,schema:1,flags:0},{id:18,type:18,offset:0x78000,size:0x4000,schema:1,flags:0}];
   if(font.size!==0x10000||!same(free,{id:8,type:8,offset:0x7c000,size:0x4000,schema:1,flags:0})||exact.some(p=>!same(parts.find(q=>q.id===p.id),p))||parts.some(p=>p.id===14||p.id>18))throw Error('Bố cục ảnh bốn mùa không hợp lệ. Chưa ghi dữ liệu.');
   return parts.map(p=>({...p}));
  }
  if(parts.some(p=>p.id===META)){
   const art=parts.find(p=>p.id===18),quotes=parts.some(p=>p.id===16||p.id===17),quoteTargets=[{id:16,type:16,offset:0x73000,size:0x4000,schema:1,flags:0},{id:17,type:17,offset:0x77000,size:0x1000,schema:1,flags:0}];
   if(font.size!==0x10000||!free||free.type!==8||free.schema!==1||free.flags||free.offset!==(art?0x7c000:quotes?0x78000:0x73000)||free.size!==(art?0x4000:quotes?0x8000:0xd000)||targets.some(p=>!same(parts.find(q=>q.id===p.id),p))||(quotes&&quoteTargets.some(p=>!same(parts.find(q=>q.id===p.id),p)))||(art&&(!quotes||!same(art,{id:18,type:18,offset:0x78000,size:0x4000,schema:1,flags:0})))||parts.some(p=>p.id>18))throw Error('Bố cục album không hợp lệ. Chưa ghi dữ liệu.');
   return parts.map(p=>({...p}));
  }
  if(parts.some(p=>p.id>11)||!parts.some(p=>p.id===10)||!free||free.type!==8||free.schema!==1||free.flags||!((free.offset===0x5a000&&free.size===0x26000)||(free.offset===0x66000&&free.size===0x1a000)))throw Error('Chưa nhận diện được vùng trống an toàn. Chưa ghi dữ liệu.');
  const photo=parts.find(p=>p.id===11);if(photo&&!same(photo,targets[2]))throw Error('Vùng ảnh cũ không phù hợp. Chưa ghi dữ liệu.');
  return parts.filter(p=>p.id!==11).map(p=>({...p,...(p.id===7?{size:0x10000}:p.id===8?{offset:0x73000,size:0xd000}:{})})).concat(targets.map(p=>({...p})));
 }
 function compact(parts){return parts.some(p=>p.id===13&&p.type===19);}
 function allowed(parts,index){if(compact(parts)&&![0,2].includes(index))throw Error('Chỉ có hai ô ảnh trong mỗi album.');}
 function table(parts){const b=new Uint8Array(parts.length*16),v=new DataView(b.buffer);parts.forEach((p,i)=>{const at=i*16;v.setUint16(at,p.id,true);v.setUint16(at+2,p.type,true);v.setUint32(at+4,p.offset,true);v.setUint32(at+8,p.size,true);v.setUint16(at+12,p.schema,true);v.setUint16(at+14,p.flags,true);});store.parseTable({id:1,payload:b});return b;}
 function picture(pixels,width){
  if(![400,800].includes(width)||!(pixels instanceof Uint8ClampedArray)||pixels.length!==width*480*4)throw Error('Kích thước ảnh chưa đúng.');
  const plane=width*60,b=new Uint8Array(16+plane*2);b.set([80,72,84,49,1,0,width&255,width>>8,224,1,2,0,0,0,0,0]);b.fill(255,16);
  for(let i=0;i<width*480;i++){const at=i*4,alpha=pixels[at+3]/255,r=pixels[at]*alpha+255*(1-alpha),g=pixels[at+1]*alpha+255*(1-alpha),blue=pixels[at+2]*alpha+255*(1-alpha);const red=r>100&&r>g*1.28&&r>blue*1.28,black=!red&&(r*.299+g*.587+blue*.114)<150;if(red||black)b[16+(red?plane:0)+(i>>3)]&=~(128>>(i&7));}return b;
 }
 function defaults(){const b=new Uint8Array(24);b.set([65,76,66,49,1,0,0,0,30,0,30,0,0,0,0,0]);return b;}
 function validSettings(b){return b instanceof Uint8Array&&b.length===24&&[65,76,66,49,1].every((v,i)=>v===b[i])&&b[5]<2&&b[6]<2&&b[7]<=4&&b[12]<8&&b[13]<8&&!b[14]&&!b[15]&&[8,10].every(at=>{const n=b[at]|b[at+1]<<8;return n>=1&&n<=1440;});}
 async function settings(client,parts){if(!parts.some(p=>p.id===META))return defaults();const info=await client.inspect(META);if([1,3,4].includes(info.code)||(!info.code&&info.length!==24))return defaults();if(info.code)throw Error('Chưa đọc được cài đặt album. Hãy kết nối lại.');const p=store.parsePackage(await client.readPackage(parts.find(p=>p.id===META)));return validSettings(p.payload)?p.payload:defaults();}
 async function masks(client){
  const out=[0,0],parts=await client.partitions();
  for(let k=0;k<2;k++)for(let g=0;g<2;g++){
   const id=IDS[k][g],p=parts.find(p=>p.id===id);if(!p||p.type!==id)continue;const r=await client.inspect(id);
   if(r.code){if(![1,3,4].includes(r.code))throw Error('Chưa đọc được album. Hãy kết nối lại.');continue;}
   const h=await client.readRange(p.offset+32,Math.min(48,r.length));let lengths;
   try{lengths=codec.directory(h,k?400:800,r.length);}catch(_){continue;}
   const container=codec.tag(h,'PAB1');let offset=container?48:0;
   for(let sub=0;sub<(compact(parts)?2:4);sub++){
    const n=lengths[sub];if(!n)continue;
    const b=container?await client.readRange(p.offset+32+offset,16):h;offset+=n;
    try{codec.header(b,k?400:800);const raw=k?48016:96016;
     if(codec.tag(b,'PHT1')?n!==raw:!codec.tag(b,'PHT2')||n<3860||n>=raw)continue;
     out[k]|=1<<(g+sub*2);
    }catch(_){/* A malformed header is not an available photo. */}
   }
  }
  return out;
 }
 async function put(client,id,bytes,parts,check,write,progress=()=>{}){
  check();write();const wrapped=builder.wrap(id,bytes,Math.floor(Date.now()/1000));await client.upload(wrapped,(n,total,durable)=>{check();progress(durable===undefined?n:durable,total);},parts);check();
  const pack=store.parsePackage(wrapped),info=await client.inspect(id);check();if(info.code||info.length!==bytes.length||info.crc!==pack.crc)throw Error('Chưa xác nhận được dữ liệu đã lưu.');
 }
 async function prepare(client,check,write,ownsSession=false){
  const status=store.parseStatus(await client.status());check();if(status.code||status.active||status.entered!==ownsSession)throw Error('Đồng hồ chưa sẵn sàng. Hãy kết nối lại hoặc cài đặt đồng hồ trước.');
  const parts=await client.partitions(),font=await client.inspect(7);check();if(font.code)throw Error('Chưa kiểm tra được bộ font. Chưa ghi dữ liệu.');
  const next=layout(parts,font.length);table(next);
  if(!parts.some(p=>p.id===META)){
   const old=store.parsePackage(await client.readPackage(parts.find(p=>p.id===1)));check();if(old.revision===0xffffffff)throw Error('Không thể cập nhật bố cục.');
   write();await client.upload(builder.wrap(1,table(next),old.revision+1),()=>check(),parts);check();
   const actual=await client.partitions();check();if(JSON.stringify(actual)!==JSON.stringify(store.parseTable({id:1,payload:table(next)})))throw Error('Chưa xác nhận được bố cục album.');
  }
  return next;
 }
 async function save(client,kind,index,payload,check=()=>{},write=()=>{},progress=()=>{},stage=()=>{}){
  if(![0,1].includes(kind)||!Number.isInteger(index)||index<0||index>7||payload!==null&&!(payload instanceof Uint8Array))throw Error('Ảnh hoặc ô ảnh không hợp lệ.');
  const width=kind?400:800;if(payload)codec.decode(payload,width);
  let entered=false;const mark=()=>{entered=true;write();};
  try{const parts=await prepare(client,check,mark);allowed(parts,index);const id=IDS[kind][index&1],part=parts.find(p=>p.id===id),info=await client.inspect(id);check();let images=[null,null,null,null];
   if(!info.code){
    const h=await client.readRange(part.offset+32,Math.min(48,info.length));check();let lengths;
    try{lengths=codec.directory(h,width,info.length);}catch(e){throw Error('Danh mục ảnh bị lỗi. Chưa ghi đè.');}
    if(lengths.some((n,i)=>n&&i!==(index>>1))){stage('Đang đọc những ảnh cần giữ lại…');const existing=store.parsePackage(await client.readPackage(part));check();try{images=codec.unpack(existing.payload,width);}catch(e){throw Error('Ảnh trong vùng lưu bị lỗi. Chưa ghi đè; hãy phục hồi dữ liệu trước.');}}
   }
   else if(![1,3,4].includes(info.code))throw Error('Chưa đọc được ảnh đang lưu.');
   images[index>>1]=payload;const packed=codec.pack(images,width);
   if(packed.length+32>part.size)throw Error('Không đủ chỗ lưu ảnh này. Hãy thử ô ảnh khác hoặc xóa bớt ảnh đã lưu. Chưa ghi đè ảnh.');
   stage('Đang ghi ảnh đã nén. Giữ kết nối và không tháo pin.');progress(0,packed.length);await put(client,id,packed,parts,check,mark,progress);await client.leave();check();entered=false;
   return {stored:packed.length,capacity:part.size-32,imageBytes:payload?codec.encode(payload,width).length:0,rawBytes:payload?.length||0};}
  finally{if(entered&&!client.closed){try{await client.request(5);await client.leave();}catch(_){}}}
 }
 async function schedule(client,kind,index,minutes,enabled,check,write,now){
  if(![0,1].includes(kind)||!Number.isInteger(index)||index<0||index>7||typeof enabled!=='boolean'||!Number.isInteger(now)||now<0||now>0xffffffff||!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Thời gian đổi ảnh phải từ 1 đến 1440 phút.');
  let entered=false;const mark=()=>{entered=true;write();};
  try{const parts=await prepare(client,check,mark);allowed(parts,index);const b=await settings(client,parts),mask=await masks(client);check();
   if(!mask[kind]||(!enabled&&!(mask[kind]&(1<<index))))throw Error('Ô ảnh chưa có ảnh. Hãy lưu ảnh trước.');
   if(enabled&&!(mask[kind]&(mask[kind]-1)))throw Error('Hãy lưu ít nhất hai ảnh trước khi bật luân phiên.');
   b[5+kind]=enabled?1:0;b[12+kind]=index;new DataView(b.buffer,b.byteOffset).setUint16(8+kind*2,minutes,true);new DataView(b.buffer,b.byteOffset).setUint32(16+kind*4,now,true);
   await put(client,META,b,parts,check,mark);await client.leave();check();entered=false;
  }finally{if(entered&&!client.closed){try{await client.request(5);await client.leave();}catch(_){}}}
 }
 const api={confirmReplace,layout,table,picture,defaults,validSettings,settings,masks,save,schedule,prepare,compact};
 if(node){module.exports=api;return;}
 const $=id=>document.getElementById(id);let busy=false;
 function supported(){return typeof appVersion!=='undefined'&&[0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6A,0x6B,0x6C].includes(appVersion)&&typeof gattServer!=='undefined'&&!!gattServer?.connected;}
 function controls(force=false){
  const small=typeof appVersion==='undefined'||!appVersion||appVersion>=0x4C;
  for(let kind=0;kind<2;kind++){
   const slot=$('album75-'+kind+'-slot'),key=small?'two':'eight';
   if(slot?.dataset&&slot.dataset.slots!==key){slot.innerHTML=(small?[0,2]:[0,1,2,3,4,5,6,7]).map((v,i)=>'<option value="'+v+'">Ảnh '+(i+1)+'</option>').join('');slot.dataset.slots=key;}
   const limit=$('album75-'+kind+'-limit');if(limit)limit.textContent=(kind?'Giờ bên trái, ảnh bên phải. ':'')+'Tối đa '+(small?'hai':'tám')+' ảnh, tùy dung lượng sau khi nén. Chọn ảnh ở trên rồi lưu từng ô. Có thể tự đổi ảnh khi đóng web.';
  }
  const disabled=force||busy||!supported()||!!root.DeviceOperations?.current;for(const el of document.querySelectorAll('[data-album75]'))el.disabled=disabled;}
 function say(kind,text){$('album75-'+kind+'-status').textContent=text;root.addLog?.('Album ảnh: '+text);}
 function label(index){return typeof appVersion!=='undefined'&&appVersion>=0x4C&&[0,2].includes(index)?index/2+1:index+1;}
 function localTime(){const now=new Date();return Math.floor(now.getTime()/1000)-now.getTimezoneOffset()*60;}
 async function action(kind,task){if(busy||root.DeviceOperations?.current)return;if(!supported()){say(kind,'Cập nhật phần mềm đồng hồ để dùng album ảnh.');return;}busy=true;controls();
  try{await task();}catch(e){say(kind,'Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}finally{busy=false;controls();}}
 async function read(kind){return action(kind,async()=>{let mask;await root.ExternalResourceInstaller.countdownOperation(async(client,check)=>{mask=await masks(client);check();});say(kind,'Ảnh đã lưu: '+Array.from({length:8},(_,i)=>i).filter(i=>mask[kind]&(1<<i)).map(i=>label(i)).join(', ')+(mask[kind]?'':'chưa có ảnh')+'.');});}
 async function confirmReplace(client,kind,index,check=()=>{},approve=message=>root.confirm(message)){
  if(![0,1].includes(kind)||!Number.isInteger(index)||index<0||index>7)throw Error('Ô ảnh không hợp lệ.');
  const existing=await masks(client);check();
  if(!(existing[kind]&(1<<index)))return true;
  const accepted=approve('Thay ảnh đang lưu trong ô '+label(index)+'? Các ô khác được giữ nguyên.');
  check();return accepted;
 }
 async function saveCurrent(kind){return action(kind,async()=>{
  const index=Number($('album75-'+kind+'-slot').value);
  if(kind){if(!root.PhotoClock.hasImage())throw Error('Chọn ảnh Đồng hồ+ảnh trước.');root.PhotoClock.flush();}else{if(!root.Image75Editor.hasImage())throw Error('Chọn một ảnh trước.');root.Image75Editor.flush();}
  const canvas=$(kind?'photoClockCanvas':'canvas'),payload=picture(canvas.getContext('2d').getImageData(0,0,kind?400:800,480).data,kind?400:800);
  say(kind,'Đang lưu ảnh. Giữ kết nối và không tháo pin.');$('album75-'+kind+'-progress').value=0;
  const info=await root.ExternalResourceInstaller.countdownOperation(async(client,check,write)=>{
   if(!await confirmReplace(client,kind,index,check))return null;
   check();return save(client,kind,index,payload,check,write,(n,total)=>{$('album75-'+kind+'-progress').value=n/total;},text=>say(kind,text));
  });
  if(!info){say(kind,'Đã hủy. Ảnh đang lưu được giữ nguyên.');return;}
  say(kind,'Đã lưu ảnh: '+(info.imageBytes/1024).toFixed(1)+' KB, giảm '+Math.round((1-info.imageBytes/info.rawBytes)*100)+'%. Vùng lưu còn '+((info.capacity-info.stored)/1024).toFixed(1)+' KB. Chọn ảnh để xem hoặc bật luân phiên.');
 });}
 async function remove(kind){return action(kind,async()=>{const index=Number($('album75-'+kind+'-slot').value);if(!confirm('Xóa ảnh '+label(index)+' đã lưu?'))return;say(kind,'Đang xóa ảnh đã chọn…');await root.ExternalResourceInstaller.countdownOperation((client,check,write)=>save(client,kind,index,null,check,write));say(kind,'Đã xóa ảnh đã chọn. Các ô còn lại được giữ nguyên.');});}
 async function choose(kind,enabled){return action(kind,async()=>{const index=Number($('album75-'+kind+'-slot').value),minutes=Number($('album75-'+kind+'-minutes').value);say(kind,'Đang lưu cách hiển thị ảnh…');
  await root.ExternalResourceInstaller.countdownOperation((client,check,write)=>schedule(client,kind,index,minutes,enabled,check,write,localTime()));
  if(!await root.sendTimeCommand(kind?6:7,kind?'Đồng hồ+ảnh':'Album ảnh'))throw Error('Đã lưu nhưng chưa mở được chế độ. Kết nối lại và bấm xem ảnh.');
  say(kind,enabled?'Đã bật tự đổi ảnh. Có thể đóng web; đồng hồ vẫn tự chạy.':'Đã giữ ảnh đã chọn, không tự đổi ảnh.');
 });}
 async function beforeDirect(kind){
  if(typeof appVersion==='undefined'||![0x42,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6A,0x6B,0x6C].includes(appVersion)||typeof gattServer==='undefined'||!gattServer?.connected)return true;let b=defaults();await root.ExternalResourceInstaller.countdownOperation(async(client,check)=>{const status=store.parseStatus(await client.status());check();if(status.code===4)return;if(status.code)throw Error('Chưa đọc được trạng thái album.');const parts=await client.partitions();b=await settings(client,parts);check();});
  if(b[5+kind]){const message='Album đang bật tự đổi ảnh. Chọn một ô ảnh rồi bấm Giữ ảnh đã chọn để tắt luân phiên trước khi gửi ảnh trực tiếp.';say(kind,message);alert(message);return false;}return true;
 }
 root.Album75={...api,controls,read,saveCurrent,remove,choose,beforeDirect,busy:()=>busy};controls();
})(globalThis);
