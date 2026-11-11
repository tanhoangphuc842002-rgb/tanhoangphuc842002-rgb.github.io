/* Cancellation is local; a lost/cancelled GATT transaction is quarantined by
   disconnecting, never by clearing a live characteristic's write queue. */
(() => {
'use strict';
window.CreateVNOperation=({busy,stopped,device})=>{
 let active=null,serial=0;
 function guard(token){if(token?.cancelled)throw token.error;}
 function cancel(message='Đã dừng truyền. Kết nối lại đồng hồ để tiếp tục.',disconnect=true){
  const token=active;if(!token)return false;
  token.error=Error(message);token.cancelled=true;active=null;
  stopped(token.error);token.reject(token.error);busy(false,token);
  if(disconnect){try{const d=device();if(d?.gatt?.connected)d.gatt.disconnect();}catch(_){}}
  return true;
 }
 async function run(fn,options={}){
  if(active)throw Error('Đang có thao tác khác. Chờ hoàn tất hoặc dừng truyền trước.');
  const token={id:++serial,cancelled:false,...options};
  token.stop=new Promise((_,reject)=>token.reject=reject);token.stop.catch(()=>{});
  active=token;busy(true,token);
  try{return await Promise.race([Promise.resolve().then(()=>{guard(token);return fn();}),token.stop]);}
  finally{if(active===token){active=null;busy(false,token);}}
 }
 async function wait(promise,token,ms=15000){
  guard(token);let timer;
  const timeout=new Promise((_,reject)=>timer=setTimeout(()=>{
   const error=Error('Kết nối phản hồi quá lâu. Đã dừng truyền; hãy kết nối lại rồi khôi phục để lưu lại.');
   if(active===token&&token)cancel(error.message,true);
   reject(error);
  },ms));
  try{const result=await Promise.race([promise,timeout,...(token?[token.stop]:[])]);guard(token);return result;}
  finally{clearTimeout(timer);}
 }
 return{run,wait,cancel,guard,current:()=>active};
};
})();
