document.addEventListener('DOMContentLoaded', () => {
  const monthInput = document.querySelector('#review-month');
  if (monthInput) {
    const now = new Date();
    monthInput.max = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const sections = [...document.querySelectorAll('[data-reviews]')];
  if (!sections.length) return;
  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  fetch('assets/reviews.json')
    .then(response => { if (!response.ok) throw new Error('Reviews unavailable'); return response.json(); })
    .then(data => {
      if (!Array.isArray(data)) return;
      const reviews = data.filter(review => typeof review.name === 'string' && review.name.trim() && typeof review.text === 'string' && review.text.trim() && (review.rating == null || (Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5)));
      if (!reviews.length) return;
      sections.forEach((section, sectionIndex) => {
        const list = section.querySelector('[data-review-list]');
        reviews.forEach((review, index) => {
          const card = makeElement('article', 'review-card');
          const stars = makeElement('div', review.rating ? 'review-stars' : 'review-quote-mark', review.rating ? '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) : '“');
          if (review.rating) { stars.setAttribute('role', 'img'); stars.setAttribute('aria-label', `${review.rating} out of 5 stars`); }
          else stars.setAttribute('aria-hidden', 'true');
          const quote = makeElement('blockquote', 'review-quote', review.text);
          quote.id = `guest-quote-${sectionIndex}-${index}`;
          card.append(stars);
          if (review.title) card.append(makeElement('h3', 'review-card-title display', review.title));
          card.append(quote);
          if (review.text.length > 180) {
            quote.classList.add('is-collapsed');
            const more = makeElement('button', 'review-read-more', 'Read more');
            more.type = 'button';
            more.setAttribute('aria-expanded', 'false');
            more.setAttribute('aria-controls', quote.id);
            more.setAttribute('aria-label', `Read more from ${review.name}`);
            more.addEventListener('click', () => {
              const expanded = quote.classList.toggle('is-collapsed') === false;
              more.textContent = expanded ? 'Show less' : 'Read more';
              more.setAttribute('aria-expanded', String(expanded));
              more.setAttribute('aria-label', `${expanded ? 'Show less' : 'Read more'} from ${review.name}`);
            });
            card.append(more);
          }
          const byline = makeElement('div', 'review-byline');
          const avatar = makeElement('span', 'review-avatar', review.name.trim().charAt(0).toUpperCase());
          avatar.setAttribute('aria-hidden', 'true');
          const details = makeElement('div');
          details.append(makeElement('strong', '', review.name));
          if (/^\d{4}-(0[1-9]|1[0-2])$/.test(review.stayMonth || '')) {
            details.append(makeElement('small', '', new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${review.stayMonth}-01T12:00:00Z`))));
          }
          if (review.accommodation) details.append(makeElement('small', 'review-stay-label', review.accommodation));
          byline.append(avatar, details);
          card.append(byline);
          let sourceUrl;
          try { const parsed = new URL(review.sourceUrl); if (parsed.protocol === 'https:') sourceUrl = parsed.href; } catch { /* First-party reviews may have no external source. */ }
          const source = makeElement(sourceUrl ? 'a' : 'span', 'review-source', review.sourceLabel || 'Shared directly with Lattafa');
          if (sourceUrl) { source.href = sourceUrl; source.target = '_blank'; source.rel = 'noopener noreferrer'; }
          card.append(source);
          list.append(card);
        });
        const rated = reviews.filter(review => Number.isInteger(review.rating));
        const average = rated.length ? (rated.reduce((sum, review) => sum + review.rating, 0) / rated.length).toFixed(1) : null;
        const summary = section.querySelector('[data-review-summary]');
        if (average) summary.append(makeElement('strong', '', `${average} / 5`), document.createTextNode(`Based on ${rated.length} rated ${rated.length === 1 ? 'review' : 'reviews'} · ${reviews.length} guest stories`));
        else summary.append(makeElement('strong', '', String(reviews.length).padStart(2, '0')), document.createTextNode('guest stories, in their own words'));
        summary.hidden = false;
        section.querySelector('[data-review-empty]').hidden = true;
        section.querySelector('[data-review-tour]').hidden = false;
        const previous = section.querySelector('[data-review-prev]');
        const next = section.querySelector('[data-review-next]');
        if (previous && next) {
          const update = () => { previous.disabled = list.scrollLeft <= 2; next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 2; };
          const move = direction => list.scrollBy({ left: direction * (list.querySelector('.review-card').getBoundingClientRect().width + 18), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
          previous.addEventListener('click', () => move(-1));
          next.addEventListener('click', () => move(1));
          list.addEventListener('scroll', update, { passive: true });
          window.addEventListener('resize', update);
          update();
        }
      });
    })
    .catch(() => { /* Keep the invitation and review form available if the list cannot load. */ });
});
