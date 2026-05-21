import { useState } from "react";
import StockDashboard from "./pages/StockDashboard.jsx";
import PortofolioSimulator from "./pages/PortofolioSimulator.jsx";

export default function App() {
  const [page, setPage] = useState("dashboard");

  const goToPage = (targetPage) => {
    setPage(targetPage);
  };

  return (
    <>
      {page === "dashboard" && <StockDashboard goToPage={goToPage} />}
      {page === "portofolio" && <PortofolioSimulator goToPage={goToPage} />}
    </>
  );
}