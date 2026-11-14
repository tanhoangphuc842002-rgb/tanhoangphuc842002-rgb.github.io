
/* Price-tag composer. The web renders pixels; no new firmware or flash schema. */
(function(root){
'use strict';
const RED='#ff0000',BLACK='#000000',WHITE='#ffffff',MAX_PRODUCTS=100;
const SIZES={213:{width:250,height:122,transportHeight:128},290:{width:296,height:128,transportHeight:128}};
const SAMPLES={
 parking:{template:'parking',phone:'090 123 4567',message:'Xin gọi khi cần di chuyển xe',numberColor:'black'},
 basic:{template:'basic',name:'CÀ PHÊ SỮA HÒA TAN',price:'59000',unit:'hộp',customUnit:'',spec:'Hộp 20 gói × 16 g',origin:'',oldPrice:'',sku:'CF020',barcode:'2000000000015'},
 promo:{template:'promo',name:'BÁNH QUY BƠ',price:'39000',unit:'gói',customUnit:'',spec:'Gói 312 g',origin:'',oldPrice:'49000',sku:'BQ312',barcode:''},
 weight:{template:'weight',name:'CAM SÀNH',price:'29000',unit:'kg',customUnit:'',spec:'Loại 1',origin:'Việt Nam',oldPrice:'',sku:'CS001',barcode:''}
};
const clean=s=>String(s??'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const money=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
function parseMoney(value,optional=false){
 const s=String(value??'').trim();if(!s&&optional)return null;
 if(!/^\d+$/.test(s)&&!/^\d{1,3}(?:[. ]\d{3})+$/.test(s))throw Error('Nhập giá bằng số nguyên, ví dụ 59000 hoặc 59.000.');
 const n=Number(s.replace(/[. ]/g,''));if(!Number.isSafeInteger(n)||n<0||n>9999999999)throw Error('Giá bán từ 0 đến 9.999.999.999đ.');return n;
}
function ean13(value){
 let s=String(value??'').trim();if(!s)return '';
 if(!/^\d{12,13}$/.test(s))throw Error('Mã vạch cần 12 hoặc 13 chữ số EAN-13.');
 const twelve=s.slice(0,12);let sum=0;for(let i=0;i<12;i++)sum+=Number(twelve[i])*(i%2?3:1);
 const check=String((10-sum%10)%10);
 if(s.length===13&&s[12]!==check)throw Error('Số kiểm tra của mã vạch chưa đúng. Hãy kiểm tra lại mã sản phẩm.');
 return twelve+check;
}
function normalize(input){
 if(input.template==='parking'){
  const phone=clean(input.phone),message=clean(input.message);
  const digits=phone.replace(/\D/g,'');
  if(!/^\+?[\d .()-]+$/.test(phone)||digits.length<9||digits.length>15||phone.length>24)throw Error('Nhập số điện thoại hợp lệ, từ 9 đến 15 chữ số.');
  if([...message].length>60)throw Error('Lời nhắn tối đa 60 ký tự.');
  if(input.numberColor&&!['black','red'].includes(input.numberColor))throw Error('Chọn màu số điện thoại hợp lệ.');
  return {template:'parking',phone,message,numberColor:input.numberColor||'black',name:'Đỗ xe · '+phone};
 }
 const d={};d.template=['basic','promo','weight'].includes(input.template)?input.template:'basic';
 for(const key of ['name','unit','customUnit','spec','origin','sku'])d[key]=clean(input[key]);
 for(const [key,max]of [['name',60],['spec',48],['origin',32],['sku',20],['customUnit',12]])if([...d[key]].length>max)throw Error('Nội dung quá dài. Hãy rút ngắn thông tin sản phẩm.');
 if(!d.name)throw Error('Nhập tên sản phẩm trước khi gửi hoặc lưu.');
 d.price=parseMoney(input.price);d.oldPrice=d.template==='promo'?parseMoney(input.oldPrice,true):null;
 if(d.oldPrice!==null&&d.oldPrice<=d.price)throw Error('Giá cũ phải lớn hơn giá bán.');
 if(!['hộp','gói','chai','cái','kg','túi','bộ','khác'].includes(d.unit))throw Error('Chọn đơn vị bán hợp lệ.');
 if(d.unit==='khác'&&!d.customUnit)throw Error('Nhập đơn vị bán của sản phẩm.');
 d.displayUnit=d.unit==='khác'?d.customUnit:d.unit;d.barcode=ean13(input.barcode);return d;
}
const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const PARITY=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
function barcodeBits(code){
 const s=ean13(code);if(!s)return '';let b='101';const p=PARITY[Number(s[0])];
 for(let i=1;i<=6;i++)b+=(p[i-1]==='L'?L:G)[Number(s[i])];b+='01010';
 for(let i=7;i<13;i++)b+=L[Number(s[i])].replace(/[01]/g,c=>c==='1'?'0':'1');return b+'101';
}
function font(ctx,size,bold=true){ctx.font=(bold?'700 ':'400 ')+size+'px Arial, sans-serif';}
function line(ctx,text,x,y,width,size=10,min=8,color=BLACK,bold=true,align='left'){
 let n=size;for(;n>=min;n-=.5){font(ctx,n,bold);if(ctx.measureText(text).width<=width)break;}
 if(n<min)throw Error('Thông tin chưa vừa màn hình. Hãy rút ngắn nội dung.');
 ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,align==='right'?x+width:align==='center'?x+width/2:x,y);ctx.textAlign='left';return n;
}
function title(ctx,text,x,y,width,big,step=14){
 for(let size=big;size>=9;size-=.5){
  font(ctx,size);let lines=[''];
  for(const word of text.split(' ')){
   const at=lines.length-1,candidate=lines[at]?(lines[at]+' '+word):word;
   if(ctx.measureText(candidate).width<=width)lines[at]=candidate;else if(!lines[at]||lines.length>=2){lines=null;break;}else lines.push(word);
  }
  if(!lines||lines.some(s=>ctx.measureText(s).width>width))continue;
  ctx.fillStyle=BLACK;for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],x,y+i*step);return lines.length;
 }
 throw Error('Tên sản phẩm chưa vừa hai dòng. Hãy viết ngắn hơn.');
}
function drawBarcode(ctx,code,x,y,width,height){
 const bits=barcodeBits(code);if(!bits)return;
 // Integer module width and proper quiet zones; no stretching or antialiasing.
 const module=Math.floor(width/113);if(module<1)throw Error('Vùng mã vạch chưa đủ rộng.');
 const left=x+Math.floor((width-113*module)/2)+11*module;ctx.fillStyle=BLACK;
 for(let i=0;i<bits.length;i++)if(bits[i]==='1')ctx.fillRect(left+i*module,y,module,height);
 line(ctx,code,x,y+height+8,width,7,7,BLACK,false,'center');
}
function quantize(ctx,w,h){
 const im=ctx.getImageData(0,0,w,h),a=im.data;
 for(let i=0;i<a.length;i+=4){const red=a[i]>120&&a[i]>a[i+1]*1.5&&a[i]>a[i+2]*1.5;const black=!red&&(a[i]*.299+a[i+1]*.587+a[i+2]*.114)<160;
  a[i]=red||!black?255:0;a[i+1]=a[i+2]=red||black?0:255;a[i+3]=255;
 }ctx.putImageData(im,0,0);
}
function renderParking(ctx,d,w,h){
 ctx.strokeStyle=BLACK;ctx.lineWidth=1;
 ctx.beginPath();ctx.roundRect(3.5,3.5,w-7,h-7,7);ctx.stroke();
 const redNumber=d.numberColor==='red';
 if(!redNumber){ctx.fillStyle=RED;ctx.beginPath();ctx.roundRect(7,7,w-14,27,4);ctx.fill();}
 line(ctx,'ĐỖ XE TẠM THỜI',10,26,w-20,18,16,redNumber?BLACK:WHITE,true,'center');
 // Ten-digit local mobile numbers remain readable whether typed with spaces or not.
 let phone=d.phone;
 if(/^\d{10}$/.test(phone))phone=phone.slice(0,3)+' '+phone.slice(3,6)+' '+phone.slice(6);
 line(ctx,phone,11,h===128?83:79,w-22,w===296?46:39,18,redNumber?RED:BLACK,true,'center');
 if(redNumber){ctx.fillStyle=BLACK;ctx.fillRect(13,h-38,w-26,1);}
 if(d.message){
  let rows=null,usedSize=12;
  for(let size=12;size>=10;size-=.5){
   font(ctx,size);let candidate=[''];
   for(const word of d.message.split(' ')){
    const at=candidate.length-1,next=candidate[at]?candidate[at]+' '+word:word;
    if(ctx.measureText(next).width<=w-26)candidate[at]=next;
    else if(candidate[at]&&candidate.length<2&&ctx.measureText(word).width<=w-26)candidate.push(word);
    else{candidate=null;break;}
   }
   if(candidate){rows=candidate;usedSize=size;break;}
  }
  if(!rows)throw Error('Lời nhắn chưa vừa hai dòng. Hãy viết ngắn hơn.');
  rows.forEach((row,i)=>line(ctx,row,13,rows.length===1?h-16:h-23+i*13,w-26,usedSize,usedSize,BLACK,true,'center'));
 }
}

