/* Four seasonal landscapes share Flash with a deliberately smaller user album.
 * A nonempty legacy album is downloaded and confirmed before its layout moves. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const store=node?require('./resource_store'):root.EPDResourceStore;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder;
 const album=node?require('./album75'):root.Album75;
 const art=node?require('./art_clock75'):root.ArtClock75;
 const codec=node?require('./photo_codec75'):root.PhotoCodec75;
 const target={id:13,type:19,offset:0x28000,size:0x22000,schema:1,flags:0};
 function asset(bytes){
  const p=store.parsePackage(bytes);
  if(p.id!==13||p.payload.length+32>target.size||!codec.tag(p.payload,'SAB1'))throw Error('Bộ ảnh bốn mùa chưa hợp lệ.');
  const copy=p.payload.slice();copy[0]=80;const images=codec.unpack(copy,800);
  if(images.some(p=>!p))throw Error('Chưa đủ bốn ảnh theo mùa.');
  // The top belongs to the clock. Reject a package which could obscure its text.
  for(const image of images)for(let plane=0;plane<2;plane++)if(image.subarray(16+plane*48000,16+plane*48000+20000).some(x=>x!==255))throw Error('Ảnh chạm vào phần hiển thị giờ.');
  return p;
 }
 function layout(parts,fontLength){
  album.layout(parts,fontLength);
  if(album.compact(parts))return parts.map(p=>({...p}));
  art.layout(parts); // Validate the exact known legacy layout before moving it.
  const next=parts.filter(p=>p.id!==14).map(p=>p.id===13?{...target}:p.id===12?{...p,offset:0x4a000,size:0xe000}:p.id===11?{...p,size:0x18000}:{...p});
  album.layout(next,fontLength);album.table(next);return next;
 }
 async function plan(client,parts,check=()=>{}){
  const font=await client.inspect(7);check();if(font.code)throw Error('Chưa kiểm tra được bộ font. Chưa ghi dữ liệu.');
  const next=layout(parts,font.length),groups=[[],[]],backups=[];
  if(album.compact(parts))return {parts:next,migrate:false,groups,backups};
  for(const [kind,ids]of [[0,[12,13]],[1,[11,14]]])for(let bank=0;bank<2;bank++){
   const id=ids[bank],part=parts.find(p=>p.id===id),info=await client.inspect(id);check();
   if(info.code===4)continue;
   if(info.code)throw Error('Chưa đọc được ảnh cũ. Chưa đổi vùng lưu; hãy kết nối lại và kiểm tra album.');
   const bytes=await client.readPackage(part);check();const p=store.parsePackage(bytes),images=codec.unpack(p.payload,kind?400:800);
   backups.push({name:'album-'+id+'.ers',bytes,images,kind,bank});
   images.forEach((image,sub)=>{if(image)groups[kind].push({index:bank+sub*2,image});});
  }
  const retained=groups.map((rows,kind)=>{
   rows.sort((a,b)=>a.index-b.index);const kept=[];
   for(const row of rows){if(kept.length===2)break;const trial=[...kept,row.image];if(codec.pack([...trial,...Array(4-trial.length).fill(null)],kind?400:800).length+32<=next.find(p=>p.id===(kind?11:12)).size)kept.push(row.image);}
   return codec.pack([...kept,...Array(4-kept.length).fill(null)],kind?400:800);
  });
  const config=(await album.settings(client,parts)).slice();check();config[5]=config[6]=config[12]=config[13]=0;
  return {parts:next,migrate:true,groups,backups,retained,config,kept:retained.map((b,k)=>codec.unpack(b,k?400:800).filter(Boolean).length)};
 }
 async function put(client,bytes,parts,check,write,progress){
  const p=store.parsePackage(bytes);check();write();
  await client.upload(bytes,(n,total,durable)=>{check();progress(durable===undefined?n:durable,total);},parts);check();
  const actual=await client.inspect(p.id);check();if(actual.code||actual.length!==p.payload.length||actual.crc!==p.crc)throw Error('Chưa xác nhận được dữ liệu đã lưu. Hãy thử cài lại ảnh bốn mùa.');
 }
 async function ensure(client,bytes,artBytes,approve,check=()=>{},write=()=>{},progress=()=>{},stage=()=>{}){
  const pack=asset(bytes);let entered=false;
  try{
   stage('Kiểm tra dữ liệu đồng hồ');await art.keepOrInstall(client,artBytes,check,write,()=>{},stage);check();
   const parts=await client.partitions(),proposal=await plan(client,parts,check);check();
   if(proposal.migrate&&proposal.backups.length){
    if(typeof approve!=='function')throw Error('Cần sao lưu và xác nhận trước khi chuyển album. Chưa thay đổi ảnh cũ.');
    if(!await approve(proposal))return false;check();
   }
   // Hold scheduling only after the user has confirmed the downloaded backup.
   stage('Chuẩn bị lưu ảnh bốn mùa');
   for(let attempt=0;;attempt++){
    check();try{await client.request(6,Uint8Array.of(77,73,71,49));entered=true;check();break;}
    catch(e){if(e.code!==2||attempt>=59)throw e;await new Promise(resolve=>setTimeout(resolve,1000));}
   }
   const current=await client.partitions();check();if(JSON.stringify(current)!==JSON.stringify(parts))throw Error('Dữ liệu đã thay đổi. Hãy kiểm tra lại trước khi cài.');
   const mark=()=>{entered=true;write();};
   if(proposal.migrate){
    // Recheck the read-only snapshot immediately before the first layout write.
    for(const b of proposal.backups){const p=store.parsePackage(b.bytes),i=await client.inspect(p.id);check();if(i.code||i.crc!==p.crc||i.length!==p.payload.length)throw Error('Album đã thay đổi. Chưa đổi vùng lưu.');}
    const old=store.parsePackage(await client.readPackage(parts.find(p=>p.id===1)));check();if(old.revision===0xffffffff)throw Error('Chưa thể đổi vùng lưu.');
    stage('Đang sắp xếp vùng lưu ảnh');await put(client,builder.wrap(1,album.table(proposal.parts),old.revision+1),parts,check,mark,()=>{});
    const actual=await client.partitions();check();if(JSON.stringify(actual)!==JSON.stringify(store.parseTable({id:1,payload:album.table(proposal.parts)})))throw Error('Chưa xác nhận được vùng lưu mới.');
    for(let kind=0;kind<2;kind++){
     stage('Đang giữ lại ảnh album '+(kind+1));await put(client,builder.wrap(kind?11:12,proposal.retained[kind],1),proposal.parts,check,mark,()=>{});
    }
    await put(client,builder.wrap(15,proposal.config,Math.floor(Date.now()/1000)),proposal.parts,check,mark,()=>{});
   }
   const info=await client.inspect(13);check();
   if(info.code||info.length!==pack.payload.length||info.crc!==pack.crc){stage('Đang lưu bốn ảnh theo mùa');await put(client,bytes,proposal.parts,check,mark,progress);}
   stage('Đang áp dụng ảnh đã lưu');await client.leave();check();entered=false;return true;
  }finally{if(entered&&!client.closed){try{await client.request(5);await client.leave();}catch(_){}}}
 }
 async function selection(client,check=()=>{}){
  const parts=await client.partitions();check();if(!album.compact(parts))throw Error('Hãy cài ảnh bốn mùa trước.');
  const images=await client.inspect(13);check();if(images.code||images.length<48)throw Error('Hãy cài ảnh bốn mùa trước khi chọn mùa hiển thị.');
  const info=await client.inspect(15);check();
  if(info.code===4)return {parts,config:album.defaults()};
  if(info.code)throw Error('Chưa đọc được lựa chọn mùa. Hãy kết nối lại.');
  const config=store.parsePackage(await client.readPackage(parts.find(p=>p.id===15))).payload;check();
  if(!album.validSettings(config))throw Error('Cài đặt album bị lỗi. Chưa thay đổi dữ liệu.');
  return {parts,config};
 }
 async function readSelection(client,check=()=>{}){return (await selection(client,check)).config[7];}
 async function saveSelection(client,value,check=()=>{},write=()=>{}){
  if(!Number.isInteger(value)||value<0||value>4)throw Error('Hãy chọn mùa trong danh sách.');
  let entered=false;
  try{
   const {parts,config}=await selection(client,check);check();
   if(config[7]!==value){const next=config.slice();next[7]=value;await put(client,builder.wrap(15,next,Math.floor(Date.now()/1000)),parts,check,()=>{entered=true;write();},()=>{});await client.leave();check();entered=false;}
   return value;
  }finally{if(entered&&!client.closed){try{await client.request(5);await client.leave();}catch(_){}}}
 }
 function unpack(bytes){const p=asset(bytes),b=p.payload.slice();b[0]=80;return codec.unpack(b,800);}
 function replacement(bytes,index,image){
  if(!Number.isInteger(index)||index<0||index>3)throw Error('Hãy chọn mùa cần thay ảnh.');
  const p=asset(bytes),images=unpack(bytes);if(p.revision===0xffffffff)throw Error('Phiên bản ảnh không hợp lệ.');
  images[index]=codec.decode(image,800);const payload=codec.pack(images,800);payload[0]=83;
  if(payload.length+32>target.size)throw Error('Ảnh có quá nhiều chi tiết để lưu cùng ba mùa còn lại. Hãy giảm chi tiết ảnh hoặc chọn ảnh khác. Chưa thay đổi ảnh trên đồng hồ.');
  const next=builder.wrap(13,payload,p.revision+1);asset(next);return next;
 }
 async function replace(client,index,image,options={}){
  const {check=()=>{},write=()=>{},progress=()=>{},readProgress=()=>{},snapshot=()=>{},recovery=null}=options;
  const parts=await client.partitions();check();if(!album.compact(parts))throw Error('Cài ảnh bốn mùa trước khi thay ảnh riêng.');
  const part=parts.find(p=>p.id===13);if(!part||part.offset!==target.offset||part.size!==target.size)throw Error('Vùng lưu ảnh đã thay đổi. Chưa gửi ảnh.');
  if(recovery){asset(recovery);const status=store.parseStatus(await client.status());check();if(status.active){if(status.active!==13)throw Error('Đồng hồ đang xử lý dữ liệu khác. Chưa thay đổi ảnh.');await client.request(5);check();}}
  const info=await client.inspect(13);check();let old;
  if(!info.code)old=await client.readPackage(part,(n,total)=>{check();readProgress(n,total);});
  else if(recovery&&[1,3,4].includes(info.code))old=recovery.slice();
  else throw Error('Chưa đọc được bốn ảnh đang lưu. Hãy kết nối lại.');
  check();const previous=asset(old),next=replacement(old,index,image);snapshot(old.slice());let entered=false,written=false;
  try{
   await client.request(6,Uint8Array.of(77,73,71,49));entered=true;check();
   const now=await client.inspect(13);check();
   if(!info.code&&(now.code||now.crc!==previous.crc||now.length!==previous.payload.length))throw Error('Ảnh đã thay đổi. Hãy đọc lại trước khi lưu.');
   await put(client,next,parts,check,()=>{written=true;write();},progress);
   await client.leave();check();entered=false;return next;
  }catch(e){
   if(written&&!client.closed){try{check();await client.request(5);await put(client,old,parts,check,write,()=>{});await client.leave();entered=false;e.message+=' Đã khôi phục bộ ảnh trước đó.';}catch(_){e.message+=' Kết nối lại rồi bấm Thử lưu lại, không đóng trang này.';}}
   throw e;
  }finally{if(entered&&!client.closed){try{await client.request(5);await client.leave();}catch(_){}}}
 }
 const api={asset,unpack,replacement,replace,layout,plan,ensure,readSelection,saveSelection};if(node){module.exports=api;return;}
 const $=id=>document.getElementById(id);let busy=false;
 const supported=()=>typeof appVersion!=='undefined'&&[0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68].includes(appVersion)&&typeof gattServer!=='undefined'&&!!gattServer?.connected;
 function controls(force=false){for(const id of ['season75Mode','season75Install'])$(id).disabled=force||busy||!supported()||!!root.DeviceOperations?.current;for(const id of ['season75Choice','season75Apply','season75Read'])$(id).disabled=force||busy||!supported()||typeof appVersion==='undefined'||appVersion<0x50||!!root.DeviceOperations?.current;$('season75Stop').disabled=!busy;root.SeasonUpload75?.controls(force||busy||!!root.DeviceOperations?.current,!supported());}
 function say(text){$('season75Status').textContent=text;root.addLog?.('Đồng hồ bốn mùa: '+text);}
 function png(image,width){
  const c=document.createElement('canvas');c.width=width;c.height=480;const ctx=c.getContext('2d'),rgba=ctx.createImageData(width,480),plane=width*60;
  for(let i=0;i<width*480;i++){const mask=128>>(i&7),red=!(image[16+plane+(i>>3)]&mask),black=!(image[16+(i>>3)]&mask),v=red||black?0:255;rgba.data.set([red?190:v,v,v,255],i*4);}
  ctx.putImageData(rgba,0,0);return Uint8Array.from(atob(c.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0));
 }
 async function backupAndApprove(p){
  say('Đang tạo bản sao album cũ trước khi thay đổi vùng lưu…');
  const entries=p.backups.map(b=>({name:b.name,bytes:b.bytes}));
  for(const b of p.backups)b.images.forEach((image,sub)=>{if(image)entries.push({name:(b.kind?'clock-image':'photo')+'-'+(b.bank+sub*2+1)+'.png',bytes:png(image,b.kind?400:800)});});
  entries.push({name:'album-note.json',bytes:new TextEncoder().encode(JSON.stringify({createdAt:new Date().toISOString(),oldCounts:p.groups.map(g=>g.length),retainedCounts:p.kept,keptOldSlots:p.groups.map((g,k)=>g.filter(row=>codec.unpack(p.retained[k],k?400:800).some(b=>b&&store.crc32(b)===store.crc32(row.image))).map(row=>row.index+1))},null,2))});
  const url=URL.createObjectURL(new Blob([root.EPDResourceArchive.createZip(entries)],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download='epd75-album-backup-'+Date.now()+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return confirm('Đã yêu cầu tải bản sao album cũ. Hãy kiểm tra tệp ZIP trong thư mục tải về trước khi tiếp tục.\n\nĐể có chỗ cho bốn ảnh theo mùa, mỗi album còn tối đa hai ảnh. Sẽ giữ '+p.kept[0]+'/'+p.groups[0].length+' ảnh truyền và '+p.kept[1]+'/'+p.groups[1].length+' ảnh đồng hồ; các ảnh còn lại chỉ có trong bản sao. Tự đổi ảnh sẽ được tắt để anh/chị chọn lại.\n\nĐã có bản sao và đồng ý cài?');
 }
 async function install(openAfter=true){
  if(busy||root.DeviceOperations?.current)return;if(!supported()){say('Hãy cập nhật phần mềm đồng hồ trước.');return;}busy=true;controls();$('season75Progress').value=0;
  try{
   const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
   const ok=await root.ExternalResourceInstaller.countdownOperation(async(client,check,write)=>{
    const parts=await client.partitions();check();
    if(album.compact(parts)){const i=await client.inspect(13);check();if(!i.code&&i.length>=48&&i.length+32<=target.size){const h=await client.readRange(target.offset+32,48);check();if(!codec.tag(h,'SAB1'))throw Error('Bộ ảnh đang lưu chưa hợp lệ.');h[0]=80;codec.directory(h,800,i.length);return true;}}
    return ensure(client,decode(root.Season75Data),decode(root.ArtLandscapeData),backupAndApprove,check,write,(n,total)=>{$('season75Progress').value=n/total;},say);
   });
   if(!ok){say('Đã hủy. Album cũ chưa bị thay đổi.');return;}
   $('season75Progress').value=1;
   if(openAfter&&!await root.sendTimeCommand(11,'Đồng hồ bốn mùa'))throw Error('Đã lưu ảnh nhưng chưa mở được đồng hồ. Hãy kết nối lại rồi chọn Đồng hồ bốn mùa.');
   say(openAfter?'Đã mở đồng hồ bốn mùa. Ảnh riêng đã lưu được giữ nguyên. Bạn có thể tự động đổi theo tiết khí hoặc giữ một mùa yêu thích.':'Đã chuẩn bị bộ ảnh bốn mùa. Ảnh riêng đã lưu được giữ nguyên.');return true;
  }catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}
  finally{busy=false;controls();}
 }
 function stop(){if(!busy||!confirm('Dừng cài ảnh và ngắt kết nối? Sau đó kết nối lại để cài tiếp.'))return;root.ExternalResourceInstaller.disconnect();if(typeof bleDevice!=='undefined'&&bleDevice?.gatt?.connected)bleDevice.gatt.disconnect();root.disconnect?.();say('Đã dừng. Kết nối lại và bấm cài ảnh bốn mùa để thử tiếp. Nếu đã đổi vùng lưu, có thể lấy lại ảnh cá nhân từ bản sao ZIP.');}
 async function choiceAction(save){
  if(busy||root.DeviceOperations?.current)return;
  if(!supported()||appVersion<0x50){say('Cập nhật phần mềm đồng hồ để chọn mùa.');return;}
  busy=true;controls();
  try{
   const value=Number($('season75Choice').value);say(save?'Đang lưu mùa đã chọn…':'Đang đọc mùa đã lưu…');
   const actual=await root.ExternalResourceInstaller.countdownOperation((client,check,write)=>save?saveSelection(client,value,check,write):readSelection(client,check));
   $('season75Choice').value=String(actual);
   if(save&&!await root.sendTimeCommand(11,'Đồng hồ bốn mùa'))throw Error('Đã lưu mùa. Kết nối lại rồi mở Đồng hồ bốn mùa.');
   const names=['Tự động theo tiết khí','Mùa Xuân','Mùa Hạ','Mùa Thu','Mùa Đông'];say((save?'Đã lưu: ':'Đang dùng: ')+names[actual]+'.');
  }catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}
  finally{busy=false;controls();}
 }
 root.Season75={...api,controls,install,stop,apply:()=>choiceAction(true),read:()=>choiceAction(false),busy:()=>busy};controls();
})(globalThis);
