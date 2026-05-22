import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import "../styles/dashboard.css";
import "../styles/dividend.css";

const STOCKS = ["BBCA", "BBRI", "BMRI", "BBNI"];
const LOT_SIZE = 100;
const REFRESH = 60;

const META = {
  BBCA: { name: "Bank Central Asia", ticker: "BBCA.JK", hue: "#C9A84C" },
  BBRI: { name: "Bank Rakyat Indonesia", ticker: "BBRI.JK", hue: "#6E9ECC" },
  BMRI: { name: "Bank Mandiri", ticker: "BMRI.JK", hue: "#8FA876" },
  BBNI: { name: "Bank Negara Indonesia", ticker: "BBNI.JK", hue: "#B07BAC" },
};

const DIVIDEND = {
  BBCA: { dps: 300, fallbackPrice: 9000 },
  BBRI: { dps: 319, fallbackPrice: 4500 },
  BMRI: { dps: 353, fallbackPrice: 6000 },
  BBNI: { dps: 374, fallbackPrice: 5000 },
};

const rupiah = (v) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const percent = (v) => `${Number(v || 0).toFixed(2)}%`;

const number = (v) =>
  v != null && Number.isFinite(Number(v))
    ? Math.round(Number(v)).toLocaleString("id-ID")
    : "—";

