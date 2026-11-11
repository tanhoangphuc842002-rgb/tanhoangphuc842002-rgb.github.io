/* Art is stored in existing CRC-checked photo slots, never in firmware ROM. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),T=root.VNTransport,A=root.PhotoAlbumShared;
 const known=()=>typeof deviceProtocol!=='undefined'&&deviceProtocol===PROTOCOL_NRF52&&nrf52ModelDetected&&nrf52ModelId===2&&!!gattServer?.connected&&
  (nrf52PanelProfile===33?[246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion):nrf52PanelProfile===41&&[248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion));
 const full=()=>known()&&[250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion);
 const stacked=()=>known()&&[262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion);
 const movable=()=>!stacked()&&known()&&[256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion);
 const position=()=>{const n=Number($('art-clock-position').value);return Number.isInteger(n)&&n>=0&&n<4?n:1;};
 const corner=()=>{
  if(stacked())return {x:0,y:0,width:nrf52PanelProfile===41?80:72,height:128};
  if(!movable())return nrf52PanelProfile===41?{x:176,y:0,width:120,height:80}:{x:146,y:0,width:104,height:72};
  const big=nrf52PanelProfile===41,p=position(),width=big?120:104,height=48;
  return {x:p&1?(big?296:250)-width:0,y:p&2?128-height:0,width,height};
 };
 const selected=()=>known()&&$('art-clock-layout').value==='art';
 const en=()=>root.EpdWebsiteI18n?.current()==='en';
 const text=s=>root.EpdWebsiteI18n?.translate(s)||s;
 const wording=(vi,english)=>en()?english:vi;
 const busy=()=>!!A.busy()||!!T.busy()||clockImageUploadBusy||!!root.EpdDfuBusy?.();
 let loading=false,imageToken=0,deviceKey='',positionDirty=false,positionRead=false;
 const originalTarget=root.getClockImageTarget,originalUpdate=root.updateClockImageAvailability,originalUpload=root.uploadClockImage,originalRender=root.renderClockImage;
 root.getClockImageTarget=function(){
  const t=originalTarget();if(!selected()||!t)return t;
  return {...t,width:full()?(nrf52PanelProfile===41?296:250):(nrf52PanelProfile===41?176:148),height:128,artClock:true,
   title:wording('Đồng hồ tranh','Art clock'),description:stacked()?wording('Giờ đỏ phía trên, phút đen phía dưới; tranh ở bên phải.','Red hours above black minutes, with art on the right.'):movable()?wording('Tranh phủ toàn màn hình. Chọn một trong bốn góc để đặt giờ.','Full-screen art. Choose one of four corners for the time.'):full()?wording('Tranh phủ toàn màn hình; ô trắng góc trên bên phải hiển thị giờ và ngày tháng năm.','Full-screen art with time and date in a white top-right corner.'):wording('Tranh bên trái; giờ, ngày và thứ bên phải. Giờ tự cập nhật mỗi phút.','Art on the left; time, date and weekday on the right. Time updates every minute.')};
 };
 function controls(){
  const ok=known(),key=ok?T.key()+'|'+nrf52FirmwareVersion:'';
  if(key!==deviceKey){deviceKey=key;positionRead=false;positionDirty=false;$('art-clock-position').value='1';if(ok&&!root.SmallClockAlbum?.hasRetry())$('art-clock-layout').value=nrf52DisplayMode===15?'art':'classic';}
  const active=selected(),locked=busy()||loading;
  $('art-clock-controls').hidden=!ok;$('art-clock-gallery').hidden=!active;
  $('art-clock-position-row').hidden=!active||!movable();
  $('art-clock-position-label').textContent=wording('Vị trí giờ','Time position');
  ['Trên bên trái','Trên bên phải','Dưới bên trái','Dưới bên phải'].forEach((vi,i)=>$('art-clock-position').options[i].textContent=wording(vi,['Top left','Top right','Bottom left','Bottom right'][i]));
  $('art-clock-position').disabled=locked;
  $('art-clock-position-apply').disabled=locked;
  $('art-clock-position-apply').textContent=wording('Áp dụng vị trí','Apply position');
  $('clock-image-clear').disabled=locked||(!clockImageOriginal&&!root.SmallClockAlbum?.hasSelection());
  $('clock-image-clear').textContent=wording('Xóa ảnh đã chọn','Clear selected image');
  $('art-clock-layout-label').textContent=wording('Cách hiển thị','Layout');
  $('art-clock-layout').options[0].textContent=wording('Đồng hồ và ảnh','Clock and image');
  $('art-clock-layout').options[1].textContent=wording('Đồng hồ tranh','Art clock');
  $('art-clock-help').textContent=wording('Chọn một bức tranh hoặc tải ảnh của bạn, chỉnh khung rồi bấm Tải lên đồng hồ. Tranh đã lưu vẫn dùng được khi ngắt kết nối web.','Choose a painting or upload your own image, adjust the crop, then upload it to the clock. Saved art remains available offline.');
  const width=full()?(nrf52PanelProfile===41?296:250):(nrf52PanelProfile===41?176:148);
  $('art-clock-dimensions').textContent=wording(`Khung ảnh: ${width} × 128 px. ${stacked()?'Giờ đỏ và phút đen nằm bên trái. ':movable()?'Ô giờ có thể đặt ở bốn góc. ':full()?'Góc trắng được chừa sẵn cho giờ và ngày. ':''}Dùng chung 8 ô ảnh trong album; thay ảnh ở ô đang chọn sẽ có thông báo xác nhận.`,`Image area: ${width} × 128 px. ${stacked()?'Red hours and black minutes are on the left. ':movable()?'The time box can be placed in any corner. ':full()?'The white corner is reserved for time and date. ':''}Shares the album's 8 photo slots; replacing an occupied slot asks for confirmation.`);
  $('art-clock-layout').disabled=!ok||locked;
  const names={"19-meo-trong-hop":["Mèo trong hộp giấy","Kitten in a box"],"20-gau-ngu-tren-may":["Gấu ngủ trên mây","Bear sleeping on a cloud"],"21-ech-tru-mua":["Ếch trú mưa","Frog in the rain"],"22-oc-sen-mang-nha":["Ốc sên mang nhà","Snail with a house"],"23-cap-coc-vui-ve":["Cặp cốc vui vẻ","Happy mugs"],"24-banh-mi-ca-phe":["Bánh mì và cà phê","Bread and coffee"],"25-hop-thu-cho-tin":["Hộp thư chờ tin","Mailbox"],"26-xe-buyt-ti-hon":["Xe buýt tí hon","Tiny bus"],"27-cam-trai-ben-nui":["Cắm trại bên núi","Mountain camping"],"28-thuyen-giay":["Thuyền giấy phiêu lưu","Paper boat adventure"],"29-doc-sach-ben-cua-so":["Đọc sách bên cửa sổ","Reading by the window"],"30-may-game-mini":["Máy chơi game mini","Mini game console"],"31-binh-tuoi-va-hoa":["Bình tưới và hoa","Watering can and flower"],"32-tau-hoa-do-choi":["Tàu hỏa đồ chơi","Toy train"],"33-buu-kien-yeu-thuong":["Bưu kiện yêu thương","A parcel of love"],"34-chiec-o-ngay-mua":["Chiếc ô ngày mưa","Rainy day umbrella"],"07-gau-truc-om-tim":["Gấu trúc ôm tim","Panda with a heart"],"08-tho-tren-trang":["Thỏ ngồi trên trăng","Bunny on the moon"],"09-cao-ngu":["Cáo cuộn mình ngủ","Sleeping fox"],"10-chim-canh-cut":["Chim cánh cụt quàng khăn","Penguin with a scarf"],"11-ngoi-nha-nam":["Ngôi nhà nấm","Mushroom cottage"],"12-xe-ca-phe":["Xe cà phê nhỏ","Coffee cart"],"13-khinh-khi-cau":["Khinh khí cầu","Hot air balloon"],"14-robot-lam-vuon":["Robot làm vườn","Gardening robot"],"15-ngon-hai-dang":["Ngọn hải đăng","Lighthouse"],"16-nha-tren-may":["Ngôi nhà trên mây","House on a cloud"],"17-chau-cay-vui-ve":["Chậu cây vui vẻ","Happy plant"],"18-tau-vu-tru-mini":["Tàu vũ trụ mini","Mini rocket"],"01-meo-canh-hoa":["Mèo và cành hoa","Cat and blossoms"],"02-cho-ngu":["Chó ngủ","Sleeping puppy"],"03-nui-ho":["Núi và hồ","Mountains and lake"],"04-thanh-pho":["Thành phố","City skyline"],"05-phi-hanh-gia":["Phi hành gia","Astronaut"],"06-hoa-coi-xay-gio":["Hoa và cối xay gió","Tulips and windmill"],spring:['Xuân','Spring'],summer:['Hạ','Summer'],autumn:['Thu','Autumn'],winter:['Đông','Winter']};
  for(const b of document.querySelectorAll('[data-art-season]')){
   b.hidden=stacked()?b.dataset.artCartoon!=='1':b.dataset.artCartoon==='1';b.disabled=!ok||locked;const name=names[b.dataset.artSeason][en()?1:0];b.querySelector('span').textContent=name;b.querySelector('img').alt=name;
  }
  // Shared photo actions own this lock, including the ordinary upload button.
  if(active)$('clock-image-upload-button').disabled=locked||!clockImageOriginal;
  if(active&&movable()&&!positionRead&&!locked&&root.SmallClockAlbum){positionRead=true;setTimeout(()=>{if(deviceKey===key&&!busy())root.SmallClockAlbum.loadPosition();},0);}
  root.ArtClockName?.controls(locked);
 }
 async function ready(){
  if(!selected())return;
  if(!await T.facesReady({readiness:true}))throw Error(wording('Vào Cài đặt đồng hồ và bấm Cài đặt / cập nhật dữ liệu trước khi dùng Đồng hồ tranh.','Open Settings and install/update clock data before using Art clock.'));
 }
 root.renderClockImage=function(){originalRender();if(selected()&&full()&&clockImageOriginal){const box=corner(),ctx=$('clock-image-canvas').getContext('2d');root.ArtClockName?.draw(ctx);ctx.fillStyle='white';ctx.fillRect(box.x,box.y,box.width,box.height);}};
 // Store all artwork pixels on movable-clock firmware. Only the preview is
 // masked; the device paints its box and can restore the previous corner.
 function rawCanvas(){if(!movable()||!selected())return $('clock-image-canvas');originalRender();const copy=document.createElement('canvas'),src=$('clock-image-canvas');copy.width=src.width;copy.height=src.height;copy.getContext('2d').drawImage(src,0,0);root.renderClockImage();return copy;}
 root.updateClockImageAvailability=function(){controls();originalUpdate();controls();};
 root.uploadClockImage=function(){return selected()?root.SmallClockAlbum.saveAndShow():originalUpload();};
 $('art-clock-layout').onchange=()=>{if(busy())return;imageToken++;root.updateClockImageAvailability();if(clockImageOriginal)clockImageFit(false);};
 async function choose(season){
  if(!selected()||busy()||loading)return;
  clockImageFileToken++;
  const key=T.key(),token=++imageToken;loading=true;controls();
  try{
   let image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(wording('Chưa tải được tranh. Hãy tải lại trang.','Could not load art. Reload the page.')));im.src=document.querySelector('[data-art-season="'+season+'"] img').src;});
   if(token!==imageToken||key!==T.key()||!selected())return;
   if(stacked()){
    // These illustrated banners use the complete composition, with the
    // clock column left blank; do not crop the cat/tulips at the right edge.
    const fit=document.createElement('canvas');fit.width=nrf52PanelProfile===41?296:250;fit.height=128;fit.getContext('2d').drawImage(image,0,0,fit.width,128);
    image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=fit.toDataURL('image/png');});
    if(token!==imageToken||key!==T.key()||!selected())return;
   }
   clockImageOriginal=image;clockImageRotation=0;clockImageScale=1;clockImageOffsetX=clockImageOffsetY=0;
   resetClockQuickOverlay(true);clockImageFit(true);
   const canvas=$('clock-image-canvas'),ratio=Math.max(canvas.width/image.width,canvas.height/image.height);
   clockImageOffsetX=stacked()?0:(image.width*ratio-canvas.width)*0.25;renderClockImage();
   $('clock-image-status').textContent=wording('Đã chọn tranh. Có thể chỉnh khung rồi bấm Tải lên đồng hồ.','Art selected. Adjust the crop if needed, then upload to the clock.');
  }catch(e){$('clock-image-status').textContent=e.message;}
  finally{loading=false;controls();}
 }
 for(const b of document.querySelectorAll('[data-art-season]'))b.onclick=()=>choose(b.dataset.artSeason);
 function acceptPosition(n){if(!positionDirty){$('art-clock-position').value=String(n<4?n:1);renderClockImage();}positionRead=true;}
 function invalidateImage(){imageToken++;loading=false;}
 $('art-clock-position').onchange=()=>{if(busy())return;positionDirty=true;renderClockImage();};
 $('art-clock-position-apply').onclick=()=>root.SmallClockAlbum.applyPosition();
 $('clock-image-clear').onclick=()=>root.clearClockImageSelection();
 root.ArtClock={known,full,stacked,movable,position,corner,selected,ready,controls,text,wording,choose,rawCanvas,acceptPosition,invalidateImage};controls();
 $('language-selector')?.addEventListener('change',()=>setTimeout(controls,0));
})(globalThis);
