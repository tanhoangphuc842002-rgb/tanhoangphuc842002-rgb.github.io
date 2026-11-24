'use strict';

const scenePeriods = [
    ['morning', 'buổi sáng'],
    ['noon', 'buổi trưa'],
    ['afternoon', 'buổi chiều'],
    ['night', 'buổi tối'],
];
const artPresetButtons = [];
let photo = null;
let photoRotation = 0;
let photoGeneration = 0;
let photoDecoding = false;
let sendingPhoto = false;

function usesArtwork() {
    return $('photoTarget').value !== 'full';
}

function usesScene() {
    return $('photoTarget').value === 'scene';
}

function updateSceneSample() {
    const [file,label] = scenePeriods[Number($('scenePeriod').value)];
    $('sceneSample').src = 'previews/scene-' + file + '.png';
    $('sceneSample').alt = 'Tranh mẫu ' + label;
    $('sceneSampleCaption').textContent = 'Mẫu ' + label;
}

function renderPhoto() {
    const canvas = $('photoCanvas');
    const photoWidth = usesScene() ? 240 : 400;
    const photoHeight = usesScene() ? 152 : usesArtwork() ? 150 : 300;
    if (canvas.width !== photoWidth) canvas.width = photoWidth;
    if (canvas.height !== photoHeight) canvas.height = photoHeight;
    const context = canvas.getContext('2d', {willReadFrequently:true});
    context.fillStyle = 'white';
    context.fillRect(0, 0, photoWidth, photoHeight);
    if (!photo) return;

    const turned = photoRotation % 180 !== 0;
    const width = turned ? photo.height : photo.width;
    const height = turned ? photo.width : photo.height;
    const fit = $('photoFit').value === 'cover' ? Math.max : Math.min;
    const scale = fit(photoWidth / width, photoHeight / height);
    context.save();
    context.translate(photoWidth / 2, photoHeight / 2);
    context.rotate(photoRotation * Math.PI / 180);
    context.scale(scale, scale);
    context.drawImage(photo, -photo.width / 2, -photo.height / 2);
    context.restore();

    const blackThreshold = +$('photoBlack').value;
    const redThreshold = +$('photoRed').value;
    const useRed = $('photoColor').value === 'bwr';
    const image = context.getImageData(0, 0, photoWidth, photoHeight);
    for (let at = 0; at < image.data.length; at += 4) {
        const r = image.data[at], g = image.data[at+1], b = image.data[at+2];
        const red = useRed && r >= redThreshold && r > g * 1.35 && r > b * 1.35;
        const light = 0.299*r + 0.587*g + 0.114*b >= blackThreshold ? 255 : 0;
        image.data[at] = red ? 255 : light;
        image.data[at+1] = image.data[at+2] = red ? 0 : light;
    }
    context.putImageData(image, 0, 0);
}

function photoPlanes() {
    const canvas = $('photoCanvas');
    const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const black = new Uint8Array(canvas.width * canvas.height / 8).fill(255);
    const red = black.slice();
    // SSD1619 RAM writes left-to-right within each row. Both inks use zero bits.
    for (let i = 0; i < rgba.length / 4; i++) {
        if (rgba[4*i+1]) continue;
        const plane = rgba[4*i] ? red : black;
        plane[i >> 3] &= ~(0x80 >> (i & 7));
    }
    return [black, red];
}

function photoControls() {
    const connected = !!gatt?.connected && !!cap;
    const scene = usesScene();
    const supported = connected && firmware >= (scene ? 0xb6 : 0xb2);
    const art = usesArtwork();
    $('sendPhoto').disabled = busy || !supported || !photo || photoDecoding || (art && !cap.ready);
    $('restoreArt').disabled = busy || !supported || !cap.ready;
    $('restoreArt').hidden = !art;
    $('changeArt').disabled = $('changeScene').disabled = busy;
    $('enableSeasonArt').disabled = busy || !connected || firmware < 0xb7 || !cap.ready;
    $('seasonArtHint').hidden = !connected || firmware >= 0xb7;
    for (const id of ['photoTarget','photoFile','photoFit','photoColor','photoBlack','photoRed','rotatePhoto','scenePeriod'])
        $(id).disabled = busy;
    for (const button of artPresetButtons) button.disabled = busy;
    $('photoRed').disabled = busy || $('photoColor').value === 'bw';
    const hint = $('photoFirmwareHint');
    hint.hidden = !connected || (supported && (!art || cap.ready));
    hint.textContent = supported ? 'Vào Cài đặt, chọn Cài chữ và mặt đồng hồ trước.' :
        'Cập nhật phần mềm để ' + (scene ? 'thay cảnh theo giờ.' : 'gửi ảnh.');
}

