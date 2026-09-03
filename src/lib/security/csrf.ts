import { cookies } from 'next/headers';
import { randomToken, safeEqual } from './crypto';
const COOKIE='nexa_csrf';
export async function issueCsrf(){const jar=await cookies();let token=jar.get(COOKIE)?.value;if(!token){token=randomToken(24);jar.set(COOKIE,token,{httpOnly:false,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/'});}return token;}
export async function verifyCsrf(request:Request){const header=request.headers.get('x-csrf-token')??'';const cookie=(await cookies()).get(COOKIE)?.value??'';return !!header&&!!cookie&&safeEqual(header,cookie);}
