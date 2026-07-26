/* ==================================================================
   عامل الخدمة - نظام ادارة الباحثين
   ------------------------------------------------------------------
   وظيفته هنا امران:

   1) تمكين تثبيت الموقع كتطبيق على الجهاز، لان متصفح كروم يشترط
      وجود عامل خدمة يعالج طلبات الشبكة قبل ان يسمح بالتثبيت.

   2) تشغيل النظام عند انقطاع الانترنت، فيعرض اخر نسخة محفوظة من
      الصفحة بدل صفحة الخطأ.

   استراتيجية التخزين: الشبكة اولا ثم الذاكرة
   ------------------------------------------
   اخترناها عمدا بدل العكس، لان تحديث النظام يتم برفع ملف
   index.html جديد. فلو كانت الذاكرة اولا لبقي المستخدمون على
   النسخة القديمة حتى بعد التحديث. بهذه الطريقة يرى الجميع اخر
   نسخة فور رفعها، وتبقى النسخة المحفوظة للطوارئ فقط.

   ملاحظة: لا يتدخل هذا الملف اطلاقا في طلبات قاعدة البيانات
   ولا المكتبات الخارجية، فهي من نطاقات اخرى ونتركها تعمل مباشرة.
   ================================================================== */

const CACHE_NAME = "osarya-system-v1";

/* التفعيل الفوري للنسخة الجديدة دون انتظار اغلاق التبويبات */
self.addEventListener("install", function (event) {
    self.skipWaiting();
});

/* تنظيف اي ذاكرة قديمة من نسخ سابقة */
self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.map(function (k) {
                    if (k !== CACHE_NAME) return caches.delete(k);
                })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

self.addEventListener("fetch", function (event) {
    const req = event.request;

    /* نتعامل مع طلبات العرض فقط */
    if (req.method !== "GET") return;

    /* لا نتدخل في نطاقات اخرى: قاعدة البيانات والخطوط والمكتبات */
    let url;
    try { url = new URL(req.url); } catch (e) { return; }
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(req)
            .then(function (res) {
                /* نحفظ نسخة للطوارئ */
                const copy = res.clone();
                caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(req, copy);
                }).catch(function () {});
                return res;
            })
            .catch(function () {
                /* انقطع الاتصال: نعرض اخر نسخة محفوظة */
                return caches.match(req).then(function (cached) {
                    return cached || caches.match("index.html");
                });
            })
    );
});
