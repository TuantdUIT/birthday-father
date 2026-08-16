/* ══════════════════════════════════════════════════
   "Thổi nến" — app.js
   Luồng: bánh & nến → thổi → pháo hoa + lời chúc → ảnh
   ══════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   ①  PHẦN CHỈNH SỬA — sửa ở đây là đủ
   ───────────────────────────────────────────── */
const CONFIG = {
  // Ảnh nằm trong thư mục image/, đặt tên 1.jpg … 29.jpg
  photoCount: 29,
  photoDir:   'image/',
  photoExt:   '.jpg',

  // Chú thích cho từng ảnh. Bỏ trống ('') thì ảnh đó không hiện chữ.
  // Chỉ số 1 = ảnh 1.jpg, chỉ số 2 = 2.jpg, …
  captions: {
    1:  'Những ngày cả nhà mình bên nhau',
    // 2:  '…',
    // 3:  '…',
    // Điền thêm tuỳ ý, không bắt buộc phải đủ 29 dòng.
  },

  // ── Chồng ảnh trôi xuống ──
  dropSpeed: 42,      // tốc độ trôi, pixel mỗi giây (nhỏ hơn = chậm hơn)
  cardWidth: 0.78,    // bề rộng mỗi tấm so với bề rộng màn hình
  cardMax:   460,     // nhưng không quá bấy nhiêu pixel
  overlap:   0.34,    // hai tấm liền nhau đè lên nhau bao nhiêu (0 → 1)
  tilt:      3.5,     // độ nghiêng tối đa của mỗi tấm (độ)

  // Khi chạm vào một tấm: tấm đó chạy về giữa màn hình và phóng to
  focusFit:  0.92,    // chiếm tối đa bao nhiêu phần màn hình
  focusZoom: 2,       // nhưng không phóng quá bấy nhiêu lần

  // Vuốt lên / xuống để đổi tốc độ. Mỗi lần vuốt nhảy một nấc.
  rates:     [0.25, 0.5, 1, 1.5, 2, 3, 5],
  rateStart: 3,       // vị trí bắt đầu trong danh sách trên (3 → ×1.5)

  // Nếu bạn bỏ file nhạc vào audio/happy-birthday.mp3 thì trang sẽ dùng file đó.
  // Không có file thì tự chơi giai điệu Happy Birthday bằng tiếng hộp nhạc.
  musicFile: 'audio/happy-birthday.mp3',
};

/* Bản "một file duy nhất" (do build.py tạo) nhúng sẵn ảnh vào window.PHOTOS.
   Khi có nó thì số ảnh lấy luôn từ đó, khỏi phải khai lại cho khớp. */
if (Array.isArray(window.PHOTOS)) CONFIG.photoCount = window.PHOTOS.length;

/* Mốc thời gian của màn intro (mili-giây, tính từ lúc chạm) */
const T = {
  fireworks: 1200,   // nến tắt 0–0.9s, lặng nửa giây, rồi pháo hoa nổ
  gallery:   6500,   // pháo hoa + lời chúc chạy ~5.3s rồi nhường chỗ cho ảnh
};

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* điện thoại: bớt hạt pháo hoa để giữ 60fps trên máy yếu */
const SMALL = Math.min(innerWidth, innerHeight) < 480;

/* ═══════════════════════════════════════════════
   ②  ÂM THANH
   ═══════════════════════════════════════════════ */
