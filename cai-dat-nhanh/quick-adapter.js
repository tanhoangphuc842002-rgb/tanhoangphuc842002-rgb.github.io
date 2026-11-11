/* Same-document adapter: no iframe Bluetooth permission or second transport. */
(() => {
  'use strict';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let lastError = '';
  window.addEventListener('dh-engine-log', event => {
    if (/lỗi|thất bại|failed|cancelled|hủy|chưa hỗ trợ/i.test(event.detail)) lastError = event.detail;
  });
  function snapshot() {
    const connected = !!gattServer?.connected && !!bleDevice?.gatt?.connected;
    const profile = window.VNTrial?.resourceProfile() || 0;
    return {
      connected, supported: connected && !!profile && !!epdCharacteristic,
      id: bleDevice?.id || '', name: bleDevice?.name || 'Chưa kết nối',
      profile, firmware: nrf52FirmwareVersion,
      panel: profile === 33 ? '2.13 inch' : profile === 41 ? '2.9 inch' : 'Chưa nhận diện',
      mode: nrf52DisplayMode
    };
  }
  function requireDevice(expected) {
    const value = snapshot();
    if (!value.connected) throw Error('Đồng hồ đã ngắt kết nối.');
    if (!value.supported) throw Error('Chưa nhận diện được bộ tài nguyên phù hợp. Công cụ chỉ cài cho nRF52 2.13 / 2.9 hỗ trợ dữ liệu tiếng Việt.');
    if (expected && value.id !== expected) throw Error('Thiết bị đã thay đổi. Hãy chạy lại từ đầu.');
    return value;
  }
  window.DHQuickDevice = {
    snapshot,
    async connect() {
      lastError = '';
      if (!navigator.bluetooth?.requestDevice) throw Error('Hãy mở công cụ bằng Chrome hoặc Edge có Bluetooth.');
      if (!snapshot().connected) {
        document.getElementById('ble-scan-filter').value = 'nrf';
        await preConnect();
      }
      if (!snapshot().connected) {
        // The legacy error handler resets its references but can leave radio connected.
        if (bleDevice?.gatt?.connected) bleDevice.gatt.disconnect();
        throw Error(lastError || 'Chưa kết nối được đồng hồ. Bạn có thể bấm quét lại.');
      }
      const device = bleDevice;
      const start = Date.now();
      while (!snapshot().supported && Date.now() - start < 5000) {
        if (bleDevice !== device || !device.gatt.connected) throw Error('Mất kết nối khi nhận diện đồng hồ.');
        await sleep(100);
      }
      return requireDevice();
    },
    async install(onProgress, expected) {
      requireDevice(expected);
      const result = await window.DHResourceSetup(onProgress);
      requireDevice(expected);
      return result;
    },
    async sync(expected) {
      const device = requireDevice(expected);
      if (new Date().getTimezoneOffset() % 60 !== 0) throw Error('Firmware này chỉ nhận múi giờ nguyên giờ. Chưa gửi ngày giờ.');
      // This protocol acknowledges GATT writes, not RTC readback.
      // Probe readiness after rendering; do not INIT again or save week_start.
      return window.VNTransport.run(async () => {
        const ready = await window.VNTransport.probeBasic();
        if (!ready[7] || ready[8]) throw Error('Hãy cài tài nguyên hoàn tất trước khi đồng bộ giờ.');
        requireDevice(device.id);
        await setTime({skipWeekStart: true});
        await window.VNTransport.probeBasic();
        requireDevice(device.id);
        return {sent: true, at: new Date().toISOString(), timezone: -new Date().getTimezoneOffset()};
      });
    },
    async disconnect(expected) {
      const device = bleDevice;
      if (expected && device?.id !== expected) throw Error('Thiết bị đã thay đổi; không ngắt thiết bị khác.');
      if (device?.gatt?.connected) device.gatt.disconnect();
      const start = Date.now();
      while (device?.gatt?.connected && Date.now() - start < 3000) await sleep(50);
      if (device?.gatt?.connected) throw Error('Chưa ngắt được kết nối Bluetooth.');
    },
    cancel() {
      window.VNTransport?.cancel();
      if (bleDevice?.gatt?.connected) bleDevice.gatt.disconnect();
    }
  };
})();
