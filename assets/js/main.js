// Лист слепой дегустации и слоты для видео.
// На широких экранах заметка образца заполняет лист справа (без сдвига строк),
// на узких экранах строка раскрывается как аккордеон. Без JS все заметки видны сразу.

(() => {
  const wide = window.matchMedia('(min-width: 1024px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const samples = Array.from(document.querySelectorAll('.sample'));
  const sheet = document.querySelector('.sheet');
  const sheetNum = sheet && sheet.querySelector('[data-sheet-num]');
  const sheetTitle = sheet && sheet.querySelector('[data-sheet-title]');
  const sheetFields = sheet ? Array.from(sheet.querySelectorAll('[data-sheet-field]')) : [];

  let active = null;
  let hoverTimer = 0;

  samples.forEach((sample, i) => {
    const btn = sample.querySelector('.sample__btn');
    const note = sample.querySelector('.note');
    const id = 'sample-' + (i + 1);
    btn.id = id;
    note.id = id + '-note';
    note.setAttribute('role', 'region');
    note.setAttribute('aria-labelledby', id);
    btn.setAttribute('aria-controls', note.id);
  });

  function syncExpanded() {
    samples.forEach((sample) => {
      const btn = sample.querySelector('.sample__btn');
      if (wide.matches) {
        btn.removeAttribute('aria-expanded');
      } else {
        btn.setAttribute('aria-expanded', String(sample.classList.contains('is-open')));
      }
    });
  }

  function fillSheet(sample) {
    if (!sheet) return;
    const num = sample.querySelector('.glass__num').textContent.trim();
    const title = sample.querySelector('.sample__title').textContent.trim();
    const notes = sample.querySelectorAll('.note dd');

    sheetNum.textContent = num;
    sheetTitle.textContent = title;
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

  function toggle(sample) {
    const open = !sample.classList.contains('is-open');
    sample.classList.toggle('is-open', open);
    sample.querySelector('.sample__btn').setAttribute('aria-expanded', String(open));
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
      if (wide.matches) {
        activate(sample);
      } else {
        toggle(sample);
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || wide.matches) return;
    const current = document.activeElement && document.activeElement.closest('.sample.is-open');
    if (current) toggle(current);
  });

  wide.addEventListener('change', () => {
    syncExpanded();
    if (wide.matches && active) fillSheet(active);
  });

  syncExpanded();

  // «Первый глоток»: один раз за сессию первый бокал слегка наливается,
  // чтобы было видно, что образцы откликаются.
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
          if (active || first.classList.contains('is-open')) return;
          first.classList.add('is-hint');
          window.setTimeout(() => first.classList.remove('is-hint'), 1300);
        }, 400);
      }, { threshold: 1 });
      observer.observe(first);
    }
  }

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
