#!/usr/bin/env python3
"""
Gộp cả trang thành MỘT file .html duy nhất, ảnh nhúng thẳng vào bên trong.

File tạo ra không gọi ra mạng một lần nào: không server, không link, không
tài khoản. Gửi qua Zalo / email / USB, mở offline vẫn chạy đầy đủ.

Cách dùng:
    python build.py                       # mặc định: rộng 900px, chất lượng 80
    python build.py --width 1080 --quality 85
    python build.py --out qua-tang.html

Cần: Pillow  (pip install Pillow)
"""

import argparse
import base64
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).parent


def nen_anh(duong_dan: Path, rong: int, chat_luong: int) -> bytes:
    """Thu nhỏ và nén lại một tấm ảnh, trả về bytes JPEG."""
    with Image.open(duong_dan) as im:
        im = ImageOps.exif_transpose(im)          # xoay đúng chiều máy chụp
        if im.mode != "RGB":
            im = im.convert("RGB")
        if im.width > rong:
            cao = round(im.height * rong / im.width)
            im = im.resize((rong, cao), Image.LANCZOS)

        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=chat_luong, optimize=True, progressive=True)
        return buf.getvalue()


def main() -> int:
    p = argparse.ArgumentParser(description="Gộp trang thành một file HTML duy nhất")
    p.add_argument("--width",   type=int, default=900, help="bề rộng ảnh tối đa (px)")
    p.add_argument("--quality", type=int, default=80,  help="chất lượng JPEG 1-95")
    p.add_argument("--out",     default="chuc-mung-sinh-nhat-bo.html")
    p.add_argument("--images",  default="image", help="thư mục chứa ảnh")
    args = p.parse_args()

    html_goc = (ROOT / "index.html").read_text(encoding="utf-8")
    css      = (ROOT / "style.css").read_text(encoding="utf-8")
    js       = (ROOT / "app.js").read_text(encoding="utf-8")

    # ── gom ảnh theo thứ tự 1, 2, 3 … ──
    thu_muc = ROOT / args.images
    if not thu_muc.is_dir():
        print(f"Không thấy thư mục ảnh: {thu_muc}", file=sys.stderr)
        return 1

    files = sorted(thu_muc.glob("*.jpg"), key=lambda f: int(f.stem) if f.stem.isdigit() else 1 << 30)
    if not files:
        print(f"Thư mục {thu_muc} không có file .jpg nào.", file=sys.stderr)
        return 1

    goc = sum(f.stat().st_size for f in files)
    anh, tong = [], 0
    for i, f in enumerate(files, 1):
        data = nen_anh(f, args.width, args.quality)
        tong += len(data)
        anh.append("data:image/jpeg;base64," + base64.b64encode(data).decode("ascii"))
        print(f"  [{i:2}/{len(files)}] {f.name:<10} {f.stat().st_size/1024:7.0f} KB -> {len(data)/1024:6.0f} KB")

    # ── nhúng vào HTML ──
    # json.dumps lo phần thoát ký tự; base64 vốn không có ký tự nguy hiểm,
    # nhưng cứ để nó xử lý cho chắc.
    khoi_anh = "window.PHOTOS = " + json.dumps(anh, separators=(",", ":")) + ";"

    html = html_goc.replace(
        '<link rel="stylesheet" href="style.css">',
        "<style>\n" + css + "\n</style>",
    )
    html = html.replace(
        '<script src="app.js"></script>',
        "<script>" + khoi_anh + "</script>\n<script>\n" + js + "\n</script>",
    )

    # Không được sót bất kỳ tham chiếu ra ngoài nào, nếu không file mang đi
    # nơi khác sẽ hỏng. Kiểm tra thật thay vì tin tưởng.
    if 'href="style.css"' in html or 'src="app.js"' in html:
        print("Không chèn được CSS/JS — index.html có thể đã đổi cấu trúc.", file=sys.stderr)
        return 1

    con_lai = [
        u for u in re.findall(r'(?:src|href)\s*=\s*"([^"]+)"', html)
        if not u.startswith(("data:", "#"))
    ]
    if con_lai:
        print(f"Còn tham chiếu ra ngoài, file sẽ không chạy offline: {con_lai}", file=sys.stderr)
        return 1

    out = ROOT / args.out
    out.write_text(html, encoding="utf-8")

    print()
    print(f"  Ảnh gốc      {goc/1024/1024:6.1f} MB")
    print(f"  Sau khi nén  {tong/1024/1024:6.1f} MB")
    print(f"  File kết quả {out.stat().st_size/1024/1024:6.1f} MB  ->  {out.name}")
    print()
    print("  Mở thử bằng cách bấm đúp vào file. Gửi cho bố qua Zalo / email đều được.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
