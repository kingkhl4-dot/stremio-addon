const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const https = require('https');

// مفتاح TMDB الخاص بك مدمج هنا
const TMDB_API_KEY = "c24438dae5c806e30d36966e4bc6d3a9";

const builder = new addonBuilder({
    id: 'org.mycustomarabicaddon',
    version: '2.1.0',
    name: 'إضافتي العربية الذكية',
    description: 'إضافة لجلب أحدث الأفلام والمسلسلات الرائجة والمميزة وأكشن بترجمة وعناوين عربية',
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
        },
        {
            type: 'movie',
            id: 'arabic_top_rated_movies',
            name: 'الأفلام المميزة والأعلى تقييماً (عربي)'
        },
        {
            type: 'movie',
            id: 'arabic_action_movies',
            name: 'أفلام الأكشن (عربي)'
        }
    ]
});

// دالة لجلب البيانات بنظام Node الأساسي لضمان عدم توقف السيرفر
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

builder.defineCatalogHandler(async function(args) {
    try {
        let url = '';
        if (args.type === 'movie' && args.id === 'arabic_trending_movies') {
            url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'series' && args.id === 'arabic_trending_series') {
            url = `https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'movie' && args.id === 'arabic_top_rated_movies') {
            url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'movie' && args.id === 'arabic_action_movies') {
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28&language=ar-SA`;
        } else {
            return { metas: [] };
        }

        const data = await fetchJson(url);

        if (!data || !data.results) {
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
