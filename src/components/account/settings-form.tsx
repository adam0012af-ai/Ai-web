'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

type Settings={theme:string;language:string;emailNotifications:boolean;productUpdates:boolean};
async function csrf(){const r=await fetch('/api/csrf');const j=await r.json();return j.token as string;}

export function SettingsForm({settings}:{settings:Settings}){
  const router=useRouter();const {setTheme}=useTheme();
  const [form,setForm]=useState({theme:(['system','light','dark'].includes(settings.theme)?settings.theme:'system') as 'system'|'light'|'dark',language:(settings.language==='ar'?'ar':'en') as 'en'|'ar',emailNotifications:settings.emailNotifications,productUpdates:settings.productUpdates});
  const [status,setStatus]=useState<{loading:boolean;message?:string;error?:boolean}>({loading:false});
  async function submit(e:React.FormEvent){e.preventDefault();setStatus({loading:true});try{const token=await csrf();const res=await fetch('/api/account/settings',{method:'PATCH',headers:{'content-type':'application/json','x-csrf-token':token},body:JSON.stringify(form)});const body=await res.json();if(!res.ok)throw new Error(body.error??'Unable to save preferences.');setTheme(form.theme);setStatus({loading:false,message:'Settings saved.'});router.refresh();}catch(error){setStatus({loading:false,error:true,message:error instanceof Error?error.message:'Unable to save preferences.'});}}
  return <form onSubmit={submit} className="space-y-6">
    <label className="block text-sm font-semibold">Theme<select className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none" value={form.theme} onChange={e=>setForm(x=>({...x,theme:e.target.value as typeof form.theme}))}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
    <label className="block text-sm font-semibold">Language<select className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none" value={form.language} onChange={e=>setForm(x=>({...x,language:e.target.value as typeof form.language}))}><option value="en">English</option><option value="ar">العربية</option></select></label>
    <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] p-4"><input className="mt-1" type="checkbox" checked={form.emailNotifications} onChange={e=>setForm(x=>({...x,emailNotifications:e.target.checked}))}/><span><b className="block text-sm">Email notifications</b><span className="muted text-xs">Receive account, support and security updates by email when a transport is configured.</span></span></label>
    <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] p-4"><input className="mt-1" type="checkbox" checked={form.productUpdates} onChange={e=>setForm(x=>({...x,productUpdates:e.target.checked}))}/><span><b className="block text-sm">Product updates</b><span className="muted text-xs">Receive product release and feature announcements.</span></span></label>
    {status.message&&<div role="status" className={`rounded-xl p-3 text-sm ${status.error?'bg-red-500/10 text-red-600':'bg-emerald-500/10 text-emerald-600'}`}>{status.message}</div>}
    <Button disabled={status.loading}>{status.loading?'Saving…':'Save settings'}</Button>
  </form>;
}
