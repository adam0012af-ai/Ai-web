import Link from 'next/link';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import { MobileSiteNav } from '@/components/marketing/mobile-site-nav';
const nav=[['Services','/services'],['AI Tools','/ai-tools'],['Pricing','/pricing'],['Blog','/blog'],['About','/about']];
export function SiteHeader(){return <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-xl"><div className="shell flex h-17 items-center justify-between gap-2"><Brand/><nav className="hidden gap-6 text-sm font-semibold md:flex">{nav.map(([a,h])=><Link key={h} className="muted hover:text-[var(--fg)]" href={h}>{a}</Link>)}</nav><div className="flex items-center gap-1"><ThemeToggle/><Link className="hidden rounded-xl px-3 py-2 text-sm font-semibold lg:block" href="/login">Log in</Link><Link className="brand-gradient hidden rounded-xl px-4 py-2 text-sm font-bold sm:block" href="/register">Get started</Link><MobileSiteNav/></div></div></header>}
