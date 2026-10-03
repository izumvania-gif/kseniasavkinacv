// Меню, шапка, карточки проектов, копирование контактов и видео.
// Без JS у карточек видны обе стороны, бокалы налиты, контакты видны.

(() => {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');

  // Меню на телефоне.
  const header = document.querySelector('.site-header');
  const menuBtn = document.querySelector('.menu-btn');
  function setMenu(open) {
    if (!header || !menuBtn) return;
    header.classList.toggle('is-menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-menu-open')));
    document.querySelectorAll('#site-nav a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && header.classList.contains('is-menu-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (header.classList.contains('is-menu-open') && !header.contains(event.target)) setMenu(false);
    });
  }

  // Шапка тёмная над тёмными блоками. Первый экран сам решает, когда посветлеть:
  // после того как брызги закрыли его светлым (data-dark="off").
  if (header) {
    const darkBlocks = Array.from(document.querySelectorAll('[data-dark]'));
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = header.offsetHeight / 2;
      const dark = darkBlocks.some((el) => {
        if (el.dataset.dark === 'off') return false;
        const rect = el.getBoundingClientRect();
        return rect.top <= y && rect.bottom >= y;
      });
      header.classList.toggle('is-dark', dark);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('headerupdate', schedule);
    update();
  }

  // Проекты: карточка переворачивается в ту сторону, где на неё нажали.
  // На обороте история и итог. С анимацией карточка ещё и наклоняется за курсором.
  document.querySelectorAll('.card__btn').forEach((btn) => {
    const card = btn.closest('.card');
    const back = document.getElementById(btn.getAttribute('aria-controls'));
    back.setAttribute('aria-hidden', 'true');
    let timer = 0;
    btn.addEventListener('click', (event) => {
      card.classList.remove('is-peek');
      const flipped = !card.classList.contains('is-flipped');
      const rect = card.getBoundingClientRect();
      const fromLeft = event.clientX ? event.clientX < rect.left + rect.width / 2 : false;
      if (flipped) card.style.setProperty('--flip', fromLeft ? '-180deg' : '180deg');
      card.classList.toggle('is-flipped', flipped);
      btn.setAttribute('aria-expanded', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
      if (motion) {
        card.classList.add('is-turning');
        clearTimeout(timer);
        timer = setTimeout(() => card.classList.remove('is-turning'), 450);
      }
    });
    if (motion && window.matchMedia('(hover: hover)').matches) {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.classList.add('is-tilting');
        card.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
        card.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    }
  });

  // Подсказка, что карточки переворачиваются: каждая приоткрывается, когда впервые появляется на экране.
  // Следим за каждой карточкой отдельно: на телефоне сетка выше экрана и целиком не видна.
  const peekCards = document.querySelectorAll('.cards .card:not(.card--more)');
  if (peekCards.length && motion && 'IntersectionObserver' in window) {
    const peekObserver = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry, i) => {
        const card = entry.target;
        peekObserver.unobserve(card);
        if (card.classList.contains('is-flipped')) return;
        // Карточки одного ряда появляются вместе и поворачиваются по очереди.
        card.style.setProperty('--peek-delay', (i * 0.12).toFixed(2) + 's');
        card.classList.add('is-peek');
        card.addEventListener('animationend', () => card.classList.remove('is-peek'), { once: true });
      });
    }, { threshold: 0.6 });
    peekCards.forEach((card) => peekObserver.observe(card));
  }

  // Копирование почты и телефона.
  document.querySelectorAll('[data-copy]').forEach((button) => {
    const label = button.querySelector('span');
    const initial = label ? label.textContent : '';
    button.addEventListener('click', () => {
      const text = button.dataset.copy;
      const done = () => {
        button.classList.add('is-done');
        if (label) label.textContent = 'Скопировано';
        window.setTimeout(() => {
          button.classList.remove('is-done');
          if (label) label.textContent = initial;
        }, 2000);
      };
      const fallback = () => {
        if (label) label.textContent = text;
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  });

  // Видео играет без звука по кругу, пока блок на экране. Кнопки включают звук и ставят паузу
  // (у видео без звука кнопка только одна, пауза).
  // Звук может быть включён только у одного видео. При «Уменьшить движение» видео само не запускается.
  const videos = [];
  function wire(box, video) {
    const controls = box.querySelector('.vblock__controls');
    const soundBtn = box.querySelector('[data-v-sound]');
    const pauseBtn = box.querySelector('[data-v-pause]');
    video.controls = false;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    controls.hidden = false;
    const item = { video, soundBtn, visible: false, paused: !motion };
    pauseBtn.setAttribute('aria-pressed', String(item.paused));
    videos.push(item);

    const sync = () => {
      if (item.visible && !item.paused) {
        const playing = video.play();
        if (playing && playing.catch) playing.catch(() => {});
      } else {
        video.pause();
      }
    };

    if (soundBtn) soundBtn.addEventListener('click', () => {
      const on = video.muted;
      videos.forEach((other) => {
        if (other === item || !other.soundBtn) return;
        other.video.muted = true;
        other.soundBtn.setAttribute('aria-pressed', 'false');
      });
      video.muted = !on;
      soundBtn.setAttribute('aria-pressed', String(on));
      if (on && item.paused) {
        item.paused = false;
        pauseBtn.setAttribute('aria-pressed', 'false');
      }
      sync();
    });
    pauseBtn.addEventListener('click', () => {
      item.paused = !item.paused;
      pauseBtn.setAttribute('aria-pressed', String(item.paused));
      sync();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          item.visible = entry.isIntersecting;
          sync();
        });
      }, { threshold: 0.25 }).observe(box);
    } else {
      item.visible = true;
      sync();
    }
  }

  // Видео в «Обо мне» стоит в разметке, без JS у него обычные кнопки плеера.
  const aboutVideo = document.querySelector('.about__video');
  if (aboutVideo) wire(aboutVideo.closest('.about__media'), aboutVideo);

  // Видео в разделе «Вино». Видео о сортах винограда уже стоит в разметке (без JS у него обычные
  // кнопки плеера). Для нового блока достаточно вписать путь к файлу в data-src у <article class="vblock">.
  document.querySelectorAll('.vblock').forEach((block) => {
    const ready = block.querySelector('.vblock__media video');
    if (ready) {
      wire(block, ready);
      return;
    }
    const src = (block.dataset.src || '').trim();
    if (!src) return;
    const video = document.createElement('video');
    video.preload = 'metadata';
    const poster = (block.dataset.poster || '').trim();
    if (poster) video.poster = poster;
    const title = block.querySelector('.vblock__title');
    if (title) video.setAttribute('aria-label', title.textContent.trim());
    video.src = src;
    block.querySelector('.vblock__media').prepend(video);
    block.classList.add('has-video');
    wire(block, video);
  });
})();

