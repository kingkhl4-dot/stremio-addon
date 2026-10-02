const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const REGION = "SA";

// ========================================
// Catalogs
// ========================================

const catalogs = [
    // المنصات - أفلام
    { type: "movie", id: "netflix_movies", name: "🔴 Netflix - أفلام" },
    { type: "movie", id: "prime_movies", name: "🔵 Prime Video - أفلام" },
    { type: "movie", id: "disney_movies", name: "🏰 Disney+ - أفلام" },
    { type: "movie", id: "shahid_movies", name: "🟢 Shahid - أفلام" },

    // المنصات - مسلسلات
    { type: "series", id: "netflix_series", name: "🔴 Netflix - مسلسلات" },
    { type: "series", id: "prime_series", name: "🔵 Prime Video - مسلسلات" },
    { type: "series", id: "disney_series", name: "🏰 Disney+ - مسلسلات" },
    { type: "series", id: "shahid_series", name: "🟢 Shahid - مسلسلات" },

    // الأفلام
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

    // المسلسلات
    { type: "series", id: "series_trending", name: "🔥 رائج - مسلسلات" },
    { type: "series", id: "series_featured", name: "⭐ مميز - مسلسلات" },
    { type: "series", id: "series_new", name: "🆕 جديد - مسلسلات" },
    { type: "series", id: "series_action", name: "💥 أكشن - مسلسلات" },
    { type: "series", id: "series_crime", name: "🔪 جريمة - مسلسلات" },
    { type: "series", id: "series_mystery", name: "🔍 غموض - مسلسلات" },
    { type: "series", id: "series_scifi", name: "🚀 خيال علمي - مسلسلات" },
    { type: "series", id: "series_comedy", name: "😂 كوميدي - مسلسلات" },
    { type: "series", id: "series_documentary", name: "🎥 وثائقيات - مسلسلات" }
].map(catalog => ({
    ...catalog,
    extra: [
        {
            name: "skip",
            isRequired: false
        }
    ]
}));

// ========================================
// Manifest
// ========================================

const builder = new addonBuilder({
    id: "org.mycustomarabicaddon",
    version: "4.1.0",
    name: "إضافتي العربية الذكية",
    description: "مكتبة عربية للأفلام والمسلسلات مع معلومات عربية",
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    catalogs
});

// ========================================
// TMDB
// ========================================

