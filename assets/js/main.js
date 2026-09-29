// Меню, плашки проектов, копирование контактов и видео на фоне блоков.
// Без JS плашки открыты, бокалы налиты, контакты видны.

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

  // Плашки проектов: по нажатию плашка уезжает вверх, под ней текст,
  // а наверху остаётся полоска с названием клиента.
  const plates = Array.from(document.querySelectorAll('.plate__cover')).map((cover) => ({
    cover,
    plate: cover.closest('.plate'),
    bottom: cover.querySelector('.plate__bottom'),
    inside: document.getElementById(cover.getAttribute('aria-controls')),
  }));
  const measurePlates = () => {
    plates.forEach(({ plate, bottom }) => plate.style.setProperty('--band', bottom.offsetHeight + 'px'));
  };
  plates.forEach(({ cover, plate, inside }) => {
    inside.setAttribute('aria-hidden', 'true');
    cover.addEventListener('click', () => {
      const open = !plate.classList.contains('is-open');
      plate.classList.toggle('is-open', open);
      cover.setAttribute('aria-expanded', String(open));
      inside.setAttribute('aria-hidden', String(!open));
    });
  });
  measurePlates();
  let measureFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(measurePlates);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measurePlates);

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
      const selectFallback = () => {
        const target = button.parentElement.querySelector('[data-copy-text]');
        if (!target) return;
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        if (label) label.textContent = 'Выделено';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, selectFallback);
      } else {
        selectFallback();
      }
    });
  });

  // Видео на фоне блока: достаточно вписать путь к файлу в data-src у <article class="vblock">.
  // Видео идёт без звука по кругу, пока блок на экране. Кнопки включают звук и ставят паузу.
  const videos = [];
  document.querySelectorAll('.vblock').forEach((block) => {
    const src = (block.dataset.src || '').trim();
    if (!src) return;
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    const poster = (block.dataset.poster || '').trim();
    if (poster) video.poster = poster;
    const title = block.querySelector('.vblock__title');
    if (title) video.setAttribute('aria-label', title.textContent.trim());
    video.src = src;
    block.querySelector('.vblock__media').prepend(video);
    block.classList.add('has-video');

    const controls = block.querySelector('.vblock__controls');
    const soundBtn = block.querySelector('[data-v-sound]');
    const pauseBtn = block.querySelector('[data-v-pause]');
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
    item.sync = sync;

    soundBtn.addEventListener('click', () => {
      const on = video.muted;
      videos.forEach((other) => {
        if (other === item) return;
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
      }, { threshold: 0.25 }).observe(block);
    } else {
      item.visible = true;
      sync();
    }
  });
})();

