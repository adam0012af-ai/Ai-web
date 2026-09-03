'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const nav=[['Services','/services'],['AI Tools','/ai-tools'],['Pricing','/pricing'],['Blog','/blog'],['About','/about'],['Contact','/contact'],['FAQ','/faq']] as const;
export function MobileSiteNav(){
  const [open,setOpen]=useState(false);
  return <>
    <Button variant="ghost" className="md:hidden" aria-label="Open site navigation" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={20}/></Button>
    {open&&<div className="fixed inset-0 z-[70] bg-black/45 md:hidden" onClick={()=>setOpen(false)}>
      <aside className="ml-auto flex h-full w-[86%] max-w-sm flex-col bg-[var(--card)] p-5 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between"><b>Menu</b><Button variant="ghost" aria-label="Close navigation" onClick={()=>setOpen(false)}><X size={20}/></Button></div>
        <nav className="space-y-1">{nav.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="muted block rounded-xl px-3 py-3.5 text-sm font-bold hover:bg-black/[.04] hover:text-[var(--fg)] dark:hover:bg-white/[.05]">{label}</Link>)}</nav>
        <div className="mt-auto grid gap-2 pt-6"><Link onClick={()=>setOpen(false)} className="surface rounded-xl px-4 py-3 text-center text-sm font-bold" href="/login">Log in</Link><Link onClick={()=>setOpen(false)} className="brand-gradient rounded-xl px-4 py-3 text-center text-sm font-bold" href="/register">Get started</Link></div>
      </aside>
    </div>}
  </>;
}
