/* Customer setup only: same validated ERS/GATT installer, bundled web data.
 * No device writes occur on page load or when the font selector changes. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  let preparing = false;
  const family = () => $('resourceVietnameseFamily');
  const installer = () => root.ExternalResourceInstaller;
  function message(text) {
    $('externalResourceStatus').textContent = text;
    if (typeof root.addLog === 'function') root.addLog(text);
  }
  async function load() {
    if (preparing || installer().busy() || root.DeviceOperations?.current) return false;
    preparing = true; family().disabled = true; installer().controls();
    try { return await root.ExternalResourceEditor.loadDefault(); }
    finally { preparing = false; family().disabled = false; installer().controls(); }
  }
  async function install() {
    if (preparing || installer().busy() || root.DeviceOperations?.current) return;
    preparing = true; family().disabled = true; installer().controls();
    const auto=$('externalResourceAutoOffline'),withArt=typeof appVersion!=='undefined'&&[0x4A,0x4B,0x4C,0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x62,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6A,0x6B].includes(appVersion),offline=!!auto?.checked;
    if(withArt&&auto)auto.checked=false;
    try {
      message('Đang chuẩn bị bộ cài đồng hồ. Giữ kết nối Bluetooth và không đóng trang.');
      if (!await root.ExternalResourceEditor.loadDefault()) {
        message('Không chuẩn bị được bộ cài. Chưa ghi dữ liệu vào đồng hồ.');
        return;
      }
      const ok=await installer().install();
      if(ok&&withArt){await root.ArtClock75.installDefault();if([0x65,0x66,0x67,0x68,0x69,0x6A,0x6B].includes(appVersion))await root.ArtClock75.installIntegrated();if(offline)await installer().runOffline();}
    } catch (error) { message(`Cài đặt chưa hoàn tất: ${error.message}`); }
    finally { if(withArt&&auto)auto.checked=offline;preparing = false; family().disabled = false; installer().controls(); }
  }
  root.ClockSetup = { install, load, busy: () => preparing };
  family().addEventListener('change', load);
  load();
})(globalThis);
