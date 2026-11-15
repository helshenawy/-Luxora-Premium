/*!
 * LUXORA Cart Controller — Zid / Vitrin
 *
 * Handles: add, update, remove, render (mini-cart + cart page).
 *
 * Uses Zid's official Vitrin SDK (`window.zid.cart`).
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let cartState = { items: [], count: 0, total: '' };
  const productImageCache = new Map();

  // ── DOM references ─────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  // The SDK is injected by `{% vitrin_body %}` and may finish loading after
  // this bundle. Wait briefly instead of falling back to obsolete HTTP routes.
  async function getZidCart() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (window.zid?.cart) return window.zid.cart;
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
    throw new Error('Zid cart SDK is unavailable');
  }

  // ── Normalise API response ─────────────────────────────────────────────────
  // Accepts both { cart: {...} } and flat { items, count, total } shapes.
  function normalise(data) {
    if (!data) return { items: [], count: 0, total: '' };
    const c = data.cart || data;
    const items = Array.isArray(c.items) ? c.items : (Array.isArray(c.products) ? c.products : []);
    const totals = Array.isArray(c.totals) ? c.totals : [];
    const totalValue = c.formatted_total || c.total_string || c.total || totals.at(-1) || '';
    const total = typeof totalValue === 'object'
      ? (totalValue.value_string || totalValue.formatted_value || totalValue.value || '')
      : totalValue;
    return {
      items,
      count: c.count ?? c.items_count ?? c.products_count ?? items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
      total,
    };
  }

  // ── API calls ──────────────────────────────────────────────────────────────
  async function fetchCart() {
    try {
      const cart = await getZidCart();
      cartState = normalise(await cart.get());
      await hydrateCartImages(cartState.items);
      renderMiniCart();
      updateBadges();
    } catch (_) {
      // Server renders initial cart state; silent failure on fetch is OK.
    }
  }

  async function addItem(productId, quantity, formId = null) {
    setAddBtnLoading(true);
    try {
      const cart = await getZidCart();
      const payload = formId
        ? { form_id: formId }
        : {
            product_id: String(productId),
            quantity: Math.max(1, parseInt(quantity, 10) || 1),
          };
      await cart.addProduct(payload);
      cartState = normalise(await cart.get());
      await hydrateCartImages(cartState.items);
      renderMiniCart();
      updateBadges();
      openMiniCart();
      showToast(t('تمت الإضافة إلى السلة', 'Added to cart'));
    } catch (_) {
      showToast(t('تعذّر الإضافة، حاولي مرة أخرى.', 'Could not add item. Please try again.'), 'error');
    } finally {
      setAddBtnLoading(false);
    }
  }

  async function updateItem(itemId, quantity) {
    try {
      const cart = await getZidCart();
      await cart.updateProduct({ product_id: String(itemId), quantity: parseInt(quantity, 10) });
      cartState = normalise(await cart.get());
      await hydrateCartImages(cartState.items);
      renderMiniCart();
      updateBadges();
    } catch (_) {
      showToast(t('تعذّر تحديث الكمية.', 'Could not update quantity.'), 'error');
    }
  }

  async function removeItem(itemId) {
    try {
      const cart = await getZidCart();
      await cart.removeProduct({ product_id: String(itemId) });
      cartState = normalise(await cart.get());
      await hydrateCartImages(cartState.items);
      renderMiniCart();
      updateBadges();
    } catch (_) {
      showToast(t('تعذّر الحذف.', 'Could not remove item.'), 'error');
    }
  }

  async function applyCoupon(code) {
    try {
      const cart = await getZidCart();
      await cart.applyCoupon({ coupon_code: code });
      cartState = normalise(await cart.get());
      await hydrateCartImages(cartState.items);
      renderMiniCart();
      updateBadges();
      showToast(t('تم تطبيق الكود بنجاح!', 'Promo code applied!'));
    } catch (_) {
      showToast(t('الكود غير صالح أو منتهي الصلاحية.', 'Invalid or expired promo code.'), 'error');
    }
  }

  // ── Render mini cart ───────────────────────────────────────────────────────
  function renderMiniCart() {
    const body  = $('mini-cart-body');
    const total = $('mini-cart-total');
    if (!body) return;

    if (!cartState.items.length) {
      body.innerHTML = `
        <div class="mini-cart__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1" aria-hidden="true">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
          </svg>
          <p>${t('سلتك فارغة', 'Your cart is empty')}</p>
        </div>`;
      if (total) total.textContent = '';
      return;
    }

    body.innerHTML = cartState.items.map((item) => {
      const image = itemImage(item);
      return `
      <div class="mini-cart-item" data-item-id="${x(item.id)}">
        <a href="${x(item.url || '#')}" tabindex="-1" aria-hidden="true">
          ${image
            ? `<img src="${x(image)}" alt="${x(item.name || '')}" loading="lazy" class="mini-cart-item__img" />`
            : `<span class="mini-cart-item__img mini-cart-item__img--placeholder" aria-hidden="true"></span>`}
        </a>
        <div class="mini-cart-item__info">
          <a href="${x(item.url || '#')}" class="mini-cart-item__name">${x(item.name || '')}</a>
          ${item.variant ? `<span class="mini-cart-item__variant">${x(item.variant)}</span>` : ''}
          <div class="mini-cart-item__row">
            <div class="quantity-control quantity-control--xs">
              <button class="quantity-control__btn" data-action="decrease" data-item="${x(item.id)}"
                aria-label="${t('تقليل', 'Decrease')}">−</button>
              <span class="quantity-control__value">${item.quantity || 1}</span>
              <button class="quantity-control__btn" data-action="increase" data-item="${x(item.id)}"
                aria-label="${t('زيادة', 'Increase')}">+</button>
            </div>
            <span class="mini-cart-item__price">${x(item.price || '')}</span>
            <button class="mini-cart-item__remove" data-item="${x(item.id)}"
              aria-label="${t('حذف', 'Remove')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');

    if (total) total.textContent = cartState.total;
  }

  // ── Update count badges ────────────────────────────────────────────────────
  function updateBadges() {
    const n = cartState.count || 0;
    const mc = $('mini-cart-count');
    const hc = $('cart-count');
    if (mc) mc.textContent = n;
    if (hc) {
      hc.textContent = n;
      hc.style.display = n > 0 ? 'flex' : 'none';
    }
  }

  // ── Mini cart open / close ─────────────────────────────────────────────────
  function openMiniCart() {
    $('mini-cart')?.removeAttribute('hidden');
    $('mini-cart')?.classList.add('is-open');
    $('mini-cart-overlay')?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  // ── Loading state on product-page button ──────────────────────────────────
  function setAddBtnLoading(on) {
    const btn = $('add-to-cart');
    if (!btn) return;
    btn.disabled = on;
    if (on) {
      btn.dataset.txt = btn.textContent;
      btn.textContent = t('جارٍ الإضافة…', 'Adding…');
    } else {
      btn.textContent = btn.dataset.txt || t('أضيفي للسلة', 'Add to Cart');
    }
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    document.querySelector('.luxora-toast')?.remove();
    const el = document.createElement('div');
    el.className = `luxora-toast luxora-toast--${type}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-visible')));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 350);
    }, 3000);
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  const isAr = () => document.documentElement.lang === 'ar';
  const t = (ar, en) => isAr() ? ar : en;
  const x = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const imageUrl = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value !== 'object') return '';
    return value.url || value.full_size || value.large || value.medium || value.small ||
      value.thumbnail || value.original || imageUrl(value.image) || '';
  };
  const itemImage = (item) => imageUrl(
    item?._luxoraImage || item?.image || item?.image_url || item?.product_image || item?.thumbnail ||
    item?.main_image || item?.images?.[0] ||
    item?.product?.main_image || item?.product?.images?.[0],
  );
  async function hydrateCartImages(items) {
    if (!window.zid?.products?.get) return;
    await Promise.all(items.map(async (item) => {
      if (itemImage(item)) return;
      const productId = item?.product_id || item?.product?.id;
      if (!productId) return;
      if (productImageCache.has(productId)) {
        item._luxoraImage = productImageCache.get(productId);
        return;
      }
      try {
        const response = await window.zid.products.get(productId);
        const product = response?.product || response?.data || response;
        const image = imageUrl(
          product?.main_image || product?.images?.[0] ||
          product?.selected_product?.media?.[0] || product?.media?.[0],
        );
        productImageCache.set(productId, image);
        item._luxoraImage = image;
      } catch (_) {
        productImageCache.set(productId, '');
      }
    }));
    renderCartPageImages(items);
  }
  function renderCartPageImages(items) {
    document.querySelectorAll('.cart-item[data-item-id]').forEach((row) => {
      const item = items.find((entry) => String(entry.id) === String(row.dataset.itemId));
      const image = itemImage(item);
      const current = row.querySelector('[data-cart-item-image]');
      if (!image || !current) return;
      if (current.tagName === 'IMG') {
        current.src = image;
        return;
      }
      const img = document.createElement('img');
      img.src = image;
      img.alt = current.dataset.itemName || item?.name || '';
      img.loading = 'lazy';
      img.className = 'cart-item__img';
      img.setAttribute('data-cart-item-image', '');
      current.replaceWith(img);
    });
  }

  // ── Delegated click handler ────────────────────────────────────────────────
  function handleClick(e) {
    // Product page "Add to Cart"
    const addToCartBtn = e.target.closest('.product-add-to-cart');
    if (addToCartBtn && !addToCartBtn.disabled) {
      e.preventDefault();
      const id  = addToCartBtn.dataset.productId;
      const qty = parseInt($('product-quantity')?.value || '1', 10);
      const formId = addToCartBtn.dataset.useForm === 'true' && document.getElementById('product-form')
        ? 'product-form'
        : null;
      if (id) addItem(id, qty, formId);
      return;
    }

    // Quick View "Add to Cart"
    const qvAdd = e.target.closest('#quick-view-add');
    if (qvAdd) {
      const id  = qvAdd.dataset.productId;
      const qty = parseInt(document.querySelector('.quick-view-modal .quantity-control__input')?.value || '1', 10);
      if (id) addItem(id, qty, null);
      return;
    }

    // Product card "+cart" button
    const cardBtn = e.target.closest('.product-card__add-btn');
    if (cardBtn) {
      e.preventDefault();
      const id = cardBtn.dataset.productId || cardBtn.closest('[data-product-id]')?.dataset.productId;
      if (id) addItem(id, 1, null);
      return;
    }

    // Mini cart: quantity
    const mcQtyBtn = e.target.closest('.mini-cart-item .quantity-control__btn');
    if (mcQtyBtn) {
      const item   = mcQtyBtn.closest('.mini-cart-item');
      const itemId = mcQtyBtn.dataset.item || item?.dataset.itemId;
      const valEl  = item?.querySelector('.quantity-control__value');
      if (!itemId) return;
      let qty = parseInt(valEl?.textContent || '1', 10);
      qty = mcQtyBtn.dataset.action === 'increase' ? qty + 1 : Math.max(1, qty - 1);
      if (valEl) valEl.textContent = qty;
      updateItem(itemId, qty);
      return;
    }

    // Mini cart: remove
    const mcRemove = e.target.closest('.mini-cart-item__remove');
    if (mcRemove) {
      const itemId = mcRemove.dataset.item || mcRemove.closest('.mini-cart-item')?.dataset.itemId;
      if (itemId) removeItem(itemId);
      return;
    }

    // Cart page: quantity
    const cpQtyBtn = e.target.closest('.cart-item .quantity-control__btn');
    if (cpQtyBtn) {
      const item   = cpQtyBtn.closest('.cart-item');
      const itemId = cpQtyBtn.dataset.item || item?.dataset.itemId;
      const input  = item?.querySelector('.quantity-control__input');
      if (!itemId) return;
      let qty = parseInt(input?.value || '1', 10);
      qty = cpQtyBtn.dataset.action === 'increase' ? qty + 1 : Math.max(1, qty - 1);
      if (input) input.value = qty;
      updateItem(itemId, qty);
      return;
    }

    // Cart page: remove
    const cpRemove = e.target.closest('.cart-item .cart-item__remove');
    if (cpRemove) {
      const itemId = cpRemove.dataset.item || cpRemove.closest('.cart-item')?.dataset.itemId;
      if (itemId) {
        cpRemove.closest('.cart-item')?.remove();
        removeItem(itemId);
      }
      return;
    }
  }

  // ── Promo code ─────────────────────────────────────────────────────────────
  function initPromo() {
    const btn   = document.querySelector('.cart-promo__btn');
    const input = $('promo-input');
    if (!btn || !input) return;
    btn.addEventListener('click', async () => {
      const code = input.value.trim();
      if (!code) return;
      btn.disabled = true;
      await applyCoupon(code);
      btn.disabled = false;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener('click', handleClick);
  initPromo();
  fetchCart();
})();
