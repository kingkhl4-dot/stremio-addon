const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

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

builder.defineCatalogHandler(({ type, id }) => {
    return Promise.resolve({ metas: [] });
});

builder.defineMetaHandler(({ type, id }) => {
    return Promise.resolve({ meta: null });
});

builder.defineStreamHandler(({ type, id }) => {
    return Promise.resolve({ streams: [] });
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
