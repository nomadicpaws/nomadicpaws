(function () {
  function openLinkedCardDescription() {
    if (!window.location.hash) return;

    var targetId;
    try {
      targetId = decodeURIComponent(window.location.hash.slice(1));
    } catch (error) {
      targetId = window.location.hash.slice(1);
    }

    var card = document.getElementById(targetId);
    if (!card) return;

    var description = card.querySelector('details[data-card-description]') ||
      card.querySelector('details.card-details, details.np-product-detail');
    if (!description) return;

    description.open = true;
    window.requestAnimationFrame(function () {
      card.scrollIntoView({ block: 'start' });
    });
  }

  window.addEventListener('hashchange', openLinkedCardDescription);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openLinkedCardDescription);
  } else {
    openLinkedCardDescription();
  }
})();
