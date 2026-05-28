import React, { useEffect, useMemo, useState, useCallback } from "react";
import "../styles/dashboard.css";
import "../styles/news.css";

const STOCK_FILTERS = [
  { key: "all", label: "All News" },
  { key: "BBCA", label: "BBCA" },
  { key: "BBRI", label: "BBRI" },
  { key: "BMRI", label: "BMRI" },
  { key: "BBNI", label: "BBNI" },
  { key: "IHSG", label: "IHSG" },
];

const STOCK_KEYWORDS = {
  BBCA: ["BBCA", "BANK CENTRAL ASIA", "BCA"],
  BBRI: ["BBRI", "BANK RAKYAT INDONESIA", "BRI"],
  BMRI: ["BMRI", "BANK MANDIRI", "MANDIRI"],
  BBNI: ["BBNI", "BANK NEGARA INDONESIA", "BNI"],
  IHSG: ["IHSG", "JAKARTA COMPOSITE", "IDX COMPOSITE"],
};

function formatDate(value) {
  if (!value) return "Unknown date";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getSentiment(article) {
  const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();

  const bullishWords = [
    "naik",
    "menguat",
    "positif",
    "laba naik",
    "profit",
    "dividen",
    "buy",
    "bullish",
    "growth",
    "solid",
    "rekor",
  ];

  const bearishWords = [
    "turun",
    "melemah",
    "negatif",
    "rugi",
    "sell",
    "bearish",
    "tekanan",
    "koreksi",
    "anjlok",
    "risiko",
  ];

  const bullishScore = bullishWords.reduce(
    (score, word) => score + (text.includes(word) ? 1 : 0),
    0
  );

  const bearishScore = bearishWords.reduce(
    (score, word) => score + (text.includes(word) ? 1 : 0),
    0
  );

  if (bullishScore > bearishScore) return "Bullish";
  if (bearishScore > bullishScore) return "Bearish";
  return "Neutral";
}

function getRelatedStock(article) {
  const text = `${article.title || ""} ${article.description || ""}`.toUpperCase();

  for (const stock of ["BBCA", "BBRI", "BMRI", "BBNI", "IHSG"]) {
    if (text.includes(stock)) return stock;
  }

  return "Market";
}

function NewsCard({ article }) {
  const sentiment = getSentiment(article);
  const relatedStock = getRelatedStock(article);

  return (
    <article className="news-card">
      <div className="news-card-top">
        <span className="news-stock-badge">{relatedStock}</span>
        <span className={`news-sentiment ${sentiment.toLowerCase()}`}>
          {sentiment}
        </span>
      </div>

      <h3>{article.title || "Untitled news"}</h3>

      <p>
        {article.description ||
          article.content ||
          "Tidak ada deskripsi. Klik artikel untuk membaca sumber berita lengkap."}
      </p>

      <div className="news-meta">
        <span>{article.source?.name || article.source || "Unknown source"}</span>
        <span>{formatDate(article.publishedAt || article.published_at)}</span>
      </div>

      {article.url && (
        <a href={article.url} target="_blank" rel="noreferrer" className="news-link">
          Open Article
        </a>
      )}
    </article>
  );
}

export default function MarketNews({ goToPage }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState("loading");
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadNews = useCallback(async () => {
    try {
      setStatus("loading");

      const res = await fetch("http://localhost:3001/api/news", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch news");
      }

      const data = await res.json();
      const normalized = Array.isArray(data) ? data : data.articles || [];

      setArticles(normalized);
      setLastUpdate(new Date());
      setStatus("success");
    } catch (error) {
      console.error("Market news error:", error);
      setStatus("error");
      setArticles([]);
    }
  }, []);

  useEffect(() => {
    loadNews();
    const timer = setInterval(loadNews, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadNews]);

  const filteredArticles = useMemo(() => {
    if (activeFilter === "all") return articles;

    return articles.filter((article) => {
      const text = `${article.title || ""} ${article.description || ""} ${
        article.content || ""
      }`.toUpperCase();

      const keywords = STOCK_KEYWORDS[activeFilter] || [activeFilter];

      return keywords.some((keyword) => text.includes(keyword));
    });
  }, [articles, activeFilter]);

  const sentimentSummary = useMemo(() => {
    return articles.reduce(
      (acc, article) => {
        const sentiment = getSentiment(article);
        acc[sentiment] += 1;
        return acc;
      },
      { Bullish: 0, Neutral: 0, Bearish: 0 }
    );
  }, [articles]);

  return (
    <div className="root">
      <div className="topbar">
        <div className="logo">
          <div className="mark">IDX</div>
          <div>
            <div className="logo-title">MARKET NEWS</div>
            <div className="logo-sub">INDONESIAN BANKING NEWS FEED</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="date-pill">
            {status === "success"
              ? `Updated ${lastUpdate?.toLocaleTimeString("id-ID") || ""}`
              : status === "loading"
              ? "Loading news..."
              : "News API offline"}
          </div>
          <button className="news-refresh-btn" onClick={loadNews}>
            Refresh
          </button>
        </div>
      </div>

      <div className="body news-body">
        <aside className="left">
          <div className="sidebar-nav">
            <button
              type="button"
              className="sidebar-link"
              onClick={() => goToPage?.("dashboard")}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="sidebar-link"
              onClick={() => goToPage?.("portfolio")}
            >
              Portofolio Simulator
            </button>

            <button
              type="button"
              className="sidebar-link"
              onClick={() => goToPage?.("dividend")}
            >
              Dividend Projection
            </button>

            <button
              type="button"
              className="sidebar-link active"
              onClick={() => goToPage?.("news")}
            >
              Market News
            </button>
          </div>

          <div className="panel-title">NEWS FILTER</div>

          <div className="news-filter-list">
            {STOCK_FILTERS.map((item) => (
              <button
                key={item.key}
                className={activeFilter === item.key ? "active" : ""}
                onClick={() => setActiveFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="side-divider" />

          <div className="panel-title">SENTIMENT</div>

          <div className="news-mini-card">
            <div>
              <span>Bullish</span>
              <strong className="positive">{sentimentSummary.Bullish}</strong>
            </div>
            <div>
              <span>Neutral</span>
              <strong>{sentimentSummary.Neutral}</strong>
            </div>
            <div>
              <span>Bearish</span>
              <strong className="negative">{sentimentSummary.Bearish}</strong>
            </div>
          </div>
        </aside>

        <main className="center news-page">
          <section className="news-hero">
            <div>
              <span className="news-eyebrow">Daily Market Intelligence</span>
              <h1>Market News untuk Saham Bank Indonesia</h1>
              <p>
                Pantau berita terbaru terkait IHSG, BBCA, BBRI, BMRI, dan BBNI
                dengan filter saham, sentiment badge, sumber berita, dan auto refresh.
              </p>
            </div>

            <div className="news-hero-card">
              <span>Total Articles</span>
              <strong>{articles.length}</strong>
              <small>
                Showing {filteredArticles.length} article
                {filteredArticles.length !== 1 ? "s" : ""}
              </small>
            </div>
          </section>

          {status === "error" && (
            <div className="news-error">
              News API gagal dimuat. Pastikan backend `localhost:3001` berjalan dan
              API key sudah benar.
            </div>
          )}

          {status === "loading" && (
            <div className="news-loading">Loading latest market news...</div>
          )}

          {status === "success" && filteredArticles.length === 0 && (
            <div className="news-empty">
              Tidak ada berita untuk filter ini. Coba pilih All News.
            </div>
          )}

          <section className="news-grid">
            {filteredArticles.map((article, index) => (
              <NewsCard
                key={`${article.url || article.title || "news"}-${index}`}
                article={article}
              />
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
