(function(root){
 'use strict';const $=id=>document.getElementById(id);let busy=false;
 function supported(){return typeof appVersion!=='undefined'&&[0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6A,0x6B].includes(appVersion)&&typeof gattServer!=='undefined'&&!!gattServer?.connected;}
 function controls(force=false){if($('year75Mode'))$('year75Mode').disabled=force||busy||!!root.DeviceOperations?.current||!supported();}
 function say(text){$('year75Status').textContent=text;root.addLog?.('Lịch năm: '+text);}
 async function show(){
  if(busy||root.DeviceOperations?.current)return;if(!supported()){say('Kết nối đồng hồ và cập nhật phần mềm v5.22.1 để xem lịch năm.');return;}
  busy=true;controls();
  try{
   say('Đang kiểm tra dữ liệu lịch năm…');
   await root.ExternalResourceInstaller.countdownOperation(async(client,check)=>{
    const parts=await root.Quote75.ready(client,check),info=await client.inspect(6);check();
    const part=parts.find(p=>p.id===6);let installed=false;
    if(part&&!info.code&&info.revision>=9){
     const primary=await client.readRange(part.offset+32+396,16);check();
     const next=396+148+new DataView(primary.buffer,primary.byteOffset).getUint32(8,true);
     if(next+16<=info.length){const head=await client.readRange(part.offset+32+next,16);check();installed=[70,65,83,49,1,0].every((v,i)=>head[i]===v)&&[9,10].includes(head[6])&&!head[7];}
    }
    if(!installed)throw Error('Vào Cài đặt đồng hồ và bấm Cài đặt đồng hồ để bổ sung dữ liệu lịch năm.');
   });
   if(!await root.sendTimeCommand(12,'Lịch năm'))throw Error('Chưa mở được lịch năm. Hãy kết nối lại rồi thử tiếp.');
   say('Đã mở lịch năm. Ngày hiện tại được đánh dấu đỏ; lịch tự cập nhật khi sang ngày mới.');
  }catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}finally{busy=false;controls();}
 }
 root.YearCalendar75={controls,show};controls();
})(globalThis);
