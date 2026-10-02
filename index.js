const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
    console.error("TMDB_API_KEY is missing");
}

const builder = new addonBuilder({
    id: "org.mycustomarabicaddon",
    version: "3.0.0",
    name: "إضافتي العربية الذكية",
    description: "كتالوج عربي للأفلام والمسلسلات مع التصنيفات والمعلومات الكاملة",
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: ["tmdb:"],

    catalogs: [
        // ===== أفلام =====
        { type: "movie", id: "movie_trending", name: "🔥 رائج - أفلام" },
        { type: "movie", id: "movie_featured", name: "⭐ مميز - أفلام" },
        { type: "movie", id: "movie_new", name: "🆕 أحدث الأفلام" },
        { type: "movie", id: "movie_action", name: "💥 أكشن - أفلام" },
        { type: "movie", id: "movie_crime", name: "🔪 جريمة - أفلام" },
        { type: "movie", id: "movie_thriller", name: "⚡ إثارة - أفلام" },
        { type: "movie", id: "movie_mystery", name: "🔍 غموض - أفلام" },
        { type: "movie", id: "movie_horror", name: "👻 رعب - أفلام" },
        { type: "movie", id: "movie_scifi", name: "🚀 خيال علمي - أفلام" },
        { type: "movie", id: "movie_comedy", name: "😂 كوميدي - أفلام" },
        { type: "movie", id: "movie_documentary", name: "🎥 وثائقيات - أفلام" },

        // ===== مسلسلات =====
        { type: "series", id: "series_trending", name: "🔥 رائج - مسلسلات" },
        { type: "series", id: "series_featured", name: "⭐ مميز - مسلسلات" },
        { type: "series", id: "series_new", name: "🆕 أحدث المسلسلات" },
        { type: "series", id: "series_action", name: "💥 أكشن - مسلسلات" },
        { type: "series", id: "series_crime", name: "🔪 جريمة - مسلسلات" },
        { type: "series", id: "series_mystery", name: "🔍 غموض - مسلسلات" },
        { type: "series", id: "series_scifi", name: "🚀 خيال علمي - مسلسلات" },
        { type: "series", id: "series_comedy", name: "😂 كوميدي - مسلسلات" },
        { type: "series", id: "series_documentary", name: "🎥 وثائقيات - مسلسلات" }
    ]
});

const BASE = "https://api.themoviedb.org/3";

// ========================================
// جلب بيانات TMDB
// ========================================

async function tmdb(path, params = {}) {
    const query = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: "ar-SA",
        ...params
    });

    const response = await fetch(`${BASE}${path}?${query}`);

    if (!response.ok) {
        throw new Error(`TMDB error ${response.status}`);
    }

    return response.json();
}

// ========================================
// تحويل بيانات TMDB إلى Stremio
// ========================================

function toMeta(item, type) {
    const title =
        item.title ||
        item.name ||
        item.original_title ||
        item.original_name ||
        "بدون عنوان";

    const date =
        item.release_date ||
        item.first_air_date ||
        "";

    return {
        id: `tmdb:${item.id}`,
        type,
        name: title,

        poster: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : undefined,

        background: item.backdrop_path
            ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
            : undefined,

        description:
            item.overview ||
            "لا يوجد وصف عربي متوفر لهذا العمل.",

        releaseInfo: date
            ? date.substring(0, 4)
            : undefined
    };
}

// ========================================
// تحديد رابط الكتالوج
// ========================================

