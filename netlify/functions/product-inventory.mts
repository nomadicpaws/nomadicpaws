import type { Config } from '@netlify/functions';
import { products } from './lib/commerce-db.mjs';
import { commerceConfig } from './lib/commerce-stripe.mjs';
export default async () => {try {commerceConfig(); const catalog=await products(); return Response.json({products:catalog.map(p=>({id:p.id,stock:p.stock,affiliateUrl:p.affiliateUrl,status:p.active&&p.stock>0?'in_stock':p.affiliateUrl?'affiliate':'unavailable'}))},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Inventory could not be confirmed.'},{status:503});}};
export const config: Config={path:'/api/product-inventory'};