const Music = (() => {
  let audioEl = null, ctx = null, master = null;
  let loopTimer = null, playing = false, useSynth = false;

  /* Giai điệu Happy Birthday (nhịp 3/4).
     Giai điệu này thuộc phạm vi công cộng — chỉ các BẢN THU cụ thể mới có
     bản quyền, nên tự tổng hợp tiếng thế này là an toàn tuyệt đối. */
  const N = { G4:392.00, A4:440.00, B4:493.88, C5:523.25,
              D5:587.33, E5:659.25, F5:698.46, G5:783.99 };
  const MELODY = [
    ['G4',.5], ['G4',.5], ['A4',1], ['G4',1], ['C5',1], ['B4',2],
    ['G4',.5], ['G4',.5], ['A4',1], ['G4',1], ['D5',1], ['C5',2],
    ['G4',.5], ['G4',.5], ['G5',1], ['E5',1], ['C5',1], ['B4',1], ['A4',2],
    ['F5',.5], ['F5',.5], ['E5',1], ['C5',1], ['D5',1], ['C5',3],
  ];
  const BEAT = 0.44;                     // giây / phách
  const BARS = MELODY.reduce((s, n) => s + n[1], 0) * BEAT + 1.2;

  /* một nốt kiểu hộp nhạc: sine chính + bồi âm nhẹ, tắt dần theo hàm mũ */
  function note(freq, at, dur) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.34, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(dur, 0.9) * 1.5);
    g.connect(master);

    [[1, 1], [2, 0.16], [3, 0.05]].forEach(([mult, vol]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      const og = ctx.createGain();
      og.gain.value = vol;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + Math.max(dur, 0.9) * 1.6);
    });
  }

  function scheduleMelody() {
    let t = ctx.currentTime + 0.06;
    for (const [name, beats] of MELODY) {
      note(N[name], t, beats * BEAT);
      t += beats * BEAT;
    }
    loopTimer = setTimeout(scheduleMelody, BARS * 1000);
  }

  return {
    /* Phải gọi TỪ TRONG sự kiện chạm — đó là "user gesture" mà
       Chrome/Safari yêu cầu, nếu không nhạc sẽ bị chặn. */
    start() {
      if (playing) return;
      playing = true;

      audioEl = new Audio(CONFIG.musicFile);
      audioEl.loop = true;
      audioEl.volume = 0.55;
      audioEl.play().catch(() => { useSynth = true; startSynth(); });
      // file không tồn tại / hỏng → rơi về hộp nhạc
      audioEl.addEventListener('error', () => {
        if (!useSynth) { useSynth = true; startSynth(); }
      });
    },
    toggle() {
      const muted = document.body.classList.toggle('muted');
      if (useSynth) { if (master) master.gain.value = muted ? 0 : 0.32; }
      else if (audioEl) { audioEl.muted = muted; }
      soundBtn.setAttribute('aria-label', muted ? 'Bật nhạc' : 'Tắt nhạc');
    },
  };

  function startSynth() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = document.body.classList.contains('muted') ? 0 : 0.32;
    master.connect(ctx.destination);
    ctx.resume();
    scheduleMelody();
  }
})();

/* ═══════════════════════════════════════════════
   ③  PHÁO HOA + CONFETTI (canvas 2D)
   ═══════════════════════════════════════════════ */
