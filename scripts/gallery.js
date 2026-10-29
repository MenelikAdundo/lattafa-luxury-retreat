document.addEventListener('DOMContentLoaded', () => {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;
  const items = [...gallery.querySelectorAll('.gallery-item')];
  const names = { all: 'All spaces', exterior: 'Home & grounds', bedroom: 'Bedrooms', living: 'Living spaces', kitchen: 'Kitchen & dining', bathroom: 'Bathrooms' };
  const photos = items.map(item => {
    const image = item.querySelector('img');
    return { item, src: image.getAttribute('src'), alt: image.alt, category: item.dataset.category };
  });
  const filters = [...gallery.querySelectorAll('[data-gallery-filter]')];
  const carousel = gallery.querySelector('[data-gallery-carousel]');
  const grid = gallery.querySelector('[data-gallery-grid]');
  const image = gallery.querySelector('[data-gallery-image]');
  const title = gallery.querySelector('[data-gallery-title]');
  const category = gallery.querySelector('[data-gallery-category]');
  const counter = gallery.querySelector('[data-gallery-counter]');
  const ribbon = gallery.querySelector('[data-gallery-thumbnails]');
  const status = gallery.querySelector('[data-gallery-status]');
  const viewButton = gallery.querySelector('[data-gallery-view]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0;
  let filtered = photos;
  let gridMode = false;
  let lastTrigger;

  const dialog = document.createElement('dialog');
  dialog.className = 'photo-dialog';
  dialog.setAttribute('aria-labelledby', 'photo-dialog-title');
  dialog.innerHTML = '<div class="photo-dialog-shell"><header class="photo-dialog-header"><span class="photo-dialog-brand">LATTAFA / A CLOSER LOOK</span><button class="photo-dialog-close" type="button" aria-label="Close photo viewer">×</button></header><div class="photo-dialog-media" data-gallery-swipe><img alt="" decoding="async" draggable="false"><button class="gallery-arrow" type="button" data-photo-prev aria-label="Previous photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7"/></svg></button><button class="gallery-arrow" type="button" data-photo-next aria-label="Next photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5l7 7-7 7"/></svg></button></div><footer class="photo-dialog-footer" aria-live="polite" aria-atomic="true"><div><h2 id="photo-dialog-title"></h2><p data-photo-category></p></div><span class="gallery-counter" data-photo-counter></span></footer></div>';
  document.body.append(dialog);
  const dialogImage = dialog.querySelector('img');
  const dialogTitle = dialog.querySelector('h2');
  const dialogCounter = dialog.querySelector('[data-photo-counter]');
  const dialogCategory = dialog.querySelector('[data-photo-category]');
  const closeButton = dialog.querySelector('.photo-dialog-close');

  const thumbnails = photos.map(photo => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-thumb';
    button.setAttribute('aria-label', `Show ${photo.alt.toLowerCase()}`);
    const thumb = document.createElement('img');
    thumb.src = photo.src;
    thumb.alt = '';
    thumb.width = 98;
    thumb.height = 66;
    thumb.loading = 'lazy';
    button.append(thumb);
    button.addEventListener('click', () => {
      selected = filtered.indexOf(photo);
      render(true);
    });
    ribbon.append(button);
    return button;
  });

  function render(revealThumbnail = false) {
    const photo = filtered[selected];
    const position = `${String(selected + 1).padStart(2, '0')} / ${String(filtered.length).padStart(2, '0')}`;
    image.src = photo.src;
    image.alt = photo.alt;
    title.textContent = photo.alt;
    category.textContent = names[photo.category];
    counter.textContent = position;
    thumbnails.forEach((button, index) => {
      button.hidden = !filtered.includes(photos[index]);
      button.setAttribute('aria-pressed', String(photos[index] === photo));
    });
    if (revealThumbnail) {
      const thumb = thumbnails[photos.indexOf(photo)];
      const left = thumb.offsetLeft - ribbon.offsetLeft - (ribbon.clientWidth - thumb.offsetWidth) / 2;
      ribbon.scrollTo({ left, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    if (dialog.open) {
      dialogImage.src = photo.src;
      dialogImage.alt = photo.alt;
      dialogTitle.textContent = photo.alt;
      dialogCategory.textContent = names[photo.category];
      dialogCounter.textContent = position;
    }
    status.textContent = `${names[photo.category]}: ${photo.alt}. Photo ${selected + 1} of ${filtered.length}.`;
  }

  function step(direction) {
    selected = (selected + direction + filtered.length) % filtered.length;
    render(true);
  }

  function openPhoto(trigger) {
    lastTrigger = trigger;
    dialog.showModal();
    document.documentElement.classList.add('photo-dialog-open');
    render();
    closeButton.focus();
  }

  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.galleryFilter;
    filtered = photos.filter(photo => filter === 'all' || photo.category === filter);
    selected = 0;
    filters.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    photos.forEach(photo => { photo.item.hidden = !filtered.includes(photo); });
    grid.setAttribute('aria-label', `${names[filter]} photos`);
    render(true);
  }));

  viewButton.addEventListener('click', () => {
    gridMode = !gridMode;
    grid.hidden = !gridMode;
    carousel.hidden = gridMode;
    viewButton.setAttribute('aria-pressed', String(gridMode));
    viewButton.querySelector('span').textContent = gridMode ? 'Back to photo tour' : 'View all photos';
    status.textContent = gridMode ? `${filtered.length} photos shown in the grid.` : 'Photo tour view.';
    if (!gridMode) render(true);
  });
  gallery.querySelector('[data-gallery-prev]').addEventListener('click', () => step(-1));
  gallery.querySelector('[data-gallery-next]').addEventListener('click', () => step(1));
  gallery.querySelector('[data-gallery-expand]').addEventListener('click', event => openPhoto(event.currentTarget));
  items.forEach((item, index) => item.addEventListener('click', () => {
    selected = filtered.indexOf(photos[index]);
    openPhoto(item);
  }));
  dialog.querySelector('[data-photo-prev]').addEventListener('click', () => step(-1));
  dialog.querySelector('[data-photo-next]').addEventListener('click', () => step(1));
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('photo-dialog-open');
    lastTrigger?.focus({ preventScroll: true });
  });
  [carousel, dialog].forEach(surface => surface.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1);
  }));
  document.querySelectorAll('[data-gallery-swipe]').forEach(surface => {
    let start;
    surface.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      surface.setPointerCapture(event.pointerId);
      start = { x: event.clientX, y: event.clientY };
    });
    surface.addEventListener('pointerup', event => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    });
    surface.addEventListener('pointercancel', () => { start = null; });
  });
  gallery.querySelector('[data-gallery-controls]').hidden = false;
  carousel.hidden = false;
  grid.hidden = true;
  render();
});
