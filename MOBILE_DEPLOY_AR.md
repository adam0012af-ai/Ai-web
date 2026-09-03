# تشغيل ورفع Nexa AI من الموبايل

هذه النسخة مجهزة بحيث تقدر تدير خطوة GitHub + قاعدة البيانات + Vercel من متصفح الموبايل بدون الحاجة لتشغيل المشروع على الهاتف.

## 1) رفع المشروع إلى GitHub

> مهم: GitHub لا يفك ZIP تلقائياً داخل Repository. فك الملف `nexa-ai-mobile-ready.zip` على هاتفك أولاً باستخدام Files / ZArchiver، ثم ارفع **محتويات مجلد المشروع** إلى Repository جديد. لا ترفع ملف ZIP وحده داخل الـRepository لأن Vercel لن يراه كمشروع Next.js.

بعد الرفع يجب أن ترى `package.json` و`src` و`prisma` في جذر الـRepository مباشرة.

## 2) إنشاء PostgreSQL

استخدم Neon أو Supabase PostgreSQL. انسخ Connection String وضعه لاحقاً في GitHub Secrets وVercel Environment Variables باسم:

- `DATABASE_URL`
- `DIRECT_URL` (يفضل Direct / non-pooled URL إن توفر؛ وإلا يمكن استخدام نفس الرابط مؤقتاً)

## 3) تجهيز قاعدة البيانات من GitHub بالموبايل

داخل Repository:

1. Settings → Secrets and variables → Actions.
2. أضف Secret باسم `DATABASE_URL`.
3. أضف `DIRECT_URL` إذا كان لديك رابط Direct مختلف.
4. افتح Actions → **Database Setup** → Run workflow.
5. اترك `seed_demo_data = true` لأول تشغيل.

الـWorkflow سيشغل Prisma Generate ثم `db push` ثم Seed تلقائياً.

## 4) ربط المشروع بـ Vercel

1. افتح Vercel → Add New → Project.
2. اختر GitHub Repository.
3. Framework سيظهر Next.js تلقائياً.
4. قبل Deploy أضف Environment Variables التالية على الأقل:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SESSION_SECRET=ضع-قيمة-عشوائية-طويلة-جداً
GEMINI_API_KEY=
OPENROUTER_API_KEY=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
```

`APP_URL` اختياري على Vercel؛ المشروع يستطيع التعرف على دومين Vercel تلقائياً. بعد ربط دومين مخصص يفضل إضافة `APP_URL=https://your-domain.com`.

## 5) تشغيل AI

يكفي مفتاح Gemini لتشغيل المزود الأساسي. ويمكن إضافة OpenRouter وCloudflare لاحقاً ليعمل fallback تلقائياً.

الترتيب الافتراضي:

`Gemini → OpenRouter → Cloudflare Workers AI`

## 6) حسابات Demo بعد تشغيل Seed

- Super Admin: `superadmin@nexa.demo`
- Admin: `admin@nexa.demo`
- User: `demo@nexa.demo`
- Password للجميع: `DemoPassword123`

غيّر أو احذف حسابات Demo قبل أي إطلاق حقيقي.

## 7) ملاحظة مهمة

إرسال البريد التجاري، الدفع، ورفع الملفات إلى Object Storage ما زالت Integration Points وتحتاج مزوداً خارجياً قبل الإنتاج الحقيقي. بقية الهيكل موجود ولا توجد أزرار رفع ملفات مفعلة بشكل وهمي.