const FX = (() => {
  const cv = document.getElementById('fx');
  const c  = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let sparks = [], confetti = [];
  let running = false, raf = 0, launchTimer = 0;
  let rate = 620;                 // ms giữa 2 quả pháo hoa
  let lastBurst = { x: 0, y: 0 }; // tâm quả cuối — ảnh đầu bay ra từ đây

  const HUES = [45, 12, 340, 280, 190, 60];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width  = innerWidth  * dpr;
    H = cv.height = innerHeight * dpr;
  }
  /* Trên mobile, thanh địa chỉ ẩn/hiện khi cuộn sẽ bắn resize liên tục.
     Đổi kích thước canvas mỗi lần như vậy vừa giật vừa xoá sạch hạt —
     nên bỏ qua các thay đổi chiều cao nhỏ. */
  addEventListener('resize', () => {
    if (cv.width === innerWidth * dpr &&
        Math.abs(cv.height - innerHeight * dpr) < 140 * dpr) return;
    resize();
  });
  resize();

  function burst(x, y, hue) {
    lastBurst = { x: x / dpr, y: y / dpr };
    const n = REDUCED ? 50 : SMALL ? 80 : 120;
    const spread = 2.6 + Math.random() * 2.2;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.25;
      const v = spread * (0.35 + Math.random() * 0.85) * dpr;
      sparks.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        hue: hue + (Math.random() * 24 - 12),
        light: 55 + Math.random() * 25,
      });
    }
  }

  function launch() {
    const x = (0.18 + Math.random() * 0.64) * W;
    const y = (0.16 + Math.random() * 0.34) * H;
    burst(x, y, HUES[(Math.random() * HUES.length) | 0]);
    launchTimer = setTimeout(launch, rate * (0.6 + Math.random() * 0.9));
  }

  function addConfetti(n) {
    for (let i = 0; i < n; i++) {
      confetti.push({
        x: Math.random() * W,
        y: -Math.random() * H * 0.4,
        w: (4 + Math.random() * 5) * dpr,
        h: (7 + Math.random() * 8) * dpr,
        vy: (0.9 + Math.random() * 1.7) * dpr,
        vx: (Math.random() - 0.5) * 0.9 * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.12,
        hue: HUES[(Math.random() * HUES.length) | 0],
      });
    }
  }

  function frame() {
    /* Vệt đuôi: phủ nền bán trong suốt thay vì clearRect.
       Rẻ hơn nhiều so với lưu lịch sử toạ độ của từng hạt. */
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(10, 6, 18, 0.18)';
    c.fillRect(0, 0, W, H);

    c.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vy += 0.035 * dpr;        // trọng lực
      p.vx *= 0.988;
      p.vy *= 0.988;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      c.fillStyle = `hsla(${p.hue}, 100%, ${p.light}%, ${p.life})`;
      c.beginPath();
      c.arc(p.x, p.y, 1.7 * dpr * p.life + 0.4, 0, 6.284);
      c.fill();
    }

    c.globalCompositeOperation = 'source-over';
    for (let i = confetti.length - 1; i >= 0; i--) {
      const f = confetti[i];
      f.y += f.vy; f.x += f.vx; f.rot += f.vr;
      if (f.y > H + 40) { confetti.splice(i, 1); continue; }
      c.save();
      c.translate(f.x, f.y);
      c.rotate(f.rot);
      c.fillStyle = `hsl(${f.hue}, 85%, 62%)`;
      c.fillRect(-f.w / 2, -f.h / 2, f.w, f.h * Math.abs(Math.cos(f.rot)));
      c.restore();
    }

    raf = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      // 3 quả nổ dồn ngay khoảnh khắc đầu cho đúng nhịp "bùng lên"
      burst(W * 0.5, H * 0.34, 45);
      setTimeout(() => burst(W * 0.26, H * 0.26, 340), 260);
      setTimeout(() => burst(W * 0.74, H * 0.3,  190), 520);
      addConfetti(REDUCED ? 40 : SMALL ? 55 : 90);
      launchTimer = setTimeout(launch, 900);
      frame();
    },
    /* sau khi gallery hiện ra: bắn thưa hẳn, chỉ còn làm nền */
    calm() { rate = 2600; confetti.length = 0; },
    lastBurst: () => lastBurst,
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(launchTimer);
      sparks = []; confetti = [];
      c.clearRect(0, 0, W, H);
    },
  };
})();

/* ═══════════════════════════════════════════════
   ④  CHỒNG ẢNH TRÔI TỪ TRÊN XUỐNG
   ═══════════════════════════════════════════════ */
const body      = document.body;
const gallery   = document.getElementById('gallery');
const soundBtn  = document.getElementById('btn-sound');
const replayBtn = document.getElementById('btn-replay');

function src(i) {
  // bản một file duy nhất: ảnh đã nằm sẵn trong trang dưới dạng data URI
  if (Array.isArray(window.PHOTOS)) return window.PHOTOS[i - 1];
  return CONFIG.photoDir + i + CONFIG.photoExt;
}

