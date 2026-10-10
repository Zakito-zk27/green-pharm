# نشر الموقع على Cloudflare (مجاناً)

هذه الخطوات يقوم بها صاحب المتجر مرة واحدة، بحساباته الخاصة.

## 1. الحسابات

- حساب **GitHub** (github.com) يحتوي على كود الموقع (المستودع `green-pharm`).
- حساب **Cloudflare** (dash.cloudflare.com).

## 2. ربط الكود بـ Cloudflare

1. في Cloudflare: **Compute ← Workers & Pages ← Create ← Import a repository ← GitHub**.
2. اختر المستودع `green-pharm`.
3. املأ الإعدادات هكذا:

| الخانة | القيمة |
|---|---|
| Project name | `green-pharm` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Preview command | `npx opennextjs-cloudflare upload` |
| Enable Preview builds | مطفأ |
| Build variable (إن وُجد) | `NODE_VERSION` = `22` |

4. اضغط **Deploy**. قاعدتا البيانات (`green-pharm-db` للطلبات و`green-pharm-media` للصور) تُنشآن تلقائياً في حسابك.

## 3. كلمة سر لوحة المدير

في المشروع: **Settings ← Variables and Secrets ← Add**، النوع **Secret**:

- `ADMIN_PASSWORD`: كلمة سر لوحة المدير (اخترها طويلة).
- `ADMIN_SECRET`: أي حروف وأرقام عشوائية طويلة (40 حرفاً أو أكثر).

ثم احفظ. لوحة المدير: `رابط-موقعك/admin`.

## 4. بعد النشر

- المتجر يبدأ فارغاً: أضف المنتجات من **لوحة المدير ← المنتجات ← إضافة منتج**.
- أسعار التوصيل جاهزة لكل الولايات، ويمكن تعديلها من **أسعار التوصيل**.
- اسم نطاق خاص (مثل `monmagasin.com`): **Settings ← Domains & Routes ← Add ← Custom domain**.
- كل تعديل يُرفع إلى GitHub يُنشر تلقائياً.

دليل الاستعمال اليومي: [OWNER-GUIDE-AR.md](OWNER-GUIDE-AR.md).
