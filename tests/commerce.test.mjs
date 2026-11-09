import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { normalizeItems, stockEffects, quote, memberShipping, availableStock, CATALOG } from '../netlify/functions/lib/commerce-catalog.mjs';
import { checkoutParameters, commerceConfig, commerceStripe } from '../netlify/functions/lib/commerce-stripe.mjs';
import { reserveOrder, applySessionEvent, adjustInventory, recordRefund, statusToken, validStatusToken, refundCash } from '../netlify/functions/lib/commerce-db.mjs';
import { createSellerToken } from '../netlify/functions/lib/event-auth.mjs';

const env = { COMMERCE_ENABLED: 'true', COMMERCE_MODE: 'test', STRIPE_SECRET_KEY: 'sk_test_fixture', COMMERCE_STATUS_SECRET: 'x'.repeat(32), COMMERCE_SITE_URL: 'https://nomadicpaws.co', COMMERCE_WEB_TAX_MODE: 'manual', COMMERCE_WEB_TAX_RATE_BPS: '820', EVENT_TAX_RATE_BPS: '820', COMMERCE_SHIPPING_CENTS: '500', COMMERCE_SHIPPING_COUNTRIES: 'US' };
const lion = [{sku:'NP-PEZ-LION',quantity:1}];
test('canonical prices ignore browser price input and reject invalid quantities', () => {
  assert.equal(quote([{...lion[0],unitPriceCents:1}], 'web', env).subtotalCents,2100);
  for(const quantity of [0,-1,1.5,'1',100]) assert.throws(() => normalizeItems([{sku:'NP-PEZ-LION',quantity}]));
  assert.throws(() => normalizeItems([{sku:'NP-PEZ-DEVIL',quantity:1}]));
  assert.throws(() => normalizeItems([{sku:'NP-PEZ-LION',quantity:60},{sku:'NP-PEZ-LION',quantity:60}]));
});
test('bundle shares component stock without a phantom bundle decrement', () => {
  assert.deepEqual(stockEffects([{sku:'NP-PEZ-BUNDLE3',quantity:1},...lion]),[{sku:'NP-PEZ-CARP',quantity:1},{sku:'NP-PEZ-LION',quantity:2},{sku:'NP-PEZ-NILGAI',quantity:1}]);
  assert.equal(availableStock(CATALOG[0],[{sku:'NP-PEZ-CARP',on_hand:5,reserved:2},{sku:'NP-PEZ-LION',on_hand:4,reserved:0},{sku:'NP-PEZ-NILGAI',on_hand:6,reserved:0}]),3);
});
test('monthly perk affects only shipping within its validity period', () => {
  const perk = {code:'PACK-NOV',startsAt:'2026-11-01T00:00:00Z',expiresAt:'2026-12-01T00:00:00Z'};
  const config={...env,COMMERCE_SHIPPING_PERKS:JSON.stringify([perk])};
  assert.equal(memberShipping('pack-nov',config,Date.parse('2026-11-09')),true);
  assert.throws(() => memberShipping('PACK-NOV',config,Date.parse('2026-12-01')));
  assert.throws(() => memberShipping('OTHER',config,Date.parse('2026-11-09')));
  assert.equal(quote(lion,'web',env).shippingCents,500);
  assert.equal(quote(lion,'pos',env).shippingCents,0);
  const active={...env,COMMERCE_SHIPPING_PERKS:JSON.stringify([{code:'TEST',startsAt:new Date(Date.now()-60000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()}])};
  const discounted=quote(lion,'web',active,'TEST');
  assert.equal(discounted.shippingCents,0);assert.equal(discounted.subtotalCents,2100);assert.equal(discounted.taxCents,172);
});
test('missing tax, shipping, mode and live approval fail closed', () => {
  assert.throws(()=>quote(lion,'web',{...env,COMMERCE_WEB_TAX_RATE_BPS:''}));
  assert.throws(()=>quote(lion,'pos',{...env,EVENT_TAX_RATE_BPS:''}));
  assert.throws(()=>quote(lion,'web',{...env,COMMERCE_SHIPPING_CENTS:''}));
  assert.throws(()=>commerceConfig({...env,COMMERCE_ENABLED:'false'}));
  assert.equal(commerceConfig({...env,COMMERCE_ENABLED:'false'},{allowDisabled:true}).mode,'test');
  assert.throws(()=>commerceConfig({...env,COMMERCE_MODE:'live',STRIPE_SECRET_KEY:'sk_live_fixture'}));
  assert.throws(()=>commerceConfig({...env,STRIPE_SECRET_KEY:'sk_live_fixture'}));
});

test('HTTP boundaries reject cross-origin checkout, unauthenticated cash and forged webhooks', async () => {
  const previous={...process.env};
  Object.assign(process.env,env,{EVENT_REGISTER_SESSION_SECRET:'e'.repeat(32),COMMERCE_STRIPE_WEBHOOK_SECRET:'whsec_fixture'});
  try {
    const {default:handler}=await import('../netlify/functions/commerce.mts');
    const request=(path,body,headers={})=>new Request(`https://nomadicpaws.co/api/commerce${path}`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    assert.equal((await handler(request('/quote',{items:lion,channel:'web'},{origin:'https://attacker.example'}))).status,403);
    assert.equal((await handler(request('/cash',{items:lion,channel:'pos'}))).status,401);
    assert.equal((await handler(request('/webhook',{id:'forged'}))).status,400);
    const token=createSellerToken(process.env.EVENT_REGISTER_SESSION_SECRET);
    const quoteResponse=await handler(request('/quote',{items:lion,channel:'pos'},{authorization:`Bearer ${token}`}));
    assert.equal(quoteResponse.status,200);assert.equal((await quoteResponse.json()).totalCents,2272);
    const invalidCash=await handler(request('/cash',{items:lion,channel:'pos',requestId:randomUUID(),tenderedCents:1},{authorization:`Bearer ${token}`}));
    assert.equal(invalidCash.status,400);
  } finally {
    for(const key of Object.keys(process.env)) if(!(key in previous)) delete process.env[key];
    Object.assign(process.env,previous);
  }
});
test('Checkout uses trusted prices, server URLs, explicit shipping and a stable idempotency key', async () => {
  const id=randomUUID(); const priced=quote(lion,'web',env); const params=checkoutParameters({id,channel:'web'},priced,env);
  assert.equal(params['line_items[0][price_data][unit_amount]'],'2100');
  assert.equal(params['shipping_options[0][shipping_rate_data][fixed_amount][amount]'],'500');
  assert.equal(params['shipping_address_collection[allowed_countries][0]'],'US');
  assert.equal(params['metadata[commerce_order_id]'],id);
  const pos=checkoutParameters({id,channel:'pos'},quote(lion,'pos',env),env);
  assert.equal(pos['shipping_address_collection[allowed_countries][0]'],undefined);
  await commerceStripe('/checkout/sessions',{values:params,idempotencyKey:id},async (url,options)=>{
    assert.equal(url,'https://api.stripe.com/v1/checkout/sessions'); assert.equal(options.headers['Idempotency-Key'],id);
    return Response.json({id:'cs_test_fixture'});
  },env);
});
test('order status capabilities reject tampering and missing secrets',()=>{
  const id=randomUUID(); const secret='s'.repeat(32); const token=statusToken(id,secret);
  assert.equal(validStatusToken(id,token,secret),true); assert.equal(validStatusToken(randomUUID(),token,secret),false);
  assert.throws(()=>statusToken(id,''));
});

test('SQL migration, reservation, cash retry, payment deduplication, expiry and refunds', async () => {
  const db=new PGlite();
  // A single embedded Postgres connection exercises real SQL/rollback semantics.
  // Production multi-connection contention still requires staging verification.
  const client={query:async (sql,args)=>{const r=await db.query(sql,args); return {...r,rowCount:r.affectedRows ?? r.rows.length};},release(){}};
  const pool={connect:async()=>client};
  const row=async id=>(await db.query('SELECT * FROM commerce_orders WHERE id=$1',[id])).rows[0];
  const stock=async ()=>(await db.query("SELECT * FROM commerce_inventory WHERE sku='NP-PEZ-LION'")).rows[0];
  try {
    await db.exec(await readFile(new URL('../netlify/database/migrations/202611090001_commerce.sql',import.meta.url),'utf8'));
    await db.exec('CREATE TABLE journal_sentinel (value TEXT); INSERT INTO journal_sentinel VALUES (\'unchanged\')');
    const opening=randomUUID(); await adjustInventory(opening,'NP-PEZ-LION',3,'opening count',pool); await adjustInventory(opening,'NP-PEZ-LION',3,'opening count',pool); assert.equal((await stock()).on_hand,3);
    const cash=randomUUID(); const priced=quote(lion,'pos',env);
    await reserveOrder(cash,priced,'cash','test','cash-hash',pool); await reserveOrder(cash,priced,'cash','test','cash-hash',pool); assert.equal((await stock()).on_hand,2);
    await assert.rejects(()=>reserveOrder(cash,priced,'cash','test','different',pool));
    const refund=randomUUID(); await refundCash(refund,cash,100,'test',pool); await refundCash(refund,cash,100,'test',pool);
    assert.equal((await row(cash)).refunded_cents,100);assert.equal((await stock()).on_hand,2);
    await assert.rejects(()=>refundCash(randomUUID(),cash,priced.totalCents,'test',pool));
    const id=randomUUID(); await reserveOrder(id,priced,'stripe','test','stripe-hash',pool); assert.equal((await stock()).reserved,1);
    await assert.rejects(()=>reserveOrder(randomUUID(),quote([{sku:'NP-PEZ-LION',quantity:2}],'pos',env),'stripe','test','oversell',pool));
    await db.query('UPDATE commerce_orders SET stripe_session_id=$2 WHERE id=$1',[id,'cs_test_order']);
    const session={id:'cs_test_order',client_reference_id:id,metadata:{commerce_order_id:id},livemode:false,payment_status:'paid',status:'complete',amount_subtotal:priced.subtotalCents+priced.taxCents,amount_total:priced.totalCents,currency:'usd',payment_intent:'pi_fixture',total_details:{amount_tax:0}};
    await assert.rejects(()=>applySessionEvent({id:'evt_bad'},{...session,amount_total:1},'test',pool)); assert.equal((await row(id)).status,'pending');
    await applySessionEvent({id:'evt_paid'},session,'test',pool); await applySessionEvent({id:'evt_paid'},session,'test',pool); await applySessionEvent({id:'evt_paid_again'},session,'test',pool);
    assert.equal((await stock()).on_hand,1); assert.equal((await stock()).reserved,0); assert.equal((await row(id)).status,'paid');
    await recordRefund({id:'evt_refund'},{payment_intent:'pi_fixture',livemode:false,currency:'usd',amount_refunded:100},'test',pool);
    assert.equal((await row(id)).status,'partially_refunded'); assert.equal((await stock()).on_hand,1);
    await recordRefund({id:'evt_full'},{payment_intent:'pi_fixture',livemode:false,currency:'usd',amount_refunded:priced.totalCents},'test',pool);
    await recordRefund({id:'evt_old'},{payment_intent:'pi_fixture',livemode:false,currency:'usd',amount_refunded:100},'test',pool);
    assert.equal((await row(id)).status,'refunded');
    const cancelled=randomUUID(); await reserveOrder(cancelled,priced,'stripe','test','expire-hash',pool); await db.query('UPDATE commerce_orders SET stripe_session_id=$2 WHERE id=$1',[cancelled,'cs_test_expired']);
    const expired={...session,id:'cs_test_expired',payment_intent:null,client_reference_id:cancelled,metadata:{commerce_order_id:cancelled},status:'expired',payment_status:'unpaid'};
    await applySessionEvent({id:'evt_expired'},expired,'test',pool); assert.equal((await stock()).reserved,0);
    await applySessionEvent({id:'evt_late'},{...expired,status:'complete',payment_status:'paid'},'test',pool); assert.equal((await row(cancelled)).status,'review'); assert.equal((await stock()).on_hand,1);
    assert.equal((await db.query('SELECT value FROM journal_sentinel')).rows[0].value,'unchanged');
  } finally {await db.close();}
});

test('automatic web tax uses pet-food classification and shipping address instead of a guessed tax line', () => {
  const automaticEnv={...env,COMMERCE_WEB_TAX_MODE:'stripe'};
  const priced=quote(lion,'web',automaticEnv);
  const params=checkoutParameters({id:randomUUID(),channel:'web'},priced,automaticEnv);
  assert.equal(params['automatic_tax[enabled]'],'true');
  assert.equal(params['line_items[0][price_data][product_data][tax_code]'],'txcd_36010004');
  assert.equal(params['shipping_address_collection[allowed_countries][0]'],'US');
  assert.equal(params['line_items[1][price_data][product_data][name]'],undefined);
  assert.equal(priced.taxCents,0);
});