const Stack = (() => {
  const cards = [];                 // 2 bản sao × 29 tấm
  let stageBg, stack, track;
  let focused = null, live = false, io = null;
  let anim = null, durMs = 0, rateIdx = CONFIG.rateStart;

  /* Số ngẫu nhiên nhưng CỐ ĐỊNH theo chỉ số ảnh — hai bản sao của cùng
     một tấm phải lệch và nghiêng y hệt nhau, nếu không lúc vòng lặp
     nối lại sẽ thấy ảnh giật sang chỗ khác. */
  function rnd(i, salt) {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function build() {
    stageBg = document.createElement('div');
    stageBg.className = 'stage-bg';

    stack = document.createElement('div');
    stack.className = 'stack';

    track = document.createElement('div');
    track.className = 'track';
    stack.appendChild(track);
    gallery.append(stageBg, stack);

    for (let copy = 0; copy < 2; copy++) {
      for (let i = 1; i <= CONFIG.photoCount; i++) {
        const card = document.createElement('figure');
        card.className = 'card';
        card.dataset.n = i;

        const img = document.createElement('img');
        img.alt = `Ảnh gia đình ${i}`;
        img.decoding = 'async';
        img.addEventListener('load', () => img.classList.add('ready'));
        card.appendChild(img);

        const text = CONFIG.captions[i];
        if (text) {
          const cap = document.createElement('figcaption');
          cap.className = 'caption';
          cap.textContent = text;
          card.appendChild(cap);
        }

        track.appendChild(card);
        cards.push({ el: card, img, url: src(i), n: i, copy });
      }
    }

    layout();

    /* Chỉ nạp ảnh khi tấm đó sắp trôi vào màn hình. 58 thẻ mà nạp hết
       ngay thì tốn 8.6MB một lúc. */
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const c = cards[+e.target.dataset.idx];
        if (c && !c.img.src) c.img.src = c.url;
        io.unobserve(e.target);
      }
    }, { root: stack, rootMargin: '600px 0px' });

    cards.forEach((c, idx) => {
      c.el.dataset.idx = idx;
      io.observe(c.el);
    });
  }

  /* Tính lại kích thước + vị trí từng tấm. Gọi lúc dựng và khi đổi cỡ màn. */
  function layout() {
    const n = CONFIG.photoCount;

    // bề rộng tấm ảnh; ảnh 3:4 nên chiều cao = rộng × 4/3
    const w  = Math.min(innerWidth * CONFIG.cardWidth, CONFIG.cardMax);
    const h  = w * 4 / 3;
    const step = h * (1 - CONFIG.overlap);      // đè lên nhau bao nhiêu
    const maxX = Math.min((innerWidth - w) / 2, w * 0.16);

    cards.forEach((c, idx) => {
      c.el.style.setProperty('--w', w + 'px');
      c.el.style.setProperty('--y', idx * step + 'px');
      c.el.style.setProperty('--x', ((rnd(c.n, 1) - .5) * 2 * maxX).toFixed(1) + 'px');
      c.el.style.setProperty('--r', ((rnd(c.n, 2) - .5) * 2 * CONFIG.tilt).toFixed(2) + 'deg');
    });

    /* Dải cao đúng 2 lần một vòng, nhờ vậy khung hình -50% → 0 khớp
       chính xác đầu bản sao thứ hai, mối nối không nhìn thấy được. */
    const one = n * step;
    track.style.height = (2 * one) + 'px';
    setDuration(one / CONFIG.dropSpeed * 1000);

    // đổi cỡ màn thì tấm đang chọn phải căn lại cho đúng giữa
    recenter();
  }

  /* ─── chuyển động của dải ───
     Dùng Web Animations API thay cho CSS animation: `playbackRate` đổi
     tốc độ ngay tại vị trí đang chạy, còn sửa `animation-duration` của
     CSS thì dải sẽ nhảy vọt vì tiến độ tính theo tỉ lệ thời gian. */
  function play() {
    if (REDUCED || anim) return;
    anim = track.animate(
      [{ transform: 'translateY(-50%)' }, { transform: 'translateY(0)' }],
      { duration: durMs, iterations: Infinity, easing: 'linear' }
    );
    anim.playbackRate = CONFIG.rates[rateIdx];
  }

  /* Đổi độ dài một vòng mà giữ nguyên chỗ đang chạy dở, nếu không
     dải sẽ giật mỗi lần xoay máy. */
  function setDuration(ms) {
    durMs = ms;
    if (!anim) return;
    const old = anim.effect.getTiming().duration;
    const at  = Number(anim.currentTime) || 0;
    const frac = old ? (at % old) / old : 0;
    anim.effect.updateTiming({ duration: ms });
    anim.currentTime = frac * ms;
  }

  /* Căn lại tấm đang chọn: phải gỡ .focus ra mới đo được kích thước gốc,
     nhưng gỡ rồi gắn lại ngay trong cùng một nhịp nên mắt không thấy. */
  function recenter() {
    if (!focused) return;
    const card = focused;
    card.style.transition = 'none';
    card.classList.remove('focus');
    card.style.removeProperty('--tx');
    card.style.removeProperty('--ty');
    card.style.removeProperty('--fs');
    card.getBoundingClientRect();          // ép trình duyệt tính lại ngay
    center(card);
    card.classList.add('focus');
    card.getBoundingClientRect();
    card.style.transition = '';
  }

  /* Đưa tấm đang chọn về đúng giữa màn hình và phóng to vừa khung.
     Dải đã bị dừng nên toạ độ đo được chính là toạ độ trên màn hình. */
  function center(card) {
    // đo trước khi gắn class .focus, để lấy kích thước lúc chưa phóng to
    const r = card.getBoundingClientRect();
    const w = card.offsetWidth, h = card.offsetHeight;  // chưa tính độ nghiêng

    const zoom = Math.max(1, Math.min(
      innerWidth  * CONFIG.focusFit / w,
      innerHeight * CONFIG.focusFit / h,
      CONFIG.focusZoom
    ));

    /* Thứ tự transform là translate → rotate → scale, mà scale quay quanh
       tâm chính nó nên không làm tâm xê dịch. Vì vậy tính khoảng dời từ
       kích thước lúc chưa phóng to vẫn đúng. */
    const dx = innerWidth  / 2 - (r.left + r.width  / 2);
    const dy = innerHeight / 2 - (r.top  + r.height / 2);

    card.style.setProperty('--tx', dx.toFixed(1) + 'px');
    card.style.setProperty('--ty', dy.toFixed(1) + 'px');
    card.style.setProperty('--fs', zoom.toFixed(3));
  }

  function focus(card) {
    if (anim) anim.pause();          // dừng dải lại trước khi đo toạ độ
    center(card);
    focused = card;
    card.classList.add('focus');
    body.classList.add('focused');
    const c = cards[+card.dataset.idx];
    if (c) stageBg.style.setProperty('--shot', `url("${c.url}")`);
  }

  function unfocus() {
    if (!focused) return;
    if (anim) anim.play();
    focused.classList.remove('focus');
    focused.style.removeProperty('--tx');
    focused.style.removeProperty('--ty');
    focused.style.removeProperty('--fs');
    focused = null;
    body.classList.remove('focused');
  }

  return {
    build,
    layout,
    /* Lúc còn ở màn bánh kem thì #gallery đang display:none, các thẻ ảnh
       không có kích thước nên IntersectionObserver không bao giờ khớp —
       nghĩa là ảnh chỉ bắt đầu tải đúng lúc gallery hiện ra, gây khoảng
       trống. Nạp trước vài tấm đầu vào bộ nhớ đệm để tránh chuyện đó. */
    warmup() {
      for (let i = 1; i <= Math.min(5, CONFIG.photoCount); i++) {
        const im = new Image();
        im.decoding = 'async';
        im.src = src(i);
      }
    },
    start() {
      live = true;
      play();
      stack.classList.add('burst');
      setTimeout(() => stack.classList.remove('burst'), 1100);
    },
    stop() {
      live = false;
      unfocus();
      if (anim) { anim.cancel(); anim = null; }
      stack.classList.remove('burst');
    },

    /* Vuốt lên / xuống: nhảy một nấc trong CONFIG.rates.
       Trả về nhãn để hiện lên màn hình, hoặc null nếu đã kịch nấc. */
    speed(step) {
      if (!live || focused || REDUCED) return null;
      const next = Math.min(CONFIG.rates.length - 1, Math.max(0, rateIdx + step));
      if (next === rateIdx) return null;
      rateIdx = next;
      const r = CONFIG.rates[rateIdx];
      if (anim) anim.playbackRate = r;
      return '×' + r;
    },
    /* chạm tấm nào thì tấm đó đứng lại, các tấm khác ẩn đi;
       chạm lần nữa thì chạy tiếp */
    tap(target) {
      if (!live) return;
      if (focused) { unfocus(); return; }
      const card = target.closest && target.closest('.card');
      if (card) focus(card);
    },
    unfocus,
    isLive() { return live; },
    isFocused() { return !!focused; },
  };
})();

