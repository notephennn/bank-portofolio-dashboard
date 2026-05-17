import React, { useEffect, useMemo, useState, useCallback } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";

/* ════════════════════════════════════════
   CONFIG
════════════════════════════════════════ */
const STOCKS = ["BBCA", "BBRI", "BMRI", "BBNI"];

const META = {
  BBCA: {
    name: "Bank Central Asia",
    short: "BCA",
    ticker: "BBCA.JK",
    hue: "#C9A84C",
  },
  BBRI: {
    name: "Bank Rakyat Indonesia",
    short: "BRI",
    ticker: "BBRI.JK",
    hue: "#6E9ECC",
  },
  BMRI: {
    name: "Bank Mandiri",
    short: "BMRI",
    ticker: "BMRI.JK",
    hue: "#8FA876",
  },
  BBNI: {
    name: "Bank Negara Indonesia",
    short: "BNI",
    ticker: "BBNI.JK",
    hue: "#B07BAC",
  },
};

const REFRESH = 60;

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function isOpen() {
  const w = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    })
  );

  const d = w.getDay();
  const m = w.getHours() * 60 + w.getMinutes();

  return d >= 1 && d <= 5 && m >= 540 && m <= 915;
}

async function fetchQuote(ticker) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    );

    if (!r.ok) throw new Error();

    const j = await r.json();

    const meta = j?.chart?.result?.[0]?.meta;

    if (!meta) throw new Error();

    return {
      price: meta.regularMarketPrice,
      prev: meta.chartPreviousClose ?? meta.previousClose,
      vol: meta.regularMarketVolume,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen,
    };
  } catch {
    return null;
  }
}

const N = (v) =>
  v != null ? Math.round(v).toLocaleString("id-ID") : "—";

const P = (v) =>
  v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "—";

const TODAY = () => new Date().toISOString().slice(0, 10);

/* ════════════════════════════════════════
   CSS
════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

:root{
  --bg:#0D0F14;
  --bg1:#13161D;
  --border:rgba(255,255,255,.06);
  --border2:rgba(255,255,255,.12);
  --text:#D8DCE8;
  --muted:#6B7280;
  --faint:#232834;
  --up:#5BA47A;
  --dn:#C26B6B;
  --mono:'DM Mono', monospace;
  --sans:'DM Sans', sans-serif;
}

*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

html,body,#root{
  width:100%;
  height:100%;
  overflow:hidden;
  background:var(--bg);
}

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

/* TOPBAR */
.topbar{
  height:52px;
  min-height:52px;

  display:flex;
  align-items:center;

  padding:0 18px;

  border-bottom:1px solid var(--border);
  background:#10131A;

  flex-shrink:0;
}

.logo{
  display:flex;
  align-items:center;
  gap:12px;
}

.mark{
  width:28px;
  height:28px;
  border-radius:6px;
  background:#C9A84C;

  display:flex;
  align-items:center;
  justify-content:center;

  color:#111;
  font-size:11px;
  font-weight:700;
  font-family:var(--mono);
}

.logo-title{
  font-size:15px;
  font-weight:700;
}

.logo-sub{
  font-size:10px;
  color:var(--muted);
  font-family:var(--mono);
  letter-spacing:.12em;
}

/* BODY */
.body{
  flex:1;

  display:grid;

  grid-template-columns:
    minmax(220px, 260px)
    minmax(0, 1fr)
    minmax(220px, 260px);

  min-height:0;
  width:100%;

  overflow:hidden;
}

/* LEFT */
.left{
  border-right:1px solid var(--border);
  background:#11151C;

  overflow-y:auto;
  overflow-x:hidden;
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
  font-size:30px;
  font-weight:700;
  font-family:var(--mono);
}

.kpi-sub{
  margin-top:8px;
  font-size:12px;
  font-family:var(--mono);
}

