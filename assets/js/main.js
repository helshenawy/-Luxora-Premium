import EmblaCarousel from 'embla-carousel';
import EmblaAutoplay from 'embla-carousel-autoplay';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';

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
      galleryIndex = idx;
      galleryThumbs.forEach(t => t.classList.remove('is-active'));
      gallerySlides.forEach(s => s.classList.remove('is-active'));
      thumb.classList.add('is-active');
      gallerySlides[idx]?.classList.add('is-active');
    });
  });
  const galleryCurrent = document.querySelector('[data-gallery-current]');
  let galleryIndex = 0;
  function showGallerySlide(nextIndex) {
    if (!gallerySlides.length) return;
    galleryIndex = (nextIndex + gallerySlides.length) % gallerySlides.length;
    gallerySlides.forEach((slide, index) => slide.classList.toggle('is-active', index === galleryIndex));
    galleryThumbs.forEach((thumb, index) => thumb.classList.toggle('is-active', index === galleryIndex));
    if (galleryCurrent) galleryCurrent.textContent = String(galleryIndex + 1);
  }
  document.querySelector('[data-gallery-prev]')?.addEventListener('click', () => showGallerySlide(galleryIndex - 1));
  document.querySelector('[data-gallery-next]')?.addEventListener('click', () => showGallerySlide(galleryIndex + 1));

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

  // ── Mobile filter toggle ──
  const filterToggle = document.getElementById('filter-toggle');
  const filtersPanel = document.getElementById('products-filters');
  if (filterToggle && filtersPanel) {
    filterToggle.addEventListener('click', () => {
      const isOpen = filtersPanel.classList.toggle('is-open');
      filterToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // ── Scroll reveal ──
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => revealObs.observe(el));
  } else {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible'));
  }

  // ── no-js removal ──
  document.documentElement.classList.remove('no-js');

  // ── Copyright year ──
  document.querySelectorAll('.footer-year').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ── Price range slider (noUiSlider) ──
  const priceRangeEl = document.getElementById('price-range');
  if (priceRangeEl && typeof noUiSlider !== 'undefined') {
    const min = parseInt(priceRangeEl.dataset.min, 10) || 0;
    const max = parseInt(priceRangeEl.dataset.max, 10) || 2000;
    const params = new URLSearchParams(window.location.search);
    const startMin = parseInt(params.get('price_min'), 10) || min;
    const startMax = parseInt(params.get('price_max'), 10) || max;

    noUiSlider.create(priceRangeEl, {
      start: [startMin, startMax],
      connect: true,
      range: { min, max },
      direction: document.dir === 'rtl' ? 'rtl' : 'ltr',
      tooltips: false,
    });

    const minLabel = document.getElementById('price-min');
    const maxLabel = document.getElementById('price-max');

    priceRangeEl.noUiSlider.on('update', (values) => {
      if (minLabel) minLabel.textContent = Math.round(values[0]);
      if (maxLabel) maxLabel.textContent = Math.round(values[1]);
    });

    priceRangeEl.noUiSlider.on('change', (values) => {
      const url = new URL(window.location.href);
      url.searchParams.set('price_min', Math.round(values[0]));
      url.searchParams.set('price_max', Math.round(values[1]));
      window.location.href = url.toString();
    });
  }

  // ── Clear filters ──
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    const url = new URL(window.location.href);
    ['price_min', 'price_max', 'sort', 'category'].forEach((p) => url.searchParams.delete(p));
    window.location.href = url.toString();
  });

  // ── Quick View ──
  const qvOverlay = document.getElementById('quick-view-overlay');
  const qvModal   = document.getElementById('quick-view-modal');
  const qvClose   = document.getElementById('quick-view-close');
  const qvImg     = document.getElementById('quick-view-img');
  const qvTitle   = document.getElementById('quick-view-title');
  const qvPrice   = document.getElementById('quick-view-price');
  const qvOriginal = document.getElementById('quick-view-original-price');
  const qvLink    = document.getElementById('quick-view-link');
  const qvAdd     = document.getElementById('quick-view-add');
  const qvQty     = document.getElementById('quick-view-qty');

  function openQuickView(card) {
    if (!qvModal) return;
    const img    = card.querySelector('.product-card__img')?.src || '';
    const name   = card.querySelector('.product-card__name')?.textContent?.trim() || '';
    const price  = card.querySelector('.product-card__price:not(.product-card__price--original)')?.textContent?.trim() || '';
    const original = card.querySelector('.product-card__price--original')?.textContent?.trim() || '';
    const url    = card.querySelector('.product-card__name')?.href || card.querySelector('.product-card__media-link')?.href || '#';
    const pid    = card.dataset.productId || '';
    const needsSel = card.dataset.needsSelection === 'true';

    if (qvImg)      { qvImg.src = img; qvImg.alt = name; }
    if (qvTitle)    qvTitle.textContent = name;
    if (qvPrice)    qvPrice.textContent = price;
    if (qvOriginal) {
      qvOriginal.textContent = original;
      qvOriginal.hidden = !original;
    }
    if (qvLink) qvLink.href = url;
    if (qvAdd) {
      if (needsSel) {
        qvAdd.style.display = 'none';
      } else {
        qvAdd.style.display = '';
        qvAdd.dataset.productId = pid;
      }
    }
    if (qvQty)  qvQty.value = '1';

    qvModal.removeAttribute('hidden');
    qvOverlay?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    qvClose?.focus();
  }

  function closeQuickView() {
    qvModal?.setAttribute('hidden', '');
    qvOverlay?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const qvBtn = e.target.closest('.product-card__quick-view');
    if (qvBtn) {
      e.preventDefault();
      openQuickView(qvBtn.closest('.product-card'));
      return;
    }
    if (e.target === qvOverlay || e.target.closest('#quick-view-close')) {
      closeQuickView();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qvModal && !qvModal.hidden) closeQuickView();
  });

  // Quick view quantity controls
  qvModal?.addEventListener('click', (e) => {
    const btn = e.target.closest('.quantity-control__btn');
    if (!btn || !qvQty) return;
    let val = parseInt(qvQty.value, 10) || 1;
    val = btn.dataset.action === 'increase' ? val + 1 : Math.max(1, val - 1);
    qvQty.value = val;
  });
})();
