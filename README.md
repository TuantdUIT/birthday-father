# 🎂 Thổi nến — Trang chúc mừng sinh nhật bố

Trang tĩnh một file, không framework, không cần build. Mở `index.html` là chạy.

## Luồng trải nghiệm

| Màn | Thời điểm | Diễn ra |
|-----|-----------|---------|
| 1 | 0s → khi chạm | Bánh kem 2 tầng, 3 ngọn nến lung lay, quầng sáng ấm nhấp nháy cùng nhịp. Hướng dẫn "Chạm vào nến để thổi" + vòng sóng lan. Sau 5s không chạm thì nến rung mạnh hơn để nhắc. |
| 2 | 0 → 1.2s | Lửa nghiêng, tắt lệch nhau 0.1s từng cây, khói bay lên. **Tối đen nửa giây** — khoảng lặng trước khi bùng. Nhạc bật tại đây. |
| 3 | 1.2 → 6.5s | Pháo hoa nổ liên tiếp + confetti. Chữ "CHÚC MỪNG SINH NHẬT BỐ" hiện dần từng dòng. |
| 4 | 6.5s → | Pháo hoa mờ thành nền. Cả chồng ảnh bung ra từ tâm quả pháo hoa cuối, rồi **trôi chậm từ trên xuống**, hết ảnh 29 nối lại ảnh 1 — vòng lặp vô hạn. |

### Chồng ảnh trôi xuống

Các tấm ảnh **xếp đè lên nhau** thành một dải dọc dài, dải đó trôi chậm từ **trên xuống dưới**. Mỗi tấm lệch ngang và nghiêng một chút cho tự nhiên.

**Chạm vào một tấm** → dải dừng lại, tấm đó **trượt về đúng giữa màn hình**, dựng thẳng lại và phóng to vừa khung; các tấm khác mờ đi; nền chuyển thành bản blur của chính tấm đó; chú thích hiện ra. **Chạm lần nữa** (bất kỳ đâu) hoặc bấm `Esc` → tấm ảnh về chỗ cũ và mọi thứ trôi tiếp.

Thông số trong `CONFIG` ([app.js](app.js)):

| Khoá | Mặc định | Ý nghĩa |
|---|---|---|
| `dropSpeed` | `42` | Tốc độ trôi, pixel/giây. Nhỏ hơn = chậm hơn. |
| `cardWidth` | `0.78` | Bề rộng mỗi tấm so với bề rộng màn hình |
| `cardMax` | `460` | Nhưng không quá bấy nhiêu pixel |
| `overlap` | `0.34` | Hai tấm liền nhau đè lên nhau bao nhiêu (0 → 1) |
| `tilt` | `3.5` | Độ nghiêng tối đa mỗi tấm (độ) |
| `focusFit` | `0.92` | Tấm được chọn chiếm tối đa bao nhiêu phần màn hình |
| `focusZoom` | `2` | Nhưng không phóng quá bấy nhiêu lần |
| `rates` | `[0.25, 0.5, 1, 1.5, 2, 3, 5]` | Các nấc tốc độ khi vuốt |
| `rateStart` | `2` | Nấc lúc mới vào (chỉ số 2 → ×1) |

### Vuốt để đổi tốc độ

- **Vuốt xuống** (cùng chiều ảnh trôi) → nhanh hơn một nấc.
- **Vuốt lên** (ngược chiều) → chậm lại một nấc.
- Trên máy tính: **con lăn chuột** hoặc phím **↑ ↓**.
- Mỗi lần đổi, một huy hiệu `×2` hiện ở đáy màn hình rồi tự tắt sau 1.3 giây.

Quy ra thời gian thực (điện thoại 390×844, một vòng 29 ảnh):

| Nấc | ×0.25 | ×0.5 | ×1 | ×1.5 | ×2 | ×3 | ×5 |
|---|---|---|---|---|---|---|---|
| Một vòng | 12.3 phút | 6.2 phút | 3.1 phút | 2.1 phút | 1.5 phút | 1.0 phút | 0.6 phút |

Muốn nấc khác thì sửa mảng `rates` — nó chỉ là hệ số nhân với `dropSpeed`.

