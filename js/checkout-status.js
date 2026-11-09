(() => {
  const status = document.getElementById('status'); const check = document.getElementById('check');
  async function refresh() {
    check.disabled=true;
    try {
      const order = JSON.parse(localStorage.getItem('np-pending-order') || 'null');
      if (!order) { status.textContent='Payment confirmation is available on the register or in your payment receipt. Returning here alone does not confirm a payment.'; return; }
      const response = await fetch(`/api/commerce/status?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.statusToken)}`); const data = await response.json(); if(!response.ok) throw new Error(data.error);
      cancel.hidden = data.status !== 'pending';
      if(data.status==='paid') { status.textContent='Thank you! Your payment is confirmed.'; localStorage.removeItem('np-pack-v1'); localStorage.removeItem('np-checkout-request'); }
      else if(data.status==='cancelled') { status.textContent='This checkout has expired. You can return to your pack and try again.'; localStorage.removeItem('np-checkout-request'); localStorage.removeItem('np-pending-order'); }
      else if(data.status==='refunded' || data.status==='partially_refunded') status.textContent=data.status==='refunded' ? 'Your payment has been refunded.' : 'Your payment has been partially refunded.';
      else if(data.status==='review') status.textContent='Your payment needs review. Please contact hello@nomadicpaws.co before starting another payment.';
      else status.textContent='Your order is awaiting confirmation. Please check again before starting another payment.';
    } catch(error) { status.textContent=error.message || 'Unable to check confirmation. Please try again.'; }
    finally { check.disabled=false; }
  }
  const cancel = document.createElement('button'); cancel.textContent='Cancel unpaid checkout'; cancel.type='button'; check.after(cancel);
  cancel.addEventListener('click',async () => {
    cancel.disabled=true;
    try { const order=JSON.parse(localStorage.getItem('np-pending-order') || 'null'); if(!order) return;
      const response=await fetch('/api/commerce/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:order.id,statusToken:order.statusToken})}); const result=await response.json(); if(!response.ok) throw new Error(result.error); await refresh();
    } catch(error) {status.textContent=error.message;} finally {cancel.disabled=false;}
  });
  check.addEventListener('click',refresh); refresh();
})();
