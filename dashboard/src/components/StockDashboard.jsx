import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  BBCA: { name: "Bank Central Asia", short: "BCA", ticker: "BBCA.JK", hue: "#C9A84C" },
  BBRI: { name: "Bank Rakyat Indonesia", short: "BRI", ticker: "BBRI.JK", hue: "#6E9ECC" },
  BMRI: { name: "Bank Mandiri", short: "BMRI", ticker: "BMRI.JK", hue: "#8FA876" },
  BBNI: { name: "Bank Negara Indonesia", short: "BNI", ticker: "BBNI.JK", hue: "#B07BAC" },
};

const REFRESH = 60;

function isOpen() {
  const w = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const d = w.getDay();
  const m = w.getHours() * 60 + w.getMinutes();
  return d >= 1 && d <= 5 && m >= 540 && m <= 915;
}

async function fetchQuote(ticker) {
  try {
    const r = await fetch(`http://localhost:3001/api/quote/${ticker}`);

    if (!r.ok) throw new Error();

    return await r.json();
  } catch {
    return null;
  }
}

const N = (v) => (v != null && Number.isFinite(v) ? Math.round(v).toLocaleString("id-ID") : "—");
const P = (v) => (v != null && Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "—");
const TODAY = () => new Date().toISOString().slice(0, 10);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;700&display=swap');

:root{
  --bg:#0D0F14;
  --border:rgba(255,255,255,.06);
  --border2:rgba(255,255,255,.12);
  --text:#D8DCE8;
  --muted:#6B7280;
  --up:#5BA47A;
  --dn:#C26B6B;
  --mono:'DM Mono', monospace;
  --sans:'DM Sans', sans-serif;
}

*{margin:0;padding:0;box-sizing:border-box;}
html,body,#root{width:100%;height:100%;overflow:hidden;background:var(--bg);}

