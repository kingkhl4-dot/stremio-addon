const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const TMDB_API_KEY = process.env.TMDB_API_KEY || "PUT_YOUR_TMDB_KEY_HERE";

const builder = new addonBuilder({
    id: "org.mycustomarabicaddon",
    version: "2.1.0",
    name: "إضافتي العربية الذكية",
    description: "أفلام ومسلسلات عربية: رائج، مميز، أكشن وأحدث الأعمال",
    resources: ["catalog"],
    types: ["movie", "series"],

    catalogs: [
        {
            type: "movie",
            id: "arabic_trending_movies",
            name: "🔥 رائج - أفلام"
        },
        {
            type: "movie",
            id: "arabic_featured_movies",
            name: "⭐ مميز - أفلام"
        },
        {
            type: "movie",
            id: "arabic_action_movies",
            name: "💥 أكشن - أفلام"
        },
        {
            type: "series",
            id: "arabic_trending_series",
            name: "🔥 رائج - مسلسلات"
        },
        {
            type: "series",
            id: "arabic_featured_series",
            name: "⭐ مميز - مسلسلات"
        },
        {
            type: "series",
            id: "arabic_action_series",
            name: "💥 أكشن - مسلسلات"
        }
    ]
});

builder.defineCatalogHandler(async function(args) {
    try {
        const base = "https://api.themoviedb.org/3";
        let url = "";

        // 🔥 رائج
        if (args.type === "movie" && args.id === "arabic_trending_movies") {
            url = `${base}/trending/movie/week?api_key=${TMDB_API_KEY}&language=ar-SA`;
        }

        else if (args.type === "series" && args.id === "arabic_trending_series") {
            url = `${base}/trending/tv/week?api_key=${TMDB_API_KEY}&language=ar-SA`;
        }

        // ⭐ مميز - الأعلى تقييمًا
        else if (args.type === "movie" && args.id === "arabic_featured_movies") {
            url = `${base}/movie/top_rated?api_key=${TMDB_API_KEY}&language=ar-SA&page=1`;
        }

        else if (args.type === "series" && args.id === "arabic_featured_series") {
            url = `${base}/tv/top_rated?api_key=${TMDB_API_KEY}&language=ar-SA&page=1`;
        }

        // 💥 أكشن
        else if (args.type === "movie" && args.id === "arabic_action_movies") {
            url = `${base}/discover/movie?api_key=${TMDB_API_KEY}&language=ar-SA&with_genres=28&sort_by=popularity.desc`;
        }

        else if (args.type === "series" && args.id === "arabic_action_series") {
            // TMDB: Action & Adventure = 10759 للمسلسلات
            url = `${base}/discover/tv?api_key=${TMDB_API_KEY}&language=ar-SA&with_genres=10759&sort_by=popularity.desc`;
        }

        else {
            return { metas: [] };
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`TMDB HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.results)) {
            return { metas: [] };
        }

        const metas = data.results.map(item => ({
            id: `tmdb:${item.id}`,
            type: args.type,

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
                item.release_date?.substring(0, 4) ||
                item.first_air_date?.substring(0, 4) ||
                ""
        }));

        return { metas };

    } catch (error) {
        console.error("TMDB Error:", error);
        return { metas: [] };
    }
});

serveHTTP(builder.getInterface(), {
    port: process.env.PORT || 7000
});