// Моушен: бутылка взрывается брызгами, пузырьки, бокалы наполняются.
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
  const color = (name) => css.getPropertyValue(name).trim();
  const C = {
    cream: color('--cream') || '#fbf7ee',
    champ: color('--champ') || '#f2e6cb',
    champ2: color('--champ-2') || '#e8d7b0',
    gold: color('--gold') || '#c8a15a',
    goldDeep: color('--gold-deep') || '#8c6a2e',
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

  // --- Пузырьки, как на larevoltosa.es ---
  // Поднимаются от нижнего края, чаще у левого и правого краёв, тают к верху.
  // Прокрутка вниз добавляет пузырьков и ускоряет те, что уже летят.
  const bubbles = (() => {
    const layer = document.querySelector('.bubbles');
    if (!layer || !layer.animate) return { burst() {} };
    const NS = 'http://www.w3.org/2000/svg';
    const pool = [];
    const size = phone ? 14 : 30;
    for (let i = 0; i < size; i++) {
      const el = document.createElement('div');
      el.className = 'bubble';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 66 66');
      const use = document.createElementNS(NS, 'use');
      use.setAttribute('href', '#bubble');
      use.setAttribute('filter', 'url(#bubble-wobble)');
      svg.appendChild(use);
      el.appendChild(svg);
      layer.appendChild(el);
      pool.push({ el, active: false, anims: [], factor: 0.5 + Math.random() * 1.5 });
    }

    function spawn(middle) {
      const b = pool.find((item) => !item.active);
      if (!b) return;
      b.active = true;
      const s = phone ? 36 + Math.random() * 34 : 56 + Math.random() * 74;
      const r = Math.random();
      let x;
      if (middle) x = 20 + Math.random() * 60;
      else x = r < 0.45 ? Math.random() * 25 : r < 0.9 ? 75 + Math.random() * 25 : 25 + Math.random() * 50;
      const px = (x / 100) * window.innerWidth - s / 2;
      const drift = (Math.random() - 0.5) * 200;
      const duration = 2000 + Math.random() * 1000;
      const rise = -1.3 * window.innerHeight;
      b.el.style.width = s + 'px';
      b.el.style.height = s + 'px';
      const move = b.el.animate([
        { transform: `translate3d(${px}px, 0, 0) scale(1)` },
        { transform: `translate3d(${px + drift}px, ${rise}px, 0) scale(0)` },
      ], { duration, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' });
      const fade = b.el.animate([
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 1 - 300 / duration },
        { opacity: 0, offset: 1 },
      ], { duration, fill: 'forwards' });
      b.anims = [move, fade];
      move.onfinish = () => {
        b.active = false;
        b.anims.forEach((a) => a.cancel());
        b.anims = [];
      };
    }

    let last = performance.now();
    let acc = 0;
    let burstUntil = 0;
    let velocity = 0;
    let lastY = window.scrollY;
    let scrollAcc = 0;
    const interval = phone ? 1.2 : 0.8;

    function tick(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      const bursting = now < burstUntil;
      const step = bursting ? 0.06 : interval;
      let spawned = 0;
      while (acc >= step && spawned < 5) {
        spawn(bursting);
        acc -= step;
        spawned++;
      }
      if (acc > step) acc = 0;
      if (velocity !== 0) {
        velocity *= 0.88;
        if (Math.abs(velocity) < 0.5) velocity = 0;
      }
      pool.forEach((b) => {
        if (!b.active) return;
        const rate = velocity ? 1 + Math.min(0.015 * velocity * b.factor, 2.5) : 1;
        b.anims.forEach((a) => {
          if (a.playbackRate !== rate) a.playbackRate = rate;
        });
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (delta <= 0) return;
      scrollAcc += delta;
      const n = Math.floor(scrollAcc / 300);
      if (n > 0) {
        scrollAcc -= n * 300;
        for (let i = 0; i < n && i < 4; i++) spawn(false);
      }
      velocity = Math.min(160, 10 * delta);
    }, { passive: true });

    // На тёмных блоках пузырьки светлые, на светлых золотые.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) layer.classList.toggle('is-cream', entry.target.dataset.bubbles === 'cream');
        });
      }, { rootMargin: '-50% 0px -50% 0px' });
      document.querySelectorAll('[data-bubbles]').forEach((el) => io.observe(el));
    }

    return {
      burst(ms) {
        burstUntil = performance.now() + ms;
      },
    };
  })();

  // --- Бутылка: пробка вылетает, брызги заполняют экран ---
  // Переход сделан по мотивам Cumulus: всплеск растёт, пока не закроет весь экран,
  // а следующий блок уже того же цвета, что и брызги.
  (() => {
    const hero = document.querySelector('.hero');
    const sticky = hero && hero.querySelector('.hero__sticky');
    const canvas = hero && hero.querySelector('.splash');
    const bottle = hero && hero.querySelector('.bottle');
    const cork = hero && hero.querySelector('.bottle__cork');
    const mouth = hero && hero.querySelector('.bottle__mouth');
    if (!canvas || !canvas.getContext || !bottle) return;
    const ctx = canvas.getContext('2d');

    const POP = 0.1; // хлопок
    const CLOUD = 0.15; // всплеск начинает расти
    const COVER = 0.9; // экран закрыт
    let W = 0;
    let H = 0;
    let lastP = -1;

    const rnd = random(20260929);
    const palette = [C.gold, C.champ2, C.gold, C.champ, C.cream, C.gold];
    // Капли, которые вылетают из горлышка вместе с пеной.
    const jet = Array.from({ length: phone ? 50 : 90 }, () => ({
      birth: POP + rnd() * 0.22,
      life: 0.14 + rnd() * 0.2,
      spread: (rnd() - 0.5) * 1.1,
      speed: 0.6 + rnd() * 1,
      size: 1.8 + rnd() * 4.6,
      color: palette[Math.floor(rnd() * palette.length)],
    }));
    // «Пальцы» всплеска с каплей на конце.
    const fingers = Array.from({ length: 24 }, (_, k) => ({
      angle: (k / 24) * Math.PI * 2 + (rnd() - 0.5) * 0.2,
      len: 0.85 + rnd() * 0.6,
      width: 0.12 + rnd() * 0.12,
      tip: rnd() < 0.75,
    }));
    const drops = Array.from({ length: phone ? 60 : 120 }, () => ({
      angle: rnd() * Math.PI * 2,
      reach: 1.15 + rnd() * 0.8,
      size: 0.006 + rnd() * 0.02,
      stretch: 1.5 + rnd() * 2,
      color: rnd() < 0.6 ? C.gold : C.champ2,
    }));
    const foam = Array.from({ length: phone ? 26 : 50 }, () => ({
      angle: rnd() * Math.PI * 2,
      dist: Math.sqrt(rnd()) * 0.8,
      size: 2 + rnd() * 7,
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

    function draw(p, now) {
      // Бутылка: чем ближе хлопок, тем сильнее дрожит; после хлопка отдача.
      const before = clamp(p / POP);
      const shake = p < POP ? Math.sin(now * 0.05) * 3.2 * before * before : 0;
      const tilt = p < POP ? -6 - 8 * before : -14 + 4 * easeOut(clamp((p - POP) / 0.08));
      bottle.style.transform = `rotate(${(tilt + shake).toFixed(2)}deg)`;

      const scale = bottle.getBoundingClientRect().height / 640 || 1;
      const flight = clamp((p - POP) / 0.14);
      if (flight > 0) {
        const up = (H / scale) * 1.4 * easeOut(flight);
        const side = (W / scale) * 0.18 * flight;
        cork.style.transform = `translate(${side.toFixed(1)}px, ${(-up).toFixed(1)}px) rotate(${(flight * 560).toFixed(1)}deg)`;
      } else {
        cork.style.transform = '';
      }

      if (p >= POP && !popped) {
        popped = true;
        bubbles.burst(1400);
      } else if (p < POP * 0.5) {
        popped = false;
      }

      ctx.clearRect(0, 0, W, H);
      if (p < POP) return;
      if (p >= COVER + 0.05) {
        ctx.fillStyle = C.champ;
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
        ctx.strokeStyle = C.gold;
        ctx.globalAlpha = 1 - ring;
        ctx.lineWidth = 1 + 3 * (1 - ring);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Капли из горлышка.
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

      ctx.fillStyle = C.gold;
      splat(cx, cy, R, axis, bias, turn);
      ctx.fillStyle = C.champ2;
      splat(cx, cy, R * 0.88, axis, bias, turn + 0.13);
      ctx.fillStyle = C.champ;
      splat(cx, cy, R * 0.76, axis, bias, turn + 0.26);

      // Пузырьки пены внутри всплеска гаснут к концу перехода.
      const foamAlpha = 0.5 * (1 - clamp((q - 0.55) / 0.35));
      if (foamAlpha > 0) {
        ctx.globalAlpha = foamAlpha;
        ctx.strokeStyle = C.gold;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        foam.forEach((f) => {
          const x = cx + Math.cos(f.angle) * R * 0.47 * f.dist;
          const y = cy + Math.sin(f.angle) * R * 0.47 * f.dist;
          circle(x, y, f.size * (1 + q * 1.5));
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
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

  // --- Контакты: вино наливается в бокалы, и контакты проявляются ---
  // Три бокала наполняются тонкими струями с разной скоростью, как стаканы на Cumulus.
  (() => {
    const pour = document.querySelector('.pour');
    if (!pour) return;
    const contacts = Array.from(pour.querySelectorAll('.contact'));
    const glasses = Array.from(pour.querySelectorAll('.glass')).map((svg, i) => ({
      wine: svg.querySelector('.glass__wine'),
      stream: svg.querySelector('.glass__stream'),
      bottom: Number(svg.dataset.bottom),
      level: Number(svg.dataset.level),
      delay: [0, 0.5, 0.95][i] || 0,
      duration: [2.6, 3, 2.2][i] || 2.6,
      contact: contacts[i],
    }));
    const TOP = -110;

    function wave(g, y, amp, t) {
      let d = `M0,${(y + Math.sin(t * 7) * amp).toFixed(2)}`;
      for (let x = 10; x <= 200; x += 10) {
        d += ` L${x},${(y + Math.sin(x * 0.07 + t * 7) * amp).toFixed(2)}`;
      }
      return d + ` L200,${g.bottom + 4} L0,${g.bottom + 4} Z`;
    }

    function render(g, t) {
      const local = t - g.delay;
      const inTime = 0.35;
      const fillT = clamp((local - inTime * 0.7) / g.duration);
      const f = easeOut(fillT);
      const surface = g.bottom + 2 - (g.bottom + 2 - g.level) * f;
      const settle = clamp((local - inTime - g.duration) / 1.6);
      const amp = local <= 0 ? 0 : 1.8 * (1 - settle) * (0.4 + 0.6 * (1 - f));

      // Струя: сначала падает сверху до дна, потом её хвост уходит вниз.
      let top = TOP;
      let end = TOP;
      if (local > 0) {
        end = lerp(TOP, surface, clamp(local / inTime));
        const out = clamp((local - inTime - g.duration + 0.25) / 0.4);
        top = lerp(TOP, surface, easeIn(out));
      }
      g.stream.setAttribute('y', top.toFixed(2));
      g.stream.setAttribute('height', Math.max(0, end - top).toFixed(2));
      g.wine.setAttribute('d', wave(g, surface, amp, t));
      if (g.contact) g.contact.style.setProperty('--fill', f.toFixed(3));
      return settle >= 1;
    }

    glasses.forEach((g) => render(g, -1));

    let start = 0;
    function frame(now) {
      const t = (now - start) / 1000;
      const done = glasses.map((g) => render(g, t)).every(Boolean);
      if (!done) requestAnimationFrame(frame);
    }

    const begin = () => {
      start = performance.now();
      requestAnimationFrame(frame);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        begin();
      }, { threshold: 0.35 });
      io.observe(pour);
    } else {
      begin();
    }
  })();
})();
