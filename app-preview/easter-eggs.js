function NomadicNudge(options) {
  const existing = document.querySelector('.egg-backdrop');
  if (existing) existing.remove();
  const wrap = document.createElement('div');
  wrap.className = 'egg-backdrop';
  wrap.innerHTML = `<section class="egg-card" role="alertdialog" aria-modal="true"><small>${options.label || 'A GENTLE INTERRUPTION'}</small><h2>${options.title}</h2><p>${options.detail}</p><div class="egg-actions"></div></section>`;
  const actions = wrap.querySelector('.egg-actions');
  (options.actions || [{ label: 'Okay' }]).forEach((action, index) => {
    const button = document.createElement('button');
    button.textContent = action.label;
    button.classList.toggle('primary', index === 0);
    button.onclick = () => { wrap.remove(); if (action.run) action.run(); };
    actions.append(button);
  });
  wrap.onclick = event => { if (event.target === wrap) wrap.remove(); };
  document.body.append(wrap);
  const first = actions.querySelector('button');
  if (first) first.focus();
}
window.NomadicNudge = NomadicNudge;
