import yfinance as yf
import pandas as pd

# Ambil data saham
bbca = yf.download("BBCA.JK", start="2024-01-01")
bbri = yf.download("BBRI.JK", start="2024-01-01")
bmri = yf.download("BMRI.JK", start="2024-01-01")
bbni = yf.download("bbni.JK", start="2024-01-01")

# Tambah kode saham
bbca["Stock"] = "BBCA"
bbri["Stock"] = "BBRI"
bbri["Stock"] = "BMRI"
bbri["Stock"] = "BBNI"

# Gabungkan data
stocks = pd.concat([bbca, bbri, bmri, bbni])

# Reset index
stocks.reset_index(inplace=True)

# Simpan ke CSV
stocks.to_csv("data/stocks.csv", index=False)

print("Data berhasil disimpan!")