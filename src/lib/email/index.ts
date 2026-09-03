type Mail={to:string;subject:string;text:string};
export async function sendEmail(mail:Mail){ if(process.env.NODE_ENV!=='production'){console.info('[DEV EMAIL]',mail);return;} console.warn('No production email transport configured. Connect Resend/SES/SMTP in src/lib/email/index.ts'); }
