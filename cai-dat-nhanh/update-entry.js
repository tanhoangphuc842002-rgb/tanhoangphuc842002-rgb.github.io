/* Return from the separate 7.5 controller to the existing shared OTA tab.
 * Navigation only: never enters DFU or starts an update on page load. */
(function(root){
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('clock75-original-button')?.addEventListener('click',event=>{
   if(root.EpdDfuBusy?.()||root.EpdAutoUpdate?.busy()||root.VNDataBusy?.()||
      root.countdownOperationBusy||(typeof clockImageUploadBusy!=='undefined'&&clockImageUploadBusy)){
    event.preventDefault();root.alert('Hãy chờ thao tác đang chạy hoàn tất rồi mở Đồng hồ 7.5.');
   }
  });
  if(root.location.hash!=='#tab-dfu')return;
  const button=document.getElementById('dfu-tab-button');
  if(button){button.click();document.getElementById('tab-dfu')?.scrollIntoView({block:'start'});}
 });
})(window);