function render(canvas,input,size='213'){
 const d=normalize(input),g=SIZES[size];if(!g)throw Error('Chọn kích thước màn 2.13 hoặc 2.9.');
 canvas.width=g.width;canvas.height=g.height;const ctx=canvas.getContext('2d'),w=g.width,h=g.height,big=size==='290';
 ctx.fillStyle=WHITE;ctx.fillRect(0,0,w,h);
 if(d.template==='parking'){renderParking(ctx,d,w,h);quantize(ctx,w,h);return d;}
 ctx.strokeStyle=BLACK;ctx.lineWidth=1;ctx.strokeRect(.5,.5,w-1,h-1);
 const hasBarcode=!!d.barcode,promo=d.template==='promo',weighted=d.template==='weight';
 if(promo){ctx.fillStyle=RED;ctx.fillRect(4,4,w-8,14);line(ctx,'GIÁ KHUYẾN MÃI',6,14,w-12,10,10,WHITE,true,'center');}
 if(weighted){ctx.fillStyle=RED;ctx.fillRect(5,6,5,24);}
 const titleLines=title(ctx,d.name,weighted?16:8,promo?(big?32:31):17,w-(weighted?24:16),promo?(big?13:12):(big?14:13),promo?(big?14:13):14);
 const detail=weighted&&d.origin?'Xuất xứ: '+d.origin:[d.spec,d.origin?'Xuất xứ: '+d.origin:''].filter(Boolean).join(' · ');
 // Promotion with a barcode needs separate bands for the title, pack size,
 // price, savings and barcode. A second title line consumes the spare space.
 const detailY=promo?(titleLines===1?(big?48:46):(big?58:55)):44;
 if(detail)line(ctx,detail,weighted?16:8,detailY,w-(weighted?24:16),10,8,BLACK,false);
 const unit='đ / '+d.displayUnit; font(ctx,big?11:10);const uw=Math.ceil(ctx.measureText(unit).width)+6;
 const priceY=promo?(hasBarcode?(big?84:81):90):(hasBarcode?79:h-30),priceSize=promo?(hasBarcode?(titleLines===1?(big?36:34):28):39):(hasBarcode?39:(big?47:44));
 const priceX=weighted?13:8;line(ctx,money(d.price),priceX,priceY,w-priceX-uw-12,priceSize,18,promo?BLACK:RED);
 line(ctx,unit,w-uw-6,priceY-1,uw,10,8,BLACK);
 if(promo){
  const y=hasBarcode?(big?95:92):h-12;
  if(d.oldPrice!==null){
   const old=money(d.oldPrice)+'đ',save='Tiết kiệm '+money(d.oldPrice-d.price)+'đ';font(ctx,9);const ow=ctx.measureText(old).width;
   line(ctx,old,8,y,Math.max(ow,65),9,8,BLACK,false);ctx.strokeStyle=BLACK;ctx.beginPath();ctx.moveTo(7,y-3);ctx.lineTo(9+ow,y-3);ctx.stroke();
   line(ctx,save,16+ow,y,w-24-ow,9,8,RED,true,'right');
  }else if(!hasBarcode&&d.sku)line(ctx,'Mã SP: '+d.sku,8,y,w-16,9,8);
 }
 if(hasBarcode){
  const y=promo?(big?101:98):h-29,bh=promo?h-y-13:17,bw=big?159:136;
  drawBarcode(ctx,d.barcode,6,y,bw,bh);
  if(d.sku)line(ctx,'Mã SP: '+d.sku,bw+9,y+Math.min(bh,12),w-bw-17,9,8);
  if(!promo&&d.spec&&weighted)line(ctx,d.spec,bw+9,h-9,w-bw-17,9,8,BLACK,false);
 }else if(!promo){
  ctx.strokeStyle=BLACK;ctx.beginPath();ctx.moveTo(6,h-23.5);ctx.lineTo(w-6,h-23.5);ctx.stroke();
  const left=weighted?[d.spec,'Bán theo '+d.displayUnit].filter(Boolean).join(' · '):d.sku?'Mã SP: '+d.sku:'Đơn vị: '+d.displayUnit;
  line(ctx,left,8,h-9,w-16,9,8,BLACK,false);
 }
 quantize(ctx,w,h);return d;
}
const core={SIZES,SAMPLES,MAX_PRODUCTS,parseMoney,money,ean13,barcodeBits,normalize,render};
if(typeof module!=='undefined'&&module.exports)module.exports=core;
if(!root.document)return;root.PriceTagCore=core;