function getCatalogRequest(type, id) {

    // ===== الأفلام =====

    if (type === "movie") {

        if (id === "movie_trending")
            return {
                path: "/trending/movie/week",
                params: {}
            };

        if (id === "movie_featured")
            return {
                path: "/discover/movie",
                params: {
                    sort_by: "vote_average.desc",
                    "vote_count.gte": "1000"
                }
            };

        if (id === "movie_new")
            return {
                path: "/discover/movie",
                params: {
                    sort_by: "primary_release_date.desc",
                    "vote_count.gte": "20"
                }
            };

        const movieGenres = {
            movie_action: 28,
            movie_crime: 80,
            movie_thriller: 53,
            movie_mystery: 9648,
            movie_horror: 27,
            movie_scifi: 878,
            movie_comedy: 35,
            movie_documentary: 99
        };

        if (movieGenres[id]) {
            return {
                path: "/discover/movie",
                params: {
                    with_genres: String(movieGenres[id]),
                    sort_by: "popularity.desc"
                }
            };
        }
    }

    // ===== المسلسلات =====

    if (type === "series") {

        if (id === "series_trending")
            return {
                path: "/trending/tv/week",
                params: {}
            };

        if (id === "series_featured")
            return {
                path: "/discover/tv",
                params: {
                    sort_by: "vote_average.desc",
                    "vote_count.gte": "500"
                }
            };

        if (id === "series_new")
            return {
                path: "/discover/tv",
                params: {
                    sort_by: "first_air_date.desc",
                    "vote_count.gte": "10"
                }
            };

        const seriesGenres = {
            series_action: 10759,
            series_crime: 80,
            series_mystery: 9648,
            series_scifi: 10765,
            series_comedy: 35,
            series_documentary: 99
        };

        if (seriesGenres[id]) {
            return {
                path: "/discover/tv",
                params: {
                    with_genres: String(seriesGenres[id]),
                    sort_by: "popularity.desc"
                }
            };
        }
    }

    return null;
}

// ========================================
// CATALOG
// ========================================

builder.defineCatalogHandler(async args => {
    try {

        const request = getCatalogRequest(args.type, args.id);

        if (!request) {
            return { metas: [] };
        }

        // Stremio يستخدم skip عند تحميل المزيد
        const skip = Number(args.extra?.skip || 0);

        // TMDB = 20 نتيجة في الصفحة
        const page = Math.floor(skip / 20) + 1;

        const data = await tmdb(
            request.path,
            {
                ...request.params,
                page: String(page),
                include_adult: "false"
            }
        );

        if (!Array.isArray(data.results)) {
            return { metas: [] };
        }

        const metas = data.results
            .filter(item => item.poster_path)
            .map(item => toMeta(item, args.type));

        return { metas };

    } catch (error) {
        console.error("Catalog error:", error);
        return { metas: [] };
    }
});

// ========================================
// META
// هذا الجزء يحل مشكلة:
// "لم يتم العثور على معلومات"
// ========================================

builder.defineMetaHandler(async args => {
    try {

        if (!args.id.startsWith("tmdb:")) {
            return { meta: null };
        }

        const tmdbId = args.id.replace("tmdb:", "");

        const mediaType =
            args.type === "series"
                ? "tv"
                : "movie";

        const data = await tmdb(
            `/${mediaType}/${tmdbId}`,
            {
                append_to_response:
                    "external_ids,credits,videos"
            }
        );

        const date =
            data.release_date ||
            data.first_air_date ||
            "";

        const genres = Array.isArray(data.genres)
            ? data.genres.map(g => g.name)
            : [];

        const directors =
            args.type === "movie" &&
            data.credits?.crew
                ? data.credits.crew
                    .filter(x => x.job === "Director")
                    .slice(0, 3)
                    .map(x => x.name)
                : [];

        const cast =
            data.credits?.cast
                ? data.credits.cast
                    .slice(0, 10)
                    .map(x => x.name)
                : [];

        const meta = {
            id: args.id,
            type: args.type,

            name:
                data.title ||
                data.name ||
                data.original_title ||
                data.original_name ||
                "بدون عنوان",

            poster: data.poster_path
                ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
                : undefined,

            background: data.backdrop_path
                ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
                : undefined,

            description:
                data.overview ||
                "لا يوجد وصف عربي متوفر لهذا العمل.",

            releaseInfo:
                date
                    ? date.substring(0, 4)
                    : undefined,

            genres,

            cast,

            director: directors,

            imdbRating:
                data.vote_average
                    ? data.vote_average.toFixed(1)
                    : undefined,

            runtime:
                data.runtime
                    ? `${data.runtime} min`
                    : undefined
        };

        return { meta };

    } catch (error) {
        console.error("Meta error:", error);

        return {
            meta: null
        };
    }
});

// ========================================
// تشغيل السيرفر
// ========================================

serveHTTP(
    builder.getInterface(),
    {
        port: process.env.PORT || 7000
    }
);
