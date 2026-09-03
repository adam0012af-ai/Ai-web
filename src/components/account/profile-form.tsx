'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

async function csrf(){const r=await fetch('/api/csrf');const j=await r.json();return j.token as string;}

export function ProfileForm({name,email}:{name:string;email:string}){
  const router=useRouter();
  const [value,setValue]=useState(name);
  const [status,setStatus]=useState<{type:'idle'|'loading'|'success'|'error';message?:string}>({type:'idle'});
  async function submit(e:React.FormEvent){
    e.preventDefault();setStatus({type:'loading'});
    try{
      const token=await csrf();
      const res=await fetch('/api/account/profile',{method:'PATCH',headers:{'content-type':'application/json','x-csrf-token':token},body:JSON.stringify({name:value})});
      const body=await res.json();
      if(!res.ok)throw new Error(body.error??'Unable to save profile.');
      setStatus({type:'success',message:'Profile updated.'});router.refresh();
    }catch(error){setStatus({type:'error',message:error instanceof Error?error.message:'Unable to save profile.'});}
  }
  return <form className="space-y-5" onSubmit={submit}>
    <label className="block text-sm font-semibold">Full name<Input className="mt-2" value={value} onChange={e=>setValue(e.target.value)} autoComplete="name" minLength={2} maxLength={80} required/></label>
    <label className="block text-sm font-semibold">Email<Input className="mt-2" value={email} disabled aria-describedby="email-note"/></label>
    <p id="email-note" className="muted -mt-2 text-xs">Email changes require a separate verification flow and are intentionally disabled here.</p>
    {status.message&&<div role="status" className={`rounded-xl p-3 text-sm ${status.type==='error'?'bg-red-500/10 text-red-600':'bg-emerald-500/10 text-emerald-600'}`}>{status.message}</div>}
    <Button disabled={status.type==='loading'}>{status.type==='loading'?'Saving…':'Save profile'}</Button>
  </form>;
}
