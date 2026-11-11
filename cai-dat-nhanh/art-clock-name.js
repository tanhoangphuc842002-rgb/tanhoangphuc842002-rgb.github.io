/* Personal text is rasterized locally into the existing photo payload. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),art=root.ArtClock;
 const ids=['art-name-text','art-name-position','art-name-size','art-name-color','art-name-background','art-name-clear'];
 let composing=false,lastLayout=null;
 const words=(vi,en)=>art.wording(vi,en);
 const labels={
  'art-name-title':['Tên riêng trên tranh','Personal text on art'],
  'art-name-text-label':['Tên hoặc lời nhắn','Name or short message'],
  'art-name-position-label':['Vị trí chữ','Text position'],
  'art-name-size-label':['Cỡ chữ','Text size'],
  'art-name-color-label':['Màu chữ','Text color'],
  'art-name-background-label':['Nền trắng sau chữ','White background behind text'],
  'art-name-clear':['Xóa chữ','Clear text'],
  'art-name-help':['Nhập tối đa 32 ký tự, có thể dùng tiếng Việt có dấu. Chữ tự xuống tối đa hai dòng. Chọn vị trí phù hợp để tránh che tranh, rồi bấm Tải lên đồng hồ.','Enter up to 32 characters. Vietnamese accents are supported. Text wraps to at most two lines. Choose a position that suits the picture, then upload to the clock.']
 };
 const enabled=()=>art.selected()&&art.stacked();
 function normalized(){return $('art-name-text').value.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ');}
 function clean(){
  const e=$('art-name-text'),value=Array.from(normalized()).slice(0,32).join('');
  if(e.value!==value)e.value=value;
 }
 function controls(locked=false){
  $('art-name-controls').hidden=!enabled();
  const unavailable=locked||!enabled()||!clockImageOriginal||!!root.PhotoAlbumShared.busy()||!!root.VNTransport.busy()||clockImageUploadBusy||!!root.EpdDfuBusy?.();
  for(const id of ids)$(id).disabled=unavailable||(id==='art-name-clear'&&!$('art-name-text').value);
  for(const [id,pair]of Object.entries(labels))$(id).textContent=words(...pair);
  $('art-name-text').placeholder=words('Ví dụ: Góc nhỏ của An','Example: Anna’s happy place');
  ['Dưới tranh','Trên tranh','Giữa tranh'].forEach((vi,i)=>$('art-name-position').options[i].textContent=words(vi,['Bottom','Top','Middle'][i]));
  $('art-name-color').options[0].textContent=words('Đen','Black');$('art-name-color').options[1].textContent=words('Đỏ','Red');
  $('art-name-count').textContent=Array.from(normalized()).length+'/32';
 }
 function linesFor(ctx,text,width){
  const lines=[];let line='';
  for(const word of text.split(' ')){
   if(!word)continue;
   if(ctx.measureText(word).width>width){
    if(line){lines.push(line);line='';}
    for(const ch of Array.from(word)){
     if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line='';}
     line+=ch;
    }
   }else if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line=word;}
   else line+=(line?' ':'')+word;
  }
  if(line)lines.push(line);return lines;
 }
 function draw(ctx){
  lastLayout=null;
  if(!enabled()||!clockImageOriginal)return;
  const text=normalized().trim();if(!text)return;
  const canvas=$('clock-image-canvas'),box=art.corner(),left=box.x+box.width+3,right=canvas.width-3,width=right-left;
  const selectedSize=Number($('art-name-size').value),requested=[12,14,16,18,20].includes(selectedSize)?selectedSize:16;
  ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';
  let size=requested,lines;
  for(;;){ctx.font='bold '+size+'px Arial, sans-serif';lines=linesFor(ctx,text,width-6);if(lines.length<=2||size<=10)break;size--;}
  const metrics=ctx.measureText('ẮẤỄỸĐgj'),ascent=Math.ceil(metrics.actualBoundingBoxAscent||size),descent=Math.ceil(metrics.actualBoundingBoxDescent||size*.25),lineHeight=Math.max(Math.ceil(size*1.4),ascent+descent+2),height=lineHeight*lines.length+4;
  const pos=$('art-name-position').value,y=pos==='top'?3:pos==='middle'?Math.floor((canvas.height-height)/2):canvas.height-height-3;
  if($('art-name-background').checked){ctx.fillStyle='#ffffff';ctx.fillRect(left,y,width,height);}
  ctx.fillStyle=$('art-name-color').value==='red'?'#b51e28':'#000000';
  const x=(left+right)/2,baseline=y+2+ascent;
  lines.forEach((line,i)=>ctx.fillText(line,x,baseline+i*lineHeight));
  ctx.restore();
  // Quantize only this label rectangle, preserving the already processed art.
  const region=ctx.getImageData(left,y,width,height),b=region.data;
  for(let i=0;i<b.length;i+=4){
   const red=b[i]>90&&b[i]>b[i+1]*1.4&&b[i]>b[i+2]*1.4;
   const white=!red&&(b[i]*.299+b[i+1]*.587+b[i+2]*.114>=150);
   b[i]=red?181:white?255:0;b[i+1]=red?30:white?255:0;b[i+2]=red?40:white?255:0;b[i+3]=255;
  }
  ctx.putImageData(region,left,y);
  lastLayout={text,lines,size,left,right,y,width,height,lineHeight};
 }
 function update(){
  if(!composing)clean();
  root.renderClockImage();controls();
 }
 function clear(){if($('art-name-text').disabled)return;$('art-name-text').value='';lastLayout=null;root.renderClockImage();controls();}
 $('art-name-text').addEventListener('compositionstart',()=>{composing=true;});
 $('art-name-text').addEventListener('compositionend',()=>{composing=false;update();});
 $('art-name-text').addEventListener('input',update);
 for(const id of ['art-name-position','art-name-size','art-name-color','art-name-background'])$(id).addEventListener('change',update);
 $('art-name-clear').addEventListener('click',clear);
 const oldClear=$('clock-image-clear').onclick;
 $('clock-image-clear').onclick=function(){if(this.disabled)return;$('art-name-text').value='';lastLayout=null;oldClear?.call(this);controls();};
 root.ArtClockName={draw,controls,clear,layout:()=>lastLayout};
 controls();
})(globalThis);

