import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import AdminPanel from "./pages/AdminPanel";
import BillingCounter from "./pages/BillingCounter";
import CustomerMenu from "./pages/CustomerMenu";
import HomePage from "./pages/HomePage";
import KitchenDashboard from "./pages/KitchenDashboard";
import SellerDashboard from "./pages/SellerDashboard";

type PageView = "home" | "kitchen" | "billing" | "admin" | "seller";

function getPageFromHash(): PageView {
  const hash = window.location.hash.replace("#", "");
  if (hash === "kitchen") return "kitchen";
  if (hash === "billing") return "billing";
  if (hash === "admin") return "admin";
  if (hash === "seller") return "seller";
  return "home";
}

function getTableToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("table");
}

export default function App() {
  const [page, setPage] = useState<PageView>(getPageFromHash);
  const tableToken = getTableToken();

  useEffect(() => {
    const handleHashChange = () => {
      setPage(getPageFromHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (p: PageView) => {
    window.location.hash = p === "home" ? "" : p;
    setPage(p);
  };

  // If URL has ?table=TOKEN → show customer menu
  if (tableToken) {
    return (
      <>
        <CustomerMenu token={tableToken} />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  return (
    <>
      {page === "home" && <HomePage navigate={navigate} />}
      {page === "kitchen" && <KitchenDashboard navigate={navigate} />}
      {page === "billing" && <BillingCounter navigate={navigate} />}
      {page === "admin" && <AdminPanel navigate={navigate} />}
      {page === "seller" && <SellerDashboard navigate={navigate} />}
      <Toaster richColors position="top-center" />
    </>
  );
}
