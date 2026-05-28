import { useState } from "react";
import StockDashboard from "./pages/StockDashboard.jsx";
import PortofolioSimulator from "./pages/PortofolioSimulator.jsx";
import DividendProjection from "./pages/DividendProjection.jsx";
import MarketNews from "./pages/MarketNews.jsx";

export default function App() {
  const [page, setPage] = useState("dashboard");

  const goToPage = (targetPage) => {
    if (targetPage === "portfolio" || targetPage === "portofolio") {
      setPage("portfolio");
      return;
    }

    if (targetPage === "dividend") {
      setPage("dividend");
      return;
    }

    if (targetPage === "news" || targetPage === "market-news") {
      setPage("news");
      return;
    }

    setPage("dashboard");
  };

  if (page === "portfolio") return <PortofolioSimulator goToPage={goToPage} />;
  if (page === "dividend") return <DividendProjection goToPage={goToPage} />;
  if (page === "news") return <MarketNews goToPage={goToPage} />;
  return <StockDashboard goToPage={goToPage} />;
}
