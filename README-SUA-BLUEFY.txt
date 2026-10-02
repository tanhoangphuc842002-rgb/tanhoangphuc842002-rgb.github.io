BAN SUA TUONG THICH BLUEFY - 02/10/2026

THAY DOI
- Trang moi them UUID DFU 0xFE59 dang so vao optionalServices cua lenh quet.
  Trang cu dung UUID dang chuoi cho tat ca cac dich vu.
- Ban nay dung UUID day du: 0000fe59-0000-1000-8000-00805f9b34fb.
- Thu vien SecureDfu cung duoc cau hinh UUID dang chuoi truoc khi tao doi
  tuong, de ca lenh quet va lenh getPrimaryService deu dung cung kieu UUID.
- Nhat ky quet hien ca ten loi; thong bao trinh duyet co huong dan Bluefy.

LUU Y VE NGUYEN NHAN
So 0xFE59 hop le theo chuan Web Bluetooth. Tuy nhien, day la thay doi duy nhat
trong tham so quet so voi trang cu, va la diem nghi ngo gay khong tuong thich
voi cau noi Bluetooth cua Bluefy. Chua xac nhan truc tiep tren iPhone.
Chuan API: https://bluetooth.spec.whatwg.org/

SU DUNG
1. Tai tat ca file trong thu muc nay len thu muc goc kho GitHub Pages cua ban.
   File index.html phai o thu muc goc, cung cac file .js; khong tai them mot
   thu muc long vao ngoai cac file.
2. Sau khi GitHub Pages cap nhat, mo lai trang bang Bluefy. De tranh dung lai
   ban luu cu, mo URL co them ?bluefyfix=20261002 o cuoi.
3. Bam Quet thiet bi, chon dong ho va ket noi nhu truoc.
4. Neu van bi loi, sao chep dong loi moi nhat trong Nhat ky de kiem tra tiep.

KIEM TRA DA THUC HIEN
- Tat ca 9 khoi script trong HTML va cac file JavaScript deu hop le.
- Mo trang day du trong Edge tu dong, voi kich thuoc 390x844: khong loi JS.
- Nut quet goi requestDevice ngay trong lan bam; giu du 5 UUID dich vu.
- Doc ZIP OTA, bat nut cap nhat, mo luong chon DFU va huy chon: thanh cong
  trong kiem tra mo phong Bluetooth.
- Kiem tra cau noi chi nhan UUID chuoi: ban cu that bai, ban sua qua duoc
  ca quet thuong va DFU; truy cap dich vu tren thiet bi da ket noi dung chuoi.
- Chua kiem tra quet BLE that hoac truyen OTA that tren iPhone/Bluefy.
