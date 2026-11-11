'use strict';
(() => {
 // Public verification key only. It cannot sign packages or decrypt firmware.
 const publicKey = {"kty":"EC","x":"8vNac5MNx5moRpOQaGtwAa97n6mg-BEnej-HEAoQeiE","y":"NAk8jtovox3FoRCSFI8HeEInT9E1YgBuljWv8ZjSmc0","crv":"P-256"};
 const original75PublicKey = {"kty":"EC","x":"hISxmnajyLcdCcWAQt7x7k_blXLO-vNKH8CMgIQLuas","y":"BtKInQBUq2RJslVIDY1tAnRwgw81gVpGPnHE9yOkkXw","crv":"P-256"};
 function proto(input){
  const b=new Uint8Array(input);let p=0;const fields={};
  function vi(){let n=0,mul=1;for(let i=0;i<5;i++){if(p>=b.length)throw new Error('Gói cập nhật bị cắt thiếu.');const v=b[p++];n+=(v&127)*mul;if(n>0xFFFFFFFF)throw new Error('Thông tin gói không hợp lệ.');if(!(v&128))return n;mul*=128;}throw new Error('Thông tin gói không hợp lệ.');}
  while(p<b.length){const tag=vi(),id=Math.floor(tag/8),wire=tag%8;if(!id)throw new Error('Thông tin gói không hợp lệ.');let value;if(wire===0)value=vi();else if(wire===2){const n=vi();if(n>b.length-p)throw new Error('Gói cập nhật bị cắt thiếu.');value=b.slice(p,p+n);p+=n;}else throw new Error('Định dạng cập nhật chưa được hỗ trợ.');(fields[id]??=[]).push(value);}
  return fields;
 }
 const one=(fields,id)=>{if(!fields[id]||fields[id].length!==1)throw new Error('Thông tin gói không đầy đủ hoặc trùng lặp.');return fields[id][0];};
 globalThis.DHOtaInspect=function(image){
  const packet=proto(image.initData);
  const cmd=packet[2]?proto(one(proto(one(packet,2)),1)):proto(one(packet,1));
  if(one(cmd,1)!==1)throw Error('Thông tin cập nhật không hợp lệ.');
  const init=proto(one(cmd,2));return init[100]?one(init,100):null;
 };
 globalThis.DHOtaVerify=async function(image,meta){
  if(!globalThis.crypto||!crypto.subtle)throw new Error('Mở trang qua HTTPS để kiểm tra gói cập nhật.');
  const packet=proto(image.initData);if(packet[1])throw new Error('Gói không có chữ ký phù hợp.');
  const signed=proto(one(packet,2)),cmd=proto(one(signed,1)),raw=one(cmd,2),init=proto(raw);
  if(one(signed,2)!==0||one(cmd,1)!==1||one(init,2)!==52||one(init,4)!==0)throw new Error('Gói không đúng loại cập nhật ứng dụng đồng hồ.');
  const ver=one(init,1),descriptor=one(init,100),hash=proto(one(init,8));
  if(descriptor.length!==20||new TextDecoder().decode(descriptor.slice(0,4))!=='DHE1')throw new Error('Gói cập nhật không đúng định dạng được hỗ trợ.');
  const view=new DataView(descriptor.buffer,descriptor.byteOffset,descriptor.byteLength);
  if(![0x0211,0x0212,0x0291,0x0292,0x0751,0x0752].includes(meta.model_id)||view.getUint16(4,true)!==meta.model_id||view.getUint16(6,true)!==1||meta.key_id!==1||ver!==meta.application_version||one(init,7)!==image.imageData.byteLength||one(hash,1)!==3||one(hash,2).length!==32)throw new Error('Thông tin model/phiên bản của gói không khớp.');
  const sig=one(signed,3);if(sig.length!==64)throw new Error('Chữ ký cập nhật không hợp lệ.');
  const big=new Uint8Array(64);big.set(sig.slice(0,32).reverse());big.set(sig.slice(32).reverse(),32);
  const key=await crypto.subtle.importKey('jwk',[0x0751,0x0752].includes(meta.model_id)?original75PublicKey:publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,big,raw))throw new Error('Chữ ký cập nhật không đúng. Đã dừng trước khi chuyển đồng hồ sang DFU.');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',image.imageData)),hex=[...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
  if(hex!==meta.ciphertext_sha256)throw new Error('File cập nhật bị thay đổi hoặc tải thiếu.');
  return {version:ver,model:meta.model_id,keyId:1};
 };
 if(typeof module!=='undefined'&&module.exports)module.exports={verify:globalThis.DHOtaVerify,inspect:globalThis.DHOtaInspect};
})();
