(function(){
  const list=document.getElementById('storyList'),trigger=document.getElementById('storyTrigger'),logo=document.getElementById('logo');
  trigger.onclick=()=>{list.hidden=!list.hidden};
  list.querySelectorAll('button').forEach(button=>button.onclick=()=>{document.getElementById('selectedTitle').textContent=button.dataset.title;document.getElementById('selectedMeta').textContent=button.dataset.meta;list.hidden=true});
  document.querySelectorAll('.choices').forEach(group=>group.querySelectorAll('button').forEach(button=>button.onclick=()=>{group.querySelectorAll('button').forEach(item=>item.classList.remove('active'));button.classList.add('active');const type=group.dataset.control,value=button.dataset.value;if(type==='color')logo.src=`/images/pinterest-logos/logo-${value}.png`;else{logo.classList.remove(type==='size'?'small':'left',type==='size'?'medium':'right');logo.classList.add(value)}}));
  list.hidden=true;
})();