Với mặc định: trên điện thoại 390×844 thấy cùng lúc khoảng **4 tấm**, một vòng 29 ảnh mất **~3 phút**; trên desktop 1440×900 thấy ~3 tấm, một vòng ~4.7 phút.

### Vài chỗ dễ hỏng nếu sửa

**Vòng lặp liền mạch**: dải chứa **2 bản sao** của cả 29 tấm, cao đúng `2 × một vòng`, và khung hình chạy `translateY(-50%) → 0`. Ba con số này phải khớp nhau, lệch một chút là thấy mối nối nhảy.

**Chuyển động dùng Web Animations API, không phải CSS animation.** Lý do: đổi `animation-duration` của CSS giữa chừng sẽ làm dải nhảy vọt, vì tiến độ tính theo tỉ lệ thời-gian-đã-chạy trên tổng thời gian. `anim.playbackRate` thì đổi tốc độ mượt ngay tại vị trí đang chạy. Cùng lý do đó, `setDuration()` khi xoay máy phải giữ lại tỉ lệ tiến độ cũ rồi đặt lại `currentTime`.

**Độ lệch ngang và độ nghiêng** sinh từ hàm `rnd(i, salt)` — ngẫu nhiên nhưng **cố định theo số thứ tự ảnh**. Nếu đổi sang `Math.random()` thì hai bản sao của cùng một tấm sẽ lệch khác nhau, lúc vòng lặp nối lại ảnh sẽ giật sang chỗ khác.

**Khung ảnh** dùng `aspect-ratio: 3/4` vì cả 29 ảnh đều đúng 960×1280. Nếu thêm ảnh tỉ lệ khác thì `object-fit: cover` sẽ cắt bớt — lúc đó đổi sang `contain`.

**Căn giữa khi chọn**: `transform` của tấm được chọn là `translate() rotate() scale()` — đúng thứ tự đó. CSS chạy transform từ phải sang trái, tức `scale` trước; scale quay quanh tâm chính nó nên không làm tâm xê dịch, nhờ vậy khoảng dời tính từ kích thước lúc chưa phóng to vẫn đúng. Đảo thứ tự hai phép này là ảnh sẽ lệch khỏi tâm.

Chữ chú thích chia ngược cho `var(--fs)` để khỏi bị phóng to theo tấm ảnh.

### Tải ảnh

58 thẻ ảnh mà nạp hết ngay thì tốn 8.6MB một lúc, nên `app.js` dùng IntersectionObserver: chỉ gán `src` khi tấm đó sắp trôi vào màn hình (`rootMargin: 600px`). Riêng 5 tấm đầu được nạp trước ngay từ màn bánh kem, vì lúc đó `#gallery` còn `display: none` nên observer chưa thể khớp.

## Chỉnh sửa nội dung

Mở `app.js`, sửa khối `CONFIG` ở ngay đầu file:

```js
const CONFIG = {
  photoCount: 29,          // số ảnh trong thư mục image/
  dropSpeed: 42,           // tốc độ trôi (pixel/giây)
  captions: {
    1: 'Những ngày cả nhà mình bên nhau',
    5: 'Chiều hoàng hôn ở biển',   // thêm dòng nào tuỳ ý
  },
};
```

Ảnh **không có** chú thích thì chỉ hiện ảnh, không sao cả. Không cần điền đủ 29 dòng.

Muốn đổi lời chúc ở màn pháo hoa: sửa trực tiếp trong `index.html`, phần `<section id="scene-message">`.

## Nhạc

Mặc định trang **tự chơi giai điệu Happy Birthday bằng tiếng hộp nhạc** (tổng hợp bằng Web Audio API). Không cần file nhạc, không dính bản quyền — giai điệu Happy Birthday đã thuộc phạm vi công cộng, chỉ các *bản thu âm* cụ thể mới có bản quyền.

Muốn thay bằng nhạc thật (hoặc bản thu cả nhà hát — cái này hay hơn nhiều):

```
audio/happy-birthday.mp3
```

Bỏ file vào đúng đường dẫn đó là trang tự dùng, không cần sửa code.

## Chạy thử

