// Слепая дегустация, контрэтикетка и слоты для видео.
// На широких экранах бокал по наведению заполняет лист дегустации справа,
// на узких лист выезжает снизу по нажатию. Без JS все заметки видны сразу.

(() => {
  const wide = window.matchMedia('(min-width: 1024px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const samples = Array.from(document.querySelectorAll('.sample'));
  const sheet = document.querySelector('.sheet');
  const backdrop = document.querySelector('[data-sheet-backdrop]');
  const closeBtn = sheet && sheet.querySelector('.sheet__close');
  const sheetNum = sheet && sheet.querySelector('[data-sheet-num]');
  const sheetColor = sheet && sheet.querySelector('[data-sheet-color]');
  const sheetTitle = sheet && sheet.querySelector('[data-sheet-title]');
  const sheetFields = sheet ? Array.from(sheet.querySelectorAll('[data-sheet-field]')) : [];

  let active = null;
  let hoverTimer = 0;
  let returnFocus = null;

  samples.forEach((sample, i) => {
    const btn = sample.querySelector('.sample__btn');
    const note = sample.querySelector('.note');
    const id = 'sample-' + (i + 1);
    btn.id = id;
    note.id = id + '-note';
    note.setAttribute('role', 'region');
    note.setAttribute('aria-labelledby', id);
    btn.setAttribute('aria-describedby', note.id);
  });

  function fillSheet(sample) {
    if (!sheet) return;
    const num = sample.querySelector('.glass__num').textContent.trim();
    const notes = sample.querySelectorAll('.note dd');

    sheet.style.setProperty('--w', sample.style.getPropertyValue('--w'));
    sheetNum.textContent = num;
    sheetColor.textContent = 'Образец №\u00a0' + num + (sample.dataset.color ? ', ' + sample.dataset.color : '');
    sheetTitle.textContent = sample.querySelector('.sample__title').textContent.trim();
    sheetFields.forEach((field, i) => {
      const span = document.createElement('span');
      span.innerHTML = notes[i] ? notes[i].innerHTML : '';
      field.replaceChildren(span);
    });

    sheet.classList.remove('is-filling');
    void sheet.offsetWidth; // перезапуск заполнения граф
    sheet.classList.add('is-filled', 'is-filling');
  }

  function activate(sample) {
    if (active === sample) return;
    if (active) active.classList.remove('is-active');
    active = sample;
    sample.classList.add('is-active');
    fillSheet(sample);
  }

  // Нижний лист на узких экранах ведёт себя как диалог.
  function syncSheetA11y() {
    if (!sheet) return;
    const open = sheet.classList.contains('is-open');
    if (wide.matches) {
      sheet.setAttribute('aria-hidden', 'true');
      sheet.removeAttribute('role');
      sheet.removeAttribute('aria-modal');
      sheet.inert = false;
    } else {
      sheet.setAttribute('aria-hidden', String(!open));
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.inert = !open;
    }
  }

  function openSheet(trigger) {
    if (!sheet) return;
    returnFocus = trigger;
    sheet.classList.add('is-open');
    if (backdrop) backdrop.hidden = false;
    syncSheetA11y();
    window.requestAnimationFrame(() => closeBtn && closeBtn.focus({ preventScroll: true }));
  }

  function closeSheet() {
    if (!sheet || !sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open');
    if (backdrop) backdrop.hidden = true;
    syncSheetA11y();
    if (returnFocus) returnFocus.focus({ preventScroll: true });
  }

  samples.forEach((sample) => {
    const btn = sample.querySelector('.sample__btn');

    btn.addEventListener('mouseenter', () => {
      if (!wide.matches) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => activate(sample), 70);
    });

    btn.addEventListener('mouseleave', () => window.clearTimeout(hoverTimer));

    btn.addEventListener('focus', () => {
      if (wide.matches) activate(sample);
    });

    btn.addEventListener('click', () => {
      activate(sample);
      if (!wide.matches) openSheet(btn);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeSheet);
  if (backdrop) backdrop.addEventListener('click', closeSheet);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSheet();
  });

  wide.addEventListener('change', () => {
    if (wide.matches) {
      sheet && sheet.classList.remove('is-open');
      if (backdrop) backdrop.hidden = true;
    }
    syncSheetA11y();
  });

  syncSheetA11y();

  // «Первый глоток»: один раз за сессию первый бокал на секунду раскрывается,
  // чтобы было видно, что бокалы откликаются.
  if (samples.length && 'IntersectionObserver' in window && !reduced.matches) {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem('first-sip') === '1';
    } catch (error) {
      seen = false;
    }

    if (!seen) {
      const first = samples[0];
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        try {
          window.sessionStorage.setItem('first-sip', '1');
        } catch (error) {
          // хранилище недоступно: подсказка просто покажется ещё раз
        }
        window.setTimeout(() => {
          if (active) return;
          first.classList.add('is-hint');
          window.setTimeout(() => first.classList.remove('is-hint'), 1500);
        }, 500);
      }, { threshold: 0.9 });
      observer.observe(first);
    }
  }

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

  // Контрэтикетка: копирование почты и телефона.
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

  // Повод для письма подставляется в тему.
  const mail = document.querySelector('[data-mail]');
  const mailSubject = document.querySelector('[data-mail-subject]');
  document.querySelectorAll('input[name="reason"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!mail || !input.checked) return;
      mail.href = 'mailto:kseniia.savkina@mail.ru?subject=' + encodeURIComponent(input.value);
      if (mailSubject) mailSubject.textContent = '«' + input.value + '»';
    });
  });

  // Видео: достаточно вписать путь к файлу в data-src у нужного <figure class="video">.
  document.querySelectorAll('.video').forEach((figure) => {
    const src = (figure.dataset.src || '').trim();
    if (!src) return;
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const poster = (figure.dataset.poster || '').trim();
    if (poster) video.poster = poster;
    const caption = figure.querySelector('figcaption strong');
    if (caption) video.setAttribute('aria-label', caption.textContent.trim());
    figure.querySelector('.video__frame').replaceChildren(video);
  });
})();

