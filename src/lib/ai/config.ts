export const aiRuntimeConfig={timeoutMs:Number(process.env.AI_PROVIDER_TIMEOUT_MS??15000),maxRetries:Math.min(2,Math.max(0,Number(process.env.AI_MAX_RETRIES_PER_PROVIDER??2))),cooldownSeconds:Number(process.env.AI_COOLDOWN_SECONDS??120),failuresBeforeCooldown:Number(process.env.AI_FAILURES_BEFORE_COOLDOWN??3)};
export const defaultProviders=[
 {provider:'GEMINI' as const,priority:1,model:process.env.GEMINI_MODEL??'gemini-3.5-flash-lite'},
 {provider:'OPENROUTER' as const,priority:2,model:process.env.OPENROUTER_MODEL??'openrouter/free'},
 {provider:'CLOUDFLARE' as const,priority:3,model:process.env.CLOUDFLARE_MODEL??'@cf/zai-org/glm-4.7-flash'}
];