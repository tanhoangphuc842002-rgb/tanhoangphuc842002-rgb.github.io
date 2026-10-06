/* Additional nRF52 countdown transport. DA14585 commands stay in index.html. */
(() => {
    let waiter = null;
    window.countdownOperationBusy = false;

    window.handleCountdownNotification = function (data) {
        const config = data.length >= 8 && data[0] === 0xd6 && data[1] <= 5 &&
            data[2] === 0 && data[7] <= 16 && data.length === 8 + data[7];
        const stop = data.length === 2 && data[0] === 0xd7 && data[1] === 0;
        const caps = data.length === 3 && data[0] === 0xd8 && data[1] === 0 &&
            data[2] >= 8 && data[2] <= 16;
        if (!config && !stop && !caps) return false;
        if (waiter && waiter.opcode === data[0]) {
            const pending = waiter;
            waiter = null;
            clearTimeout(pending.timer);
            pending.resolve(new Uint8Array(data));
        }
        return true;
    };

    function exchange(packet, timeout = 3500) {
        return new Promise((resolve, reject) => {
            const pending = {opcode: packet[0], resolve, timer: null};
            pending.timer = setTimeout(() => {
                if (waiter === pending) waiter = null;
                reject(new Error('Đồng hồ chưa xác nhận đếm ngược. Hãy kiểm tra kết nối rồi thử lại.'));
            }, timeout);
            waiter = pending;
            Promise.resolve(sendCommand(packet)).catch(error => {
                if (waiter === pending) waiter = null;
                clearTimeout(pending.timer);
                reject(error);
            });
        });
    }

    function busy(value) {
        window.countdownOperationBusy = value;
        for (const id of ['generateBtn', 'copyBtn']) {
            const button = document.getElementById(id);
            if (button) button.disabled = value;
        }
    }

    function status(message, isError = false) {
        if (typeof window.updateCountdownStatus === 'function')
            window.updateCountdownStatus(message, isError);
    }

    function available() {
        return deviceProtocol === PROTOCOL_NRF52 && epdCharacteristic &&
            bleDevice && bleDevice.gatt.connected;
    }

    function sameConfig(reply, request) {
        if (reply.length !== request.length + 1) return false;
        return Array.from(request.slice(1)).every((value, i) => reply[i + 2] === value);
    }

    function failState(reply) {
        const errors = {
            2: 'Thiết bị chưa lưu được cấu hình. Chờ vài giây rồi thử lại.',
            3: 'Ngày hoặc tên sự kiện không hợp lệ.',
            4: 'Thiết bị đang bận ghi cấu hình hoặc nhận ảnh.'
        };
        if (errors[reply[1]]) throw new Error(errors[reply[1]]);
    }

    window.startNrf52Countdown = async function (request) {
        if (window.countdownOperationBusy || clockImageUploadBusy || da14585ModeSwitchBusy) return;
        if (!available()) {
            status('Hãy kết nối thiết bị trước.', true);
            addLog('Hãy kết nối thiết bị trước khi đặt đếm ngược.');
            return;
        }
        busy(true);
        try {
            // Probe the command itself: version numbers are shared by several products.
            await exchange(new Uint8Array([0xd6, 0xff]));
            const labelLength = request[6] || 0;
            if (labelLength > 8) {
                let caps;
                try {
                    caps = await exchange(new Uint8Array([0xd8, 0xff]), 1800);
                } catch (_) {
                    throw new Error('Đồng hồ hiện chỉ hỗ trợ tên sự kiện tối đa 8 ký tự. Hãy rút ngắn tên rồi thử lại.');
                }
                if (labelLength > caps[2])
                    throw new Error(`Đồng hồ chỉ hỗ trợ tên sự kiện tối đa ${caps[2]} ký tự.`);
            }
            const now = Math.floor(Date.now() / 1000);
            const zone = Math.round(-new Date().getTimezoneOffset() / 60);
            const packet = new Uint8Array([...request,
                (now >>> 24) & 255, (now >>> 16) & 255,
                (now >>> 8) & 255, now & 255, zone & 255]);
            addLog('Đang lưu ngày đích và đồng bộ giờ cho chế độ đếm ngược...');
            let reply = await exchange(packet);
            failState(reply);
            const deadline = Date.now() + 20000;
            while (reply[1] === 1 && Date.now() < deadline) {
                await delay(600);
                reply = await exchange(new Uint8Array([0xd6, 0xff]));
                failState(reply);
            }
            if (reply[1] !== 0 || !sameConfig(reply, request))
                throw new Error('Chưa xác nhận được cấu hình đã lưu; kết nối lại rồi thử lại.');
            nrf52DisplayMode = 8;
            status('Đã lưu và bắt đầu đếm ngược.');
            addLog('Đã lưu đếm ngược. Thiết bị đang vẽ giao diện đồng hồ và số ngày còn lại.');
        } catch (error) {
            status(error.message || String(error), true);
            addLog('Đếm ngược: ' + (error.message || error));
        } finally {
            busy(false);
        }
    };

    window.stopNrf52Countdown = async function () {
        if (window.countdownOperationBusy || clockImageUploadBusy || da14585ModeSwitchBusy) return;
        if (!available()) {
            status('Hãy kết nối thiết bị trước.', true);
            addLog('Hãy kết nối thiết bị trước.');
            return;
        }
        busy(true);
        try {
            await exchange(new Uint8Array([0xd6, 0xff]));
            await exchange(new Uint8Array([0xd7]));
            nrf52DisplayMode = 2;
            status('Đã dừng đếm ngược và trở về đồng hồ Face 1.');
            addLog('Đã dừng đếm ngược và chuyển về đồng hồ face 1.');
        } catch (error) {
            status(error.message || String(error), true);
            addLog('Dừng đếm ngược: ' + (error.message || error));
        } finally {
            busy(false);
        }
    };
})();
