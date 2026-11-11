/* Adapted ordering principle from reference main.js/resource_store.js:
   serialize GATT writes, and keep resource transactions until write + ACK finish.
   Wire packets and device protocols are unchanged. */
(function(){
 'use strict';
 const tails=new WeakMap();
 function run(characteristic,operation){
  const previous=tails.get(characteristic)||Promise.resolve();
  const job=previous.then(operation);
  /* Preserve failures for callers without permanently breaking the queue. */
  tails.set(characteristic,job.catch(()=>{}));
  return job;
 }
 function write(characteristic,packet,isCurrent){
  const bytes=Uint8Array.from(packet);
  return run(characteristic,()=>{
   if(!isCurrent())throw Error('Kết nối đã thay đổi. Không gửi lệnh của phiên cũ.');
   return characteristic.writeValueWithResponse(bytes);
  });
 }
 window.EpdGattWrites={run,write};
})();
