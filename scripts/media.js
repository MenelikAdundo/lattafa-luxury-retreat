document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('#hero-film');
  let wantsPlayback = !reducedMotion.matches && !navigator.connection?.saveData;
  let heroVisible = true;
  let dialog;
  let lastTrigger;
  const playHero = () => {
    if (hero && wantsPlayback && heroVisible && !dialog?.open && !document.hidden) hero.play().catch(() => {});
  };
  if (hero) {
    const controls = document.querySelector('[data-hero-controls]');
    const toggle = document.querySelector('[data-hero-toggle]');
    const sound = document.querySelector('[data-hero-sound]');
    hero.controls = false;
    controls.hidden = false;
    const updatePlayState = () => {
      toggle.classList.toggle('is-paused', hero.paused);
      toggle.querySelector('[data-play-label]').textContent = hero.paused ? 'Play' : 'Pause';
      toggle.setAttribute('aria-label', hero.paused ? 'Play main film' : 'Pause main film');
    };
    toggle.addEventListener('click', () => {
      wantsPlayback = hero.paused;
      if (wantsPlayback) playHero(); else hero.pause();
    });
    sound.addEventListener('click', () => {
      hero.muted = !hero.muted;
      sound.textContent = hero.muted ? 'Sound off' : 'Sound on';
      sound.setAttribute('aria-label', hero.muted ? 'Turn on video sound' : 'Mute video sound');
      sound.setAttribute('aria-pressed', String(!hero.muted));
    });
    hero.addEventListener('play', updatePlayState);
    hero.addEventListener('pause', updatePlayState);
    updatePlayState();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) playHero(); else hero.pause();
      }, { threshold: .1 }).observe(hero);
    } else playHero();
    document.addEventListener('visibilitychange', () => { if (document.hidden) hero.pause(); else playHero(); });
    reducedMotion.addEventListener('change', event => { wantsPlayback = !event.matches; if (wantsPlayback) playHero(); else hero.pause(); });
  }

  const triggers = [...document.querySelectorAll('[data-video-open]')];
  if (triggers.length && typeof HTMLDialogElement !== 'undefined') {
    dialog = document.createElement('dialog');
    dialog.className = 'film-dialog';
    dialog.setAttribute('aria-labelledby', 'film-dialog-title');
    dialog.innerHTML = '<header class="film-dialog-heading"><div><span class="eyebrow">The Lattafa film</span><h2 class="display" id="film-dialog-title">Inside Lattafa</h2></div><button class="film-dialog-close" type="button" aria-label="Close film">×</button></header><video controls playsinline preload="none" aria-label="Lattafa property film"></video><p class="film-dialog-note">A glimpse of life at Lattafa. Use the player controls for sound and full screen.</p>';
    document.body.append(dialog);
    const player = dialog.querySelector('video');
    triggers.forEach(trigger => trigger.addEventListener('click', event => {
      event.preventDefault();
      lastTrigger = trigger;
      hero?.pause();
      player.src = trigger.getAttribute('href');
      player.poster = trigger.dataset.videoPoster || '';
      dialog.querySelector('#film-dialog-title').textContent = trigger.dataset.videoTitle || 'Inside Lattafa';
      player.muted = false;
      dialog.showModal();
      document.documentElement.classList.add('film-dialog-open');
      dialog.querySelector('.film-dialog-close').focus();
      player.play().catch(() => {});
    }));
    dialog.querySelector('.film-dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      player.pause();
      player.removeAttribute('src');
      player.load();
      document.documentElement.classList.remove('film-dialog-open');
      lastTrigger?.focus();
      playHero();
    });
  }

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    document.documentElement.classList.add('motion-ready');
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveals.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(element => reveals.observe(element));
  }
});
