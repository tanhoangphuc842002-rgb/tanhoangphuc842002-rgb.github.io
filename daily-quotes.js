/* Daily text stays in the existing atomic resource banks. No writes to albums. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),T=window.VNTransport,E=new TextEncoder(),D=new TextDecoder('utf-8',{fatal:true});
const catalogue=()=>((T.language?.()===1&&T.languageSupported?.())?window.DailyQuoteEnglishCatalogue:window.DailyQuoteCatalogue)||[],MAGIC=0x31455451,MAX=50;
const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
function supported(){return typeof deviceProtocol!=='undefined'&&deviceProtocol===PROTOCOL_NRF52&&nrf52ModelDetected&&nrf52ModelId===2&&((nrf52PanelProfile===0x21&&[199,200,203,204,205,206,209,210,213,214,217,218,219,220,223,224,227,228,229,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion))||(nrf52PanelProfile===0x29&&[207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)));}
function panel(){return nrf52PanelProfile===0x29?204:168;}
function check(){if(!gattServer?.connected)throw Error('Hãy kết nối đồng hồ trước.');if(!supported())throw Error('Đồng hồ này chưa hỗ trợ danh ngôn mỗi ngày. Chưa gửi thay đổi.');}
function wrap(text,width=160){
 text=text.trim().normalize('NFC').replace(/\r/g,'');if(!text)throw Error('Hãy nhập một câu trước.');
 const chars=[...text];for(const c of chars)if(c!=='\n'&&!window.VNTrial.fonts[1].has(c.codePointAt(0)))throw Error('Chưa hỗ trợ ký tự: '+c);
 const w=s=>window.VNTrial.width(s,1);
 if(text.includes('\n')){const lines=text.split('\n').map(x=>x.trim());if(lines.length!==2||!lines[0]||!lines[1]||lines.some(x=>w(x)>width))throw Error('Nội dung vượt quá hai dòng. Vui lòng chỉnh lại.');return lines;}
 if(w(text)<=width)return[text,''];
 const words=text.split(/\s+/);let best=null;
 for(let i=1;i<words.length;i++){const a=words.slice(0,i).join(' '),b=words.slice(i).join(' '),wa=w(a),wb=w(b);if(wa<=width&&wb<=width&&(!best||Math.abs(wa-wb)<best.score))best={lines:[a,b],score:Math.abs(wa-wb)};}
 if(!best)throw Error('Nội dung vượt quá hai dòng. Vui lòng chỉnh lại.');return best.lines;
}
function record(q,builtin=false){const lines=q.lines||wrap(q.text,panel()-8),author=(builtin?'':q.author||'').trim().normalize('NFC'),parts=[...lines,author].map(s=>E.encode(s));
 if(parts[0].length>63||parts[1].length>63||parts[2].length>40)throw Error('Nội dung hoặc tên tác giả quá dài để lưu.');
 if(parts[0].length+parts[1].length+parts[2].length>140)throw Error('Nội dung quá dài để lưu.');
 const b=new Uint8Array(parts.reduce((n,p)=>n+p.length+1,0));let at=0;for(const p of parts){b.set(p,at);at+=p.length+1;}return b;
}
function pack(mode,custom){if(catalogue().length!==100||custom.length>MAX||!Number.isInteger(mode)||mode<0||mode>3)throw Error('Danh sách chưa hợp lệ.');const all=[...catalogue().map(q=>record(q,true)),...custom.map(q=>record(q))],size=16+all.length*2+all.reduce((n,b)=>n+b.length,0),b=new Uint8Array(size),v=new DataView(b.buffer);v.setUint32(0,MAGIC,true);b.set([1,mode,100,custom.length],4);v.setUint16(8,size,true);let at=16+all.length*2;all.forEach((r,i)=>{v.setUint16(16+i*2,at,true);b.set(r,at);at+=r.length;});return b;}
function decode(b){const v=new DataView(b.buffer,b.byteOffset,b.byteLength);if(b.length<16||v.getUint32(0,true)!==MAGIC||b[4]!==1||b[5]>3||b[6]>100||b[7]>50||v.getUint16(8,true)!==b.length)throw Error('Dữ liệu danh ngôn chưa hợp lệ.');const n=b[6]+b[7],all=[];let previous=16+n*2;
 for(let i=0;i<n;i++){const start=v.getUint16(16+i*2,true),end=i+1<n?v.getUint16(18+i*2,true):b.length;if(start!==previous||end<=start||end>b.length)throw Error('Danh sách chưa đầy đủ.');const p=b.slice(start,end),s=D.decode(p).split('\0');if(s.length!==4||s[3]!==''||!s[0])throw Error('Nội dung đã lưu chưa hợp lệ.');all.push({lines:s.slice(0,2),text:s.slice(0,2).filter(Boolean).join(' '),author:s[2]});previous=end;}
 return{mode:b[5],defaults:all.slice(0,b[6]),custom:all.slice(b[6])};
}
function locate(bytes){let at=512,v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);while(at+16<=bytes.length&&bytes[at]<8){const n=v.getUint32(at+4,true);if(n<16||at+n>bytes.length)throw Error('Dữ liệu font chưa hợp lệ.');at+=n;}
 if(at===bytes.length)return{prefix:at,quote:null,marks:null,fontOnly:true};
 if(at+8>bytes.length||v.getUint32(at,true)!==0x314e5645)throw Error('Thiếu dữ liệu ngày nhắc.');const stride=v.getUint16(at+6,true),count=v.getUint16(at+4,true);if(![32,80].includes(stride)||!count||count>256||at+8+count*stride>bytes.length)throw Error('Dữ liệu ngày nhắc chưa hợp lệ.');at+=8+count*stride;let quote=null,marks=null,prefix=at;
 if(at+16<=bytes.length&&v.getUint32(at,true)===MAGIC){const n=v.getUint16(at+8,true);if(n<16||at+n>bytes.length)throw Error('Dữ liệu danh ngôn chưa đầy đủ.');quote=bytes.slice(at,at+n);decode(quote);at+=n;}
 if(at!==bytes.length){if(bytes.length-at!==256||v.getUint32(at,true)!==0x314b4d44)throw Error('Phần cuối dữ liệu chưa hợp lệ.');marks=bytes.slice(at);at+=256;}return{prefix,quote,marks};
}
function concat(...parts){const b=new Uint8Array(parts.reduce((n,p)=>n+(p?.length||0),0));let at=0;for(const p of parts)if(p){b.set(p,at);at+=p.length;}return b;}
function defaults(bytes){return concat(bytes,pack(1,[]));}
function rebase(bytes,old){const n=locate(bytes),o=locate(old),saved=o.quote?decode(o.quote):{mode:1,custom:[]};return concat(bytes.slice(0,n.prefix),pack(saved.mode,saved.custom));}
async function bank(){check();const cap=await T.probe();if(!cap[7])throw Error('Hãy vào Cập nhật phần mềm → Cài đặt đồng hồ trước.');if(cap[8])throw Error('Có lần truyền chưa hoàn tất. Bấm Dừng truyền / khôi phục.');const a=new DataView(cap.buffer,cap.byteOffset).getUint32(10,true);if(a!==0x60000&&a!==0x70000)throw Error('Chưa xác nhận được vùng dữ liệu.');const h=await T.read(a,16),v=new DataView(h.buffer,h.byteOffset),size=v.getUint32(8,true);if(v.getUint32(0,true)!==0x31544e56||size<544||size>([213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,242,243,244,241,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292].includes(nrf52FirmwareVersion)?65520:61440))throw Error('Dữ liệu đồng hồ chưa hợp lệ.');const bytes=await T.read(a+16,size);if(T.crc32(bytes)!==v.getUint32(12,true))throw Error('Chưa kiểm tra được dữ liệu đang lưu.');const tail=locate(bytes);if(tail.fontOnly)throw Error("Hãy vào Cập nhật phần mềm → Cài đặt đồng hồ trước.");return{cap,a,h,bytes,tail};}

window.DailyQuotes={supported,wrap,pack,decode,locate,defaults,rebase,concat,readBank:bank};
})();
