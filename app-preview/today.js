(function(){
  const buttons=document.querySelectorAll('.role-switch button');
  buttons.forEach(button=>button.onclick=()=>{
    buttons.forEach(item=>item.classList.toggle('active',item===button));
    const person=button.dataset.person, trin=person==='Trinitie', mom=person==='Mom';
    document.getElementById('personName').textContent=person;
    document.getElementById('workspaceName').textContent=trin?'Instagram Studio':mom?'Trail Journal Review':'Creative & Publishing';
    document.getElementById('todayIntro').textContent=trin?'Your Instagram desk is calm and ready when inspiration arrives.':mom?'A quiet place to read Katie’s Trail Journal drafts and leave review notes.':'Your stories, campaigns, and Cheeto adventures are gathered in one place.';
    document.getElementById('readyNumber').textContent=trin?'1':mom?'1':'2';
    document.getElementById('readyLabel').textContent=trin?'Instagram ready':mom?'Ready to review':'Assigned to you';
    document.getElementById('listTitle').textContent=trin?'Your studio':mom?'Ready to review':'In your hands';
    document.getElementById('listCount').textContent=trin||mom?'1 item':'2 items';
    document.getElementById('adventureButton').hidden=trin||mom;
    document.getElementById('katieSeeds').hidden=trin||mom;
    document.getElementById('trinitieSeeds').hidden=!trin;
    document.getElementById('momSeeds').hidden=!mom;
    document.getElementById('pinterestTab').hidden=trin||mom;
    document.getElementById('registerTab').hidden=trin||mom;
  });
})();
