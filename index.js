const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

// مفتاح TMDB الخاص بك مدمج هنا
const TMDB_API_KEY = "c24438dae5c806e30d36966e4bc6d3a9";

const builder = new addonBuilder({
    id: 'org.mycustomarabicaddon',
    version: '2.0.0',
    name: 'إضافتي العربية الذكية',
    description: 'إضافة لجلب أحدث الأفلام والمسلسلات الرائجة بترجمة وعناوين عربية تلقائياً',
    resources: ['catalog'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'arabic_trending_movies',
            name: 'أحدث الأفلام الرائجة (عربي)'
        },
        {
            type: 'series',
            id: 'arabic_trending_series',
            name: 'أحدث المسلسلات الرائجة (عربي)'
        }
    ]
});

builder.defineCatalogHandler(async function(args) {
    try {
        let url = '';
        if (args.type === 'movie' && args.id === 'arabic_trending_movies') {
            url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'series' && args.id === 'arabic_trending_series') {
            url = `https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else {
            return { metas: [] };
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results) {
            return { metas: [] };
        }

        const metas = data.results.map(item => ({
            id: `tmdb:${item.id}`,
            type: args.type,
            name: item.title || item.name || 'بدون عنوان',
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/300x450.png?text=No+Poster',
            description: item.overview || 'لا يوجد وصف متوفر لهذه العمل.'
        }));

        return { metas };
    } catch (error) {
        console.error("Error fetching data from TMDB:", error);
        return { metas: [] };
    }
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
