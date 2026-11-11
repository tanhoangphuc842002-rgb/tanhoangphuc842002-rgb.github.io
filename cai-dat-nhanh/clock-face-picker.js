/* Explicit one-packet clock selection, enabled only for inspected releases. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),T=window.VNTransport;
const previewBase=new URL('face-previews/',document.currentScript?.src||location.href);
const rows=[
 {name:'Đồng hồ số',description:'Đồng hồ số lớn.',modes:[2,2]},
 {name:'Đồng hồ và lịch tháng',description:'Giờ ở bên phải, lịch tháng ở bên trái. Nếu bạn đang bật Việc cần làm, phần lịch sẽ hiện danh sách đó; có thể tắt trong mục Việc cần làm.',modes:[3,3]},
 {name:'Đồng hồ, thứ và ngày',description:'Lịch tháng bên trái; thứ, ngày và giờ bên phải.',modes:[4,4]},
 {name:'Đồng hồ nhắc ngày lễ',description:'Giờ lớn và số ngày tới ngày lễ gần nhất.',modes:[5,10]},
 {name:'Đồng hồ và ngày lớn',description:'Giờ bên trái; ngày, tháng và âm lịch bên phải.',modes:[10,11]},
 {name:'Đồng hồ lật',description:'Các ô số nền trắng với khe lật, dấu hai chấm đỏ và lịch tháng bên phải. Dùng được cả khi không có ngày đánh dấu.',modes:[11,12]},
 {name:'Đồng hồ',description:'Giờ lớn, dễ xem.',modes:[12,13]}
];
function portrait(){return device()?.portrait===true;}
function personal(){return device()?.personal===true;}
const artRow={name:"Đồng hồ tranh dọc",description:"Giờ và phút xếp dọc, hình mèo bên dưới.",modes:[12,13]};
const calendarPortraitRow={name:"Đồng hồ lịch dọc",description:"Lịch xé với ngày lớn phía trên và giờ nằm ngang phía dưới.",modes:[12,13]};
const bigRow={name:"Đồng hồ",description:"Giờ lớn nằm ngang và ngày tháng bên dưới.",modes:[13,7]};
function availableRows(){if(personal())return [...rows.slice(0,5),[274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?calendarPortraitRow:artRow,...([270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?[bigRow]:[])];if(portrait())return rows.slice(0,6);return rows.slice(0,!device()||[205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,242,243,244,241,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?7:6);}
function label(row){if(row===rows[0]&&portrait())return "Đồng hồ dọc";return row===rows[0]&&(!device()||[193,194,195,196,197,198,199,200,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,242,243,244,241,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))?'Đồng hồ 3D':row.name;}
let busy=false,versionKey='';
function device(){
 if(typeof deviceProtocol==='undefined'||deviceProtocol!==PROTOCOL_NRF52||!gattServer?.connected||!nrf52ModelDetected||nrf52ModelId!==2||!epdCharacteristic)return null;
 const big=nrf52PanelProfile===0x29,ok=big?[191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,280,281,283,284,287,288,291,292]:nrf52PanelProfile===0x21?[189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,282,285,286,289,290]:[];
 if(!ok.includes(nrf52FirmwareVersion))return null;
 return {portrait:[279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)||!big&&[264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion),personal:[279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)||!big&&[266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion),key:[bleDevice?.id,nrf52PanelProfile,nrf52FirmwareVersion].join('|'),big,id:(nrf52FirmwareVersion>=254?(big?([254,256,258,260,262,264,266,268,270,272,274,276,278,280,282,283,285,287,289,291].includes(nrf52FirmwareVersion)?'ce290-month':'noce290-month'):([254,256,258,260,262,264,266,268,270,272,274,276,278,280,282,283,285,287,289,291].includes(nrf52FirmwareVersion)?'ce213-month-up3':'noce213-month-up3')):({189:'ce213',190:'noce213',191:'ce290',192:'noce290',193:'ce213-retro',194:'noce213-retro',195:'ce290-retro',196:'noce290-retro',197:'ce213-retro-up3',198:'noce213-retro-up3',199:'ce213-quotes',200:'noce213-quotes',203:'ce213-quotes-up6',204:'noce213-quotes-up6',205:'ce213-outline',206:'noce213-outline',207:'ce290-outline',208:'noce290-outline',209:'ce213-outline',210:'noce213-outline',211:'ce290-outline',212:'noce290-outline',213:'ce213-month',214:'noce213-month',215:'ce290-month',216:'noce290-month',217:'ce213-month-up3',218:'noce213-month-up3',219:'ce213-month-up3',220:'noce213-month-up3',221:'ce290-month',222:'noce290-month',223:'ce213-month-up3',224:'noce213-month-up3',229:'noce213-month-up3',233:'noce213-month-up3',237:'noce213-month-up3',243:'noce213-month-up3',247:'noce213-month-up3',251:'noce213-month-up3',225:'ce290-month',230:'ce290-month',234:'ce290-month',238:'ce290-month',244:'ce290-month',248:'ce290-month',252:'ce290-month',226:'noce290-month',231:'noce290-month',235:'noce290-month',239:'noce290-month',241:'noce290-month',245:'noce290-month',249:'noce290-month',253:'noce290-month',227:'ce213-month-up3',228:'ce213-month-up3',232:'ce213-month-up3',236:'ce213-month-up3',242:'ce213-month-up3',246:'ce213-month-up3',250:'ce213-month-up3'})[nrf52FirmwareVersion]),ch:epdCharacteristic};
}
function unavailable(){
 return typeof gattServer==='undefined'||!gattServer?.connected?'Kết nối đồng hồ để xem những giao diện phù hợp.':'Đồng hồ này vẫn dùng nút chuyển giao diện phía trên. Các mẫu chọn trực tiếp chỉ hiện trên phiên bản có hỗ trợ.';
}
function blocked(){return !!(window.VNDataBusy?.()||window.EpdDfuBusy?.()||window.EpdAutoUpdate?.busy?.()||window.countdownOperationBusy||(typeof clockImageUploadBusy!=='undefined'&&clockImageUploadBusy));}
function preview(){const n=Number($('clock-face-select').value),row=availableRows()[n];if(!row)return;const dir=window.EpdWebsiteI18n?.current()==='en'?'en/':'';const upright=portrait()&&(n===0||personal()&&n===5);const url=new URL(dir+([279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?(n===0?(nrf52PanelProfile===41?'portrait-290.png':'portrait-bold-v2037.png'):n===5?(nrf52PanelProfile===41?'portrait-calendar-290.png':'portrait-calendar-four.png'):n===6?'landscape-big-v2035.png':'clock-'+(n+1)+'.png'):nrf52FirmwareVersion===278?(n===0?'portrait-bold-v2037.png':n===5?'portrait-inner-border-v2038.png':n===6?'landscape-big-v2035.png':'clock-'+(n+1)+'.png'):nrf52FirmwareVersion===276?(n===0?'portrait-bold-v2037.png':n===5?'portrait-reference-v2037.png':n===6?'landscape-big-v2035.png':'clock-'+(n+1)+'.png'):nrf52FirmwareVersion===274?(n===0?'portrait-bold-v2034.png':n===5?'portrait-calendar-v2036.png':n===6?'landscape-big-v2035.png':'clock-'+(n+1)+'.png'):nrf52FirmwareVersion===272?(n===0?'portrait-bold-v2034.png':n===5?'portrait-art-v2034.png':n===6?'landscape-big-v2035.png':'clock-'+(n+1)+'.png'):nrf52FirmwareVersion===270?(n===0?'portrait-bold-v2034.png':n===5?'portrait-art-v2034.png':n===6?'landscape-big-v2034.png':'clock-'+(n+1)+'.png'):nrf52FirmwareVersion===268&&upright?(n===5?'portrait-art-v2033.png':'portrait-bold-v2033.png'):upright?(personal()?(n===5?'portrait-art.png':'portrait-bold.png'):'portrait-clock.png'):'clock-'+(n+1)+'.png'),previewBase);$('clock-face-preview').style.maxWidth=upright?'256px':'100%';url.searchParams.set('v','6209');$('clock-face-preview-status').textContent='';$('clock-face-preview').src=url.href;$('clock-face-preview').alt=label(row)+' — hình minh họa';$('clock-face-description').textContent=[276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&n===5?'Giờ nằm ngang phía trên; lịch xé với ngày lớn, tháng, năm và âm lịch phía dưới.':nrf52FirmwareVersion===274&&n===5?calendarPortraitRow.description:[272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&n===6?'Giờ lớn, thứ và ngày tháng phía trên; âm lịch và nhiệt độ phía dưới.':personal()&&n===5?artRow.description:personal()&&n===1?'Công việc được quản lý riêng trong mục Lịch cá nhân. Mặt này hiển thị giờ và lịch tháng.':upright?'Dựng đồng hồ theo chiều dọc. Giờ đỏ ở trên, phút đen ở dưới; thứ và ngày tháng ở cuối màn.':row===rows[0]&&label(row)!==row.name?'Giờ lớn với kiểu chữ 3D.':row.description;}
function refresh(){
 const d=device(),key=d?.key||'preview-only';$('clock-face-controls').hidden=false;
 if(versionKey!==key){versionKey=key;$('clock-face-select').replaceChildren();availableRows().forEach((r,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=label(r);$('clock-face-select').append(option);});const current=d?availableRows().findIndex(r=>r.modes[d.big?1:0]===nrf52DisplayMode):0;$('clock-face-select').value=String(current<0?0:current);$('clock-face-status').textContent=d?'Chọn mẫu rồi bấm Hiển thị trên đồng hồ.':'Chỉ xem minh họa. Kết nối đồng hồ tương thích để áp dụng.';preview();}
 $('clock-face-availability').textContent=d?'Đã nhận diện đồng hồ '+(d.big?'2.9':'2.13')+' inch. Ảnh là mẫu minh họa dùng chung; ngày giờ thực tế theo đồng hồ.':typeof gattServer==='undefined'||!gattServer?.connected?'Bạn có thể xem mẫu trước khi kết nối đồng hồ.':unavailable();
 $('clock-face-select').disabled=busy||blocked();$('clock-face-apply').disabled=!d||busy||blocked();
}
async function apply(){
 if(busy||blocked())return;
 const d=device(),n=Number($('clock-face-select').value),row=availableRows()[n];if(!d||!row)return;
 busy=true;refresh();$('clock-face-status').textContent='Đang kiểm tra dữ liệu trên đồng hồ…';
 try{
  await T.run(async()=>{
   const token=T.current(),same=()=>{T.guard(token);if(device()?.key!==d.key||epdCharacteristic!==d.ch)throw Error('Kết nối đã thay đổi. Hãy chọn lại sau khi kết nối.');};
   same();if(!await T.facesReady())throw Error('Cần vào Cập nhật phần mềm → Cài đặt đồng hồ trước khi chọn giao diện.');same();
   const mode=row.modes[d.big?1:0],stamp=Math.floor(Date.now()/1000),zone=Math.round(-new Date().getTimezoneOffset()/60);
   const packet=new Uint8Array([0x20,stamp>>>24&255,stamp>>>16&255,stamp>>>8&255,stamp&255,zone&255,mode|0x40]);
   await T.wait(window.EpdGattWrites.run(d.ch,async()=>{same();if(d.ch.writeValueWithResponse)await d.ch.writeValueWithResponse(packet);else await d.ch.writeValue(packet);}),token);
   same();nrf52DisplayMode=mode;
   $('clock-face-status').textContent='Đã gửi lựa chọn “'+label(row)+'”. Chờ màn hình làm mới xong; ngày giờ hiển thị theo thời điểm hiện tại.';
  });
 }catch(e){if(device()?.key===d.key)$('clock-face-status').textContent='Chưa hoàn tất: '+e.message;}
 finally{busy=false;refresh();}
}
$('clock-face-select').addEventListener('change',preview);$('clock-face-apply').addEventListener('click',apply);
$('clock-face-preview').onload=()=>{$('clock-face-preview-status').textContent='';};
$('clock-face-preview').onerror=()=>{$('clock-face-preview-status').textContent='Chưa tải được hình minh họa. Hãy tải lại trang.';};
window.ClockFacePicker={refresh,refreshPreview:preview,apply,supported:()=>!!device()};refresh();setInterval(refresh,500);
})();
