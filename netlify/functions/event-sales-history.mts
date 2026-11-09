import type { Config } from '@netlify/functions';
export default async () => Response.json({error:'This test endpoint has been retired. Update the Events app to use shared commerce.'},{status:410,headers:{'Cache-Control':'no-store'}});
export const config: Config = {path:'/api/event/sales/history'};
