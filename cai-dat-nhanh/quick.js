(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const api = window.DHQuickDevice;
  let active = null, sequence = 0, completed = 0, observedId = '';
  const rows = [], logs = [];
  const steps = ['connect', 'resources', 'time', 'disconnect'];
  document.title = 'DH EPD - Cài đặt nhanh';
  lucide.createIcons({root: $('quick-app')});
  function log(message) {
    logs.push(new Date().toLocaleTimeString('vi-VN') + '  ' + message);
    if (logs.length > 400) logs.shift();
    $('q-log').textContent = logs.join('\n');
    $('q-log').scrollTop = $('q-log').scrollHeight;
  }
  window.addEventListener('dh-engine-log', event => log(String(event.detail)));
  function status(title, detail, error = false) {
    $('q-status').textContent = title;
    $('q-detail').textContent = detail;
    $('quick-app').dataset.error = String(error);
  }
  function step(name, state, detail) {
    const node = document.querySelector('#quick-app [data-step="' + name + '"]');
    node.className = state;
    node.querySelector('small').textContent = detail;
    node.querySelector('span').textContent = state === 'done' ? '✓' : String(steps.indexOf(name) + 1);
  }
  function resetSteps() {
    steps.forEach((name, i) => step(name, '', ['Chờ chọn thiết bị', 'Chưa cài', 'Chưa gửi', 'Chưa thực hiện'][i]));
  }
  function controls() {
    const device = api.snapshot(), busy = !!active;
    $('q-start').disabled = busy || !navigator.bluetooth?.requestDevice;
    $('q-connect').disabled = busy || device.connected || !navigator.bluetooth?.requestDevice;
    $('q-reconnect').disabled = busy || !device.reconnectAvailable;
    $('q-install').disabled = busy || !device.supported;
    $('q-sync').disabled = busy || !device.supported;
    $('q-disconnect').disabled = busy || !device.connected;
    $('q-clear').disabled = busy || rows.length === 0;
    $('q-stop').hidden = !busy;
    $('q-stop').disabled = !!active?.cancelled;
    $('q-connection').textContent = device.connected ? 'Đã kết nối' : 'Chưa kết nối';
    $('q-connection').classList.toggle('connected', device.connected);
    if (device.connected) {
      $('q-name').textContent = device.name;
      $('q-model').textContent = device.panel + ' · Firmware ' + device.firmware + (device.supported ? ' · Đã nhận diện tài nguyên' : ' · Chưa có bộ cài phù hợp');
      observedId = device.id;
    } else if (!observedId) {
      $('q-name').textContent = 'Chưa chọn đồng hồ';
      $('q-model').textContent = 'nRF52 · 2.13 / 2.9 · CE và no CE';
    }
  }
  function guard(run) {
    if (active !== run || run.cancelled) throw Error('Đã dừng. Kết nối lại để tiếp tục cài đặt.');
    if (run.device && api.snapshot().id !== run.device.id) throw Error('Thiết bị đã thay đổi. Hãy chạy lại.');
  }
  async function connect(run, reconnect = false) {
    run.step = 'connect'; step('connect', 'active', 'Đang nhận diện');
    status(reconnect ? 'Đang kết nối lại' : 'Đang kết nối', reconnect ? 'Đang nối lại đồng hồ vừa chọn.' : 'Chọn đồng hồ trong cửa sổ Bluetooth.');
    $('q-progress').removeAttribute('value');
    const device = await (reconnect ? api.reconnect() : api.connect());
    if (run.cancelled) { await api.disconnect(device.id); guard(run); }
    guard(run); run.device = device;
    step('connect', 'done', device.panel);
    controls();
  }
  async function resources(run) {
    guard(run); run.step = 'resources';
    step('resources', 'active', 'Đang cài / kiểm tra');
    status('Đang cài tài nguyên', 'Giữ đồng hồ ở gần, không tháo pin.');
    $('q-progress').removeAttribute('value');
    const observer = new MutationObserver(() => {
      if (active === run && !run.cancelled) $('q-detail').textContent = $('vn-setup-status').textContent;
    });
    observer.observe($('vn-setup-status'), {childList: true, subtree: true, characterData: true});
    try {
      const result = await api.install(value => {
        if (active === run && !run.cancelled) $('q-progress').value = Math.min(99, Math.max(0, value));
      }, run.device.id);
      guard(run);
      if (!result?.verified) throw Error('Chưa xác nhận được tài nguyên đã lưu.');
      $('q-progress').value = 100;
      step('resources', 'done', 'Đã kiểm tra dữ liệu');
    } finally { observer.disconnect(); }
  }
  async function sync(run) {
    guard(run); run.step = 'time'; step('time', 'active', 'Đang gửi');
    status('Đang đồng bộ giờ', 'Gửi ngày giờ và múi giờ của máy tính.');
    $('q-progress').removeAttribute('value');
    const result = await api.sync(run.device.id);
    guard(run);
    if (!result?.sent) throw Error('Chưa gửi được ngày giờ.');
    run.synced = result;
    step('time', 'done', 'Đã gửi giờ');
    log('Đã gửi ngày giờ: ' + new Date(result.at).toLocaleString('vi-VN') + ' · UTC' + (result.timezone >= 0 ? '+' : '') + result.timezone / 60);
    $('q-progress').value = 100;
  }
  async function disconnect(run) {
    guard(run); run.step = 'disconnect'; step('disconnect', 'active', 'Đang ngắt');
    status('Đang ngắt kết nối', run.device.name);
    await api.disconnect(run.device.id);
    guard(run); step('disconnect', 'done', 'Đã ngắt');
  }
  function addHistory(run) {
    completed++;
    rows.unshift({name: run.device.name, panel: run.device.panel, firmware: run.device.firmware, time: new Date()});
    if (rows.length > 30) rows.pop();
    renderHistory();
  }
  function renderHistory() {
    $('q-count').textContent = 'Hoàn tất trong phiên: ' + completed;
    $('q-empty').hidden = rows.length > 0;
    $('q-history-list').replaceChildren();
    for (const row of rows) {
      const item = document.createElement('li'), info = document.createElement('div');
      const name = document.createElement('strong'), meta = document.createElement('small'), result = document.createElement('div');
      name.textContent = row.name;
      meta.textContent = row.panel + ' · Firmware ' + row.firmware;
      result.className = 'q-result'; result.textContent = 'Hoàn tất';
      const time = document.createElement('small'); time.textContent = row.time.toLocaleTimeString('vi-VN');
      result.append(time); info.append(name, meta); item.append(info, result); $('q-history-list').append(item);
    }
  }
  async function run(kind) {
    if (active) return;
    const session = {id: ++sequence, started: Date.now(), cancelled: false, device: null, step: 'connect'};
    active = session; resetSteps(); controls();
    try {
      if (kind === 'quick' || kind === 'connect' || kind === 'reconnect') await connect(session, kind === 'reconnect');
      else {
        const device = api.snapshot();
        if (!device.connected) throw Error('Hãy kết nối đồng hồ trước.');
        session.device = device; step('connect', 'done', device.panel);
      }
      guard(session);
      if (kind === 'quick' || kind === 'resources') await resources(session);
      if (kind === 'quick' || kind === 'time') await sync(session);
      if (kind === 'quick' || kind === 'disconnect') await disconnect(session);
      guard(session);
      if (kind === 'quick') {
        addHistory(session);
        status('Hoàn tất', session.device.name + ' · Đã kiểm tra tài nguyên, gửi giờ và ngắt kết nối.');
      } else {
        status('Hoàn tất thao tác', ({connect: 'Đã kết nối đồng hồ.', reconnect: 'Đã kết nối lại đồng hồ vừa chọn.', resources: 'Đã kiểm tra tài nguyên đã lưu.', time: 'Đã gửi ngày giờ hiện tại.', disconnect: 'Đã ngắt kết nối.'})[kind]);
      }
      log($('q-detail').textContent);
      $('q-progress').value = 100;
    } catch (error) {
      step(session.step, 'error', session.cancelled ? 'Đã dừng' : 'Chưa hoàn tất');
      status(session.cancelled ? 'Đã dừng' : 'Chưa hoàn tất', error.message || String(error), true);
      $('q-progress').value = 0;
      log('Chưa hoàn tất: ' + (error.message || error));
    } finally {
      if (active === session) active = null;
      $('q-elapsed').textContent = Math.floor((Date.now() - session.started) / 1000) + ' giây';
      controls(); $('q-start').focus({preventScroll: true});
    }
  }
  $('q-start').onclick = () => run('quick');
  $('q-connect').onclick = () => run('connect');
  $('q-reconnect').onclick = () => run('reconnect');
  $('q-install').onclick = () => run('resources');
  $('q-sync').onclick = () => run('time');
  $('q-disconnect').onclick = () => run('disconnect');
  $('q-stop').onclick = () => {
    if (!active) return;
    active.cancelled = true; api.cancel();
    status('Đang dừng', 'Chờ thao tác hiện tại kết thúc.'); controls();
  };
  $('q-clear').onclick = () => { rows.length = 0; completed = 0; renderHistory(); controls(); };
  window.addEventListener('beforeunload', event => {
    if (active) { event.preventDefault(); event.returnValue = ''; }
  });
  setInterval(() => {
    $('q-clock').textContent = new Date().toLocaleString('vi-VN');
    if (active) $('q-elapsed').textContent = Math.floor((Date.now() - active.started) / 1000) + ' giây';
    controls();
  }, 500);
  if (!navigator.bluetooth?.requestDevice) status('Trình duyệt chưa có Bluetooth', 'Mở địa chỉ này bằng Chrome hoặc Edge trên máy tính / Android.', true);
  controls();
})();
