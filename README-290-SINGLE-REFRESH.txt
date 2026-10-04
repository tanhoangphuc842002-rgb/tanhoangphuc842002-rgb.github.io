WEB FIX - 2.9 CE CLOCK AND IMAGE - 2026-10-04

Based on: tanhoangphuc842002-rgb.github.io-main (2).zip
Firmware inspected: DH 290 CE v18.9 countdown 16char thin APPROTECT.
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

Compatibility:
LUT233 native mode 7 retains its original upload sequence.
2.13, 7.5, DA14585, countdown, DFU and other screen paths are unchanged.
This web-only update does not alter firmware readback protection.

Testing:
JavaScript parsed in Chrome/Playwright.
Simulated the v18.9 transfer guard, RAM counters, both color planes,
CE/no-CE X offsets, default/large BLE MTU, and repeated uploads.
Verified one refresh in the revised standard path versus two previously.
Verified the native LUT233 path has identical packets and delays.
Real-device display/BUSY behavior still needs a hardware test.

Usage:
Use the existing v18.9 firmware; no reflashing is needed.
For this CE device select the standard CE/no-CE option, not LUT233.
Wait until upload reaches 100% before disconnecting. The web allows
32 seconds after the final mode command because this firmware has no
render-complete notification and its full-refresh BUSY timeout is 30 s.
This wait does not trigger another refresh.

GitHub:
Only index.html changed. The original companion JS files are included
unchanged in the ZIP. No changes are published automatically.
