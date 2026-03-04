import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  LogOut,
  Printer,
  Receipt,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useRestaurantStore } from "../restaurantDataStore";
import { useSellerStore } from "../sellerStore";
import type { Bill, Order } from "../types";
import { printBill } from "../utils/billPrint";
import { fetchOrdersFromBackend, mergeOrders } from "../utils/orderSync";

interface Props {
  restaurantId: string;
  onLogout: () => void;
}

export default function BillingCounter({ restaurantId, onLogout }: Props) {
  const {
    tables,
    orders: localOrders,
    bills,
    gstPercent,
    billSettings,
    generateBill,
    processPayment,
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

  // Poll ICP backend every 5 seconds for cross-device order sync
  useEffect(() => {
    async function poll() {
      if (!actorRef.current) return;
      const fetched = await fetchOrdersFromBackend(
        actorRef.current,
        restaurantId,
      );
      if (fetched.length > 0) {
        setBackendOrders(fetched);
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  // Merge local + backend orders
  const orders = mergeOrders(localOrders, backendOrders);

  function handleManualRefresh() {
    setIsRefreshing(true);
    if (actorRef.current) {
      fetchOrdersFromBackend(actorRef.current, restaurantId).then((fetched) => {
        if (fetched.length > 0) setBackendOrders(fetched);
        setIsRefreshing(false);
      });
    } else {
      window.location.reload();
    }
  }

  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "UPI" | "Card" | null
  >(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // State for generated bills from backend-only orders (not in local store)
  const [generatedBills, setGeneratedBills] = useState<Bill[]>([]);

  // Merge local bills with ad-hoc generated bills for backend orders
  const allBills = [
    ...bills,
    ...generatedBills.filter((b) => !bills.find((lb) => lb.id === b.id)),
  ];

  // Table is "occupied" if there's an active order in local OR backend
  function getOrderForTable(
    tableId: string,
    currentOrderId: string | null,
  ): Order | null {
    if (currentOrderId) {
      const found = orders.find((o) => o.id === currentOrderId);
      if (found) return found;
    }
    // Fallback: check merged orders by tableId
    return (
      orders.find((o) => o.tableId === tableId && o.status === "active") ?? null
    );
  }

  const pendingBills = allBills.filter((b) => !b.isPaid);
  const paidBills = allBills
    .filter((b) => b.isPaid)
    .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));

  // Count tables with active orders (from local or backend)
  const occupiedCount = tables.filter((t) => {
    const order = getOrderForTable(t.id, t.currentOrderId);
    return !!order;
  }).length;

  function handleGenerateBillForOrder(order: Order) {
    // Check if bill already exists
    const existingBill = allBills.find(
      (b) => b.orderId === order.id && !b.isPaid,
    );
    if (existingBill) {
      setSelectedBill(existingBill);
      setPaymentMethod(null);
      setPaymentSuccess(false);
      return;
    }

    // Check if order is in local store
    const localOrder = localOrders.find((o) => o.id === order.id);
    if (localOrder) {
      const bill = generateBill(order.id);
      setSelectedBill(bill);
      setPaymentMethod(null);
      setPaymentSuccess(false);
      return;
    }

    // Backend-only order: generate bill directly without local store
    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const gstPct = billSettings?.gstPercent ?? gstPercent;
    const scPct = billSettings?.serviceChargePercent ?? 0;
    const gstAmount = Math.round(subtotal * (gstPct / 100));
    const scAmount = Math.round(subtotal * (scPct / 100));
    const grandTotal = subtotal + gstAmount + scAmount;
    const todayStr = new Date().toISOString().split("T")[0];
    const billNum = billSettings?.currentBillNumber ?? 1001;

    // Check if daily reset needed
    const lastReset = billSettings?.lastResetDate ?? todayStr;
    const effectiveBillNum =
      lastReset !== todayStr
        ? (billSettings?.billNumberPrefix ?? 1001)
        : billNum;

    const bill: Bill = {
      id: crypto.randomUUID(),
      billNumber: effectiveBillNum,
      orderId: order.id,
      tableId: order.tableId,
      tableNumber: order.tableNumber,
      items: order.items,
      subtotal,
      gstPercent: gstPct,
      gstAmount,
      serviceChargePercent: scPct,
      serviceChargeAmount: scAmount,
      grandTotal,
      paymentMethod: null,
      isPaid: false,
      createdAt: Date.now(),
      paidAt: null,
    };

    setGeneratedBills((prev) => [...prev, bill]);
    setSelectedBill(bill);
    setPaymentMethod(null);
    setPaymentSuccess(false);
  }

  function handleGenerateBill(tableId: string) {
    const order = getOrderForTable(
      tableId,
      tables.find((t) => t.id === tableId)?.currentOrderId ?? null,
    );
    if (!order) return;
    handleGenerateBillForOrder(order);
  }

  function handleProcessPayment() {
    if (!selectedBill || !paymentMethod) return;

    // Check if bill is in local store
    const isLocalBill = bills.find((b) => b.id === selectedBill.id);
    if (isLocalBill) {
      processPayment(selectedBill.id, paymentMethod);
    } else {
      // Mark the ad-hoc generated bill as paid
      setGeneratedBills((prev) =>
        prev.map((b) =>
          b.id === selectedBill.id
            ? { ...b, isPaid: true, paymentMethod, paidAt: Date.now() }
            : b,
        ),
      );
    }

    setPaymentSuccess(true);
    toast.success(
      `Payment of ₹${selectedBill.grandTotal} received via ${paymentMethod}`,
    );
    setTimeout(() => {
      setSelectedBill(null);
      setPaymentSuccess(false);
      setPaymentMethod(null);
      setActiveTab("paid");
    }, 2000);
  }

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
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 max-w-md">
          {(
            [
              { id: "tables", label: `Tables (${occupiedCount})` },
              { id: "pending", label: `Pending (${pendingBills.length})` },
              { id: "paid", label: `Paid (${paidBills.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
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
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🪑</div>
                <p className="text-muted-foreground">
                  No tables added yet. Add tables in the Admin Panel.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => {
                  const order = getOrderForTable(
                    table.id,
                    table.currentOrderId,
                  );
                  const hasActiveOrder = !!order;
                  const subtotal = order
                    ? order.items.reduce((s, i) => s + i.price * i.quantity, 0)
                    : 0;
                  const existingBill = order
                    ? allBills.find((b) => b.orderId === order.id && !b.isPaid)
                    : null;
                  const isBillRequested = order?.billRequested === true;

                  return (
                    <div
                      key={table.id}
                      className={`bg-white rounded-2xl border shadow-card overflow-hidden ${
                        hasActiveOrder ? "border-primary/30" : "border-border"
                      }`}
                    >
                      <div className="p-4 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-lg text-foreground">
                            {table.tableNumber}
                          </h3>
                          {isBillRequested && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full animate-pulse">
                              🧾 Bill Requested
                            </span>
                          )}
                        </div>
                        <Badge
                          className={
                            hasActiveOrder
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-green-50 text-green-700 border-green-200"
                          }
                        >
                          {hasActiveOrder ? "Occupied" : "Available"}
                        </Badge>
                      </div>
                      <div className="p-4">
                        {hasActiveOrder && order ? (
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
                                  Math.round(
                                    subtotal *
                                      ((billSettings?.gstPercent ??
                                        gstPercent) /
                                        100),
                                  )}
                              </span>
                            </div>
                            <Button
                              className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90 text-white"
                              onClick={() => handleGenerateBill(table.id)}
                            >
                              {existingBill ? "View Bill" : "Generate Bill"}
                            </Button>
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
              <div className="text-center py-16">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="font-display font-bold text-xl text-foreground mb-1">
                  All Clear!
                </h3>
                <p className="text-muted-foreground">
                  No pending bills at the moment.
                </p>
              </div>
            ) : (
              pendingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="bg-white rounded-2xl border border-border shadow-card p-4 flex items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {bill.tableNumber}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        #{bill.billNumber}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {bill.items.length} items
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(bill.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="font-bold text-lg text-foreground">
                      ₹{bill.grandTotal}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      incl. GST {bill.gstPercent}%
                    </p>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold shrink-0"
                    onClick={() => {
                      setSelectedBill(bill);
                      setPaymentMethod(null);
                      setPaymentSuccess(false);
                    }}
                  >
                    Process
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Paid Bills */}
        {activeTab === "paid" && (
          <div className="space-y-3">
            {paidBills.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-muted-foreground">No paid bills yet.</p>
              </div>
            ) : (
              paidBills.map((bill) => (
                <div
                  key={bill.id}
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
                      <Badge variant="secondary" className="text-xs">
                        #{bill.billNumber}
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
                  <button
                    type="button"
                    title="Print Receipt"
                    onClick={() =>
                      printBill(
                        bill,
                        billSettings,
                        restaurantInfo?.name ?? "Restaurant",
                      )
                    }
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-accent transition-colors shrink-0"
                  >
                    <Printer className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
            onClick={() => !paymentSuccess && setSelectedBill(null)}
            onKeyDown={(e) =>
              e.key === "Escape" && !paymentSuccess && setSelectedBill(null)
            }
            aria-label="Close modal"
          />
          <div className="relative bg-white rounded-2xl shadow-float w-full max-w-md animate-fade-in">
            {paymentSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">
                  Payment Successful!
                </h3>
                <p className="text-muted-foreground">
                  ₹{selectedBill.grandTotal} received via {paymentMethod}
                </p>
                <p className="text-sm text-green-600 mt-2">
                  {selectedBill.tableNumber} has been reset
                </p>
                <button
                  type="button"
                  onClick={() =>
                    printBill(
                      {
                        ...selectedBill,
                        isPaid: true,
                        paymentMethod: paymentMethod ?? null,
                      },
                      billSettings,
                      restaurantInfo?.name ?? "Restaurant",
                    )
                  }
                  className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-muted hover:bg-accent transition-colors text-sm font-medium text-foreground"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground">
                      Bill — {selectedBill.tableNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      #{selectedBill.billNumber} ·{" "}
                      {new Date(selectedBill.createdAt).toLocaleDateString(
                        "en-IN",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBill(null)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {selectedBill.items.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {item.name}{" "}
                          <span className="text-muted-foreground">
                            × {item.quantity}
                          </span>
                        </span>
                        <span className="font-medium">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>₹{selectedBill.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GST ({selectedBill.gstPercent}%)</span>
                      <span>₹{selectedBill.gstAmount}</span>
                    </div>
                    {(selectedBill.serviceChargePercent ?? 0) > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          Service Charge ({selectedBill.serviceChargePercent}%)
                        </span>
                        <span>₹{selectedBill.serviceChargeAmount ?? 0}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-foreground text-base">
                      <span>Grand Total</span>
                      <span className="text-primary">
                        ₹{selectedBill.grandTotal}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-border space-y-4">
                  <p className="text-sm font-semibold text-foreground">
                    Payment Method
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Cash", "UPI", "Card"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          paymentMethod === method
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {method === "Cash"
                          ? "💵"
                          : method === "UPI"
                            ? "📱"
                            : "💳"}{" "}
                        {method}
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-white"
                    disabled={!paymentMethod}
                    onClick={handleProcessPayment}
                  >
                    Confirm Payment · ₹{selectedBill.grandTotal}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
