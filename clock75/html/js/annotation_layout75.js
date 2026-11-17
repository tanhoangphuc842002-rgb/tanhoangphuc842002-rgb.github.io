(function(root){
 'use strict';const node=typeof module!=='undefined'&&module.exports;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder,store=node?require('./resource_store'):root.EPDResourceStore,fonts=node?require('./font_builder'):root.EPDWebFonts;
 function font(project){
  const m=builder.open(store.prepareBundle(project.files.map(f=>({name:f.name,bytes:Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0))}))));
  if(m.fonts.annotation14)return m.fonts.annotation14;
  const a=m.ui.faceAssets,v=new DataView(a.buffer,a.byteOffset,a.byteLength),at=16+6*12;return a.slice(v.getUint32(at+4,true),v.getUint32(at+4,true)+v.getUint32(at+8,true));
 }
 function glyphs(bytes){const map=new Map();let at=23;while(bytes[at+1]){const n=bytes[at+1];map.set(bytes[at],fonts.decodeGlyph(bytes,bytes[at],bytes.slice(at,at+n)));at+=n;}at=23+((bytes[21]<<8)|bytes[22])+4;while(bytes[at]||bytes[at+1]){const code=bytes[at]*256+bytes[at+1],n=bytes[at+2];map.set(code,fonts.decodeGlyph(bytes,code,bytes.slice(at,at+n)));at+=n;}return map;}
 function measure(map,text){let width=0;for(const c of text.normalize('NFC')){const g=map.get(c.codePointAt(0));if(!g)throw Error('Font 14 chưa hỗ trợ ký tự “'+c+'”. Hãy dùng chữ tiếng Việt, số và dấu thông dụng.');width+=g.advance;}return width;}
 function validate(map,items){for(const i of items)if(i.label)measure(map,i.label);}
 function split(map,text,width=107){
  if(measure(map,text)<=width)return [text];
  let at=-1;for(let i=0;i<text.length;i++)if(text[i]===' '&&measure(map,text.slice(0,i))<=width)at=i;
  const rows=at<0?[text]:[text.slice(0,at),text.slice(at+1)];
  return rows.map(row=>{while(row&&measure(map,row)>width)row=Array.from(row).slice(0,-1).join('');return row;});
 }
 const api={font,glyphs,measure,validate,split};if(node){module.exports=api;return;}
 const $=id=>document.getElementById(id),a=CalendarAnnotations,cache=new Map();
 function currentMap(){const family=$('resourceVietnameseFamily')?.value==='arial'?'arial':'times',modern=a.font14Mode(),key=family+modern;if(!cache.has(key)){const project=(modern?root.EPDAnnotation14Projects:root.EPDVietnameseProjects)?.[family];cache.set(key,glyphs(font(project)));}return cache.get(key);}
 const oldAdd=a.addOrUpdate,oldSave=a.save,oldPreview=a.updatePreview;
 a.addOrUpdate=function(){try{if(this.font14Mode())validate(currentMap(),[{label:$('calendarAnnotationLabel').value.trim()}]);return oldAdd.call(this);}catch(e){this.report(e.message,true);}};
 a.save=async function(){try{
  if(this.font14Mode()){
   validate(currentMap(),this.annotations);
   await root.ExternalResourceInstaller.countdownOperation(async(client,check)=>{const i=await client.inspect(6);check();if(i.code||i.revision<16)throw Error('Vào Cài đặt đồng hồ để cài bộ font 14 đầy đủ trước khi lưu đánh dấu ngày.');});
  }
  return await oldSave.call(this);
 }catch(e){this.report(e.message,true);}};
 a.positionLabel=()=> 'Dưới số ngày';
 a.updatePreview=function(){
  oldPreview.call(this);const c=$('annotationCellCanvas');if(!c)return;
  const ctx=c.getContext('2d'),modern=this.font14Mode();ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#999';ctx.strokeRect(.5,.5,110,64);
  const date=this.dateParts($('calendarAnnotationDate').value),text=$('calendarAnnotationLabel').value.trim().normalize('NFC'),today=$('calendarAnnotationDate').value===this.today(),color=Number($('calendarAnnotationColor').value);
  const ink=color===2?'#ff0000':color===1?'#fff':'#000';
  if(today){ctx.fillStyle='#ff0000';ctx.beginPath();ctx.arc(20,18,14,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=today?'#fff':'#000';ctx.textAlign='center';ctx.font='bold 20px Arial';ctx.fillText(date?date.day:'31',20,24);
  let note='Nhãn hiển thị dưới số ngày và thay dòng ngày lễ hoặc âm lịch.';
  try{
   if(modern&&text){
    const map=currentMap(),rows=split(map,text);rows.forEach((row,index)=>{
     let x=(c.width-measure(map,row))/2;const baseline=39+15*index;
     if(color===1){ctx.fillStyle='#ff0000';ctx.fillRect(x-1,baseline-14,measure(map,row)+2,18);}
     ctx.fillStyle=ink;
     for(const ch of row){const g=map.get(ch.codePointAt(0));for(let y=0;y<g.height;y++)for(let xx=0;xx<g.width;xx++)if(g.pixels[y*g.width+xx])ctx.fillRect(x+g.x+xx,baseline-g.y-g.height+y,1,1);x+=g.advance;}
    });note='Dưới số ngày · cùng font 14 với ngày lễ · tối đa hai dòng. Nhãn quá dài sẽ rút gọn.';
   }else{ctx.font='13px Arial';ctx.fillStyle=ink;ctx.fillText(text||'22',55,54,103);if(!text)note='Để trống nhãn để chỉ đánh dấu chấm đỏ; ngày lễ hoặc âm lịch vẫn giữ.';}
  }catch(e){note=e.message;}
  if(modern)$('calendarAnnotationColorHint').hidden=true;
  $('calendarAnnotationPreviewNote').textContent=note;
  $('calendarAnnotationLabelHint').textContent='Nội dung: '+this.labelByteLength(text)+'/40 byte. Chữ có dấu chiếm nhiều byte hơn; tên ngắn sẽ dễ đọc hơn.';
 };
 root.AnnotationLayout75=api;window.addEventListener('load',()=>a.updatePreview());
})(globalThis);
