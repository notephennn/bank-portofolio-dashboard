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

/* ══════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════ */
const STOCKS = ["BBCA", "BBRI", "BMRI", "BBNI"];

const STOCK_META = {
  BBCA: { name: "Bank Central Asia",     ticker: "BBCA.JK", color: "#00D4FF" },
  BBRI: { name: "Bank Rakyat Indonesia", ticker: "BBRI.JK", color: "#FF6B35" },
  BMRI: { name: "Bank Mandiri",          ticker: "BMRI.JK", color: "#A78BFA" },
  BBNI: { name: "Bank Negara Indonesia", ticker: "BBNI.JK", color: "#34D399" },
};

const REFRESH_SECS = 60;

// IDX market hours (WIB = UTC+7): 09:00–15:15, Mon–Fri
function isMarketOpen() {
  const wib = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const day = wib.getDay();
  const mins = wib.getHours() * 60 + wib.getMinutes();
  return day >= 1 && day <= 5 && mins >= 9 * 60 && mins <= 15 * 60 + 15;
}

// Yahoo Finance – fetch quote via public chart endpoint
async function fetchYahooQuote(ticker) {
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}` +
      `?interval=1d&range=1d&includePrePost=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const m = json?.chart?.result?.[0]?.meta;
    if (!m) throw new Error("no meta");
    return {
      price:       m.regularMarketPrice,
      prevClose:   m.chartPreviousClose ?? m.previousClose,
      volume:      m.regularMarketVolume,
      high:        m.regularMarketDayHigh,
      low:         m.regularMarketDayLow,
      open:        m.regularMarketOpen,
      marketState: m.marketState,
    };
  } catch (e) {
    console.warn("Yahoo fetch failed:", ticker, e.message);
    return null;
  }
}

/* ══════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

.s{font-family:'Syne',sans-serif;background:#03050D;color:#E2E8F0;min-height:100vh;overflow-x:hidden;position:relative}
.s-grid{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(0,212,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.025) 1px,transparent 1px);background-size:44px 44px}
.s-glow{position:fixed;pointer-events:none;z-index:0;top:-30%;left:-15%;width:55%;height:60%;background:radial-gradient(ellipse,rgba(0,212,255,.055) 0%,transparent 70%)}
.s-glow2{position:fixed;pointer-events:none;z-index:0;bottom:-20%;right:-10%;width:40%;height:50%;background:radial-gradient(ellipse,rgba(167,139,250,.04) 0%,transparent 70%)}
.ly{position:relative;z-index:1}

/* NAV */
.nav{position:sticky;top:0;z-index:100;background:rgba(3,5,13,.9);backdrop-filter:blur(24px);border-bottom:1px solid rgba(0,212,255,.1)}
.nav-i{max-width:1440px;margin:0 auto;height:62px;padding:0 28px;display:flex;align-items:center;justify-content:space-between}
.nav-brand{display:flex;align-items:center;gap:12px}
.nav-logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#00D4FF,#0055FF);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#03050D}
.nav-t{font-size:17px;font-weight:700;letter-spacing:-.3px}
.nav-s{font-size:10px;color:rgba(0,212,255,.65);letter-spacing:2px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;margin-top:1px}
.nav-r{display:flex;align-items:center;gap:12px}
.nav-time{font-family:'IBM Plex Mono',monospace;font-size:12px;color:rgba(226,232,240,.4)}

.pill{display:flex;align-items:center;gap:7px;border-radius:100px;padding:5px 11px;font-size:11px;font-family:'IBM Plex Mono',monospace;font-weight:500}
.p-green{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.22);color:#34D399}
.p-gray{background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.15);color:#94A3B8}
.p-amber{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.22);color:#F59E0B;cursor:default}
.p-red{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.22);color:#F87171}

