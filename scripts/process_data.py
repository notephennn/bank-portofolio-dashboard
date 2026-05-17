import pandas as pd

# Load dataset
stocks = pd.read_csv("data/stocks.csv")
stocks["Date"] = pd.to_datetime(stocks["Date"])

# Urutkan berdasarkan Stock dan Date (PENTING untuk perhitungan rolling/pct_change)
stocks = stocks.sort_values(by=["Stock", "Date"])

# 1. Moving Average 20 (Per Saham)
# Menggunakan rolling(20, min_periods=1) agar data di awal tetap muncul 
# meskipun belum mencapai 20 hari (opsional).
stocks["MA20"] = (
    stocks.groupby("Stock")["Close"]
    .transform(lambda x: x.rolling(window=20).mean())
)

# 2. Daily Return %
stocks["Daily_Return"] = (
    stocks.groupby("Stock")["Close"]
    .pct_change() * 100
)

# 3. Simulasi Portfolio
quantity_map = {
    "BBCA": 100,
    "BBRI": 150,
    "BMRI": 120,
    "BBNI": 80
}
stocks["Quantity"] = stocks["Stock"].map(quantity_map)

# 4. Investment Value
stocks["Investment_Value"] = stocks["Close"] * stocks["Quantity"]

# 5. Penanganan NaN (Opsional)
# MA20 di 19 baris pertama setiap saham akan NaN. 
# Untuk Power BI, lebih baik biarkan NaN daripada diisi 0 agar grafik tidak drop ke bawah.
# Namun jika ingin diisi 0: stocks.fillna(0, inplace=True)

# Save processed data
stocks.to_csv("data/stocks_processed.csv", index=False)

print("Processed data 'stocks_processed.csv' berhasil dibuat!")
print(stocks.tail())