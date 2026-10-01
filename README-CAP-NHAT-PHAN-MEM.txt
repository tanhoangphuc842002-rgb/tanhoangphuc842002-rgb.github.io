CAP NHAT PHAN MEM NRF52 QUA WEB BLUETOOTH

1. Mo trang web bang Chrome hoac Edge tren trang HTTPS (GitHub Pages).
2. Mo the "Cap nhat phan mem".
3. Chon dung file OTA Nordic co duoi .zip.
4. Bam "Bat dau cap nhat" va chon dong ho nRF52.
5. Khi dong ho da vao DFU, bam nut lan nua va chon thiet bi bootloader vua xuat hien.
6. Cho den khi web bao cap nhat hoan tat. Khong tat nguon, dong trang hoac di chuyen thiet bi ra xa.
7. Muon nap cho dong ho khac bang cung file OTA, bam "Cap nhat thiet bi khac", sau do bam nut bat dau va chon thiet bi moi.

Nut "Xoa nhat ky" chi xoa tien trinh/nhat ky DFU; file OTA da chon van duoc giu lai.

LUU Y:
- Khong chon full HEX, file ZIP ma nguon hoac firmware cua loai man hinh khac.
- OTA chi dung cho nRF52; khong dung cho DA14585.
- Thiet bi moi chua co bootloader/SoftDevice van phai nap full HEX bang J-Link lan dau.
- File OTA phai duoc ky bang dung khoa cua bootloader.

Thu vien Secure DFU: web-bluetooth-dfu cua Rob Moran, giay phep MIT.
Xem LICENSE-web-bluetooth-dfu.txt.
