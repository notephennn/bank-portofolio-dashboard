import React, { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const STOCKS = ["BBCA", "BBRI", "BMRI", "BBNI"];

const META = {
  BBCA: { name: "Bank Central Asia", hue: "#C9A84C" },
  BBRI: { name: "Bank Rakyat Indonesia", hue: "#6E9ECC" },
  BMRI: { name: "Bank Mandiri", hue: "#8FA876" },
  BBNI: { name: "Bank Negara Indonesia", hue: "#B07BAC" },
};

const P = (v) =>
  v != null && Number.isFinite(v)
    ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
    : "—";

function getMaxDrawdown(values) {
  let peak = values[0] || 0;
  let maxDrawdown = 0;

  values.forEach((v) => {
    if (v > peak) peak = v;
    const drawdown = peak ? ((v - peak) / peak) * 100 : 0;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  });

  return maxDrawdown;
}

function PortfolioTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tip">
      <div className="tip-date">{label}</div>

      {payload.map((p, i) => (
        <div className="tip-row" key={i}>
          <span>{p.name}</span>
          <strong style={{ color: p.color }}>{P(Number(p.value))}</strong>
        </div>
      ))}
    </div>
  );
}

export default function PortfolioSimulator({ goToPage }) {
  const [rows, setRows] = useState([]);
  const [allocations, setAllocations] = useState({
    BBCA: 40,
    BBRI: 20,
    BMRI: 25,
    BBNI: 15,
  });
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
            dailyReturn: Number(r.Daily_Return),
          }))
          .filter((r) => r.date && r.stock && Number.isFinite(r.close));

        setRows(clean);
      })
      .catch(() => setRows([]));
  }, []);

  const totalAllocation = useMemo(() => {
    return Object.values(allocations).reduce((a, b) => a + b, 0);
  }, [allocations]);

  const normalizedWeights = useMemo(() => {
    const total = totalAllocation || 1;

    return Object.fromEntries(
      Object.entries(allocations).map(([stock, weight]) => [
        stock,
        weight / total,
      ])
    );
  }, [allocations, totalAllocation]);

  const portfolioData = useMemo(() => {
    if (!rows.length) return [];

    const grouped = {};

    STOCKS.forEach((stock) => {
      const stockRows = rows.filter((r) => r.stock === stock);
      if (stockRows.length < 2) return;

      const base = stockRows[0].close;

      stockRows.forEach((r) => {
        if (!grouped[r.date]) grouped[r.date] = { date: r.date };
        grouped[r.date][stock] = ((r.close - base) / base) * 100;
      });
    });

    return Object.values(grouped)
      .map((row) => {
        const portfolio = STOCKS.reduce((sum, stock) => {
          const value = Number(row[stock]) || 0;
          return sum + value * normalizedWeights[stock];
        }, 0);

        return {
          ...row,
          Portfolio: portfolio,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rows, normalizedWeights]);

  const metrics = useMemo(() => {
    if (portfolioData.length < 2) {
      return {
        totalReturn: 0,
        volatility: 0,
        maxDrawdown: 0,
        sharpe: 0,
        riskLevel: "—",
      };
    }

    const returns = portfolioData.map((x) => x.Portfolio);
    const totalReturn = returns[returns.length - 1];

    const dailyChanges = returns
      .map((v, i) => (i === 0 ? 0 : v - returns[i - 1]))
      .slice(1);

    const avg =
      dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length;

    const volatility = Math.sqrt(
      dailyChanges.reduce((a, b) => a + Math.pow(b - avg, 2), 0) /
        dailyChanges.length
    );

    const maxDrawdown = getMaxDrawdown(
      portfolioData.map((x) => 100 + x.Portfolio)
    );

    const sharpe = volatility !== 0 ? totalReturn / volatility : 0;

    const riskLevel =
      volatility < 1.2 ? "LOW" : volatility < 2.2 ? "MODERATE" : "HIGH";

    return {
      totalReturn,
      volatility,
      maxDrawdown,
      sharpe,
      riskLevel,
    };
  }, [portfolioData]);

  const fallbackInsight = useMemo(() => {
    const dominant = Object.entries(allocations).sort((a, b) => b[1] - a[1])[0];

    return `${dominant?.[0]} menjadi komponen terbesar dalam portfolio dengan alokasi ${
      dominant?.[1]
    }%. Portfolio ini menghasilkan return ${P(
      metrics.totalReturn
    )} dengan volatilitas ${metrics.volatility.toFixed(
      2
    )}%, sehingga profil risikonya tergolong ${
      metrics.riskLevel
    }. Max drawdown sebesar ${P(
      metrics.maxDrawdown
    )} menunjukkan potensi tekanan terbesar sepanjang periode simulasi.`;
  }, [allocations, metrics]);

  useEffect(() => {
    if (!portfolioData.length) return;

    const timer = setTimeout(async () => {
      try {
        setAiLoading(true);

        const res = await fetch("http://localhost:3001/api/portfolio-insight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            allocations,
            normalizedWeights,
            metrics,
          }),
        });

        const data = await res.json();

        setAiInsight(
          data.insight || data.error || "AI portfolio insight belum tersedia."
        );
      } catch {
        setAiInsight("");
      } finally {
        setAiLoading(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [allocations, normalizedWeights, metrics, portfolioData.length]);

  const setPreset = (type) => {
    if (type === "conservative") {
      setAllocations({ BBCA: 50, BBRI: 15, BMRI: 25, BBNI: 10 });
    }

    if (type === "balanced") {
      setAllocations({ BBCA: 35, BBRI: 25, BMRI: 25, BBNI: 15 });
    }

    if (type === "aggressive") {
      setAllocations({ BBCA: 20, BBRI: 30, BMRI: 30, BBNI: 20 });
    }
  };

  return (
    <div className="root">
      <div className="topbar">
        <div className="logo">
          <div className="mark">IDX</div>
          <div>
            <div className="logo-title">PORTOFOLIO SIMULATOR</div>
            <div className="logo-sub">BANKING ALLOCATION ENGINE</div>
          </div>
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
              className="sidebar-link active"
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

          <div className="panel-title">ALLOCATION</div>

          {STOCKS.map((stock) => (
            <div className="allocation-card" key={stock}>
              <div className="allocation-head">
                <strong style={{ color: META[stock].hue }}>{stock}</strong>
                <span>{allocations[stock]}%</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={allocations[stock]}
                onChange={(e) =>
                  setAllocations((prev) => ({
                    ...prev,
                    [stock]: Number(e.target.value),
                  }))
                }
              />
            </div>
          ))}

          <div className="allocation-total">
            Total Allocation
            <strong className={totalAllocation === 100 ? "positive" : "negative"}>
              {totalAllocation}%
            </strong>
          </div>

          <div className="preset-row">
            <button type="button" onClick={() => setPreset("conservative")}>
              Conservative
            </button>
            <button type="button" onClick={() => setPreset("balanced")}>
              Balanced
            </button>
            <button type="button" onClick={() => setPreset("aggressive")}>
              Aggressive
            </button>
          </div>
        </aside>

        <main className="center">
          <div className="chart-header">
            <div>
              <div className="chart-symbol">Portfolio Growth</div>
              <div className="chart-name">
                Weighted performance based on selected allocation
              </div>
            </div>

            <div className="chart-price positive">{P(metrics.totalReturn)}</div>
          </div>

          <section className="chart-wrap portfolio-chart-wrap">
            {portfolioData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioData}>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="#1F2430"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                  />

                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />

                  <Tooltip content={<PortfolioTooltip />} />

                  <Line
                    type="monotone"
                    dataKey="Portfolio"
                    name="Portfolio"
                    stroke="#D9B957"
                    strokeWidth={3}
                    dot={false}
                  />

                  {STOCKS.map((stock) => (
                    <Line
                      key={stock}
                      type="monotone"
                      dataKey={stock}
                      name={stock}
                      stroke={META[stock].hue}
                      strokeWidth={1.5}
                      dot={false}
                      opacity={0.45}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart-state">Loading portfolio data...</div>
            )}
          </section>

          <section className="return-section">
            <div className="section-title">Portfolio Risk Metrics</div>

            <div className="portfolio-metric-grid">
              <div className="portfolio-metric-card">
                <span>Total Return</span>
                <strong className="positive">{P(metrics.totalReturn)}</strong>
              </div>

              <div className="portfolio-metric-card">
                <span>Volatility</span>
                <strong>{metrics.volatility.toFixed(2)}%</strong>
              </div>

              <div className="portfolio-metric-card">
                <span>Max Drawdown</span>
                <strong className="negative">{P(metrics.maxDrawdown)}</strong>
              </div>

              <div className="portfolio-metric-card">
                <span>Sharpe Proxy</span>
                <strong>{metrics.sharpe.toFixed(2)}</strong>
              </div>
            </div>
          </section>
        </main>

        <aside className="right">
          <div className="panel-title">AI PORTFOLIO INSIGHT</div>

          <div className="insight-box">
            {aiLoading
              ? "Generating AI portfolio insight..."
              : aiInsight || fallbackInsight}
          </div>

          <div className="panel-title">ALLOCATION BREAKDOWN</div>

          <div className="performance-table portfolio-table">
            <div className="performance-head portfolio-head">
              <span>Stock</span>
              <span>Weight</span>
              <span>Normalized</span>
            </div>

            {STOCKS.map((stock) => (
              <div className="performance-row portfolio-row" key={stock}>
                <span style={{ color: META[stock].hue }}>{stock}</span>
                <span>{allocations[stock]}%</span>
                <span>{(normalizedWeights[stock] * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}