// Моушен: пробка вылетает и брызги из бутылки, редкие пузырьки, вино наливается в бокалы с контактами.
// При prefers-reduced-motion ничего из этого не запускается: бутылка стоит закрытой,
// бокалы налиты, контакты видны сразу.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const phone = window.matchMedia('(max-width: 759px)').matches;
  const css = getComputedStyle(root);
  const color = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const C = {
    paper: color('--paper', '#f4f0e9'),
    accent: color('--accent', '#ece1cd'),
    pale: color('--accent-pale', '#f7f1e7'),
  };

  // Детерминированный генератор: брызги одинаковые при прокрутке вперёд и назад.
  function random(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --- Пузырьки по мотивам larevoltosa.es, но редкие и мелкие ---
  const bubbles = (() => {
    const layer = document.querySelector('.bubbles');
    if (!layer || !layer.animate) return { burst() {} };
    const NS = 'http://www.w3.org/2000/svg';
    const pool = [];
    const size = phone ? 5 : 9;
    for (let i = 0; i < size; i++) {
      const el = document.createElement('div');
      el.className = 'bubble';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 66 66');
      const use = document.createElementNS(NS, 'use');
      use.setAttribute('href', '#bubble');
      svg.appendChild(use);
      el.appendChild(svg);
      layer.appendChild(el);
      pool.push({ el, active: false });
    }

    function spawn(middle) {
      const b = pool.find((item) => !item.active);
      if (!b) return;
      b.active = true;
      const s = phone ? 10 + Math.random() * 12 : 12 + Math.random() * 18;
      const r = Math.random();
      let x;
      if (middle) x = 30 + Math.random() * 40;
      else x = r < 0.5 ? 2 + Math.random() * 14 : 84 + Math.random() * 14;
      const px = (x / 100) * window.innerWidth - s / 2;
      const drift = (Math.random() - 0.5) * 60;
      const duration = 3200 + Math.random() * 1600;
      const rise = -(0.7 + Math.random() * 0.4) * window.innerHeight;
      b.el.style.width = s + 'px';
      b.el.style.height = s + 'px';
      const move = b.el.animate([
        { transform: `translate3d(${px}px, 0, 0) scale(1)` },
        { transform: `translate3d(${px + drift}px, ${rise}px, 0) scale(0.4)` },
      ], { duration, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' });
      const fade = b.el.animate([
        { opacity: 0, offset: 0 },
        { opacity: 0.85, offset: 0.12 },
        { opacity: 0.85, offset: 0.7 },
        { opacity: 0, offset: 1 },
      ], { duration, fill: 'forwards' });
      move.onfinish = () => {
        b.active = false;
        move.cancel();
        fade.cancel();
      };
    }

    let last = performance.now();
    let acc = 0;
    let burstUntil = 0;
    const interval = phone ? 3.6 : 2.2;

    function tick(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      const bursting = now < burstUntil;
      const step = bursting ? 0.18 : interval;
      if (acc >= step) {
        spawn(bursting);
        acc = 0;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // На тёмных блоках пузырьки светлее.
    const dark = Array.from(document.querySelectorAll('[data-dark]'));
    let frame = 0;
    const recolor = () => {
      frame = 0;
      const y = window.innerHeight * 0.6;
      layer.classList.toggle('is-dark', dark.some((el) => {
        if (el.dataset.dark === 'off') return false;
        const rect = el.getBoundingClientRect();
        return rect.top <= y && rect.bottom >= y;
      }));
    };
    window.addEventListener('scroll', () => {
      if (!frame) frame = requestAnimationFrame(recolor);
    }, { passive: true });
    recolor();

    return {
      burst(ms) {
        burstUntil = performance.now() + ms;
      },
    };
  })();

  // --- Бутылка: пробка вылетает, брызги заполняют экран ---
  // Переход по мотивам Cumulus: тёмная сцена, всплеск растёт, пока не закроет весь экран светлым,
  // а следующий блок уже того же цвета.
  (() => {
    const hero = document.querySelector('.hero');
    const sticky = hero && hero.querySelector('.hero__sticky');
    const canvas = hero && hero.querySelector('.splash');
    const bottle = hero && hero.querySelector('.bottle');
    const cork = hero && hero.querySelector('.bottle__cork');
    const mouth = hero && hero.querySelector('.bottle__mouth');
    if (!canvas || !canvas.getContext || !bottle) return;
    const ctx = canvas.getContext('2d');

    const POP = 0.1; // хлопок пробки
    const CLOUD = 0.15; // всплеск начинает расти
    const COVER = 0.9; // экран закрыт
    let W = 0;
    let H = 0;
    let lastP = -1;

    const rnd = random(20260929);
    const palette = [C.accent, C.pale, C.accent, C.paper];
    const jet = Array.from({ length: phone ? 46 : 80 }, () => ({
      birth: POP + rnd() * 0.22,
      life: 0.14 + rnd() * 0.2,
      spread: (rnd() - 0.5) * 1.1,
      speed: 0.6 + rnd() * 1,
      size: 1.6 + rnd() * 4,
      color: palette[Math.floor(rnd() * palette.length)],
    }));
    const fingers = Array.from({ length: 24 }, (_, k) => ({
      angle: (k / 24) * Math.PI * 2 + (rnd() - 0.5) * 0.2,
      len: 0.85 + rnd() * 0.6,
      width: 0.11 + rnd() * 0.11,
      tip: rnd() < 0.75,
    }));
    const drops = Array.from({ length: phone ? 50 : 100 }, () => ({
      angle: rnd() * Math.PI * 2,
      reach: 1.15 + rnd() * 0.8,
      size: 0.005 + rnd() * 0.018,
      stretch: 1.6 + rnd() * 2,
      color: rnd() < 0.6 ? C.accent : C.pale,
    }));

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = sticky.clientWidth;
      H = sticky.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastP = -1;
    }

    function progress() {
      const rect = hero.getBoundingClientRect();
      const distance = hero.offsetHeight - sticky.offsetHeight;
      return distance > 0 ? clamp(-rect.top / distance) : 0;
    }

    const circle = (x, y, r) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    };

    // Всплеск: ядро и неровные «пальцы», вытянутые в сторону струи.
    function splat(cx, cy, R, axis, bias, turn) {
      ctx.beginPath();
      circle(cx, cy, R * 0.62);
      fingers.forEach((f) => {
        const a = f.angle + turn;
        const toward = Math.max(0, Math.cos(a - axis));
        const L = R * f.len * (1 + bias * toward * toward);
        const w = R * f.width;
        for (let s = 0; s <= 1.001; s += 0.1) {
          const d = R * 0.45 + s * (L - R * 0.45);
          circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, w * (1 - 0.72 * s));
        }
        if (f.tip) {
          const d = L + w * 0.95;
          circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, w * 0.3);
        }
      });
      ctx.fill();
    }

    let popped = false;
    let lightHeader = false;

    function draw(p, now) {
      // Чем ближе хлопок, тем сильнее дрожит бутылка; после хлопка отдача.
      const before = clamp(p / POP);
      const shake = p < POP ? Math.sin(now * 0.05) * 2.4 * before * before : 0;
      const tilt = p < POP ? -6 - 6 * before : -12 + 3 * easeOut(clamp((p - POP) / 0.08));
      bottle.style.transform = `rotate(${(tilt + shake).toFixed(2)}deg)`;

      // Пробка вылетает вверх и чуть вбок, крутясь.
      const scale = bottle.getBoundingClientRect().height / 640 || 1;
      const flight = clamp((p - POP) / 0.14);
      cork.classList.toggle('is-flying', flight > 0);
      if (flight > 0) {
        const up = (H / scale) * 1.3 * easeOut(flight);
        cork.style.transform = `translate(${(up * 0.22).toFixed(1)}px, ${(-up).toFixed(1)}px) rotate(${(flight * 540).toFixed(1)}deg)`;
      } else {
        cork.style.transform = '';
      }

      if (p >= POP && !popped) {
        popped = true;
        bubbles.burst(1200);
      } else if (p < POP * 0.5) {
        popped = false;
      }

      // Когда брызги закрыли экран, шапка светлеет вместе с ним.
      const light = p > 0.7;
      if (light !== lightHeader) {
        lightHeader = light;
        hero.dataset.dark = light ? 'off' : '';
        document.dispatchEvent(new Event('headerupdate'));
      }

      ctx.clearRect(0, 0, W, H);
      if (p < POP) return;
      if (p >= COVER + 0.05) {
        ctx.fillStyle = C.paper;
        ctx.fillRect(0, 0, W, H);
        return;
      }

      const host = sticky.getBoundingClientRect();
      const m = mouth.getBoundingClientRect();
      const mx = m.left + m.width / 2 - host.left;
      const my = m.top + m.height / 2 - host.top;
      const axis = ((tilt - 90) * Math.PI) / 180;
      const unit = Math.min(W, H);

      // Кольцо в момент хлопка.
      const ring = clamp((p - POP) / 0.09);
      if (ring > 0 && ring < 1) {
        ctx.beginPath();
        ctx.arc(mx, my, 12 + ring * Math.max(W, H) * 0.32, 0, Math.PI * 2);
        ctx.strokeStyle = C.accent;
        ctx.globalAlpha = 1 - ring;
        ctx.lineWidth = 1 + 2 * (1 - ring);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Капли из горлышка летят дугой.
      jet.forEach((d) => {
        const age = (p - d.birth) / d.life;
        if (age <= 0 || age >= 1) return;
        const a = axis + d.spread;
        const dist = d.speed * unit * 1.1 * age;
        const x = mx + Math.cos(a) * dist;
        const y = my + Math.sin(a) * dist + age * age * unit * 1.05;
        const r = d.size * (1 + age * 3.2);
        ctx.beginPath();
        ctx.ellipse(x, y, r * (2.6 - age), r, a, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
      });

      // Всплеск растёт от горлышка и уходит в центр экрана, пока не закроет всё.
      const q = clamp((p - CLOUD) / (COVER - CLOUD));
      if (q <= 0) return;
      const halfDiag = Math.hypot(W, H) / 2;
      const cx = lerp(mx, W / 2, easeInOut(q));
      const cy = lerp(my, H / 2, easeInOut(q));
      const R = unit * 0.08 + easeIn(q) * halfDiag * 2.2 + q * unit * 0.2;
      const bias = 1.1 * (1 - q);
      const turn = q * 0.35;

      drops.forEach((d) => {
        const a = d.angle + turn;
        const toward = Math.max(0, Math.cos(a - axis));
        const dist = R * d.reach * (1 + bias * toward * toward);
        const r = Math.max(1.5, R * d.size);
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, r * d.stretch, r, a, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
      });

      ctx.fillStyle = C.accent;
      splat(cx, cy, R, axis, bias, turn);
      ctx.fillStyle = C.pale;
      splat(cx, cy, R * 0.88, axis, bias, turn + 0.13);
      ctx.fillStyle = C.paper;
      splat(cx, cy, R * 0.76, axis, bias, turn + 0.26);
    }

    let running = false;
    function frame(now) {
      if (!running) return;
      const p = progress();
      const shaking = p > 0.004 && p < POP;
      if (p !== lastP || shaking) {
        draw(p, now);
        lastP = p;
      }
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        const visible = entries[0].isIntersecting;
        if (visible && !running) {
          running = true;
          requestAnimationFrame(frame);
        } else if (!visible) {
          running = false;
        }
      }).observe(hero);
    } else {
      running = true;
      requestAnimationFrame(frame);
    }
  })();

  // --- Контакты: вино наливается в бокал, и контакт проступает прямо в вине ---
  // Струя тонкая, как на Cumulus. Каждый бокал начинает наливаться, когда появляется на экране.
  (() => {
    // Половина ширины чаши на разной высоте: по ней поверхность вина растёт вместе с чашей.
    function bowlWidths(path) {
      const points = [];
      if (!path || !path.getTotalLength) return points;
      const length = path.getTotalLength();
      for (let i = 0; i <= 240; i++) {
        const pt = path.getPointAtLength((length * i) / 240);
        if (pt.x <= 120) points.push([pt.y, 120 - pt.x]);
      }
      return points.sort((a, b) => a[0] - b[0]);
    }

    function halfWidth(g, y) {
      const w = g.widths;
      if (!w.length || y <= w[0][0]) return w.length ? w[0][1] : 0;
      for (let i = 1; i < w.length; i++) {
        if (w[i][0] >= y) {
          const [y0, x0] = w[i - 1];
          const [y1, x1] = w[i];
          return y1 === y0 ? x1 : x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
        }
      }
      return 0;
    }

    const glasses = Array.from(document.querySelectorAll('.glass')).map((svg, i) => ({
      svg,
      wine: svg.querySelector('.glass__wine'),
      clip: svg.querySelector('.glass__wine-clip'),
      stream: svg.querySelector('.glass__stream'),
      surfaceEl: svg.querySelector('.glass__surface'),
      widths: bowlWidths(svg.querySelector('.glass__outline')),
      bottom: Number(svg.dataset.bottom),
      level: Number(svg.dataset.level),
      duration: [2.6, 2.9, 2.4][i] || 2.6,
      start: null,
    }));
    if (!glasses.length) return;
    const TOP = -90;
    const IN = 0.35;

    function shape(g, y, amp, t) {
      let d = `M0,${(y + Math.sin(t * 7) * amp).toFixed(2)}`;
      for (let x = 12; x <= 240; x += 12) {
        d += ` L${x},${(y + Math.sin(x * 0.06 + t * 7) * amp).toFixed(2)}`;
      }
      return d + ` L240,${g.bottom + 4} L0,${g.bottom + 4} Z`;
    }

    function render(g, t) {
      const f = easeOut(clamp((t - IN * 0.7) / g.duration));
      const surface = g.bottom + 2 - (g.bottom + 2 - g.level) * f;
      const settle = clamp((t - IN - g.duration) / 1.6);
      const amp = t <= 0 ? 0 : 1.8 * (1 - settle) * (0.4 + 0.6 * (1 - f));
      let top = TOP;
      let end = TOP;
      if (t > 0) {
        end = lerp(TOP, surface, clamp(t / IN));
        top = lerp(TOP, surface, easeIn(clamp((t - IN - g.duration + 0.25) / 0.4)));
      }
      g.stream.setAttribute('y', top.toFixed(2));
      g.stream.setAttribute('height', Math.max(0, end - top).toFixed(2));
      const d = shape(g, surface, amp, t);
      g.wine.setAttribute('d', d);
      g.clip.setAttribute('d', d);
      if (g.surfaceEl) {
        const rx = f > 0 ? halfWidth(g, surface) : 0;
        g.surfaceEl.setAttribute('cy', surface.toFixed(2));
        g.surfaceEl.setAttribute('rx', rx.toFixed(2));
        g.surfaceEl.setAttribute('ry', (rx * 0.068).toFixed(2));
      }
      return settle >= 1;
    }

    glasses.forEach((g) => render(g, -1));

    let running = false;
    function frame(now) {
      let busy = false;
      glasses.forEach((g) => {
        if (g.start === null || g.done) return;
        g.done = render(g, (now - g.start) / 1000);
        if (!g.done) busy = true;
      });
      running = busy;
      if (busy) requestAnimationFrame(frame);
    }

    let lastStart = 0;
    const begin = (g) => {
      if (g.start !== null) return;
      const now = performance.now();
      // Если бокалы появились одновременно, наливаем по очереди.
      const delay = now - lastStart < 500 ? 450 : 0;
      g.start = Math.max(now, lastStart + delay);
      lastStart = g.start;
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    };

    // На телефоне бокалы стоят друг под другом: наливаем все сразу, как только показался первый,
    // чтобы, когда долистаешь до остальных, контакты в них уже были видны.
    const beginAll = () => {
      const now = performance.now();
      glasses.forEach((g) => {
        if (g.start === null) g.start = now;
      });
      lastStart = now;
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    };
    const list = document.querySelector('.glasses');
    const stacked = () => !!list && getComputedStyle(list).gridTemplateColumns.trim().split(/\s+/).length === 1;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (stacked()) {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          io.disconnect();
          beginAll();
          return;
        }
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          begin(glasses.find((g) => g.svg === entry.target));
        });
      }, { threshold: 0.55 });
      glasses.forEach((g) => io.observe(g.svg));
    } else {
      glasses.forEach(begin);
    }
  })();
})();