function photoDisconnected() {
    if (!sendingPhoto) return;
    sendingPhoto = false;
    $('photoStatus').textContent = 'Tải ảnh hoặc tranh chưa hoàn tất. Kết nối lại rồi thử gửi lần nữa.';
}

async function loadPhoto(file, selectedPreset) {
    if (!file) return;
    const generation = ++photoGeneration;
    photoDecoding = true;
    photoControls();
    try {
        const image = await createImageBitmap(file);
        if (generation !== photoGeneration) {
            image.close();
            return;
        }
        photo?.close();
        photo = image;
        photoRotation = 0;
        for (const button of artPresetButtons)
            button.setAttribute('aria-pressed', String(button === selectedPreset));
        $('photoProgress').value = 0;
        $('photoStatus').textContent = selectedPreset
            ? 'Đã chọn ' + selectedPreset.textContent + '. Bấm Lưu tranh để gửi lên đồng hồ.'
            : 'Ảnh xem trước đã sẵn sàng.';
        renderPhoto();
    } catch (error) {
        if (generation === photoGeneration) $('photoStatus').textContent = 'Chưa mở được ảnh. Hãy thử ảnh khác, ví dụ ảnh PNG hoặc JPG.';
    } finally {
        if (generation === photoGeneration) {
            photoDecoding = false;
            photoControls();
        }
    }
}

async function writePhotoChunk(packet, connection, token) {
    if (connection !== ch || token !== session || !gatt?.connected) throw Error('Kết nối đã ngắt.');
    await connection.writeValueWithResponse(packet);
    if (connection !== ch || token !== session || !gatt?.connected) throw Error('Kết nối đã ngắt.');
}

async function sendPhoto() {
    if (firmware < 0xb2 || !photo || photoDecoding) throw Error('Cập nhật phần mềm và chọn ảnh trước khi gửi.');
    const connection = ch, token = session;
    const planes = photoPlanes();
    let sent = 0;
    $('photoProgress').value = 0;
    $('photoStatus').textContent = 'Đang chuẩn bị gửi ảnh…';
    sendingPhoto = true;
    let watchdog;
    try {
        const ready = await request(7);
        const chunkSize = ready[5];
        if (ready.length !== 6 || !chunkSize || chunkSize > 180) throw Error('Thiết bị chưa xác nhận sẵn sàng nhận ảnh.');
        for (const [index, data] of planes.entries()) {
            const color = index === 0 ? 0x0f : 0;
            for (let at = 0; at < data.length; at += chunkSize) {
                const payload = data.subarray(at, at + chunkSize);
                const packet = new Uint8Array(payload.length + 2);
                packet.set([0x30, color | (at ? 0xf0 : 0)]);
                packet.set(payload, 2);
                try {
                    await Promise.race([
                        writePhotoChunk(packet, connection, token),
                        new Promise((_, reject) => {
                            watchdog = setTimeout(() => reject(Error('Đồng hồ nhận ảnh quá lâu.')), 12000);
                        }),
                    ]);
                } finally { clearTimeout(watchdog); }
                sent += payload.length;
                const percent = Math.floor(sent * 95 / (2 * data.length));
                $('photoProgress').value = percent;
                $('photoStatus').textContent = 'Đang gửi ảnh · ' + percent + '%';
            }
        }
        $('photoStatus').textContent = 'Đã gửi dữ liệu. Đang chờ màn hình làm mới…';
        await request(8);
        currentMode = 0;
        $('photoProgress').value = 100;
        $('photoStatus').textContent = 'Đồng hồ đã xác nhận làm mới ảnh.';
        log('Đồng hồ đã nhận ảnh.');
    } catch (error) {
        if (session === token) {
            photoDisconnected();
            log('Tải ảnh chưa hoàn tất. ' + customerError(error));
            if (gatt?.connected) device.gatt.disconnect();
        }
    } finally {
        if (session === token) sendingPhoto = false;
    }
}

