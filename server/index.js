import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({
    message: "Groq AI Server Running",
  });
});

app.get("/api/quote/:ticker", async (req, res) => {
  try {
    const { ticker } = req.params;

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    );

    const json = await response.json();
    const meta = json?.chart?.result?.[0]?.meta;

    if (!meta) {
      throw new Error("Yahoo Finance data not found");
    }

    res.json({
      price: meta.regularMarketPrice,
      prev: meta.chartPreviousClose ?? meta.previousClose,
      vol: meta.regularMarketVolume,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen,
    });
  } catch (error) {
    console.error("YAHOO ERROR:", error.message);

    res.status(500).json({
      error: "Failed to fetch quote",
    });
  }
});

app.post("/api/stock-insight", async (req, res) => {
  try {
    const { selectedStocks, range, comparisonStats } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content:
            "You are a financial analyst specializing in Indonesian banking stocks.",
        },

        {
          role: "user",
          content: `
            Generate insight in Bahasa Indonesia.

            Comparison period:
            ${range}

            Stocks:
            ${selectedStocks.join(", ")}

            Data:
            ${JSON.stringify(comparisonStats, null, 2)}

            Rules:
            - Maximum 4 sentences
            - Explain top performer
            - Explain weakest performer
            - Mention volatility
            - Mention win rate
            - Objective tone
            - Do not give buy/sell recommendation
            `,
        },
      ],

      temperature: 0.5,
    });

    const insight =
      completion?.choices?.[0]?.message?.content ||
      "AI insight unavailable";

    res.json({
      insight,
    });
  } catch (error) {
    console.error("GROQ ERROR:", error);

    res.status(500).json({
      error:
        error?.response?.data?.error?.message ||
        error?.message ||
        "Failed to generate AI insight",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Groq AI server running on port ${PORT}`);
});