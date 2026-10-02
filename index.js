const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const builder = new addonBuilder({
    id: 'org.mycustomarabicaddon',
    version: '1.0.0',
    name: 'إضافتي العربية المخصصة',
    description: 'إضافة لترتيب وعرض الأفلام بالعناوين العربية المجمعة',
    resources: ['catalog'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'arabic_movies',
            name: 'أفلامي المخصصة'
        }
    ]
});

builder.defineCatalogHandler(function(args) {
    if (args.type === 'movie' && args.id === 'arabic_movies') {
        return Promise.resolve({
            metas: [
                {
                    id: 'tt1234567',
                    type: 'movie',
                    name: 'اسم الفيلم بالعربي هنا',
                    poster: 'https://via.placeholder.com/300x450.png?text=Movie+Poster',
                    description: 'هذا وصف مختصر للفيلم باللغة العربية'
                }
            ]
        });
    }
    return Promise.resolve({ metas: [] });
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