async function ensureArtPack(pack, query, name) {
    if (!pack) throw Error('Chưa tải được ' + name + '.');
    const installed = async () => {
        const info = await request(query);
        return info.length === 10 && info[9] === 1 && value32(info, 5) === pack.crc32;
    };
    if (await installed()) return;
    status('Đang cài ' + name + '. Giữ kết nối đến khi hoàn tất.');
    const data = Uint8Array.from(atob(pack.bytes), char => char.charCodeAt(0));
    let last = 0;
    await writeSavedObject(query + 1, data, (sent,total) => {
        const percent = Math.floor(sent * 100 / total);
        if (percent - last >= 10) { last = percent; status('Đang cài ' + name + ' · ' + percent + '%'); }
    });
    if (!await installed()) throw Error('Đồng hồ chưa xác nhận ' + name + '.');
}

async function ensureSceneSamples() {
    await ensureArtPack(window.Clock42Scenes, 64, 'bốn cảnh mẫu');
}

async function enableSeasonArt() {
    if (firmware < 0xb7 || !cap?.ready) throw Error('Cập nhật phần mềm và cài chữ, mặt đồng hồ trước.');
    const token = session;
    sendingPhoto = true;
    $('photoProgress').value = 0;
    $('photoStatus').textContent = 'Đang chuẩn bị bộ tranh tiết khí…';
    try {
        await ensureArtPack(window.Clock42SeasonArt, 104, 'bộ tranh tiết khí');
        await writeSavedObject(33, Uint8Array.of(1));
        await sync(7);
        for (const button of artPresetButtons) button.setAttribute('aria-pressed', 'false');
        $('photoProgress').value = 100;
        $('photoStatus').textContent = 'Đã bật tự đổi tranh theo tiết khí.';
        status($('photoStatus').textContent);
    } catch (error) {
        if (session === token) {
            $('photoStatus').textContent = 'Chưa hoàn tất. ' + customerError(error);
            status($('photoStatus').textContent);
        }
    } finally {
        if (session === token) sendingPhoto = false;
    }
}

async function saveArtwork(restore = false) {
    const scene = usesScene(), mode = scene ? 9 : 7;
    if (firmware < (scene ? 0xb6 : 0xb2) || !cap?.ready) throw Error('Cập nhật phần mềm và cài chữ, mặt đồng hồ trước.');
    if (!restore && (!photo || photoDecoding)) throw Error('Chọn ảnh để thay tranh.');
    const connection = session;
    const slot = Number($('scenePeriod').value);
    const query = scene ? 72 + 8 * slot : 32;
    const label = scene ? scenePeriods[slot][1] : '';
    let data = new Uint8Array();
    if (!restore) {
        const [black, red] = photoPlanes();
        data = new Uint8Array(black.length + red.length);
        data.set(black);
        data.set(red, black.length);
    }
    sendingPhoto = true;
    let saved = false;
    $('photoProgress').value = 0;
    try {
        if (restore) {
            const info = await request(query);
            if (info.length !== 6) throw Error('Thiết bị chưa trả lời trạng thái tranh.');
            if (!info[5]) {
                if (scene) { await ensureSceneSamples(); await sync(mode); }
                $('photoStatus').textContent = scene ? 'Khung giờ ' + label + ' đang dùng tranh mẫu.' : 'Đồng hồ đang dùng tranh mẫu.';
                return;
            }
        }
        $('photoStatus').textContent = restore ? 'Đang khôi phục tranh mẫu…' : 'Đang lưu tranh vào đồng hồ…';
        await writeSavedObject(query + 1, data, (sent,total) =>
            $('photoProgress').value = Math.floor(sent * 95 / total));
        saved = true;
        sendingPhoto = false;
        $('photoStatus').textContent = 'Đã lưu thay đổi. Đang chờ màn hình làm mới…';
        if (scene) await ensureSceneSamples();
        await sync(mode);
        $('photoProgress').value = 100;
        $('photoStatus').textContent = scene
            ? (restore ? 'Đã khôi phục cảnh mẫu ' : 'Đã lưu ảnh riêng ') + label + '. Màn chọn cảnh theo giờ hiện tại.'
            : restore ? 'Đã khôi phục tranh mẫu.' : 'Đã lưu tranh và mở mặt Đồng hồ tranh.';
        status($('photoStatus').textContent);
    } catch (error) {
        if (connection === session) {
            $('photoStatus').textContent = saved
                ? 'Đã lưu thay đổi. Chọn lại mặt đồng hồ để làm mới màn hình.'
                : 'Chưa hoàn tất. ' + customerError(error);
            status($('photoStatus').textContent);
        }
    } finally {
        if (connection === session) sendingPhoto = false;
    }
}

