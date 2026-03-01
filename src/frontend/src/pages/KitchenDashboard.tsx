import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useRestaurantStore } from "../restaurantDataStore";
import { useSellerStore } from "../sellerStore";
import type { Order } from "../types";
import {
  fetchOrdersFromBackend,
  mergeOrders,
  syncOrderToBackend,
} from "../utils/orderSync";

interface Props {
  restaurantId: string;
  onLogout: () => void;
}

type KitchenStatus = "pending" | "preparing" | "ready" | "delivered";

export default function KitchenDashboard({ restaurantId, onLogout }: Props) {
  const { orders: localOrders, updateOrderKitchenStatus } =
    useRestaurantStore(restaurantId);
  const { actor } = useActor();
  const { restaurants } = useSellerStore();
  const restaurantInfo = restaurants.find((r) => r.id === restaurantId);

  const [filterStatus, setFilterStatus] = useState<KitchenStatus | "all">(
    "all",
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendOrders, setBackendOrders] = useState<Order[]>([]);
  const actorRef = useRef(actor);
  actorRef.current = actor;

  // Poll ICP backend every 4 seconds for cross-device order sync
  useEffect(() => {
    async function poll() {
      if (!actorRef.current) return;
      const fetched = await fetchOrdersFromBackend(
        actorRef.current,
        restaurantId,
      );
      if (fetched.length > 0) {
        setBackendOrders(fetched);
        setLastUpdated(new Date());
      }
    }

    // Initial fetch
    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  // Also update timestamp when local orders change
  const orderCount = localOrders.length;
  const latestOrderTime = localOrders[localOrders.length - 1]?.createdAt ?? 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable primitives derived from orders
  useEffect(() => {
    setLastUpdated(new Date());
  }, [orderCount, latestOrderTime]);

  // Merge local + backend orders (backend is authoritative for status)
  const orders = mergeOrders(localOrders, backendOrders);

  function handleManualRefresh() {
    setIsRefreshing(true);
    if (actorRef.current) {
      fetchOrdersFromBackend(actorRef.current, restaurantId).then((fetched) => {
        if (fetched.length > 0) setBackendOrders(fetched);
        setLastUpdated(new Date());
        setIsRefreshing(false);
      });
    } else {
      window.location.reload();
    }
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
              {restaurantInfo?.name ?? "Restaurant"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Live</span>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              {activeOrders.length} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              className="gap-1.5"
              title="Refresh orders"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
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

        {/* Last updated */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <RefreshCw className="w-3 h-3" />
          <span>
            Updated{" "}
            {lastUpdated.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            · auto-refreshes every 3s
          </span>
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
                      <p className="text-xs text-muted-foreground">
                        ⏱ {timeElapsed}m ago
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
                          const nextStatus = config.next!;
                          updateOrderKitchenStatus(order.id, nextStatus);
                          toast.success(
                            `Order ${nextStatus} for ${order.tableNumber}`,
                          );
                          // Sync updated status to backend so billing sees it
                          if (actorRef.current) {
                            const updatedOrder: Order = {
                              ...order,
                              kitchenStatus: nextStatus,
                            };
                            syncOrderToBackend(
                              actorRef.current,
                              restaurantId,
                              updatedOrder,
                            );
                          }
                          // Optimistically update local backend state
                          setBackendOrders((prev) =>
                            prev.map((o) =>
                              o.id === order.id
                                ? { ...o, kitchenStatus: nextStatus }
                                : o,
                            ),
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
