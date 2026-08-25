(() => {
  const dialog = document.querySelector('#noteDialog'), quote = document.querySelector('#selectedQuote'), input = document.querySelector('#noteText');
  const notes = JSON.parse(localStorage.getItem('nomadic-paws-mom-notes') || '[]');
  let anchor = null;
  const toast = message => { const element = document.querySelector('#toast'); element.textContent = message; element.hidden = false; setTimeout(() => { element.hidden = true; }, 3200); };
  document.querySelectorAll('#article [data-id]').forEach(block => {
    if (notes.some(note => note.anchor === block.dataset.id)) block.dataset.noted = 'true';
    block.onclick = () => { const selection = window.getSelection().toString().trim(); anchor = block; quote.textContent = selection || block.textContent.trim(); input.value = ''; dialog.showModal(); setTimeout(() => input.focus(), 100); };
  });
  document.querySelector('#saveNote').onclick = event => {
    if (!input.value.trim()) { event.preventDefault(); return; }
    notes.push({ anchor: anchor.dataset.id, quote: quote.textContent, note: input.value.trim(), version: 'draft-1' });
    localStorage.setItem('nomadic-paws-mom-notes', JSON.stringify(notes)); anchor.dataset.noted = 'true'; toast('Note saved with that passage.');
  };
  document.querySelector('#sendReview').onclick = () => {
    if (!notes.length) { toast('Tap a passage first if you would like to leave a note.'); return; }
    localStorage.setItem('nomadic-paws-mom-review-sent', 'true');
    toast('Your notes have been delivered to Katie. She can no longer claim she didn’t know where the comma goes.');
    setTimeout(() => {
      document.querySelector('#readingView').hidden = true; document.querySelector('#changedView').hidden = false;
      document.querySelector('#changeCards').innerHTML = notes.map((note, index) => `<article class="change-card"><small>CHANGED IN RESPONSE TO YOUR NOTE</small><p>${index ? 'I followed Cheeto until his posture softened, then we turned back together.' : 'That morning, trust felt less like giving directions and more like listening well.'}</p><div class="change-choices"><button>Resolved</button><button>Still needs work</button></div></article>`).join('');
      document.querySelectorAll('.change-choices button').forEach(button => { button.onclick = () => { button.parentElement.querySelectorAll('button').forEach(item => item.classList.remove('active')); button.classList.add('active'); }; }); scrollTo(0, 0);
    }, 1000);
  };
  document.querySelector('#finishChanges').onclick = () => toast('Your choices are ready for Katie.');
})();