const $=id=>document.getElementById(id),section=$('tab-price-tags');if(!section)return;
const fields=['name','price','unit','customUnit','spec','origin','oldPrice','sku','barcode','phone','message','numberColor'];
const LIBRARY_KEY='epd-price-products-v1';let selectedId=null,active=null,template='basic',lastState='',lastLang='',framePending=false;
let statusKey='Chọn mẫu rồi nhập thông tin sản phẩm.',statusTail='',libraryError=null;
const tr=s=>root.EpdWebsiteI18n?.translate(s)||s;
const text=(el,s)=>{if(el.textContent!==s)el.textContent=s;};
function say(key,tail=''){statusKey=key;statusTail=tail;text($('price-status'),tr(key)+(tail?' '+tail:''));}
function draft(){const o={template};for(const k of fields)o[k]=$('price-'+k).value;return o;}
function fill(d,id=null){template=d.template||'basic';for(const k of fields)if(Object.hasOwn(d,k)||!['phone','message','numberColor'].includes(k)||template==='parking')$('price-'+k).value=d[k]??(k==='numberColor'?'black':'');selectedId=id;updateForm();scheduleRender();}
function updateForm(){
 const parking=template==='parking';
 for(const el of section.querySelectorAll('[data-price-product]'))el.hidden=parking;
 $('price-parking-fields').hidden=!parking;
 text($('price-form-title'),tr(parking?'Thông tin đỗ xe':'Thông tin sản phẩm'));
 $('price-old-row').hidden=parking||template!=='promo';$('price-custom-row').hidden=parking||$('price-unit').value!=='khác';
 for(const r of document.querySelectorAll('[name="price-template"]')){r.checked=r.value===template;r.closest('label').classList.toggle('selected',r.checked);}
 text($('price-save'),tr(template==='parking'?(selectedId?'Cập nhật thẻ đỗ xe':'Lưu thẻ đỗ xe'):(selectedId?'Cập nhật sản phẩm':'Lưu sản phẩm')));
}
function target(){
 if(typeof deviceProtocol==='undefined'||deviceProtocol!==PROTOCOL_NRF52||!gattServer?.connected||!bleDevice?.gatt?.connected||!epdCharacteristic||!nrf52ModelDetected||nrf52ModelId!==2)return null;
 const p=detectedNrf52Model2Panel();return p===0x21?'213':p===0x29?'290':null;
}
function occupied(){return !!root.countdownOperationBusy||!!root.VNDataBusy?.()||!!root.EpdDfuBusy?.()||!!root.EpdDesigner?.busy||!!root.EpdDesigner?.needsReconnect||(typeof clockImageUploadBusy!=='undefined'&&clockImageUploadBusy)||(typeof da14585ModeSwitchBusy!=='undefined'&&da14585ModeSwitchBusy);}
function refresh(){
 const t=target(),lang=root.EpdWebsiteI18n?.current()||'vi',state=(t||'')+'|'+!!active+'|'+occupied();
 if(t&&$('price-size').value!==t){$('price-size').value=t;scheduleRender();}
 $('price-size').disabled=!!active||!!t;
 text($('price-device'),tr(t?'Đã nhận diện màn:':'Kết nối màn 2.13 hoặc 2.9 ở mục Cài đặt để gửi thẻ giá.')+(t?' '+(t==='213'?'2.13 inch':'2.9 inch'):''));
 $('price-send').disabled=!!active||!t||occupied()||!!$('price-fit').textContent;
 if(state!==lastState||lang!==lastLang){lastState=state;lastLang=lang;updateForm();say(statusKey,statusTail);refreshLibrary();}
}
function scheduleRender(){if(framePending)return;framePending=true;requestAnimationFrame(()=>{framePending=false;preview();});}
function preview(){
 updateForm();const g=SIZES[$('price-size').value]||SIZES[213];text($('price-dimensions'),g.width+' × '+g.height+' px');
 try{render($('price-preview'),draft(),$('price-size').value);text($('price-fit'),'');if(template==='parking'&&statusKey==='Chưa hoàn tất:'&&['Nhập số điện thoại hợp lệ, từ 9 đến 15 chữ số.','Lời nhắn tối đa 60 ký tự.','Lời nhắn chưa vừa hai dòng. Hãy viết ngắn hơn.'].some(s=>statusTail===tr(s)))say('Đã cập nhật bản xem trước.');}
 catch(e){text($('price-fit'),tr(e.message));const c=$('price-preview');c.width=g.width;c.height=g.height;const ctx=c.getContext('2d');ctx.fillStyle=WHITE;ctx.fillRect(0,0,c.width,c.height);font(ctx,11);ctx.fillStyle=BLACK;ctx.textAlign='center';ctx.fillText(tr('Nhập thông tin để xem thẻ giá.'),c.width/2,c.height/2);}
 refresh();
}
function readLibrary(){
 const raw=localStorage.getItem(LIBRARY_KEY);if(raw===null)return [];
 let o;try{o=JSON.parse(raw);}catch(_){throw Error('Không đọc được danh sách sản phẩm đã lưu. Dữ liệu trên máy chưa bị thay đổi.');}if(o?.schema!==1||!Array.isArray(o.products)||o.products.length>MAX_PRODUCTS)throw Error('Không đọc được danh sách sản phẩm đã lưu. Dữ liệu trên máy chưa bị thay đổi.');
 const ids=new Set();for(const p of o.products){if(!p||!/^[-\w]{1,80}$/.test(p.id)||ids.has(p.id))throw Error('Không đọc được danh sách sản phẩm đã lưu. Dữ liệu trên máy chưa bị thay đổi.');ids.add(p.id);normalize(p);}
 return o.products;
}
function refreshLibrary(){
 const select=$('price-products'),choice=select.value;let list=[];
 try{list=readLibrary();libraryError=null;}catch(e){libraryError=e;}
 select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent=tr('Chọn thẻ đã lưu…');select.append(first);
 for(const item of list){const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.template==='parking'?tr('Đỗ xe')+' · '+item.phone:item.name+' — '+money(item.price)+'đ';select.append(opt);}select.value=choice;
 text($('price-library-count'),libraryError?tr('Trình duyệt chưa đọc được danh sách đã lưu.'):list.length+' / '+MAX_PRODUCTS+' '+tr('thẻ đã lưu trên trình duyệt này.'));
 $('price-open').disabled=!!active||!select.value;$('price-delete').disabled=!!active||!select.value;
}
function action(fn){try{fn();}catch(e){say('Chưa hoàn tất:',tr(e.message));}}
function save(){
 const data=render($('price-preview'),draft(),$('price-size').value),list=readLibrary();
 const id=selectedId||(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
 const at=list.findIndex(x=>x.id===id);if(at<0&&list.length>=MAX_PRODUCTS)throw Error('Danh sách đã đủ 100 sản phẩm. Xóa sản phẩm không dùng trước khi lưu thêm.');
 const row=data.template==='parking'?{...data,id}:{...data,price:String(data.price),oldPrice:data.oldPrice===null?'':String(data.oldPrice),id};
 if(at<0)list.push(row);else list[at]=row;
 try{localStorage.setItem(LIBRARY_KEY,JSON.stringify({schema:1,products:list}));}catch(e){throw Error('Trình duyệt chưa lưu được dữ liệu. Hãy kiểm tra quyền lưu trữ hoặc dung lượng còn trống.');}
 selectedId=id;refreshLibrary();$('price-products').value=id;updateForm();refresh();say(data.template==='parking'?'Đã lưu thẻ đỗ xe trên trình duyệt này.':'Đã lưu sản phẩm trên trình duyệt này.');
}
function lock(token){
 token.controls=new Map();for(const el of document.querySelectorAll('button,input,select,textarea')){if(el.id==='price-cancel')continue;token.controls.set(el,el.disabled);el.disabled=true;}
 $('price-cancel').hidden=false;$('price-cancel').disabled=false;
 // Window capture also keeps Stop usable while the album preflight owns VNTransport.
 token.capture=e=>{if(active!==token)return;if(e.target.closest('#price-cancel'))cancel();e.preventDefault();e.stopImmediatePropagation();};
 root.addEventListener('click',token.capture,true);
 token.beforeUnload=e=>{if(active===token){e.preventDefault();e.returnValue='';}};root.addEventListener('beforeunload',token.beforeUnload);
}
function unlock(token){
 if(token.flagOwned)root.countdownOperationBusy=false;
 for(const [el,disabled]of token.controls||[])if(el.isConnected)el.disabled=disabled;
 root.removeEventListener('click',token.capture,true);root.removeEventListener('beforeunload',token.beforeUnload);
 token.device?.removeEventListener?.('gattserverdisconnected',token.disconnect);
 $('price-cancel').hidden=true;refresh();
}
function guard(token){
 if(token.cancelled)throw token.error;
 if(active!==token||bleDevice!==token.device||epdCharacteristic!==token.characteristic||!gattServer?.connected||!token.device.gatt?.connected||target()!==token.size||nrf52FirmwareVersion!==token.version)throw Error('Kết nối đã thay đổi. Hãy kết nối lại rồi gửi lại thẻ giá.');
}
function cancel(message='Đã dừng gửi. Kết nối lại rồi bấm Gửi lại thẻ giá.'){
 const token=active;if(!token)return;
 token.cancelled=true;token.error=Error(message);token.reject(token.error);
 try{token.device.gatt.disconnect();}catch(_){}
 if(token.initWaiting)resolveNrf52ClockImageInit(false);
}
async function wait(token,promise,ms=15000){
 guard(token);let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Thiết bị phản hồi quá lâu. Kết nối lại rồi gửi lại thẻ giá.')),ms);});
 try{const value=await Promise.race([promise,token.stop,timeout]);guard(token);return value;}finally{clearTimeout(timer);}
}
const pause=(token,ms)=>wait(token,new Promise(ok=>setTimeout(ok,ms)),ms+5000);
async function write(token,packet){
 guard(token);return wait(token,root.EpdGattWrites.write(token.characteristic,packet,()=>{try{guard(token);return true;}catch(_){return false;}}));
}
function modePacket(mode){const ts=Math.floor(Date.now()/1000),tz=Math.round(-new Date().getTimezoneOffset()/60);return Uint8Array.of(NRF52_CMD_SET_TIME,ts>>>24&255,ts>>>16&255,ts>>>8&255,ts&255,tz&255,mode);}
function progress(percent,key){$('price-progress').value=percent;if(key)say(key);}
async function plane(token,bytes,black,start,end){
 const chunk=Math.max(1,Math.min(244,Number(nrf52ImageChunkSize)||18));
 for(let offset=0;offset<bytes.length;offset+=chunk){
  const b=bytes.slice(offset,offset+chunk),flags=(offset===0?0:0xf0)|(black?0x0f:0);
  await write(token,Uint8Array.from([NRF52_CMD_WRITE_IMAGE,flags,...b]));
  progress(start+Math.min(offset+chunk,bytes.length)/bytes.length*(end-start));await pause(token,8);
 }
}
async function send(){
 if(active)return;const size=target();if(!size){say('Kết nối màn 2.13 hoặc 2.9 ở mục Cài đặt để gửi thẻ giá.');return;}
 if(occupied()){say('Đồng hồ đang xử lý. Chờ hoàn tất rồi gửi thẻ giá.');return;}
 try{render($('price-preview'),draft(),size);}catch(e){say('Chưa hoàn tất:',tr(e.message));return;}
 const canvas=document.createElement('canvas'),g=SIZES[size];canvas.width=g.width;canvas.height=g.transportHeight;
 const ctx=canvas.getContext('2d');ctx.fillStyle=WHITE;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage($('price-preview'),0,0);
 const token={device:bleDevice,characteristic:epdCharacteristic,version:nrf52FirmwareVersion,size,cancelled:false,flagOwned:false};
 token.stop=new Promise((_,reject)=>token.reject=reject);token.stop.catch(()=>{});active=token;
 token.disconnect=()=>{if(active===token&&!token.cancelled){token.cancelled=true;token.error=Error('Mất kết nối. Nội dung thẻ giá vẫn được giữ. Kết nối lại rồi gửi lại.');token.reject(token.error);}};
 token.device.addEventListener?.('gattserverdisconnected',token.disconnect);lock(token);progress(0,'Đang chuẩn bị thẻ giá.');
 try{
  if(root.PhotoAlbumBeforeDirectUpload&&!await wait(token,root.PhotoAlbumBeforeDirectUpload(),60000)){say('Tắt tự đổi ảnh trong Album ảnh hoặc Đồng hồ và ảnh trước khi gửi thẻ giá.');return;}
  guard(token);if(occupied())throw Error('Đồng hồ đang xử lý. Chờ hoàn tất rồi gửi thẻ giá.');
  root.countdownOperationBusy=true;token.flagOwned=true;
  await write(token,modePacket(0));await pause(token,150);
  if(size==='290'){
   token.initWaiting=true;const ready=waitForNrf52ClockImageInit(45000);await write(token,Uint8Array.of(NRF52_CMD_INIT));
   if(!await wait(token,ready,46000))throw Error('Đồng hồ chưa sẵn sàng. Kết nối lại rồi gửi lại.');token.initWaiting=false;
  }else{await write(token,Uint8Array.of(NRF52_CMD_INIT));await pause(token,100);}
  const black=Uint8Array.from(canvas2bytes_bw(canvas,'bwr-black')),red=Uint8Array.from(canvas2bytes_bw(canvas,'bwr'),b=>b^255);
  progress(5,'Đang gửi thẻ giá. Giữ kết nối đến khi hoàn tất.');
  await plane(token,black,true,5,50);await plane(token,red,false,50,95);
  if(size==='290')await write(token,modePacket(3));
  await write(token,Uint8Array.of(NRF52_CMD_REFRESH));progress(97,'Đã gửi dữ liệu. Đồng hồ đang làm mới màn hình…');
  await pause(token,32000);guard(token);nrf52DisplayMode=0;progress(100,'Đã gửi thẻ giá. Hãy kiểm tra nội dung trên màn hình.');
  $('price-send').dataset.retry='';
 }catch(e){
  if(!token.cancelled){token.cancelled=true;token.error=e;try{token.device.gatt.disconnect();}catch(_){}}
  $('price-send').dataset.retry='1';say('Chưa hoàn tất:',tr((token.error||e).message));
  if(typeof addLog==='function')addLog('Thẻ giá: '+(token.error||e).message);
 }finally{
  if(token.initWaiting)resolveNrf52ClockImageInit(false);
  if(active===token){active=null;unlock(token);}text($('price-send'),tr($('price-send').dataset.retry?'Gửi lại thẻ giá':'Gửi lên thiết bị'));
 }
}
for(const input of section.querySelectorAll('input,select'))input.addEventListener('input',()=>{if(!active)scheduleRender();});
for(const radio of section.querySelectorAll('[name="price-template"]'))radio.addEventListener('change',()=>{const wasParking=template==='parking';template=radio.value;if(wasParking!==(template==='parking'))selectedId=null;if(template==='parking'&&!$('price-numberColor').value)$('price-numberColor').value='black';updateForm();scheduleRender();});
$('price-products').addEventListener('change',refreshLibrary);
$('price-size').addEventListener('change',scheduleRender);
$('price-save').onclick=()=>action(save);
$('price-open').onclick=()=>action(()=>{const row=readLibrary().find(x=>x.id===$('price-products').value);if(row){fill(row,row.id);say(row.template==='parking'?'Đã mở thẻ đỗ xe. Sửa thông tin rồi lưu hoặc gửi lên thiết bị.':'Đã mở sản phẩm. Sửa thông tin rồi lưu hoặc gửi lên thiết bị.');}});
$('price-delete').onclick=()=>action(()=>{const id=$('price-products').value;if(!id)return;if(!confirm(tr('Xóa thẻ đã chọn khỏi danh sách trên máy này?')))return;const list=readLibrary().filter(x=>x.id!==id);localStorage.setItem(LIBRARY_KEY,JSON.stringify({schema:1,products:list}));if(selectedId===id)selectedId=null;refreshLibrary();updateForm();say('Đã xóa sản phẩm khỏi danh sách trên máy này.');});
$('price-reset').onclick=()=>fill(template==='parking'?{template,phone:'',message:'Xin gọi khi cần di chuyển xe',numberColor:'black'}:{template,name:'',price:'',unit:template==='weight'?'kg':'hộp'});
$('price-example').onclick=()=>fill(SAMPLES[template]);$('price-send').onclick=send;$('price-cancel').onclick=()=>cancel();
$('price-download').onclick=()=>action(()=>{render($('price-preview'),draft(),$('price-size').value);const a=document.createElement('a');a.download=(template==='parking'?'so-dien-thoai-do-xe-':'the-gia-')+$('price-size').value+'.png';a.href=$('price-preview').toDataURL('image/png');a.click();});
root.addEventListener('storage',event=>{if(event.key===LIBRARY_KEY)refreshLibrary();});
root.PriceTagPanel={send,cancel,busy:()=>!!active,refresh,preview,draft};
for(const mini of section.querySelectorAll('[data-price-mini]'))render(mini,SAMPLES[mini.dataset.priceMini],'213');
 $('price-phone').value=SAMPLES.parking.phone;$('price-message').value=SAMPLES.parking.message;$('price-numberColor').value='black';
fill(SAMPLES.basic);refreshLibrary();setInterval(refresh,500);
})(globalThis);

