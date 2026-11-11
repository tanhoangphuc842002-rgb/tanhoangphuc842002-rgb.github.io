/* Capability-gated resource setup; legacy countdown and DFU remain intact. */
(() => {
'use strict';
const $=id=>document.getElementById(id), enc=new TextEncoder(), dec=new TextDecoder('utf-8',{fatal:true});
let defaultBytes=Uint8Array.from(atob(window.VNFontBase64),c=>c.charCodeAt(0)),fontProfile=0;
let packetSeq=0, pending=null, work=false, cap=null, bound=null, backupDevice=null, backup=null, setupWork=false, progressCallback=null;
const fonts=[];
let boundDevice=null,resourceLanguage=0,languageOverride=null,languageTask=false,languagePhase='';
function languageSupported(){return (resourceProfile()===0x21&&[227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))||(resourceProfile()===0x29&&[230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion));}
const operation=window.CreateVNOperation({
 device:()=>bleDevice,
 busy(value,token){setupWork=value&&!!token.setup;progressCallback=value?token.progress:null;setBusy(value);},
 stopped(error){cap=null;if(languageTask){languageTask=false;languageProgress('error');languageStatus('Chưa hoàn tất / Not applied: '+error.message);}if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(error);}}
});
function onTransportDisconnect(event){
 if(event?.target&&event.target!==boundDevice)return;
 cap=null;operation.cancel('Mất kết nối. Nội dung đang nhập được giữ nguyên. Kết nối lại rồi bấm Dừng truyền / khôi phục để lưu lại.',false);
}
function bindTransportDevice(){if(boundDevice===bleDevice)return;boundDevice?.removeEventListener?.('gattserverdisconnected',onTransportDisconnect);boundDevice=bleDevice;boundDevice?.addEventListener?.('gattserverdisconnected',onTransportDisconnect);}
function resourceProfile(){
 if(typeof deviceProtocol==='undefined'||deviceProtocol!==PROTOCOL_NRF52||!nrf52ModelDetected||nrf52ModelId!==2||typeof nrf52PanelProfile==='undefined')return 0;
 if(nrf52PanelProfile===0x21&&[127,128,129,130,131,132,137,138,139,140,141,142,143,144,149,150,151,152,153,154,155,156,159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))return 0x21;
 if(nrf52PanelProfile===0x29&&[133,135,136,145,146,147,148,157,158,167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))return 0x29;
 return 0;
}
function fullTodoSupported(){return !!resourceProfile()&&[260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion);}
function personalTodo(){return [279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)||resourceProfile()===33&&[266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion);}
function scheduledTodo(){return fullTodo()||personalTodo();}
function fullTodo(){return $('vn-layout')?.value==='full';}
function todoMode(){if(fullTodo()){if(!fullTodoSupported())throw Error('Cập nhật phần mềm đồng hồ trước khi dùng danh sách toàn màn hình.');return 16;}return personalTodo()?(resourceProfile()===41?12:11):3;}
function todoLayout(){const settings=$('vn-schedule-settings');if(settings)settings.hidden=!scheduledTodo();document.querySelectorAll('.vn-schedule-fields').forEach(el=>el.hidden=!scheduledTodo());const opt=$('vn-layout-full');if(opt)opt.disabled=!fullTodoSupported();const label=$('vn-enable-label');if(label)label.hidden=scheduledTodo();for(let i=4;i<8;i++){const row=$('vn-row-'+i);if(row)row.hidden=!scheduledTodo()&&!$('vn-text-'+i).value.trim();}}
function todoWidth(){if(!fullTodo()&&resourceProfile()===41&&[280,281,283,284,287,288,291,292].includes(nrf52FirmwareVersion))return 176;if(fullTodo())return resourceProfile()===0x29?296:250;return resourceProfile()===0x29?([167,168].includes(nrf52FirmwareVersion)?140:194):148;}
function noDataSetup(){return ([135,136,145,146,147,148,157,158,167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&resourceProfile()===0x29)||([137,138,139,140,141,142,143,144,149,150,151,152,153,154,155,156,159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&resourceProfile()===0x21);}
function titleWidth(){return resourceProfile()===0x29?228:184;}
function u32(n){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;}
function crc32(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function selectFont(){
 const profile=resourceProfile()===0x29?0x29:0x21;
 if(profile===fontProfile)return;
 defaultBytes=Uint8Array.from(atob(profile===0x29?window.VNFont290Base64:window.VNFontBase64),c=>c.charCodeAt(0));
 fonts.length=0;fontProfile=profile;
 for(let p=512,slot=0;slot<2;slot++) {
 const v=new DataView(defaultBytes.buffer,p), count=v.getUint16(2,true), size=v.getUint32(4,true), map=new Map();
 for(let i=0;i<count;i++){const q=p+16+i*12,g=new DataView(defaultBytes.buffer,q,12);map.set(g.getUint16(0,true),{w:g.getUint8(2),h:g.getUint8(3),x:g.getInt8(4),y:g.getInt8(5),a:g.getUint8(6),off:p+g.getUint32(8,true)});}
  fonts.push(map);p+=size;
 }
}
selectFont();
function width(text,size=0){return [...text.normalize('NFC')].reduce((w,c)=>w+(fonts[size].get(c.codePointAt(0))||fonts[size].get(63)).a,0);}
function draw(ctx,text,x,y,size,color) {
 ctx.fillStyle=color;
 for(const c of text.normalize('NFC')){const g=fonts[size].get(c.codePointAt(0))||fonts[size].get(63),stride=Math.ceil(g.w/8);
  for(let row=0;row<g.h;row++)for(let col=0;col<g.w;col++)if(defaultBytes[g.off+row*stride+(col>>3)]&(128>>(col&7)))ctx.fillRect(x+g.x+col,y+g.y+row,1,1);
  x+=g.a;
 }
}
for(let i=0;i<8;i++) {
 const row=document.createElement('div'); row.id='vn-row-'+i;row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0';
 const text=document.createElement('input');text.id='vn-text-'+i;text.placeholder='Việc '+(i+1);text.setAttribute('aria-label','Nội dung việc '+(i+1));text.style.flex='1';
 row.append(text);
 for(const [name,label] of [['done','Đã xong'],['red','Quan trọng']]) {const l=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.id=`vn-${name}-${i}`;l.append(box,label);row.append(l);}

 const schedule=document.createElement('div');schedule.className='vn-schedule-fields';schedule.style.cssText='display:flex;gap:10px;flex-wrap:wrap;width:100%';schedule.hidden=true;
 for(const [name,label] of [['start','Giờ bắt đầu'],['due','Hạn chót']]){const l=document.createElement('label');l.style.cssText='display:flex;flex:1;min-width:180px;flex-direction:column;align-items:stretch';l.append(label);const input=document.createElement('input');input.type='datetime-local';input.id='vn-'+name+'-'+i;input.step='60';l.append(input);schedule.append(l);}
 const label=document.createElement('label'),always=document.createElement('input');always.type='checkbox';always.id='vn-always-'+i;always.checked=true;label.append(always,'Luôn hiển thị');schedule.append(label);row.append(schedule);
 const counter=document.createElement('small');counter.id='vn-count-'+i;counter.style.width='100%';row.append(counter);
 $('vn-items').append(row);
 const clear=document.createElement('button');clear.type='button';clear.textContent='Xóa việc';clear.className='btn-secondary';clear.style.cssText='width:auto;padding:6px 10px';clear.onclick=()=>{text.value='';$('vn-done-'+i).checked=false;$('vn-red-'+i).checked=false;$('vn-start-'+i).value='';$('vn-due-'+i).value='';$('vn-always-'+i).checked=true;render();};row.append(clear);
}
const addTask=document.createElement('button');addTask.type='button';addTask.id='vn-add-task';addTask.textContent='Thêm công việc';addTask.style.cssText='width:auto;margin:8px 0';addTask.onclick=()=>{const max=scheduledTodo()?8:4;for(let i=0;i<max;i++)if(!$('vn-text-'+i).value.trim()){$('vn-text-'+i).scrollIntoView({block:'center',behavior:'smooth'});$('vn-text-'+i).focus();return;}status('Danh sách đã đầy. Hãy rút ngắn nội dung hoặc giảm số việc.');};$('vn-items').after(addTask);
function draft() {
 const b=Uint8Array.from(defaultBytes);b.fill(0,0,512);b[0]=scheduledTodo()?2:1;b[1]=personalTodo()||$('vn-enable').checked?1:0;
 function put(text,at,maxChars,maxBytes){text=text.trim().normalize('NFC');const chars=[...text];
  if(chars.length>maxChars)throw Error(`Nội dung tối đa ${maxChars} ký tự.`);
  for(const c of chars)if(!fonts[0].has(c.codePointAt(0)))throw Error('Chưa hỗ trợ ký tự: '+c+'. Dùng chữ tiếng Việt và ký tự thông thường.');
  const utf=enc.encode(text);if(utf.length>maxBytes)throw Error('Nội dung quá dài.');b.set(utf,at);return utf.length;
 }
 const title=$('vn-title').value.trim().normalize('NFC');if(width(title,0)>titleWidth())throw Error('Tiêu đề chưa vừa một dòng. Hãy rút ngắn nội dung.');
 b[3]=put(title,4,24,72);
 const rows=[];
 for(let i=0;i<8;i++){
  const text=$('vn-text-'+i).value.trim().normalize('NFC');$('vn-count-'+i).textContent='Độ dài nội dung: '+enc.encode(text).length+'/'+(scheduledTodo()?64:96)+' byte. Chữ có dấu chiếm nhiều chỗ hơn.';if(!text)continue;
  for(const c of text)if(!fonts[0].has(c.codePointAt(0)))throw Error('Chưa hỗ trợ ký tự: '+c);
  if([...text].length>(scheduledTodo()?64:28))throw Error('Nội dung công việc quá dài.');
  let x=16,line=0;for(const c of text){const advance=width(c);if(x+advance>todoWidth()-2){line++;x=16;}if(line>(scheduledTodo()?0:1))throw Error('Công việc chưa vừa vùng hiển thị. Hãy viết ngắn hơn.');x+=advance;}
  rows.push({text,flags:($('vn-done-'+i).checked?1:0)|($('vn-red-'+i).checked?2:0),always:$('vn-always-'+i).checked,start:$('vn-start-'+i).value,due:$('vn-due-'+i).value});
 }
 return TodoScheduleCodec.write(b,rows,{full:scheduledTodo(),max:$('vn-show-count').value,lead:$('vn-lead').value,keep:$('vn-keep').value});
}
function render(){try{todoLayout();selectFont();const b=draft(),canvas=$('vn-preview'),w=todoWidth();if(canvas.width!==w){canvas.width=w;canvas.style.width=(w*3)+'px';}const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,128);draw(ctx,'Việc cần làm',5,0,1,'#ad1520');ctx.fillStyle='black';ctx.fillRect(0,18,w,1);
 const now=new Date(),civil=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate(),now.getHours(),now.getMinutes())/1000;
 const rows=TodoScheduleCodec.visible(TodoScheduleCodec.decode(b),civil);
 for(let i=0;i<rows.length;i++){const row=rows[i],text=row.text;let x=16,y=21+i*(b[0]===2?13:26);
 ctx.strokeStyle='black';ctx.strokeRect(3.5,y+3.5,7,7);if(row.flags&1){ctx.beginPath();ctx.moveTo(4,y+7);ctx.lineTo(6,y+9);ctx.lineTo(10,y+4);ctx.stroke();}
 for(const c of text){if(x+width(c)>w-2){x=16;y+=13;}draw(ctx,c,x,y,0,row.red?'#ad1520':'black');x+=width(c);}
 }if(!rows.length)draw(ctx,'Chưa có việc',6,28,0,'black');
 $('vn-status').textContent='Nội dung vừa vùng hiển thị. Chưa lưu thay đổi.';
 }catch(e){status(e.message);}}
function status(s){$('vn-status').textContent=s;}
function setupStatus(s){$('vn-setup-status').textContent=s;if(typeof addLog==='function')addLog('Cài đặt đồng hồ: '+s);}
function progress(value){$(setupWork?'vn-setup-progress':'vn-progress').value=value;if(languageTask&&languagePhase==='write')languageProgress('write',value);progressCallback?.(value);}
function deviceKey(){return typeof bleDevice!=='undefined'&&bleDevice?.id?bleDevice.id:bound;}
function connectionDetails(){
 const v=typeof nrf52FirmwareVersion==='undefined'?'?':nrf52FirmwareVersion;
 const p=typeof nrf52PanelProfile==='undefined'||nrf52PanelProfile==null?'?':nrf52PanelProfile;
 const m=typeof nrf52ModelId==='undefined'?'?':nrf52ModelId;
 const d=typeof nrf52ModelDetected!=='undefined'&&nrf52ModelDetected?1:0;
 const b=typeof gattServer!=='undefined'&&gattServer?.connected?1:0;
 const c=typeof epdCharacteristic!=='undefined'&&epdCharacteristic?1:0;
 const n=typeof deviceProtocol!=='undefined'&&deviceProtocol===PROTOCOL_NRF52?1:0;
 const r=typeof restoreVerifiedNrf52PanelProfile==='function'?1:0;
 return 'Chi tiết CD6: v='+v+'; p='+p+'; m='+m+'; d='+d+'; b='+b+'; c='+c+'; n='+n+'; r='+r+'.';
}
function connection(){if(!resourceProfile()||!epdCharacteristic||!gattServer?.connected)throw Error('Hãy kết nối đồng hồ hỗ trợ tiếng Việt và việc cần làm. Đồng hồ này hiện chưa hỗ trợ chức năng đó. '+connectionDetails());
 bindTransportDevice();selectFont();
 if(bound!==epdCharacteristic){if(bound)bound.removeEventListener('characteristicvaluechanged',notify);bound=epdCharacteristic;bound.addEventListener('characteristicvaluechanged',notify);cap=null;render();}
 return bound;
}
function notify(e){const d=Uint8Array.from(new Uint8Array(e.target.value.buffer,e.target.value.byteOffset,e.target.value.byteLength));
 if(d.length<6||d[0]!==0xea||d[1]!==0x56||d[2]!==0x4e)return;
 if(pending&&d[3]===pending.op&&d[4]===pending.seq){const p=pending;pending=null;clearTimeout(p.timer);p.resolve(d);}}
async function request(op,body=[],options={}) {
 const token=operation.current();operation.guard(token);
 const ch=connection(),seq=(++packetSeq)&255,pkt=Uint8Array.from([0xea,0x56,0x4e,op,seq,...body]);
 const job=window.EpdGattWrites.run(ch,async()=>{
  operation.guard(token);if(ch!==connection())throw Error('Kết nối đã đổi.');
  let resolve,reject;const reply=new Promise((a,b)=>{resolve=a;reject=b;});reply.catch(()=>{});
  const entry={op,seq,resolve,reject,timer:null};pending=entry;
  try {const exchange=Promise.all([nrf52FirmwareVersion>=129&&ch.properties?.writeWithoutResponse&&ch.writeValueWithoutResponse?ch.writeValueWithoutResponse(pkt):(ch.writeValueWithResponse?ch.writeValueWithResponse(pkt):ch.writeValue(pkt)),reply]);const [,d]=await Promise.race([exchange,...(token?[token.stop]:[])]);
   operation.guard(token);if(ch!==connection())throw Error('Kết nối đã đổi.');
   if(d[5]){const error=Error(({1:'Chưa nhận diện được bộ nhớ đồng hồ.',2:'Bộ nhớ đang bận hoặc chưa ghi được.',3:'Nội dung gửi chưa hợp lệ.',4:'Dữ liệu chưa qua kiểm tra.',5:'Đồng hồ đang bận. Chờ làm mới màn hình xong rồi thử lại.'})[d[5]]||'Đồng hồ chưa nhận thao tác.');error.deviceStatus=d[5];error.operation=op;throw error;}return d;
  }finally{if(pending===entry)pending=null;}
 });
 return operation.wait(job,token,options.timeout||15000);
}
async function probe(options={}){
 const started=Date.now(),token=operation.current();
 for(;;){
  try{cap=await request(0,[],{timeout:options.readiness?Math.max(1,45000-(Date.now()-started)):15000});break;}
  catch(error){
   // Only an explicit busy reply to this read-only query is retried.
   // Lost acknowledgements of writes must never be replayed here.
   if(!options.readiness||error.deviceStatus!==5||Date.now()-started>=45000)throw error;
   await operation.wait(new Promise(resolve=>setTimeout(resolve,500)),token);
  }
 }
if(cap.length!==14||![1,2,3,4,5,6,7,8].includes(cap[6])||cap[9]<14)throw Error('Đồng hồ chưa hỗ trợ chức năng này. Chưa gửi thay đổi.');
 if(options.language!==false&&languageSupported()&&cap[7]&&!cap[8]&&languageOverride===null){
  let at=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true)+528;resourceLanguage=0;
  const bankEnd=at-528+65536;
  for(let slot=0;slot<(resourceProfile()===0x29?8:4);slot++){const h=await read(at,16),v=new DataView(h.buffer,h.byteOffset);if(h[0]!==slot)break;const n=v.getUint32(4,true);if(n<16||at+n>bankEnd)throw Error('Dữ liệu giao diện chưa hợp lệ.');if(slot===(resourceProfile()===0x29?7:3)&&v.getUint32(12,true)===0x31474e4c){const off=v.getUint32(8,true);if(off>n-8)throw Error('Dữ liệu ngôn ngữ chưa hợp lệ.');const l=await read(at+off,8);if(new DataView(l.buffer).getUint32(0,true)!==0x31474e4c||l[4]>1)throw Error('Ngôn ngữ chưa hợp lệ.');resourceLanguage=l[4];}at+=n;}
 }
 return cap;}
function unpackRead(d,limit){
 if(d.length<8)throw Error('Chưa đọc đủ dữ liệu. Hãy kết nối lại rồi thử lại.');
 const wireLength=d[6]|d[7]<<8,length=wireLength&0x7fff;if(!length||length>limit)throw Error('Dữ liệu nhận được chưa đầy đủ. Hãy thử lại.');
 if(wireLength&0x8000){if(d.length!==8+length)throw Error('Dữ liệu nhận được chưa đầy đủ. Hãy thử lại.');return d.slice(8);}
 const bytes=new Uint8Array(length);let at=8,pos=0;
 while(at<d.length){const n=d[at++];
  if(!n||n>length-pos)throw Error('Dữ liệu nhận được chưa hợp lệ. Hãy thử lại.');
  if(at>=d.length)throw Error('Dữ liệu nhận được chưa đầy đủ. Hãy thử lại.');bytes.fill(d[at++],pos,pos+n);
  pos+=n;
 }if(pos!==length)throw Error('Chưa đọc đủ dữ liệu. Hãy kết nối lại rồi thử lại.');return bytes;
}
async function read(a,n){const result=new Uint8Array(n),fast=cap[6]>=3&&n>=4096;let pos=0,lastPercent=-1;while(pos<n){
 let bytes;
 if(fast){const take=Math.min(4096,n-pos),d=await request(7,[...u32(a+pos),take&255,take>>8]);bytes=unpackRead(d,take);}
 else {const take=Math.min(cap[9],n-pos),d=await request(1,[...u32(a+pos),take]);if(d.length!==6+take)throw Error('Đọc dữ liệu thiếu.');bytes=d.subarray(6);}
 result.set(bytes,pos);pos+=bytes.length;progress(pos/n*100);
 if(setupWork&&n===0x80000){const percent=Math.floor(pos/n*100);if(percent!==lastPercent){lastPercent=percent;$('vn-setup-status').textContent='Đang đọc bản sao lưu: '+percent+'%. Giữ trang mở và đồng hồ ở gần.';}}
 }return result;}
function setBusy(v){work=v;for(const el of document.querySelectorAll('#clock-language-controls button,#clock-language-controls select,#vn-controls button,#vn-controls input,#vn-controls select,#vn-setup-controls button,#vn-setup-controls input,#date-mark-controls button,#date-mark-controls input,#daily-quote-controls button,#daily-quote-controls input,#daily-quote-controls textarea,#daily-quote-controls select'))el.disabled=['date-mark-recover','daily-quote-recover'].includes(el.id)?false:v;}
async function runWork(fn,onProgress,setup=false){
 if(work||window.EpdDfuBusy?.()||window.EpdDesigner?.busy||window.countdownOperationBusy)throw Error('Đang có thao tác khác. Chờ hoàn tất rồi thử lại.');
 return operation.run(fn,{setup,progress:onProgress});
}
async function action(fn,setup=false){if(work)return;
 try{await runWork(fn,null,setup);}catch(e){(setup?setupStatus:status)('Chưa hoàn tất: '+e.message);if(!setup&&typeof addLog==='function')addLog('Việc cần làm: '+e.message);}
}
async function loadConfig(){const r=await probe();if(!r[7]){status('Chưa cài dữ liệu. Bấm Đi tới Cài đặt đồng hồ, rồi bấm Cài đặt đồng hồ.');return;}
 const base=new DataView(r.buffer,r.byteOffset).getUint32(10,true),b=await read(base+16,512);
 $('vn-enable').checked=!!b[1];$('vn-title').value=dec.decode(b.slice(4,4+b[3]));
 const list=TodoScheduleCodec.decode(b);if(b[0]===2){$('vn-show-count').value=list.max;$('vn-lead').value=list.lead;$('vn-keep').value=list.keep;}
 for(let i=0;i<8;i++){const row=list.rows[i];$('vn-text-'+i).value=row?.text||'';$('vn-done-'+i).checked=!!(row?.flags&1);$('vn-red-'+i).checked=!!(row?.flags&2);$('vn-always-'+i).checked=row?.always??true;$('vn-start-'+i).value=TodoScheduleCodec.date(row?.start);$('vn-due-'+i).value=TodoScheduleCodec.date(row?.due);}

 render();status('Đã đọc nội dung lưu trong đồng hồ.');
}
async function uploadBytes(bytes) {
 if(bytes.length>65520)throw Error("Nội dung vượt dung lượng đồng hồ. Hãy rút ngắn một số câu riêng rồi thử lại. Chưa ghi thay đổi.");
 if(languageTask)languageProgress('write',0);
 await request(2,[...u32(0xc0decafe),bytes.length&255,bytes.length>>8,...u32(crc32(bytes))]);
 const chunk=cap[9]-1;
 for(let pos=0;pos<bytes.length;pos+=chunk){await request(3,[pos&255,pos>>8,...bytes.slice(pos,pos+chunk)]);const percent=Math.min(pos+chunk,bytes.length)/bytes.length*100;progress(percent);if(setupWork)$('vn-setup-status').textContent='Đang cài đặt đồng hồ: '+Math.floor(percent)+'%. Không ngắt kết nối.';}
 await request(4,noDataSetup()?[1]:[]);
 if(languageTask)languageProgress('verify');
}
async function fontMatches(){
 if(!cap[7])return false;
 if(cap[6]>=2){const r=await request(9);return r.length===10&&new DataView(r.buffer,r.byteOffset).getUint32(6,true)===crc32(defaultBytes.subarray(512));}
 const base=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true),h=await read(base,16);
 if(new DataView(h.buffer).getUint32(8,true)!==defaultBytes.length)return false;
 return crc32(await read(base+16+512,defaultBytes.length-512))===crc32(defaultBytes.subarray(512));
}
async function uploadConfig(bytes,deferRedraw=false,preserveCalendar=true){
 if(!await fontMatches())throw Error('Cần cài đặt đồng hồ ở mục Cập nhật phần mềm trước.');
 if(preserveCalendar&&[139,140,141,142,143,144,149,150,151,152,153,154,155,156,159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&(resourceProfile()===0x21||fullTodoSupported())){
  const base=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true);
  bytes.set(await read(base+16+480,32),480);
 }
 if(cap[6]<2){await uploadBytes(bytes);await verifyInstalled(bytes);return;}
 const config=bytes.subarray(0,512);
 await request(6,[...u32(0xc0decafe),...u32(crc32(config))]);
 const chunk=cap[9]-1;
 for(let pos=0;pos<config.length;pos+=chunk){await request(3,[pos&255,pos>>8,...config.slice(pos,pos+chunk)]);progress(Math.min(pos+chunk,config.length)/config.length*100);}
 await request(4,deferRedraw&&nrf52FirmwareVersion>=131?[1]:[]);await probe();requireReady();
 const base=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true);
 if(crc32(await read(base+16,512))!==crc32(config)||!await fontMatches())throw Error('Chưa xác nhận được nội dung đã lưu. Hãy kết nối lại và kiểm tra.');
}
function download(b,name){const url=URL.createObjectURL(new Blob([b],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function navigate(tab){document.querySelector('.tab-button[data-tab="'+tab+'"]')?.click();}
function requireReady(){if(!cap[7])throw Error('Chưa cài đặt đồng hồ. Mở Cập nhật phần mềm → Cài đặt đồng hồ trước.');}
async function verifyInstalled(bytes){
 const r=await probe();requireReady();
 const base=new DataView(r.buffer,r.byteOffset).getUint32(10,true),header=await read(base,16),v=new DataView(header.buffer);
 if(v.getUint32(0,true)!==0x31544e56||v.getUint32(8,true)!==bytes.length||v.getUint32(12,true)!==crc32(bytes))throw Error('Bộ dữ liệu trên đồng hồ chưa khớp bản vừa cài. Kết nối lại và kiểm tra; không tự ghi lại.');
 await verifyRange(base+16,bytes);
 progress(100);
}
async function verifyRange(a,bytes){
 const expected=crc32(bytes);let actual;
 if(cap[6]>=3){const d=await request(8,[...u32(a),bytes.length&255,bytes.length>>8]);if(d.length!==10)throw Error('Chưa nhận được kết quả kiểm tra dữ liệu. Hãy thử lại.');actual=new DataView(d.buffer,d.byteOffset).getUint32(6,true);}
 else actual=crc32(await read(a,bytes.length));
 if(actual!==expected)throw Error('Dữ liệu kiểm tra chưa khớp. Chưa xác nhận lưu thành công; hãy kết nối lại rồi kiểm tra.');
}
async function makeBackup(){
 const token=operation.current(),started=Date.now();
 setupStatus('Đang tạo bản sao lưu đồng hồ. Có thể mất vài phút; bước này không thay đổi dữ liệu.');
 const key=deviceKey(),b=await read(0,0x80000);
 if(key!==deviceKey())throw Error('Đã đổi thiết bị. Hãy đọc lại bản sao lưu.');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',b)),sha=[...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
 operation.guard(token);backup={key,bytes:b,name:'flash-backup-'+Date.now()+'.bin',sha};backupDevice=null;
 setupStatus('Đã đọc xong bản sao lưu trong '+((Date.now()-started)/1000).toFixed(1)+' giây; đang tạo file sao lưu.');
 download(b,backup.name);
 setupStatus('Đã sao lưu xong. Kiểm tra file trong thư mục tải về và giữ lại để phục hồi khi cần.');
}
async function install(force=false){
 await probe();
 if(cap[8])throw Error('Lần cài trước chưa hoàn tất. Hãy kết nối lại rồi mở Trợ giúp cài đặt → Thử lại lần cài bị ngắt.');
 if(!force&&cap[7]&&await fontMatches()){if(noDataSetup())await request(10);setupStatus('Dữ liệu đã sẵn sàng. Không cần cài lại; đồng hồ có thể sử dụng ngay.');return;}
 let existing=null;if(cap[7]){const base=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true);existing=await read(base+16,512);}
 const installKey=deviceKey(),installedBase=cap[7]?bankAddress():null;let blank=false;
 if(noDataSetup()&&!cap[7]){
  setupStatus('Đang kiểm tra vùng cài dữ liệu…');
  const r=await request(11);if(r.length!==7||r[6]>1)throw Error('Không xác nhận được vùng cài dữ liệu.');blank=r[6]===1;
  if(blank)setupStatus('Vùng dữ liệu đang trống. Đang chuẩn bị cài đặt đồng hồ.');
 }
 await probe();
 if(installKey!==deviceKey())throw Error('Thiết bị đã thay đổi. Kết nối lại đúng đồng hồ rồi cài dữ liệu.');
 if(!force&&cap[7]&&await fontMatches()){if(noDataSetup())await request(10);setupStatus('Dữ liệu đã sẵn sàng. Không cần cài lại.');return;}
 if(existing){if(!cap[7]||bankAddress()!==installedBase||crc32(await read(installedBase+16,512))!==crc32(existing))throw Error('Dữ liệu đã thay đổi. Chưa ghi dữ liệu mới.');}
 else if(cap[7])throw Error('Đồng hồ đã có dữ liệu mới. Bấm cài đặt lại để kiểm tra trước.');
 if(blank){const r=await request(11);if(r.length!==7||r[6]!==1)throw Error('Vùng dữ liệu đã thay đổi. Chưa ghi dữ liệu mới.');}
 const bytes=Uint8Array.from(defaultBytes);if(existing)bytes.set(existing);
 const installStarted=Date.now();
 setupStatus('Đang cài đặt đồng hồ. Không tháo pin hoặc dùng mục khác.');
 await uploadBytes(bytes);const writeSeconds=(Date.now()-installStarted)/1000,verifyStarted=Date.now();
 setupStatus('Đã truyền xong; đang kiểm tra dữ liệu…');await verifyInstalled(bytes);
 const verifySeconds=(Date.now()-verifyStarted)/1000;
 setupStatus('Kiểm tra dữ liệu mất '+verifySeconds.toFixed(1)+' giây.');
 await loadConfig();
 if(noDataSetup()){await request(10);setupStatus('Cài dữ liệu hoàn tất. Đồng hồ đang mở giao diện bình thường; bạn có thể cài giờ và sử dụng.');}
 else setupStatus('Dữ liệu tiếng Việt đã sẵn sàng. Bạn có thể mở Việc cần làm hoặc Bộ đếm ngược để nhập nội dung.');
}
$('vn-check').onclick=()=>action(loadConfig);
$('vn-go-setup').onclick=()=>navigate('tab-dfu');
$('vn-go-connect').onclick=()=>navigate('tab-settings');
/* Task navigation stays in its own tab. */
$('vn-setup-check').onclick=()=>action(async()=>{await probe();if(cap[8])throw Error('Có lần cài đặt chưa hoàn tất. Mở Trợ giúp cài đặt để thử lại.');setupStatus(!cap[7]?'Chưa cài đặt. Bấm Cài đặt đồng hồ để bắt đầu.':eventSupport()&&!await bundleMatches(clockBundle())?'Có dữ liệu mới. Bấm Cài đặt đồng hồ để cập nhật.':'Dữ liệu đã sẵn sàng. Bạn có thể sử dụng đồng hồ.');},true);
$('vn-install').onclick=()=>action(()=>installUnified(false),true);
function recoverySupported(){return (resourceProfile()===0x21&&[219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))||(resourceProfile()===0x29&&[221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion));}
async function recoverClock(){
 connection();
 if(!recoverySupported())throw Error('Đồng hồ cần bản phần mềm có hỗ trợ khôi phục. Bấm Kiểm tra bản cập nhật trước.');
 const key=deviceKey(),token=operation.current();
 const same=()=>{operation.guard(token);if(deviceKey()!==key)throw Error('Thiết bị đã đổi. Chưa cài dữ liệu.');};
 setupStatus('Đang khôi phục kết nối bộ nhớ. Chưa ghi hoặc xóa dữ liệu. Giữ pin và kết nối ổn định.');
 const r=await request(15);same();
 if(r.length!==12||r[6]!==1||r[7]>1||r[8]>1||r[9]>1||r[11]!==1)throw Error('Chưa nhận đủ kết quả khôi phục. Kết nối lại rồi thử lại.');
 if(!r[7]||!r[9]||r[10]===255)throw Error('Chưa liên lạc ổn định với bộ nhớ. Chưa xóa dữ liệu. Kiểm tra pin và tiếp điểm; nếu vẫn lỗi, gửi nhật ký cho nơi bán.');
 if(r[10]&1)throw Error('Bộ nhớ vẫn đang bận. Chưa xóa dữ liệu. Chờ rồi thử lại.');
 await probe();same();
 // A valid legacy font bank is not necessarily enough to draw this firmware.
 const complete=cap[7]&&await bundleMatches(clockBundle());same();
 if(r[8]&&complete){
  await request(10);same();await loadConfig();same();
  setupStatus('Đã khôi phục và mở lại đồng hồ. Không phải cài lại dữ liệu; ảnh và nội dung đã lưu được giữ nguyên. Hãy cài giờ hiện tại nếu vừa thay pin.');return;
 }
 if(r[10]&0xfc)throw Error('Bộ nhớ đang có bảo vệ ghi. Chưa thay đổi dữ liệu hoặc tự gỡ bảo vệ. Gửi nhật ký cho nơi bán.');
 setupStatus('Đã liên lạc được với bộ nhớ, nhưng tài nguyên chưa đầy đủ hoặc chưa phù hợp. Web sẽ hỏi trước khi cập nhật dữ liệu.');
 await installUnified(false);same();
}
$('vn-flash-recover').onclick=async()=>{
 if(work||window.EpdDfuBusy?.()||window.EpdAutoUpdate?.busy?.()||window.countdownOperationBusy||window.EpdDesigner?.busy||(typeof clockImageUploadBusy!=='undefined'&&clockImageUploadBusy))return;
 try{
  connection();
  if(!recoverySupported()){
   setupStatus('Đồng hồ cần cập nhật phần mềm để có chức năng khôi phục. Đang kiểm tra gói phù hợp; chưa xóa dữ liệu.');
   await window.EpdAutoUpdate?.prepare();return;
  }
  await runWork(recoverClock,null,true);
 }catch(e){setupStatus('Chưa khôi phục được: '+e.message);}
};

$('vn-recover').onclick=()=>action(async()=>{
 connection();const key=deviceKey();
 if(!confirm('Hủy phiên cài dữ liệu chưa hoàn tất và thử cài lại trên đồng hồ đang kết nối? Bản dữ liệu đã lưu thành công trước đó không bị xóa. Giữ kết nối và nguồn ổn định.'))return;
 await probe();
 if(key!==deviceKey())throw Error('Đã đổi thiết bị. Dừng phục hồi và kết nối đúng đồng hồ.');
 if(cap[8]){
  setupStatus('Đang hủy phiên cài chưa hoàn tất…');
  await request(5);await probe();
  if(key!==deviceKey())throw Error('Đã đổi thiết bị. Dừng phục hồi và kết nối đúng đồng hồ.');
  if(cap[8])throw Error('Chưa hủy được phiên cũ. Kết nối lại rồi thử phục hồi lần nữa.');
 }
 // A commit may have succeeded even when its notification was lost.
 await installUnified(false);
},true);
$('vn-reinstall').onclick=()=>action(async()=>{
 if(!confirm('Cài lại dữ liệu tiếng Việt? Nội dung đang lưu được giữ lại. Không tháo pin trong khi cài.'))return;
 await installUnified(true);
},true);
$('vn-save').onclick=()=>action(async()=>{const mode=todoMode(),bytes=draft();await probe();
 requireReady();
 if(!confirm('Lưu danh sách vào đồng hồ? Giữ kết nối cho đến khi có thông báo hoàn tất.'))return;
 status('Đang lưu; không dùng mục khác hoặc tháo pin.');let began=false;
 try {began=true;await uploadConfig(bytes,true);began=false;await loadConfig();await sendNrf52Mode(mode);status(mode===16?'Đã lưu và mở danh sách toàn màn hình.':mode===11?(nrf52FirmwareVersion===268?'Đã lưu và mở công việc và lịch tháng.':'Đã lưu và mở lịch cá nhân.'):'Đã lưu danh sách bên cạnh đồng hồ.');
 }catch(e){if(began)status('Chưa hoàn tất. Bản đã lưu trước vẫn được giữ; kết nối lại để đọc trạng thái.');throw e;}
});
$('vn-face2').onclick=()=>action(async()=>{const mode=todoMode();await probe();requireReady();await sendNrf52Mode(mode);status(mode===16?'Đã mở danh sách toàn màn hình.':mode===11?'Đã mở công việc và lịch tháng.':'Đã mở giao diện bên cạnh đồng hồ.');});
$('vn-controls').addEventListener('input',render);
function ownControls(target){return document.getElementById('quick-app')?.contains(target)||document.getElementById('clock-image-recovery')?.contains(target)||$('vn-controls').contains(target)||$('vn-setup-controls').contains(target)||document.getElementById('photo-album-controls')?.contains(target)||document.getElementById('clock-album-controls')?.contains(target)||document.getElementById('calendar213-controls')?.contains(target)||document.getElementById('date-mark-controls')?.contains(target)||document.getElementById('daily-quote-controls')?.contains(target);}
document.addEventListener('click',e=>{if(work&&!ownControls(e.target)){e.preventDefault();e.stopImmediatePropagation();(setupWork?setupStatus:status)('Đang truyền dữ liệu. Chờ hoàn tất trước khi dùng mục khác.');}},true);
document.addEventListener('change',e=>{if(work&&!ownControls(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);
window.VNDataBusy=()=>work;
window.VNCountdownSupport=()=>!!resourceProfile();
// Promise API for the separate provisioning UI. Keep the original bank/CRC logic.
window.DHResourceSetup=async(onProgress)=>runWork(async()=>{
 connection();
 const key=deviceKey(),channel=connection(),token=operation.current();
 const guard=()=>{operation.guard(token);if(deviceKey()!==key||connection()!==channel)throw Error('Kết nối đã thay đổi. Chưa xác nhận hoàn tất.');};
 await probe({readiness:true});guard();
 if(cap[8]){
  if(!confirm('Lần cài trước chưa hoàn tất. Dừng phiên truyền cũ và thử cài lại tài nguyên?'))throw Error('Đã hủy cài lại tài nguyên.');
  await request(5);await probe({readiness:true});guard();
  if(cap[8])throw Error('Chưa dừng được phiên truyền cũ. Hãy kết nối lại.');
 }
 await installUnified(false);guard();
 await probe({language:false,readiness:true});guard();
 if(!cap[7]||cap[8]||!(eventSupport()?await bundleMatches(clockBundle()):await fontMatches())){
  throw Error('Chưa xác nhận được bộ tài nguyên đã lưu. Không báo hoàn tất.');
 }
 guard();
 setupStatus('Đã kiểm tra tài nguyên đã lưu trên đồng hồ.');
 return {verified:true,profile:resourceProfile()};
},onProgress,true);

window.VNTransport={
 request,probe,probeBasic:()=>probe({language:false,readiness:true}),read,verify:verifyRange,key:deviceKey,crc32,recoverClock,recoverySupported,
 languageSupported,language:()=>languageSupported()?resourceLanguage:0,
 wait:operation.wait,
 async facesReady(options={}){await probe(options);return !!cap[7]&&!cap[8]&&await bundleMatches(clockBundle());},
 busy:()=>work,cancel:()=>operation.cancel(),current:operation.current,guard:operation.guard,
 writeCalendarConfig:bytes=>uploadConfig(bytes,true,false),
 run:runWork,
 async ensureBackup(){
  if(backupDevice===deviceKey())return true;
  if(!backup||backup.key!==deviceKey()){
   if(!confirm('Đọc sao lưu toàn bộ 512 KB trước khi lưu ảnh? Bước này chưa ghi/xóa dữ liệu.'))return false;
   await makeBackup();
  }else download(backup.bytes,backup.name);
  if(!confirm('Bạn đã lưu file '+backup.name+' (512 KB) trên máy chưa? Chọn Hủy nếu chưa tải được file.'))return false;
  backupDevice=deviceKey();return true;
 }
};
window.startVNCountdown=async(date,title)=>{
 if(work||window.countdownOperationBusy||window.EpdDfuBusy?.()||window.EpdDesigner?.busy)return;
 try {await runWork(async()=>{
  await probe();requireReady();
  title=title.trim().normalize('NFC');const utf=enc.encode(title);
  if([...title].length>24||utf.length>72||width(title,0)>titleWidth())throw Error('Tiêu đề quá dài; tối đa 24 ký tự và phải vừa một dòng.');
  for(const c of title)if(!fonts[0].has(c.codePointAt(0)))throw Error('Chưa hỗ trợ ký tự: '+c);
  const base=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true);
  const config=await read(base+16,512),bytes=Uint8Array.from(defaultBytes);bytes.set(config);bytes.fill(0,4,78);bytes[3]=utf.length;bytes.set(utf,4);
  window.updateCountdownStatus?.('Đang lưu tiêu đề tiếng Việt vào đồng hồ…');
  await uploadConfig(bytes,true);$('vn-title').value=title;
  /* Only the legacy date configuration is sent through D6. Vietnamese UTF-8
     stays in the verified external bank; never truncate Unicode into ASCII. */
  const request=Uint8Array.of(0xd6,0,date.getFullYear()&255,date.getFullYear()>>8,date.getMonth()+1,date.getDate(),0);
  await window.startNrf52Countdown(request);
 });}catch(e){window.updateCountdownStatus?.(e.message,true);status(e.message);if(typeof addLog==='function')addLog('Đếm ngược tiếng Việt: '+e.message);}
};
function eventSupport(){const p=resourceProfile();return (p===0x21&&[151,152,153,154,155,156,159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))||(p===0x29&&[157,158,167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion));}
function clockBundle(){
 if([285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))return DailyQuotes.defaults(window.BoldPortraitBundles[resourceProfile()][resourceLanguage]);
 if([283,284,287,288,291,292].includes(nrf52FirmwareVersion))return DailyQuotes.defaults(window.Portrait290WideBundles[resourceLanguage]);
 if([279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)){const b=window.FourPortraitCalendarBundles?.[resourceProfile()]?.[resourceLanguage];if(!b)throw Error("Thiếu dữ liệu đồng hồ. Hãy tải lại trang.");return window.DailyQuotes.defaults(Uint8Array.from(b));}

 if(nrf52FirmwareVersion===278&&resourceProfile()===33){const b=window.PortraitInnerBorderBundles?.[33]?.[resourceLanguage];if(!b)throw Error("Thiếu dữ liệu đồng hồ. Hãy tải lại trang.");return window.DailyQuotes.defaults(Uint8Array.from(b));}

 if(nrf52FirmwareVersion===276&&resourceProfile()===33){const b=window.PortraitReferenceBundles?.[33]?.[resourceLanguage];if(!b)throw Error("Thiếu dữ liệu đồng hồ. Hãy tải lại trang.");return window.DailyQuotes.defaults(Uint8Array.from(b));}

 if(nrf52FirmwareVersion===274&&resourceProfile()===33){const b=window.PortraitCalendarBundles?.[33]?.[resourceLanguage];if(!b)throw Error("Thiếu dữ liệu đồng hồ. Hãy tải lại trang.");return window.DailyQuotes.defaults(Uint8Array.from(b));}

 if([270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&resourceProfile()===33){const b=window.BigClockPortraitBundles?.[33]?.[resourceLanguage];if(!b)throw Error("Thiếu dữ liệu đồng hồ. Hãy tải lại trang.");return window.DailyQuotes.defaults(Uint8Array.from(b));}

 if(nrf52FirmwareVersion===268&&resourceProfile()===33){const b=window.ReminderPortraitBundles?.[33]?.[resourceLanguage];if(!b)throw Error("Thiếu dữ liệu đồng hồ. Hãy tải lại trang.");return window.DailyQuotes.defaults(Uint8Array.from(b));}

 if(nrf52FirmwareVersion===266&&resourceProfile()===33){const b=window.PersonalClockBundles?.[33]?.[resourceLanguage];if(!b)throw Error("Thiếu dữ liệu đồng hồ. Hãy tải lại trang.");return window.DailyQuotes.defaults(Uint8Array.from(b));}

 if(nrf52FirmwareVersion===264&&resourceProfile()===33){
  const b=window.PortraitClockBundles?.[33]?.[resourceLanguage];
  if(!b)throw Error('Thiếu bộ dữ liệu đồng hồ. Hãy tải lại trang.');
  return window.DailyQuotes.defaults(Uint8Array.from(b));
 }

 if([262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)){
  const b=window.CartoonClockBundles?.[resourceProfile()]?.[resourceLanguage];
  if(!b)throw Error('Thiếu bộ dữ liệu đồng hồ. Hãy tải lại trang.');
  return window.DailyQuotes.defaults(Uint8Array.from(b));
 }

 if([256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)){
  const b=window.RoundedClockBundles?.[resourceProfile()]?.[resourceLanguage];
  if(!b)throw Error('Thiếu bộ dữ liệu đồng hồ. Hãy tải lại trang.');
  return window.DailyQuotes.defaults(Uint8Array.from(b));
 }

 if([246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)){
  const b=window.ArtClockBundles?.[resourceProfile()]?.[resourceLanguage];
  if(!b)throw Error('Thiếu bộ dữ liệu đồng hồ. Hãy tải lại trang.');
  return window.DailyQuotes.defaults(Uint8Array.from(b));
 }
 if(languageSupported()){const b=(resourceProfile()===0x29?window.ClockLanguage290Bundles:window.ClockLanguageBundles)?.[resourceLanguage];if(!b)throw Error('Thiếu bộ dữ liệu ngôn ngữ. Hãy tải lại trang.');return window.DailyQuotes.defaults(Uint8Array.from(b));}
 const modern=resourceProfile()===0x21&&[159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion);
 const b=Uint8Array.from(([213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.CalendarMonth213Bytes:[215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.CalendarMonth290Bytes:[205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Outline213Bytes:[207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Outline290Bytes:[205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Serif213Bytes:[207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Serif290Bytes:resourceProfile()===0x21&&[193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Face1Retro213Bytes:resourceProfile()===0x29&&[195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Face1Retro290Bytes:resourceProfile()===0x21&&[181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Face6White213Bytes:resourceProfile()===0x29&&[183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Face6White290Bytes:resourceProfile()===0x29&&[183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Face6Clock290Bytes:resourceProfile()===0x21&&[179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Face6DarkTopBytes:resourceProfile()===0x21&&[178,179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Face6FlipBytes:resourceProfile()===0x29&&[172,173,176,177,183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?window.Sans290Bold42Bytes:resourceProfile()===0x29&&[170,171].includes(nrf52FirmwareVersion)?window.Sans290ClassicBytes:resourceProfile()===0x29&&[167,168].includes(nrf52FirmwareVersion)?window.Sans290Bytes:[165,166,174,175,178,179,180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&resourceProfile()===0x21?window.Face4SansBytes:[163,164].includes(nrf52FirmwareVersion)&&resourceProfile()===0x21?window.Face23SansBytes:[161,162].includes(nrf52FirmwareVersion)&&resourceProfile()===0x21?window.Face5SansBytes:modern?window.Face5ClockBytes:resourceProfile()===0x29?window.EventClock290Bytes:window.EventClockBytes)||[]),prefix=defaultBytes.length;
 if(b.length<prefix+8||b.length>([213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,242,243,244,241,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?65520:61440))throw Error('Bộ cài đặt chưa đầy đủ. Hãy tải lại trang.');
 const v=new DataView(b.buffer);let at=prefix;
 if(crc32(b.subarray(512,prefix))!==crc32(defaultBytes.subarray(512)))throw Error('Bộ dữ liệu hiển thị chưa khớp. Hãy tải lại trang rồi thử Cài đặt đồng hồ.');
 if(modern||(resourceProfile()===0x29&&[167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)))for(let slot=2;slot<(modern?4:[183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?8:7);slot++){
  if(at+16>b.length||v.getUint8(at)!==slot)throw Error('Bộ dữ liệu giao diện chưa đầy đủ. Hãy tải lại trang rồi cài đặt lại đồng hồ.');
  const bytes=v.getUint32(at+4,true);if(bytes<16||bytes>b.length-at)throw Error('Bộ dữ liệu giao diện chưa hợp lệ. Hãy tải lại trang rồi cài đặt lại đồng hồ.');at+=bytes;
 }
 if(at+8>b.length)throw Error('Thiếu dữ liệu sự kiện.');const count=v.getUint16(at+4,true);
 if(v.getUint32(at,true)!==0x314e5645||v.getUint16(at+6,true)!==80||!count||count>256||b.length!==at+8+count*80)throw Error('Bộ cài đặt không hợp lệ. Chưa gửi dữ liệu.');
 return window.DailyQuotes?.supported()?window.DailyQuotes.defaults(b):b;
}
function bankAddress(){const a=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true);if(a!==0x60000&&a!==0x70000)throw Error('Chưa xác nhận được vùng dữ liệu của đồng hồ.');return a;}
function marksTail(bytes){
 if(!((resourceProfile()===0x21&&[180,181,182,185,186,189,190,193,194,197,198,199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))||(resourceProfile()===0x29&&[183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)))||bytes.length<256)return null;
 const tail=bytes.slice(-256),v=new DataView(tail.buffer);return v.getUint32(0,true)===0x314b4d44&&tail[4]===1&&tail[5]<=3?tail:null;
}
async function bundleMatches(bytes){
 if(!cap[7])return false;const base=bankAddress(),h=await read(base,16),v=new DataView(h.buffer);
 if(window.DailyQuotes?.supported()){
  const size=v.getUint32(8,true),prefix=window.DailyQuotes.locate(bytes).prefix;
  if(v.getUint32(0,true)!==0x31544e56||size<prefix+16||size>([213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,242,243,244,241,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?65520:61440))return false;
  const q=await request(14);if(q.length!==10||!new DataView(q.buffer,q.byteOffset).getUint32(6,true))return false;
  const n=prefix-512,r=await request(8,[...u32(base+528),n&255,n>>8]);
  return r.length===10&&new DataView(r.buffer,r.byteOffset).getUint32(6,true)===crc32(bytes.subarray(512,prefix));
 }
 const size=v.getUint32(8,true);if(v.getUint32(0,true)!==0x31544e56||(size!==bytes.length&&!([180,181,182,185,186,189,190,193,194,183,184,187,188,191,192,195,196,197,198,199,200,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,242,243,244,241,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)&&size===bytes.length+256)))return false;
 if(size!==bytes.length&&!marksTail(await read(base+16+size-256,256)))return false;
 const expected=crc32(bytes.subarray(512));
 if(cap[6]>=3){const n=bytes.length-512,r=await request(8,[...u32(base+528),n&255,n>>8]);if(r.length!==10)throw Error('Chưa nhận đủ kết quả kiểm tra.');return new DataView(r.buffer,r.byteOffset).getUint32(6,true)===expected;}
 return crc32(await read(base+528,bytes.length-512))===expected;
}
async function installUnified(force=false){
 connection();if(!eventSupport())return install(force);
 await probe();if(cap[8])throw Error('Có lần cài đặt chưa hoàn tất. Mở phần Trợ giúp cài đặt để thử lại.');
 let bytes=clockBundle();const key=deviceKey();
 if(!force&&await bundleMatches(bytes)){await request(10);setupStatus('Đồng hồ đã có đầy đủ dữ liệu mới nhất. Bạn có thể sử dụng ngay.');return;}
 let old=null,base=0,header=null,blank=false;
 if(cap[7]){
  base=bankAddress();header=await read(base,16);const v=new DataView(header.buffer),size=v.getUint32(8,true);
  if(v.getUint32(0,true)!==0x31544e56||size<544||size>([213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,242,243,244,241,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?65520:61440))throw Error('Dữ liệu cũ chưa hợp lệ. Chưa ghi dữ liệu mới.');
  setupStatus('Đang giữ lại nội dung cá nhân trên đồng hồ…');old=await read(base+16,size);
  if(crc32(old)!==v.getUint32(12,true)||deviceKey()!==key)throw Error('Chưa kiểm tra được dữ liệu cũ. Chưa ghi dữ liệu mới.');
 }else{
  const r=await request(11);if(r.length!==7||r[6]>1)throw Error('Chưa xác nhận được vùng cài đặt.');blank=r[6]===1;

 }
 await probe();if(key!==deviceKey()||cap[8])throw Error('Kết nối hoặc trạng thái đã thay đổi. Hãy kiểm tra rồi thử lại.');
 if(old){if(!cap[7]||bankAddress()!==base||crc32(await read(base,16))!==crc32(header))throw Error('Dữ liệu đã thay đổi. Chưa ghi bản mới.');bytes.set(old.subarray(0,512));if(window.DailyQuotes?.supported())bytes=window.DailyQuotes.rebase(bytes,old);const tail=marksTail(old);if(tail){const merged=new Uint8Array(bytes.length+256);merged.set(bytes);merged.set(tail,bytes.length);bytes=merged;}}
 else if(cap[7])throw Error('Đồng hồ đã có dữ liệu mới. Bấm cài đặt lại để kiểm tra trước.');
 else if(blank){const r=await request(11);if(r.length!==7||r[6]!==1)throw Error('Vùng cài đặt đã thay đổi. Chưa ghi dữ liệu.');}
 setupStatus('Đang cài chữ tiếng Việt, giao diện và các ngày nhắc. Không ngắt kết nối.');
 await uploadBytes(bytes);setupStatus('Đang kiểm tra dữ liệu đã cài…');await verifyInstalled(bytes);await request(10);await loadConfig();
 setupStatus('Cài đặt hoàn tất. Hãy cài giờ hiện tại rồi chọn kiểu đồng hồ bạn muốn xem.');
}


function languageStatus(text){$('clock-language-status').textContent=text;}
function languageProgress(phase,value=0){
 languagePhase=phase;const wrap=$('clock-language-progress-wrap'),bar=$('clock-language-progress'),detail=$('clock-language-progress-detail');
 wrap.hidden=false;wrap.setAttribute('aria-busy',String(!['done','error'].includes(phase)));
 if(phase==='prepare'||phase==='verify')bar.removeAttribute('value');
 else bar.value=phase==='done'?100:phase==='error'?0:Math.max(0,Math.min(100,value));
 detail.textContent=phase==='write'?'Đang tải lên đồng hồ: '+Math.floor(bar.value)+'%':({prepare:'Đang chuẩn bị dữ liệu…',verify:'Đang kiểm tra và hoàn tất…',done:'Hoàn tất: 100%',error:'Chưa hoàn tất. Hãy kiểm tra thông báo bên dưới.'})[phase];
}
function languageControls(){
 const supported=languageSupported()&&!!gattServer?.connected;$('clock-language-panel').hidden=!supported;
 if(supported&&!work){$('clock-language-apply').disabled=false;$('clock-language-read').disabled=false;}
}
$('clock-language-read').onclick=()=>action(async()=>{if(!languageSupported())throw Error('Đồng hồ này chưa hỗ trợ chuyển ngôn ngữ.');await probe();$('clock-language-select').value=String(resourceLanguage);languageStatus('Đang dùng / Current: '+(resourceLanguage?'English':'Tiếng Việt'));languageControls();},true);
$('clock-language-apply').onclick=()=>action(async()=>{
 if(!languageSupported())throw Error('Đồng hồ này chưa hỗ trợ chuyển ngôn ngữ.');
 const selected=Number($('clock-language-select').value);if(![0,1].includes(selected))throw Error('Ngôn ngữ chưa hợp lệ.');
 const key=deviceKey();languageTask=true;languageProgress('prepare');languageStatus('Đang cập nhật / Updating. Không ngắt kết nối.');
 try {
  await probe();if(cap[8])throw Error('Có lần truyền chưa hoàn tất. Hãy dừng truyền trước.');
  resourceLanguage=selected;languageOverride=selected;
  await installUnified(false);if(key!==deviceKey())throw Error('Thiết bị đã đổi.');languageOverride=null;await probe();if(resourceLanguage!==selected)throw Error('Đã hủy hoặc chưa xác nhận ngôn ngữ mới.');
  languageTask=false;languageProgress('done');languageStatus('Đã áp dụng / Applied: '+(selected?'English':'Tiếng Việt')+'. Nội dung cá nhân được giữ nguyên.');
 }
 catch(e){languageTask=false;languageProgress('error');languageStatus('Chưa hoàn tất / Not applied: '+e.message);throw e;}
 finally {languageTask=false;languageOverride=null;try{await probe();$('clock-language-select').value=String(resourceLanguage);}catch(_){}languageControls();}
},true);
setInterval(languageControls,1000);languageControls();
window.VNTrial={width,draw,crc32,draft,fonts,request,unpackRead,resourceProfile,fullTodoSupported,todoMode,todoWidth};setInterval(todoLayout,1000);render();
})();
