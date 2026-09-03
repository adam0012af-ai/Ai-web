'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

async function csrf(){const r=await fetch('/api/csrf');const j=await r.json();return j.token as string;}
export function PasswordForm(){
  const [form,setForm]=useState({currentPassword:'',newPassword:'',confirmPassword:''});
  const [status,setStatus]=useState<{loading:boolean;message?:string;error?:boolean}>({loading:false});
  async function submit(e:React.FormEvent){e.preventDefault();setStatus({loading:true});try{const token=await csrf();const res=await fetch('/api/account/password',{method:'PATCH',headers:{'content-type':'application/json','x-csrf-token':token},body:JSON.stringify(form)});const body=await res.json();if(!res.ok)throw new Error(body.error??'Unable to change password.');setForm({currentPassword:'',newPassword:'',confirmPassword:''});setStatus({loading:false,message:'Password changed. Other sessions were signed out.'});}catch(error){setStatus({loading:false,error:true,message:error instanceof Error?error.message:'Unable to change password.'});}}
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-semibold">Current password<Input className="mt-2" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={e=>setForm(x=>({...x,currentPassword:e.target.value}))}/></label>
    <label className="block text-sm font-semibold">New password<Input className="mt-2" type="password" autoComplete="new-password" minLength={10} required value={form.newPassword} onChange={e=>setForm(x=>({...x,newPassword:e.target.value}))}/><span className="muted mt-1 block text-xs">At least 10 characters with uppercase, lowercase and a number.</span></label>
    <label className="block text-sm font-semibold">Confirm new password<Input className="mt-2" type="password" autoComplete="new-password" minLength={10} required value={form.confirmPassword} onChange={e=>setForm(x=>({...x,confirmPassword:e.target.value}))}/></label>
    {status.message&&<div role="status" className={`rounded-xl p-3 text-sm ${status.error?'bg-red-500/10 text-red-600':'bg-emerald-500/10 text-emerald-600'}`}>{status.message}</div>}
    <Button disabled={status.loading}>{status.loading?'Updating…':'Change password'}</Button>
  </form>;
}
