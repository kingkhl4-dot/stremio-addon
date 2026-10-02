const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

// مفتاح TMDB الخاص بك
const TMDB_API_KEY = "c24438dae5c806e30d36966e4bc6d3a9";

const builder = new addonBuilder({
    id: 'org.mycustomarabicaddon',
    version: '2.4.0',
    name: 'إضافتي العربية الذكية',
    description: 'إضافة مخصصة مرتبة حسب (رائج، جديد، مميز) مع دعم كامل لسورسات التشغيل',
    resources: ['catalog', 'meta'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'trending_movies',
            name: 'رائج (أفلام)'
        },
        {
            type: 'movie',
            id: 'new_movies',
            name: 'جديد (أفلام)'
        },
        {
            type: 'movie',
            id: 'popular_movies',
            name: 'مميز (أفلام)'
        },
        {
            type: 'series',
            id: 'trending_series',
            name: 'رائج (مسلسلات)'
        },
        {
            type: 'series',
            id: 'new_series',
            name: 'جديد (مسلسلات)'
        },
        {
            type: 'series',
            id: 'popular_series',
            name: 'مميز (مسلسلات)'
        }
    ]
});

// معالج القوائم (رائج، جديد، مميز)
builder.defineCatalogHandler(async function(args) {
    try {
        let url = '';
        const key = TMDB_API_KEY;
        
        if (args.type === 'movie') {
            if (args.id === 'trending_movies') {
                url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${key}&language=ar-SA`;
            } else if (args.id === 'new_movies') {
                url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${key}&language=ar-SA`;
            } else if (args.id === 'popular_movies') {
                url = `https://api.themoviedb.org/3/movie/popular?api_key=${key}&language=ar-SA`;
            }
        } else if (args.type === 'series') {
            if (args.id === 'trending_series') {
                url = `https://api.themoviedb.org/3/trending/tv/week?api_key=${key}&language=ar-SA`;
            } else if (args.id === 'new_series') {
                url = `https://api.themoviedb.org/3/tv/on_the_air?api_key=${key}&language=ar-SA`;
            } else if (args.id === 'popular_series') {
                url = `https://api.themoviedb.org/3/tv/popular?api_key=${key}&language=ar-SA`;
            }
        }

        if (!url) {
            return { metas: [] };
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results) {
            return { metas: [] };
        }

        // جلب معرفات IMDb لضمان ظهور سورسات التشغيل والتورنت
        const metas = await Promise.all(data.results.map(async (item) => {
            let imdbId = null;
            try {
                if (args.type === 'movie') {
                    const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${item.id}?api_key=${key}`);
                    const detailData = await detailRes.json();
                    imdbId = detailData.imdb_id;
                } else {
                    const extRes = await fetch(`https://api.themoviedb.org/3/tv/${item.id}/external_ids?api_key=${key}`);
                    const extData = await extRes.json();
                    imdbId = extData.imdb_id;
                }
            } catch (e) {
                // تجاوز خطأ المعرف الفردي إن وجد
            }

            return {
                id: imdbId || `tmdb:${item.id}`,
                type: args.type,
                name: item.title || item.name || 'بدون عنوان',
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/300x450.png?text=No+Poster',
                description: item.overview || 'لا يوجد وصف متوفر لهذا العمل.'
            };
        }));

        return { metas };
    } catch (error) {
        console.error("Error fetching catalog from TMDB:", error);
        return { metas: [] };
    }
});

// معالج التفاصيل لدعم المعرفات وعرض تفاصيل العمل بدقة
builder.defineMetaHandler(async function(args) {
    try {
        let tmdbId = null;
        let mediaType = args.type;
        const key = TMDB_API_KEY;

        if (args.id.startsWith('tt')) {
            const findRes = await fetch(`https://api.themoviedb.org/3/find/${args.id}?api_key=${key}&external_source=imdb_id`);
            const findData = await findRes.json();
            const results = mediaType === 'movie' ? findData.movie_results : findData.tv_results;
            if (results && results.length > 0) {
                tmdbId = results[0].id;
            }
        } else {
            tmdbId = args.id.replace('tmdb:', '');
        }

        // التصحيح هنا: التحقق من عدم وجود المعرف لإيقاف العملية إن لم يكن موجوداً
        if (!tmdbId) {
            return { meta: null };
        }

        const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${key}&language=ar-SA`;
        const response = await fetch(url);
        const item = await response.json();

        if (!item || item.success === false) {
            return { meta: null };
        }

        const meta = {
            id: args.id,
            type: mediaType,
            name: item.title || item.name || 'بدون عنوان',
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/300x450.png?text=No+Poster',
            background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : undefined,
            description: item.overview || 'لا يوجد وصف متوفر لهذا العمل.',
            releaseInfo: (item.release_date || item.first_air_date || '').substring(0, 4),
            genres: item.genres ? item.genres.map(g => g.name) : [],
            imdbRating: item.vote_average ? item.vote_average.toFixed(1) : undefined
        };

        return { meta };
    } catch (error) {
        console.error("Error fetching meta from TMDB:", error);
        return { meta: null };
    }
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
