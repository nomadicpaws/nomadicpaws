import type { Config } from '@netlify/functions';
import { products } from './lib/commerce-db.mjs';
import { commerceConfig } from './lib/commerce-stripe.mjs';
import { requireEventOperator, errorResponse } from './lib/event-http.mjs';
export default async (request: Request) => {try { const {mode}=commerceConfig(); await requireEventOperator(request); return Response.json({products:await products(),mode},{headers:{'Cache-Control':'no-store'}}); }catch(error){return errorResponse(error);}};
export const config: Config={path:'/api/event/products'};
