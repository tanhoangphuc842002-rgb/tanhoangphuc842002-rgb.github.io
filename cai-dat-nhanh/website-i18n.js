/* Website UI only. Never changes form values, resource payloads or Bluetooth commands. */
(()=>{
'use strict';
const nodes=new WeakMap(),attrs=new WeakMap(),normalize=s=>String(s).replace(/\s+/g,' ').trim();
const skipTags=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);
let vi={},en={},parts=null,shortParts=null;
function configure(base,extra){
 extra={...extra,
 'Bạn có thể tự lưu bản sao dữ liệu khi cần.':'You can save a backup of your data whenever you need one.',
 'Đang giữ lại nội dung cá nhân trên đồng hồ…':'Keeping your personal content on the clock…',
 'Vùng dữ liệu đang trống. Đang chuẩn bị cài đặt đồng hồ.':'The data area is empty. Preparing to set up the clock.',
 'Dữ liệu đã thay đổi. Chưa ghi dữ liệu mới.':'The data has changed. No new data was written.',
 'Vùng dữ liệu đã thay đổi. Chưa ghi dữ liệu mới.':'The data area has changed. No new data was written.','Giờ nằm ngang phía trên; lịch xé với ngày lớn, tháng, năm và âm lịch phía dưới.':"Horizontal time above; a tear-off calendar with large day, month, year and lunar date below.","Đồng hồ lịch dọc":"Portrait calendar clock","Lịch xé với ngày lớn phía trên và giờ nằm ngang phía dưới.":"A tear-off calendar with a large day above and horizontal time below.","Giờ lớn, thứ và ngày tháng phía trên; âm lịch và nhiệt độ phía dưới.":"Large time, weekday and date above; lunar date and temperature below.","Giờ lớn nằm ngang và ngày tháng bên dưới.":"Large landscape time with the date underneath.","Đồng hồ tranh dọc": "Portrait picture clock", "Giờ và phút xếp dọc, hình mèo bên dưới.": "Hours and minutes stacked vertically, with a cat below.", "Công việc được quản lý riêng trong mục Lịch cá nhân. Mặt này hiển thị giờ và lịch tháng.": "Tasks are managed in Personal calendar. This face shows the time and month calendar.", "Đã lưu và mở lịch cá nhân.": "Saved and opened the personal calendar.", "Đã mở công việc và lịch tháng.": "Opened tasks and the month calendar.", "Đã lưu và mở lịch cá nhân. Các ngày trong tháng hiện tại được đánh dấu trên lịch.": "Saved and opened the personal calendar. Important dates in the current month are marked.",
 'Xóa việc':'Remove task','Thêm công việc':'Add task','Giá trị cài đặt chưa hợp lệ.':'Invalid setting.','Ngày giờ chưa hợp lệ.':'Invalid date or time.','Danh sách trên đồng hồ chưa hợp lệ.':'The task list on the clock is invalid.','Nội dung công việc quá dài. Hãy viết ngắn hơn.':'The task text is too long. Please shorten it.','Chỉ lưu tối đa 8 việc.':'You can save up to eight tasks.',
"Giờ bắt đầu":"Start time","Hạn chót":"Deadline","Luôn hiển thị":"Always show","Số việc hiển thị":"Number of visible tasks","Hiện trước (phút)":"Show before (minutes)","Giữ lại sau hạn (phút)":"Keep after deadline (minutes)","Công việc tự xuất hiện theo giờ đã đặt, chuyển đỏ khi đến giờ bắt đầu và ẩn sau hạn chót. Chọn Luôn hiển thị để giữ công việc trên màn hình. Sau khi sửa, bấm Lưu và mở danh sách.":"Tasks appear on schedule, turn red at the start time and disappear after the deadline window. Choose Always show to keep a task visible. After editing, select Save and show list.","Danh sách đã đầy. Hãy rút ngắn nội dung hoặc giảm số việc.":"The list is full. Shorten the text or use fewer tasks.","Chọn giờ bắt đầu và hạn chót hợp lệ cho công việc.":"Choose a valid start time and deadline for the task.","Bên cạnh đồng hồ chỉ lưu tối đa 4 việc. Giữ Toàn màn hình để lưu đủ danh sách.":"The layout beside the clock saves up to four tasks. Keep Full screen to save the complete list.","Công việc chưa vừa vùng hiển thị. Hãy viết ngắn hơn.":"The task does not fit the display area. Please shorten it.","Độ dài nội dung:":"Text length:","Chữ có dấu chiếm nhiều chỗ hơn.":"Accented letters use more space.","Toàn màn hình: tối đa 8 việc, mỗi việc một dòng vừa khung và tối đa 64 byte nội dung. Nếu danh sách dài, hãy rút ngắn nội dung để lưu đủ các việc. Bên cạnh đồng hồ: tối đa 4 việc, mỗi việc 28 ký tự. Việc quan trọng hiển thị đỏ, việc đã xong có dấu tích.":"Full screen: up to eight tasks, each fitting one line with up to 64 bytes of text. For a long list, shorten the text to fit all tasks. Beside the clock: up to four tasks of 28 characters each. Important tasks are red; completed tasks have a check mark.",
 'Cách hiển thị':'Display layout',
 'Bên cạnh đồng hồ':'Beside the clock',
 'Toàn màn hình':'Full screen',
 'Nhập danh sách, đánh dấu việc quan trọng hoặc đã xong. Chọn cách hiển thị rồi bấm Lưu và mở danh sách.':'Enter your tasks and mark important or completed items. Choose a layout, then select Save and show list.',
 'Hai cách hiển thị dùng chung danh sách. Chọn Toàn màn hình để dành toàn bộ màn hình cho công việc; đồng hồ cần được cập nhật phần mềm mới.':'Both layouts use the same saved list. Choose Full screen to use the entire display for your tasks. Update your clock software first.',
 'Xem trước danh sách theo cách hiển thị đã chọn:':'Preview of the selected list layout:',
 'Cập nhật phần mềm đồng hồ trước khi dùng danh sách toàn màn hình.':'Update your clock software before using the full-screen list.',
 'Đã lưu và mở danh sách toàn màn hình.':'Saved and opened the full-screen list.',
 'Đã lưu danh sách bên cạnh đồng hồ.':'Saved the list beside the clock.',
 'Đã mở danh sách toàn màn hình.':'Opened the full-screen list.',
 'Đã mở giao diện bên cạnh đồng hồ.':'Opened the layout beside the clock.',
 'Chưa mở được danh sách. Kết nối lại rồi bấm Xem trên đồng hồ.':'Could not open the list. Reconnect, then choose Show on clock.',
 'Chưa mở được danh sách. Kết nối lại rồi thử tiếp.':'Could not open the list. Reconnect and try again.',

  'Chọn ảnh của tôi':'Choose my own image','Dừng tải':'Stop upload','Tải lại tranh':'Retry image upload',
  'Đang chờ đồng hồ sẵn sàng và kiểm tra dữ liệu…':'Waiting for the clock and checking its data…',
  'Đang dừng phiên tải bị ngắt để tải lại ảnh…':'Stopping the interrupted transfer before retrying…',
  'Ảnh đã lưu đầy đủ; không cần truyền lại.':'The image is already saved; no need to send it again.',
  'Đang kiểm tra ảnh vừa lưu…':'Checking the saved image…',
  'Bấm Tải lại tranh để thử lại ảnh đã chọn.':'Choose Retry image upload to retry the selected image.',
  'Ảnh và cách hiển thị đã lưu đầy đủ. Bạn có thể sử dụng đồng hồ.':'The image and display settings are saved. Your clock is ready.',
  'Đang kết nối lại đồng hồ để tải lại tranh…':'Reconnecting to retry the image upload…',
  'Hãy kết nối lại đúng đồng hồ đã chọn ảnh rồi bấm Tải lại tranh. Chưa gửi thay đổi.':'Reconnect to the same clock, then choose Retry image upload. No changes were sent.',
  'Chưa kết nối đúng đồng hồ. Hãy kết nối lại rồi bấm Tải lại tranh.':'The same clock is not connected. Reconnect, then choose Retry image upload.',
  'Hãy kết nối lại đúng đồng hồ đã chọn ảnh. Chưa gửi thay đổi.':'Reconnect to the same clock. No changes were sent.'
 };
 vi={...base};en={};for(const[english,vietnamese]of Object.entries(base))en[normalize(vietnamese)]=english;
 for(const[vietnamese,english]of Object.entries(extra)){en[normalize(vietnamese)]=english;if(!(english in vi))vi[english]=vietnamese;}
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 parts=new RegExp(Object.keys(en).filter(s=>s.length>=4&&/[À-ỹĐđ]/.test(s)).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
 shortParts=new RegExp('(^|[^\\p{L}\\p{N}])('+Object.keys(en).filter(s=>s.length>=2&&s.length<4&&/[À-ỹĐđ]/.test(s)).map(escape).join('|')+')(?=$|[^\\p{L}\\p{N}])','gu');
}
function current(){try{return localStorage.getItem('app-language')==='en'?'en':'vi';}catch(_){return'vi';}}
function navigationCopy(value,lang){
 if(lang==='en')return value.replace(/^Software update$/,'Settings').replace(/Software update(?=\s*→|\s+first\.)/g,'Settings');
 return value.replace(/^Cập nhật phần mềm$/,'Cài đặt').replace(/Cập nhật phần mềm(?=\s*→)/g,'Cài đặt').replace(/mục Cập nhật phần mềm/g,'mục Cài đặt');
}
function translate(text,lang=current()){
 if(typeof text!=='string')return text;
 if(lang==='en')text=text.replace(/Đã kiểm tra xong \(([\d.]+) giây\)\. Đang lưu ảnh\. Giữ kết nối và không tháo pin\./g,'Checks completed ($1 seconds). Saving the image. Stay connected and keep the battery in place.');
 const key=normalize(text),map=lang==='en'?en:vi;
 let value=map[key];
 if(value===undefined&&lang!=='en')return navigationCopy(text,lang);
 if(value===undefined)value=lang==='en'&&parts?key.replace(parts,s=>en[s]).replace(shortParts,(match,gap,s)=>gap+en[s]):key;
 return text.match(/^\s*/)[0]+navigationCopy(value,lang)+text.match(/\s*$/)[0];
}
function ignored(element){return !element||skipTags.has(element.tagName)||!!element.closest('[data-no-i18n],#daily-quote-list,#daily-quote-author-preview');}
function textNode(node,lang=current()){
 if(ignored(node.parentElement)||!node.nodeValue?.trim())return;
 const raw=node.nodeValue,prior=nodes.get(node);
 const source=prior&&raw===prior.last?prior.source:raw;
 const last=translate(source,lang);nodes.set(node,{source,last});if(raw!==last)node.nodeValue=last;
}
function attributes(element,lang=current()){
 if(!element||element.closest('[data-no-i18n]'))return;let state=attrs.get(element);if(!state){state={};attrs.set(element,state);}
 for(const name of ['placeholder','title','aria-label','alt']){
  if(!element.hasAttribute(name))continue;const raw=element.getAttribute(name),prior=state[name],source=prior&&raw===prior.last?prior.source:raw,last=translate(source,lang);
  state[name]={source,last};if(raw!==last)element.setAttribute(name,last);
 }
}
function subtree(root,lang=current()){
 if(root.nodeType===Node.TEXT_NODE){textNode(root,lang);return;}
 if(root.nodeType!==Node.ELEMENT_NODE)return;
 attributes(root,lang);if(ignored(root))return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const list=[];while(walker.nextNode())list.push(walker.currentNode);for(const n of list)textNode(n,lang);
 for(const el of root.querySelectorAll('[placeholder],[title],[aria-label],[alt]'))attributes(el,lang);
}
function apply(lang=current()){
 lang=lang==='en'?'en':'vi';try{localStorage.setItem('app-language',lang);}catch(_){}
 document.documentElement.lang=lang;document.title=translate('E-Paper Tag - Bluetooth Controller',lang);
 const selector=document.getElementById('language-selector');if(selector)selector.value=lang;
 // Refresh only illustration URLs: choosing a website language never writes to the clock.
 window.ClockFacePicker?.refreshPreview?.();
 window.CalendarFacePicker?.refreshPreview?.();
 subtree(document.body,lang);
}
function observe(){
 const observer=new MutationObserver(changes=>{const lang=current();for(const m of changes){
  if(m.type==='characterData')textNode(m.target,lang);
  else if(m.type==='attributes')attributes(m.target,lang);
  else for(const n of m.addedNodes)subtree(n,lang);
 }});
 observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label','alt']});
 // Dialog messages are UI, not outgoing resource data. Inputs and drafts are untouched.
 for(const name of ['alert','confirm']){const original=window[name].bind(window);window[name]=message=>original(translate(message));}
}
window.EpdWebsiteI18n={configure,current,translate,apply,observe,textNode,attributes};
})();
