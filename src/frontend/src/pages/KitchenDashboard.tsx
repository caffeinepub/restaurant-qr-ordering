import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChefHat, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "../store";

interface Props {
  navigate: (page: "home" | "kitchen" | "billing" | "admin") => void;
}

type KitchenStatus = "pending" | "preparing" | "ready" | "delivered";

const PINS: Record<string, "kitchen" | "admin"> = {
  "1234": "kitchen",
  "0000": "admin",
};

export default function KitchenDashboard({ navigate }: Props) {
  const { userRole, login, logout, orders, updateOrderKitchenStatus } =
    useStore();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [filterStatus, setFilterStatus] = useState<KitchenStatus | "all">(
    "all",
  );

  const isAuthenticated = userRole === "kitchen" || userRole === "admin";

  function handleLogin() {
    const role = PINS[pin];
    if (role) {
      login(role);
      setPinError(false);
      toast.success(`Logged in as ${role}`);
    } else {
      setPinError(true);
      toast.error("Invalid PIN");
    }
  }

  function handleLogout() {
    logout();
    setPin("");
  }

  const activeOrders = orders.filter(
    (o) =>
      o.status === "active" &&
      (filterStatus === "all" || o.kitchenStatus === filterStatus),
  );

  const statusConfig: Record<
    KitchenStatus,
    {
      label: string;
      className: string;
      next?: KitchenStatus;
      nextLabel?: string;
    }
  > = {
    pending: {
      label: "New",
      className: "status-active",
      next: "preparing",
      nextLabel: "Start Preparing",
    },
    preparing: {
      label: "Preparing",
      className: "status-preparing",
      next: "ready",
      nextLabel: "Mark Ready",
    },
    ready: {
      label: "Ready",
      className: "status-ready",
      next: "delivered",
      nextLabel: "Mark Delivered",
    },
    delivered: {
      label: "Delivered",
      className: "status-delivered",
    },
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4 shadow-primary">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              Kitchen Dashboard
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your PIN to continue
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>
                Kitchen Staff PIN:{" "}
                <span className="font-mono font-bold">1234</span>
              </p>
              <p>
                Admin PIN: <span className="font-mono font-bold">0000</span>
              </p>
            </div>
            <Input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={`text-center text-xl tracking-widest h-12 ${pinError ? "border-destructive" : ""}`}
              maxLength={6}
            />
            {pinError && (
              <p className="text-destructive text-xs text-center">
                Invalid PIN. Please try again.
              </p>
            )}
            <Button
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
              onClick={handleLogin}
            >
              Login
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("home")}
            >
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">
              Kitchen Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time order management
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex">
              {activeOrders.length} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Status Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
          {(["all", "pending", "preparing", "ready", "delivered"] as const).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                  filterStatus === status
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {status === "all" ? "All Orders" : status}
              </button>
            ),
          )}
        </div>

        {/* Orders Grid */}
        {activeOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍳</div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">
              Kitchen is Clear!
            </h3>
            <p className="text-muted-foreground">
              No active orders right now. Enjoy the break!
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order) => {
              const config = statusConfig[order.kitchenStatus];
              const timeElapsed = Math.floor(
                (Date.now() - order.createdAt) / 60000,
              );
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-border shadow-card overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-xl text-foreground">
                        {order.tableNumber}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        {timeElapsed}m ago
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${config.className}`}
                    >
                      {config.label}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="p-4 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {item.name}
                        </span>
                        <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          × {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  {config.next && (
                    <div className="px-4 pb-4">
                      <Button
                        className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90 text-white"
                        onClick={() => {
                          updateOrderKitchenStatus(order.id, config.next!);
                          toast.success(
                            `Order ${config.next} for ${order.tableNumber}`,
                          );
                        }}
                      >
                        {config.nextLabel}
                      </Button>
                    </div>
                  )}
                  {order.kitchenStatus === "delivered" && (
                    <div className="px-4 pb-4">
                      <div className="text-center text-sm text-green-600 font-semibold py-2 bg-green-50 rounded-lg">
                        ✅ Delivered to table
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
