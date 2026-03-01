import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import AdminPanel from "./pages/AdminPanel";
import BillingCounter from "./pages/BillingCounter";
import CustomerMenu from "./pages/CustomerMenu";
import HomePage from "./pages/HomePage";
import KitchenDashboard from "./pages/KitchenDashboard";
import RestaurantLogin from "./pages/RestaurantLogin";
import SellerDashboard from "./pages/SellerDashboard";
import type { UserRole } from "./types";

type PageView =
  | "home"
  | "kitchen"
  | "billing"
  | "admin"
  | "seller"
  | "restaurant-login";

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

function getRestaurantIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("rid");
}

export default function App() {
  const [page, setPage] = useState<PageView>(getPageFromHash);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(
    null,
  );

  const tableToken = getTableToken();
  const urlRestaurantId = getRestaurantIdFromUrl();

  useEffect(() => {
    const handleHashChange = () => {
      const newPage = getPageFromHash();
      setPage(newPage);
      // If navigating away from a dashboard page via hash, clear restaurant context
      if (newPage === "home") {
        setCurrentRestaurantId(null);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (p: PageView) => {
    window.location.hash = p === "home" ? "" : p;
    setPage(p);
  };

  function handleRestaurantLoginSuccess(restaurantId: string, role: UserRole) {
    setCurrentRestaurantId(restaurantId);
    // Navigate to the right dashboard
    if (role === "admin") {
      navigate("admin");
    } else if (role === "kitchen") {
      navigate("kitchen");
    } else if (role === "billing") {
      navigate("billing");
    }
  }

  function handleLogout() {
    setCurrentRestaurantId(null);
    navigate("home");
  }

  // If URL has ?table=TOKEN&rid=RESTAURANT_ID → show customer menu
  if (tableToken && urlRestaurantId) {
    return (
      <>
        <CustomerMenu token={tableToken} restaurantId={urlRestaurantId} />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  // Legacy support: if only table token (no rid), show invalid QR
  if (tableToken && !urlRestaurantId) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Invalid QR Code
            </h2>
            <p className="text-muted-foreground">
              This QR code is outdated. Please ask for a new QR code at your
              table.
            </p>
          </div>
        </div>
        <Toaster richColors position="top-center" />
      </>
    );
  }

  // Dashboard pages — require restaurantId
  if (
    (page === "admin" || page === "kitchen" || page === "billing") &&
    !currentRestaurantId
  ) {
    // Not authenticated — redirect to restaurant login
    return (
      <>
        <RestaurantLogin
          onSuccess={handleRestaurantLoginSuccess}
          onBack={() => navigate("home")}
        />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  return (
    <>
      {page === "home" && <HomePage navigate={navigate} />}

      {page === "restaurant-login" && (
        <RestaurantLogin
          onSuccess={handleRestaurantLoginSuccess}
          onBack={() => navigate("home")}
        />
      )}

      {page === "seller" && <SellerDashboard navigate={navigate} />}

      {page === "admin" && currentRestaurantId && (
        <AdminPanel
          restaurantId={currentRestaurantId}
          onLogout={handleLogout}
        />
      )}

      {page === "kitchen" && currentRestaurantId && (
        <KitchenDashboard
          restaurantId={currentRestaurantId}
          onLogout={handleLogout}
        />
      )}

      {page === "billing" && currentRestaurantId && (
        <BillingCounter
          restaurantId={currentRestaurantId}
          onLogout={handleLogout}
        />
      )}

      <Toaster richColors position="top-center" />
    </>
  );
}
