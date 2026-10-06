/* DA14585 only. Keep countdown-nrf52.js and all nRF52 transports unchanged. */
(() => {
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    const status = (message, error = false) => window.updateCountdownStatus?.(message, error);
    function connection() {
        if (deviceProtocol !== PROTOCOL_DA14585 || !rxtxCharacteristic || !gattServer?.connected)
            throw new Error('Hãy kết nối DA14585 trước.');
        return {characteristic: rxtxCharacteristic, server: gattServer};
    }
    function checkConnection(link) {
        if (deviceProtocol !== PROTOCOL_DA14585 || rxtxCharacteristic !== link.characteristic ||
            gattServer !== link.server || !link.server.connected)
            throw new Error('Kết nối đã thay đổi. Kết nối lại rồi gửi lại đếm ngược.');
    }
    async function exchange(link, packet, matches) {
        checkConnection(link);
        await link.characteristic.writeValueWithResponse(new Uint8Array(packet));
        const deadline = Date.now() + 3000;
        while (Date.now() < deadline) {
            await pause(120);
            checkConnection(link);
            const value = await link.characteristic.readValue();
            checkConnection(link);
            const reply = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
            if (matches(reply)) return new Uint8Array(reply);
            if (reply.length === 10 && reply[0] === 0xd6 && (reply[1] === 3 || reply[1] === 4))
                failStatus(reply[1]);
        }
        throw new Error('Đồng hồ chưa phản hồi đếm ngược. Hãy kết nối lại và thử.');
    }
    function failStatus(code) {
        if (code === 4) throw new Error('Màn đang refresh hoặc nhận ảnh. Chờ màn hoàn tất rồi thử lại.');
        if (code !== 0) throw new Error('Thiết bị từ chối cấu hình đếm ngược (mã ' + code + ').');
    }
    const metadata = data => data.length === 10 && data[0] === 0xd6 && data[1] <= 5 &&
        data[2] === 0 && data[7] <= 16 && data[8] <= 1 && data[9] <= 1;
    async function probe(link) {
        await exchange(link, [0xd8, 0xff], d => d.length === 4 && d[0] === 0xd8 &&
            d[1] === 0 && d[2] === 16 && d[3] === 1);
    }
    function busy(value) {
        window.countdownOperationBusy = value;
        for (const id of ['generateBtn', 'copyBtn']) {
            const button = document.getElementById(id);
            if (button) button.disabled = value;
        }
    }
    async function operation(action) {
        if (window.countdownOperationBusy || clockImageUploadBusy || da14585ModeSwitchBusy) return;
        busy(true);
        try { await action(connection()); }
        catch (error) { status(error.message || String(error), true); addLog('Đếm ngược: ' + error.message); }
        finally { busy(false); }
    }
    window.startDa14585Countdown = request => operation(async link => {
        request = new Uint8Array(request);
        if (request.length < 7 || request[0] !== 0xd6 || request[1] !== 0 ||
            request[6] > 16 || request.length !== 7 + request[6])
            throw new Error('Gói đếm ngược không hợp lệ.');
        await probe(link); // No blind writes to an older firmware.
        // Shift UTC to local civil seconds and send zone=0. This also supports
        // half/quarter-hour browser timezones without rounding the offset.
        const local = Math.floor(Date.now() / 1000) - new Date().getTimezoneOffset() * 60;
        const packet = new Uint8Array([...request, (local >>> 24) & 255,
            (local >>> 16) & 255, (local >>> 8) & 255, local & 255, 0]);
        status('Đang gửi đếm ngược và đồng bộ giờ...');
        for (let offset = 0; offset < packet.length; offset += 16) {
            const chunk = packet.slice(offset, offset + 16), received = offset + chunk.length;
            await exchange(link, [0xd6, 0xf0, packet.length, offset, ...chunk],
                d => d.length === 4 && d[0] === 0xd6 && d[1] === 0xf0 && d[2] === 0 && d[3] === received);
        }
        let reply = await exchange(link, [0xd6, 0xf1], metadata);
        failStatus(reply[1]);
        reply = await exchange(link, [0xd6, 0xff], metadata);
        failStatus(reply[1]);
        if (![2,3,4,5,6].every(i => reply[i+1] === request[i]) || reply[8] !== 1 || reply[9] !== 1)
            throw new Error('Ngày đích hoặc trạng thái thiết bị đọc lại không khớp.');
        const label = await exchange(link, [0xd6, 0xfe, 0], d => d.length === 4 + request[6] &&
            d[0] === 0xd6 && d[1] === 0xfe && d[2] === 0 && d[3] === request[6]);
        if (!request.slice(7).every((ch, i) => ch === label[4+i]))
            throw new Error('Tên sự kiện đọc lại không khớp. Hãy gửi lại.');
        status('Thiết bị đã nhận đúng cấu hình và đang cập nhật màn hình.');
        addLog('DA14585: đã xác nhận ngày, tên sự kiện và giờ. Cấu hình giữ qua ngủ; tháo pin/reset cần gửi lại.');
    });
    window.stopDa14585Countdown = () => operation(async link => {
        await probe(link);
        const reply = await exchange(link, [0xd7], d => d.length === 2 && d[0] === 0xd7);
        failStatus(reply[1]);
        status('Đã dừng đếm ngược và chuyển về đồng hồ face 1.');
        addLog('DA14585: đã xác nhận dừng đếm ngược.');
    });
})();
