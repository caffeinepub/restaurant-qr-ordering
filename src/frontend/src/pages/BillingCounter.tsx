import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, LogOut, Receipt, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useRestaurantStore } from "../restaurantDataStore";
import { useSellerStore } from "../sellerStore";
import type { Bill, Order } from "../types";
import {
  fetchOrdersFromBackend,
  mergeOrders,
  updateOrderStatusOnBackend,
} from "../utils/orderSync";

interface Props {
  restaurantId: string;
  onLogout: () => void;
}

// Inline bill card with Paid / Pending actions — shown when a customer requests the bill
interface InlineBillCardProps {
  bill: Bill;
  onPaid: (bill: Bill, method: "Cash" | "UPI" | "Card") => void;
  onPending: (bill: Bill) => void;
}

function InlineBillCard({ bill, onPaid, onPending }: InlineBillCardProps) {
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "UPI" | "Card" | null
  >(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      data-ocid="billing.bill_request.card"
      className="bg-white rounded-2xl border-2 border-orange-300 shadow-card overflow-hidden"
    >
      {/* Header with "Bill Requested" banner */}
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-sm font-semibold text-orange-700">
          Bill Requested
        </span>
        <span className="ml-auto font-bold text-foreground">
          {bill.tableNumber}
        </span>
      </div>

      {/* Bill items */}
      <div className="p-4 space-y-1.5">
        {bill.items.map((item) => (
          <div key={item.menuItemId} className="flex justify-between text-sm">
            <span className="text-foreground">
              {item.name}{" "}
              <span className="text-muted-foreground">× {item.quantity}</span>
            </span>
            <span className="font-medium">₹{item.price * item.quantity}</span>
          </div>
        ))}
        <Separator className="my-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>₹{bill.subtotal}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>GST ({bill.gstPercent}%)</span>
          <span>₹{bill.gstAmount}</span>
        </div>
        <div className="flex justify-between font-bold text-foreground text-base pt-1">
          <span>Grand Total</span>
          <span className="text-primary">₹{bill.grandTotal}</span>
        </div>
      </div>

      {/* Payment method + actions */}
      <div className="px-4 pb-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Payment Method
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["Cash", "UPI", "Card"] as const).map((method) => (
            <button
              key={method}
              type="button"
              data-ocid={`billing.payment_method.${method.toLowerCase()}.toggle`}
              onClick={() => setPaymentMethod(method)}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                paymentMethod === method
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {method === "Cash" ? "💵" : method === "UPI" ? "📱" : "💳"}{" "}
              {method}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            data-ocid="billing.mark_pending.button"
            variant="outline"
            className="h-10 text-sm font-semibold border-border"
            onClick={() => onPending(bill)}
          >
            Keep Pending
          </Button>
          <Button
            data-ocid="billing.mark_paid.button"
            className="h-10 text-sm font-bold bg-green-600 hover:bg-green-700 text-white"
            disabled={!paymentMethod || confirming}
            onClick={() => {
              if (!paymentMethod) return;
              setConfirming(true);
              onPaid(bill, paymentMethod);
            }}
          >
            {confirming
              ? "Processing..."
              : `✅ Mark Paid · ₹${bill.grandTotal}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BillingCounter({ restaurantId, onLogout }: Props) {
  const {
    tables,
    orders: localOrders,
    bills,
    gstPercent,
    generateBill,
    processPayment,
    syncExternalOrders,
  } = useRestaurantStore(restaurantId);

  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;

  const { restaurants } = useSellerStore();
  const restaurantInfo = restaurants.find((r) => r.id === restaurantId);

  const [activeTab, setActiveTab] = useState<"tables" | "pending" | "paid">(
    "tables",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendOrders, setBackendOrders] = useState<Order[]>([]);
  // Track which bill-request cards have been dismissed to "pending"
  const [dismissedBillIds, setDismissedBillIds] = useState<Set<string>>(
    new Set(),
  );

  // Poll ICP backend every 3 seconds — faster poll to catch bill requests quickly
  // biome-ignore lint/correctness/useExhaustiveDependencies: syncExternalOrders is a stable zustand action, intentionally omitted
  useEffect(() => {
    async function poll() {
      if (!actorRef.current) return;
      const fetched = await fetchOrdersFromBackend(
        actorRef.current,
        restaurantId,
      );
      // Always update — even empty array is valid (clears stale paid orders)
      setBackendOrders(fetched);
      // Sync backend-only orders into local store so generateBill works
      if (fetched.length > 0) {
        syncExternalOrders(fetched);
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  // Merge local + backend orders
  const orders = mergeOrders(localOrders, backendOrders);

  function handleManualRefresh() {
    setIsRefreshing(true);
    if (actorRef.current) {
      fetchOrdersFromBackend(actorRef.current, restaurantId).then((fetched) => {
        setBackendOrders(fetched);
        if (fetched.length > 0) syncExternalOrders(fetched);
        setIsRefreshing(false);
      });
    } else {
      window.location.reload();
    }
  }

  // Auto-generate bills for "billed" status orders that don't have a bill yet.
  // We no longer require the table to exist locally — syncExternalOrders ensures
  // backend-only orders (placed from customer phones) are in the local store,
  // and generateBill only needs the order to be present (not the table).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - bills/generateBill are stable refs, only re-run when orders change
  useEffect(() => {
    for (const order of orders) {
      if (order.status !== "billed") continue;
      const existing = bills.find((b) => b.orderId === order.id && !b.isPaid);
      if (existing) continue;
      try {
        generateBill(order.id);
      } catch {
        // ignore if already generated or order not in local store yet
      }
    }
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bills for "billed" orders that haven't been dismissed to pending
  const billRequestCards = bills.filter((b) => {
    if (b.isPaid) return false;
    if (dismissedBillIds.has(b.id)) return false;
    const order = orders.find((o) => o.id === b.orderId);
    return order?.status === "billed";
  });

  function handleMarkPaid(bill: Bill, method: "Cash" | "UPI" | "Card") {
    processPayment(bill.id, method);
    toast.success(
      `Payment of ₹${bill.grandTotal} received via ${method} — ${bill.tableNumber} is now free`,
    );
    // Mark on ICP backend so customer phone detects paid status
    if (actorRef.current) {
      updateOrderStatusOnBackend(
        actorRef.current,
        bill.orderId,
        "delivered",
        "paid",
      );
    }
    setDismissedBillIds((prev) => new Set([...prev, bill.id]));
    setTimeout(() => setActiveTab("paid"), 1500);
  }

  function handleMarkPending(bill: Bill) {
    // Dismiss from bill-request section — it stays in Pending tab
    setDismissedBillIds((prev) => new Set([...prev, bill.id]));
    setActiveTab("pending");
    toast.info(`${bill.tableNumber} moved to Pending bills`);
  }

  const occupiedTables = tables.filter((t) => t.isOccupied);
  const pendingBills = bills.filter((b) => !b.isPaid);
  const paidBills = bills
    .filter((b) => b.isPaid)
    .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">
              Billing Counter
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              className="gap-1.5"
              title="Refresh"
              disabled={isRefreshing}
              data-ocid="billing.refresh.button"
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
              data-ocid="billing.logout.button"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Bill Requests — auto-surfaced when customers request bill */}
        {billRequestCards.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="font-display font-bold text-foreground">
                Bill Requests ({billRequestCards.length})
              </h2>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                Customer requested payment
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {billRequestCards.map((bill) => (
                <InlineBillCard
                  key={bill.id}
                  bill={bill}
                  onPaid={handleMarkPaid}
                  onPending={handleMarkPending}
                />
              ))}
            </div>
            <Separator className="mt-6" />
          </div>
        )}

        {/* Tabs */}
        <div
          className="flex gap-1 bg-muted rounded-xl p-1 mb-6 max-w-md"
          data-ocid="billing.tabs.panel"
        >
          {(
            [
              { id: "tables", label: `Tables (${occupiedTables.length})` },
              { id: "pending", label: `Pending (${pendingBills.length})` },
              { id: "paid", label: `Paid (${paidBills.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-ocid={`billing.${tab.id}.tab`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Tables */}
        {activeTab === "tables" && (
          <div>
            {tables.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="billing.tables.empty_state"
              >
                <div className="text-5xl mb-3">🪑</div>
                <p className="text-muted-foreground">
                  No tables added yet. Add tables in the Admin Panel.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => {
                  const order = table.currentOrderId
                    ? orders.find((o) => o.id === table.currentOrderId)
                    : null;
                  const subtotal = order
                    ? order.items.reduce((s, i) => s + i.price * i.quantity, 0)
                    : 0;
                  const isBillRequested = order?.status === "billed";

                  return (
                    <div
                      key={table.id}
                      className={`bg-white rounded-2xl border shadow-card overflow-hidden ${
                        isBillRequested
                          ? "border-orange-300"
                          : table.isOccupied
                            ? "border-primary/30"
                            : "border-border"
                      }`}
                    >
                      <div className="p-4 flex items-center justify-between border-b border-border">
                        <h3 className="font-display font-bold text-lg text-foreground">
                          {table.tableNumber}
                        </h3>
                        <Badge
                          className={
                            isBillRequested
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : table.isOccupied
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-green-50 text-green-700 border-green-200"
                          }
                        >
                          {isBillRequested
                            ? "Bill Requested"
                            : table.isOccupied
                              ? "Occupied"
                              : "Available"}
                        </Badge>
                      </div>
                      <div className="p-4">
                        {table.isOccupied && order ? (
                          <>
                            <div className="space-y-1 mb-3">
                              {order.items.slice(0, 3).map((item) => (
                                <div
                                  key={item.menuItemId}
                                  className="flex justify-between text-xs text-muted-foreground"
                                >
                                  <span>
                                    {item.name} × {item.quantity}
                                  </span>
                                  <span>₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{order.items.length - 3} more
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">
                                Est. Total (incl. GST)
                              </span>
                              <span className="font-bold text-foreground">
                                ₹
                                {subtotal +
                                  Math.round(subtotal * (gstPercent / 100))}
                              </span>
                            </div>
                            {isBillRequested ? (
                              <div className="text-xs text-center text-orange-700 bg-orange-50 rounded-lg py-2 font-medium">
                                See "Bill Requests" above to process payment
                              </div>
                            ) : (
                              <Button
                                className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90 text-white"
                                data-ocid="billing.generate_bill.button"
                                onClick={() => {
                                  const existingBill = bills.find(
                                    (b) => b.orderId === order.id && !b.isPaid,
                                  );
                                  if (!existingBill) {
                                    generateBill(order.id);
                                  }
                                  setActiveTab("pending");
                                }}
                              >
                                Generate Bill
                              </Button>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No active order
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pending Bills */}
        {activeTab === "pending" && (
          <div className="space-y-3">
            {pendingBills.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="billing.pending.empty_state"
              >
                <div className="text-5xl mb-3">✅</div>
                <h3 className="font-display font-bold text-xl text-foreground mb-1">
                  All Clear!
                </h3>
                <p className="text-muted-foreground">
                  No pending bills at the moment.
                </p>
              </div>
            ) : (
              pendingBills.map((bill) => {
                const order = orders.find((o) => o.id === bill.orderId);
                const isBillRequested =
                  order?.status === "billed" && !dismissedBillIds.has(bill.id);
                return (
                  <div
                    key={bill.id}
                    data-ocid="billing.pending_bill.card"
                    className={`bg-white rounded-2xl border shadow-card p-4 ${isBillRequested ? "border-orange-300" : "border-border"}`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {bill.tableNumber}
                          </h3>
                          {isBillRequested && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                              Bill Requested
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {bill.items.length} items
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(bill.createdAt).toLocaleTimeString(
                            "en-IN",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-foreground">
                          ₹{bill.grandTotal}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          incl. GST {bill.gstPercent}%
                        </p>
                      </div>
                    </div>
                    {/* Inline payment for pending bills */}
                    <PendingBillPayRow bill={bill} onPaid={handleMarkPaid} />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Paid Bills */}
        {activeTab === "paid" && (
          <div className="space-y-3">
            {paidBills.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="billing.paid.empty_state"
              >
                <div className="text-5xl mb-3">📋</div>
                <p className="text-muted-foreground">No paid bills yet.</p>
              </div>
            ) : (
              paidBills.map((bill) => (
                <div
                  key={bill.id}
                  data-ocid="billing.paid_bill.card"
                  className="bg-white rounded-2xl border border-border shadow-card p-4 flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-foreground">
                        {bill.tableNumber}
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600 border-green-200"
                      >
                        Paid
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bill.paidAt
                        ? new Date(bill.paidAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      ₹{bill.grandTotal}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bill.paymentMethod}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Small inline payment row for the Pending tab
function PendingBillPayRow({
  bill,
  onPaid,
}: {
  bill: Bill;
  onPaid: (bill: Bill, method: "Cash" | "UPI" | "Card") => void;
}) {
  const [method, setMethod] = useState<"Cash" | "UPI" | "Card" | null>(null);
  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <div className="flex gap-1.5">
        {(["Cash", "UPI", "Card"] as const).map((m) => (
          <button
            key={m}
            type="button"
            data-ocid={`billing.pending_method.${m.toLowerCase()}.toggle`}
            onClick={() => setMethod(m)}
            className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
              method === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <Button
        data-ocid="billing.pending_pay.button"
        className="w-full h-9 text-sm font-bold bg-green-600 hover:bg-green-700 text-white"
        disabled={!method}
        onClick={() => method && onPaid(bill, method)}
      >
        ✅ Mark Paid
      </Button>
    </div>
  );
}
