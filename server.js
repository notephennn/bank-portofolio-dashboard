// server.js
// Jalankan dengan: node server.js
// API lokal ini menghindari CORS Yahoo/AllOrigins dari browser React.

const http = require("http");
const { URL } = require("url");

const PORT = 3002;

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fallbackQuote(ticker) {
  const base = {
    "BBCA.JK": 9400,
    "BBRI.JK": 4200,
    "BMRI.JK": 5800,
    "BBNI.JK": 4700,
  };

  const price = base[ticker] ?? 5000;
  return {
    ticker,
    price,
    prev: price,
    vol: 0,
    date: new Date().toISOString().slice(0, 10),
    provider: "Fallback Local",
    note: "Yahoo sedang gagal diakses. Angka fallback dipakai supaya UI tidak blank.",
  };
}

async function yahooQuote(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=5d`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo response ${response.status}`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp || [];

  const price = safeNumber(meta?.regularMarketPrice);
  const prev = safeNumber(meta?.chartPreviousClose ?? meta?.previousClose);
  const volume = Array.isArray(quote?.volume)
    ? safeNumber(quote.volume[quote.volume.length - 1]) ?? 0
    : 0;
  const lastTs = timestamps[timestamps.length - 1];

  if (price == null) throw new Error("Invalid Yahoo price");

  return {
    ticker,
    price,
    prev: prev ?? price,
    vol: volume,
    date: lastTs ? new Date(lastTs * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    provider: "Yahoo Finance via localhost:3001",
  };
}

async function readBody(req) {
  return await new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname.startsWith("/api/quote/")) {
      const ticker = decodeURIComponent(url.pathname.replace("/api/quote/", ""));

      try {
        const quote = await yahooQuote(ticker);
        return sendJson(res, 200, quote);
      } catch (error) {
        console.error(`[quote fallback] ${ticker}:`, error.message);
        return sendJson(res, 200, fallbackQuote(ticker));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/stock-insight") {
      const body = await readBody(req);
      const selected = body.selectedStocks?.join(", ") || "saham terpilih";
      return sendJson(res, 200, {
        insight: `Perbandingan ${selected} berhasil dihitung. Gunakan growth, volatilitas, dan max drawdown sebagai dasar memilih saham yang paling seimbang antara return dan risiko.`,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/portfolio-insight") {
      const body = await readBody(req);
      const totalReturn = body.metrics?.totalReturn;
      return sendJson(res, 200, {
        insight: `Portfolio berhasil dianalisis. Return simulasi sekitar ${Number.isFinite(totalReturn) ? totalReturn.toFixed(2) + "%" : "-"}. Perhatikan dominasi alokasi dan drawdown agar risiko tetap terkendali.`,
      });
    }

    return sendJson(res, 404, { error: "Endpoint tidak ditemukan" });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Local stock API running on http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/api/quote/BBCA.JK`);
});
