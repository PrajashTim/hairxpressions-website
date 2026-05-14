/* ===================================================================
   Hair Xpressions - Site JS
   - Mobile nav toggle
   - Dropdown toggle (mobile)
   - FAQ accordion
   - Gallery filter
   - Count-up stat animation
=================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initDropdowns();
  initFAQ();
  initGalleryFilter();
  initCountUp();
  initSmoothScroll();
});

/* -------- Mobile nav -------- */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('is-open');
    links.classList.toggle('is-open');
    const expanded = toggle.classList.contains('is-open');
    toggle.setAttribute('aria-expanded', expanded);
  });

  // Close on link tap (mobile)
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 880 && !a.parentElement.classList.contains('nav-item')) {
        toggle.classList.remove('is-open');
        links.classList.remove('is-open');
      }
    });
  });
}

/* -------- Dropdowns (mobile click to expand) -------- */
function initDropdowns() {
  document.querySelectorAll('.nav-item > a.has-drop').forEach(a => {
    a.addEventListener('click', (e) => {
      if (window.innerWidth <= 880) {
        e.preventDefault();
        a.parentElement.classList.toggle('is-open');
      }
    });
  });
}

/* -------- FAQ accordion -------- */
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      item.classList.toggle('is-open');
    });
  });
}

/* -------- Gallery filter -------- */
function initGalleryFilter() {
  const tabs = document.querySelectorAll('.filter-tab');
  const items = document.querySelectorAll('.gallery-grid .gallery-item');
  if (!tabs.length || !items.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const filter = tab.dataset.filter;
      items.forEach(item => {
        const cats = (item.dataset.cat || '').split(' ');
        if (filter === 'all' || cats.includes(filter)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/* -------- Count-up numbers on view -------- */
function initCountUp() {
  const els = document.querySelectorAll('[data-countup]');
  if (!els.length) return;

  const animate = (el) => {
    const target = parseInt(el.dataset.countup, 10);
    const duration = 1600;
    const start = performance.now();
    const suffix = el.dataset.suffix || '';
    const startVal = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.floor(startVal + (target - startVal) * eased);
      el.textContent = val.toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString() + suffix;
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  els.forEach(el => io.observe(el));
}

/* -------- Smooth scroll for in-page anchors -------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });
}