/* CENTER */
.center{
  min-width:0;

  display:flex;
  flex-direction:column;

  overflow:hidden;
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

/* RIGHT */
.right{
  border-left:1px solid var(--border);
  background:#11151C;

  overflow-y:auto;
  overflow-x:hidden;
}

.stat{
  display:flex;
  justify-content:space-between;
  align-items:center;

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
}

/* STOCK TABS */
.tabs{
  display:flex;
  gap:8px;

  padding:14px 18px 0;
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

.tab:hover{
  background:#232834;
}

.tab.active{
  color:#111;
  font-weight:700;
}

/* RANGE */
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

/* TOOLTIP */
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

/* SCROLLBAR */
::-webkit-scrollbar{
  width:4px;
}

::-webkit-scrollbar-thumb{
  background:#2A2F3B;
  border-radius:99px;
}
`;

/* ════════════════════════════════════════
   TOOLTIP
════════════════════════════════════════ */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="tip">
      <div className="tip-date">{label}</div>

      {payload.map((p, i) => (
        <div className="tip-row" key={i}>
          <span>{p.name}</span>

          <span style={{ color: p.color }}>
            {p.name === "Return"
              ? P(p.value)
              : `Rp ${N(p.value)}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════
   CLOCK
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   MAIN
════════════════════════════════════════ */
export default function StockDashboard() {
  const [csvData, setCsvData] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [selected, setSelected] = useState("BBCA");
  const [range, setRange] = useState("ALL");
  const [lastUpdate, setLastUpdate] = useState(null);

  /* inject css */
  useEffect(() => {
    if (!document.getElementById("__dashboard_style")) {
      const style = document.createElement("style");

      style.id = "__dashboard_style";
      style.textContent = CSS;

      document.head.appendChild(style);
    }
  }, []);

  /* LOAD CSV */
  useEffect(() => {
    fetch("/data/stocks_processed.csv")
      .then((r) => r.text())
      .then((txt) => {
        const { data } = Papa.parse(txt, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        const clean = data.map((r) => ({
          date: r.Date,
          stock: r.Stock,
          close: r.Close,
          ma20: r.MA20,
          volume: r.Volume,
          dailyReturn: r.Daily_Return,
          source: "csv",
        }));

        setCsvData(clean);
      })
      .catch(() => {
        setCsvData(generateDemo());
      });
  }, []);

  /* REALTIME FETCH */
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

  /* HYBRID METHOD */
  const mergedData = useMemo(() => {
    const base = csvData.filter((x) => x.stock === selected);

    const live = quotes[selected];

    if (!live) return base;

    const today = TODAY();

    const last = base[base.length - 1];

    const ret = live.prev
      ? ((live.price - live.prev) / live.prev) * 100
      : 0;

    const ma20 =
      [...base.slice(-19).map((x) => x.close), live.price].reduce(
        (a, b) => a + b,
        0
      ) / 20;

    const liveRow = {
      date: today,
      stock: selected,
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
  }, [csvData, quotes, selected]);

  /* RANGE */
  const displayData = useMemo(() => {
    if (range === "ALL") return mergedData;

    const map = {
      "1M": 22,
      "3M": 66,
      "6M": 132,
    };

    return mergedData.slice(-map[range]);
  }, [mergedData, range]);

  const last = displayData[displayData.length - 1];
  const first = displayData[0];

  const q = quotes[selected];

  const price = q?.price ?? last?.close;

  const daily =
    q && q.prev
      ? ((q.price - q.prev) / q.prev) * 100
      : last?.dailyReturn;

  const period =
    first && price
      ? ((price - first.close) / first.close) * 100
      : 0;

  const meta = META[selected];

  const stats = useMemo(() => {
    const closes = displayData.map((x) => x.close);
    const returns = displayData.map((x) => x.dailyReturn ?? 0);

    return {
      high: Math.max(...closes),
      low: Math.min(...closes),
      best: Math.max(...returns),
      worst: Math.min(...returns),
      win: (
        (returns.filter((x) => x > 0).length /
          returns.length) *
        100
      ).toFixed(1),
    };
  }, [displayData]);

  return (
    <div className="root">
      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo">
          <div className="mark">IDX</div>

          <div>
            <div className="logo-title">
              FINTECH ANALYTICS
            </div>

            <div className="logo-sub">
              INDONESIAN BANKING
            </div>
          </div>
        </div>

        <Clock />
      </div>

      {/* BODY */}
      <div className="body">
        {/* LEFT */}
        <div className="left">
          <div className="panel-title">
            {selected} OVERVIEW
          </div>

          <div className="kpi">
            <div className="kpi-label">LAST PRICE</div>

            <div
              className="kpi-value"
              style={{ color: meta.hue }}
            >
              Rp {N(price)}
            </div>

            <div
              className="kpi-sub"
              style={{
                color:
                  daily >= 0
                    ? "var(--up)"
                    : "var(--dn)",
              }}
            >
              {P(daily)}
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-label">
              PERIOD RETURN
            </div>

            <div
              className="kpi-value"
              style={{
                color:
                  period >= 0
                    ? "var(--up)"
                    : "var(--dn)",
              }}
            >
              {P(period)}
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-label">MA20 SIGNAL</div>

            <div
              className="kpi-value"
              style={{
                color:
                  price >= last?.ma20
                    ? "var(--up)"
                    : "var(--dn)",
              }}
            >
              {price >= last?.ma20
                ? "Bullish"
                : "Bearish"}
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="center">
          {/* TABS */}
          <div className="tabs">
            {STOCKS.map((s) => (
              <button
                key={s}
                className={`tab ${
                  selected === s ? "active" : ""
                }`}
                style={{
                  background:
                    selected === s
                      ? META[s].hue
                      : "#1B2029",
                }}
                onClick={() => setSelected(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* RANGE */}
          <div className="range">
            {["1M", "3M", "6M", "ALL"].map((r) => (
              <button
                key={r}
                className={
                  range === r ? "active" : ""
                }
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>

          {/* HEADER */}
          <div className="chart-header">
            <div className="chart-symbol">
              {selected}
            </div>

            <div className="chart-name">
              {meta.name}
            </div>

            <div
              className="chart-price"
              style={{ color: meta.hue }}
            >
              Rp {N(price)}
            </div>
          </div>

          {/* PRICE CHART */}
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient
                    id="grad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={meta.hue}
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="95%"
                      stopColor={meta.hue}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="#1F2430"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fill: "#6B7280",
                    fontSize: 10,
                  }}
                />

                <YAxis
                  tick={{
                    fill: "#6B7280",
                    fontSize: 10,
                  }}
                  width={44}
                />

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
                  stroke="rgba(255,255,255,.25)"
                  dot={false}
                  strokeDasharray="4 4"
                />

                <ReferenceLine
                  y={price}
                  stroke={meta.hue}
                  strokeOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* RETURN CHART */}
          <div className="bottom-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData}>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="#1F2430"
                  vertical={false}
                />

                <XAxis dataKey="date" hide />

                <YAxis
                  tick={{
                    fill: "#6B7280",
                    fontSize: 10,
                  }}
                  width={42}
                />

                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine
                  y={0}
                  stroke="rgba(255,255,255,.12)"
                />

                <Bar
                  dataKey="dailyReturn"
                  name="Return"
                >
                  {displayData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.dailyReturn >= 0
                          ? "#5BA47A"
                          : "#C26B6B"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="panel-title">
            STATISTICS
          </div>

          <div className="stat">
            <span className="stat-label">
              Period High
            </span>

            <span
              className="stat-value"
              style={{ color: "#5BA47A" }}
            >
              Rp {N(stats.high)}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Period Low
            </span>

            <span
              className="stat-value"
              style={{ color: "#C26B6B" }}
            >
              Rp {N(stats.low)}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Best Day
            </span>

            <span
              className="stat-value"
              style={{ color: "#5BA47A" }}
            >
              {P(stats.best)}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Worst Day
            </span>

            <span
              className="stat-value"
              style={{ color: "#C26B6B" }}
            >
              {P(stats.worst)}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Win Rate
            </span>

            <span
              className="stat-value"
              style={{ color: meta.hue }}
            >
              {stats.win}%
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Market
            </span>

            <span
              className="stat-value"
              style={{
                color: isOpen()
                  ? "#5BA47A"
                  : "#C26B6B",
              }}
            >
              {isOpen() ? "OPEN" : "CLOSED"}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Last Update
            </span>

            <span className="stat-value">
              {lastUpdate
                ? lastUpdate.toLocaleTimeString(
                    "id-ID"
                  )
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   DEMO CSV FALLBACK
════════════════════════════════════════ */
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
        ma20: Math.round(
          cl * (0.98 + Math.random() * 0.04)
        ),
        volume: Math.round(
          50e6 + Math.random() * 180e6
        ),
        dailyReturn: +(
          (n / base[s]) *
          100
        ).toFixed(2),
        source: "csv",
      });
    }
  }

  return rows;
}