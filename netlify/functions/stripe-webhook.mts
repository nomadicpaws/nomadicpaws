import type { Config } from '@netlify/functions';
// Retired test-only endpoint. No old payment or inventory provider is contacted.
export default async () => Response.json({error:'This test endpoint has been retired. Use the updated commerce register.'},{status:410,headers:{'Cache-Control':'no-store'}});
export const config: Config = {path:'/api/event/stripe/webhook'};
