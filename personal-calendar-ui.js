/* Personal calendar is enabled only on the inspected CE 2.13 prototype. */
(()=>{'use strict';
const $=id=>document.getElementById(id),tab=$('tab-vn-todo'),dateTab=$('tab-date-marks'),dates=$('date-mark-controls'),tasks=$('vn-controls');
const taskNav=document.querySelector('[data-tab="tab-vn-todo"]'),dateNav=document.querySelector('[data-tab="tab-date-marks"]');
const oldNav=taskNav.textContent,oldLayout=$('vn-layout').options[0].textContent,oldOpen=$('date-mark-open').textContent,oldHelp=[...tasks.querySelectorAll(':scope > p')].filter((p,i)=>[0,2,3].includes(i)).map(p=>[p,p.textContent]),dateHelp=[...dates.querySelectorAll(':scope > p')].slice(0,2).map(p=>[p,p.textContent]);
const switcher=document.createElement('div');switcher.id='personal-calendar-tabs';switcher.hidden=true;switcher.style.cssText='max-width:860px;margin:12px auto;display:flex;gap:8px;flex-wrap:wrap';
const a=document.createElement('button'),b=document.createElement('button');a.type=b.type='button';a.id='personal-show-tasks';b.id='personal-show-dates';a.style.width=b.style.width='auto';switcher.append(a,b);tab.prepend(switcher);
const en=()=>window.EpdWebsiteI18n?.current()==='en';let active=false,key='',part='tasks';
function select(which){part=which;tasks.hidden=which!=='tasks';dates.hidden=which!=='dates';a.setAttribute('aria-pressed',String(which==='tasks'));b.setAttribute('aria-pressed',String(which==='dates'));}
a.onclick=()=>select('tasks');b.onclick=()=>select('dates');
dateNav.addEventListener('click',()=>{if(active){taskNav.click();select('dates');}});
function refresh(){
 const modern=typeof nrf52FirmwareVersion!=='undefined'&&([279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)||nrf52PanelProfile===33)&&[266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&gattServer?.connected;
 const k=modern+'|'+(typeof nrf52FirmwareVersion==='undefined'?'':nrf52FirmwareVersion)+'|'+en();if(key===k)return;key=k;active=modern;
 switcher.hidden=!modern;switcher.style.display=modern?'flex':'none';dateNav.hidden=modern;
 if(!modern){dateTab.append(dates);tasks.hidden=dates.hidden=false;taskNav.textContent=oldNav;$('vn-layout').options[0].textContent=oldLayout;$('date-mark-open').textContent=oldOpen;for(const [p,t]of [...oldHelp,...dateHelp])p.textContent=t;return;}
 if([268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)){
  dateTab.append(dates);dates.hidden=true;tasks.hidden=false;switcher.style.display='none';
  taskNav.textContent=en()?'Tasks':'Việc cần làm';
  $('vn-layout').options[0].textContent=en()?'Tasks + month calendar':'Việc cần làm + lịch tháng';
  const ps=tasks.querySelectorAll(':scope > p');
  ps[0].textContent=en()?'Add tasks, choose a layout and save.':'Nhập công việc, chọn cách hiển thị rồi lưu.';
  ps[2].textContent=en()?'Both layouts use the same list of up to eight short tasks. The month view has less room for each line.':'Hai cách hiển thị dùng chung tối đa 8 việc ngắn. Khi xem cùng lịch tháng, mỗi dòng cần viết ngắn hơn.';
  ps[3].textContent=en()?'A reminder appears before a scheduled task, then returns to your previous face at the start time. Temporary unsaved pictures are kept on screen.':'Lời nhắc tự hiện trước giờ đã hẹn, rồi quay lại giao diện đang xem khi đến giờ bắt đầu. Ảnh gửi tạm chưa lưu sẽ được giữ nguyên trên màn hình.';
  $('vn-layout').dispatchEvent(new Event('input',{bubbles:true}));return;
 }
 tab.append(dates);taskNav.textContent=en()?'Personal calendar':'Lịch cá nhân';a.textContent=en()?'Tasks':'Việc cần làm';b.textContent=en()?'Important dates':'Ngày quan trọng';
 const option=$('vn-layout').options[0];option.textContent=en()?'Tasks + month calendar':'Việc cần làm + lịch tháng';
 const ps=tasks.querySelectorAll(':scope > p');
 ps[0].textContent=en()?'Add tasks, choose a layout and save. Important dates appear in the month calendar.':'Nhập công việc, chọn cách hiển thị rồi lưu. Những ngày quan trọng được đánh dấu trên lịch tháng.';
 ps[2].textContent=en()?'Both layouts use the same task list. The month view shows up to four short tasks and three important dates. Full-screen view shows up to eight short tasks.':'Hai cách hiển thị dùng chung danh sách. Bên lịch tháng hiện tối đa 4 việc ngắn và 3 ngày quan trọng. Toàn màn hình hiện tối đa 8 việc ngắn.';
 ps[3].textContent=en()?'Keep each task within one line. A reminder appears before a scheduled task while either task view is open.':'Nội dung mỗi việc cần vừa một dòng. Khi đang xem công việc, lời nhắc sẽ xuất hiện trước giờ đã hẹn. Chọn Luôn hiển thị nếu không cần hẹn giờ.';
 const dp=dates.querySelectorAll(':scope > p');dp[0].textContent=en()?'Choose up to three dates and short labels. Red dots link dates in the calendar to their labels below the tasks.':'Chọn tối đa 3 ngày và nội dung ngắn. Chấm đỏ giúp đối chiếu ngày trên lịch với nội dung phía dưới công việc.';dp[1].textContent=en()?'Only dates in the current month appear. Tasks and important dates are saved separately.':'Chỉ hiện các ngày thuộc tháng hiện tại. Công việc và ngày quan trọng được lưu riêng bằng nút Lưu trong từng mục.';
 $('date-mark-open').textContent=en()?'Show personal calendar':'Xem lịch cá nhân';
 select(part);$('vn-layout').dispatchEvent(new Event('input',{bubbles:true}));
}
refresh();setInterval(refresh,500);
})();
