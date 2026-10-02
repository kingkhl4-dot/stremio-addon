const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
    console.error("TMDB_API_KEY is missing");
}

const builder = new addonBuilder({
    id: "org.mycustomarabicaddon",
    version: "4.0.0",
    name: "إضافتي العربية الذكية",
    description: "مكتبة عربية للأفلام والمسلسلات والمنصات مع بيانات TMDB و IMDb",
    resources: ["catalog", "meta"],
    types: ["movie", "series"],

    catalogs: [
        // ===== المنصات =====
        { type: "movie", id: "netflix_movies", name: "🔴 Netflix - أفلام" },
        { type: "series", id: "netflix_series", name: "🔴 Netflix - مسلسلات" },

        { type: "movie", id: "prime_movies", name: "🔵 Prime Video - أفلام" },
        { type: "series", id: "prime_series", name: "🔵 Prime Video - مسلسلات" },

        { type: "movie", id: "disney_movies", name: "🏰 Disney+ - أفلام" },
        { type: "series", id: "disney_series", name: "🏰 Disney+ - مسلسلات" },

        { type: "movie", id: "shahid_movies", name: "🟢 Shahid - أفلام" },
        { type: "series", id: "shahid_series", name: "🟢 Shahid - مسلسلات" },

        // ===== أفلام =====
        { type: "movie", id: "movie_trending", name: "🔥 رائج - أفلام" },
        { type: "movie", id: "movie_featured", name: "⭐ مميز - أفلام" },
        { type: "movie", id: "movie_new", name: "🆕 جديد - أفلام" },
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
        { type: "series", id: "series_new", name: "🆕 جديد - مسلسلات" },
        { type: "series", id: "series_action", name: "💥 أكشن - مسلسلات" },
        { type: "series", id: "series_crime", name: "🔪 جريمة - مسلسلات" },
        { type: "series", id: "series_mystery", name: "🔍 غموض - مسلسلات" },
        { type: "series", id: "series_scifi", name: "🚀 خيال علمي - مسلسلات" },
        { type: "series", id: "series_comedy", name: "😂 كوميدي - مسلسلات" },
        { type: "series", id: "series_documentary", name: "🎥 وثائقيات - مسلسلات" }
    ]
});

const BASE = "https://api.themoviedb.org/3";
const REGION = "SA";

// ========================================
// TMDB
// ========================================

async function tmdb(path, params = {}) {
    const query = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: "ar-SA",
        ...params
    });

    const response = await fetch(`${BASE}${path}?${query}`);

    if (!response.ok) {
        throw new Error(`TMDB ${response.status}: ${path}`);
    }

    return response.json();
}

// ========================================
// البحث عن Provider ID داخل السعودية
// بدل ما نخمن أرقام Netflix / Shahid / الخ
// ========================================

let providerCache = null;

async function loadProviders() {
    if (providerCache) return providerCache;

    const [movieData, tvData] = await Promise.all([
        tmdb("/watch/providers/movie", { watch_region: REGION }),
        tmdb("/watch/providers/tv", { watch_region: REGION })
    ]);

    providerCache = {
        movie: movieData.results || [],
        series: tvData.results || []
    };

    return providerCache;
}

