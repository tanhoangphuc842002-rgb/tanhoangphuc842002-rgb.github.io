'use strict';

(() => {
    const names = ['', 'Ảnh 1', 'Ảnh 2', 'Ảnh cũ của Đồng hồ + ảnh', 'Ảnh 3'];
    const target = $('albumSlot');
    const timeInputs = [1,2,3].map(i => $('albumTime' + i));
    const slots = [1,2,4];
    const defaultTimes = [360,1080,720];
    const thirdSupported = () => firmware >= 0xbe;
    let state;
    const clock = () => usesClockPhoto();
    const supported = () => !!gatt?.connected && firmware >= 0xbd;
    const present = slot => !!(state?.flags & (1 << (slot - 1)));
    const reserved = slot => !!(state?.flags & (1 << (slot + 3)));
    const selected = () => Number(target.value);
    const available = () => slots.filter(slot => present(slot) && (slot !== 4 || thirdSupported()));
    const message = text => { $('albumStatus').textContent = text; };
    const formatTime = minutes => [Math.floor(minutes / 60), minutes % 60]
        .map(value => String(value).padStart(2, '0')).join(':');
    const parseTime = value => value ? value.split(':').reduce((hour, minute) => hour * 60 + +minute, 0) : -1;

    window.album42Available = supported;
    window.album42Controls = () => {
        $('photoAlbum').hidden = !supported() || (usesArtwork() && !clock());
        if ($('photoAlbum').hidden) return;
        const slot = selected(), ready = !!state && !busy && !!cap?.present;
        target.disabled = !ready;
        $('albumSave').disabled = !ready || !photo || photoDecoding || slot === 3 || present(slot) || reserved(slot);
        $('albumHold').disabled = !ready || !present(slot) || (!clock() && slot === 3) || (clock() && !cap.ready);
        $('albumDelete').disabled = !ready || !present(slot);
        for (const [index, input] of timeInputs.entries()) input.disabled = !ready || !present(slots[index]);
        $('albumSchedule').disabled = !ready || available().length < 2 || (clock() && !cap.ready);
    };

    function updateChoices() {
        for (const slot of slots) {
            target.querySelector(`option[value="${slot}"]`).textContent = names[slot] +
                (present(slot) ? ' · Đã lưu' : reserved(slot) ? ' · Ảnh cũ đang dùng chỗ này' : ' · Trống');
        }
        $('albumCapacity').textContent = (thirdSupported() ? 'Ba' : 'Hai') +
            ' chỗ lưu dùng chung cho Ảnh toàn màn và Đồng hồ + ảnh. Mỗi mặt có lịch đổi ảnh riêng.';
        $('albumTime3Label').hidden = target.querySelector('option[value="4"]').hidden = !thirdSupported();
        target.querySelector('option[value="3"]').hidden = !present(3);
        if ((selected() === 3 && !present(3)) || (selected() === 4 && !thirdSupported())) target.value = '1';
        if (reserved(selected())) target.value = present(3) ? '3' : '1';
        const face = Number(clock());
        const policy = state.policies[face];
        const autoplay = (policy & 7) === 4;
        const times = [(policy >> 3) & 2047, (policy >> 14) & 2047,
            policy & (1 << 25) ? state.thirdTimes[face] : 0xffff];
        const scheduled = slots.filter((slot,index) => present(slot) && times[index] < 1440).length;
        const fixedSlot = policy === 5 ? 4 : policy;
        for (const [index,input] of timeInputs.entries()) {
            input.value = formatTime(autoplay && times[index] < 1440 ? times[index] : defaultTimes[index]);
        }
        $('albumMode').textContent = autoplay
            ? scheduled >= 2 ? 'Đang đổi ảnh theo giờ đã lưu.' : 'Lịch đổi ảnh đang chờ đủ hai ảnh.'
            : fixedSlot >= 1 && fixedSlot <= 4 && present(fixedSlot) ? 'Đang giữ ' + names[fixedSlot] + '.'
            : 'Chọn ảnh đã lưu để hiển thị. Cần ít nhất hai ảnh để đổi theo giờ.';
        window.album42Controls();
    }

    async function readAlbum() {
        const extended = thirdSupported();
        const data = await request(126, extended ? Uint8Array.of(1) : undefined);
        if (data.length !== (extended ? 18 : 14)) throw Error('Chưa đọc được danh sách ảnh.');
        state = {flags:data[5], policies:[value32(data,6), value32(data,10)],
            thirdTimes:extended ? [data[14] | data[15]<<8, data[16] | data[17]<<8] : [0xffff,0xffff]};
        updateChoices();
    }
    window.album42Ready = async () => {
        state = undefined;
        message('');
        if (!supported()) return;
        try { await readAlbum(); }
        catch (error) { message(customerError(error)); }
    };
    window.album42Disconnect = () => { state = undefined; };

    $('photoTarget').addEventListener('change', () => { if (state) updateChoices(); });
    for (const id of ['changeArt','changeScene','changeClockPhoto']) {
        $(id).addEventListener('click', () => { if (state) updateChoices(); });
    }
    target.onchange = window.album42Controls;

    function albumAction(work) {
        return action(async () => {
            message('');
            try { await work(); }
            catch (error) { message(customerError(error)); }
        });
    }

    async function displayPolicy(policy, thirdTime) {
        const face = Number(clock());
        const extra = thirdTime === undefined ? [] : [thirdTime & 255, thirdTime >> 8];
        await request(127, Uint8Array.of(face, ...u32(policy), ...extra));
        await readAlbum();
        message('Đã lưu cách hiển thị. Đang làm mới màn hình…');
        await sync(face ? 14 : 16);
        message(policy <= 3 || policy === 5
            ? 'Đang giữ ' + names[policy === 5 ? 4 : policy] + '.' : 'Đã bật tự đổi ảnh theo giờ.');
    }

    $('albumHold').onclick = () => albumAction(() => displayPolicy(selected() === 4 ? 5 : selected()));
    $('albumSchedule').onclick = () => albumAction(async () => {
        const images = available();
        const times = slots.map((slot,index) => images.includes(slot) ? parseTime(timeInputs[index].value) : 2047);
        const activeTimes = times.filter(time => time !== 2047);
        if (activeTimes.some(time => time < 0) || new Set(activeTimes).size !== activeTimes.length) {
            throw Error('Chọn giờ hiển thị khác nhau cho các ảnh đã lưu.');
        }
        const third = times[2] !== 2047;
        await displayPolicy(4 | (times[0] << 3) | (times[1] << 14) | (third ? 1 << 25 : 0),
            third ? times[2] : undefined);
    });

    async function prepareThirdSlot() {
        const backup = await request(109);
        if (backup.length !== 10) throw Error('Chưa kiểm tra được vùng lưu ảnh 3.');
        if (!backup[9]) return;
        const pack = window.Clock42SeasonArt;
        if (!pack || value32(backup,5) !== pack.crc32) {
            throw Error('Đồng hồ đang dùng bộ tranh tiết khí khác. Vùng lưu ảnh 3 chưa sẵn sàng.');
        }
        message('Đang chuyển bộ tranh tiết khí để lấy chỗ lưu ảnh 3…');
        const data = Uint8Array.from(atob(pack.bytes), char => char.charCodeAt(0));
        await writeSavedObject(105, data, (sent,total) =>
            message('Đang chuyển bộ tranh tiết khí · ' + Math.floor(sent * 100 / total) + '%'));
        const moved = await request(109);
        if (moved.length !== 10 || moved[9]) throw Error('Chưa xác nhận chuyển bộ tranh tiết khí.');
    }

    $('albumSave').onclick = () => albumAction(async () => {
        const slot = selected();
        const data = clockPhotoBytes();
        if (data.length !== 24000) throw Error('Chưa có ảnh 400 × 300 để lưu.');
        message('Đang chuẩn bị bộ nhớ ảnh…');
        await ensureSceneSamples();
        if (slot === 4) await prepareThirdSlot();
        await writeSavedObject(slot === 4 ? 137 : 121 + 8 * (slot - 1), data, (sent, total) =>
            message('Đang lưu ' + names[slot] + ' · ' + Math.floor(sent * 100 / total) + '%'));
        await readAlbum();
        if (!present(slot)) throw Error('Đồng hồ chưa xác nhận ảnh đã lưu.');
        message('Đã lưu ' + names[slot] + '. Anh có thể giữ ảnh này hoặc đặt giờ đổi ảnh.');
    });
    $('albumDelete').onclick = () => {
        const slot = selected();
        if (!confirm('Xóa ' + names[slot] + ' trên đồng hồ?')) return;
        return albumAction(async () => {
            await request(slot === 3 ? 134 : slot === 4 ? 140 : 124 + 8 * (slot - 1));
            await readAlbum();
            if (present(slot)) throw Error('Đồng hồ chưa xác nhận xóa ảnh.');
            message('Đã xóa ' + names[slot] + '.');
            if (currentMode === 14 || currentMode === 16) await sync();
        });
    };
    window.album42Controls();
})();
