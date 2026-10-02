const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const express = require("express");

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

const app = express();

// صفحة ترحيبية للرابط الأساسي لكي لا يظهر خطأ Not Found
app.get("/", (req, res) => {
    res.send("<h2>Arabic Stremio Addon is Running Successfully!</h2><p>Use /manifest.json to install in Stremio.</p>");
});

app.use(getRouter(builder.getInterface()));

const port = process.env.PORT || 7000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Addon active on port ${port} and listening on 0.0.0.0`);
});
