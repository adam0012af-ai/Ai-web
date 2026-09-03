export const faqs=[
 ['What happens if the main AI provider is unavailable?','Nexa AI can retry transient failures, temporarily cool down unhealthy providers, and automatically continue with the next enabled provider in the configured priority.'],
 ['Is the Free plan actually usable?','Yes. The architecture includes database-managed daily limits rather than a decorative plan. Exact quotas can be adjusted by administrators.'],
 ['Are API keys exposed to the browser?','No. Provider secrets stay in server-side environment variables and AI requests flow through server routes.'],
 ['Can we change AI models later?','Yes. Models and provider priorities are centralized and represented in the database/admin architecture, avoiding hardcoded model names throughout the UI.'],
 ['Does Nexa AI support dark mode?','Yes. The interface supports system, light, and dark themes.']
];
export const services=[
 {slug:'ai-workspaces',title:'AI Workspaces',description:'Reusable AI tools, persistent chat, and controlled usage in one team-ready workspace.'},
 {slug:'provider-resilience',title:'Provider Resilience',description:'Automatic fallback, timeouts, retries, health state, cooldowns, and centralized model configuration.'},
 {slug:'saas-operations',title:'SaaS Operations',description:'User management, support, billing architecture, activity, notifications, and admin analytics.'}
];
