import React, { useEffect, useMemo, useState, useCallback } from "react";
import "../styles/dashboard.css";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";

const STOCKS = ["BBCA", "BBRI", "BMRI", "BBNI"];

const META = {
  BBCA: { name: "Bank Central Asia", ticker: "BBCA.JK", hue: "#C9A84C" },
  BBRI: { name: "Bank Rakyat Indonesia", ticker: "BBRI.JK", hue: "#6E9ECC" },
  BMRI: { name: "Bank Mandiri", ticker: "BMRI.JK", hue: "#8FA876" },
  BBNI: { name: "Bank Negara Indonesia", ticker: "BBNI.JK", hue: "#B07BAC" },
};

const REFRESH = 30;

const N = (v) =>
  v != null && Number.isFinite(v)
    ? Math.round(v).toLocaleString("id-ID")
    : "—";

const P = (v) =>
  v != null && Number.isFinite(v)
    ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
    : "—";

const TODAY = () => new Date().toISOString().slice(0, 10);

function isOpen() {
  const w = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const d = w.getDay();
  const m = w.getHours() * 60 + w.getMinutes();
  return d >= 1 && d <= 5 && m >= 540 && m <= 915;
}

function normalizeQuote(raw, ticker) {
  const price = Number(raw?.price ?? raw?.regularMarketPrice ?? raw?.close);
  const prev = Number(
    raw?.prev ?? raw?.previousClose ?? raw?.regularMarketPreviousClose
  );

  if (!Number.isFinite(price)) return null;

  return {
    ticker,
    price,
    prev: Number.isFinite(prev) ? prev : null,
    vol: Number(raw?.vol ?? raw?.volume ?? 0),
    date: raw?.date || TODAY(),
    provider: raw?.provider || "localhost",
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function parseYahooChart(json, ticker) {
  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp || [];

  const price = Number(meta?.regularMarketPrice);
  const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
  const lastTs = timestamps[timestamps.length - 1];
  const volume = Array.isArray(quote?.volume)
    ? Number(quote.volume[quote.volume.length - 1] ?? 0)
    : 0;

  if (!Number.isFinite(price)) return null;

  return {
    ticker,
    price,
    prev: Number.isFinite(prev) ? prev : null,
    vol: Number.isFinite(volume) ? volume : 0,
    date: lastTs ? new Date(lastTs * 1000).toISOString().slice(0, 10) : TODAY(),
    provider: "Yahoo Finance",
  };
}

async function fetchQuote(ticker) {
  // WAJIB lewat backend lokal supaya browser tidak kena CORS Yahoo/AllOrigins.
  // Jalankan: node server.js
  try {
    const res = await fetchWithTimeout(`http://localhost:3001/api/quote/${ticker}`);
    if (!res.ok) return null;

    const data = await res.json();
    const normalized = normalizeQuote(data, ticker);
    return normalized;
  } catch (error) {
    console.warn(`Quote gagal dimuat untuk ${ticker}:`, error?.message || error);
    return null;
  }
}

function getMaxDrawdown(rows) {
  let peak = rows[0]?.close || 0;
  let maxDrawdown = 0;

  rows.forEach((row) => {
    if (row.close > peak) peak = row.close;
    const drawdown = ((row.close - peak) / peak) * 100;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  });

  return maxDrawdown;
}

function generateDemo() {
  const rows = [];
  const base = {
    BBCA: 9200,
    BBRI: 4800,
    BMRI: 6100,
    BBNI: 5300,
  };

  for (let d = 0; d < 300; d++) {
    const dt = new Date(2024, 0, 2);
    dt.setDate(dt.getDate() + d);

    if ([0, 6].includes(dt.getDay())) continue;

    const date = dt.toISOString().slice(0, 10);

    for (const s of STOCKS) {
      const n = (Math.random() - 0.48) * 110;
      base[s] = Math.max(base[s] + n, base[s] * 0.72);

      const cl = Math.round(base[s]);

      rows.push({
        date,
        stock: s,
        close: cl,
        ma20: Math.round(cl * (0.98 + Math.random() * 0.04)),
        volume: Math.round(50e6 + Math.random() * 180e6),
        dailyReturn: +((n / base[s]) * 100).toFixed(2),
        source: "csv",
      });
    }
  }

  return rows;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tip">
      <div className="tip-date">{label}</div>

      {payload.map((p, i) => {
        const isReturn =
          p.name === "Return" ||
          p.name === "Growth" ||
          p.name === "value" ||
          STOCKS.includes(p.name);

        return (
          <div className="tip-row" key={i}>
            <span>{p.name}</span>
            <strong style={{ color: p.color }}>
              {isReturn ? P(Number(p.value)) : `Rp ${N(p.value)}`}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <div className="clock">{time} WIB</div>;
}

export default function StockDashboard({goToPage}) {
  const [csvData, setCsvData] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [selectedStocks, setSelectedStocks] = useState(["BBCA", "BBRI"]);
  const [range, setRange] = useState("ALL");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const selected = selectedStocks[0];
  const isComparison = selectedStocks.length > 1;
  const meta = META[selected];

  useEffect(() => {
    fetch("/data/stocks_processed.csv")
      .then((r) => r.text())
      .then((txt) => {
        const { data } = Papa.parse(txt, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        const clean = data
          .map((r) => ({
            date: r.Date,
            stock: r.Stock,
            close: Number(r.Close),
            ma20: Number(r.MA20),
            volume: Number(r.Volume),
            dailyReturn: Number(r.Daily_Return),
            source: "csv",
          }))
          .filter((r) => r.date && r.stock && Number.isFinite(r.close))
          .sort((a, b) => a.date.localeCompare(b.date));

        setCsvData(clean);
      })
      .catch(() => setCsvData(generateDemo()));
  }, []);

  const fetchRealtime = useCallback(async () => {
    const result = {};

    await Promise.all(
      STOCKS.map(async (s) => {
        const q = await fetchQuote(META[s].ticker);
        if (q) result[s] = q;
      })
    );

    setQuotes(result);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    fetchRealtime();
    const id = setInterval(fetchRealtime, REFRESH * 1000);
    return () => clearInterval(id);
  }, [fetchRealtime]);

  const toggleStock = (stock) => {
    setSelectedStocks((prev) => {
      if (prev.includes(stock)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== stock);
      }

      return [...prev, stock];
    });
  };

  const getMergedRows = useCallback(
    (stock) => {
      const base = csvData.filter((x) => x.stock === stock);
      const live = quotes[stock];

      if (!live) return base;

      const today = live.date || TODAY();
      const last = base[base.length - 1];

      const ret = live.prev ? ((live.price - live.prev) / live.prev) * 100 : 0;

      const ma20Source = base.slice(-19).map((x) => x.close);
      const ma20 =
        ma20Source.length > 0
          ? [...ma20Source, live.price].reduce((a, b) => a + b, 0) /
            (ma20Source.length + 1)
          : live.price;

      const liveRow = {
        date: today,
        stock,
        close: live.price,
        ma20,
        volume: live.vol || last?.volume || 0,
        dailyReturn: ret,
        source: live.provider || "live",
      };

      if (last?.date === today) {
        return [...base.slice(0, -1), liveRow];
      }

      return [...base, liveRow];
    },
    [csvData, quotes]
  );

  const mergedData = useMemo(
    () => getMergedRows(selected),
    [getMergedRows, selected]
  );

  const displayData = useMemo(() => {
    if (range === "ALL") return mergedData;

    const map = {
      "1M": 22,
      "3M": 66,
      "6M": 132,
    };

    return mergedData.slice(-map[range]);
  }, [mergedData, range]);

  const comparisonData = useMemo(() => {
    const grouped = {};

    selectedStocks.forEach((stock) => {
      const rows = getMergedRows(stock);

      const sliced =
        range === "ALL"
          ? rows
          : rows.slice(-{ "1M": 22, "3M": 66, "6M": 132 }[range]);

      if (sliced.length < 2) return;

      const base = sliced[0].close;

      sliced.forEach((row) => {
        if (!grouped[row.date]) {
          grouped[row.date] = { date: row.date };
        }

        grouped[row.date][stock] = ((row.close - base) / base) * 100;
      });
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedStocks, getMergedRows, range]);

  const comparisonStats = useMemo(() => {
    return selectedStocks
      .map((stock) => {
        const rows = getMergedRows(stock);

        const sliced =
          range === "ALL"
            ? rows
            : rows.slice(-{ "1M": 22, "3M": 66, "6M": 132 }[range]);

        if (sliced.length < 2) return null;

        const first = sliced[0].close;
        const last = sliced[sliced.length - 1].close;
        const growth = ((last - first) / first) * 100;

        const returns = sliced
          .map((x) => Number(x.dailyReturn))
          .filter((x) => Number.isFinite(x));

        const avg =
          returns.length > 0
            ? returns.reduce((a, b) => a + b, 0) / returns.length
            : 0;

        const volatility =
          returns.length > 0
            ? Math.sqrt(
                returns.reduce((a, b) => a + Math.pow(b - avg, 2), 0) /
                  returns.length
              )
            : 0;

        const winRate =
          returns.length > 0
            ? (returns.filter((x) => x > 0).length / returns.length) * 100
            : 0;

        const maxDrawdown = getMaxDrawdown(sliced);
        const riskReward = volatility !== 0 ? growth / volatility : 0;

        return {
          stock,
          growth,
          volatility,
          winRate,
          maxDrawdown,
          riskReward,
          rows: sliced.slice(-35),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.growth - a.growth);
  }, [selectedStocks, getMergedRows, range]);

  useEffect(() => {
    if (!isComparison || comparisonStats.length < 2) {
      setAiInsight("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setAiLoading(true);

        const res = await fetch("http://localhost:3001/api/stock-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedStocks, range, comparisonStats }),
        });

        const data = await res.json();
        setAiInsight(data.insight || data.error || "AI insight belum tersedia.");
      } catch {
        setAiInsight("AI insight gagal dimuat. Pastikan server AI berjalan.");
      } finally {
        setAiLoading(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [isComparison, selectedStocks, range, comparisonStats]);

  const topStock = comparisonStats[0];
  const worstStock = comparisonStats[comparisonStats.length - 1];

  const last = displayData[displayData.length - 1];
  const first = displayData[0];

  const q = quotes[selected];
  const price = q?.price ?? last?.close;

  const daily =
    q && q.prev ? ((q.price - q.prev) / q.prev) * 100 : last?.dailyReturn;

  const period = first && price ? ((price - first.close) / first.close) * 100 : 0;

  const stats = useMemo(() => {
    const closes = displayData.map((x) => x.close).filter(Number.isFinite);
    const returns = displayData
      .map((x) => Number(x.dailyReturn))
      .filter(Number.isFinite);

    return {
      high: closes.length ? Math.max(...closes) : 0,
      low: closes.length ? Math.min(...closes) : 0,
      best: returns.length ? Math.max(...returns) : 0,
      worst: returns.length ? Math.min(...returns) : 0,
      win: returns.length
        ? ((returns.filter((x) => x > 0).length / returns.length) * 100).toFixed(1)
        : "0.0",
    };
  }, [displayData]);

  const dateRangeLabel = useMemo(() => {
    const allRows = STOCKS.flatMap((stock) => getMergedRows(stock));
    if (!allRows.length) return "Loading data...";

    const dates = allRows
      .map((row) => row.date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return `${dates[0]} → ${dates[dates.length - 1]}`;
  }, [getMergedRows]);

  const dataSourceLabel = useMemo(() => {
    const providers = Object.values(quotes)
      .map((quote) => quote?.provider)
      .filter(Boolean);

    if (providers.length) return providers.includes("Yahoo Finance") ? "Yahoo Finance delayed quote" : providers[0];
    return "CSV fallback";
  }, [quotes]);

  return (
    <div className="root">
      <div className="topbar">
        <div className="logo">
          <div className="mark">IDX</div>
          <div>
            <div className="logo-title">FINTECH ANALYTICS</div>
            <div className="logo-sub">INDONESIAN BANKING</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="date-pill">{dateRangeLabel}</div>
          <Clock />
        </div>
      </div>

      <div className="body">
        <aside className="left">
          <div className="sidebar-nav">
            <button
              type="button"
              className="sidebar-link active"
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
          </div>

          <div className="side-divider" />

          <div className="panel-title">COMPARISON MODE</div>

          {isComparison ? (
            <>
              <div className="kpi">
                <div className="kpi-label">SELECTED STOCKS</div>
                <div className="selected-list">{selectedStocks.join(" / ")}</div>
              </div>

              <div className="kpi compact">
                <div>
                  <div className="kpi-label">TOP PERFORMER</div>
                  <div
                    className="kpi-value"
                    style={{ color: META[topStock?.stock]?.hue }}
                  >
                    {topStock?.stock}
                  </div>
                </div>
                <div className="kpi-sub positive">{P(topStock?.growth)}</div>
              </div>

              <div className="kpi compact">
                <div>
                  <div className="kpi-label">WEAKEST PERFORMER</div>
                  <div className="kpi-value danger">{worstStock?.stock}</div>
                </div>
                <div className="kpi-sub negative">{P(worstStock?.growth)}</div>
              </div>
            </>
          ) : (
            <>
              <div className="kpi">
                <div className="kpi-label">LAST PRICE</div>
                <div className="kpi-value" style={{ color: meta.hue }}>
                  Rp {N(price)}
                </div>
                <div className={daily >= 0 ? "kpi-sub positive" : "kpi-sub negative"}>
                  {P(daily)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">PERIOD RETURN</div>
                <div className={period >= 0 ? "kpi-value positive" : "kpi-value negative"}>
                  {P(period)}
                </div>
              </div>
            </>
          )}

          <div className="market-card">
            <div className="market-dot-row">
              <span className={isOpen() ? "status-dot open" : "status-dot closed"} />
              <strong>{isOpen() ? "MARKET OPEN" : "MARKET CLOSED"}</strong>
            </div>
            <p>Last Update</p>
            <span>
              {lastUpdate ? lastUpdate.toLocaleTimeString("id-ID") : "—"} WIB · {dataSourceLabel}
            </span>
          </div>
        </aside>

        <main className="center">
          <div className="control-row">
            <div className="tabs">
              {STOCKS.map((s) => (
                <button
                  key={s}
                  className={`tab ${selectedStocks.includes(s) ? "active" : ""}`}
                  style={{
                    background: selectedStocks.includes(s)
                      ? META[s].hue
                      : undefined,
                  }}
                  onClick={() => toggleStock(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="range">
              {["1M", "3M", "6M", "ALL"].map((r) => (
                <button
                  key={r}
                  className={range === r ? "active" : ""}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="mode-badge">
              {isComparison ? "NORMALIZED COMPARISON" : "SINGLE STOCK"}
            </div>
          </div>

          <div className="chart-header">
            <div>
              <div className="chart-symbol">
                {isComparison ? selectedStocks.join(" VS ") : selected}
              </div>
              <div className="chart-name">
                {isComparison ? "Normalized Growth Comparison" : meta.name}
              </div>
            </div>

            {isComparison && (
              <div className="inline-metrics">
                {comparisonStats.map((item) => (
                  <div key={item.stock}>
                    <span style={{ color: META[item.stock].hue }}>{item.stock}</span>
                    <strong
                      style={{
                        color: item.growth >= 0 ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {P(item.growth)}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {!isComparison && (
              <div className="chart-price" style={{ color: meta.hue }}>
                Rp {N(price)}
              </div>
            )}
          </div>

          <section className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              {isComparison ? (
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#1F2430" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 10 }} />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    width={50}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,.18)" />

                  {selectedStocks.map((s) => (
                    <Line
                      key={s}
                      type="monotone"
                      dataKey={s}
                      name={s}
                      stroke={META[s].hue}
                      strokeWidth={2.8}
                      dot={false}
                      isAnimationActive
                      animationDuration={900}
                    />
                  ))}
                </LineChart>
              ) : (
                <AreaChart data={displayData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={meta.hue} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={meta.hue} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="4 4" stroke="#1F2430" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} width={44} />
                  <Tooltip content={<CustomTooltip />} />

                  <Area
                    type="monotone"
                    dataKey="close"
                    name="Price"
                    stroke={meta.hue}
                    strokeWidth={2.4}
                    fill="url(#grad)"
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="ma20"
                    name="MA20"
                    stroke="rgba(255,255,255,.28)"
                    dot={false}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </section>

          {isComparison ? (
            <section className="return-section">
              <div className="section-title">Return Comparison</div>

              <div className="return-grid">
                {comparisonStats.map((item) => {
                  const base = item.rows[0]?.close || 1;
                  const miniData = item.rows.map((row) => ({
                    date: row.date,
                    value: ((row.close - base) / base) * 100,
                  }));

                  return (
                    <div className="return-card" key={item.stock}>
                      <div className="return-card-head">
                        <span style={{ color: META[item.stock].hue }}>
                          {item.stock}
                        </span>
                        <strong
                          style={{
                            color: item.growth >= 0 ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {P(item.growth)}
                        </strong>
                      </div>

                      <div className="return-label">Total Return ({range})</div>

                      <div className="mini-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={miniData}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={META[item.stock].hue}
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="return-metrics">
                        <div>
                          <span>Volatility</span>
                          <strong>{item.volatility.toFixed(2)}%</strong>
                        </div>

                        <div>
                          <span>Win Ratio</span>
                          <strong>{item.winRate.toFixed(1)}%</strong>
                        </div>

                        <div>
                          <span>Max Drawdown</span>
                          <strong className="negative">{P(item.maxDrawdown)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="bottom-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#1F2430" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} width={42} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,.12)" />
                  <Bar dataKey="dailyReturn" name="Return">
                    {displayData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.dailyReturn >= 0 ? "#5BA47A" : "#C26B6B"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}
        </main>

        <aside className="right">
          {!isComparison ? (
            <>
              <div className="panel-title">STATISTICS</div>

              <div className="stat">
                <span>Period High</span>
                <strong className="positive">Rp {N(stats.high)}</strong>
              </div>

              <div className="stat">
                <span>Period Low</span>
                <strong className="negative">Rp {N(stats.low)}</strong>
              </div>

              <div className="stat">
                <span>Best Day</span>
                <strong className="positive">{P(stats.best)}</strong>
              </div>

              <div className="stat">
                <span>Worst Day</span>
                <strong className="negative">{P(stats.worst)}</strong>
              </div>

              <div className="stat">
                <span>Win Rate</span>
                <strong style={{ color: meta.hue }}>{stats.win}%</strong>
              </div>
            </>
          ) : (
            <>
              <div className="panel-title">AI COMPARISON INSIGHT</div>

              <div className="insight-box">
                {aiLoading
                  ? "Generating AI insight..."
                  : aiInsight || "AI insight belum tersedia. Pastikan server AI berjalan."}
              </div>

              <div className="panel-title">PERFORMANCE DETAILS</div>

              <div className="performance-table">
                <div className="performance-head">
                  <span>Ticker</span>
                  <span>Return</span>
                  <span>Vol</span>
                  <span>Win</span>
                  <span>Drawdown</span>
                </div>

                {comparisonStats.map((item) => (
                  <div className="performance-row" key={item.stock}>
                    <span style={{ color: META[item.stock].hue }}>{item.stock}</span>
                    <span
                      style={{
                        color: item.growth >= 0 ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {P(item.growth)}
                    </span>
                    <span>{item.volatility.toFixed(2)}%</span>
                    <span>{item.winRate.toFixed(1)}%</span>
                    <span className="negative">{P(item.maxDrawdown)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="panel-title">MARKET SUMMARY</div>

          <div className="market-summary">
            <div>
              <span>Market</span>
              <strong className={isOpen() ? "positive" : "negative"}>
                {isOpen() ? "OPEN" : "CLOSED"}
              </strong>
            </div>

            <div>
              <span>Last Update</span>
              <strong>{lastUpdate ? lastUpdate.toLocaleTimeString("id-ID") : "—"}</strong>
            </div>

            <div>
              <span>Refresh</span>
              <strong>{REFRESH}s</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}