# Fintech Analytics Dashboard

Modern fintech analytics dashboard for Indonesian banking stocks with hybrid historical CSV data and realtime Yahoo Finance integration.

![React](https://img.shields.io/badge/React-19-blue)
![Recharts](https://img.shields.io/badge/Recharts-Visualization-orange)
![Finance](https://img.shields.io/badge/Finance-Indonesia-gold)
![Status](https://img.shields.io/badge/Status-Realtime-success)

---

## ✨ Features

- 📈 Realtime stock monitoring using Yahoo Finance API
- 📊 Historical stock visualization from CSV dataset
- 🔄 Hybrid data system (CSV + realtime market updates)
- 📉 Daily return analysis
- 📌 MA20 trend signal (Bullish / Bearish)
- 📦 Volume analytics
- ⚡ Auto refresh every 60 seconds
- 🎨 Minimal modern fintech UI
- 📱 Responsive dashboard layout
- 🏦 Indonesian banking stock analytics

---

## 🏦 Supported Stocks

| Code | Company |
|------|----------|
| BBCA | Bank Central Asia |
| BBRI | Bank Rakyat Indonesia |
| BMRI | Bank Mandiri |
| BBNI | Bank Negara Indonesia |

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Recharts
- Papaparse

### Data Source
- Yahoo Finance API
- CSV Historical Dataset

### Styling
- Custom CSS
- Responsive Grid Layout
- DM Sans & DM Mono Fonts

---

## 📂 Project Structure

```bash
src/
├── components/
├── data/
│   └── stocks_processed.csv
├── App.jsx
└── main.jsx
```

---

## ⚙️ Installation

Clone repository:

```bash
git clone https://github.com/notephennn/bank-portofolio-dashboard.git
```

Go to project directory:

```bash
cd bank-portofolio-dashboard
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

---

## 📊 Hybrid Data Architecture

This dashboard combines:

### Historical Data

Loaded from:

```bash
/data/stocks_processed.csv
```

Used for:
- MA20 calculation
- Historical charts
- Return analysis
- Volume analytics

### Realtime Data

Fetched from Yahoo Finance API:

```bash
https://query1.finance.yahoo.com/
```

Used for:
- Live price
- Daily movement
- Intraday updates
- Market status

---

## 🚀 Future Improvements

- Candlestick chart
- Technical indicators
- Portfolio tracker
- AI stock prediction
- Export analytics report
- Dark/Light mode
- News sentiment analysis

---

## 📸 Dashboard Preview

- Realtime monitoring
- Responsive analytics layout
- Modern fintech design
- Banking stock comparison

---

## 🧠 Author

Stephen Christopher

---

## 📄 License

MIT License