/* ═══════════════════════════════════════════════
   ⑤  LUỒNG CHÍNH
   ═══════════════════════════════════════════════ */
let started = false;           // khoá, tránh chạm 2 lần chạy chồng animation
let timers  = [];

function blowOut() {
  if (started) return;
  started = true;
  timers.forEach(clearTimeout);
  timers = [];

  body.classList.remove('nudge');
  body.classList.add('blown');

  Music.start();                       // ngay trong user gesture
  soundBtn.hidden = false;

  timers.push(setTimeout(() => {
    body.classList.add('fireworks');
    FX.start();
  }, REDUCED ? 700 : T.fireworks));

  timers.push(setTimeout(() => {
    body.classList.remove('is-intro');
    body.classList.add('gallery');
    FX.calm();
    Stack.start();
    replayBtn.hidden = false;

    // chồng ảnh bung ra đúng từ tâm quả pháo hoa cuối cùng
    const b = FX.lastBurst();
    const el = gallery.querySelector('.stack');
    if (el) el.style.transformOrigin = `${b.x}px ${b.y}px`;

    // gợi ý hiện một lát rồi tự tắt
    timers.push(setTimeout(() => body.classList.add('hint-gone'), 6000));
  }, REDUCED ? 2200 : T.gallery));
}

function replay() {
  timers.forEach(clearTimeout);
  timers = [];
  started = false;

  Stack.stop();
  body.classList.remove('gallery', 'fireworks', 'blown', 'hint-gone');
  body.classList.add('is-intro');
  replayBtn.hidden = true;
  FX.stop();
  nudgeTimer();
}

