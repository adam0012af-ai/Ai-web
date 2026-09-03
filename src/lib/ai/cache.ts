import { createHash } from 'node:crypto';import { db } from '@/lib/db';import type { AIRequest } from './types';
export function cacheKey(req:AIRequest){return createHash('sha256').update(JSON.stringify({u:req.userId??'anonymous',f:req.feature,m:req.messages,t:req.temperature,x:req.maxTokens})).digest('hex');}
export async function getCached(key:string){const hit=await db.aICache.findUnique({where:{key}});if(!hit||hit.expiresAt<=new Date())return null;return hit.response;}
export async function setCached(key:string,feature:string,response:string,ttl=3600){await db.aICache.upsert({where:{key},create:{key,feature,response,expiresAt:new Date(Date.now()+ttl*1000)},update:{response,expiresAt:new Date(Date.now()+ttl*1000)}});}
