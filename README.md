# 📈 Indonesian Banking Stock Dashboard

Modern financial analytics dashboard for Indonesian banking stocks built with **React + Vite + Node.js**.

This project provides:
- 📊 Portfolio Simulator
- 💰 Dividend Projection
- 📈 Real-time Stock Prices
- 📉 Interactive Charts
- 🏦 Banking Stock Analytics
- ⚡ Live Backend API Integration

---

# ✨ Features

## 📊 Dashboard
- Real-time Indonesian bank stock monitoring
- Interactive charts
- Market overview
- Banking stock metrics

## 💼 Portfolio Simulator
- Simulate stock allocations
- Track portfolio value
- Estimate investment growth
- Banking-focused investment analysis

## 💰 Dividend Projection
- Estimate annual dividend income
- Monthly passive income projection
- Yield on Cost calculation
- Dividend growth simulation
- Cumulative dividend forecasting

## ⚡ Real-time Price API
- Live stock prices from Yahoo Finance
- Local Node.js backend proxy
- Automatic refresh system
- Fallback price handling

---

# 🏦 Supported Stocks

| Stock | Company |
|---|---|
| BBCA | Bank Central Asia |
| BBRI | Bank Rakyat Indonesia |
| BMRI | Bank Mandiri |
| BBNI | Bank Negara Indonesia |

---

# 🛠 Tech Stack

## Frontend
- React
- Vite
- Recharts
- CSS3

## Backend
- Node.js
- Express.js

## APIs
- Yahoo Finance

---

# 📂 Project Structure

```bash
bank-portofolio-dashboard/
│
├── server/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── PortfolioSimulator.jsx
│   │   └── DividendProjection.jsx
│   │
│   ├── styles/
│   │   ├── dashboard.css
│   │   └── dividend.css
│   │
│   └── components/
│
├── package.json
└── README.md
```

---

# 🚀 Installation

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd bank-portofolio-dashboard
```

---

## 2. Install Frontend Dependencies

```bash
npm install
```

---

## 3. Install Backend Dependencies

```bash
cd server
npm install
```

---

# ▶️ Running the Project

## Start Backend Server

```bash
cd server
node server.js
```

Backend will run on:

```txt
http://localhost:3001
```

---

## Start Frontend

Open another terminal:

```bash
npm run dev
```

Frontend will run on:

```txt
http://localhost:5173
```

---

# 🔥 Important Notes

## Backend Required
The backend server **must be running** to enable:
- Real-time stock prices
- API requests
- Live updates

If backend is offline, fallback prices will be used automatically.

---

## .gitignore

Make sure these files are ignored:

```gitignore
node_modules/
server/node_modules/

.env
server/.env
```

---

# 📸 Preview

## Dashboard
- Modern fintech UI
- Real-time banking analytics

## Dividend Projection
- Passive income simulation
- Dividend growth forecasting

---

# 🧠 Future Features

Planned upcoming modules:
- 📰 Market News
- 📅 Economic Calendar
- 📈 DCA Planner
- ⚠️ Risk Analysis

---

# 📄 License

This project is for educational and portfolio purposes.

---

# 👨‍💻 Author

Built by Stephen SCL
