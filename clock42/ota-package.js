'use strict';

const ota420DfuService = 0xfe59;

async function readOta420Package(file) {
    const invalid = 'Hãy chọn tệp cập nhật phần mềm (.zip) dành cho Đồng hồ 4.2.';
    const wrongArchive = 'Tệp này không dùng để cập nhật trên web. Nếu tải cả bộ phần mềm, hãy giải nén và chọn tệp cập nhật .zip bên trong.';
    if (!/\.zip$/i.test(file.name)) throw Error(invalid);
    if (file.size > 128 * 1024) throw Error(wrongArchive);
    if (!globalThis.crypto?.subtle || !window.JSZip) {
        throw Error('Hãy mở trang web chính thức bằng Chrome hoặc Edge để kiểm tra tệp cập nhật.');
    }
    const zip = await JSZip.loadAsync(await file.arrayBuffer()).catch(() => { throw Error(invalid); });
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile || Object.keys(zip.files).length !== 3 ||
        manifestFile._data.uncompressedSize > 4096) {
        throw Error(wrongArchive);
    }
    const metadata = await manifestFile.async('string').then(JSON.parse).catch(() => { throw Error(invalid); });
    const manifest = metadata?.manifest;
    const app = manifest?.application;
    if (!app || Object.keys(manifest).length !== 1 ||
        !/^[\w.-]+\.bin$/i.test(app.bin_file) || !/^[\w.-]+\.dat$/i.test(app.dat_file)) {
        throw Error(invalid);
    }
    const binary = zip.file(app.bin_file);
    const packet = zip.file(app.dat_file);
    // JSZip 3 exposes these sizes before inflation. The signed metadata and actual length
    // are checked below as well.
    const maxApp = 0xd000;
    if (!binary || !packet || binary._data.uncompressedSize > maxApp ||
        packet._data.uncompressedSize > 1024) {
        throw Error(invalid);
    }
    const [data, initPacket] = await Promise.all([binary.async('uint8array'), packet.async('uint8array')])
        .catch(() => { throw Error(invalid); });
    const outer = dfu420Fields(initPacket);
    const signed = dfu420Fields(outer.get(2));
    const command = dfu420Fields(signed.get(1));
    const init = dfu420Fields(command.get(2));
    const hash = dfu420Fields(init.get(8));
    const signature = signed.get(3);
    const sdReq = init.get(3);
    // SoftDevice S112 7.3.0 has firmware ID 0x126 (packed varint A6 02).
    const matchingSd = sdReq === 0x126 || (sdReq?.length === 2 && sdReq[0] === 0xa6 && sdReq[1] === 0x02);
    const appVersion = init.get(1);
    if (outer.has(1) || command.get(1) !== 1 || signed.get(2) !== 0 ||
        signature?.length !== 64 || init.get(2) !== 52 || !matchingSd || init.get(4) !== 0 ||
        [5, 6].some(field => (init.get(field) ?? 0) !== 0) || (init.get(9) ?? 0) !== 0 ||
        !Number.isInteger(appVersion) || appVersion < 0xa0 || appVersion > 255 ||
        !data.length || data.length > maxApp || data.length !== init.get(7) ||
        hash.get(1) !== 3 || hash.get(2)?.length !== 32) {
        throw Error(invalid);
    }
    const key = await crypto.subtle.importKey('jwk', {
        kty: 'EC', crv: 'P-256',
        x: 'GFGuC3G4pI3SfB56dwDmjGVV5aVRe4n-mMrrc46ZP88',
        y: 'VV4hbJb-BvKzezSN-MHA_m8Z97W8492gWA4MGcfjIgg',
    }, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    const rawSignature = new Uint8Array([...signature.slice(0, 32).reverse(), ...signature.slice(32).reverse()]);
    if (!digest.every((value, i) => value === hash.get(2)[31 - i]) ||
        !await crypto.subtle.verify({name: 'ECDSA', hash: 'SHA-256'}, key, rawSignature, command.get(2))) {
        throw Error('Không xác minh được tệp cập nhật. Hãy tải lại tệp dành cho Đồng hồ 4.2.');
    }
    return {data, initPacket, appVersion};
}

function dfu420Fields(bytes) {
    const invalid = 'Không đọc được tệp cập nhật. Hãy tải lại tệp dành cho Đồng hồ 4.2.';
    if (!(bytes instanceof Uint8Array)) throw Error(invalid);
    let at = 0;
    function integer() {
        let value = 0;
        for (let shift = 0; shift <= 28 && at < bytes.length; shift += 7) {
            const byte = bytes[at++];
            value += (byte & 127) * 2 ** shift;
            if (value > 0xffffffff) break;
            if (byte < 128) return value;
        }
        throw Error(invalid);
    }
    const fields = new Map();
    while (at < bytes.length) {
        const tag = integer();
        const id = tag >>> 3;
        const wire = tag & 7;
        if (!id || fields.has(id)) throw Error(invalid);
        if (wire === 0) {
            fields.set(id, integer());
        } else if (wire === 2) {
            const size = integer();
            if (size > bytes.length - at) throw Error(invalid);
            fields.set(id, bytes.subarray(at, at + size));
            at += size;
        } else {
            throw Error(invalid);
        }
    }
    return fields;
}