async function tmdb(path, params = {}) {
    if (!TMDB_API_KEY) {
        throw new Error("TMDB_API_KEY غير موجود في Render");
    }

    const query = new URLSearchParams();

    query.set("api_key", TMDB_API_KEY);

    // إذا لم نحدد لغة، العربية هي الافتراضية
    query.set(
        "language",
        params.language || "ar-SA"
    );

    for (const [key, value] of Object.entries(params)) {
        if (
            key !== "language" &&
            value !== undefined &&
            value !== null
        ) {
            query.set(key, String(value));
        }
    }

    const response = await fetch(
        `${TMDB_BASE}${path}?${query.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            `TMDB error ${response.status} - ${path}`
        );
    }

    return response.json();
}

// ========================================
// مزودي المشاهدة
// ========================================

let providersCache = null;

async function loadProviders() {
    if (providersCache) {
        return providersCache;
    }

    const [movies, series] = await Promise.all([
        tmdb("/watch/providers/movie", {
            watch_region: REGION
        }),
        tmdb("/watch/providers/tv", {
            watch_region: REGION
        })
    ]);

    providersCache = {
        movie: movies.results || [],
        series: series.results || []
    };

    return providersCache;
}

function cleanName(value = "") {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function findProvider(list, names) {
    for (const wanted of names) {
        const exact = list.find(provider =>
            cleanName(provider.provider_name) ===
            cleanName(wanted)
        );

        if (exact) {
            return exact.provider_id;
        }
    }

    for (const wanted of names) {
        const partial = list.find(provider => {
            const providerName =
                cleanName(provider.provider_name);

            const wantedName =
                cleanName(wanted);

            return (
                providerName.includes(wantedName) ||
                wantedName.includes(providerName)
            );
        });

        if (partial) {
            return partial.provider_id;
        }
    }

    return null;
}

async function getProviderId(type, platform) {
    const providers = await loadProviders();
    const list = providers[type] || [];

    const names = {
        netflix: ["Netflix"],

        prime: [
            "Amazon Prime Video",
            "Prime Video"
        ],

        disney: [
            "Disney Plus",
            "Disney+"
        ],

        shahid: [
            "Shahid VIP",
            "Shahid"
        ]
    };

    return findProvider(
        list,
        names[platform] || []
    );
}

// ========================================
// مصدر الكتالوج
// ========================================

async function getCatalogSource(type, id) {
    const platformMatch = id.match(
        /^(netflix|prime|disney|shahid)_(movies|series)$/
    );

    if (platformMatch) {
        const platform = platformMatch[1];

        const providerId =
            await getProviderId(
                type,
                platform
            );

        if (!providerId) {
            console.log(
                `Provider not found: ${platform}`
            );

            return null;
        }

        return {
            path:
                type === "movie"
                    ? "/discover/movie"
                    : "/discover/tv",

            params: {
                watch_region: REGION,
                with_watch_providers: providerId,
                sort_by: "popularity.desc",
                include_adult: "false"
            }
        };
    }

    // ====================================
    // أفلام
    // ====================================

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
                    "vote_count.gte": 1000,
                    include_adult: "false"
                }
            };
        }

        if (id === "movie_new") {
            const today = new Date()
                .toISOString()
                .slice(0, 10);

            return {
                path: "/discover/movie",
                params: {
                    sort_by:
                        "primary_release_date.desc",

                    "primary_release_date.lte":
                        today,

                    "vote_count.gte": 5,
                    include_adult: "false"
                }
            };
        }

        const genres = {
            movie_action: 28,
            movie_crime: 80,
            movie_thriller: 53,
            movie_mystery: 9648,
            movie_horror: 27,
            movie_scifi: 878,
            movie_comedy: 35,
            movie_documentary: 99
        };

        if (genres[id]) {
            return {
                path: "/discover/movie",

                params: {
                    with_genres: genres[id],
                    sort_by: "popularity.desc",
                    include_adult: "false"
                }
            };
        }
    }

    // ====================================
    // مسلسلات
    // ====================================

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
                    "vote_count.gte": 500
                }
            };
        }

        if (id === "series_new") {
            const today = new Date()
                .toISOString()
                .slice(0, 10);

            return {
                path: "/discover/tv",

                params: {
                    sort_by:
                        "first_air_date.desc",

                    "first_air_date.lte":
                        today,

                    "vote_count.gte": 5
                }
            };
        }

        const genres = {
            series_action: 10759,
            series_crime: 80,
            series_mystery: 9648,
            series_scifi: 10765,
            series_comedy: 35,
            series_documentary: 99
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
// جلب حتى 100 عمل
// ========================================

async function fetchPages(source, startPage) {
    const requests = [];

    for (
        let page = startPage;
        page < startPage + 5;
        page++
    ) {
        requests.push(
            tmdb(source.path, {
                ...source.params,
                page
            })
        );
    }

    const responses =
        await Promise.allSettled(requests);

    const all = [];

    for (const response of responses) {
        if (
            response.status === "fulfilled" &&
            Array.isArray(response.value.results)
        ) {
            all.push(...response.value.results);
        }
    }

    const unique = [];
    const used = new Set();

    for (const item of all) {
        if (!item.id) continue;
        if (!item.poster_path) continue;
        if (used.has(item.id)) continue;

        used.add(item.id);
        unique.push(item);
    }

    return unique.slice(0, 100);
}

// ========================================
// IMDb
// ========================================

const imdbCache = new Map();

async function getImdbId(type, tmdbId) {
    const key = `${type}:${tmdbId}`;

    if (imdbCache.has(key)) {
        return imdbCache.get(key);
    }

    try {
        const path =
            type === "movie"
                ? `/movie/${tmdbId}/external_ids`
                : `/tv/${tmdbId}/external_ids`;

        const data = await tmdb(path);

        const imdbId =
            data.imdb_id || null;

        imdbCache.set(key, imdbId);

        return imdbId;
    } catch (error) {
        console.error(
            "IMDb lookup error:",
            tmdbId,
            error.message
        );

        imdbCache.set(key, null);

        return null;
    }
}

// ========================================
// تحويل نتيجة الكتالوج
// ========================================

async function makeMetaPreview(item, type) {
    const imdbId =
        await getImdbId(
            type,
            item.id
        );

    const date =
        item.release_date ||
        item.first_air_date ||
        "";

    return {
        id:
            imdbId ||
            `tmdb:${item.id}`,

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
            date
                ? date.substring(0, 4)
                : undefined
    };
}

// ========================================
// Catalog Handler
// ========================================

builder.defineCatalogHandler(async args => {
    try {
        const source =
            await getCatalogSource(
                args.type,
                args.id
            );

        if (!source) {
            return { metas: [] };
        }

        const skip =
            Number(args.extra?.skip || 0);

        const startPage =
            Math.floor(skip / 100) * 5 + 1;

        const items =
            await fetchPages(
                source,
                startPage
            );

        const metas = [];

        // دفعات صغيرة حتى ما نضغط على TMDB
        for (
            let index = 0;
            index < items.length;
            index += 10
        ) {
            const batch =
                items.slice(
                    index,
                    index + 10
                );

            const converted =
                await Promise.all(
                    batch.map(item =>
                        makeMetaPreview(
                            item,
                            args.type
                        )
                    )
                );

            metas.push(...converted);
        }

        return { metas };

    } catch (error) {
        console.error(
            "Catalog error:",
            error
        );

        return { metas: [] };
    }
});

// ========================================
// IMDb -> TMDB
// ========================================

async function imdbToTmdb(imdbId, type) {
    const data = await tmdb(
        `/find/${imdbId}`,
        {
            external_source: "imdb_id"
        }
    );

    if (type === "movie") {
        return (
            data.movie_results?.[0] ||
            null
        );
    }

    return (
        data.tv_results?.[0] ||
        null
    );
}

// ========================================
// Meta Handler
// المعلومات بالعربي أولاً
// ========================================

builder.defineMetaHandler(async args => {
    try {
        let tmdbId = null;

        if (args.id.startsWith("tt")) {
            const found =
                await imdbToTmdb(
                    args.id,
                    args.type
                );

            if (!found) {
                return { meta: null };
            }

            tmdbId = found.id;

        } else if (
            args.id.startsWith("tmdb:")
        ) {
            tmdbId =
                args.id.split(":")[1];

        } else {
            return { meta: null };
        }

        const mediaType =
            args.type === "series"
                ? "tv"
                : "movie";

        // ====================================
        // النسخة العربية
        // ====================================

        const arabicData = await tmdb(
            `/${mediaType}/${tmdbId}`,
            {
                language: "ar",
                append_to_response:
                    "external_ids,credits"
            }
        );

        // ====================================
        // الإنجليزية احتياط فقط
        // ====================================

        let englishData = null;

        if (
            !arabicData.overview ||
            !(arabicData.title || arabicData.name)
        ) {
            englishData = await tmdb(
                `/${mediaType}/${tmdbId}`,
                {
                    language: "en-US",
                    append_to_response:
                        "external_ids,credits"
                }
            );
        }

        const data = arabicData;

        // الوصف العربي له الأولوية
        if (
            !data.overview &&
            englishData?.overview
        ) {
            data.overview =
                englishData.overview;
        }

        // العنوان العربي له الأولوية
        if (
            !(data.title || data.name) &&
            englishData
        ) {
            if (mediaType === "movie") {
                data.title =
                    englishData.title;
            } else {
                data.name =
                    englishData.name;
            }
        }

        const imdbId =
            data.imdb_id ||
            data.external_ids?.imdb_id ||
            null;

        const date =
            data.release_date ||
            data.first_air_date ||
            "";

        // التصنيفات من الطلب العربي
        const genres =
            Array.isArray(data.genres)
                ? data.genres.map(
                    genre => genre.name
                )
                : [];

        const cast =
            data.credits?.cast
                ? data.credits.cast
                    .slice(0, 10)
                    .map(
                        person =>
                            person.name
                    )
                : [];

        const directors =
            data.credits?.crew
                ? data.credits.crew
                    .filter(
                        person =>
                            person.job ===
                            "Director"
                    )
                    .slice(0, 3)
                    .map(
                        person =>
                            person.name
                    )
                : [];

        const meta = {
            id:
                imdbId ||
                `tmdb:${tmdbId}`,

            type: args.type,

            // عنوان TMDB العربي أولاً
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

            // الوصف العربي
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
                typeof data.vote_average ===
                "number"
                    ? data.vote_average.toFixed(1)
                    : undefined,

            runtime:
                data.runtime
                    ? `${data.runtime} min`
                    : undefined
        };

        return { meta };

    } catch (error) {
        console.error(
            "Meta error:",
            error
        );

        return { meta: null };
    }
});

// ========================================
// تشغيل السيرفر
// ========================================

serveHTTP(
    builder.getInterface(),
    {
        port:
            process.env.PORT ||
            7000
    }
);
