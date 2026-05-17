import React, { useEffect, useState } from "react";
import Papa from "papaparse";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function StockDashboard() {
  const [data, setData] = useState([]);
  const [selectedStock, setSelectedStock] = useState("ALL");

  useEffect(() => {
    fetch("/data/stocks_processed.csv")
      .then((response) => response.text())
      .then((csvText) => {
        const parsed = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        const cleaned = parsed.data.map((item) => ({
          date: item.Date,
          stock: item.Stock,
          close: item.Close,
          ma20: item.MA20,
          volume: item.Volume,
          dailyReturn: item.Daily_Return,
          investment: item.Investment_Value,
        }));

        setData(cleaned);
      });
  }, []);

  const filteredData =
    selectedStock === "ALL"
      ? data
      : data.filter((item) => item.stock === selectedStock);

  const latestByStock = Object.values(
    filteredData.reduce((acc, item) => {
      acc[item.stock] = item;
      return acc;
    }, {})
  );

  const totalInvestment = latestByStock.reduce(
    (sum, item) => sum + (item.investment || 0),
    0
  );

  const avgReturn = latestByStock.length
    ? (
        latestByStock.reduce(
          (sum, item) => sum + (item.dailyReturn || 0),
          0
        ) / latestByStock.length
      ).toFixed(2)
    : 0;

  const highestPrice = latestByStock.length
    ? Math.max(...latestByStock.map((x) => x.close || 0))
    : 0;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Indonesian Banking Stock Dashboard
            </h1>

            <p className="text-slate-500 mt-2">
              Interactive visualization of BBCA, BBRI, BMRI, and BBNI
            </p>
          </div>

          <select
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-300"
          >
            <option value="ALL">ALL</option>
            <option value="BBCA">BBCA</option>
            <option value="BBRI">BBRI</option>
            <option value="BMRI">BMRI</option>
            <option value="BBNI">BBNI</option>
          </select>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-slate-500 text-sm">
              Total Investment
            </p>

            <h2 className="text-3xl font-bold mt-3">
              Rp {totalInvestment.toLocaleString()}
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-slate-500 text-sm">
              Average Daily Return
            </p>

            <h2 className="text-3xl font-bold mt-3">
              {avgReturn}%
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-slate-500 text-sm">
              Highest Close Price
            </p>

            <h2 className="text-3xl font-bold mt-3">
              Rp {highestPrice.toLocaleString()}
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-slate-500 text-sm">
              Tracked Stocks
            </p>

            <h2 className="text-3xl font-bold mt-3">
              {selectedStock === "ALL" ? 4 : 1}
            </h2>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* LINE */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-5">
              Close Price vs MA20
            </h2>

            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#2563eb"
                  strokeWidth={3}
                  name="Close"
                />

                <Line
                  type="monotone"
                  dataKey="ma20"
                  stroke="#16a34a"
                  strokeWidth={3}
                  name="MA20"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* BAR */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-5">
              Daily Return (%)
            </h2>

            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />

                <Bar
                  dataKey="dailyReturn"
                  fill="#7c3aed"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECOND CHART */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* AREA */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-5">
              Trading Volume
            </h2>

            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#0f766e"
                  fill="#99f6e4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* PIE */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-5">
              Portfolio Distribution
            </h2>

            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={latestByStock}
                  dataKey="investment"
                  nameKey="stock"
                  outerRadius={120}
                  label
                >
                  {latestByStock.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        ["#2563eb", "#16a34a", "#dc2626", "#f59e0b"][
                          index % 4
                        ]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}