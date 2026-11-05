/* Additive LED UI: existing clock/image/countdown/DFU transports stay unchanged. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
const identities = {58:0x10,60:0x10,61:0x10,65:0x20,66:0x40,67:0x80,127:0x20,128:0x20,129:0x20,130:0x20,131:0x20,132:0x40,135:0x10,136:0x80,137:0x20,138:0x40,139:0x20,140:0x40,141:0x20,142:0x40,143:0x20,144:0x40,145:0x10,146:0x80,147:0x10,148:0x80,157:0x10,158:0x80,167:0x10,168:0x80,170:0x10,171:0x80,172:0x10,173:0x80,176:0x10,177:0x80,149:0x20,150:0x40,151:0x20,152:0x40,153:0x20,154:0x40,155:0x20,156:0x40,159:0x20,160:0x40,161:0x20,162:0x40,163:0x20,164:0x40,165:0x20,166:0x40,174:0x20,175:0x40,178:0x20,179:0x20,180:0x20,181:0x20,182:0x40,183:0x10,184:0x80,185:0x20,186:0x40,187:0x10,188:0x80,189:0x20,190:0x40,191:0x10,192:0x80,193:0x20,194:0x40,195:0x10,196:0x80,197:0x20,198:0x40,232:0x20,236:0x20,242:0x20,246:0x20,250:0x20,233:0x40,237:0x40,243:0x40,247:0x40,251:0x40,234:0x10,238:0x10,244:0x10,248:0x10,252:0x10,235:0x80,239:0x80,241:0x80,245:0x80,249:0x80,253:0x80};
    const modelNames = {61:'CE 2.9',65:'CE 2.13',66:'no CE 2.13',67:'no CE 2.9'};
    const buttons = Array.from(document.querySelectorAll('[data-led-mode]'));
    let channel = null, waiter = null, ready = false, busy = false, epoch = 0, features = 0;
    let finishTimer = null;
    function status(message) { $('led-status').textContent = message; }
    function log(message) {
        const target = $('led-log');
        target.textContent += `${new Date().toLocaleTimeString('vi-VN')} ${typeof t==='function'?t(message):message}\n`;
        target.scrollTop = target.scrollHeight;
    }
    function controls() {
        // requireDevice and the probe validate identity; feature bits describe supported commands.
        const bootDisabled = busy || !ready || !(features & 4);
        ['led-boot-color','led-boot-preview','led-boot-save'].forEach(id => {$(id).disabled = bootDisabled;});
        const hourDisabled = busy || !ready || !(features & 8);
        ['led-hour-enabled','led-hour-color','led-hour-save'].forEach(id => {$(id).disabled = hourDisabled;});
        $('led-probe').disabled = busy;
        $('led-stop').disabled = busy || !ready;
        $('led-duration').disabled = busy;
        $('led-custom-start').disabled = busy || !ready || !(features & 1);
        ['led-custom-style','led-custom-on','led-custom-off','led-custom-duration',
            'led-a-red','led-a-green','led-a-blue','led-b-red','led-b-green','led-b-blue',
            'led-c-red','led-c-green','led-c-blue']
            .forEach(id => {$(id).disabled = busy;});
        buttons.forEach(button => {button.disabled = busy || !ready;});
    }
    function reset() {
        epoch++;
        clearTimeout(finishTimer);
        if (channel) channel.removeEventListener('characteristicvaluechanged', receive);
        channel = null; ready = false; busy = false; features = 0;
        $('led-boot-color').value = '18';
        $('led-hour-enabled').checked = false;
        $('led-hour-color').value = '18';
        $('led-hour-status').textContent = 'Chưa đọc thiết lập đầu giờ. Bấm kiểm tra hỗ trợ sau khi kết nối.';
        $('led-boot-status').textContent = 'Chưa đọc màu đèn báo. Kết nối đồng hồ rồi bấm kiểm tra hỗ trợ.';
        if (waiter) {const request = waiter; waiter = null; request.reject(new Error('Kết nối đã thay đổi.'));}
        controls(); status('Chưa kiểm tra hỗ trợ. Kết nối đồng hồ rồi bấm kiểm tra.');
    }
    window.LedEffectsUi = {reset};
    function receive(event) {
        const data = event.target.value;
        if (data.byteLength !== 4 || data.getUint8(0) !== 0xE8 || !waiter) return;
        if (waiter.mode !== 0xFF && data.getUint8(2) !== waiter.mode) return;
        const request = waiter; waiter = null;
        const errors = {1:'Lệnh hiệu ứng không hợp lệ.', 2:'Không thể bật đèn trên đồng hồ này. Hãy liên hệ hỗ trợ.',
            3:'Bộ hẹn giờ LED chưa sẵn sàng.', 4:'Đang trong lịch ngủ. Hãy thử ngoài giờ ngủ.'};
        const code = data.getUint8(1);
        if (request.mode === 7 || request.mode === 0xFD) {
            const value = data.getUint8(3);
            if ((code === 0 || code === 5) && [16,17,18].includes(value & 0x7f))
                request.resolve({state:code, value});
            else request.reject(new Error(code === 6 ? 'Không ghi được thiết lập đầu giờ. Chờ vài giây rồi lưu lại.' :
                code === 7 ? 'Thiết bị đang lưu thiết lập đầu giờ. Chờ vài giây rồi thử lại.' : 'Phản hồi đầu giờ không hợp lệ.'));
            return;
        }
        if (request.mode === 6 || request.mode === 0xFE) {
            if ((code === 0 || code === 5) && [16,17,18].includes(data.getUint8(3)))
                request.resolve({state:code, pin:data.getUint8(3)});
            else request.reject(new Error(code === 6 ? 'Không ghi được màu vào bộ nhớ. Chờ vài giây rồi lưu lại.' :
                code === 7 ? 'Thiết bị đang lưu màu. Chờ vài giây rồi thử lại.' : 'Phản hồi màu đèn báo không hợp lệ.'));
            return;
        }
        if (code === 0) {
            const identity=nrf52FirmwareVersion>=254 ? (nrf52PanelProfile===0x21 ? ([254,256,258,260,262,264,266,268,270,272,274,276,278,280,282,283,285,287].includes(nrf52FirmwareVersion)?0x20:0x40) : nrf52PanelProfile===0x29 ? ([254,256,258,260,262,264,266,268,270,272,274,276,278,280,282,283,285,287].includes(nrf52FirmwareVersion)?0x10:0x80) : undefined) : identities[nrf52FirmwareVersion];
            if (request.mode === 0xFF && identity !== undefined && (data.getUint8(3) & 0xF0) !== identity) {
                request.reject(new Error('Đồng hồ chưa xác nhận hỗ trợ điều khiển đèn. Vui lòng kiểm tra lại.'));
                return;
            }
            if (request.mode === 0xFF) features = data.getUint8(3);
            request.resolve(data.getUint8(2));
        }
        else request.reject(new Error(errors[code] || `Không thể điều khiển đèn. Hãy thử lại.`));
    }
    function requireDevice() {
        if (typeof deviceProtocol === 'undefined' || deviceProtocol !== 'nrf52' ||
            typeof epdCharacteristic === 'undefined' || !epdCharacteristic ||
            typeof bleDevice === 'undefined' || !bleDevice?.gatt?.connected)
            throw new Error('Hãy kết nối đồng hồ ở thẻ cài đặt trước.');
        const supported213 = nrf52ModelId === 2 && nrf52PanelProfile === 0x21 && [52,54,56,65,66,127,128,129,130,131,132,137,138,139,140,141,142,143,144,149,150,151,152,153,154,155,156,159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194,232,233,236,237,242,243,246,247,250,251,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288].includes(nrf52FirmwareVersion);
        const supported290 = typeof nrf52ModelId !== 'undefined' && nrf52ModelId === 2 &&
            nrf52PanelProfile !== 0x21 && [58,60,61,67,135,136,145,146,147,148,157,158,167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288].includes(nrf52FirmwareVersion) &&
            (![135,136,145,146,147,148,157,158,167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,207,208,211,212,215,216,221,222,225,226,230,231,234,235,238,239,244,241,245,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,266,268,270,272,274,276,278,279,280,281,282,283,284,285,286,287,288].includes(nrf52FirmwareVersion) || nrf52PanelProfile===0x29);
        if (!supported213 && !supported290)
            throw new Error('Đồng hồ đang kết nối chưa hỗ trợ điều khiển đèn. Các chức năng khác vẫn dùng bình thường.');
        if ((typeof clockImageUploadBusy !== 'undefined' && clockImageUploadBusy) || window.countdownOperationBusy || window.VNDataBusy?.())
            throw new Error('Đang truyền ảnh hoặc lưu đếm ngược. Chờ thao tác đó hoàn tất.');
        if (ready && channel !== epdCharacteristic) {
            reset(); throw new Error('Đã đổi thiết bị. Bấm kiểm tra hỗ trợ lại.');
        }
        return epdCharacteristic;
    }
    async function exchange(mode, seconds = 0, custom = null) {
        const activeChannel = requireDevice();
        if (waiter) throw new Error('Đang chờ phản hồi LED.');
        let resolve, reject;
        const response = new Promise((yes, no) => {resolve = yes; reject = no;});
        response.catch(() => {});
        const request = {mode, resolve, reject}; waiter = request;
        const timer = setTimeout(() => {
            if (waiter === request) {waiter = null; reject(new Error('Đồng hồ chưa phản hồi. Hãy kiểm tra kết nối rồi thử lại.'));}
        }, 3500);
        try {
            await activeChannel.writeValueWithResponse(new Uint8Array([0xE8, 0x4C, mode, seconds, ...(custom || [])]));
            return await response;
        } finally {clearTimeout(timer); if (waiter === request) waiter = null;}
    }
    $('led-probe').addEventListener('click', async () => {
        reset(); busy = true; controls();
        try {
            channel = requireDevice();
            channel.addEventListener('characteristicvaluechanged', receive);
            await exchange(0xFF);
            ready = true;
            status((features & 2) ? 'Sẵn sàng điều khiển đèn. Bạn có thể chọn màu và chạy luân phiên A → B → C.' :
                (features & 1) ? 'Đồng hồ hỗ trợ tối đa 2 nhóm màu. Chọn một nhóm hoặc luân phiên A → B.' :
                'Đồng hồ hỗ trợ SOS và cảnh sát; chưa hỗ trợ tự chỉnh màu.');
            log(`Đã kiểm tra đèn; tự chỉnh màu: ${(features & 1) ? 'có' : 'chưa hỗ trợ'}.`);
            if (features & 4) {
                try {
                    const saved = await waitForBootSave();
                    $('led-boot-color').value = String(saved.pin);
                    $('led-boot-status').textContent = `Màu đang lưu: ${bootName(saved.pin)}.`;
                } catch (error) { $('led-boot-status').textContent = error.message; }
            } else $('led-boot-status').textContent = 'Đồng hồ chưa hỗ trợ lưu màu đèn báo. Bạn vẫn có thể dùng các hiệu ứng đang có.';
            if (features & 8) {
                try {
                    const saved = await waitForHourSave();
                    $('led-hour-enabled').checked = !!(saved.value & 0x80);
                    $('led-hour-color').value = String(saved.value & 0x7f);
                    $('led-hour-status').textContent = hourDescription(saved.value);
                } catch (error) { $('led-hour-status').textContent = error.message; }
            } else $('led-hour-status').textContent = 'Đồng hồ chưa hỗ trợ báo đầu giờ. Các chức năng đèn khác vẫn dùng được.';
        } catch (error) {reset(); status(error.message); log(error.message);}
        finally {busy = false; controls();}
    });
    async function run(mode) {
        busy = true; controls();
        const ownEpoch = epoch;
        try {
            if (!ready) throw new Error('Bấm kiểm tra hỗ trợ trước.');
            if (mode === 5 && (!(features & 1) || ![0x36,0x38,0x3A,0x3C,0x3D,0x41,0x42,0x43,127,128,129,130,131,132,135,136,137,138,139,140,141,142,143,144,145,146,147,148,157,158,167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,149,150,151,152,153,154,155,156,159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194].includes(nrf52FirmwareVersion)))
                throw new Error('Đồng hồ chưa hỗ trợ tự chỉnh màu đèn.');
            const selection = mode === 5 ? readCustom(true) : null;
            if (selection?.triple && (!(features & 2) || ![0x38,0x3A,0x3C,0x3D,0x41,0x42,0x43,127,128,129,130,131,132,135,136,137,138,139,140,141,142,143,144,145,146,147,148,157,158,167,168,170,171,172,173,176,177,183,184,187,188,191,192,195,196,149,150,151,152,153,154,155,156,159,160,161,162,163,164,165,166,174,175,178,179,180,181,182,185,186,189,190,193,194].includes(nrf52FirmwareVersion)))
                throw new Error('Đồng hồ chưa hỗ trợ 3 nhóm màu. Hãy chọn một nhóm hoặc luân phiên A → B.');
            const seconds = selection ? selection.seconds : mode >= 3 ? Number($('led-duration').value) : 0;
            await exchange(mode, seconds, selection?.parameters);
            clearTimeout(finishTimer);
            const names = ['Dừng', 'Xanh lá thành công', 'Đỏ hết đếm ngược', 'SOS đỏ', 'Cảnh sát đỏ / xanh', 'Màu tự chọn'];
            const message = selection ? `Đang chạy: ${selection.description}. Tự dừng sau ${seconds} giây.` :
                mode >= 3 ? `${names[mode]} đang chạy, tự dừng sau ${seconds} giây.` : `Đã thử ${names[mode].toLowerCase()}.`;
            status(message); log(message);
            finishTimer = setTimeout(async () => {
                if (epoch !== ownEpoch || !ready || busy) return;
                busy = true; controls();
                try {
                    const actual = await exchange(0xFF);
                    if (actual === 0) status('Đã xác nhận hiệu ứng đã kết thúc, đèn trở về trạng thái bình thường.');
                    else status('Hiệu ứng hoặc đèn báo tự động đang chạy. Có thể bấm Dừng.');
                } catch (error) {status(error.message); log(error.message);}
                finally {busy = false; controls();}
            }, mode >= 3 ? seconds * 1000 + 200 : 650);
        } catch (error) {status(error.message); log(error.message);}
        finally {busy = false; controls();}
    }
    buttons.forEach(button => button.addEventListener('click', () => run(Number(button.dataset.ledMode))));
    function bootName(pin) { return ({16:'Đỏ',17:'Xanh lá',18:'Xanh nước biển'})[pin]; }
    async function waitForBootSave() {
        for (let i = 0; i < 20; i++) {
            const result = await exchange(0xFE);
            if (result.state === 0) return result;
            await new Promise(resolve => setTimeout(resolve, 400));
        }
        throw new Error('Chưa xác nhận đã lưu màu. Chờ vài giây rồi bấm kiểm tra hỗ trợ lại.');
    }
    async function bootAction(save) {
        if (busy) return;
        const ownEpoch = epoch;
        busy = true; controls();
        try {
            if (!ready || !(features & 4))
                throw new Error('Hãy kiểm tra hỗ trợ đèn trước. Nếu không hỗ trợ lưu màu, bạn vẫn có thể dùng các hiệu ứng khác.');
            const pin = Number($('led-boot-color').value);
            if (![16,17,18].includes(pin)) throw new Error('Màu không hợp lệ.');
            if (save) {
                $('led-boot-status').textContent = 'Đang lưu màu vào đồng hồ…';
                const initial = await exchange(6, pin);
                const result = initial.state === 0 ? initial : await waitForBootSave();
                if (epoch !== ownEpoch) return;
                if (result.pin !== pin) throw new Error('Thiết bị chưa xác nhận đúng màu đã chọn. Hãy lưu lại.');
                $('led-boot-status').textContent = `Đã lưu ${bootName(pin)}. Đồng hồ sẽ dùng màu này khi khởi động, kết nối và chuyển chế độ.`;
                log(`Đã lưu màu đèn báo: ${bootName(pin)}.`);
            } else {
                await exchange(5, 1, [1 << (pin - 16), 0, 1, 9]);
                if (epoch !== ownEpoch) return;
                $('led-boot-status').textContent = `Đã thử ${bootName(pin)} bằng một nhịp 0,1 giây; chưa thay đổi màu đã lưu.`;
            }
        } catch (error) { if (epoch === ownEpoch) $('led-boot-status').textContent = error.message; }
        finally { if (epoch === ownEpoch) {busy = false; controls();} }
    }
    $('led-boot-preview').addEventListener('click', () => bootAction(false));
    $('led-boot-save').addEventListener('click', () => bootAction(true));
    function hourDescription(value) {
        return `Đang lưu: ${value & 0x80 ? 'Bật' : 'Tắt'} — ${bootName(value & 0x7f)}. Thiết lập vẫn giữ khi tháo/lắp pin.`;
    }
    async function waitForHourSave() {
        for (let i = 0; i < 20; i++) {
            const result = await exchange(0xFD);
            if (result.state === 0) return result;
            await new Promise(resolve => setTimeout(resolve, 400));
        }
        throw new Error('Chưa xác nhận đã lưu thiết lập đầu giờ. Chờ vài giây rồi kiểm tra lại.');
    }
    $('led-hour-save').addEventListener('click', async () => {
        if (busy) return;
        const ownEpoch = epoch;
        busy = true; controls();
        try {
            if (!ready || !(features & 8))
                throw new Error('Hãy kiểm tra hỗ trợ đèn trước. Chức năng báo đầu giờ chỉ dùng được khi đồng hồ hỗ trợ.');
            const pin = Number($('led-hour-color').value);
            if (![16,17,18].includes(pin)) throw new Error('Màu không hợp lệ.');
            const value = pin | ($('led-hour-enabled').checked ? 0x80 : 0);
            $('led-hour-status').textContent = 'Đang lưu thiết lập đầu giờ…';
            const initial = await exchange(7, value);
            const result = initial.state === 0 ? initial : await waitForHourSave();
            if (epoch !== ownEpoch) return;
            if (result.value !== value) throw new Error('Thiết bị chưa xác nhận đúng thiết lập đã chọn. Hãy lưu lại.');
            $('led-hour-status').textContent = `Đã lưu. ${hourDescription(result.value)}`;
            log(`Đèn đầu giờ: ${value & 0x80 ? 'Bật' : 'Tắt'}, ${bootName(pin)}.`);
        } catch (error) { if (epoch === ownEpoch) $('led-hour-status').textContent = error.message; }
        finally { if (epoch === ownEpoch) {busy = false; controls();} }
    });
    function colorMask(group) {
        return ['red','green','blue'].reduce((mask,color,i) => mask | ($( `led-${group}-${color}` ).checked ? (1 << i) : 0), 0);
    }
    function colorNames(mask) {
        return ['Đỏ','Xanh lá','Xanh nước biển'].filter((color,i) => mask & (1 << i)).join(' + ') || 'Chưa chọn màu';
    }
    function readCustom(validate) {
        const style = $('led-custom-style').value;
        const alternating = style === 'alternate' || style === 'triple';
        const a = colorMask('a'), b = alternating ? colorMask('b') : 0;
        const c = style === 'triple' ? colorMask('c') : 0;
        const on = style === 'steady' ? 1 : Number($('led-custom-on').value);
        const off = style === 'steady' ? 0 : Number($('led-custom-off').value);
        const seconds = Number($('led-custom-duration').value);
        if (validate) {
            if (!['steady','blink','alternate','triple'].includes(style) || !Number.isInteger(seconds) || seconds < 1 || seconds > 30 ||
                !Number.isInteger(on) || on < 1 || on > 20 || !Number.isInteger(off) || off < 0 || off > 20)
                throw new Error('Thông số tự chỉnh không hợp lệ.');
            if (!a) throw new Error('Hãy chọn ít nhất một màu ở nhóm A.');
            if (alternating && !b) throw new Error('Hãy chọn ít nhất một màu ở nhóm B.');
            if (style === 'triple' && !c) throw new Error('Hãy chọn ít nhất một màu ở nhóm C.');
            if (style === 'blink' && off === 0) throw new Error('Kiểu nháy cần thời gian nghỉ lớn hơn 0; chọn kiểu Sáng nếu muốn bật liên tục.');
        }
        const sequence = [a,b,...(style === 'triple' ? [c] : [])].map(colorNames).join(' → ');
        const description = style === 'steady' ? `${colorNames(a)} — sáng` : alternating ?
            `${sequence} → lặp lại; mỗi nhóm sáng ${on / 10}s, nghỉ ${off / 10}s` :
            `${colorNames(a)} — nháy: sáng ${on / 10}s, nghỉ ${off / 10}s`;
        return {seconds, parameters:[a,b,on,off,...(style === 'triple' ? [c] : [])], description, triple:style === 'triple'};
    }
    function previewCustom() {
        const style = $('led-custom-style').value;
        $('led-custom-b').hidden = style !== 'alternate' && style !== 'triple';
        $('led-custom-c').hidden = style !== 'triple';
        $('led-custom-timing').hidden = style === 'steady';
        const selection = readCustom(false);
        $('led-custom-preview').textContent = `${selection.description}. Tự dừng sau ${selection.seconds} giây.`;
    }
    ['led-custom-style','led-custom-on','led-custom-off','led-custom-duration',
        'led-a-red','led-a-green','led-a-blue','led-b-red','led-b-green','led-b-blue',
        'led-c-red','led-c-green','led-c-blue']
        .forEach(id => {$(id).addEventListener('change', previewCustom);});
    $('led-custom-start').addEventListener('click', () => run(5));
    $('led-stop').addEventListener('click', async () => {
        busy = true; controls(); clearTimeout(finishTimer);
        try {await exchange(0); status('Đã dừng hiệu ứng và hủy các nhịp báo đỏ còn lại của lần hết đếm ngược này.'); log('Dừng LED.');}
        catch (error) {status(error.message); log(error.message);}
        finally {busy = false; controls();}
    });
    $('led-clear').addEventListener('click', () => {$('led-log').textContent = '';});
    previewCustom(); controls();
})();
