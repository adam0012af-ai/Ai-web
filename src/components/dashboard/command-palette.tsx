'use client';
import { useEffect,useMemo,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { dashboardNav } from './nav-items';
import { aiTools } from '@/data/ai-tools';
type Item={label:string;href:string;type?:string};
export function CommandPalette(){
 const [open,setOpen]=useState(false),[q,setQ]=useState(''),[remote,setRemote]=useState<Item[]>([]);const router=useRouter();
 useEffect(()=>{const f=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(x=>!x)}};addEventListener('keydown',f);return()=>removeEventListener('keydown',f)},[]);
 useEffect(()=>{if(q.trim().length<2){setRemote([]);return}const c=new AbortController();const timer=setTimeout(()=>fetch(`/api/search?q=${encodeURIComponent(q)}`,{signal:c.signal}).then(r=>r.ok?r.json():{results:[]}).then(j=>setRemote(j.results??[])).catch(()=>undefined),180);return()=>{clearTimeout(timer);c.abort()}},[q]);
 const local=useMemo(()=>[...dashboardNav.map(x=>({label:x[0],href:x[1],type:'Page'})),...aiTools.map(t=>({label:t.title,href:t.slug==='chat'?'/dashboard/ai/chat':`/dashboard/ai/${t.slug}`,type:'AI Tool'}))].filter(x=>x.label.toLowerCase().includes(q.toLowerCase())).slice(0,7),[q]);
 const items=[...remote,...local.filter(l=>!remote.some(r=>r.href===l.href))].slice(0,12);
 if(!open)return <button onClick={()=>setOpen(true)} aria-label="Search workspace" className="muted flex items-center gap-2 rounded-xl border border-[var(--line)] p-2 text-left text-sm md:min-w-64 md:px-3"><Search size={15}/><span className="hidden md:inline">Search workspace</span><kbd className="ml-auto hidden text-xs md:inline">⌘K</kbd></button>;
 return <div className="fixed inset-0 z-[60] grid place-items-start bg-black/40 p-4 pt-[14vh]" onClick={()=>setOpen(false)}><div className="surface mx-auto w-full max-w-xl rounded-2xl p-2" onClick={e=>e.stopPropagation()}><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tools, conversations, files, blog, settings…" className="w-full bg-transparent p-4 outline-none"/>{items.map((i,idx)=><button key={`${i.href}-${idx}`} onClick={()=>{router.push(i.href);setOpen(false)}} className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.05]"><span>{i.label}</span><span className="muted text-xs">{i.type}</span></button>)}{q.length>1&&!items.length&&<div className="muted p-5 text-sm">No matching workspace items.</div>}</div></div>;
}
