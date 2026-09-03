import { headers } from 'next/headers';
export async function requestFingerprint(prefix:string,userId?:string){const h=await headers();const ip=(h.get('x-forwarded-for')??h.get('x-real-ip')??'local').split(',')[0].trim();return `${prefix}:${userId??ip}`;}