.blink{width:7px;height:7px;border-radius:50%}
@keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.65)}}
.bl-g{background:#34D399;animation:blink 1.8s infinite}
.bl-gray{background:#64748B}

.rbar{height:2px;background:rgba(0,212,255,.1);position:relative;overflow:hidden}
.rfill{position:absolute;left:0;top:0;height:100%;background:linear-gradient(90deg,#00D4FF,#0055FF);transition:width 1s linear}

/* CONTENT */
.cx{max-width:1440px;margin:0 auto;padding:26px 28px 40px}

/* LIVE BANNER */
.lbanner{background:rgba(0,212,255,.035);border:1px solid rgba(0,212,255,.1);border-radius:14px;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px;font-family:'IBM Plex Mono',monospace;font-size:11px}
.lb-left{display:flex;align-items:center;gap:9px;color:rgba(226,232,240,.45)}
.lb-stocks{display:flex;gap:20px;flex-wrap:wrap}
.lq{display:flex;align-items:center;gap:7px;cursor:pointer}
.lq-t{color:rgba(226,232,240,.4)}
.lq-p{font-weight:500}
.up{color:#34D399}.dn{color:#F87171}.na{color:#64748B}

/* SELECTOR */
.sel-lbl{font-size:10px;letter-spacing:2px;color:rgba(226,232,240,.35);text-transform:uppercase;font-family:'IBM Plex Mono',monospace;margin-bottom:10px}
.sel-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
.sb{padding:10px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);color:rgba(226,232,240,.5);font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;cursor:pointer;transition:all .18s;letter-spacing:.5px}
.sb:hover{color:#E2E8F0;background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14)}
.sb.active{color:#03050D;font-weight:700;border-color:transparent}
.sb-sub{font-size:9px;display:block;margin-top:3px;opacity:.6;font-family:'Syne',sans-serif;font-weight:400;letter-spacing:0}

/* KPI */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
@media(max-width:1100px){.kpi-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.kpi-grid{grid-template-columns:1fr}}
.kpi{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:18px;padding:20px 22px;position:relative;overflow:hidden;transition:transform .18s,border-color .18s}
.kpi:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.11)}
.kpi-orb{position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;opacity:.07;pointer-events:none}
.kpi-lbl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,232,240,.4);font-family:'IBM Plex Mono',monospace;margin-bottom:12px;display:flex;align-items:center;gap:5px}
.kpi-val{font-size:24px;font-weight:700;letter-spacing:-.5px;margin-bottom:9px;line-height:1}
.kpi-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-family:'IBM Plex Mono',monospace;padding:3px 8px;border-radius:6px;margin-bottom:8px}
.src{font-size:9px;font-family:'IBM Plex Mono',monospace;color:rgba(226,232,240,.22);letter-spacing:1px;display:flex;align-items:center;gap:4px}
.src-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.live-ld{width:5px;height:5px;border-radius:50%;animation:blink 1.8s infinite;display:inline-block}

/* CARD */
.card{background:rgba(255,255,255,.022);border:1px solid rgba(255,255,255,.065);border-radius:20px;padding:24px;margin-bottom:20px}
.ch{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px}
.ct{font-size:17px;font-weight:700;letter-spacing:-.3px}
.cs{font-size:11px;color:rgba(226,232,240,.4);margin-top:3px;font-family:'IBM Plex Mono',monospace}
.rtabs{display:flex;gap:3px;background:rgba(0,0,0,.35);border-radius:10px;padding:3px}
.rtab{padding:5px 11px;border-radius:7px;font-size:11px;font-family:'IBM Plex Mono',monospace;cursor:pointer;color:rgba(226,232,240,.45);background:transparent;border:none;transition:all .18s}
.rtab.active{background:rgba(255,255,255,.09);color:#E2E8F0}
.leg{display:flex;align-items:center;gap:14px}
.leg-i{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(226,232,240,.5);font-family:'IBM Plex Mono',monospace}
.leg-ln{width:18px;height:2px;border-radius:2px}
.leg-da{width:18px;border-top:2px dashed}

/* TWO COL */
.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:900px){.two{grid-template-columns:1fr}}

/* STAT ROW */
.sr{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.sr:last-child{border-bottom:none}
.sr-l{font-size:12px;color:rgba(226,232,240,.45)}
.sr-v{font-size:13px;font-weight:600;font-family:'IBM Plex Mono',monospace}

/* TOOLTIP */
.tt{background:rgba(4,8,20,.96);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:13px 16px;backdrop-filter:blur(20px);box-shadow:0 16px 48px rgba(0,0,0,.6)}
.tt-d{font-size:10px;color:rgba(226,232,240,.4);font-family:'IBM Plex Mono',monospace;margin-bottom:9px;letter-spacing:1px}
.tt-r{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.tt-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.tt-n{font-size:11px;color:rgba(226,232,240,.5)}
.tt-v{font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace;margin-left:auto}

/* WM */
.wm{text-align:center;padding:24px;font-size:10px;color:rgba(226,232,240,.18);letter-spacing:2px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace}

/* ANIM */
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fadeUp .38s ease forwards}
.d1{animation-delay:.05s;opacity:0}.d2{animation-delay:.1s;opacity:0}
.d3{animation-delay:.15s;opacity:0}.d4{animation-delay:.2s;opacity:0}
.d5{animation-delay:.25s;opacity:0}.d6{animation-delay:.3s;opacity:0}

@keyframes flash{0%{background:rgba(0,212,255,.1)}100%{background:transparent}}
.flash{animation:flash 1.2s ease}
`;

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
const fmt    = n => n != null ? Math.round(n).toLocaleString("id-ID") : "—";
const fmtPct = n => n != null ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "—";
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ══════════════════════════════════════════════════════
   TOOLTIP
══════════════════════════════════════════════════════ */
function ChartTip({ active, payload, label, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <div className="tt-d">{label}</div>
      {payload.map((p, i) => (
        <div className="tt-r" key={i}>
          <div className="tt-dot" style={{ background: p.color || color }} />
          <span className="tt-n">{p.name}</span>
          <span className="tt-v" style={{ color: p.color || color }}>
            {p.name?.includes("Return") ? fmtPct(p.value) : `Rp ${fmt(p.value)}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LIVE CLOCK
══════════════════════════════════════════════════════ */
function LiveClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT("WIB " + new Date().toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit"
    }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="nav-time">{t}</span>;
}

/* ══════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════ */
export default function StockDashboard() {
  const [csvData,    setCsvData]    = useState([]);
  const [quotes,     setQuotes]     = useState({});     // { BBCA:{price,...}, ... }
  const [liveStatus, setLiveStatus] = useState("idle"); // idle|loading|ok|error
  const [lastUpd,    setLastUpd]    = useState(null);
  const [countdown,  setCountdown]  = useState(REFRESH_SECS);
  const [selected,   setSelected]   = useState("BBCA");
  const [range,      setRange]      = useState("ALL");
  const [flashKey,   setFlashKey]   = useState(0);

  const meta = STOCK_META[selected];

  /* Style injection */
  useEffect(() => {
    if (!document.getElementById("s-css")) {
      const el = document.createElement("style");
      el.id = "s-css"; el.textContent = CSS;
      document.head.appendChild(el);
    }
  }, []);

  /* Load CSV (historical baseline) */
  useEffect(() => {
    fetch("/data/stocks_processed.csv")
      .then(r => r.text())
      .then(csv => {
        const { data: rows } = Papa.parse(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });
        setCsvData(rows.map(r => ({
          date: r.Date, stock: r.Stock,
          close: r.Close, ma20: r.MA20,
          volume: r.Volume, dailyReturn: r.Daily_Return,
          source: "csv",
        })));
      })
      .catch(() => setCsvData(generateDemoData()));
  }, []);

  /* Fetch all live quotes */
  const fetchLive = useCallback(async () => {
    setLiveStatus("loading");
    const res = {};
    await Promise.all(
      STOCKS.map(async s => {
        const q = await fetchYahooQuote(STOCK_META[s].ticker);
        if (q) res[s] = q;
      })
    );
    if (Object.keys(res).length) {
      setQuotes(res);
      setLiveStatus("ok");
      setLastUpd(new Date());
      setFlashKey(k => k + 1);
    } else {
      setLiveStatus("error");
    }
    setCountdown(REFRESH_SECS);
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  /* Countdown & auto-refresh */
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchLive(); return REFRESH_SECS; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [fetchLive]);

  /* Merge CSV + live today row */
  const mergedData = useMemo(() => {
    const base = csvData.filter(d => d.stock === selected);
    const q = quotes[selected];
    if (!q) return base;

    const td = todayStr();
    const last = base[base.length - 1];
    const liveReturn = q.prevClose ? ((q.price - q.prevClose) / q.prevClose * 100) : null;

    // Recalculate MA20 with live price
    const prev19 = base.slice(-19).map(d => d.close);
    const liveMA20 = prev19.length
      ? ([...prev19, q.price].reduce((a, b) => a + b, 0) / (prev19.length + 1))
      : null;

    const liveRow = {
      date: td, stock: selected,
      close: q.price, ma20: liveMA20,
      volume: q.volume, dailyReturn: liveReturn,
      source: "live",
    };

    // Replace today if already exists, else append
    return last?.date === td
      ? [...base.slice(0, -1), liveRow]
      : [...base, liveRow];
  }, [csvData, quotes, selected]);

  /* Range filter */
  const display = useMemo(() => {
    if (range === "ALL") return mergedData;
    const n = range === "1M" ? 22 : range === "3M" ? 66 : 132;
    return mergedData.slice(-n);
  }, [mergedData, range]);

  /* Derived values */
  const latest  = display[display.length - 1];
  const first   = display[0];
  const q       = quotes[selected];

  const livePrice  = q?.price ?? latest?.close;
  const prevClose  = q?.prevClose;
  const dayChg     = q && prevClose ? ((q.price - prevClose) / prevClose * 100) : latest?.dailyReturn;
  const periodRet  = first && livePrice ? ((livePrice - first.close) / first.close * 100) : 0;

  const stats = useMemo(() => {
    if (!display.length) return {};
    const closes  = display.map(d => d.close   ?? 0);
    const returns = display.map(d => d.dailyReturn ?? 0);
    const vols    = display.map(d => d.volume   ?? 0);
    const pos     = returns.filter(r => r > 0);
    return {
      high:      Math.max(...closes),
      low:       Math.min(...closes),
      avgReturn: returns.reduce((a, b) => a + b, 0) / (returns.length || 1),
      avgVol:    Math.round(vols.reduce((a, b) => a + b, 0) / (vols.length || 1)),
      winRate:   ((pos.length / (returns.length || 1)) * 100).toFixed(1),
      maxReturn: Math.max(...returns),
      minReturn: Math.min(...returns),
    };
  }, [display]);

  const marketOpen = isMarketOpen();

  /* ── RENDER ── */
  return (
    <div className="s">
      {/* per-stock active button colors */}
      <style>{`
        .sb[data-s="BBCA"].active{background:linear-gradient(135deg,#00D4FF,#0055FF);color:#03050D}
        .sb[data-s="BBRI"].active{background:linear-gradient(135deg,#FF6B35,#CC2200);color:#fff}
        .sb[data-s="BMRI"].active{background:linear-gradient(135deg,#A78BFA,#6D28D9);color:#fff}
        .sb[data-s="BBNI"].active{background:linear-gradient(135deg,#34D399,#059669);color:#03050D}
      `}</style>

      <div className="s-grid" /><div className="s-glow" /><div className="s-glow2" />

      {/* ── NAVBAR ── */}
      <nav className="nav ly">
        <div className="nav-i">
          <div className="nav-brand">
            <div className="nav-logo">IDX</div>
            <div>
              <div className="nav-t">Fintech Analytics</div>
              <div className="nav-s">Indonesian Banking Markets</div>
            </div>
          </div>
          <div className="nav-r">
            <LiveClock />
            <div className={`pill ${marketOpen ? "p-green" : "p-gray"}`}>
              <div className={`blink ${marketOpen ? "bl-g" : "bl-gray"}`} />
              {marketOpen ? "Market Open" : "Market Closed"}
            </div>
            {liveStatus === "ok" && (
              <div className="pill p-amber" title={`Auto-refresh in ${countdown}s`}>
                ⟳ {countdown}s
              </div>
            )}
            {liveStatus === "error" && (
              <div className="pill p-red" onClick={fetchLive} style={{ cursor: "pointer" }}>
                ↻ Retry
              </div>
            )}
          </div>
        </div>
        <div className="rbar">
          <div className="rfill" style={{ width: `${((REFRESH_SECS - countdown) / REFRESH_SECS) * 100}%` }} />
        </div>
      </nav>

      <div className="cx ly">

        {/* ── LIVE TICKER BANNER ── */}
        <div className="lbanner fu d1">
          <div className="lb-left">
            <div className={`blink ${liveStatus === "ok" ? "bl-g" : "bl-gray"}`}
              style={{ width: 7, height: 7, borderRadius: "50%",
                background: liveStatus === "ok" ? "#34D399" : "#64748B",
                animation: liveStatus === "ok" ? "blink 1.8s infinite" : "none" }} />
            {liveStatus === "ok"
              ? `Live · ${lastUpd?.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB`
              : liveStatus === "loading" ? "Fetching live prices…"
              : "Live unavailable · showing historical data"}
          </div>
          <div className="lb-stocks">
            {STOCKS.map(s => {
              const sq = quotes[s];
              const chg = sq?.prevClose ? ((sq.price - sq.prevClose) / sq.prevClose * 100) : null;
              return (
                <div className="lq" key={s} onClick={() => setSelected(s)}>
                  <span className="lq-t" style={{ color: selected === s ? STOCK_META[s].color : undefined }}>{s}</span>
                  <span className="lq-p" style={{ color: selected === s ? STOCK_META[s].color : "#E2E8F0" }}>
                    {sq ? `Rp ${fmt(sq.price)}` : "—"}
                  </span>
                  {chg != null
                    ? <span className={chg >= 0 ? "up" : "dn"}>{fmtPct(chg)}</span>
                    : <span className="na">–</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STOCK SELECTOR ── */}
        <div className="sel-lbl">Select Instrument</div>
        <div className="sel-row">
          {STOCKS.map(s => (
            <button key={s} data-s={s}
              className={`sb${selected === s ? " active" : ""}`}
              onClick={() => setSelected(s)}
              style={selected === s ? {} : { borderColor: `${STOCK_META[s].color}20` }}>
              {s}
              <span className="sb-sub">{STOCK_META[s].name}</span>
            </button>
          ))}
        </div>

        {/* ── KPI ROW ── */}
        <div className="kpi-grid">
          {/* Live Price */}
          <div key={`price-${flashKey}`} className="kpi fu d1" style={{ borderColor: `${meta.color}18` }}>
            <div className="kpi-orb" style={{ background: meta.color }} />
            <div className="kpi-lbl">
              {q && <div className="live-ld" style={{ background: meta.color }} />}
              {q ? "Live Price" : "Latest Price"}
            </div>
            <div className="kpi-val" style={{ color: meta.color }}>Rp {fmt(livePrice)}</div>
            <div className="kpi-badge"
              style={dayChg >= 0
                ? { background: "rgba(52,211,153,.12)", color: "#34D399" }
                : { background: "rgba(248,113,113,.12)", color: "#F87171" }}>
              {dayChg >= 0 ? "▲" : "▼"} {fmtPct(dayChg)} today
            </div>
            <div className="src">
              <div className="src-dot" style={{ background: q ? "#34D399" : "#64748B" }} />
              {q ? "Yahoo Finance · live" : "historical"}
            </div>
          </div>

          {/* Period Return */}
          <div className="kpi fu d2" style={{ borderColor: `${meta.color}18` }}>
            <div className="kpi-orb" style={{ background: meta.color }} />
            <div className="kpi-lbl">Period Return</div>
            <div className="kpi-val" style={{ color: periodRet >= 0 ? "#34D399" : "#F87171" }}>
              {fmtPct(periodRet)}
            </div>
            <div className="kpi-badge" style={{ background: "rgba(148,163,184,.08)", color: "#94A3B8" }}>
              ● {range === "ALL" ? "All time" : `Last ${range}`} · {display.length} days
            </div>
            <div className="src">
              <div className="src-dot" style={{ background: "#00D4FF" }} />
              CSV historical + live merged
            </div>
          </div>

          {/* MA20 Signal */}
          <div className="kpi fu d3" style={{ borderColor: `${meta.color}18` }}>
            <div className="kpi-orb" style={{ background: meta.color }} />
            <div className="kpi-lbl">MA20 Signal</div>
            <div className="kpi-val" style={{ color: livePrice >= latest?.ma20 ? "#34D399" : "#F87171" }}>
              {livePrice >= latest?.ma20 ? "Bullish ↑" : "Bearish ↓"}
            </div>
            <div className="kpi-badge" style={{ background: "rgba(148,163,184,.08)", color: "#94A3B8" }}>
              ● MA20 Rp {fmt(latest?.ma20)}
            </div>
            <div className="src">
              <div className="src-dot" style={{ background: "#F59E0B" }} />
              {q ? "recalculated with live" : "from CSV"}
            </div>
          </div>

          {/* Win Rate */}
          <div className="kpi fu d4" style={{ borderColor: `${meta.color}18` }}>
            <div className="kpi-orb" style={{ background: meta.color }} />
            <div className="kpi-lbl">Win Rate</div>
            <div className="kpi-val" style={{ color: meta.color }}>{stats.winRate ?? 0}%</div>
            <div className="kpi-badge" style={{ background: "rgba(148,163,184,.08)", color: "#94A3B8" }}>
              ● Avg {fmtPct(stats.avgReturn)}/day
            </div>
            <div className="src">
              <div className="src-dot" style={{ background: "#A78BFA" }} />
              {display.length} sessions analysed
            </div>
          </div>
        </div>

        {/* ── PRICE + MA CHART ── */}
        <div className="card fu d5">
          <div className="ch">
            <div>
              <div className="ct">{selected} · {meta.name}</div>
              <div className="cs">
                Close price vs MA20 —{" "}
                {q ? <span style={{ color: meta.color }}>last bar = live quote</span> : "historical only"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div className="leg">
                <div className="leg-i"><div className="leg-ln" style={{ background: meta.color }} />Close</div>
                <div className="leg-i"><div className="leg-da" style={{ borderColor: "#F59E0B" }} />MA20</div>
                {q && <div className="leg-i">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                  Live
                </div>}
              </div>
              <div className="rtabs">
                {["1M","3M","6M","ALL"].map(r => (
                  <button key={r} className={`rtab${range === r ? " active" : ""}`} onClick={() => setRange(r)}>{r}</button>
                ))}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={display} margin={{ top: 8, right: 4, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={meta.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={meta.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,.032)" vertical={false} />
              <XAxis dataKey="date" stroke="transparent"
                tick={{ fill: "rgba(226,232,240,.27)", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                tickLine={false} interval="preserveStartEnd" />
              <YAxis stroke="transparent"
                tick={{ fill: "rgba(226,232,240,.27)", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={40} />
              <Tooltip content={<ChartTip color={meta.color} />} />
              <Area type="monotone" dataKey="close" name="Close Price"
                stroke={meta.color} strokeWidth={2.5} fill="url(#pg)" dot={false} />
              <Line type="monotone" dataKey="ma20" name="MA20"
                stroke="#F59E0B" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              {/* live reference line */}
              {q && display.length > 0 && display[display.length - 1]?.source === "live" && (
                <ReferenceLine
                  x={display[display.length - 1].date}
                  stroke={meta.color} strokeOpacity={0.35} strokeDasharray="3 3"
                  label={{ value: "▲ Live", position: "insideTopRight", fill: meta.color, fontSize: 10, fontFamily: "IBM Plex Mono" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── BOTTOM GRID ── */}
        <div className="two">

          {/* Daily Return */}
          <div className="card fu d6">
            <div className="ch">
              <div>
                <div className="ct">Daily Returns</div>
                <div className="cs">% per session · green=gain · red=loss · {q && <span style={{ color: meta.color }}>highlighted=live</span>}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "rgba(226,232,240,.35)", fontFamily: "IBM Plex Mono", marginBottom: 3 }}>BEST DAY</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#34D399", fontFamily: "IBM Plex Mono" }}>
                  +{stats.maxReturn?.toFixed(2) ?? "0.00"}%
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={display} margin={{ top: 0, right: 4, left: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,.032)" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis stroke="transparent"
                  tick={{ fill: "rgba(226,232,240,.27)", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                  tickLine={false} tickFormatter={v => `${v.toFixed(1)}%`} width={40} />
                <Tooltip content={<ChartTip color={meta.color} />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,.1)" strokeWidth={1} />
                <Bar dataKey="dailyReturn" name="Daily Return" radius={[3, 3, 0, 0]}>
                  {display.map((d, i) => (
                    <Cell key={i}
                      fill={d.source === "live" ? meta.color : d.dailyReturn >= 0 ? "#34D399" : "#F87171"}
                      opacity={d.source === "live" ? 1 : 0.78}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Summary */}
          <div className="card fu d6">
            <div className="ch">
              <div>
                <div className="ct">Performance Summary</div>
                <div className="cs">{range} period · {display.length} sessions</div>
              </div>
              <div style={{ padding: "5px 13px", borderRadius: 8, background: `${meta.color}14`, border: `1px solid ${meta.color}28`, fontSize: 11, color: meta.color, fontFamily: "IBM Plex Mono", fontWeight: 600 }}>
                {selected}
              </div>
            </div>

            {[
              { label: "Live Price",          val: q ? `Rp ${fmt(q.price)}` : "—",                             color: q ? meta.color : "#64748B" },
              { label: "Day Open / Prev Close", val: q ? `Rp ${fmt(q.open)} / ${fmt(q.prevClose)}` : "—",      color: "#94A3B8" },
              { label: "Day High / Low",      val: q ? `Rp ${fmt(q.high)} / ${fmt(q.low)}` : "—",             color: "#94A3B8" },
              { label: "Period High",         val: `Rp ${fmt(stats.high)}`,                                     color: "#34D399" },
              { label: "Period Low",          val: `Rp ${fmt(stats.low)}`,                                      color: "#F87171" },
              { label: "Avg Daily Return",    val: fmtPct(stats.avgReturn),                                     color: (stats.avgReturn ?? 0) >= 0 ? "#34D399" : "#F87171" },
              { label: "Win Rate",            val: `${stats.winRate ?? 0}%`,                                    color: "#A78BFA" },
              { label: "MA20 Trend",          val: livePrice >= latest?.ma20 ? "↑ Bullish" : "↓ Bearish",      color: livePrice >= latest?.ma20 ? "#34D399" : "#F87171" },
            ].map(({ label, val, color }, i) => (
              <div className="sr" key={i}>
                <span className="sr-l">{label}</span>
                <span className="sr-v" style={{ color }}>{val}</span>
              </div>
            ))}
          </div>

        </div>

        <div className="wm">
          IDX Fintech Analytics · Historical: CSV · Live: Yahoo Finance ·
          Auto-refresh: {REFRESH_SECS}s · Informational purposes only
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DEMO FALLBACK DATA
══════════════════════════════════════════════════════ */
function generateDemoData() {
  const rows = [];
  const base = { BBCA: 9200, BBRI: 4800, BMRI: 6100, BBNI: 5300 };
  for (let d = 0; d < 260; d++) {
    const dt = new Date(2024, 0, 2);
    dt.setDate(dt.getDate() + d);
    if ([0, 6].includes(dt.getDay())) continue;
    const date = dt.toISOString().slice(0, 10);
    for (const s of STOCKS) {
      const noise = (Math.random() - 0.48) * 110;
      base[s] = Math.max(base[s] + noise, base[s] * 0.72);
      const close = Math.round(base[s]);
      rows.push({
        date, stock: s, close,
        ma20: Math.round(close * (0.98 + Math.random() * 0.04)),
        volume: Math.round(50e6 + Math.random() * 180e6),
        dailyReturn: +((noise / base[s]) * 100).toFixed(2),
        source: "csv",
      });
    }
  }
  return rows;
}