'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
export function CommentForm({postId}:{postId:string}){const [msg,setMsg]=useState('');async function go(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);const c=await fetch('/api/csrf').then(r=>r.json());const res=await fetch('/api/blog/comments',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':c.token},body:JSON.stringify({postId,name:fd.get('name'),email:fd.get('email'),content:fd.get('content')})});const j=await res.json();setMsg(j.message??j.error);if(res.ok)e.currentTarget.reset()}return <form onSubmit={go} className="surface mt-8 space-y-3 rounded-2xl p-5"><h3 className="font-black">Join the discussion</h3><div className="grid gap-3 sm:grid-cols-2"><Input name="name" placeholder="Name" required/><Input name="email" type="email" placeholder="Email" required/></div><Textarea name="content" placeholder="Comment" required/><Button>Submit comment</Button>{msg&&<span className="muted ml-3 text-sm">{msg}</span>}</form>}
