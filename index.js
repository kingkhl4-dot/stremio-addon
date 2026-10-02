const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

// مفتاح TMDB الخاص بك
const TMDB_API_KEY = "c24438dae5c806e30d36966e4bc6d3a9";

const builder = new addonBuilder({
    id: 'org.mycustomarabicaddon',
    version: '2.2.0',
    name: 'إضافتي العربية الذكية',
    description: 'إضافة لجلب الأفلام والمسلسلات الرائجة، الجديدة، المميزة، وأكشن بالعربي',
    resources: ['catalog'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'arabic_trending_movies',
            name: 'الأفلام الرائجة (عربي)'
        },
        {
            type: 'series',
            id: 'arabic_trending_series',
            name: 'المسلسلات الرائجة (عربي)'
        },
        {
            type: 'movie',
            id: 'arabic_now_playing_movies',
            name: 'الأفلام الجديدة حالياً (عربي)'
        },
        {
            type: 'series',
            id: 'arabic_on_the_air_series',
            name: 'المسلسلات الجديدة حالياً (عربي)'
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

builder.defineCatalogHandler(async function(args) {
    try {
        let url = '';
        
        if (args.type === 'movie' && args.id === 'arabic_trending_movies') {
            url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'series' && args.id === 'arabic_trending_series') {
            url = `https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'movie' && args.id === 'arabic_now_playing_movies') {
            url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'series' && args.id === 'arabic_on_the_air_series') {
            url = `https://api.themoviedb.org/3/tv/on_the_air?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'movie' && args.id === 'arabic_top_rated_movies') {
            url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=ar-SA`;
        } else if (args.type === 'movie' && args.id === 'arabic_action_movies') {
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28&language=ar-SA`;
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
            description: item.overview || 'لا يوجد وصف متوفر لهذا العمل.'
        }));

        return { metas };
    } catch (error) {
        console.error("Error fetching data from TMDB:", error);
        return { metas: [] };
    }
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
