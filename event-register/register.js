(function () {
  'use strict';

  const state = { token: sessionStorage.getItem('np-event-token') || '', products: [], cart: new Map() };
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const loginForm = document.getElementById('loginForm');
  const loginStatus = document.getElementById('loginStatus');
  const loginButton = document.getElementById('loginButton');
  const accessCode = document.getElementById('accessCode');
  const productGrid = document.getElementById('productGrid');
  const connectionState = document.getElementById('connectionState');
  const cartItems = document.getElementById('cartItems');
  const cartSubtotal = document.getElementById('cartSubtotal');

  function money(cents) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (options.body) headers.set('Content-Type', 'application/json');
    if (state.token) headers.set('Authorization', `Bearer ${state.token}`);
    const response = await fetch(path, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'The register could not complete that request.');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function lockRegister(message = '') {
    state.token = '';
    state.products = [];
    state.cart.clear();
    sessionStorage.removeItem('np-event-token');
    registerPanel.hidden = true;
    loginPanel.hidden = false;
    loginStatus.textContent = message;
    accessCode.value = '';
  }

  function renderProducts() {
    productGrid.replaceChildren();
    for (const product of state.products) {
      const card = document.createElement('article');
      card.className = 'product-card';
      const image = document.createElement('img');
      image.src = product.image;
      image.alt = '';
      image.width = 224;
      image.height = 224;
      const info = document.createElement('div');
      info.className = 'product-info';
      const title = document.createElement('h2');
      title.textContent = product.name;
      const meta = document.createElement('div');
      meta.className = 'product-meta';
      const price = document.createElement('span');
      price.textContent = money(product.unitPriceCents);
      const stock = document.createElement('span');
      stock.textContent = `${product.stock} in Test stock`;
      const add = document.createElement('button');
      add.className = 'add-button';
      add.type = 'button';
      add.textContent = product.stock > 0 ? 'Add to test cart' : 'Out of stock';
      add.disabled = product.stock < 1;
      add.addEventListener('click', () => changeQuantity(product.sku, 1));
      meta.append(price, stock);
      info.append(title, meta, add);
      card.append(image, info);
      productGrid.append(card);
    }
  }

  function changeQuantity(sku, difference) {
    const product = state.products.find(item => item.sku === sku);
    if (!product) return;
    const next = Math.max(0, Math.min(product.stock, (state.cart.get(sku) || 0) + difference));
    if (next) state.cart.set(sku, next);
    else state.cart.delete(sku);
    renderCart();
  }

  function renderCart() {
    cartItems.replaceChildren();
    let subtotal = 0;
    if (!state.cart.size) {
      const empty = document.createElement('p');
      empty.className = 'empty-cart';
      empty.textContent = 'Add a product to begin.';
      cartItems.append(empty);
    }
    for (const [sku, quantity] of state.cart) {
      const product = state.products.find(item => item.sku === sku);
      if (!product) continue;
      subtotal += product.unitPriceCents * quantity;
      const line = document.createElement('div');
      line.className = 'cart-line';
      const name = document.createElement('span');
      name.className = 'cart-line-name';
      name.textContent = product.name;
      const controls = document.createElement('div');
      controls.className = 'quantity';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.setAttribute('aria-label', `Remove one ${product.name}`);
      minus.textContent = '−';
      minus.addEventListener('click', () => changeQuantity(sku, -1));
      const count = document.createElement('strong');
      count.textContent = String(quantity);
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.setAttribute('aria-label', `Add one ${product.name}`);
      plus.textContent = '+';
      plus.disabled = quantity >= product.stock;
      plus.addEventListener('click', () => changeQuantity(sku, 1));
      controls.append(minus, count, plus);
      line.append(name, controls);
      cartItems.append(line);
    }
    cartSubtotal.textContent = money(subtotal);
  }

  async function openRegister() {
    loginPanel.hidden = true;
    registerPanel.hidden = false;
    try {
      const payload = await api('/api/event/products');
      state.products = payload.products || [];
      connectionState.classList.remove('is-error');
      connectionState.querySelector('span:last-child').textContent = 'Connected to Snipcart Test inventory';
      renderProducts();
      renderCart();
    } catch (error) {
      if (error.status === 401) return lockRegister('Your session expired. Enter the access code again.');
      connectionState.classList.add('is-error');
      connectionState.querySelector('span:last-child').textContent = error.message;
    }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginButton.disabled = true;
    loginStatus.textContent = 'Checking…';
    try {
      const payload = await api('/api/event/auth/session', {
        method: 'POST',
        body: JSON.stringify({ accessCode: accessCode.value })
      });
      state.token = payload.token;
      sessionStorage.setItem('np-event-token', state.token);
      loginStatus.textContent = '';
      accessCode.value = '';
      await openRegister();
    } catch (error) {
      loginStatus.textContent = error.message;
    } finally {
      loginButton.disabled = false;
    }
  });

  document.getElementById('toggleCode').addEventListener('click', event => {
    const showing = accessCode.type === 'text';
    accessCode.type = showing ? 'password' : 'text';
    event.currentTarget.textContent = showing ? 'Show' : 'Hide';
    event.currentTarget.setAttribute('aria-label', showing ? 'Show access code' : 'Hide access code');
  });
  document.getElementById('signOutButton').addEventListener('click', () => lockRegister());
  document.getElementById('clearCartButton').addEventListener('click', () => { state.cart.clear(); renderCart(); });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/event-register/service-worker.js').catch(() => {});
  if (state.token) openRegister();
})();
