/* Shared photo rendering only. No Bluetooth, storage, or device-mode operations. */
(function(root){
 'use strict';
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const defaults=()=>({brightness:0,contrast:0,redThreshold:120,bwThreshold:128});
 function process(pixels,width,height,options={},diffuse=true,adjust=true){
  if(!(pixels instanceof Uint8ClampedArray)||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels.length!==width*height*4)throw new Error('Invalid image dimensions.');
  const settings={...defaults(),...options},data=new Uint8ClampedArray(pixels.length);
  const brightness=adjust?clamp(settings.brightness,-100,100)*2.55:0;
  const c=adjust?clamp(settings.contrast,-100,100):0,factor=259*(c+255)/(255*(259-c));
  for(let i=0;i<pixels.length;i+=4){
   const alpha=pixels[i+3]/255;
   for(let channel=0;channel<3;channel++)data[i+channel]=clamp(factor*(pixels[i+channel]*alpha+255*(1-alpha)-128)+128+brightness,0,255);
   data[i+3]=255;
  }
  const redThreshold=clamp(settings.redThreshold,80,240),bwThreshold=clamp(settings.bwThreshold,50,220);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const at=(y*width+x)*4,r=data[at],g=data[at+1],b=data[at+2];
   const red=r>redThreshold&&r>g*1.5&&r>b*1.5;
   const black=!red&&(.299*r+.587*g+.114*b)<bwThreshold;
   const color=red?[255,0,0]:black?[0,0,0]:[255,255,255];
   if(diffuse){
    for(const [dx,dy,weight] of [[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]]){
     const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny>=height)continue;
     const next=(ny*width+nx)*4;
     for(let channel=0;channel<3;channel++)data[next+channel]=clamp(data[next+channel]+(data[at+channel]-color[channel])*weight,0,255);
    }
   }
   data.set(color,at);
  }
  return data;
 }
 const api={process,defaults};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EpdClockImageProcessing=api;
})(globalThis);