/* sau 5s không ai chạm thì nến rung mạnh hơn để nhắc */
let nt = 0;
function nudgeTimer() {
  clearTimeout(nt);
  nt = setTimeout(() => {
    if (!started) body.classList.add('nudge');
  }, 5000);
}

/* Cả màn hình đều là vùng chạm — bố chạm đâu cũng được, không cần
   trúng cái nến bé tí. */
document.getElementById('scene-cake').addEventListener('click', blowOut);
document.getElementById('scene-cake').addEventListener('touchstart', (e) => {
  e.preventDefault();
  blowOut();
}, { passive: false });

soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  Music.toggle();
});
replayBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  replay();
});

/* ─────────── chạm để dừng / chạy tiếp ───────────
   Chạm vào một tấm → tấm đó về giữa màn hình, các tấm khác ẩn đi.
   Chạm lần nữa (bất kỳ đâu) → mọi thứ trôi tiếp. */
let sx = 0, sy = 0, swiped = false;

gallery.addEventListener('click', (e) => {
  // vừa vuốt xong thì bỏ qua cú click đi kèm, tránh mở nhầm ảnh
  if (swiped) { swiped = false; return; }
  body.classList.add('hint-gone');
  Stack.tap(e.target);
});

/* ─────────── vuốt dọc để đổi tốc độ ───────────
   Vuốt XUỐNG (cùng chiều ảnh trôi) → nhanh hơn.
   Vuốt LÊN  (ngược chiều)          → chậm lại. */
const badge = document.getElementById('speed-badge');
let badgeTimer = 0;

function showSpeed(label) {
  if (!label) return;
  body.classList.add('hint-gone');
  badge.textContent = label;
  badge.classList.add('show');
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => badge.classList.remove('show'), 1300);
}

gallery.addEventListener('touchstart', (e) => {
  sx = e.touches[0].clientX;
  sy = e.touches[0].clientY;
  swiped = false;
}, { passive: true });

gallery.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - sx;
  const dy = e.changedTouches[0].clientY - sy;
  // chỉ tính là vuốt dọc khi đi đủ xa và dứt khoát hơn chiều ngang
  if (Math.abs(dy) < 50 || Math.abs(dy) < Math.abs(dx)) return;
  swiped = true;
  showSpeed(Stack.speed(dy > 0 ? 1 : -1));
}, { passive: true });

/* con lăn chuột trên máy tính — chặn bớt để một cú lăn không nhảy mấy nấc */
let wheelAt = 0;
gallery.addEventListener('wheel', (e) => {
  const now = Date.now();
  if (now - wheelAt < 260) return;
  wheelAt = now;
  showSpeed(Stack.speed(e.deltaY > 0 ? 1 : -1));
}, { passive: true });

addEventListener('keydown', (e) => {
  if (e.key === 'Escape')    Stack.unfocus();
  if (e.key === 'ArrowDown') showSpeed(Stack.speed(1));
  if (e.key === 'ArrowUp')   showSpeed(Stack.speed(-1));
});

/* Đổi cỡ màn / xoay máy thì tính lại bố cục chồng ảnh. Bỏ qua các
   thay đổi chiều cao vụn do thanh địa chỉ ẩn/hiện khi cuộn. */
let lastW = innerWidth, lastH = innerHeight, rt = 0;
addEventListener('resize', () => {
  if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 140) return;
  lastW = innerWidth; lastH = innerHeight;
  clearTimeout(rt);
  rt = setTimeout(() => Stack.layout(), 180);
});

Stack.build();
Stack.warmup();
nudgeTimer();