async function fetchQuote(ticker) {
  try {
    const res = await fetch(`http://localhost:3001/api/quote/${ticker}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const price = Number(data.price || data.regularMarketPrice || data.close);
    const prev = Number(data.prev || data.previousClose || data.chartPreviousClose || price);
    const vol = Number(data.volume || data.regularMarketVolume || 0);

    if (!Number.isFinite(price)) return null;

    return { price, prev, vol };
  } catch {
    return null;
  }
}

function ProjectionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tip">
      <div className="tip-date">Tahun {label}</div>
      {payload.map((p, i) => (
        <div className="tip-row" key={i}>
          <span>{p.name}</span>
          <strong style={{ color: p.color }}>{rupiah(Number(p.value))}</strong>
        </div>
      ))}
    </div>
  );
}

function Clock({ lastUpdate }) {
  return (
    <div className="clock">
      {lastUpdate ? lastUpdate.toLocaleTimeString("id-ID") : "—"} WIB
    </div>
  );
}

export default function DividendProjection({ goToPage }) {
  const [quotes, setQuotes] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [holdings, setHoldings] = useState({
    BBCA: { lots: 10, avgPrice: 9000 },
    BBRI: { lots: 10, avgPrice: 4500 },
    BMRI: { lots: 10, avgPrice: 6000 },
    BBNI: { lots: 10, avgPrice: 5000 },
  });
  const [growthRate, setGrowthRate] = useState(5);
  const [years, setYears] = useState(5);

  const fetchRealtime = useCallback(async () => {
    const result = {};

    await Promise.all(
      STOCKS.map(async (stock) => {
        const quote = await fetchQuote(META[stock].ticker);
        if (quote) result[stock] = quote;
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

  const rows = useMemo(() => {
    return STOCKS.map((stock) => {
      const lots = Number(holdings[stock]?.lots || 0);
      const avgPrice = Number(holdings[stock]?.avgPrice || 0);
      const shares = lots * LOT_SIZE;
      const livePrice = Number(quotes[stock]?.price || 0);
      const fallbackPrice = avgPrice || DIVIDEND[stock].fallbackPrice;
      const price = livePrice || fallbackPrice;
      const invested = shares * avgPrice;
      const marketValue = shares * price;
      const annualDividend = shares * DIVIDEND[stock].dps;
      const yieldOnCost = invested > 0 ? (annualDividend / invested) * 100 : 0;
      const currentYield = marketValue > 0 ? (annualDividend / marketValue) * 100 : 0;

      return {
        stock,
        name: META[stock].name,
        lots,
        shares,
        avgPrice,
        price,
        invested,
        marketValue,
        dps: DIVIDEND[stock].dps,
        annualDividend,
        yieldOnCost,
        currentYield,
        hue: META[stock].hue,
      };
    });
  }, [holdings, quotes]);

  const summary = useMemo(() => {
    const invested = rows.reduce((sum, row) => sum + row.invested, 0);
    const marketValue = rows.reduce((sum, row) => sum + row.marketValue, 0);
    const annualDividend = rows.reduce((sum, row) => sum + row.annualDividend, 0);
    const monthlyDividend = annualDividend / 12;
    const yieldOnCost = invested > 0 ? (annualDividend / invested) * 100 : 0;
    const currentYield = marketValue > 0 ? (annualDividend / marketValue) * 100 : 0;

    return {
      invested,
      marketValue,
      annualDividend,
      monthlyDividend,
      yieldOnCost,
      currentYield,
    };
  }, [rows]);

  const projectionData = useMemo(() => {
    const data = [];
    let dividend = summary.annualDividend;
    let cumulative = 0;

    for (let year = 1; year <= years; year++) {
      if (year > 1) dividend *= 1 + growthRate / 100;
      cumulative += dividend;

      data.push({
        year,
        Dividend: Math.round(dividend),
        Cumulative: Math.round(cumulative),
      });
    }

    return data;
  }, [summary.annualDividend, growthRate, years]);

  const bestStock = useMemo(() => {
    return [...rows].sort((a, b) => b.annualDividend - a.annualDividend)[0];
  }, [rows]);

  const updateHolding = (stock, field, value) => {
    setHoldings((prev) => ({
      ...prev,
      [stock]: {
        ...prev[stock],
        [field]: Number(value),
      },
    }));
  };

  return (
    <div className="root">
      <div className="topbar">
        <div className="logo">
          <div className="mark">IDX</div>
          <div>
            <div className="logo-title">DIVIDEND PROJECTION</div>
            <div className="logo-sub">BANKING PASSIVE INCOME ENGINE</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="date-pill">
            Live price: {Object.keys(quotes).length ? "Connected" : "Loading / fallback"}
          </div>
          <Clock lastUpdate={lastUpdate} />
        </div>
      </div>

      <div className="body portfolio-body">
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
              className="sidebar-link active"
              onClick={() => goToPage?.("dividend")}
            >
              Dividend Projection
            </button>
          </div>

          <div className="panel-title">DIVIDEND SETTINGS</div>

          <div className="allocation-card">
            <div className="allocation-head">
              <strong>Dividend Growth</strong>
              <span>{growthRate}% / year</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={growthRate}
              onChange={(e) => setGrowthRate(Number(e.target.value))}
            />
          </div>

          <div className="allocation-card">
            <div className="allocation-head">
              <strong>Projection Period</strong>
              <span>{years} years</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </div>

          <div className="side-divider" />

          <div className="panel-title">ASSUMPTION</div>
          <div className="insight-box">
            DPS yang dipakai adalah asumsi manual per saham. Harga saham memakai API lokal port 3001. Jika backend mati, sistem memakai harga fallback agar UI tidak blank.
          </div>
        </aside>

        <main className="center dividend-center">
          <section className="dividend-hero-card">
            <div>
              <div className="eyebrow">Projected Passive Income</div>
              <h1>Estimasi Dividen Tahunan Saham Bank</h1>
              <p>
                Hitung potensi pendapatan dividen berdasarkan jumlah lot, average price, DPS, yield on cost, dan proyeksi pertumbuhan dividen.
              </p>
            </div>

            <div className="dividend-total-card">
              <div className="hero-card-label">Annual Dividend</div>
              <div className="hero-card-value">{rupiah(summary.annualDividend)}</div>
              <div className="hero-card-sub">Monthly avg: {rupiah(summary.monthlyDividend)}</div>
            </div>
          </section>

          <section className="portfolio-metric-grid dividend-kpi-grid">
            <div className="portfolio-metric-card">
              <span>Total Invested</span>
              <strong>{rupiah(summary.invested)}</strong>
              <small>Modal berdasarkan average price</small>
            </div>

            <div className="portfolio-metric-card">
              <span>Market Value</span>
              <strong>{rupiah(summary.marketValue)}</strong>
              <small>Harga terbaru / fallback</small>
            </div>

            <div className="portfolio-metric-card">
              <span>Yield on Cost</span>
              <strong>{percent(summary.yieldOnCost)}</strong>
              <small>Dividen dibanding modal beli</small>
            </div>

            <div className="portfolio-metric-card">
              <span>Current Yield</span>
              <strong>{percent(summary.currentYield)}</strong>
              <small>Dividen dibanding market value</small>
            </div>
          </section>

          <section className="dividend-panel-card">
            <div className="dividend-section-head">
              <div>
                <div className="section-title">Dividend Projection</div>
                <div className="dividend-chart-title">Annual vs Cumulative Dividend</div>
              </div>
            </div>

            <div className="dividend-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                  <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} stroke="#94a3b8" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000000)}jt`} stroke="#94a3b8" />
                  <Tooltip content={<ProjectionTooltip />} />
                  <Line type="monotone" dataKey="Dividend" name="Annual Dividend" stroke="#C9A84C" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Cumulative" name="Cumulative Dividend" stroke="#6E9ECC" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dividend-two-grid">
            <div className="dividend-panel-card">
              <div className="dividend-section-head">
                <div>
                  <div className="section-title">Dividend Contribution</div>
                  <div className="dividend-chart-title">Estimasi dividen per saham</div>
                </div>
              </div>

              <div className="dividend-bar-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                    <XAxis dataKey="stock" stroke="#94a3b8" />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000000)}jt`} stroke="#94a3b8" />
                    <Tooltip content={<ProjectionTooltip />} />
                    <Bar dataKey="annualDividend" name="Annual Dividend" radius={[12, 12, 0, 0]}>
                      {rows.map((row) => (
                        <Cell key={row.stock} fill={row.hue} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dividend-insight-card">
              <div className="section-title">Dividend Insight</div>
              <p>
                Kontributor dividen terbesar saat ini adalah <strong>{bestStock?.stock}</strong> dengan estimasi{" "}
                <strong>{rupiah(bestStock?.annualDividend || 0)}</strong> per tahun. Dengan asumsi pertumbuhan dividen {growthRate}% per tahun,
                total dividen kumulatif selama {years} tahun diperkirakan menjadi{" "}
                <strong>{rupiah(projectionData[projectionData.length - 1]?.Cumulative || 0)}</strong>.
              </p>
            </div>
          </section>

          <section className="dividend-panel-card">
            <div className="dividend-section-head">
              <div>
                <div className="section-title">Holdings Input</div>
                <div className="dividend-chart-title">Portfolio Dividend Detail</div>
              </div>
            </div>

            <div className="dividend-table-wrap">
              <table className="dividend-table">
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th>Lots</th>
                    <th>Avg Price</th>
                    <th>Live Price</th>
                    <th>DPS</th>
                    <th>Annual Dividend</th>
                    <th>Yield on Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.stock}>
                      <td>
                        <strong style={{ color: row.hue }}>{row.stock}</strong>
                        <div>{row.name}</div>
                      </td>
                      <td>
                        <input
                          className="dividend-input"
                          type="number"
                          min="0"
                          value={holdings[row.stock].lots}
                          onChange={(e) => updateHolding(row.stock, "lots", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="dividend-input"
                          type="number"
                          min="0"
                          value={holdings[row.stock].avgPrice}
                          onChange={(e) => updateHolding(row.stock, "avgPrice", e.target.value)}
                        />
                      </td>
                      <td>{number(row.price)}</td>
                      <td>{number(row.dps)}</td>
                      <td>{rupiah(row.annualDividend)}</td>
                      <td>{percent(row.yieldOnCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
