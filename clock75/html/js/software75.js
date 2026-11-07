(function(root){
 'use strict';const $=id=>document.getElementById(id),base=new URL('../../',location.href);let preparing=false;
 const occupied=()=>!!root.DeviceOperations?.current||!!root.ExternalResourceInstaller?.busy()||!!root.SeasonUpload75?.busy()||!!root.ClockSetup?.busy();
 root.VNDataBusy=occupied;
 const begin=root.DeviceOperations.begin.bind(root.DeviceOperations);
 root.DeviceOperations.begin=function(...args){if(preparing||root.EpdDfuBusy?.())throw Error('Đang chuẩn bị hoặc cập nhật phần mềm. Chờ hoàn tất trước khi dùng mục khác.');return begin(...args);};
 const say=s=>{$('software75Status').textContent=s;root.addLog?.('Cập nhật phần mềm: '+s);};
 async function read(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('Không tải được tệp cập nhật.');return await r.arrayBuffer();}finally{clearTimeout(timer);}}
 async function prepare(){
  if(preparing||occupied()||root.EpdDfuBusy?.())return;
  preparing=true;$('software75Check').disabled=true;
  try{
   root.EpdDfu.unload();if(typeof bleDevice==='undefined'||!bleDevice?.gatt?.connected||typeof appVersion==='undefined'||appVersion<0x40||appVersion>0x65)throw Error('Kết nối đúng đồng hồ 7.5 trước khi kiểm tra.');
   const id=bleDevice.id,version=appVersion;say('Đang kiểm tra bản mới cho đồng hồ 7.5…');
   const p=JSON.parse(new TextDecoder().decode(await read(new URL('update-catalog-75.json',base))));
   if(p.schema!==1||p.model!=='original-vi-75'||p.model_id!==0x0752||p.encrypted!==true||p.app_abi!==0x65||!Number.isInteger(p.application_version)||p.application_version<1||!/^updates75\/[A-Za-z0-9_.-]+\.zip$/.test(p.url)||!/^[0-9a-f]{64}$/.test(p.sha256))throw Error('Thông tin cập nhật không hợp lệ.');
   if(version<0x5F){say('Bản phần mềm mới cần nạp full HEX bằng dây một lần. Sau đó có thể cập nhật OTA ngay tại đây.');return;}
   if(version>=p.app_abi){say('Đồng hồ đã có bản mới nhất.');return;}
   const bytes=await read(new URL(p.url,base));if(await root.Original75Auto.digest(bytes)!==p.sha256)throw Error('Tệp tải thiếu hoặc đã thay đổi.');await root.Original75Auto.verify(bytes,p);
   if(!bleDevice?.gatt?.connected||bleDevice.id!==id||appVersion!==version)throw Error('Kết nối đã thay đổi. Hãy kết nối lại và kiểm tra bản mới.');
   if(!await root.EpdDfu.load(bytes,p.label))throw Error('Chưa chuẩn bị được gói cập nhật.');say('Đã chọn '+p.label+'. Bấm Bắt đầu cập nhật ở ngay bên dưới.');
  }catch(e){say('Chưa hoàn tất: '+e.message+(location.protocol==='file:'?' Nếu không tải được tệp, mở trang GitHub hoặc chọn tệp OTA riêng.':''));}
  finally{preparing=false;$('software75Check').disabled=false;}
 }
 // The same updater is shared with the main page; package/model checks and
 // bootloader capability probes remain unchanged. No automatic mode switch.
 const input=$('dfu-file');input.addEventListener('change',async e=>{
  e.stopImmediatePropagation();if(preparing||occupied()||root.EpdDfuBusy?.()){say('Chờ thao tác hiện tại hoàn tất.');return;}
  const file=input.files?.[0];if(!file)return;preparing=true;
  try{root.EpdDfu.unload();if(file.size>1048576)throw Error('Gói cập nhật quá lớn.');const bytes=await file.arrayBuffer(),z=await root.JSZip.loadAsync(bytes),m=JSON.parse(await z.file('manifest.json').async('string'));
   if(m.dh_encrypted_ota){if(![0x0751,0x0752].includes(m.dh_encrypted_ota.model_id))throw Error('Tệp này không dành cho đồng hồ 7.5.');if(typeof appVersion!=='undefined'&&bleDevice?.gatt?.connected&&((appVersion<0x5F)!==(m.dh_encrypted_ota.model_id===0x0751)))throw Error('Gói này dùng bộ nạp khác. Bản mới cần nạp full HEX bằng dây một lần trước khi dùng OTA.');await root.Original75Auto.verify(bytes,m.dh_encrypted_ota);}
   else if(Object.keys(m.manifest||{}).join()!=='application')throw Error('Chỉ chọn gói phần mềm cho đồng hồ 7.5.');
   if(await root.EpdDfu.load(bytes,file.name))say('Đã chọn tệp cập nhật. Bấm Bắt đầu cập nhật.');
  }catch(e){say('Chưa chọn được tệp: '+e.message);}finally{preparing=false;}
 },true);
 root.Software75={prepare,busy:()=>preparing};
})(globalThis);
