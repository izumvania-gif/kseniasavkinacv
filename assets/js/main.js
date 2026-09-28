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
    sheetColor.textContent = 'образец №\u00a0' + num + ', ' + (sample.dataset.color || '');
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