function choosePhotoTarget() {
    const art = usesArtwork(), scene = usesScene();
    $('sceneOptions').hidden = !scene;
    $('artPresets').hidden = !art || scene || !artPresetButtons.length;
    $('photoTitle').textContent = scene ? 'Thay tranh Đồng hồ tranh 2' : art ? 'Thay tranh Đồng hồ tranh' : 'Tải ảnh lên màn hình';
    $('photoDimensions').textContent = 'Xem trước · ' + (scene ? '240 × 152' : '400 × ' + (art ? 150 : 300));
    $('photoUsage').textContent = scene
        ? 'Ảnh riêng thay cảnh của khung giờ đã chọn. Đồng hồ tự đổi cảnh theo giờ Việt Nam.'
        : art
        ? 'Ảnh thay phần tranh ở nửa dưới. Giờ và âm lịch vẫn ở nửa trên.'
        : 'Ảnh thay cho mặt đang hiển thị. Để trở lại đồng hồ, chọn một mặt trong thư viện.';
    $('sendPhoto').textContent = scene ? 'Lưu ảnh cho khung giờ đã chọn' : art ? 'Lưu tranh và mở Đồng hồ tranh' : 'Gửi ảnh lên thiết bị';
    $('restoreArt').textContent = scene ? 'Khôi phục cảnh mẫu của khung giờ' : 'Khôi phục tranh mẫu';
    $('photoProgress').value = 0;
    $('photoStatus').textContent = '';
    photoControls();
    renderPhoto();
}

function addArtPresets(grid, presets = []) {
    for (const {label,png} of presets) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'face';
        button.setAttribute('aria-pressed','false');
        const thumbnail = new Image(400,150);
        thumbnail.alt = '';
        thumbnail.src = 'data:image/png;base64,' + png;
        const title = document.createElement('span');
        title.textContent = label;
        button.append(thumbnail,title);
        button.onclick = () => {
            $('photoFile').value = '';
            const bytes = Uint8Array.from(atob(png),char => char.charCodeAt(0));
            void loadPhoto(new Blob([bytes],{type:'image/png'}),button);
        };
        grid.append(button);
        artPresetButtons.push(button);
    }
}

$('photoFile').onchange = () => loadPhoto($('photoFile').files[0]);
addArtPresets($('artPresetGrid'),window.Clock42ArtPresets);
addArtPresets($('seasonPresetGrid'),window.Clock42SeasonPresets);
$('photoTarget').onchange = choosePhotoTarget;
$('scenePeriod').onchange = updateSceneSample;
for (const [id,target] of [['changeArt','art'],['changeScene','scene']]) {
    $(id).onclick = () => {
        $('photoTarget').value = target;
        choosePhotoTarget();
        document.querySelector('[data-section="photos"]').click();
        $(target === 'scene' ? 'scenePeriod' : 'photoFile').focus();
    };
}
for (const id of ['photoFit','photoColor','photoBlack','photoRed']) $(id).oninput = () => {
    $('photoBlackValue').textContent = $('photoBlack').value;
    $('photoRedValue').textContent = $('photoRed').value;
    photoControls();
    renderPhoto();
};
$('rotatePhoto').onclick = () => {
    photoRotation = (photoRotation + 90) % 360;
    renderPhoto();
};
$('sendPhoto').onclick = () => action(usesArtwork() ? saveArtwork : sendPhoto);
$('restoreArt').onclick = () => action(() => saveArtwork(true));
$('enableSeasonArt').onclick = () => action(enableSeasonArt);
choosePhotoTarget();
