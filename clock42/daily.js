'use strict';

const sleepIds = ['sleepStart','sleepEnd','sleepSave','sleepDisable','sleepRead'];

function dailyControls() {
    const connected = !!gatt?.connected && !!cap;
    const supported = connected && firmware >= 0xb3;
    for (const id of sleepIds) $(id).disabled = !supported || !cap.present || !cap.safe || busy;
    $('quoteClock').disabled = !supported || !cap.ready || cap.crc !== Font420Bundle.crc32 || busy;
    window.personalQuoteControls?.();
    if (!connected) $('sleepStatus').textContent = 'Kết nối đồng hồ để đọc hẹn giờ đã lưu.';
    else if (!supported) $('sleepStatus').textContent = 'Cập nhật phần mềm để dùng hẹn giờ ngủ.';
    else if (!cap.present || !cap.safe) $('sleepStatus').textContent = 'Chưa nhận được bộ nhớ để lưu hẹn giờ.';
    else if ($('sleepStatus').textContent.startsWith('Kết nối') || $('sleepStatus').textContent.startsWith('Cập nhật'))
        $('sleepStatus').textContent = 'Bấm Đọc hẹn giờ để xem thiết lập đang lưu.';
}

function sleepMinutes(id) {
    const [hours, minutes] = $(id).value.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59)
        throw Error('Nhập đủ giờ ngủ và giờ thức.');
    return hours * 60 + minutes;
}

function sleepTime(minutes) {
    return [Math.floor(minutes / 60), minutes % 60].map(n => String(n).padStart(2, '0')).join(':');
}

async function readSleep() {
    const reply = await request(40);
    if (reply.length !== 9) throw Error('Phản hồi hẹn giờ chưa hợp lệ.');
    const word = value32(reply, 5);
    if ((word & 0x7fff) >= 1440 || word >>> 16 >= 1440) throw Error('Giờ đã lưu chưa hợp lệ.');
    return word;
}

function showSleep(word) {
    const start = sleepTime(word & 0x7fff), end = sleepTime(word >>> 16);
    $('sleepStart').value = start;
    $('sleepEnd').value = end;
    $('sleepStatus').textContent = word & 0x8000 ? 'Đang bật hằng ngày từ ' + start + ' đến ' + end + '.' : 'Hẹn giờ ngủ đang tắt.';
}

function sleepAction(fn) {
    return action(async () => {
        try { await fn(); }
        catch (error) {
            if (gatt?.connected) $('sleepStatus').textContent = 'Chưa hoàn tất. ' + customerError(error);
            throw error;
        }
    });
}

$('sleepRead').onclick = () => sleepAction(async () => showSleep(await readSleep()));

function saveSleep(enable) {
    return sleepAction(async () => {
        let previous, word;
        if (enable) {
            const start = sleepMinutes('sleepStart'), end = sleepMinutes('sleepEnd');
            if (start === end) throw Error('Giờ ngủ và giờ thức phải khác nhau.');
            if (!window.confirm('Cho màn hình nghỉ từ ' + sleepTime(start) + ' đến ' + sleepTime(end) + ' hằng ngày?')) return;
            word = (end << 16) | 0x8000 | start;
        } else {
            if (!window.confirm('Tắt hẹn giờ ngủ hằng ngày?')) return;
            previous = await readSleep();
            word = previous & ~0x8000;
        }
        previous ??= await readSleep();
        if (word !== previous) {
            $('sleepStatus').textContent = 'Đang lưu hẹn giờ vào đồng hồ…';
            await writeSavedObject(41, u32(word));
        }
        const saved = await readSleep();
        if (saved !== word) throw Error('Đồng hồ chưa xác nhận lịch mới.');
        showSleep(saved);
    });
}

$('sleepSave').onclick = () => saveSleep(true);
$('sleepDisable').onclick = () => saveSleep(false);

function packQuotes() {
    const catalogue = window.DailyQuoteCatalogue;
    if (!Array.isArray(catalogue) || catalogue.length !== 100) throw Error('Chưa mở được bộ 100 câu danh ngôn.');
    const data = new Uint8Array(catalogue.length * 128), encoder = new TextEncoder();
    for (const [i, quote] of catalogue.entries()) {
        const [first = '', second = '', third = ''] = quote.lines;
        const record = encoder.encode([first, second, third, quote.author, ''].join('\0').normalize('NFC'));
        if (!first || !quote.author || quote.lines.length > 3 || record.length > 128)
            throw Error('Câu danh ngôn số ' + (i + 1) + ' chưa vừa bố cục.');
        data.set(record, i * 128);
    }
    return data;
}

async function openQuoteClock() {
    const data = packQuotes();
    const checksum = crc32(data);
    const installed = async () => {
        const reply = await request(48);
        return reply.length === 10 && reply[9] === 1 && value32(reply, 5) === checksum;
    };
    if (!await installed()) {
        status('Đang cài danh ngôn. Giữ kết nối đến khi hoàn tất.');
        let last = 0;
        await writeSavedObject(49, data, (sent, total) => {
            const percent = Math.floor(sent * 100 / total);
            if (percent - last >= 10) { last = percent; status('Đang cài danh ngôn · ' + percent + '%'); }
        });
        if (!await installed()) throw Error('Đồng hồ chưa xác nhận bộ danh ngôn.');
    }
    await sync(13);
    status('Đã mở Đồng hồ danh ngôn. Câu mới hiển thị mỗi ngày.');
}
$('quoteClock').onclick = () => action(openQuoteClock);

dailyControls();
