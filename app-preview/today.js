(function(){
  document.getElementById('adventureButton').onclick=()=>location.href='/app-preview/adventure.html';
  try{const adventure=JSON.parse(localStorage.getItem('nomadic-paws-latest-adventure'));if(adventure&&adventure.name){const safe=value=>String(value||'').replace(/[<>&]/g,''),card=`<article class="seed adventure-seed"><div><b class="ready">Adventure</b><small>Katie</small></div><h3>${safe(adventure.name)}</h3><p>${safe(adventure.notes)||'New photos and videos gathered from the trail.'}</p><footer><span>${Number(adventure.mediaCount)||1} media</span>${adventure.uses.map(use=>`<span>${safe(use)}</span>`).join('')}</footer></article>`;document.getElementById('katieSeeds').insertAdjacentHTML('afterbegin',card);if(adventure.shareWithTrin)document.getElementById('trinitieSeeds').insertAdjacentHTML('afterbegin',card.replace('<small>Katie</small>','<small>From Katie · Instagram ready</small>'))}}catch(error){}
  const buttons=document.querySelectorAll('.role-switch button');
  buttons.forEach(button=>button.onclick=()=>{
    buttons.forEach(item=>item.classList.toggle('active',item===button));
    const person=button.dataset.person, trin=person==='Trinitie', mom=person==='Mom';
    document.getElementById('personName').textContent=person;
    document.getElementById('workspaceName').textContent=trin?'Instagram Studio':mom?'Trail Journal Review':'Creative & Publishing';
    document.getElementById('todayIntro').textContent=trin?'Your Instagram desk is calm and ready when inspiration arrives.':mom?'A quiet place to read Katie’s Trail Journal drafts and leave review notes.':'Your stories, campaigns, and Cheeto adventures are gathered in one place.';
    document.getElementById('readyNumber').textContent=trin?'1':mom?'2':'3';
    document.getElementById('readyLabel').textContent=trin?'Instagram ready':mom?'Shared previews':'Awaiting feedback';
    document.getElementById('listTitle').textContent=trin?'Your studio':mom?'Ready to review':'In your hands';
    document.getElementById('listCount').textContent=trin||mom?'1 item':'2 items';
    document.getElementById('adventureButton').hidden=trin||mom;
    document.getElementById('libraryButton').hidden=trin||mom;
    document.getElementById('katieSeeds').hidden=trin||mom;
    document.getElementById('trinitieSeeds').hidden=!trin;
    document.getElementById('momSeeds').hidden=!mom;
    document.getElementById('pinterestTab').hidden=trin||mom;
    document.getElementById('registerTab').hidden=trin||mom;
  });
})();
