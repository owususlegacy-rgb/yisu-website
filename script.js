/* ============================================================
   YISU standalone — hero background loader, scroll reveal,
   and active-nav-link tracking. No frameworks.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ---- switch nav to a solid background once scrolled past the hero ---- */
  const nav = document.querySelector('.nav');
  if (nav && !nav.classList.contains('nav--solid')) {
    const toggleNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 80);
    toggleNav();
    window.addEventListener('scroll', toggleNav, { passive: true });
  }

  /* ---- apply the hero background image from data-bg ---- */
  document.querySelectorAll('[data-bg]').forEach(function (el) {
    const url = el.getAttribute('data-bg');
    if (url) el.style.backgroundImage = `url('${url}')`;
  });

  /* ---- scroll reveal: fade + rise once, first time in view ---- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });

      revealEls.forEach(el => observer.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('is-in'));
    }
  }

  /* ---- highlight the current section's nav link ---- */
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(sec => navObserver.observe(sec));
  }

});

/* ============================================================
   LIGHTBOX — any <img data-lightbox="setname"> opens full size.
   Images that share a set name can be stepped through with the
   arrow buttons, arrow keys, or a swipe.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const triggers = Array.from(document.querySelectorAll('img[data-lightbox]'));
  if (!triggers.length) return;

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image viewer');
  lb.innerHTML =
    '<span class="lb-count"></span>' +
    '<button class="lb-btn lb-close" aria-label="Close">&times;</button>' +
    '<button class="lb-btn lb-prev" aria-label="Previous image">&#8249;</button>' +
    '<figure class="lb-figure"><img class="lb-img" alt=""><figcaption class="lb-caption"></figcaption></figure>' +
    '<button class="lb-btn lb-next" aria-label="Next image">&#8250;</button>';
  document.body.appendChild(lb);

  const imgEl   = lb.querySelector('.lb-img');
  const capEl   = lb.querySelector('.lb-caption');
  const countEl = lb.querySelector('.lb-count');
  const prevBtn = lb.querySelector('.lb-prev');
  const nextBtn = lb.querySelector('.lb-next');

  let set = [];
  let index = 0;
  let lastFocus = null;

  function visibleInSet(name) {
    // Skip images hidden by the gallery's category filter.
    return triggers.filter(function (t) {
      return t.dataset.lightbox === name && t.offsetParent !== null;
    });
  }

  function render() {
    const t = set[index];
    imgEl.src = t.currentSrc || t.src;
    imgEl.alt = t.alt || '';
    capEl.textContent = t.alt || '';
    countEl.textContent = set.length > 1 ? (index + 1) + ' / ' + set.length : '';
    const single = set.length < 2;
    prevBtn.style.display = single ? 'none' : '';
    nextBtn.style.display = single ? 'none' : '';
  }

  function open(t) {
    lastFocus = document.activeElement;
    set = visibleInSet(t.dataset.lightbox);
    index = Math.max(0, set.indexOf(t));
    render();
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lb-close').focus();
  }

  function close() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    imgEl.removeAttribute('src');
    if (lastFocus) lastFocus.focus();
  }

  function step(dir) {
    if (set.length < 2) return;
    index = (index + dir + set.length) % set.length;
    render();
  }

  triggers.forEach(function (t) {
    t.addEventListener('click', function () { open(t); });
    t.setAttribute('tabindex', '0');
    t.setAttribute('role', 'button');
    t.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(t); }
    });
  });

  lb.querySelector('.lb-close').addEventListener('click', close);
  prevBtn.addEventListener('click', function () { step(-1); });
  nextBtn.addEventListener('click', function () { step(1); });

  // click on the dark backdrop (not the image) closes
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb-figure')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  // swipe on touch screens
  let startX = null;
  lb.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    startX = null;
  }, { passive: true });
});