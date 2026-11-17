(function(root){
 'use strict';const node=typeof module!=='undefined'&&module.exports;
 function compact(font,slot){
  const fb=node?require('./font_builder'):root.EPDWebFonts,records=[];let at=23;
  while(font[at+1]){const n=font[at+1];records.push([font[at],font.slice(at,at+n)]);at+=n;}
  at=23+(font[21]*256+font[22])+4;
  while(font[at]||font[at+1]){const n=font[at+2];records.push([font[at]*256+font[at+1],font.slice(at,at+n)]);at+=n;}
  const gs=records.map(([cp,b])=>[cp,fb.decodeGlyph(font,cp,b)]),header=font.slice(0,23);
  for(const [i,key]of ['width','height','x','y','advance'].entries()){
   const values=gs.map(([,g])=>g[key]),low=Math.min(...values),high=Math.max(...values);
   for(let bits=1;bits<=8;bits++)if(low>=(i<2?0:-(2**(bits-1)))&&high<=(i<2?2**bits-1:2**(bits-1)-1)){header[4+i]=bits;break;}
  }
  // Shortest valid groups of (background run, foreground run) and repeat flags.
  function encode(cp,g){
   const pixels=g.pixels,n=pixels.length,zmax=2**header[2]-1,omax=2**header[3]-1,zero=new Uint16Array(n+1),one=new Uint16Array(n+1);
   for(let i=n-1;i>=0;i--){zero[i]=pixels[i]===0?zero[i+1]+1:0;one[i]=pixels[i]===1?one[i+1]+1:0;}
   const cost=new Float64Array(n+1),choices=new Array(n);cost.fill(Infinity);cost[n]=0;
   for(let i=n-1;i>=0;i--){
    for(let z=0;z<=Math.min(zero[i],zmax);z++)for(let o=0;o<=Math.min(one[i+z],omax);o++){
     if(!(z+o))continue;let p=i,repeats=0;
     while(p<n&&zero[p]>=z&&one[p+z]>=o&&p+z+o<=n){p+=z+o;repeats++;const value=header[2]+header[3]+repeats+cost[p];if(value<cost[i]){cost[i]=value;choices[i]=[z,o,repeats,p];}}
    }
   }
   const out=[];let bit=0;function put(value,count){for(let j=0;j<count;j++,bit++){const i=bit>>3;if(i===out.length)out.push(0);out[i]|=((value>>j)&1)<<(bit&7);}}
   [g.width,g.height,g.x,g.y,g.advance].forEach((v,i)=>put(v+(i<2?0:2**(header[4+i]-1)),header[4+i]));
   for(let i=0;i<n;){const [z,o,k,end]=choices[i];put(z,header[2]);put(o,header[3]);for(let j=1;j<k;j++)put(1,1);put(0,1);i=end;}
   const prefix=cp<=255?[cp,out.length+2]:[cp>>8,cp&255,out.length+3];if(prefix[cp<=255?1:2]>255)throw Error('Glyph too long');return Uint8Array.from([...prefix,...out]);
  }
  function write(entries){
   const sorted=entries.sort((a,b)=>a[0]-b[0]),ascii=sorted.filter(([c])=>c<=255),unicode=sorted.filter(([c])=>c>255),alen=ascii.reduce((s,[,b])=>s+b.length,0)+2;
   const out=new Uint8Array(23+alen+4+unicode.reduce((s,[,b])=>s+b.length,0)+2);out.set(header);out[0]=Math.min(254,entries.length);let pos=23,upper=null,lower=null;
   for(const [cp,b]of ascii){if(upper===null&&cp>=65)upper=pos-23;if(lower===null&&cp>=97)lower=pos-23;out.set(b,pos);pos+=b.length;}
   for(const [offset,value]of [[17,upper??pos-23],[19,lower??pos-23],[21,alen]]){out[offset]=value>>8;out[offset+1]=value&255;}
   pos+=2;out.set([0,4,255,255],pos);pos+=4;for(const [,b]of unicode){out.set(b,pos);pos+=b.length;}return out;
  }
  let best=font;
  // Reuse the source run widths and the best practical 4/3 pair.
  for(const [z,o]of [[font[2],font[3]],[3,2],[3,3],[3,4],[4,2],[4,3],[4,4],[5,2],[5,3]]){
   header[2]=z;header[3]=o;const next=write(gs.map(([cp,g])=>[cp,encode(cp,g)]));
   if(next.length<best.length)best=next;
  }
  // Encoding changes never alter advances, bearings, dimensions, or a single pixel.
  for(const [cp,g]of gs){let rec;let p=cp<=255?23:23+(best[21]*256+best[22])+4;for(;;){const prefix=cp<=255?2:3,c=prefix===2?best[p]:best[p]*256+best[p+1],n=best[p+prefix-1];if(c===cp){rec=best.slice(p,p+n);break;}if(!n)throw Error('Missing compact glyph');p+=n;}const d=fb.decodeGlyph(best,cp,rec);if(['width','height','x','y','advance'].some(k=>d[k]!==g[k])||d.pixels.some((v,i)=>v!==g.pixels[i]))throw Error('Compact font pixel mismatch');}
  return best;
 }
 const api={compact};if(node)module.exports=api;else root.EPDFontCompact=api;
})(globalThis);
