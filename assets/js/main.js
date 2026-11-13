import EmblaCarousel from 'embla-carousel';
import EmblaAutoplay from 'embla-carousel-autoplay';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

(function () {
  'use strict';

  // ── Header scroll state ──
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Search toggle ──
  const searchToggle = document.getElementById('search-toggle');
  const searchClose = document.getElementById('search-close');
  const headerSearch = document.getElementById('header-search');
  if (searchToggle && headerSearch) {
    searchToggle.addEventListener('click', () => {
      headerSearch.hidden = !headerSearch.hidden;
      if (!headerSearch.hidden) headerSearch.querySelector('input')?.focus();
    });
    searchClose?.addEventListener('click', () => { headerSearch.hidden = true; });
  }

  // ── Mobile menu ──
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileOverlay = document.getElementById('mobile-nav-overlay');
  const mobileClose = document.getElementById('mobile-nav-close');

  function openMobileNav() {
    mobileNav?.removeAttribute('hidden');
    mobileNav?.classList.add('is-open');
    mobileOverlay?.classList.add('is-open');
    mobileBtn?.classList.add('is-open');
    mobileBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    mobileNav?.classList.remove('is-open');
    mobileOverlay?.classList.remove('is-open');
    mobileBtn?.classList.remove('is-open');
    mobileBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => mobileNav?.setAttribute('hidden', ''), 350);
  }
  mobileBtn?.addEventListener('click', openMobileNav);
  mobileClose?.addEventListener('click', closeMobileNav);
  mobileOverlay?.addEventListener('click', closeMobileNav);

  // ── Mini cart drawer ──
  const cartTrigger = document.getElementById('cart-trigger');
  const miniCart = document.getElementById('mini-cart');
  const miniCartOverlay = document.getElementById('mini-cart-overlay');
  const miniCartClose = document.getElementById('mini-cart-close');

  function openMiniCart() {
    miniCart?.removeAttribute('hidden');
    miniCart?.classList.add('is-open');
    miniCartOverlay?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeMiniCart() {
    miniCart?.classList.remove('is-open');
    miniCartOverlay?.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => miniCart?.setAttribute('hidden', ''), 350);
  }
  cartTrigger?.addEventListener('click', openMiniCart);
  miniCartClose?.addEventListener('click', closeMiniCart);
  miniCartOverlay?.addEventListener('click', closeMiniCart);

  // ── Escape key closes drawers ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMobileNav(); closeMiniCart(); }
  });

  // ── Embla Carousel ──
  document.querySelectorAll('#luxora-carousel').forEach((el) => {
    const autoplay = el.dataset.autoplay === 'true';
    const delay = parseInt(el.dataset.delay) || 5000;
    const plugins = autoplay ? [EmblaAutoplay({ delay, stopOnInteraction: false })] : [];
    const embla = EmblaCarousel(el, { loop: true, direction: document.dir === 'rtl' ? 'rtl' : 'ltr' }, plugins);
    const prev = el.querySelector('.embla__prev');
    const next = el.querySelector('.embla__next');
    const dotsEl = el.querySelector('.embla__dots');
    prev?.addEventListener('click', () => embla.scrollPrev());
    next?.addEventListener('click', () => embla.scrollNext());
    if (dotsEl) {
      embla.on('init', buildDots);
      embla.on('select', updateDots);
      function buildDots() {
        dotsEl.innerHTML = embla.scrollSnapList().map((_, i) =>
          `<button class="embla__dot ${i === 0 ? 'is-active' : ''}" aria-label="Slide ${i + 1}" data-index="${i}"></button>`
        ).join('');
        dotsEl.querySelectorAll('.embla__dot').forEach(d =>
          d.addEventListener('click', () => embla.scrollTo(+d.dataset.index))
        );
      }
      function updateDots() {
        dotsEl.querySelectorAll('.embla__dot').forEach((d, i) =>
          d.classList.toggle('is-active', i === embla.selectedScrollSnap())
        );
      }
      buildDots();
    }
  });

  // ── Product gallery thumbs ──
  const galleryThumbs = document.querySelectorAll('.product-gallery__thumb');
  const gallerySlides = document.querySelectorAll('.product-gallery__slide');
  galleryThumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const idx = +thumb.dataset.index;
      galleryThumbs.forEach(t => t.classList.remove('is-active'));
      gallerySlides.forEach(s => s.classList.remove('is-active'));
      thumb.classList.add('is-active');
      gallerySlides[idx]?.classList.add('is-active');
    });
  });

  // ── PhotoSwipe gallery ──
  ['#luxora-product-gallery', '#luxora-gallery'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    const lb = new PhotoSwipeLightbox({ gallery: sel, children: 'a', pswpModule: () => import('photoswipe') });
    lb.init();
  });

  // ── Countdown timer ──
  const countdownEl = document.getElementById('luxora-countdown');
  if (countdownEl) {
    const endDate = new Date(countdownEl.dataset.end).getTime();
    function tick() {
      const now = Date.now();
      const diff = Math.max(0, endDate - now);
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const pad = (n) => String(n).padStart(2, '0');
      countdownEl.querySelector('[data-unit="days"]').textContent = pad(days);
      countdownEl.querySelector('[data-unit="hours"]').textContent = pad(hours);
      countdownEl.querySelector('[data-unit="minutes"]').textContent = pad(minutes);
      countdownEl.querySelector('[data-unit="seconds"]').textContent = pad(seconds);
      if (diff > 0) requestAnimationFrame(tick);
    }
    tick();
  }

  // ── Variant selection ──
  document.querySelectorAll('.variant-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.variant-group__options');
      group?.querySelectorAll('.variant-option').forEach(b => {
        b.classList.remove('is-selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-selected');
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  // ── Quantity controls (product page) ──
  document.querySelectorAll('.quantity-control').forEach((ctrl) => {
    const input = ctrl.querySelector('.quantity-control__input');
    ctrl.querySelectorAll('.quantity-control__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!input) return;
        let val = parseInt(input.value) || 1;
        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 999;
        if (btn.dataset.action === 'increase') val = Math.min(val + 1, max);
        if (btn.dataset.action === 'decrease') val = Math.max(val - 1, min);
        input.value = val;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  });

  // ── Video section ──
  document.querySelectorAll('.video-wrapper[data-youtube-id]').forEach((wrapper) => {
    wrapper.querySelector('.video-wrapper__play')?.addEventListener('click', () => {
      wrapper.querySelector('.video-wrapper__thumbnail')?.remove();
      wrapper.querySelector('.video-wrapper__play')?.remove();
      wrapper.querySelector('.video-wrapper__embed')?.removeAttribute('hidden');
    });
  });

  // ── no-js removal ──
  document.documentElement.classList.remove('no-js');
})();