```bash
# cần server tĩnh, mở file:// trực tiếp sẽ chặn một số thứ
python -m http.server 8000
# rồi mở http://localhost:8000
```

## Ảnh

Ảnh đặt trong `image/`, đặt tên `1.jpg` … `29.jpg` — thứ tự số chính là thứ tự xuất hiện. Muốn đổi thứ tự thì đổi tên file.

Thư mục `image/` bị `.gitignore` bỏ qua, **ảnh không bao giờ được commit**. Lúc deploy, workflow tải ảnh từ kho riêng tư trên Cloudflare R2 — xem mục dưới.

## Một file duy nhất (khuyến nghị)

```bash
python build.py
```

Tạo ra `chuc-mung-sinh-nhat-bo.html` — **một file chứa tất cả**: trang, nhạc, và cả 29 ảnh nhúng dạng base64. Không gọi mạng một lần nào, mở offline vẫn chạy đủ. Không server, không link, không tài khoản → riêng tư tuyệt đối.

```bash
python build.py --width 720 --quality 72     # file nhẹ hơn
python build.py --width 1080 --quality 85    # nét hơn
python build.py --out qua-tang.html
```

Mặc định (900px, chất lượng 80): ảnh gốc 8.5MB → file kết quả **6.8MB**.

Script tự kiểm tra và **báo lỗi nếu còn sót tham chiếu ra ngoài** — vì một link `href` bỏ quên là file mang đi nơi khác sẽ hỏng.

### Mở trên điện thoại

Đây là chỗ vướng nhất của phương án này: mở một file HTML nằm trong máy thì mỗi điện thoại một kiểu. Ba cách, xếp theo độ chắc ăn:

**1. Mở trên điện thoại của bạn rồi đưa bố xem** — chắc ăn nhất, và với sinh nhật thì cũng tự nhiên nhất. Chép file sang máy mình (cáp USB, hoặc Zalo tự gửi cho chính mình), mở thử trước bằng Chrome/Safari cho chắc, hôm đó chỉ việc đưa máy.

**2. Gửi file cho bố tự mở** — được nhưng lích kích:
- *Android*: lưu file → mở app **Tệp** → thư mục **Download** → chạm file → chọn **Mở bằng → Chrome**
- *iPhone*: lưu vào app **Tệp** → chạm giữ file → **Chia sẻ → Safari**

Zalo hay chặn hoặc đổi tên file `.html`. Gửi qua **Google Drive** đáng tin hơn: upload file lên Drive, chia sẻ cho bố, bố tải về rồi mở bằng trình duyệt. (Drive chỉ dùng để *chuyển file* — nó không chạy được trang web, xem mục dưới.)

**3. Nếu bố phải tự mở mà không cần hướng dẫn** thì nên host và gửi link. Đổi lại phải chấp nhận trang nằm trên mạng — xem mục Deploy.

## Deploy

### Vì sao không dùng Google Drive

Drive **không host được web** — Google bỏ tính năng này từ 2016. Hotlink ảnh kiểu `drive.google.com/uc?id=...` là đường không chính thức, bị siết theo hạn ngạch, vài chục lượt xem là trả về lỗi thay vì ảnh. Và muốn ảnh hiện được thì phải đặt "Bất kỳ ai có đường liên kết" — tức là công khai, không riêng tư hơn gì.

Drive chỉ hợp để **chuyển file** cho bố, không hợp để chạy trang.

### Vì sao không dùng GitHub Pages

**GitHub Pages luôn công khai.** Kể cả khi repo để private, trang deploy ra vẫn ai có link cũng xem được — Pages riêng tư chỉ có trên GitHub Enterprise Cloud. Vì vậy trang này deploy lên **Cloudflare Pages**, nơi có thể bật xác thực miễn phí.

### Luồng hoạt động

```
   git repo                  Cloudflare R2              Cloudflare Pages
 (chỉ mã nguồn)            (kho ảnh riêng tư)            (trang đã deploy)
      │                            │                            │
      └──── GitHub Actions ────────┘                            │
             tải ảnh về, nén lại, gói chung với trang ──────────►│
                                                                 │
                                                    Cloudflare Access
                                                   (chặn người không phận sự)
```

