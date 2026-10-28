document.addEventListener('DOMContentLoaded', () => {
  const galleries = {
    'one-bedroom': [
      ['23', 'Light-filled bedroom and seating area'],
      ['29', 'A quiet corner to relax'],
      ['25', 'Modern shower room']
    ],
    'two-bedroom': [
      ['04', 'A welcoming lounge at Lattafa'],
      ['26', 'A comfortable bedroom at the retreat'],
      ['28', 'Kitchen and breakfast bar']
    ],
    'three-bedroom': [
      ['26', 'A bedroom with an upholstered headboard'],
      ['19', 'Kitchen and dining space'],
      ['17', 'Modern bathroom']
    ],
    'four-bedroom': [
      ['15', 'A spacious lounge for gathering'],
      ['18', 'A bright bedroom and seating area'],
      ['19', 'Kitchen and breakfast bar']
    ]
  };
  const cards = [...document.querySelectorAll('[data-room-category]')];
  const filterButtons = [...document.querySelectorAll('[data-room-filter]')];
  const count = document.querySelector('.room-count');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.roomFilter;
    filterButtons.forEach(filter => {
      const selected = filter === button;
      filter.classList.toggle('is-active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    cards.forEach(card => { card.hidden = category !== 'all' && card.dataset.roomCategory !== category; });
    const visible = cards.filter(card => !card.hidden).length;
    count.textContent = category === 'all' ? 'Showing all 4 stays.' : `Showing ${visible} ${category === 'suite' ? 'suites' : 'family villas'}.`;
  }));

  // Preserve links from the homepage even after a visitor has filtered the grid.
  const revealLinkedRoom = () => {
    const card = cards.find(item => `#${item.id}` === location.hash);
    if (card?.hidden) filterButtons.find(button => button.dataset.roomFilter === 'all').click();
  };
  window.addEventListener('hashchange', revealLinkedRoom);
  revealLinkedRoom();

  cards.forEach(card => {
    const images = galleries[card.dataset.roomGallery];
    let position = 0;
    card.dataset.photoIndex = '0';
    card.querySelector('.suite-photo-controls').hidden = false;
    card.querySelectorAll('[data-slide]').forEach(button => button.addEventListener('click', () => {
      position = (position + Number(button.dataset.slide) + images.length) % images.length;
      card.dataset.photoIndex = String(position);
      const image = card.querySelector('.suite-cover');
      image.src = `assets/gallery/photo-${images[position][0]}.jpg`;
      image.alt = images[position][1];
      card.querySelector('.suite-photo-counter').textContent = `${String(position + 1).padStart(2, '0')} / 03`;
    }));
  });

  const dialog = document.querySelector('.room-dialog');
  let activeGallery = [];
  let currentPhoto = 0;
  let returnFocus;
  const renderDialog = () => {
    const [file, caption] = activeGallery[currentPhoto];
    const image = dialog.querySelector('.room-dialog-image');
    image.src = `assets/gallery/photo-${file}.jpg`;
    image.alt = caption;
    dialog.querySelector('.room-dialog-caption').textContent = `${currentPhoto + 1} / ${activeGallery.length} — ${caption}`;
  };
  const moveDialog = direction => {
    currentPhoto = (currentPhoto + direction + activeGallery.length) % activeGallery.length;
    renderDialog();
  };
  document.querySelectorAll('[data-open-gallery]').forEach(button => button.addEventListener('click', () => {
    if (typeof dialog.showModal !== 'function') { window.location.assign('gallery.html'); return; }
    const card = button.closest('[data-room-gallery]');
    activeGallery = galleries[button.dataset.openGallery];
    currentPhoto = Number(card.dataset.photoIndex || 0);
    dialog.querySelector('#room-dialog-title').textContent = card.querySelector('h3').textContent;
    returnFocus = button;
    renderDialog();
    dialog.showModal();
    document.documentElement.classList.add('room-dialog-open');
    dialog.querySelector('.room-dialog-close').focus();
  }));
  dialog.querySelector('.room-dialog-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.room-dialog-prev').addEventListener('click', () => moveDialog(-1));
  dialog.querySelector('.room-dialog-next').addEventListener('click', () => moveDialog(1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { document.documentElement.classList.remove('room-dialog-open'); returnFocus?.focus(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); moveDialog(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveDialog(-1); }
  });
});
