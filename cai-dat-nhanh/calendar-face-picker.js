/* Calendar selection: one SET_TIME packet, no cycling through intermediate faces. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),T=window.VNTransport;
const previewBase=new URL('face-previews/',document.currentScript?.src||location.href);
const rows=[
 {name:'Lịch thông tin',description:'Lịch tháng kèm năm, tháng, âm lịch, tuần và mã đồng hồ.',modes:[1,1]},
 {name:'Lịch tháng lớn',description:'Số tháng lớn màu đỏ, tên tháng bằng chữ; bảng lịch tháng ở bên trái.',modes:[9,9]},
 {name:'Lịch âm',description:'Bảng ngày âm lịch; số tháng lớn màu đen, năm màu đỏ và ngày dương lịch bên dưới.',modes:[7,5]}
];
let busy=false,versionKey='';
function device(){
 if(typeof deviceProtocol==='undefined'||deviceProtocol!==PROTOCOL_NRF52||!gattServer?.connected||!nrf52ModelDetected||nrf52ModelId!==2||!epdCharacteristic)return null;
 const id=nrf52FirmwareVersion>=254?(nrf52PanelProfile===0x29?([254,256,258,260,262,264,266,268,270,272,274,276,278,280,282,283,285,287,289,291].includes(nrf52FirmwareVersion)?'ce290':'noce290'):([254,256,258,260,262,264,266,268,270,272,274,276,278,280,282,283,285,287,289,291].includes(nrf52FirmwareVersion)?'ce213-up3':'noce213-up3')):({213:'ce213',214:'noce213',215:'ce290',216:'noce290',217:'ce213-up3',218:'noce213-up3',219:'ce213-up3',220:'noce213-up3',221:'ce290',222:'noce290',223:'ce213-up3',224:'noce213-up3',229:'noce213-up3',233:'noce213-up3',237:'noce213-up3',243:'noce213-up3',247:'noce213-up3',251:'noce213-up3',225:'ce290',230:'ce290',234:'ce290',238:'ce290',244:'ce290',248:'ce290',252:'ce290',226:'noce290',231:'noce290',235:'noce290',239:'noce290',241:'noce290',245:'noce290',249:'noce290',253:'noce290',227:'ce213-up3',228:'ce213-up3',232:'ce213-up3',236:'ce213-up3',242:'ce213-up3',246:'ce213-up3',250:'ce213-up3'})[nrf52FirmwareVersion],big=nrf52PanelProfile===0x29;
 const supported=big
  ?[215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,280,281,283,284,287,288,291,292]
  :nrf52PanelProfile===0x21
   ?[213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,282,285,286,289,290]
   :[];
 if(!id||!supported.includes(nrf52FirmwareVersion))return null;
 return{key:[bleDevice?.id,nrf52PanelProfile,nrf52FirmwareVersion].join('|'),id,big,ch:epdCharacteristic};
}
function blocked(){return !!(window.VNDataBusy?.()||window.EpdDfuBusy?.()||window.EpdAutoUpdate?.busy?.()||window.countdownOperationBusy||(typeof clockImageUploadBusy!=='undefined'&&clockImageUploadBusy));}
function preview(){const n=Number($('calendar-face-select').value),row=rows[n];if(!row)return;const dir=window.EpdWebsiteI18n?.current()==='en'?'en/':'';const url=new URL(dir+'calendar-'+(n+1)+'.png',previewBase);url.searchParams.set('v','6161');$('calendar-face-preview-status').textContent='';$('calendar-face-preview').src=url.href;$('calendar-face-preview').alt=row.name+' — hình minh họa';$('calendar-face-description').textContent=row.description;}
function refresh(){
 const d=device(),key=d?.key||'preview-only';$('calendar-face-controls').hidden=false;
 if(versionKey!==key){versionKey=key;$('calendar-face-select').replaceChildren();rows.forEach((r,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=r.name;$('calendar-face-select').append(o);});const n=d?rows.findIndex(r=>r.modes[d.big?1:0]===nrf52DisplayMode):0;$('calendar-face-select').value=String(n<0?0:n);$('calendar-face-status').textContent=d?'Chọn mẫu rồi bấm Hiển thị lịch trên đồng hồ.':'Chỉ xem minh họa. Kết nối đồng hồ tương thích để áp dụng.';preview();}
 $('calendar-face-availability').textContent=d?'Đã nhận diện đồng hồ '+(d.big?'2.9':'2.13')+' inch. Ảnh là mẫu minh họa dùng chung; ngày tháng thực tế theo đồng hồ.':typeof gattServer==='undefined'||!gattServer?.connected?'Bạn có thể xem mẫu trước khi kết nối đồng hồ.':'Đồng hồ này vẫn dùng nút Lịch tháng phía trên. Cập nhật phần mềm có hỗ trợ để chọn trực tiếp.';
 $('calendar-face-select').disabled=busy||blocked();$('calendar-face-apply').disabled=!d||busy||blocked();
}
async function apply(){
 if(busy||blocked())return;const d=device(),row=rows[Number($('calendar-face-select').value)];if(!d||!row)return;
 busy=true;refresh();$('calendar-face-status').textContent='Đang kiểm tra dữ liệu trên đồng hồ…';
 try{await T.run(async()=>{
  const token=T.current(),same=()=>{T.guard(token);if(device()?.key!==d.key||epdCharacteristic!==d.ch)throw Error('Kết nối đã thay đổi. Hãy kết nối lại rồi chọn lịch.');};
  same();if(!await T.facesReady())throw Error('Vào Cập nhật phần mềm → Cài đặt đồng hồ để cài dữ liệu mới trước.');same();
  const mode=row.modes[d.big?1:0],stamp=Math.floor(Date.now()/1000),zone=Math.round(-new Date().getTimezoneOffset()/60),packet=new Uint8Array([0x20,stamp>>>24&255,stamp>>>16&255,stamp>>>8&255,stamp&255,zone&255,mode|0x40]);
  await T.wait(window.EpdGattWrites.run(d.ch,async()=>{same();if(d.ch.writeValueWithResponse)await d.ch.writeValueWithResponse(packet);else await d.ch.writeValue(packet);}),token);same();nrf52DisplayMode=mode;
  $('calendar-face-status').textContent='Đã chọn “'+row.name+'”. Chờ màn hình làm mới xong.';
 });}catch(e){if(device()?.key===d.key)$('calendar-face-status').textContent='Chưa hoàn tất: '+e.message;}
 finally{busy=false;refresh();}
}
$('calendar-face-select').addEventListener('change',preview);$('calendar-face-apply').addEventListener('click',apply);
$('calendar-face-preview').onload=()=>{$('calendar-face-preview-status').textContent='';};
$('calendar-face-preview').onerror=()=>{$('calendar-face-preview-status').textContent='Chưa tải được hình minh họa. Hãy tải lại trang.';};
window.CalendarFacePicker={refresh,refreshPreview:preview,apply,supported:()=>!!device()};refresh();setInterval(refresh,500);
})();
