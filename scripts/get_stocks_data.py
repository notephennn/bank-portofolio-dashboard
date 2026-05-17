import yfinance as yf
import pandas as pd

tickers = {
    "BBCA": "BBCA.JK",
    "BBRI": "BBRI.JK",
    "BMRI": "BMRI.JK",
    "BBNI": "BBNI.JK"
}

all_data = []

for stock_name, ticker in tickers.items():
    print(f"Downloading {stock_name}...")
    data = yf.download(
        ticker,
        start="2024-01-01",
        progress=False
    )

    if data.empty:
        continue

    # Reset index agar 'Date' jadi kolom
    data = data.reset_index()

    # Perbaikan: Cara paling aman flatten Multi-Index yfinance terbaru
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [col[0] for col in data.columns]

    # Tambah identitas saham
    data["Stock"] = stock_name

    # Filter hanya kolom yang dibutuhkan
    cols = ["Date", "Open", "High", "Low", "Close", "Volume", "Stock"]
    data = data[cols]
    
    all_data.append(data)

# Gabungkan data
if all_data:
    stocks = pd.concat(all_data, ignore_index=True)
    
    # Pastikan tipe data benar
    stocks["Date"] = pd.to_datetime(stocks["Date"])
    
    # Sortir agar rapi saat dilihat di Excel/Power BI
    stocks = stocks.sort_values(by=["Date", "Stock"]).reset_index(drop=True)

    # Save CSV
    stocks.to_csv("data/stocks.csv", index=False)
    print("CSV 'stocks.csv' berhasil dibuat!")
else:
    print("Tidak ada data yang berhasil di-download.")