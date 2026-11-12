(function (root) {
  'use strict';
  const store = typeof module !== 'undefined' && module.exports ? require('./resource_store.js') : root.EPDResourceStore;
  const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: true });
  const view = b => new DataView(b.buffer, b.byteOffset, b.byteLength);
  const fail = message => { throw new Error(message); };
  function integer(n, min, max, name) {
    if (!Number.isInteger(n) || n < min || n > max) fail(`${name} 必须为 ${min}..${max} 的整数`);
    return n;
  }
  function list(a, count, name) {
    if (!Array.isArray(a) || (count !== null && a.length !== count) || a.length > 65535)
      fail(`${name} 的项目数量不正确`);
    return a;
  }
  function date(month, day, name) {
    integer(month, 1, 12, name); integer(day, 1, 31, name);
  }
  function textBytes(text, size, name) {
    if (typeof text !== 'string' || text.includes('\0')) fail(`${name} 必须为文本且不能包含 NUL`);
    const bytes = encoder.encode(text.normalize('NFC'));
    if (bytes.length >= size) fail(`${name} 的 UTF-8 文本最多 ${size - 1} 字节`);
    const result = new Uint8Array(size); result.set(bytes); return result;
  }
  function readText(bytes) {
    const end = bytes.indexOf(0);
    if (end < 0) fail('文本缺少结束符');
    return decoder.decode(bytes.subarray(0, end));
  }
  const sections = [
    ['month_names', 32, 13, 'text'], ['leap_names', 32, 2, 'text'],
    ['date_names', 32, 31, 'text'], ['weekday_names', 32, 7, 'text'],
    ['zodiac_names', 32, 12, 'text'], ['stem_names', 32, 10, 'text'],
    ['branch_names', 32, 12, 'text'], ['jieqi_names', 32, 24, 'text'],
    ['lunar_month_days', 4, null, 'number'], ['solar_new_year', 4, null, 'number'],
    ['jieqi_year_bits', 1, null, 'number'], ['jieqi_base_days', 1, 24, 'number'],
    ['solar_festivals', 34, null, 'festival'], ['lunar_festivals', 34, null, 'festival'],
    ['holidays', 2, null, 'holiday'], ['special_festival_names', 32, 5, 'text'],
  ];

  function encodeCalendar(model) {
    const min = integer(model.year_min, 1584, 4095, 'year_min');
    const max = integer(model.year_max, min, 4095, 'year_max');
    integer(model.holiday_year, 1583, 4095, 'holiday_year');
    const years = max - min + 1;
    list(model.lunar_month_days, years + 2, 'lunar_month_days');
    list(model.solar_new_year, years + 2, 'solar_new_year');
    list(model.jieqi_year_bits, (years + 1) * 3, 'jieqi_year_bits');
    if (model.lunar_month_days[0] !== min - 1 || model.solar_new_year[0] !== min - 1)
      fail('两个农历计算表的基准年必须等于 year_min - 1');
    const parts = sections.map(([name, size, count, type]) => {
      const rows = list(model[name], count, name), bytes = new Uint8Array(rows.length * size), v = view(bytes);
      const dates = new Set();
      rows.forEach((row, i) => {
        const at = i * size;
        if (type === 'text') bytes.set(textBytes(row, size, name), at);
        else if (type === 'number') {
          integer(row, 0, size === 4 ? 0xffffffff : 255, name);
          if (size === 4) v.setUint32(at, row, true); else bytes[at] = row;
        } else {
          date(row.month, row.day, name);
          const key = row.month * 32 + row.day;
          if (dates.has(key)) fail(`${name} 包含重复日期`);
          dates.add(key);
          if (type === 'festival') {
            bytes[at] = row.month; bytes[at + 1] = row.day;
            bytes.set(textBytes(row.name, 32, name), at + 2);
          } else {
            if (typeof row.work !== 'boolean') fail('holidays.work 必须为 true 或 false');
            v.setUint16(at, (row.work ? 0x1000 : 0) | row.month << 8 | row.day, true);
          }
        }
      });
      return bytes;
    });
    const events = model.events || [];
    list(events, null, 'events');
    let previousDay = -1;
    events.forEach(row => {
      if (!Array.isArray(row) || row.length !== 2) fail('Sự kiện phải có ngày và tên');
      integer(row[0], 0, 0xffffff, 'event day');
      if (row[0] <= previousDay) fail('Ngày sự kiện phải tăng dần, không trùng');
      previousDay = row[0]; textBytes(row[1], 28, 'event name');
    });
    const holiday = model.holiday_font ? Uint8Array.from(list(model.holiday_font, null, 'holiday_font')) : new Uint8Array();
    const result = new Uint8Array(272 + holiday.length + parts.reduce((n, b) => n + b.length, 0) + (events.length ? 8 + events.length * 32 : 0)), v = view(result);
    v.setUint32(0, 0x314c4143, true);
    [1, 16, min, max, model.holiday_year, 0].forEach((n, i) => v.setUint16(4 + i * 2, n, true));
    let offset = 272;
    result.set(holiday,offset);offset+=holiday.length;
    parts.forEach((bytes, i) => {
      const at = 16 + i * 16, size = sections[i][1];
      [i + 1, size, bytes.length / size, 0].forEach((n, j) => v.setUint16(at + j * 2, n, true));
      v.setUint32(at + 8, offset, true); v.setUint32(at + 12, bytes.length, true);
      result.set(bytes, offset); offset += bytes.length;
    });
    if (events.length) {
      v.setUint32(offset, 0x314e5645, true); v.setUint16(offset + 4, events.length, true); v.setUint16(offset + 6, 32, true);
      events.forEach(([day,name],i) => { const at=offset+8+i*32;v.setUint32(at,day,true);result.set(textBytes(name,28,'event name'),at+4); });
    }
    return result;
  }

  function decodeCalendar(bytes) {
    const v = view(bytes);
    if (bytes.length < 272 || v.getUint32(0, true) !== 0x314c4143 || v.getUint16(4, true) !== 1 ||
        v.getUint16(6, true) !== 16 || v.getUint16(14, true)) fail('不支持的 CAL1 资源');
    const model = { year_min: v.getUint16(8, true), year_max: v.getUint16(10, true), holiday_year: v.getUint16(12, true) };
    let end = 272;
    const first=v.getUint32(24,true);if(first>272)model.holiday_font=Array.from(bytes.slice(272,first));
    sections.forEach(([name, expectedSize, , type], i) => {
      const at = 16 + i * 16, count = v.getUint16(at + 4, true), offset = v.getUint32(at + 8, true);
      const size = v.getUint16(at + 2, true);
      const legacySizes = [7,4,7,4,4,4,4,7,4,4,1,1,12,12,2,10];
      if (v.getUint16(at, true) !== i + 1 || (size !== expectedSize && size !== legacySizes[i]) || v.getUint16(at + 6, true) ||
          v.getUint32(at + 12, true) !== size * count || offset < end || offset + size * count > bytes.length)
        fail(`${name} 索引越界或格式不兼容`);
      end = offset + size * count;
      model[name] = Array.from({ length: count }, (_, n) => {
        const p = offset + n * size;
        if (type === 'text') return readText(bytes.subarray(p, p + size));
        if (type === 'number') return size === 4 ? v.getUint32(p, true) : bytes[p];
        if (type === 'festival') return { month: bytes[p], day: bytes[p + 1], name: readText(bytes.subarray(p + 2, p + size)) };
        const value = v.getUint16(p, true);
        if (value >> 12 > 1) fail('节假日标志不兼容');
        return { month: value >> 8 & 15, day: value & 255, work: !!(value >> 12) };
      });
    });
    if (bytes.length > end) {
      if (bytes.length < end + 8 || v.getUint32(end,true)!==0x314e5645 || v.getUint16(end+6,true)!==32 ||
          bytes.length !== end+8+v.getUint16(end+4,true)*32) fail('Bảng sự kiện không hợp lệ');
      model.events=Array.from({length:v.getUint16(end+4,true)},(_,i)=>{const p=end+8+i*32;return [v.getUint32(p,true),readText(bytes.subarray(p+4,p+32))];});
    }
    encodeCalendar(model); // Apply the same semantic checks to imported data.
    return model;
  }

  const modes = [1,1,1,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3];
  const kinds = [1,1,3,2,2,2,1,1,3,1,2,4,2,1,1,2,4,2,1];
  const fields = ['x', 'y', 'width', 'height', 'value0', 'value1'];
  function validateComponent(c, i) {
    if (c.id !== i + 1 || c.mode !== modes[i] || c.kind !== kinds[i] || c.flags !== 0)
      fail(`组件 ${i + 1} 的 ID、模式、类型和 flags 不能改变`);
    list(c.fonts, 3, 'fonts').forEach(n => { if (![0, 1, 2, 4, 5, 255].includes(n)) fail('Font giao diện không hợp lệ'); });
    fields.forEach(key => integer(c[key], -32768, 32767, key));
    if (c.x < 0 || c.y < 0 || c.width <= 0 || c.height <= 0 || c.x + c.width > 800 || c.y + c.height > 480)
      fail(`组件 ${c.id} 超出 800×480 画布`);
    if ([1, 3].includes(c.kind) && c.fonts[0] === 255) fail(`组件 ${c.id} 缺少主字体`);
    if ([1, 3, 9, 15].includes(c.id) && (c.fonts[1] === 255 || c.fonts[2] === 255)) fail(`组件 ${c.id} 缺少字体`);
    if (c.id === 10 && c.fonts[1] === 255) fail('组件 10 缺少第二字体');
    if (c.id === 1 && (c.value0 < 0 || c.value0 >= 480 || c.value1 < 2 || c.value1 >= 800)) fail('日历标题参数越界');
    if ([7, 10, 14, 19].includes(c.id) && (c.value0 < ([14, 19].includes(c.id) ? c.y : 0) || c.value0 >= 480 || c.value1 < 0 || c.value1 > 800)) fail('文字组件参数越界');
    if (c.id === 15 && (c.value0 < c.y || c.value0 >= 480 || c.value1 < c.x || c.value1 > c.x + c.width)) fail('时钟标题参数越界');
    if (c.kind === 4) {
      const scale = c.value0, digits = c.value1;
      const block = digits * (11 * scale + 2) - 2 * scale;
      const span = 2 * block + (c.mode === 2 ? 4 : 6) * scale;
      const full13=c.id===17&&scale===13;
      if ((!full13 && (scale < 2 || scale > 10 || scale % 2)) || digits !== 2 || c.x % 8 || c.width % 8 ||
          c.height > 282 || span > c.width || 20 * scale + 4 > c.height) fail(`组件 ${c.id} 的时钟几何不兼容`);
    }
  }
  function timeFontGeometry(bytes,index=0) {
    if(!(bytes instanceof Uint8Array)||bytes.length<148)fail('Bộ số giờ chưa đầy đủ');
    if(index===4){
      const first=148+view(bytes).getUint32(8,true);
      if(bytes.length>first){
        const h=bytes.subarray(first,first+8),n=h.length===8?view(h).getUint32(4,true):0;
        if(![68,66,80,49].every((v,i)=>h[i]===v)||n<3860||bytes.length!==first+8+n||![80,72,84,50,1,0,32,3,224,1,2,0,0,0,0,0].every((v,i)=>bytes[first+8+i]===v))fail('Dữ liệu đồng hồ tổng hợp chưa đầy đủ');
        bytes=bytes.slice(0,first);
      }
    }
    const v=view(bytes),signed=n=>n>127?n-256:n;
    if(v.getUint32(0,true)!==0x31474654||bytes[4]!==1||bytes[5]!==11||bytes[6]!==48||bytes[7]||v.getUint32(12,true)||v.getUint32(8,true)!==bytes.length-148)fail('Bộ số giờ không hợp lệ');
    let next=0,advance=0,top=127,bottom=-128,span=0;
    for(let i=0;i<11;i++){
      const at=16+i*12,w=bytes[at+4],h=bytes[at+5],a=bytes[at+6],x=signed(bytes[at+7]),y=signed(bytes[at+8]),n=Math.ceil(w*h/8);
      if(!w||w>(index?112:80)||!h||h>(index?160:120)||!a||a>(index?128:100)||x<0||x>24||x+w>a||y< -128||y>32||bytes.slice(at+9,at+12).some(n=>n)||v.getUint32(at,true)!==next||n>bytes.length-148-next)fail('Kích thước chữ số giờ không hợp lệ');
      next+=n;if(i<10){if(i&&a!==advance)fail('Các chữ số phải có cùng bước tiến');advance=a;top=Math.min(top,y);bottom=Math.max(bottom,y+h);}else{span=4*advance+a;if(h>bottom-top)fail('Dấu hai chấm quá cao');}
    }
    if(next!==bytes.length-148||bottom<=top||bottom-top>(index?164:150)||(index<2&&span>(index?472:384))||(index===2&&2*advance>244)||(index===3&&span>408)||(index===4&&span>344))fail('Bộ số giờ vượt khung');
    return {span,height:bottom-top,top};
  }
  function validateFaceAssets(bytes){
    if(!(bytes instanceof Uint8Array)||bytes.length<64)fail('Dữ liệu mặt đồng hồ chưa đầy đủ');const v=view(bytes);
    if(v.getUint32(0,true)!==0x31534146||v.getUint16(4,true)!==1||![4,6,9,10,11].includes(v.getUint16(6,true))||v.getUint32(8,true)!==bytes.length||v.getUint32(12,true))fail('Dữ liệu mặt đồng hồ không hợp lệ');
    const count=v.getUint16(6,true);let end=16+count*12;for(let i=0;i<count;i++){const p=16+i*12,at=v.getUint32(p+4,true),n=v.getUint32(p+8,true);if(i===10){if(v.getUint32(p,true)!==11||at!==0x80000110||n<23||n>8192)fail('Font ngày lễ không hợp lệ');continue;}if(v.getUint16(p,true)!==i+1||v.getUint16(p+2,true)||at!==end||n<8||at+n>bytes.length)fail('Chỉ mục tài nguyên mặt đồng hồ bị lỗi');const b=bytes.subarray(at,at+n);end=at+n;
      if(i<2)timeFontGeometry(b,i+1);
      else if(i===2||i>=4){if(n<23||!b[0]||b[0]===255||b[9]>64||b[10]>64||b.slice(2,9).some(x=>x<1||x>8))fail('Font thứ không hợp lệ');}
      else if(new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(0,true)!==0x314b4251||b[4]!==1||b[5]!==100||b[6]||b[7])fail('Kho danh ngôn không hợp lệ');
    }if(end!==bytes.length)fail('Tài nguyên mặt đồng hồ có dữ liệu thừa');
  }
  function encodeUI(model) {
    const components = list(model.components, 19, 'components'), bytes = new Uint8Array(396), v = view(bytes);
    v.setUint32(0, 0x31524955, true);
    [1, 19, 800, 480, 20, 0].forEach((n, i) => v.setUint16(4 + i * 2, n, true));
    components.forEach((c, i) => {
      validateComponent(c, i);
      const at = 16 + 20 * i;
      bytes.set([c.mode, c.id, c.kind, c.flags, ...c.fonts, 0], at);
      fields.forEach((key, j) => v.setInt16(at + 8 + j * 2, c[key], true));
    });
    if(model.timeFont){const font=timeFontGeometry(model.timeFont),c=components[11];if(c.width<font.span||c.height<font.height)fail('Khung giờ nhỏ hơn bộ chữ số');if(model.faceAssets)validateFaceAssets(model.faceAssets);const out=new Uint8Array(bytes.length+model.timeFont.length+(model.faceAssets?.length||0));out.set(bytes);out.set(model.timeFont,396);if(model.faceAssets)out.set(model.faceAssets,396+model.timeFont.length);return out;}
    return bytes;
  }
  function decodeUI(bytes) {
    const v = view(bytes);
    if (bytes.length < 396 || v.getUint32(0, true) !== 0x31524955 ||
        [1,19,800,480,20,0].some((n, i) => v.getUint16(4 + 2 * i, true) !== n)) fail('不支持的 UIR1 资源');
    const model = { components: Array.from({ length: 19 }, (_, i) => {
      const at = 16 + 20 * i;
      if (bytes[at + 7]) fail('组件 reserved 必须为 0');
      const c = { mode: bytes[at], id: bytes[at + 1], kind: bytes[at + 2], flags: bytes[at + 3], fonts: Array.from(bytes.subarray(at + 4, at + 7)) };
      fields.forEach((key, j) => { c[key] = v.getInt16(at + 8 + j * 2, true); }); return c;
    }) };
    if(bytes.length>396){if(bytes.length<544)fail('Font giờ thiếu dữ liệu');const n=148+v.getUint32(404,true);if(n>bytes.length-396)fail('Font giờ thiếu dữ liệu');model.timeFont=bytes.slice(396,396+n);if(396+n<bytes.length)model.faceAssets=bytes.slice(396+n);}
    encodeUI(model); return model;
  }

  // Same slot geometry and bounded record walks as the firmware/font_store_tool.
  const legacyMetrics = [[12,12,0,254,8,254,10,255], [16,16,0,254,11,253,12,252], [13,22,0,253,19,251,19,251]];
  const previousMetrics = [[15,18,255,252,14,252,14,252], null, null, null,
    [15,18,255,252,14,252,14,252]];
  const metrics = [[21,23,255,252,15,252,19,252], [24,29,254,250,23,250,23,250], legacyMetrics[2], null,
    [21,23,255,252,15,252,19,252], [24,29,254,250,23,250,23,250]];
  const todoSizes = [9, 12, 16, 20, 24, 32];
  function todoFontGeometry(size) {
    if (!todoSizes.includes(size)) fail('待办字号必须为 9、12、16、20、24 或 32');
    const pixels = Math.ceil(size * 4 / 3), descent = Math.ceil(pixels / 3), overhang = Math.ceil(pixels / 4);
    return [pixels + overhang, pixels + descent, -overhang, -descent, pixels, -descent, pixels, -descent];
  }
  const todoMetrics = todoSizes.map(size => todoFontGeometry(size).map(n => n & 255));
  function validateFont(bytes, slot) {
    integer(slot, 0, 5, '字体槽位');
    if (!(bytes instanceof Uint8Array) || bytes.length < 23 || !bytes[0] || bytes[0] === 255 ||
        !(slot === 3 ? [...metrics.slice(0, 2), previousMetrics[0], ...legacyMetrics.slice(0, 2), ...todoMetrics] : [metrics[slot], previousMetrics[slot], legacyMetrics[slot]].filter(Boolean)).some(metric => metric.every((n, i) => bytes[9 + i] === n)) ||
        Array.from(bytes.subarray(2, 9)).some(n => n < 1 || n > 8)) fail(`字体槽位 ${slot} 的头或几何不兼容`);
    const v = view(bytes), glyphs = new Set();
    const offsets = [17, 19, 21].map(at => 23 + v.getUint16(at));
    if (offsets.some(at => at >= bytes.length)) fail('字体入口越界');
    function walk(start, unicode) {
      const prefix = unicode ? 3 : 2;
      for (let at = start; ; ) {
        if (at + 2 > bytes.length) fail('字体表缺少结束符');
        const code = unicode ? v.getUint16(at) : bytes[at];
        if (unicode && code === 0) return;
        if (at + prefix > bytes.length) fail('字体记录越界');
        const size = bytes[at + prefix - 1];
        if (!unicode && !size) return;
        if (size < prefix || at + size > bytes.length) fail('字体记录长度错误');
        glyphs.add(code); at += size;
      }
    }
    walk(23, false); walk(offsets[0], false); walk(offsets[1], false);
    const table = offsets[2];
    if (table + 4 > bytes.length) fail('Unicode 索引越界');
    const jump = v.getUint16(table), first = v.getUint16(table + 2), start = table + jump;
    if (start >= bytes.length || (first && (first !== 0xffff || jump !== 4))) fail('字体必须使用单个 Unicode 块');
    if (first) walk(start, true);
    return glyphs;
  }
  function decodeFonts(bytes) {
    const v = view(bytes);
    if (bytes.length < 56 || v.getUint32(0, true) !== 0x314b5046 || v.getUint16(4, true) !== 1 || ![3, 4, 6].includes(v.getUint16(6, true)))
      fail('不支持的 FPK1 资源');
    const count = v.getUint16(6, true);
    let end = 8 + count * 16;
    if (bytes.length < end) fail('字体目录不完整');
    const records=[];
    const fonts = Array.from({ length: count }, (_, slot) => {
      const at = 8 + slot * 16, offset = v.getUint32(at, true), length = v.getUint32(at + 4, true);
      const key = v.getUint32(at + 12, true);
      const crc=v.getUint32(at+8,true),alias=records.some(r=>r.offset===offset&&r.length===length&&r.crc===crc);
      if ((offset<end&&!alias)||!length||offset+length>bytes.length||(slot===3?!key:key))fail('字体目录越界或重叠');
      records.push({offset,length,crc});end=Math.max(end,offset+length);
      const font=bytes.slice(offset,offset+length);
      if (store.crc32(font) !== v.getUint32(at + 8, true)) fail('字体 CRC 错误');
      validateFont(font, slot); return font;
    });
    if (count >= 4) fonts.customKey = v.getUint32(68, true);
    if(bytes.length>=end+12&&v.getUint32(bytes.length-12,true)===0x31444e52){
      const at=v.getUint32(bytes.length-8,true),n=v.getUint32(bytes.length-4,true);
      if(at<end||n!==bytes.length-12-at)fail('Dữ liệu chữ số bo tròn chưa hợp lệ');
      if(at>end){
        const footer=at-12;
        if(footer<end||v.getUint32(footer,true)!==0x31544744||v.getUint32(footer+4,true)!==end||v.getUint32(footer+8,true)!==footer-end)fail('Bộ số đồng hồ lịch 3 chưa hợp lệ');
        fonts.digital=bytes.slice(end,footer);timeFontGeometry(fonts.digital,4);
      }
      fonts.rounded=bytes.slice(at,at+n);timeFontGeometry(fonts.rounded,3);
    }else if(bytes.length!==end)fail('Phần bổ sung bộ số bị thiếu hoặc sai định dạng');
    return fonts;
  }
  function encodeFonts(fonts) {
    list(fonts, null, 'fonts');
    if (![3, 4, 6].includes(fonts.length)) fail('Cần 3, 4 hoặc 6 font');
    if (fonts.length >= 4) integer(fonts.customKey, 1, 0xffffffff, '待办字体标识');
    fonts.forEach(validateFont);
    const directorySize = 8 + fonts.length * 16;
    if(fonts.rounded)timeFontGeometry(fonts.rounded,3);
    if(fonts.digital){if(!fonts.rounded)fail("Thiếu bộ số nền");timeFontGeometry(fonts.digital,4);}
    const dedup=fonts.digital&&[68,66,80,49].every((n,i)=>fonts.digital[148+view(fonts.digital).getUint32(8,true)+i]===n);
    const aliases=fonts.map((b,i)=>dedup?fonts.findIndex((a,j)=>j<i&&a.length===b.length&&a.every((v,k)=>v===b[k])):-1);
    const baseSize=directorySize+fonts.reduce((n,b,i)=>n+(aliases[i]<0?b.length:0),0);
    const digitalSize=fonts.digital?fonts.digital.length+12:0;
    const bytes = new Uint8Array(baseSize+digitalSize+(fonts.rounded?fonts.rounded.length+12:0)), v = view(bytes);
    v.setUint32(0, 0x314b5046, true); v.setUint16(4, 1, true); v.setUint16(6, fonts.length, true);
    let offset = directorySize;
    fonts.forEach((b, i) => {
      const at=aliases[i]<0?offset:v.getUint32(8+aliases[i]*16,true);
      [at,b.length,store.crc32(b),i===3?fonts.customKey:0].forEach((n,j)=>v.setUint32(8+i*16+j*4,n,true));
      if(aliases[i]<0){bytes.set(b,offset);offset+=b.length;}
    });
    if(fonts.digital){bytes.set(fonts.digital,baseSize);const f=baseSize+fonts.digital.length;v.setUint32(f,0x31544744,true);v.setUint32(f+4,baseSize,true);v.setUint32(f+8,fonts.digital.length,true);}
    if(fonts.rounded){const at=baseSize+digitalSize;bytes.set(fonts.rounded,at);v.setUint32(bytes.length-12,0x31444e52,true);v.setUint32(bytes.length-8,at,true);v.setUint32(bytes.length-4,fonts.rounded.length,true);}
    return bytes;
  }
  function fontKey(family, sourceSlot) {
    integer(sourceSlot, 0, 1, '待办基础字号');
    return store.crc32(encoder.encode(`${sourceSlot}:${family.trim()}`)) || 1;
  }
  function todoFontKey(family, size, bold = false, italic = false) {
    todoFontGeometry(size);
    if (typeof family !== 'string' || typeof bold !== 'boolean' || typeof italic !== 'boolean')
      fail('待办字体名称或字形设置无效');
    return store.crc32(encoder.encode(`todo-v3:${size}:${bold ? 1 : 0}:${italic ? 1 : 0}:${family.trim()}`)) || 1;
  }
  function wrap(id, payload, revision, builtAt = Math.floor(Date.now() / 1000)) {
    integer(id, 1, 255, '分区 ID');
    if (!(payload instanceof Uint8Array) || !payload.length || payload.length > 524256) fail('资源载荷长度无效');
    integer(revision, 0, 0xffffffff, '资源版本'); integer(builtAt, 0, 0xffffffff, '生成时间');
    const bytes = new Uint8Array(44 + payload.length), v = view(bytes), end = 32 + payload.length;
    [0x31535245, 0x10000 | id, revision, payload.length, store.crc32(payload), 524288].forEach((n, i) => v.setUint32(i * 4, n, true));
    v.setUint32(24, store.crc32(bytes.subarray(0, 24)), true); v.setUint32(28, 0xa55ac33c, true);
    bytes.set(payload, 32);
    v.setUint32(end, 0x54535245, true); v.setUint32(end + 4, builtAt, true);
    v.setUint32(end + 8, store.crc32(bytes.subarray(end, end + 8)), true);
    return bytes;
  }
  function open(bundle) {
    const payload = id => bundle.packages.find(item => item.pack.id === id).pack.payload;
    return { calendar: decodeCalendar(payload(5)), ui: decodeUI(payload(6)), fonts: decodeFonts(payload(7)) };
  }
  function build(bundle, model, builtAt) {
    const payloads = new Map([[5, encodeCalendar(model.calendar)], [6, encodeUI(model.ui)], [7, encodeFonts(model.fonts)]]);
    const entries = bundle.packages.map(item => {
      const next = payloads.get(item.pack.id), old = item.pack.payload;
      if (!next || (next.length === old.length && next.every((n, i) => n === old[i])))
        return { name: item.name, bytes: item.bytes.slice() };
      const bytes = wrap(item.pack.id, next, item.pack.revision + 1, builtAt);
      store.validateTarget(store.parsePackage(bytes), bundle.partitions);
      return { name: item.name, bytes };
    });
    return store.prepareBundle(entries);
  }
  const api = { encodeCalendar, decodeCalendar, encodeUI, decodeUI, validateFont, encodeFonts, decodeFonts, fontKey, todoFontGeometry, todoFontKey, wrap, open, build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EPDResourceBuilder = api;
})(globalThis);
