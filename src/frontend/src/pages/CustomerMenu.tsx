import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Minus,
  Plus,
  ShoppingCart,
  UtensilsCrossed,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSellerStore } from "../sellerStore";
import { useStore } from "../store";
import type { CartItem, MenuCategory } from "../types";

interface Props {
  token: string;
}

type CustomerView = "menu" | "confirmation" | "options";

const CATEGORIES: MenuCategory[] = [
  "Starters",
  "Main Course",
  "Beverages",
  "Desserts",
];
const ALL_CATEGORIES = ["All", ...CATEGORIES] as const;
type FilterCategory = (typeof ALL_CATEGORIES)[number];

export default function CustomerMenu({ token }: Props) {
  const { tables, menuItems, orders, gstPercent, placeOrder, addItemsToOrder } =
    useStore();
  const { appSuspended } = useSellerStore();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<CustomerView>("menu");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [addingMore, setAddingMore] = useState(false);

  const table = tables.find((t) => t.sessionToken === token);
  const activeOrder = table?.currentOrderId
    ? orders.find((o) => o.id === table.currentOrderId && o.status === "active")
    : null;

  useEffect(() => {
    if (table && activeOrder && view === "menu" && !addingMore) {
      setView("options");
    }
  }, [table, activeOrder, view, addingMore]);

  const filteredItems = useMemo(
    () =>
      menuItems.filter(
        (item) =>
          item.isAvailable &&
          (activeCategory === "All" || item.category === activeCategory),
      ),
    [menuItems, activeCategory],
  );

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const gstAmount = Math.round(cartTotal * (gstPercent / 100));
  const grandTotal = cartTotal + gstAmount;

  function addToCart(itemId: string) {
    const item = menuItems.find((m) => m.id === itemId);
    if (!item) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === itemId);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === itemId ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        { menuItemId: itemId, name: item.name, price: item.price, quantity: 1 },
      ];
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.menuItemId === itemId ? { ...c, quantity: c.quantity - 1 } : c,
        );
      }
      return prev.filter((c) => c.menuItemId !== itemId);
    });
  }

  function getCartQty(itemId: string) {
    return cart.find((c) => c.menuItemId === itemId)?.quantity ?? 0;
  }

  function handlePlaceOrder() {
    if (cart.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }
    if (!table) return;

    if (addingMore && activeOrder) {
      addItemsToOrder(activeOrder.id, cart);
      setPlacedOrderId(activeOrder.id);
      toast.success("Items added to your order!");
    } else {
      const order = placeOrder(table.id, table.tableNumber, cart);
      setPlacedOrderId(order.id);
      toast.success("Order placed successfully!");
    }
    setCart([]);
    setCartOpen(false);
    setAddingMore(false);
    setView("confirmation");
  }

  // Service suspended screen
  if (appSuspended) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-3">
            Service Suspended
          </h2>
          <p className="text-gray-400 leading-relaxed">
            This restaurant's service has been temporarily suspended.
            <br />
            Please contact the restaurant management for more information.
          </p>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Invalid QR Code
          </h2>
          <p className="text-muted-foreground">
            This QR code is no longer valid. Please scan the QR code on your
            table.
          </p>
        </div>
      </div>
    );
  }

  // Options screen (table has active order)
  if (view === "options") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-1">
            {table.tableNumber}
          </h2>
          <p className="text-muted-foreground mb-8">
            You have an active order at this table
          </p>
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white shadow-primary"
              onClick={() => {
                setAddingMore(true);
                setView("menu");
              }}
            >
              ➕ Order More Food
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-base font-semibold"
              onClick={() => setView("confirmation")}
            >
              🧾 View/Pay Bill
            </Button>
          </div>
          {activeOrder && (
            <div className="mt-6 p-4 bg-muted rounded-xl text-left">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Current Order
              </p>
              {activeOrder.items.slice(0, 3).map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex justify-between text-sm py-1"
                >
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
              {activeOrder.items.length > 3 && (
                <p className="text-xs text-muted-foreground mt-1">
                  +{activeOrder.items.length - 3} more items
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Order Confirmation
  if (view === "confirmation") {
    const confirmedOrder = placedOrderId
      ? orders.find((o) => o.id === placedOrderId)
      : activeOrder;

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-border">
          <div className="px-4 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground">
                Restaurant
              </h1>
            </div>
            <Badge variant="secondary" className="ml-auto text-xs">
              {table.tableNumber}
            </Badge>
          </div>
        </header>
        <div className="max-w-md mx-auto p-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Order {addingMore ? "Updated" : "Placed!"}
            </h2>
            <p className="text-muted-foreground">
              Your order has been sent to the kitchen. We'll prepare it shortly!
            </p>
          </div>

          {confirmedOrder && (
            <div className="bg-white rounded-2xl border border-border shadow-card p-5 mb-6">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <span>📋</span> Order Summary
              </h3>
              <div className="space-y-2 mb-4">
                {confirmedOrder.items.map((item) => (
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
              <div className="mt-3 space-y-1.5">
                {(() => {
                  const sub = confirmedOrder.items.reduce(
                    (s, i) => s + i.price * i.quantity,
                    0,
                  );
                  const gst = Math.round(sub * (gstPercent / 100));
                  return (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>₹{sub}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>GST ({gstPercent}%)</span>
                        <span>₹{gst}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground">
                        <span>Total</span>
                        <span>₹{sub + gst}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold"
              onClick={() => {
                setAddingMore(true);
                setView("menu");
              }}
            >
              ➕ Add More Items
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Menu View
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-primary">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground leading-tight">
              Restaurant
            </h1>
            <p className="text-xs text-muted-foreground">Digital Menu</p>
          </div>
          <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-xs">
            {table.tableNumber}
          </Badge>
        </div>
        {/* Category Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-primary text-white shadow-primary"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Menu Items */}
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🍽️</div>
            <p className="text-muted-foreground">
              No items available in this category
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const qty = getCartQty(item.id);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-border shadow-card p-4 flex items-start gap-4"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{item.emoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm leading-tight">
                        {item.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <span className="font-bold text-primary shrink-0 text-base">
                      ₹{item.price}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-xs border-border text-muted-foreground"
                    >
                      {item.category}
                    </Badge>
                    {qty === 0 ? (
                      <Button
                        size="sm"
                        className="h-8 px-4 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-full"
                        onClick={() => addToCart(item.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
                        >
                          <Minus className="w-3 h-3 text-primary" />
                        </button>
                        <span className="font-bold text-primary text-sm w-5 text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(item.id)}
                          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-4 bg-primary text-white px-6 py-3.5 rounded-2xl shadow-float hover:bg-primary/90 transition-all duration-200 max-w-sm w-full"
          >
            <div className="flex items-center gap-2 flex-1">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">
                {cartCount} item{cartCount > 1 ? "s" : ""}
              </span>
            </div>
            <span className="font-bold text-lg">₹{cartTotal}</span>
          </button>
        </div>
      )}

      {/* Cart Slide-up Sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
            onClick={() => setCartOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setCartOpen(false)}
            aria-label="Close cart"
          />
          <div className="relative w-full bg-white rounded-t-3xl shadow-float max-h-[85vh] flex flex-col animate-slide-up">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Your Cart
              </h3>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="overflow-y-auto flex-1 px-5 space-y-3 pb-2">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{item.price} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.menuItemId)}
                      className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3 text-primary" />
                    </button>
                    <span className="font-bold text-sm text-foreground w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(item.menuItemId)}
                      className="w-7 h-7 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                    <span className="font-bold text-primary text-sm w-16 text-right">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Bill Summary */}
            <div className="px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>GST ({gstPercent}%)</span>
                <span>₹{gstAmount}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-base pt-1">
                <span>Grand Total</span>
                <span className="text-primary">₹{grandTotal}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <div className="px-5 pb-8">
              <Button
                className="w-full h-13 text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-primary rounded-xl"
                onClick={handlePlaceOrder}
              >
                {addingMore ? "Update Order" : "Place Order"} · ₹{grandTotal}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
