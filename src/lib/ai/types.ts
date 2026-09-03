import type { AIProvider } from '@/generated/prisma/client';
export type ChatRole='system'|'user'|'assistant';
export type ChatMessage={role:ChatRole;content:string};
export type AIRequest={userId?:string;feature:string;messages:ChatMessage[];temperature?:number;maxTokens?:number;cacheable?:boolean;cacheTtlSeconds?:number};
export type AIResponse={text:string;provider:AIProvider;model:string;latency:number;fallbackUsed:boolean;inputTokens:number;outputTokens:number;cached?:boolean};
export interface AIProviderClient { provider:AIProvider; isConfigured():boolean; generate(request:AIRequest,model:string,signal:AbortSignal):Promise<{text:string;inputTokens?:number;outputTokens?:number}>; }
