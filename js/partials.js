/* ===================================================================
   Shared partials - Navbar, Trust Bar, Footer
   Injected on every page so updates only happen in one place.
=================================================================== */

(function () {
  const path = window.location.pathname.replace(/\\/g, '/');
  const inServices = /\/services\//.test(path);
  const P = inServices ? '../' : '';
  const BOOK_URL = 'https://book.squareup.com/appointments/ckyv1ce3u3hpmb/location/LSXPGB4JF4Y6N/services';

  const trustBarHTML = `
    <div class="trust-bar">
      <div class="container">
        <span><span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span> Rated on Yelp &amp; Google</span>
        <span class="divider">|</span>
        <span>Est. <strong>1984</strong> &middot; 40+ Years on Braddock Rd</span>
        <span class="divider">|</span>
        <a href="tel:7039783406">Call 703-978-3406</a>
      </div>
    </div>
  `;

  const navbarHTML = `
    <nav class="navbar" aria-label="Main">
      <div class="container navbar-inner">
        <a href="${P}index.html" class="brand">
          <span class="brand-name">Hair Xpressions</span>
          <span class="brand-tag">Fairfax &middot; Est. 1984</span>
        </a>
        <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <ul class="nav-links">
          <li><a href="${P}index.html">Home</a></li>
          <li class="nav-item">
            <button type="button" class="nav-drop-toggle has-drop" aria-expanded="false" aria-haspopup="true" aria-controls="services-dropdown">Services</button>
            <div class="dropdown" id="services-dropdown">
              <a href="${P}services/hair-color.html">Hair &amp; Color</a>
              <a href="${P}services/keratin.html">Keratin &amp; Treatments</a>
              <a href="${P}services/waxing-threading.html">Waxing &amp; Threading</a>
              <a href="${P}services/brow-lash.html">Brow &amp; Lash</a>
              <a href="${P}services/facials.html">Facials</a>
              <a href="${P}services/bridal.html">Bridal &amp; Events</a>
            </div>
          </li>
          <li><a href="${P}team.html">Our Team</a></li>
          <li><a href="${P}gallery.html">Gallery</a></li>
          <li><a href="${P}about.html">About</a></li>
          <li><a href="${P}contact.html">Contact</a></li>
        </ul>
        <div class="nav-cta">
          <a class="nav-phone" href="tel:7039783406">703-978-3406</a>
          <a class="btn btn-primary btn-sm" href="${BOOK_URL}">Book Now</a>
        </div>
      </div>
    </nav>
  `;

  const footerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="${P}index.html" class="brand">
              <span class="brand-name">Hair Xpressions</span>
              <span class="brand-tag">Fairfax &middot; Est. 1984</span>
            </a>
            <p>Fairfax's full-service neighborhood beauty destination. Expert stylists, every service, forty years, and we still remember your name.</p>
            <div class="footer-social mt-3">
              <a href="https://www.facebook.com/hairxpressionsva/" aria-label="Facebook" target="_blank" rel="noopener">FB</a>
              <a href="https://www.yelp.com/biz/hair-xpressions-fairfax" aria-label="Yelp" target="_blank" rel="noopener">YP</a>
              <a href="https://www.google.com/search?ludocid=11768577886764852162" aria-label="Google" target="_blank" rel="noopener">GG</a>
            </div>
          </div>
          <div>
            <h4>Services</h4>
            <ul class="footer-list">
              <li><a href="${P}services/hair-color.html">Hair &amp; Color</a></li>
              <li><a href="${P}services/keratin.html">Keratin &amp; Treatments</a></li>
              <li><a href="${P}services/waxing-threading.html">Waxing &amp; Threading</a></li>
              <li><a href="${P}services/brow-lash.html">Brow &amp; Lash</a></li>
              <li><a href="${P}services/facials.html">Facials</a></li>
              <li><a href="${P}services/bridal.html">Bridal &amp; Events</a></li>
            </ul>
          </div>
          <div>
            <h4>Visit</h4>
            <ul class="footer-list">
              <li>9549 Braddock Rd</li>
              <li>Fairfax, VA 22032</li>
              <li><a href="tel:7039783406">703-978-3406</a></li>
              <li><a href="tel:7036067520">703-606-7520</a> <span style="font-size:0.78rem;opacity:0.6">(text/call)</span></li>
              <li><a href="mailto:info@hairxpressionsva.com">info@hairxpressionsva.com</a></li>
            </ul>
            <h4 class="mt-4">Hours</h4>
            <div class="footer-hours">
              <div><span>Mon - Fri</span><strong>10am - 7pm</strong></div>
              <div><span>Saturday</span><strong>9am - 6pm</strong></div>
              <div><span>Sunday</span><strong>Closed</strong></div>
            </div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul class="footer-list">
              <li><a href="${P}team.html">Our Team</a></li>
              <li><a href="${P}gallery.html">Gallery</a></li>
              <li><a href="${P}about.html">Our Story</a></li>
              <li><a href="${P}contact.html#gift">Gift Cards</a></li>
              <li><a href="${BOOK_URL}">Book Appointment</a></li>
            </ul>
          </div>
        </div>
        <p class="footer-geo">Proudly serving Fairfax, Burke, Springfield, Annandale, and the Braddock Road corridor since 1984.</p>
        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} Hair Xpressions. All rights reserved.</span>
          <span>Site by Bad Mash Creatives &middot; A prototype rebuild</span>
        </div>
      </div>
    </footer>
  `;

  document.querySelectorAll('[data-partial="trust-bar"]').forEach((el) => {
    el.outerHTML = trustBarHTML;
  });
  document.querySelectorAll('[data-partial="navbar"]').forEach((el) => {
    el.outerHTML = navbarHTML;
  });
  document.querySelectorAll('[data-partial="footer"]').forEach((el) => {
    el.outerHTML = footerHTML;
  });

  const here = (path.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
    if (href === here && here !== 'index.html') a.style.color = 'var(--gold-dark)';
  });

  if (
    here.startsWith('hair-') ||
    here.startsWith('waxing-') ||
    here.startsWith('brow-') ||
    here === 'facials.html' ||
    here === 'keratin.html' ||
    here === 'bridal.html'
  ) {
    const services = document.querySelector('.nav-links .has-drop');
    if (services) services.style.color = 'var(--gold-dark)';
  }
})();
