(() => {
  'use strict';
  const key = 'np-pack-v1';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(cart)) cart = []; } catch { cart = []; }
  let pending = null;
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  const dialog = document.createElement('dialog'); dialog.className = 'np-pack-dialog';
  dialog.innerHTML = '<div class="np-pack-heading"><div><span class="np-pack-eyebrow">A LITTLE GOOD FOR THE TRAIL</span><h2>Your Pack<span>.</span></h2></div><form method="dialog"><button aria-label="Close your pack" class="np-pack-close">✕</button></form></div><p class="np-pack-intro">Good treats. Happy trails. One very lucky companion.</p><div data-pack-lines></div><div class="np-pack-perk"><label><span>Have a Pack Perk?</span><input data-pack-code maxlength="64" autocomplete="off" placeholder="Your monthly free-shipping code"></label><small>A little thank-you for being part of the Pack.</small></div><div class="np-pack-total"><span>Product subtotal</span><strong data-pack-subtotal></strong></div><p class="np-pack-shipping">Standard US shipping <strong>$5</strong> · Free with a valid Pack Perk.<br>Applicable tax is calculated at checkout.</p><p data-pack-status role="status"></p><button type="button" data-pack-checkout>Continue to secure checkout <span aria-hidden="true">→</span></button><p class="np-pack-trust">Secure payment with Stripe · Packed with care</p>';
  document.body.append(dialog);
  const lines = dialog.querySelector('[data-pack-lines]');
  const status = dialog.querySelector('[data-pack-status]');
  const checkout = dialog.querySelector('[data-pack-checkout]');
  const perk = dialog.querySelector('[data-pack-code]');
  let products = [];
  function save() { localStorage.setItem(key, JSON.stringify(cart)); document.querySelectorAll('.np-items-count').forEach(el => { el.textContent = String(cart.reduce((n,p) => n+p.quantity,0)); }); }
  function render() {
    lines.replaceChildren(); let subtotal = 0;
    cart.forEach(item => {
      const product = products.find(p => p.sku === item.sku); if (!product) return;
      subtotal += product.unitPriceCents * item.quantity;
      const row = document.createElement('div'); row.className = 'np-pack-line';
      const image = document.createElement('img'); image.src=product.image; image.alt=''; image.width=64; image.height=72;
      const label = document.createElement('span'); label.className='np-pack-product-name'; const name=document.createElement('strong'); name.textContent=product.name; const price=document.createElement('small'); price.textContent=money(product.unitPriceCents); label.append(name,price);
      const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.max = '99'; input.value = String(item.quantity); input.setAttribute('aria-label', `Quantity of ${product.name}`);
      input.disabled = Boolean(pending);
      input.addEventListener('change', () => { const count = Number(input.value); if (!Number.isSafeInteger(count) || count < 0 || count > 99) return render(); item.quantity = count; cart = cart.filter(p => p.quantity); save(); render(); });
      row.append(image,label,input); lines.append(row);
    });
    if (!cart.length) lines.textContent = 'Your pack is empty.';
    dialog.querySelector('[data-pack-subtotal]').textContent = money(subtotal);
    checkout.disabled = !cart.length;
    perk.disabled = Boolean(pending);
  }
  document.querySelectorAll('.np-checkout').forEach(el => el.addEventListener('click', () => { render(); dialog.showModal(); }));
  document.addEventListener('click', event => {
    const button = event.target.closest('.np-add-item'); if (!button || button.disabled) return;
    if (pending) { render(); dialog.showModal(); return; }
    const product = products.find(p => p.id === button.dataset.itemId); if (!product) return;
    const item = cart.find(p => p.sku === product.sku);
    if (item) item.quantity = Math.min(99, product.stock, item.quantity+1); else cart.push({ sku: product.sku, quantity: 1 });
    save(); render(); dialog.showModal();
  });
  checkout.addEventListener('click', async () => {
    checkout.disabled = true; status.textContent = 'Preparing your pack…';
    try {
      if (!pending) { pending = { requestId: crypto.randomUUID(), items: cart.map(p => ({...p})), channel: 'web', perkCode: perk.value.trim() }; localStorage.setItem('np-checkout-request', JSON.stringify(pending)); }
      const response = await fetch('/api/commerce/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending) });
      const data = await response.json();
      if (!response.ok) { if ([400,401,403,429].includes(response.status) || data.code === 'out_of_stock') { pending = null; localStorage.removeItem('np-checkout-request'); } throw new Error(data.error); }
      localStorage.setItem('np-pending-order', JSON.stringify(data));
      location.assign(data.checkoutUrl);
    } catch (error) { status.textContent = error.message || 'Checkout could not connect. Retry this order.'; render(); }
  });
  try { pending = JSON.parse(localStorage.getItem('np-checkout-request') || 'null'); } catch { pending = null; }
  fetch('/api/commerce/products').then(async response => {
    const data = await response.json(); if (!response.ok) throw new Error(data.error); products = data.products;
    if (data.mode === "test") { const banner = document.createElement("p"); banner.textContent = "SANDBOX PREVIEW — Test orders only. No real payment will be taken."; banner.setAttribute("role","status"); banner.style.cssText="position:sticky;top:0;z-index:10000;padding:12px;text-align:center;background:#fff1b8;color:#3f352a;font-weight:700"; document.body.prepend(banner); dialog.querySelector(".np-pack-trust").textContent="Stripe sandbox · Test orders only"; }
    document.querySelectorAll('[data-item-id]').forEach(button => {
      const product = products.find(p => p.id === button.dataset.itemId); if (!product) return;
      const container = button.closest('.np-treat-card, .np-bundle-hero'); const message = container?.querySelector('[data-inventory-message]');
      if (product.stock > 0 && product.active) { button.disabled = false; button.removeAttribute('aria-disabled'); button.classList.add('np-add-item'); if(message) message.textContent = `${product.stock} left`; }
      else if (product.affiliateUrl) {
        const link = document.createElement('a'); link.className = button.className.replace('np-add-item',''); link.href = product.affiliateUrl; link.target='_blank'; link.rel='noopener sponsored'; link.textContent = product.active ? 'Shop through Pezzy' : 'Check at Pezzy ↗'; button.replaceWith(link);
        if(message) message.textContent = 'Affiliate link · Availability may vary';
      } else { button.disabled=true; button.classList.remove('np-add-item'); if(message) message.textContent = 'Currently unavailable'; }
    }); save();
  }).catch(() => { document.querySelectorAll('.np-add-item').forEach(b => { b.disabled=true; }); status.textContent = 'Availability could not be confirmed. Please try again soon.'; });
  save();
})();