Ảnh không nằm trong git, và vì được phục vụ từ **cùng tên miền** với trang nên Cloudflare Access bảo vệ được cả trang lẫn ảnh bằng một lớp duy nhất.

### Cần chuẩn bị

**1. Đưa ảnh lên R2** — tạo bucket ở Cloudflare dashboard (R2 → Create bucket), **để chế độ private**, upload thư mục `image/` vào. Sau đó tạo API token (R2 → Manage API Tokens) quyền *Object Read*.

**2. Tạo project Pages** — Workers & Pages → Create → Pages → Direct Upload, đặt tên project. Không cần nối với GitHub.

**3. Khai secret trong repo** (Settings → Secrets and variables → Actions):

| Secret | Lấy ở đâu |
|---|---|
| `R2_ACCESS_KEY_ID` | Token R2 vừa tạo |
| `R2_SECRET_ACCESS_KEY` | Token R2 vừa tạo |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | Tên bucket |
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens, quyền *Cloudflare Pages: Edit* |
| `CLOUDFLARE_ACCOUNT_ID` | Góc phải dashboard |
| `CLOUDFLARE_PROJECT` | Tên project Pages ở bước 2 |

**4. Bật Cloudflare Access** — Zero Trust → Access → Applications → Add self-hosted, trỏ vào tên miền Pages, đặt policy cho phép đúng những email được xem. Miễn phí tới 50 người. Bố sẽ nhận mã một lần qua email khi vào trang.

Xong bước này thì mỗi lần `git push` lên nhánh `main` là workflow tự chạy. Muốn chạy tay thì vào tab Actions bấm *Run workflow*.

### Workflow làm gì

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) — 6 bước: lấy mã nguồn → gom file trang → tải ảnh từ R2 → **kiểm tra số ảnh khớp `photoCount`** → nén ảnh xuống 900px → đẩy lên Pages.

Bước kiểm tra số ảnh là cố ý: thiếu ảnh thì trang trắng trơn mà deploy vẫn "thành công", nên để nó hỏng ngay ở CI còn hơn phát hiện lúc bố mở link.

### Nếu thấy quá phức tạp

Hai lựa chọn nhẹ hơn, đổi lại mức riêng tư thấp hơn:

- **Link bí mật**: bỏ bước 4 (Access). Trang vẫn ở Cloudflare Pages với tên miền dài khó đoán, đã có sẵn `noindex` nên Google không lập chỉ mục. Bố chỉ cần bấm link, không phải nhập mã. Riêng tư ở mức "không ai tìm thấy", không phải "không ai xem được".
- **Không host gì cả**: nhúng thẳng 29 ảnh dạng base64 vào một file `.html` duy nhất rồi gửi qua Zalo. File khoảng 12MB, mở offline được, không server nào giữ ảnh. Đổi lại không "deploy" và khó cập nhật.

## Tối ưu trước khi gửi cho bố

29 ảnh hiện nặng **8.6MB**, tải qua 4G khá lâu. Ảnh gốc 960×1280 nhưng trên trang chỉ hiển thị rộng tối đa 400px CSS (~900px thực ở màn hình 2x), nên thu nhỏ xuống 900px là dư dùng:

```bash
# cần ImageMagick
cd image
for f in *.jpg; do magick "$f" -resize 900x1200\> -quality 82 "${f%.jpg}.webp"; done
```

Rồi đổi `photoExt: '.webp'` trong `CONFIG`. Dung lượng còn khoảng 1.5MB, mắt thường không phân biệt được.

## Ghi chú kỹ thuật

- **Autoplay**: trình duyệt chặn nhạc tự phát. Cú chạm thổi nến chính là "user gesture" hợp lệ nên nhạc chạy được — đây là lý do màn 1 bắt buộc phải có tương tác.
- **Chống chạm 2 lần**: có khoá `started`, animation không chạy chồng.
- **`prefers-reduced-motion`**: nếu người xem bật chế độ giảm chuyển động, trang tự bỏ Ken Burns và rút ngắn intro, giữ nguyên phần còn lại.
- **Nút loa** cố định góc trên phải, 46px cho dễ bấm.
