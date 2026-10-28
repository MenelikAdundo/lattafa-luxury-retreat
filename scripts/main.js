document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
  toggle?.addEventListener('click', () => {
    const isOpen = header.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    header?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));
  const filters = document.querySelectorAll('[data-filter]');
  const galleryItems = document.querySelectorAll('.gallery-item');
  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach(item => item.classList.toggle('active', item === button));
    galleryItems.forEach(item => { item.hidden = filter !== 'all' && item.dataset.category !== filter; });
  }));
  const lightbox = document.querySelector('.lightbox');
  const lightboxImage = lightbox?.querySelector('img');
  const lightboxCaption = lightbox?.querySelector('p');
  document.querySelectorAll('.gallery-item').forEach(item => item.addEventListener('click', () => {
    const image = item.querySelector('img');
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = item.querySelector('span')?.textContent || image.alt;
    lightbox.classList.add('open');
    lightbox.querySelector('button').focus();
  }));
  const closeLightbox = () => lightbox?.classList.remove('open');
  lightbox?.querySelector('button').addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeLightbox(); });
});
