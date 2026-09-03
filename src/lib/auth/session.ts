import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { db } from '@/lib/db';
import { hashToken, randomToken } from '@/lib/security/crypto';
import type { Role } from '@/generated/prisma/client';
const COOKIE='nexa_session';
export async function createSession(userId:string,remember=false){
 const token=randomToken(); const expiresAt=new Date(Date.now()+(remember?30:7)*86400000); const h=await headers();
 await db.session.create({data:{userId,tokenHash:hashToken(token),expiresAt,userAgent:h.get('user-agent')?.slice(0,500),ipAddress:(h.get('x-forwarded-for')??'').split(',')[0].trim().slice(0,64)}});
 const jar=await cookies(); jar.set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',expires:expiresAt});
}
export async function destroySession(){ const jar=await cookies(); const token=jar.get(COOKIE)?.value; if(token) await db.session.deleteMany({where:{tokenHash:hashToken(token)}}); jar.set(COOKIE,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',expires:new Date(0)}); }
export const getCurrentUser=cache(async()=>{ const token=(await cookies()).get(COOKIE)?.value; if(!token)return null; const session=await db.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:true}}); if(!session||session.expiresAt<=new Date()||session.user.suspendedAt)return null; return session.user; });
export async function hasRole(roles:Role[]){const u=await getCurrentUser();return !!u&&roles.includes(u.role);}
