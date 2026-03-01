import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, LogOut, Receipt, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRestaurantStore } from "../restaurantDataStore";
import { useSellerStore } from "../sellerStore";
import type { Bill } from "../types";

interface Props {
  restaurantId: string;
  onLogout: () => void;
}

export default function BillingCounter({ restaurantId, onLogout }: Props) {
  const { tables, orders, bills, gstPercent, generateBill, processPayment } =
    useRestaurantStore(restaurantId);

  const { restaurants } = useSellerStore();
  const restaurantInfo = restaurants.find((r) => r.id === restaurantId);

  const [activeTab, setActiveTab] = useState<"tables" | "pending" | "paid">(
    "tables",
  );
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "UPI" | "Card" | null
  >(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const occupiedTables = tables.filter((t) => t.isOccupied);
  const pendingBills = bills.filter((b) => !b.isPaid);
  const paidBills = bills
    .filter((b) => b.isPaid)
    .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));

  function handleGenerateBill(tableId: string) {
    const table = tables.find((t) => t.id === tableId);
    if (!table?.currentOrderId) return;
    const order = orders.find((o) => o.id === table.currentOrderId);
    if (!order) return;

    // Check if bill already exists
    const existingBill = bills.find((b) => b.orderId === order.id && !b.isPaid);
    if (existingBill) {
      setSelectedBill(existingBill);
      setPaymentMethod(null);
      setPaymentSuccess(false);
      return;
    }

    const bill = generateBill(order.id);
    setSelectedBill(bill);
    setPaymentMethod(null);
    setPaymentSuccess(false);
  }

  function handleProcessPayment() {
    if (!selectedBill || !paymentMethod) return;
    processPayment(selectedBill.id, paymentMethod);
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
              { id: "tables", label: `Tables (${occupiedTables.length})` },
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
                  const order = table.currentOrderId
                    ? orders.find((o) => o.id === table.currentOrderId)
                    : null;
                  const subtotal = order
                    ? order.items.reduce((s, i) => s + i.price * i.quantity, 0)
                    : 0;
                  const existingBill = table.currentOrderId
                    ? bills.find(
                        (b) => b.orderId === table.currentOrderId && !b.isPaid,
                      )
                    : null;

                  return (
                    <div
                      key={table.id}
                      className={`bg-white rounded-2xl border shadow-card overflow-hidden ${
                        table.isOccupied ? "border-primary/30" : "border-border"
                      }`}
                    >
                      <div className="p-4 flex items-center justify-between border-b border-border">
                        <h3 className="font-display font-bold text-lg text-foreground">
                          {table.tableNumber}
                        </h3>
                        <Badge
                          className={
                            table.isOccupied
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-green-50 text-green-700 border-green-200"
                          }
                        >
                          {table.isOccupied ? "Occupied" : "Available"}
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
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg text-foreground">
                    Bill — {selectedBill.tableNumber}
                  </h3>
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