.root{
  width:100%;
  height:100vh;
  background:var(--bg);
  color:var(--text);
  font-family:var(--sans);
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.topbar{
  height:52px;
  min-height:52px;
  display:flex;
  align-items:center;
  padding:0 18px;
  border-bottom:1px solid var(--border);
  background:#10131A;
}

.logo{display:flex;align-items:center;gap:12px;}
.mark{
  width:28px;height:28px;border-radius:6px;background:#C9A84C;
  display:flex;align-items:center;justify-content:center;
  color:#111;font-size:11px;font-weight:700;font-family:var(--mono);
}
.logo-title{font-size:15px;font-weight:700;}
.logo-sub{font-size:10px;color:var(--muted);font-family:var(--mono);letter-spacing:.12em;}

.body{
  flex:1;
  display:grid;
  grid-template-columns:minmax(220px,260px) minmax(0,1fr) minmax(250px,300px);
  min-height:0;
  overflow:hidden;
}

.left,.right{
  background:#11151C;
  overflow-y:auto;
  overflow-x:hidden;
}

.left{border-right:1px solid var(--border);}
.right{border-left:1px solid var(--border);}

.center{
  min-width:0;
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.panel-title{
  padding:14px 16px;
  border-bottom:1px solid var(--border);
  font-size:11px;
  font-family:var(--mono);
  letter-spacing:.12em;
  color:var(--muted);
}

.kpi{
  padding:16px;
  border-bottom:1px solid var(--border);
}

.kpi-label{
  font-size:11px;
  color:var(--muted);
  margin-bottom:8px;
}

.kpi-value{
  font-size:28px;
  font-weight:700;
  font-family:var(--mono);
}

.kpi-sub{
  margin-top:8px;
  font-size:12px;
  font-family:var(--mono);
}

.tabs{
  display:flex;
  gap:8px;
  padding:14px 18px 0;
  flex-wrap:wrap;
}

.tab{
  border:none;
  padding:10px 16px;
  border-radius:8px;
  background:#1B2029;
  color:#9CA3AF;
  cursor:pointer;
  font-family:var(--mono);
  font-size:12px;
  transition:.15s;
}

.tab:hover{background:#232834;}
.tab.active{color:#111;font-weight:700;}

.mode-badge{
  margin-left:auto;
  padding:10px 14px;
  border:1px solid var(--border);
  border-radius:8px;
  color:var(--muted);
  font-family:var(--mono);
  font-size:11px;
}

.range{
  display:flex;
  gap:6px;
  padding:14px 18px 0;
}

.range button{
  border:none;
  background:#1B2029;
  color:#9CA3AF;
  height:28px;
  padding:0 12px;
  border-radius:6px;
  cursor:pointer;
  font-family:var(--mono);
  font-size:11px;
}

.range button.active{
  background:#C9A84C;
  color:#111;
  font-weight:700;
}

.chart-header{
  padding:18px 22px 0;
  display:flex;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
}

.chart-symbol{
  font-size:24px;
  font-family:var(--mono);
  font-weight:700;
}

.chart-name{
  color:var(--muted);
  font-size:13px;
}

.chart-price{
  margin-left:auto;
  font-size:24px;
  font-family:var(--mono);
  font-weight:700;
}

.chart-wrap{
  flex:1;
  min-height:0;
  padding:12px 18px 6px;
}

.bottom-chart{
  height:170px;
  border-top:1px solid var(--border);
  padding:12px 18px;
}

.stat{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:14px;
  padding:14px 16px;
  border-bottom:1px solid var(--border);
}

.stat-label{
  font-size:12px;
  color:var(--muted);
}

.stat-value{
  font-family:var(--mono);
  font-size:12px;
  font-weight:600;
  text-align:right;
}

.insight-box{
  padding:16px;
  border-bottom:1px solid var(--border);
  color:#AAB1C2;
  font-size:13px;
  line-height:1.55;
}

.rank-row{
  display:grid;
  grid-template-columns:42px 1fr auto;
  gap:10px;
  padding:12px 16px;
  border-bottom:1px solid var(--border);
  align-items:center;
  font-family:var(--mono);
  font-size:12px;
}

.rank-name{font-weight:700;}
.rank-meta{color:var(--muted);font-size:10px;margin-top:4px;}
.rank-value{font-weight:700;}

.tip{
  background:#1A1E28;
  border:1px solid var(--border2);
  border-radius:8px;
  padding:10px 12px;
  font-family:var(--mono);
}

.tip-date{
  margin-bottom:8px;
  color:var(--muted);
  font-size:10px;
}

.tip-row{
  display:flex;
  justify-content:space-between;
  gap:18px;
  margin-top:6px;
  font-size:11px;
}

::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-thumb{background:#2A2F3B;border-radius:99px;}
`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tip">
      <div className="tip-date">{label}</div>

      {payload.map((p, i) => {
        const isReturn =
          p.name === "Return" ||
          p.name === "Growth" ||
          STOCKS.includes(p.name);

        return (
          <div className="tip-row" key={i}>
            <span>{p.name}</span>
            <span style={{ color: p.color }}>
              {isReturn ? P(Number(p.value)) : `Rp ${N(p.value)}`}
            </span>
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

  return (
    <div
      style={{
        marginLeft: "auto",
        fontFamily: "var(--mono)",
        color: "var(--muted)",
        fontSize: 12,
      }}
    >
      {time} WIB
    </div>
  );
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

export default function StockDashboard() {
  const [csvData, setCsvData] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [selectedStocks, setSelectedStocks] = useState(["BBCA"]);
  const [range, setRange] = useState("ALL");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const selected = selectedStocks[0];
  const isComparison = selectedStocks.length > 1;
  const meta = META[selected];

  useEffect(() => {
    if (!document.getElementById("__dashboard_style")) {
      const style = document.createElement("style");
      style.id = "__dashboard_style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
  }, []);

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
          .filter((r) => r.date && r.stock && Number.isFinite(r.close));

        setCsvData(clean);
      })
      .catch(() => {
        setCsvData(generateDemo());
      });
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

      const today = TODAY();
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
        volume: live.vol,
        dailyReturn: ret,
        source: "live",
      };

      if (last?.date === today) {
        return [...base.slice(0, -1), liveRow];
      }

      return [...base, liveRow];
    },
    [csvData, quotes]
  );

  const mergedData = useMemo(() => {
    return getMergedRows(selected);
  }, [getMergedRows, selected]);

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
          : rows.slice(
              -{
                "1M": 22,
                "3M": 66,
                "6M": 132,
              }[range]
            );

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
            : rows.slice(
                -{
                  "1M": 22,
                  "3M": 66,
                  "6M": 132,
                }[range]
              );

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

        const riskReward = volatility !== 0 ? growth / volatility : 0;

        return {
          stock,
          growth,
          volatility,
          winRate,
          riskReward,
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedStocks,
          range,
          comparisonStats,
        }),
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

  const period =
    first && price ? ((price - first.close) / first.close) * 100 : 0;

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

        <Clock />
      </div>

      <div className="body">
        <div className="left">
          <div className="panel-title">
            {isComparison ? "COMPARISON MODE" : `${selected} OVERVIEW`}
          </div>

          {!isComparison ? (
            <>
              <div className="kpi">
                <div className="kpi-label">LAST PRICE</div>

                <div className="kpi-value" style={{ color: meta.hue }}>
                  Rp {N(price)}
                </div>

                <div
                  className="kpi-sub"
                  style={{ color: daily >= 0 ? "var(--up)" : "var(--dn)" }}
                >
                  {P(daily)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">PERIOD RETURN</div>

                <div
                  className="kpi-value"
                  style={{ color: period >= 0 ? "var(--up)" : "var(--dn)" }}
                >
                  {P(period)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">MA20 SIGNAL</div>

                <div
                  className="kpi-value"
                  style={{
                    color: price >= last?.ma20 ? "var(--up)" : "var(--dn)",
                  }}
                >
                  {price >= last?.ma20 ? "Bullish" : "Bearish"}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="kpi">
                <div className="kpi-label">SELECTED STOCKS</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>
                  {selectedStocks.join(" / ")}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">TOP PERFORMER</div>
                <div
                  className="kpi-value"
                  style={{ color: META[topStock?.stock]?.hue, fontSize: 26 }}
                >
                  {topStock?.stock}
                </div>
                <div className="kpi-sub" style={{ color: "var(--up)" }}>
                  {P(topStock?.growth)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">WEAKEST PERFORMER</div>
                <div className="kpi-value" style={{ color: "var(--dn)", fontSize: 26 }}>
                  {worstStock?.stock}
                </div>
                <div className="kpi-sub" style={{ color: "var(--dn)" }}>
                  {P(worstStock?.growth)}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="center">
          <div className="tabs">
            {STOCKS.map((s) => (
              <button
                key={s}
                className={`tab ${selectedStocks.includes(s) ? "active" : ""}`}
                style={{
                  background: selectedStocks.includes(s) ? META[s].hue : "#1B2029",
                }}
                onClick={() => toggleStock(s)}
              >
                {s}
              </button>
            ))}

            <div className="mode-badge">
              {isComparison ? "NORMALIZED COMPARISON" : "SINGLE STOCK"}
            </div>
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

          <div className="chart-header">
            <div className="chart-symbol">
              {isComparison ? selectedStocks.join(" VS ") : selected}
            </div>

            <div className="chart-name">
              {isComparison ? "Normalized Growth Comparison" : meta.name}
            </div>

            {!isComparison && (
              <div className="chart-price" style={{ color: meta.hue }}>
                Rp {N(price)}
              </div>
            )}
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              {isComparison ? (
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#1F2430" vertical={false} />

                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                  />

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
                      strokeWidth={2.4}
                      dot={false}
                    />
                  ))}
                </LineChart>
              ) : (
                <AreaChart data={displayData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={meta.hue} stopOpacity={0.3} />
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
                    strokeWidth={2}
                    fill="url(#grad)"
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="ma20"
                    name="MA20"
                    stroke="rgba(255,255,255,.25)"
                    dot={false}
                    strokeDasharray="4 4"
                  />

                  <ReferenceLine y={price} stroke={meta.hue} strokeOpacity={0.3} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="bottom-chart">
            <ResponsiveContainer width="100%" height="100%">
              {isComparison ? (
                <BarChart data={comparisonStats}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#1F2430" vertical={false} />

                  <XAxis
                    dataKey="stock"
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                  />

                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    width={42}
                    tickFormatter={(v) => `${v}%`}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <ReferenceLine y={0} stroke="rgba(255,255,255,.12)" />

                  <Bar dataKey="growth" name="Growth">
                    {comparisonStats.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.growth >= 0 ? META[d.stock].hue : "#C26B6B"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
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
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="right">
          {!isComparison ? (
            <>
              <div className="panel-title">STATISTICS</div>

              <div className="stat">
                <span className="stat-label">Period High</span>
                <span className="stat-value" style={{ color: "#5BA47A" }}>
                  Rp {N(stats.high)}
                </span>
              </div>

              <div className="stat">
                <span className="stat-label">Period Low</span>
                <span className="stat-value" style={{ color: "#C26B6B" }}>
                  Rp {N(stats.low)}
                </span>
              </div>

              <div className="stat">
                <span className="stat-label">Best Day</span>
                <span className="stat-value" style={{ color: "#5BA47A" }}>
                  {P(stats.best)}
                </span>
              </div>

              <div className="stat">
                <span className="stat-label">Worst Day</span>
                <span className="stat-value" style={{ color: "#C26B6B" }}>
                  {P(stats.worst)}
                </span>
              </div>

              <div className="stat">
                <span className="stat-label">Win Rate</span>
                <span className="stat-value" style={{ color: meta.hue }}>
                  {stats.win}%
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="panel-title">COMPARISON INSIGHT</div>

              <div className="insight-box">
                {aiLoading
                  ? "Generating AI insight..."
                  : aiInsight || "AI insight belum tersedia. Pastikan server AI berjalan."}
              </div>

              <div className="panel-title">PERFORMANCE RANKING</div>

              {comparisonStats.map((item, index) => (
                <div className="rank-row" key={item.stock}>
                  <div>#{index + 1}</div>

                  <div>
                    <div className="rank-name" style={{ color: META[item.stock].hue }}>
                      {item.stock}
                    </div>
                    <div className="rank-meta">
                      Vol {item.volatility.toFixed(2)}% · Win {item.winRate.toFixed(1)}%
                    </div>
                  </div>

                  <div
                    className="rank-value"
                    style={{ color: item.growth >= 0 ? "var(--up)" : "var(--dn)" }}
                  >
                    {P(item.growth)}
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="panel-title">MARKET STATUS</div>

          <div className="stat">
            <span className="stat-label">Market</span>

            <span
              className="stat-value"
              style={{ color: isOpen() ? "#5BA47A" : "#C26B6B" }}
            >
              {isOpen() ? "OPEN" : "CLOSED"}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">Last Update</span>

            <span className="stat-value">
              {lastUpdate ? lastUpdate.toLocaleTimeString("id-ID") : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}