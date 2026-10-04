WEB FIX V3 - 2.13 / 2.9 BWR FULL-SCREEN PICTURE - 2026-10-04

Based on: tanhoangphuc842002-rgb.github.io-main (2).zip
Firmware inspected: DH 290 CE v18.9 countdown 16char thin APPROTECT.
Also inspected: DH CE 2.13 v19.7 and DH no CE 2.13 v18.6.
No firmware files were changed or generated for this release.

Cause:
The previous web uploaded with WRITE_IMAGE (0x30), sent REFRESH (0x05),
then selected clock-image mode (0x83). This exposed the old clock RAM
in the first full refresh and required another refresh to draw the clock.

Change:
Only the standard 2.9 mode 0x83 path is changed. It selects picture mode,
initializes the controller, writes both image planes using SEND_COMMAND /
SEND_DATA, then selects mode 0x83. The firmware draws the right-hand clock
and full-refreshes the complete image and clock together.
No separate REFRESH or post-upload INIT is sent by this path.
The INIT-provided X offset is retained. Image physical rows: 102..295.

Additional full-screen picture fix:
The previous full-screen uploader left m_clock_image_mode enabled after
using clock-and-image. REFRESH therefore did not select MODE_PICTURE,
and later minute ticks overwrote the right edge of the uploaded picture.
The revised 2.9 full-screen uploader stops the clock before INIT. After
both WRITE_IMAGE planes, it sends unflagged mode 3 while the firmware's
transfer guard is active. This clears clock-image without drawing a GUI.
REFRESH then displays the full picture and selects/saves MODE_PICTURE.
There is no extra refresh, CLEAR command, font change or LUT change.

2.13 extension:
For nRF52 2.13 BWR (model 2), select MODE_PICTURE before INIT and upload.
This clears the CE clock-image flag, stops minute redraws and saves picture
mode through the existing 2.13 firmware path. The same sequence was checked
against no CE v18.6, which already clears the flag on WRITE_IMAGE.
2.13 BW (model 1) and DA14585 2.13 upload commands are unchanged.

Compatibility:
The LUT233 native mode 7 clock-and-image upload sequence is unchanged.
2.13 clock-and-image composition is unchanged; only full-screen BWR
picture-mode selection is corrected. 7.5, DA14585, countdown, DFU and
other screen paths are unchanged.
This web-only update does not alter firmware readback protection.

Testing:
JavaScript parsed in Chrome/Playwright.
Simulated the v18.9 transfer guard, RAM counters, both color planes,
CE/no-CE X offsets, default/large BLE MTU, and repeated uploads.
Verified one refresh in the revised standard path versus two previously.
Verified the native LUT233 path has identical packets and delays.
Verified the old full-screen path retains the clock-image flag; the new
path clears it, saves picture mode, and has no simulated minute overwrites.
Verified 2.13 BW, 7.5 and both 4.2 full-screen upload packets/delays unchanged.
Verified 2.13 CE/no-CE picture-mode save and both image planes at default
and large MTUs; no simulated minute overwrites across 1440 minute ticks.
Real-device display/BUSY behavior still needs a hardware test.

Usage:
Use the existing firmware; no reflashing is needed for the checked builds.
For this CE device select the standard CE/no-CE option, not LUT233.
Wait until upload reaches 100% before disconnecting. The web allows
32 seconds after the final mode command because this firmware has no
render-complete notification and its full-refresh BUSY timeout is 30 s.
This wait does not trigger another refresh.

GitHub:
Only index.html changed. This package also includes the previous
single-refresh clock-and-image correction. The companion JS files are included
unchanged in the ZIP. No changes are published automatically.
