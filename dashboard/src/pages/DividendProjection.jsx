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
  BBCA: { name: "Bank Central Asia", ticker: "BBCA.JK", hue: "#facc15" },
  BBRI: { name: "Bank Rakyat Indonesia", ticker: "BBRI.JK", hue: "#60a5fa" },
  BMRI: { name: "Bank Mandiri", ticker: "BMRI.JK", hue: "#34d399" },
  BBNI: { name: "Bank Negara Indonesia", ticker: "BBNI.JK", hue: "#a78bfa" },
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

    if (!Number.isFinite(price)) return null;

    return { price };
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
            <div className="logo-sub">INDONESIAN BANKING</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="date-pill">
            Live price: {Object.keys(quotes).length ? "Connected" : "Loading / fallback"}
          </div>
          <Clock lastUpdate={lastUpdate} />
        </div>
      </div>

      <div className="body dividend-body">
        <aside className="left">
          <div className="sidebar-nav">
            <button type="button" className="sidebar-link" onClick={() => goToPage?.("dashboard")}>
              Dashboard
            </button>

            <button type="button" className="sidebar-link" onClick={() => goToPage?.("portfolio")}>
              Portofolio Simulator
            </button>

            <button type="button" className="sidebar-link active" onClick={() => goToPage?.("dividend")}>
              Dividend Projection
            </button>

            <button type="button" className="sidebar-link" onClick={() => goToPage?.("news")}>
              Market News
            </button>
          </div>

          <div className="panel-title">DIVIDEND SETTINGS</div>

          <div className="allocation-card">
            <div className="allocation-head">
              <strong>Dividend Growth</strong>
              <span>{growthRate}% / year</span>
            </div>
            <input type="range" min="0" max="20" step="1" value={growthRate} onChange={(e) => setGrowthRate(Number(e.target.value))} />
          </div>

          <div className="allocation-card">
            <div className="allocation-head">
              <strong>Projection Period</strong>
              <span>{years} years</span>
            </div>
            <input type="range" min="1" max="15" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} />
          </div>

          <div className="side-divider" />

          <div className="panel-title">ASSUMPTION</div>
          <div className="insight-box">
            DPS yang dipakai adalah asumsi manual per saham. Harga saham memakai API lokal port 3001. Jika backend mati, sistem memakai harga fallback agar UI tidak blank.
          </div>
        </aside>

        <main className="center div-page">
          <section className="div-hero-clean">
            <div className="div-hero-left">
              <div className="div-eyebrow-clean">Projected Passive Income</div>
              <h1>Estimasi Dividen Tahunan Saham Bank</h1>
              <p>
                Hitung potensi pendapatan dividen berdasarkan jumlah lot, average price,
                DPS, yield on cost, dan proyeksi pertumbuhan dividen.
              </p>
            </div>

            <div className="div-hero-income">
              <span>Annual Dividend</span>
              <strong>{rupiah(summary.annualDividend)}</strong>
              <small>Monthly avg: {rupiah(summary.monthlyDividend)}</small>
            </div>
          </section>

          <section className="div-kpi-grid-clean">
            <div className="div-kpi-clean">
              <span>Total Invested</span>
              <strong>{rupiah(summary.invested)}</strong>
              <small>Modal berdasarkan average price</small>
            </div>

            <div className="div-kpi-clean">
              <span>Market Value</span>
              <strong>{rupiah(summary.marketValue)}</strong>
              <small>Harga terbaru / fallback</small>
            </div>

            <div className="div-kpi-clean">
              <span>Yield on Cost</span>
              <strong>{percent(summary.yieldOnCost)}</strong>
              <small>Dividen dibanding modal beli</small>
            </div>

            <div className="div-kpi-clean">
              <span>Current Yield</span>
              <strong>{percent(summary.currentYield)}</strong>
              <small>Dividen dibanding market value</small>
            </div>
          </section>

          <section className="div-panel-clean">
            <div className="div-section-head-clean">
              <div>
                <div className="div-section-label-clean">Dividend Projection</div>
                <h3>Annual vs Cumulative Dividend</h3>
              </div>
            </div>

            <div className="div-chart-clean">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                  <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} stroke="#94a3b8" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000000)}jt`} stroke="#94a3b8" />
                  <Tooltip content={<ProjectionTooltip />} />
                  <Line type="monotone" dataKey="Dividend" name="Annual Dividend" stroke="#facc15" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Cumulative" name="Cumulative Dividend" stroke="#60a5fa" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="div-two-grid-clean">
            <div className="div-panel-clean">
              <div className="div-section-head-clean">
                <div>
                  <div className="div-section-label-clean">Dividend Contribution</div>
                  <h3>Estimasi dividen per saham</h3>
                </div>
              </div>

              <div className="div-bar-clean">
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

            <div className="div-insight-clean">
              <div className="div-section-label-clean">Dividend Insight</div>
              <p>
                Kontributor dividen terbesar saat ini adalah <strong>{bestStock?.stock}</strong> dengan estimasi{" "}
                <strong>{rupiah(bestStock?.annualDividend || 0)}</strong> per tahun. Dengan asumsi pertumbuhan dividen {growthRate}% per tahun,
                total dividen kumulatif selama {years} tahun diperkirakan menjadi{" "}
                <strong>{rupiah(projectionData[projectionData.length - 1]?.Cumulative || 0)}</strong>.
              </p>
            </div>
          </section>

          <section className="div-panel-clean">
            <div className="div-section-head-clean">
              <div>
                <div className="div-section-label-clean">Holdings Input</div>
                <h3>Portfolio Dividend Detail</h3>
              </div>
            </div>

            <div className="div-table-wrap-clean">
              <table className="div-table-clean">
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
                        <input className="div-input-clean" type="number" min="0" value={holdings[row.stock].lots} onChange={(e) => updateHolding(row.stock, "lots", e.target.value)} />
                      </td>
                      <td>
                        <input className="div-input-clean" type="number" min="0" value={holdings[row.stock].avgPrice} onChange={(e) => updateHolding(row.stock, "avgPrice", e.target.value)} />
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
