import pandas as pd

# Load dataset
stocks = pd.read_csv("data/stocks.csv")

# Convert date
stocks["Date"] = pd.to_datetime(stocks["Date"])

# Numeric columns
numeric_cols = [
    "Open",
    "High",
    "Low",
    "Close",
    "Volume"
]

# Convert to numeric
for col in numeric_cols:
    stocks[col] = pd.to_numeric(
        stocks[col],
        errors="coerce"
    )

# Sort data
stocks = stocks.sort_values(
    by=["Stock", "Date"]
)

# Moving Average 20
stocks["MA20"] = (
    stocks.groupby("Stock")["Close"]
    .transform(lambda x: x.rolling(20).mean())
)

# Daily Return %
stocks["Daily_Return"] = (
    stocks.groupby("Stock")["Close"]
    .pct_change() * 100
)

# Simulasi quantity
stocks["Quantity"] = stocks["Stock"].map({
    "BBCA": 100,
    "BBRI": 150,
    "BMRI": 120,
    "BBNI": 80
})

# Investment Value
stocks["Investment_Value"] = (
    stocks["Close"] * stocks["Quantity"]
)

# Save processed data
stocks.to_csv(
    "data/stocks_processed.csv",
    index=False
)

print("Processed data berhasil dibuat!")