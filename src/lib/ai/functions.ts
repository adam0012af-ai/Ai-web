import { routeAI } from './router';import { promptForFeature,prompts } from './prompts';import type { ChatMessage } from './types';
function one(feature:string,userId:string|undefined,input:string,system=promptForFeature(feature),cacheable=false){return routeAI({userId,feature,cacheable,messages:[{role:'system',content:system},{role:'user',content:input}]});}
export const generateText=(u:string|undefined,i:string)=>one('writer',u,i,prompts.writer);
export const summarizeText=(u:string|undefined,i:string)=>one('summarizer',u,i,prompts.summarizer,true);
export const rewriteText=(u:string|undefined,i:string)=>one('rewriter',u,i,prompts.rewriter);
export const translateText=(u:string|undefined,i:string)=>one('translator',u,i,prompts.translator);
export const analyzeText=(u:string|undefined,i:string)=>one('analysis',u,i,prompts.analysis,true);
export const generateIdeas=(u:string|undefined,i:string)=>one('brainstorm',u,i,prompts.brainstorm);
export const generateCode=(u:string|undefined,i:string)=>one('code',u,i,prompts.coding);
export const analyzeImage=(u:string|undefined,i:string)=>one('image',u,i,prompts.analysis);
export const generateStructuredData=(u:string|undefined,i:string)=>one('structured',u,i,'Return valid JSON only. Follow the requested schema exactly.');
export const chatCompletion=(u:string|undefined,messages:ChatMessage[])=>routeAI({userId:u,feature:'chat',messages});
