import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({
    message: "Groq AI Server Running",
  });
});

app.get("/api/quote/:ticker", async (req, res) => {
  try {
    const { ticker } = req.params;

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    );

    const json = await response.json();
    const meta = json?.chart?.result?.[0]?.meta;

    if (!meta) {
      throw new Error("Yahoo Finance data not found");
    }

    res.json({
      price: meta.regularMarketPrice,
      prev: meta.chartPreviousClose ?? meta.previousClose,
      vol: meta.regularMarketVolume,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen,
    });
  } catch (error) {
    console.error("YAHOO ERROR:", error.message);

    res.status(500).json({
      error: "Failed to fetch quote",
    });
  }
});

app.post("/api/stock-insight", async (req, res) => {
  try {
    const { selectedStocks, range, comparisonStats } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content:
            "You are a financial analyst specializing in Indonesian banking stocks.",
        },

        {
          role: "user",
          content: `
            Generate insight in Bahasa Indonesia.

            Comparison period:
            ${range}

            Stocks:
            ${selectedStocks.join(", ")}

            Data:
            ${JSON.stringify(comparisonStats, null, 2)}

            Rules:
            - Maximum 4 sentences
            - Explain top performer
            - Explain weakest performer
            - Mention volatility
            - Mention win rate
            - Objective tone
            - Do not give buy/sell recommendation
            `,
        },
      ],

      temperature: 0.5,
    });

    const insight =
      completion?.choices?.[0]?.message?.content ||
      "AI insight unavailable";

    res.json({
      insight,
    });
  } catch (error) {
    console.error("GROQ ERROR:", error);

    res.status(500).json({
      error:
        error?.response?.data?.error?.message ||
        error?.message ||
        "Failed to generate AI insight",
    });
  }
});

const NEWS_CACHE = {
  data: null,
  updatedAt: 0,
};

const NEWS_CACHE_TTL = 5 * 60 * 1000;

app.get("/api/news", async (req, res) => {
  try {
    const now = Date.now();

    if (NEWS_CACHE.data && now - NEWS_CACHE.updatedAt < NEWS_CACHE_TTL) {
      return res.json(NEWS_CACHE.data);
    }

    if (!process.env.NEWS_API_KEY) {
      return res.json([
        {
          title: "NEWS_API_KEY belum diset",
          description:
            "Tambahkan NEWS_API_KEY di file .env server untuk mengaktifkan market news real-time.",
          source: { name: "Local Backend" },
          publishedAt: new Date().toISOString(),
          url: "",
        },
      ]);
    }

    const queries = [
      "Indonesia stock market",
      "Jakarta Composite",
      "IHSG",
      "Indonesian banks",
      "Bank Central Asia",
      "Bank Rakyat Indonesia",
      "Bank Mandiri",
      "Bank Negara Indonesia",
      "BBCA",
      "BBRI",
      "BMRI",
      "BBNI",
    ];

    const articlesMap = new Map();

    for (const query of queries) {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", query);
      url.searchParams.set("language", "en");
      url.searchParams.set("sortBy", "publishedAt");
      url.searchParams.set("pageSize", "5");
      url.searchParams.set("apiKey", process.env.NEWS_API_KEY);

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "News API request failed");
      }

      for (const item of data.articles || []) {
        if (!item.title || !item.url) continue;

        articlesMap.set(item.url, {
          title: item.title,
          description: item.description,
          content: item.content,
          url: item.url,
          publishedAt: item.publishedAt,
          source: item.source,
          urlToImage: item.urlToImage,
        });
      }
    }

    let articles = Array.from(articlesMap.values());

    articles = articles
      .filter((item) => {
        const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();

        return (
          text.includes("indonesia") ||
          text.includes("jakarta") ||
          text.includes("ihsg") ||
          text.includes("bbca") ||
          text.includes("bbri") ||
          text.includes("bmri") ||
          text.includes("bbni") ||
          text.includes("bank") ||
          text.includes("stock") ||
          text.includes("market")
        );
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 24);

    if (articles.length === 0) {
      articles = [
        {
          title: "Belum ada market news yang cocok",
          description:
            "NewsAPI tidak mengembalikan artikel untuk query saat ini. Coba refresh beberapa saat lagi atau gunakan query global market.",
          source: { name: "Local Backend" },
          publishedAt: new Date().toISOString(),
          url: "",
        },
      ];
    }

    NEWS_CACHE.data = articles;
    NEWS_CACHE.updatedAt = now;

    res.json(articles);
  } catch (error) {
    console.error("News API Error:", error.message);

    res.status(500).json([
      {
        title: "Market news gagal dimuat",
        description:
          "Cek koneksi internet, NEWS_API_KEY, atau limit API. Backend tetap berjalan normal.",
        source: { name: "Local Backend" },
        publishedAt: new Date().toISOString(),
        url: "",
      },
    ]);
  }
});

app.listen(PORT, () => {
  console.log(`Groq AI server running on port ${PORT}`);
});

app.post("/api/portfolio-insight", async (req, res) => {
  try {
    const { allocations, metrics, normalizedWeights } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are an AI portfolio analyst specializing in Indonesian banking stocks.",
        },
        {
          role: "user",
          content: `
          Generate portfolio allocation insight in Bahasa Indonesia.

          Allocation:
          ${JSON.stringify(allocations, null, 2)}

          Normalized Weights:
          ${JSON.stringify(normalizedWeights, null, 2)}

          Portfolio Metrics:
          ${JSON.stringify(metrics, null, 2)}

          Rules:
          - Maksimal 4 kalimat
          - Jelaskan risk profile
          - Jelaskan saham yang terlalu dominan
          - Jelaskan apakah allocation sudah balanced atau terlalu concentrated
          - Jangan beri rekomendasi beli/jual
          - Boleh beri rebalancing suggestion secara objektif
          `,
        },
      ],
      temperature: 0.5,
    });

    res.json({
      insight:
        completion?.choices?.[0]?.message?.content ||
        "AI portfolio insight unavailable.",
    });
  } catch (error) {
    console.error("GROQ PORTFOLIO ERROR:", error);

    res.status(500).json({
      error:
        error?.response?.data?.error?.message ||
        error?.message ||
        "Failed to generate portfolio insight",
    });
  }
});