/* Original-VI 7.5 only. Public key, never a private signing key. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports,Zip=node?require('./jszip.min.js'):root.JSZip;
 const keyBytes='cf3f998e73ebca98fe897b51a5e555658ce600777a1e7cd28da4b8710bae51180822e3c7190c0e58a0dde3bcb5f7196ffec0c1f88d347bb3f206fe966c215e55';
 function proto(input){const b=new Uint8Array(input),fields={};let at=0;function number(){let value=0,m=1;for(let i=0;i<5;i++){if(at>=b.length)throw Error('Gói bị cắt thiếu.');const n=b[at++];value+=(n&127)*m;if(!(n&128)){if(value>0xffffffff)throw Error('Thông tin gói không hợp lệ.');return value;}m*=128;}throw Error('Thông tin gói không hợp lệ.');}
  while(at<b.length){const tag=number(),id=tag>>>3,type=tag&7;let value;if(!id)throw Error('Thông tin gói không hợp lệ.');if(type===0)value=number();else if(type===2){const length=number();if(length>b.length-at)throw Error('Gói bị cắt thiếu.');value=b.slice(at,at+length);at+=length;}else throw Error('Định dạng gói không phù hợp.');(fields[id]??=[]).push(value);}return fields;}
 const one=(f,id)=>{if(!f[id]||f[id].length!==1)throw Error('Thông tin gói thiếu hoặc trùng lặp.');return f[id][0];};
 const hex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
 const digest=async b=>hex(new Uint8Array(await root.crypto.subtle.digest('SHA-256',b)));
 async function verify(bytes,meta){
  if(!root.crypto?.subtle)throw Error('Hãy mở trang qua HTTPS để kiểm tra cập nhật.');
  const zip=await Zip.loadAsync(bytes),manifest=JSON.parse(await zip.file('manifest.json').async('string'));
  if(!manifest.manifest||Object.keys(manifest.manifest).join()!=='application')throw Error('Gói không dành cho nhánh 7.5 Original-VI.');
  const app=manifest.manifest.application;if(!app||!zip.file(app.dat_file)||!zip.file(app.bin_file))throw Error('Gói ứng dụng không đầy đủ.');
  const dat=await zip.file(app.dat_file).async('uint8array'),image=await zip.file(app.bin_file).async('uint8array');
  if(dat.length>256||!image.length||image.length>(meta.model_id===0x0752?69632:65536))throw Error('Gói vượt giới hạn ứng dụng 7.5.');
  if(manifest.dh_encrypted_ota){
   const m=manifest.dh_encrypted_ota;
   if(![0x0751,0x0752].includes(m.model_id)||(meta.model_id!==undefined&&m.model_id!==meta.model_id)||m.application_version!==meta.application_version)throw Error('Gói không khớp đồng hồ 7.5 mã hóa.');
   await (node?require('./ota-verifier.js').verify:root.DHOtaVerify)({initData:dat,imageData:image},m);
   return {version:m.application_version,bytes:image.length,encrypted:true};
  }

  const packet=proto(dat);if(packet[1])throw Error('Gói không có chữ ký.');
  const signed=proto(one(packet,2)),command=proto(one(signed,1)),raw=one(command,2),init=proto(raw),hash=proto(one(init,8));
  const req=one(init,3),sd=typeof req==='number'?req===294:req.length===2&&req[0]===166&&req[1]===2;
  if(one(command,1)!==1||one(signed,2)!==0||one(init,1)!==meta.application_version||one(init,2)!==52||one(init,4)!==0||one(init,7)!==image.length||one(hash,1)!==3||init[100]||!sd||(init[5]&&one(init,5))||(init[6]&&one(init,6))||(init[9]&&one(init,9)))throw Error('Gói không khớp loại đồng hồ hoặc phiên bản.');
  const signature=one(signed,3);if(signature.length!==64)throw Error('Chữ ký cập nhật không hợp lệ.');
  const sig=new Uint8Array(64);sig.set(signature.slice(0,32).reverse());sig.set(signature.slice(32).reverse(),32);
  const bytesKey=Uint8Array.from(keyBytes.match(/../g),s=>parseInt(s,16));
  const b64=b=>{const text=String.fromCharCode(...b);return (node?Buffer.from(b).toString('base64'):btoa(text)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');};
  const key=await root.crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:b64(bytesKey.slice(0,32).reverse()),y:b64(bytesKey.slice(32).reverse())},{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(!await root.crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,sig,raw))throw Error('Chữ ký không khớp đồng hồ 7.5 Original-VI.');
  const actual=new Uint8Array(await root.crypto.subtle.digest('SHA-256',image));
  if(hex(actual.reverse())!==hex(one(hash,2)))throw Error('Dữ liệu cập nhật không khớp chữ ký.');
  return {version:one(init,1),bytes:image.length};
 }
 if(node){module.exports={verify,digest,proto};return;}
 const base=new URL('.',document.currentScript.src),$=id=>document.getElementById(id);let busy=false;
 function identity(){try{const h=JSON.parse(sessionStorage.getItem('epd_dfu_page_handoff')||'null');return h?.original75===true&&[0x40,0x41,0x42,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66].includes(h.appVersion)&&/\/clock75\/html\/index\.html$/.test(h.fromUrl)&&Date.now()-h.createdAt>=-60000&&Date.now()-h.createdAt<1800000?h:null;}catch(_){return null;}}
 async function read(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('Không tải được bản cập nhật.');return await r.arrayBuffer();}finally{clearTimeout(timer);}}
 async function prepare(){
  const h=identity();if(!h||busy||root.EpdDfuBusy?.()||root.VNDataBusy?.()||root.countdownOperationBusy)return false;
  root.EpdDfu.unload();busy=true;$('auto-update-check').disabled=true;for(const id of ['dfu-file','dfu-start-button','dfu-new-device-button'])$(id).disabled=true;
  const say=s=>$('auto-update-status').textContent=s;
  try{
   say('Đang kiểm tra cập nhật cho đồng hồ 7.5…');
   const p=JSON.parse(new TextDecoder().decode(await read(new URL('update-catalog-75.json',base))));
   if(p.schema!==1||p.model!=='original-vi-75'||!Number.isInteger(p.application_version)||p.application_version<1||p.application_version>0xffffffff||p.app_abi!==0x66||p.encrypted!==true||p.model_id!==0x0752||!/^updates75\/[a-zA-Z0-9_.-]+\.zip$/.test(p.url)||!/^[0-9a-f]{64}$/.test(p.sha256))throw Error('Thông tin cập nhật 7.5 không hợp lệ.');
   if(h.appVersion<0x5F){say('Bản phần mềm mới cần nạp full HEX bằng dây một lần. Sau đó đồng hồ có thể cập nhật OTA trên web.');return true;}
   if(h.appVersion===p.app_abi){say('Đồng hồ 7.5 đã có bản mới nhất trong trang này.');return true;}
   const bytes=await read(new URL(p.url,base));if(await digest(bytes)!==p.sha256)throw Error('File tải thiếu hoặc đã bị thay đổi.');await verify(bytes,p);
   const now=identity();if(!now||now.createdAt!==h.createdAt||now.deviceName!==h.deviceName||(typeof gattServer!=='undefined'&&gattServer?.connected))throw Error('Kết nối đã thay đổi. Hãy vào Đồng hồ 7.5 và mở cập nhật lại.');
   if(!await root.EpdDfu.load(bytes,p.label))throw Error('Chưa chuẩn bị được gói cập nhật.');
   say('Đã chọn '+p.label+'. Bấm Bắt đầu cập nhật bên dưới, chọn đúng đồng hồ 7.5; chọn DfuTarg khi được yêu cầu. Chỉ dùng cho nhánh Original-VI, không dùng cho DH v60.x.');return true;
  }catch(e){say('Chưa tải được cập nhật 7.5: '+e.message+(location.protocol==='file:'?' Hãy mở trang GitHub hoặc chọn file OTA thủ công.':''));return false;}
  finally{busy=false;$('auto-update-check').disabled=false;root.EpdDfu.refresh?.();}
 }
 root.Original75Auto={prepare,identity,verify,digest,busy:()=>busy};
})(globalThis);
