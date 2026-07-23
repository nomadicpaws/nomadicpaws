(async function loadSharedFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) return;

  try {
    const response = await fetch('/includes/footer.html');
    if (!response.ok) {
      throw new Error(`Footer request failed with status ${response.status}`);
    }

    mount.outerHTML = await response.text();
  } catch (error) {
    console.error('Could not load the shared footer:', error);
  }
})();
