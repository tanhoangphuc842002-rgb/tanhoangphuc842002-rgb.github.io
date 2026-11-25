'use strict';

(() => {
    const bootControl = '8ec90001-f315-4f60-9fb8-838830daea50';
    const bootPacket = '8ec90002-f315-4f60-9fb8-838830daea50';
    const buttonless = '8ec90003-f315-4f60-9fb8-838830daea50';
    const fileInput = $('ota420-zip');
    const progress = $('ota420-progress');
    let update, target, awaitingVersion, retry, reading = false, switching = false;

    class DfuLinkError extends Error {}

    function canReconnect(error) {
        return error instanceof DfuLinkError || (error instanceof DOMException &&
            (error.name === 'NetworkError' || error.name === 'InvalidStateError'));
    }

    function report(message) {
        $('ota420-status').textContent = message;
        log('Cập nhật phần mềm: ' + message);
    }

    window.ota42Controls = () => {
        const ready = !!update && !busy && !reading;
        fileInput.disabled = busy;
        $('ota420-start').disabled = !ready || !cap || !gatt?.connected;
        $('ota420-pick').disabled = !ready || !!gatt?.connected;
        $('ota420-device-hint').hidden = !update || reading || !!gatt?.connected || awaitingVersion !== undefined;
        $('ota420-retry').hidden = !retry;
        $('ota420-retry').disabled = !ready;
    };
    window.ota42Switching = () => switching;
    window.ota42ApplicationReady = version => {
        if (awaitingVersion === undefined) return;
        if (awaitingVersion === version) {
            report('Đã cập nhật thành công. Đồng hồ đang chạy phiên bản vừa cài.');
        } else {
            report('Đồng hồ vẫn chưa chạy phiên bản vừa gửi. Kiểm tra xem đã chọn đúng đồng hồ chưa.');
            retry = start;
        }
        awaitingVersion = undefined;
        controls();
    };

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        update = target = awaitingVersion = retry = undefined;
        progress.value = 0;
        if (!file) {
            reading = false;
            report('Chọn tệp cập nhật để bắt đầu.');
            controls();
            return;
        }
        reading = true;
        controls();
        report('Đang kiểm tra tệp cập nhật…');
        try {
            const candidate = await readOta420Package(file);
            if (file !== fileInput.files[0]) return;
            update = candidate;
            report(gatt?.connected
                ? 'Đã kiểm tra tệp. Bấm Bắt đầu cập nhật.'
                : 'Đã kiểm tra tệp. Kết nối đồng hồ để bắt đầu. Nếu đồng hồ đang ở chế độ cập nhật, bấm Tiếp tục cập nhật.');
        } catch (error) {
            if (file === fileInput.files[0]) report(customerError(error));
        } finally {
            if (file === fileInput.files[0]) {
                reading = false;
                controls();
            }
        }
    };

    // Keep writes and replies paired, including when a notification arrives before
    // Chrome has returned from the corresponding GATT write.
    async function exchange(peer, characteristic, request, match, timeout, expectReboot = false) {
        let timer, notified = false;
        let replyHandler, lostHandler;
        try {
            const reply = new Promise((resolve, reject) => {
                replyHandler = event => {
                    const {buffer, byteOffset, byteLength} = event.target.value;
                    const bytes = new Uint8Array(buffer, byteOffset, byteLength);
                    if (!match(bytes)) return;
                    notified = true;
                    resolve(bytes.slice());
                };
                characteristic.addEventListener('characteristicvaluechanged', replyHandler);
                lostHandler = () => reject(new DfuLinkError('Đã mất kết nối Bluetooth.'));
                peer.addEventListener('gattserverdisconnected', lostHandler);
            });
            const deadline = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new DfuLinkError('Đồng hồ phản hồi quá lâu.')), timeout);
            });
            const write = Promise.resolve().then(() => characteristic.writeValueWithResponse(request))
                .catch(error => {
                    if (!expectReboot || !notified) throw error;
                });
            const [response] = await Promise.race([Promise.all([reply, write]), deadline]);
            return response;
        } finally {
            clearTimeout(timer);
            characteristic.removeEventListener('characteristicvaluechanged', replyHandler);
            peer.removeEventListener('gattserverdisconnected', lostHandler);
        }
    }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const reboot = peer => {
        if (!peer.gatt.connected) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const done = () => { clearTimeout(timer); resolve(); };
            const timer = setTimeout(() => {
                peer.removeEventListener('gattserverdisconnected', done);
                reject(Error('Đồng hồ chưa chuyển sang chế độ cập nhật.'));
            }, 7000);
            peer.addEventListener('gattserverdisconnected', done, {once: true});
        });
    };

    function attempt(work, again) {
        return action(async () => {
            retry = undefined;
            controls();
            try {
                await work();
            } catch (error) {
                retry = again;
                report(customerError(error) + ' Bấm Thử lại để dùng tệp đã chọn.');
            }
        });
    }

    function start() {
        if (!gatt?.connected) return target ? upload() : pick();
        return attempt(async () => {
            if (firmware > update.appVersion) throw Error('Tệp đã chọn cũ hơn phần mềm trên đồng hồ. Hãy chọn bản mới hơn.');
            if (!window.confirm('Bắt đầu cập nhật phần mềm cho đồng hồ? Giữ nguyên pin cho tới khi hoàn tất.')) return;
            switching = true;
            controls();
            const peer = device;
            try {
                report('Đang chuyển đồng hồ sang chế độ cập nhật…');
                const service = await gatt.getPrimaryService(ota420DfuService);
                const control = await service.getCharacteristic(buttonless);
                await control.startNotifications();
                const response = await exchange(peer, control, Uint8Array.of(1),
                    bytes => bytes[0] === 0x20 && bytes[1] === 0x01, 10000, true);
                if (response[2] !== 1) {
                    serviceLog('DFU switch response: ' + response[2]);
                    throw Error('Đồng hồ chưa sẵn sàng cập nhật.');
                }
                await reboot(peer);
                target = undefined;
                report('Bấm Tiếp tục cập nhật rồi chọn đồng hồ trong danh sách Bluetooth.');
            } finally {
                switching = false;
                controls();
            }
        }, start);
    }

    async function pickTarget() {
        if (!navigator.bluetooth) throw Error('Hãy mở bằng Chrome hoặc Edge có hỗ trợ Bluetooth.');
        return navigator.bluetooth.requestDevice({
            filters: [{namePrefix: 'DfuTarg'}, {services: [ota420DfuService]}],
            optionalServices: [ota420DfuService],
        });
    }

    function pick() {
        return attempt(async () => {
            target = undefined;
            target = await pickTarget();
            await writeFirmware(target);
        }, () => target ? upload() : pick());
    }

    function upload() {
        if (!target) return pick();
        return attempt(() => writeFirmware(target), upload);
    }

    async function prepareTransfer(peer, initPacket) {
        const reconnectDelays = [600, 1200];
        for (let attempt = 0; ; attempt++) {
            try {
                const server = await peer.gatt.connect();
                const service = await server.getPrimaryService(ota420DfuService);
                const control = await service.getCharacteristic(bootControl);
                const packet = await service.getCharacteristic(bootPacket);
                await control.startNotifications();
                const transfer = new Dfu420(peer, control, packet);
                await transfer.command(0x02, [0, 0], 0, 5000); // Explicit checksums at object boundaries.
                await transfer.sendInit(initPacket);
                return transfer;
            } catch (error) {
                serviceLog('DFU session setup ' + (attempt + 1) + ': ' + error.name + ': ' + error.message);
                if (!canReconnect(error) || attempt === reconnectDelays.length) throw error;
                if (peer.gatt.connected) peer.gatt.disconnect();
                report('Đang kết nối lại để bắt đầu cập nhật…');
                await delay(reconnectDelays[attempt]);
            }
        }
    }

    async function writeFirmware(peer) {
        awaitingVersion = undefined;
        report('Đang kết nối với đồng hồ để cập nhật…');
        try {
            const transfer = await prepareTransfer(peer, update.initPacket);
            report('Đang cập nhật phần mềm. Giữ nguyên pin cho tới khi hoàn tất.');
            await transfer.sendData(update.data, offset => {
                progress.value = Math.min(99, Math.floor(100 * offset / update.data.length));
            });
            awaitingVersion = update.appVersion;
            progress.value = 100;
            report('Đồng hồ đã nhận đủ tệp. Chờ đồng hồ khởi động rồi bấm Kết nối lại để kiểm tra. Nếu chưa kết nối lần nào, bấm Kết nối.');
            // Give the BLE bootloader time to close the link and activate the app.
            await reboot(peer).catch(() => {});
        } finally {
            if (peer.gatt.connected) peer.gatt.disconnect();
        }
    }

    class Dfu420 {
        constructor(peer, control, packet) {
            this.peer = peer;
            this.control = control;
            this.packet = packet;
        }

        async command(op, payload = [], length = 0, timeout = 15000) {
            const reply = await exchange(this.peer, this.control, Uint8Array.of(op, ...payload),
                bytes => bytes[0] === 0x60 && bytes[1] === op, timeout, op === 0x04);
            if (reply[2] !== 1) {
                const code = reply[2] === 0x0b ? reply[2] + '/' + reply[3] : reply[2];
                serviceLog('DFU command ' + op + ', response ' + code);
                throw Error('Đồng hồ chưa nhận được bản cập nhật này. Kiểm tra lại đồng hồ và tệp đã chọn.');
            }
            if (reply.length !== 3 + length) throw Error('Không nhận được phản hồi đầy đủ từ đồng hồ.');
            return reply;
        }

        async select(type) {
            const reply = await this.command(0x06, [type], 12);
            const max = value32(reply, 3);
            if (!max) throw Error('Đồng hồ chưa sẵn sàng nhận tệp cập nhật.');
            return {max, offset: value32(reply, 7), crc: value32(reply, 11)};
        }

        create(type, size) {
            return this.command(0x01, [type, ...u32(size)]);
        }

        async stream(data, offset, end) {
            const transfer = new AbortController();
            const writeBlock = this.writeBlock(data, offset, end, transfer.signal);
            let timer;
            try {
                await Promise.race([writeBlock, new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        transfer.abort();
                        reject(new DfuLinkError('Truyền dữ liệu vượt thời gian chờ.'));
                    }, 20000);
                })]);
            } finally {
                clearTimeout(timer);
            }
            const reply = await this.command(0x03, [], 8);
            if (value32(reply, 3) !== end || value32(reply, 7) !== crc32(data.subarray(0, end))) {
                throw Error('Chưa khớp dữ liệu đã truyền.');
            }
        }

        async writeBlock(data, offset, end, signal) {
            for (let at = offset; at < end; at += 20) {
                signal.throwIfAborted();
                await this.packet.writeValueWithoutResponse(data.subarray(at, Math.min(at + 20, end)));
                // Avoid flooding the controller's write-without-response queue.
                await delay(4);
            }
        }

        async sendInit(data) {
            const {max, offset, crc} = await this.select(1);
            if (data.length > max) throw Error('Tệp cập nhật này không phù hợp với đồng hồ.');
            const resume = offset > 0 && offset <= data.length && crc === crc32(data.subarray(0, offset));
            if (!resume) await this.create(1, data.length);
            if (!resume || offset < data.length) await this.stream(data, resume ? offset : 0, data.length);
            await this.command(0x04);
        }

        async sendData(data, onProgress) {
            let {max, offset, crc} = await this.select(2);
            if (offset > data.length) throw Error('Không tiếp tục được với tệp này. Hãy chọn lại tệp đã dùng trước khi bị ngắt.');
            if (offset) {
                const remainder = offset % max;
                if (crc === crc32(data.subarray(0, offset))) {
                    if (remainder && offset < data.length) {
                        const end = Math.min(offset + max - remainder, data.length);
                        await this.stream(data, offset, end);
                        offset = end;
                    }
                    await this.command(0x04);
                } else {
                    offset -= remainder || max;
                }
            }
            onProgress(offset);
            for (; offset < data.length;) {
                const end = Math.min(offset + max, data.length);
                await this.create(2, end - offset);
                await this.stream(data, offset, end);
                await this.command(0x04);
                offset = end;
                onProgress(offset);
            }
        }
    }

    $('ota420-start').onclick = start;
    $('ota420-pick').onclick = pick;
    $('ota420-retry').onclick = () => retry?.();
    controls();
})();