function normalizeName(name = "") {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findProvider(list, names) {
    for (const wanted of names) {
        const exact = list.find(
            p => normalizeName(p.provider_name) === normalizeName(wanted)
        );

        if (exact) return exact.provider_id;
    }

    for (const wanted of names) {
        const partial = list.find(
            p =>
                normalizeName(p.provider_name).includes(normalizeName(wanted)) ||
                normalizeName(wanted).includes(normalizeName(p.provider_name))
        );

        if (partial) return partial.provider_id;
    }

    return null;
}

async function getPlatformProvider(type, platform) {
    const providers = await loadProviders();
    const list = providers[type] || [];

    const aliases = {
        netflix: ["Netflix"],
        prime: ["Amazon Prime Video", "Prime Video"],
        disney: ["Disney Plus", "Disney+"],
        shahid: ["Shahid VIP", "Shahid"]
    };

    return findProvider(list, aliases[platform] || []);
}

// ========================================
// إعداد الكتالوج
// ========================================

async function getCatalogSource(type, id) {

    // ===== مكتبات المنصات =====

    const platformMatch = id.match(
        /^(netflix|prime|disney|shahid)_(movies|series)$/
    );

    if (platformMatch) {
        const platform = platformMatch[1];

        const providerId = await getPlatformProvider(type, platform);

        if (!providerId) {
            console.log(`Provider not found: ${platform} / ${type}`);
            return null;
        }

        return {
            path: type === "movie"
                ? "/discover/movie"
                : "/discover/tv",

            params: {
                watch_region: REGION,
                with_watch_providers: String(providerId),
                sort_by: "popularity.desc",
                include_adult: "false"
            }
        };
    }

    // ===== الأفلام =====

    if (type === "movie") {

        if (id === "movie_trending") {
            return {
                path: "/trending/movie/week",
                params: {}
            };
        }

        if (id === "movie_featured") {
            return {
                path: "/discover/movie",
                params: {
                    sort_by: "vote_average.desc",
                    "vote_count.gte": "1000"
                }
            };
        }

        if (id === "movie_new") {
            const today = new Date().toISOString().slice(0, 10);

            return {
                path: "/discover/movie",
                params: {
                    sort_by: "primary_release_date.desc",
                    "primary_release_date.lte": today,
                    "vote_count.gte": "5"
                }
            };
        }

        const genres = {
            movie_action: "28",
            movie_crime: "80",
            movie_thriller: "53",
            movie_mystery: "9648",
            movie_horror: "27",
            movie_scifi: "878",
            movie_comedy: "35",
            movie_documentary: "99"
        };

        if (genres[id]) {
            return {
                path: "/discover/movie",
                params: {
                    with_genres: genres[id],
                    sort_by: "popularity.desc"
                }
            };
        }
    }

    // ===== المسلسلات =====

    if (type === "series") {

        if (id === "series_trending") {
            return {
                path: "/trending/tv/week",
                params: {}
            };
        }

        if (id === "series_featured") {
            return {
                path: "/discover/tv",
                params: {
                    sort_by: "vote_average.desc",
                    "vote_count.gte": "500"
                }
            };
        }

        if (id === "series_new") {
            const today = new Date().toISOString().slice(0, 10);

            return {
                path: "/discover/tv",
                params: {
                    sort_by: "first_air_date.desc",
                    "first_air_date.lte": today,
                    "vote_count.gte": "5"
                }
            };
        }

        const genres = {
            series_action: "10759",
            series_crime: "80",
            series_mystery: "9648",
            series_scifi: "10765",
            series_comedy: "35",
            series_documentary: "99"
        };

        if (genres[id]) {
            return {
                path: "/discover/tv",
                params: {
                    with_genres: genres[id],
                    sort_by: "popularity.desc"
                }
            };
        }
    }

    return null;
}

// ========================================
// جلب 5 صفحات = حتى 100 نتيجة
// ========================================

async function fetchCatalogPages(source, startPage = 1) {
    const pages = [];

    for (let i = 0; i < 5; i++) {
        pages.push(
            tmdb(source.path, {
                ...source.params,
                page: String(startPage + i),
                include_adult: "false"
            })
        );
    }

    const results = await Promise.allSettled(pages);

    const items = [];

    for (const result of results) {
        if (
            result.status === "fulfilled" &&
            Array.isArray(result.value.results)
        ) {
            items.push(...result.value.results);
        }
    }

    // إزالة التكرار
    const unique = [];
    const seen = new Set();

    for (const item of items) {
        if (!item.id || seen.has(item.id)) continue;
        seen.add(item.id);
        unique.push(item);
    }

    return unique;
}

// ========================================
// IMDb ID
// ========================================

const externalIdCache = new Map();

async function getIMDbId(type, tmdbId) {
    const key = `${type}:${tmdbId}`;

    if (externalIdCache.has(key)) {
        return externalIdCache.get(key);
    }

    try {
        let imdbId = null;

        if (type === "movie") {
            const data = await tmdb(`/movie/${tmdbId}/external_ids`);
            imdbId = data.imdb_id || null;
        } else {
            const data = await tmdb(`/tv/${tmdbId}/external_ids`);
            imdbId = data.imdb_id || null;
        }

        externalIdCache.set(key, imdbId);
        return imdbId;

    } catch (error) {
        console.error("IMDb ID error:", tmdbId, error.message);
        externalIdCache.set(key, null);
        return null;
    }
}

// ========================================
// تحويل النتيجة إلى Meta Preview
// ========================================

async function makeCatalogMeta(item, type) {
    const imdbId = await getIMDbId(type, item.id);

    // إذا توفر IMDb نستخدمه
    // حتى تتعرف إضافات Stremio الأخرى على نفس العمل
    const stremioId = imdbId || `tmdb:${item.id}`;

    const date =
        item.release_date ||
        item.first_air_date ||
        "";

    return {
        id: stremioId,
        type,

        name:
            item.title ||
            item.name ||
            item.original_title ||
            item.original_name ||
            "بدون عنوان",

        poster: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : undefined,

        background: item.backdrop_path
            ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
            : undefined,

        description:
            item.overview ||
            "لا يوجد وصف عربي متوفر لهذا العمل.",

        releaseInfo:
            date ? date.substring(0, 4) : undefined
    };
}

// ========================================
// Catalog Handler
// ========================================

builder.defineCatalogHandler(async args => {
    try {
        const source = await getCatalogSource(args.type, args.id);

        if (!source) {
            return { metas: [] };
        }

        const skip = Number(args.extra?.skip || 0);

        // كل دفعة عندنا 100 نتيجة
        const startPage = Math.floor(skip / 100)
