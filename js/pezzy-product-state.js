(function () {
  var PRODUCT_SELECTOR = '[data-item-id^="pezzy-"]';

  function inventoryMessage(control) {
    var container = control.closest('.np-treat-card, .np-bundle-hero');
    return container && container.querySelector('[data-inventory-message]');
  }

  function replaceWithAffiliateLink(control, state, label, ariaLabel) {
    var link = document.createElement('a');
    link.className = control.className.replace(/\bsnipcart-add-item\b/g, '').trim();
    link.href = state.affiliateUrl;
    link.target = '_blank';
    link.rel = 'noopener sponsored';
    link.textContent = label;
    link.setAttribute('aria-label', ariaLabel);
    control.replaceWith(link);
  }

  function showState(control, state) {
    var message = inventoryMessage(control);
    if (state.status === 'error') {
      showFailure(control);
      return;
    }
    if (state.status === 'in_stock') {
      control.disabled = false;
      control.removeAttribute('aria-disabled');
      control.classList.add('snipcart-add-item');
      control.dataset.itemMaxQuantity = String(state.stock);
      control.textContent = control.dataset.inventoryAction || 'Add to pack';
      if (message) message.textContent = state.stock + ' left';
      return;
    }
    if (state.status === 'affiliate' && state.affiliateUrl) {
      replaceWithAffiliateLink(
        control,
        state,
        'Shop through Pezzy',
        'Shop this product through Pezzy (affiliate link)'
      );
      if (message) message.textContent = 'Sold out here · Affiliate link';
      return;
    }
    if (state.affiliateUrl) {
      replaceWithAffiliateLink(
        control,
        state,
        'Check availability',
        'Check this product’s availability through Pezzy (affiliate link)'
      );
      if (message) message.textContent = 'Currently unavailable';
      return;
    }
    control.disabled = true;
    control.setAttribute('aria-disabled', 'true');
    control.classList.remove('snipcart-add-item');
    control.textContent = 'Check availability';
    if (message) message.textContent = 'Currently unavailable';
  }

  function showFailure(control) {
    control.disabled = true;
    control.setAttribute('aria-disabled', 'true');
    control.classList.remove('snipcart-add-item');
    control.textContent = 'Check availability';
    var message = inventoryMessage(control);
    if (message) message.textContent = 'Availability could not be confirmed. Please try again soon.';
  }

  async function loadInventory() {
    var controls = Array.from(document.querySelectorAll(PRODUCT_SELECTOR));
    if (!controls.length) return;
    try {
      var response = await fetch('/api/product-inventory', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Inventory request failed.');
      var payload = await response.json();
      var states = new Map((payload.products || []).map(function (state) { return [state.id, state]; }));
      controls.forEach(function (control) {
        var state = states.get(control.dataset.itemId);
        if (state) showState(control, state);
        else showFailure(control);
      });
    } catch (error) {
      controls.forEach(showFailure);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadInventory);
  else loadInventory();
})();
