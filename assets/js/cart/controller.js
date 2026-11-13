(function () {
  'use strict';

  const ZID_CART_API = '/api/cart';

  async function apiRequest(method, url, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`Cart API error: ${res.status}`);
    return res.json();
  }

  function updateCartUI(cart) {
    // Count badge
    const count = cart.count ?? cart.items_count ?? 0;
    document.querySelectorAll('#cart-count, .mini-cart__count, #mini-cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? '' : 'none';
    });
    // Total
    document.querySelectorAll('#mini-cart-total').forEach(el => {
      el.textContent = cart.total ?? cart.formatted_total ?? '';
    });
    // Dispatch event for external listeners
    window.dispatchEvent(new CustomEvent('luxora:cart:updated', { detail: cart }));
  }

  async function addToCart(productId, quantity = 1, variantId = null) {
    const payload = { product_id: productId, quantity };
    if (variantId) payload.variant_id = variantId;
    const data = await apiRequest('POST', `${ZID_CART_API}/add`, payload);
    updateCartUI(data.cart ?? data);
    // Open mini cart
    const miniCart = document.getElementById('mini-cart');
    const overlay = document.getElementById('mini-cart-overlay');
    if (miniCart) {
      miniCart.removeAttribute('hidden');
      miniCart.classList.add('is-open');
      overlay?.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    return data;
  }

  async function removeFromCart(itemId) {
    const data = await apiRequest('DELETE', `${ZID_CART_API}/remove/${itemId}`);
    updateCartUI(data.cart ?? data);
    document.querySelectorAll(`[data-item-id="${itemId}"]`).forEach(el => el.remove());
    return data;
  }

  async function updateQuantity(itemId, quantity) {
    if (quantity < 1) return removeFromCart(itemId);
    const data = await apiRequest('PUT', `${ZID_CART_API}/update`, { item_id: itemId, quantity });
    updateCartUI(data.cart ?? data);
    return data;
  }

  // ── Add to cart buttons (product card and product page) ──
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-product-id].product-card__add-btn, #add-to-cart');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    const productId = btn.dataset.productId;
    const selectedVariant = document.querySelector('.variant-option.is-selected');
    const variantId = selectedVariant?.dataset.variantId ?? null;
    const quantityInput = document.getElementById('product-quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    btn.disabled = true;
    btn.classList.add('is-loading');
    try {
      await addToCart(productId, quantity, variantId);
    } catch (err) {
      console.error('Add to cart failed:', err);
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-loading');
    }
  });

  // ── Remove item buttons ──
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.cart-item__remove, .mini-cart-item__remove');
    if (!btn) return;
    e.preventDefault();
    const itemId = btn.dataset.item;
    if (!itemId) return;
    btn.disabled = true;
    try { await removeFromCart(itemId); } catch (err) { console.error(err); }
  });

  // ── Quantity change in cart/mini-cart ──
  document.addEventListener('change', async (e) => {
    const input = e.target.closest('.quantity-control__input[data-item]');
    if (!input) return;
    const itemId = input.dataset.item;
    const qty = parseInt(input.value) || 1;
    try { await updateQuantity(itemId, qty); } catch (err) { console.error(err); }
  });

  // ── Mini cart quantity buttons ──
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.quantity-control__btn[data-item]');
    if (!btn) return;
    const itemId = btn.dataset.item;
    const ctrl = btn.closest('.quantity-control');
    const valueEl = ctrl?.querySelector('.quantity-control__value');
    let qty = parseInt(valueEl?.textContent || '1');
    if (btn.dataset.action === 'increase') qty++;
    if (btn.dataset.action === 'decrease') qty--;
    if (valueEl) valueEl.textContent = Math.max(1, qty);
    try { await updateQuantity(itemId, Math.max(1, qty)); } catch (err) { console.error(err); }
  });

  // Expose to global for Zid event integration
  window.LuxoraCart = { addToCart, removeFromCart, updateQuantity };
})();
