'use strict';

const personalQuoteLimit = 50;
const personalQuoteSize = 128;
let personalQuoteSnapshot = null;
let personalQuoteSession = -1;

function personalQuoteControls() {
    const connected = !!gatt?.connected && !!cap;
    const writable = connected && firmware >= 0xb4 && cap.present && cap.safe;
    const ready = writable && cap.ready && cap.crc === Font420Bundle.crc32;
    $('personalQuoteRead').disabled = !writable || busy;
    $('personalQuoteSave').disabled = $('personalQuoteOpen').disabled = !ready || busy;
    $('personalQuotes').disabled = $('personalQuoteMode').disabled = busy;
    if (!connected) {
        personalQuoteSession = -1;
        $('personalQuoteStatus').textContent = 'Kết nối đồng hồ để lưu danh sách.';
    } else if (personalQuoteSession !== session) {
        personalQuoteSession = session;
        $('personalQuoteStatus').textContent = firmware < 0xb4
            ? 'Cập nhật phần mềm để lưu câu riêng.'
            : !writable ? 'Đồng hồ chưa lưu được câu riêng. Kết nối lại rồi thử tiếp.'
            : !ready ? 'Vào Cài đặt, chọn Cài chữ và mặt đồng hồ trước.'
            : 'Đọc các câu đã lưu trên đồng hồ hoặc nhập danh sách mới.';
    }
}

function personalQuoteEntries() {
    return $('personalQuotes').value.split(/\r?\n/u).map(text => text.trim()).filter(Boolean);
}

function layoutPersonalQuote(text) {
    const words = text.normalize('NFC').replace(/[“”]/gu, '"').replace(/[‘’]/gu, "'")
        .replace(/[–—]/gu, '-').replace(/…/gu, '...').split(/\s+/u);
    const lines = [];
    let line = '';
    for (const word of words) {
        if (countdownWidth(word, 1) > 230) throw Error('Có từ dài quá chiều rộng màn.');
        const candidate = line ? line + ' ' + word : word;
        if (countdownWidth(candidate, 1) > 230) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    lines.push(line);
    if (lines.length > 3) throw Error('Dài quá ba dòng trên màn.');
    return lines;
}

function updatePersonalQuotePreview() {
    const entries = personalQuoteEntries();
    $('personalQuoteCount').textContent = entries.length + ' / ' + personalQuoteLimit + ' câu';
    const preview = $('personalQuotePreview');
    preview.hidden = !entries.length;
    if (!entries.length) return;
    try { preview.textContent = layoutPersonalQuote(entries[0]).join('\n'); }
    catch (error) { preview.textContent = 'Câu đầu tiên. ' + error.message; }
}

function packPersonalQuotes() {
    const entries = personalQuoteEntries();
    if (entries.length > personalQuoteLimit) throw Error('Danh sách vượt quá 50 câu.');
    const personalOnly = $('personalQuoteMode').value === '1';
    if (personalOnly && !entries.length) throw Error('Nhập ít nhất một câu để dùng chế độ chỉ hiện câu của tôi.');
    const data = new Uint8Array(1 + entries.length * personalQuoteSize);
    data[0] = Number(personalOnly);
    const encoder = new TextEncoder();
    for (const [i, entry] of entries.entries()) {
        try {
            const lines = layoutPersonalQuote(entry);
            while (lines.length < 3) lines.push('');
            const record = encoder.encode(lines.join('\0') + '\0');
            if (record.length > personalQuoteSize) throw Error('Nội dung quá dài để lưu.');
            data.set(record, 1 + i * personalQuoteSize);
        } catch (error) {
            throw Error('Câu ' + (i + 1) + '. ' + error.message);
        }
    }
    return data;
}

async function personalQuoteInfo() {
    const reply = await request(56);
    if (reply.length !== 11) throw Error('Phản hồi danh ngôn chưa hợp lệ.');
    const length = reply[9] | (reply[10] << 8);
    if (length && ((length - 1) % personalQuoteSize || length > 1 + personalQuoteLimit * personalQuoteSize))
        throw Error('Danh sách đã lưu có kích thước chưa hợp lệ.');
    return {length, crc:value32(reply,5), session};
}

function personalQuoteProgress(message) {
    let previous = -10;
    return (done, total) => {
        const percent = Math.floor(done * 100 / total);
        if (percent === 100 || percent - previous >= 10) {
            previous = percent;
            $('personalQuoteStatus').textContent = message + ' · ' + percent + '%';
        }
    };
}

function personalQuoteAction(fn) {
    return action(async () => {
        try { await fn(); }
        catch (error) {
            if (gatt?.connected) $('personalQuoteStatus').textContent = 'Chưa hoàn tất. ' + customerError(error);
            throw error;
        }
    });
}

$('personalQuotes').oninput = updatePersonalQuotePreview;
$('personalQuoteRead').onclick = () => personalQuoteAction(async () => {
    const info = await personalQuoteInfo();
    const data = new Uint8Array(info.length);
    const progress = personalQuoteProgress('Đang đọc danh sách');
    for (let at = 0; at < data.length;) {
        const reply = await request(61, Uint8Array.of(at, at >> 8));
        const part = reply.subarray(7);
        if ((reply[5] | reply[6] << 8) !== at || !part.length || part.length > data.length - at)
            throw Error('Chưa đọc đủ câu đã lưu.');
        data.set(part, at);
        at += part.length;
        progress(at, data.length);
    }
    if (data.length && (data[0] > 1 || crc32(data) !== info.crc)) throw Error('Dữ liệu đọc về chưa qua kiểm tra.');
    const decoder = new TextDecoder('utf-8', {fatal:true});
    const entries = [];
    for (let at = 1; at < data.length; at += personalQuoteSize)
        entries.push(decoder.decode(data.slice(at, at + personalQuoteSize)).split('\0').slice(0,3).filter(Boolean).join(' '));
    $('personalQuotes').value = entries.join('\n');
    $('personalQuoteMode').value = String(data[0] || 0);
    personalQuoteSnapshot = info;
    updatePersonalQuotePreview();
    $('personalQuoteStatus').textContent = entries.length ? 'Đã đọc ' + entries.length + ' câu từ đồng hồ.' : 'Đồng hồ chưa có câu riêng.';
});

$('personalQuoteSave').onclick = () => personalQuoteAction(async () => {
    const data = packPersonalQuotes(), checksum = crc32(data);
    const info = await personalQuoteInfo();
    const count = (data.length - 1) / personalQuoteSize;
    if (info.length !== data.length || info.crc !== checksum) {
        if (info.length > 1 && (personalQuoteSnapshot?.session !== session ||
            personalQuoteSnapshot.length !== info.length || personalQuoteSnapshot.crc !== info.crc))
            throw Error('Đồng hồ đã có câu riêng. Bấm Đọc câu đã lưu rồi chỉnh sửa danh sách.');
        if (!count && info.length > 1 && !window.confirm('Xóa danh sách câu riêng và dùng lại câu mẫu?')) return;
        await writeSavedObject(57, data, personalQuoteProgress('Đang lưu danh sách'));
    }
    const saved = await personalQuoteInfo();
    if (saved.length !== data.length || saved.crc !== checksum) throw Error('Đồng hồ chưa xác nhận danh sách mới.');
    personalQuoteSnapshot = saved;
    $('personalQuoteStatus').textContent = count ? 'Đã lưu ' + count + ' câu riêng.' : 'Đã chuyển về câu mẫu.';
    await openQuoteClock();
});

$('personalQuoteOpen').onclick = () => action(openQuoteClock);
updatePersonalQuotePreview();
personalQuoteControls();