// Моушен: бокал прокрутки в шапке и сцена «Налив».
// При prefers-reduced-motion сцена сразу показывает налитый бокал.
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // --- Сцена «Налив» ---
  const pour = document.querySelector('.pour');
  const pourParts = pour && {
    stream: pour.querySelector('.pour__stream'),
    wine: pour.querySelector('.pour__wine'),
    surface: pour.querySelector('.pour__surface'),
    drops: Array.from(pour.querySelectorAll('.pour__drops circle')),
    lines: Array.from(pour.querySelectorAll('.pour__line')),
  };
  const EMPTY = 128;
  const FULL = 88;
  let pourProgress = motion ? 0 : 1;
  let pourVisible = false;
  let pourFrame = 0;

  function drawPour(time) {
    if (!pourParts) return;
    const p = pourProgress;
    const t = time / 1000;
    const streamIn = easeOut(clamp(p / 0.12));
    const fill = easeInOut(clamp((p - 0.1) / 0.62));
    const tail = easeInOut(clamp((p - 0.72) / 0.12));
    const pouring = p > 0.02 && p < 0.84 ? 1 : 0;
    const level = EMPTY - (EMPTY - FULL) * fill;

    // Струя: сверху до поверхности; в конце хвост падает вниз.
    if (pouring || (p > 0 && p < 0.84)) {
      const top = -130 + (level + 130) * tail;
      const bottom = -130 + (level + 130) * streamIn;
      const wobble = Math.sin(t * 7) * 0.6;
      pourParts.stream.setAttribute('d', `M60,${top.toFixed(1)} Q${(60 + wobble).toFixed(2)},${((top + bottom) / 2).toFixed(1)} 60,${bottom.toFixed(1)}`);
      pourParts.stream.style.opacity = bottom - top > 1 ? '1' : '0';
    } else {
      pourParts.stream.style.opacity = '0';
    }

    // Поверхность: волна сильнее, пока льётся, и успокаивается после.
    const settle = clamp((p - 0.8) / 0.2);
    const amp = motion ? (pouring ? 2.2 : 1.1 - 0.7 * settle) : 0;
    const splash = pouring * (1 - tail) * 3.2;
    let surface = '';
    for (let x = 0; x <= 120; x += 4) {
      const y = level
        + amp * Math.sin(x * 0.09 + t * 2.3)
        + amp * 0.5 * Math.sin(x * 0.21 - t * 3.4)
        - splash * Math.exp(-Math.pow((x - 60) / 7, 2));
      surface += (x === 0 ? 'M' : ' L') + x + ',' + y.toFixed(2);
    }
    pourParts.surface.setAttribute('d', surface);
    pourParts.wine.setAttribute('d', surface + ' L120,140 L0,140 Z');
    pourParts.surface.style.opacity = fill > 0.01 ? '0.75' : '0';

    // Брызги у места падения струи.
    pourParts.drops.forEach((drop, i) => {
      const phase = (t * (1.4 + i * 0.17) + i * 0.37) % 1;
      const dir = i % 2 ? 1 : -1;
      const x = 60 + dir * (3 + i * 1.6) * phase;
      const y = level - Math.sin(phase * Math.PI) * (6 + (i % 3) * 3);
      drop.setAttribute('cx', x.toFixed(2));
      drop.setAttribute('cy', y.toFixed(2));
      drop.style.opacity = pouring && streamIn >= 1 && tail < 0.5 ? String(0.85 * (1 - phase)) : '0';
    });

    // Строки текста подсвечиваются по очереди.
    const current = p < 0.45 ? 0 : 1;
    pourParts.lines.forEach((line, i) => {
      line.classList.toggle('is-on', motion ? i === current : true);
      line.classList.toggle('is-past', motion && i < current);
    });
  }

  function pourLoop(time) {
    drawPour(time);
    if (pourVisible && motion) pourFrame = requestAnimationFrame(pourLoop);
    else pourFrame = 0;
  }

  if (pourParts) {
    if (motion && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        pourVisible = entries.some((entry) => entry.isIntersecting);
        if (pourVisible && !pourFrame) pourFrame = requestAnimationFrame(pourLoop);
      }).observe(pour);
    }
    drawPour(0);
  }


  // --- Прокрутка ---
  const hero = document.querySelector('.hero');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty('--scroll', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
      // Большой бокал на первом экране «отпивает» по мере прокрутки.
      if (hero && motion) hero.style.setProperty('--hero-p', clamp(window.scrollY / hero.offsetHeight).toFixed(4));
      if (pour && motion) {
        const r = pour.getBoundingClientRect();
        pourProgress = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
        if (!pourFrame) drawPour(performance.now());
      }
    });
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(onScroll, 150);
  });
  window.addEventListener('scroll', onScroll, { passive: true });

  onScroll();
  window.addEventListener('load', onScroll);
})();
