const { addonBuilder } = require("stremio-addon-sdk");
const { getRouter } = require("stremio-addon-sdk");
const express = require("express");

// إعدادات الإضافة (Manifest)
const manifest = {
    id: "org.arabicstremioaddon",
    version: "2.4.0",
    name: "Arabic Stremio Add-on",
    description: "إضافة استريمو العربية للأفلام والمسلسلات والأقسام الشائعة",
    resources: ["catalog", "meta", "stream"],
    types: ["movie", "series"],
    catalogs: [
        { type: "movie", id: "arabic_trending", name: "الأفلام الرائجة" },
        { type: "series", id: "arabic_popular", name: "المسلسلات الشائعة" }
    ]
};

const builder = new addonBuilder(manifest);

// معالج القوائم (Catalogs)
builder.defineCatalogHandler(({ type, id }) => {
    // يمكنك إضافة أو تعديل البيانات هنا حسب رغبتك
    return Promise.resolve({ metas: [] });
});

// معالج التفاصيل (Meta)
builder.defineMetaHandler(({ type, id }) => {
    return Promise.resolve({ meta: null });
});

// معالج الروابط (Streams)
builder.defineStreamHandler(({ type, id }) => {
    return Promise.resolve({ streams: [] });
});

// إعداد خادم Express للعمل على المنفذ المتاح وربطه بشكل خارجي (0.0.0.0) ليعمل على Render
const app = express();
app.use(getRouter(builder.getInterface()));

const port = process.env.PORT || 7000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Addon active on port ${port} and listening on 0.0.0.0`);
});
