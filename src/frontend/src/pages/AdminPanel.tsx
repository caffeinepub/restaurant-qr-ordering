import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  BarChart3,
  Check,
  Edit2,
  ImagePlus,
  LogOut,
  Percent,
  Plus,
  Printer,
  QrCode,
  Settings,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRestaurantStore } from "../restaurantDataStore";
import { useSellerStore } from "../sellerStore";
import type { MenuCategory, MenuItem } from "../types";
import {
  type CompactMenuPayload,
  encodeCompactMenu,
  saveMenuSnapshot,
} from "../utils/qrPayload";

interface Props {
  restaurantId: string;
  onLogout: () => void;
}

type AdminSection = "menu" | "tables" | "reports" | "gst";

const CATEGORIES: MenuCategory[] = [
  "Starters",
  "Main Course",
  "Beverages",
  "Desserts",
];

export default function AdminPanel({ restaurantId, onLogout }: Props) {
  const {
    menuItems,
    tables,
    orders,
    bills,
    gstPercent,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    addTable,
    deleteTable,
    updateGST,
  } = useRestaurantStore(restaurantId);

  const { restaurants } = useSellerStore();
  const restaurantInfo = restaurants.find((r) => r.id === restaurantId);

  const [section, setSection] = useState<AdminSection>("menu");

  // Save a fresh menu snapshot to localStorage whenever the Tables section is shown
  // so customer phones (same origin) can load it from a compact QR URL.
  useEffect(() => {
    if (section === "tables") {
      saveMenuSnapshot({
        restaurantId,
        restaurantName: restaurantInfo?.name ?? "Restaurant",
        gstPercent,
        isActive: restaurantInfo?.isActive ?? true,
        menuItems,
        savedAt: Date.now(),
      });
    }
  }, [section, menuItems, gstPercent, restaurantId, restaurantInfo]);

  // Menu editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Omit<MenuItem, "id">>({
    name: "",
    category: "Starters",
    price: 0,
    description: "",
    emoji: "🍽️",
    imageUrl: undefined,
    isAvailable: true,
  });

  const addImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  function handleImageFile(file: File, setter: (url: string) => void) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setter(result);
    };
    reader.readAsDataURL(file);
  }

  // GST
  const [gstInput, setGstInput] = useState(String(gstPercent));

  // Print QR
  function printQR(tableNumber: string, qrUrl: string) {
    const el = document.getElementById("print-qr");
    if (!el) return;
    el.innerHTML = `
      <img src="${qrUrl}" alt="QR Code" style="width:200px;height:200px;" />
      <div style="font-family:system-ui;font-size:20px;font-weight:bold;margin-top:8px;">${tableNumber}</div>
      <div style="font-family:system-ui;font-size:14px;color:#666;margin-top:4px;">Scan to Order</div>
    `;
    el.style.display = "flex";
    window.print();
    setTimeout(() => {
      el.style.display = "none";
      el.innerHTML = "";
    }, 1000);
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setEditForm({ ...item });
  }

  function saveEdit() {
    if (!editingId) return;
    updateMenuItem(editingId, editForm);
    setEditingId(null);
    setEditForm({});
    toast.success("Item updated");
  }

  function handleAddItem() {
    if (!newItem.name || !newItem.price) {
      toast.error("Name and price are required");
      return;
    }
    addMenuItem(newItem);
    setNewItem({
      name: "",
      category: "Starters",
      price: 0,
      description: "",
      emoji: "🍽️",
      imageUrl: undefined,
      isAvailable: true,
    });
    setShowAddForm(false);
    toast.success("Item added to menu");
  }

  // Report data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBills = bills.filter(
    (b) => b.isPaid && b.paidAt && b.paidAt >= today.getTime(),
  );
  const todayRevenue = todayBills.reduce((s, b) => s + b.grandTotal, 0);
  const totalRevenue = bills
    .filter((b) => b.isPaid)
    .reduce((s, b) => s + b.grandTotal, 0);

  const sectionNav = [
    { id: "menu" as const, label: "Menu", icon: UtensilsCrossed },
    { id: "tables" as const, label: "Tables & QR", icon: QrCode },
    { id: "reports" as const, label: "Reports", icon: BarChart3 },
    { id: "gst" as const, label: "GST Settings", icon: Percent },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Print QR (hidden) */}
      <div id="print-qr" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">
              Admin Panel
            </h1>
            <p className="text-xs text-muted-foreground">
              {restaurantInfo?.name ?? "Restaurant"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="ml-auto gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
        {/* Section Nav */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto hide-scrollbar">
          {sectionNav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                section === id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* MENU MANAGEMENT */}
        {section === "menu" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-foreground">
                Menu Management
              </h2>
              <Button
                className="bg-primary hover:bg-primary/90 text-white gap-1.5"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="bg-white rounded-2xl border border-primary/20 shadow-card p-5 mb-5 animate-fade-in">
                <h3 className="font-semibold text-foreground mb-4">
                  New Menu Item
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Item name *"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Emoji (e.g. 🍕)"
                    value={newItem.emoji}
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, emoji: e.target.value }))
                    }
                  />
                  <Select
                    value={newItem.category}
                    onValueChange={(v) =>
                      setNewItem((p) => ({ ...p, category: v as MenuCategory }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Price (₹) *"
                    value={newItem.price || ""}
                    onChange={(e) =>
                      setNewItem((p) => ({
                        ...p,
                        price: Number(e.target.value),
                      }))
                    }
                  />
                  <Input
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, description: e.target.value }))
                    }
                    className="sm:col-span-2"
                  />
                  {/* Image Upload */}
                  <div className="sm:col-span-2">
                    <input
                      ref={addImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageFile(file, (url) =>
                            setNewItem((p) => ({ ...p, imageUrl: url })),
                          );
                        }
                      }}
                    />
                    <div className="flex items-center gap-3">
                      {newItem.imageUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0">
                          <img
                            src={newItem.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setNewItem((p) => ({ ...p, imageUrl: undefined }))
                            }
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center shrink-0">
                          <ImagePlus className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addImageInputRef.current?.click()}
                        className="gap-1.5"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        {newItem.imageUrl ? "Change Image" : "Upload Image"}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Max 2 MB
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white"
                    onClick={handleAddItem}
                  >
                    Save Item
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Menu Items by Category */}
            {menuItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🍽️</div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">
                  No Menu Items Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add your first menu item to get started.
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            ) : (
              CATEGORIES.map((cat) => {
                const items = menuItems.filter((m) => m.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="mb-6">
                    <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider mb-3">
                      {cat}
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl border border-border shadow-card p-3"
                        >
                          {editingId === item.id ? (
                            <div className="grid sm:grid-cols-2 gap-2">
                              <Input
                                value={editForm.name ?? ""}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    name: e.target.value,
                                  }))
                                }
                                placeholder="Name"
                              />
                              <Input
                                value={editForm.emoji ?? ""}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    emoji: e.target.value,
                                  }))
                                }
                                placeholder="Emoji"
                              />
                              <Input
                                type="number"
                                value={editForm.price ?? ""}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    price: Number(e.target.value),
                                  }))
                                }
                                placeholder="Price"
                              />
                              <Input
                                value={editForm.description ?? ""}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    description: e.target.value,
                                  }))
                                }
                                placeholder="Description"
                              />
                              {/* Edit Image Upload */}
                              <div className="sm:col-span-2">
                                <input
                                  ref={editImageInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleImageFile(file, (url) =>
                                        setEditForm((p) => ({
                                          ...p,
                                          imageUrl: url,
                                        })),
                                      );
                                    }
                                  }}
                                />
                                <div className="flex items-center gap-3">
                                  {editForm.imageUrl ? (
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-border shrink-0">
                                      <img
                                        src={editForm.imageUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditForm((p) => ({
                                            ...p,
                                            imageUrl: undefined,
                                          }))
                                        }
                                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                                      >
                                        <X className="w-3 h-3 text-white" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="w-14 h-14 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center shrink-0">
                                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      editImageInputRef.current?.click()
                                    }
                                    className="gap-1.5"
                                  >
                                    <ImagePlus className="w-3.5 h-3.5" />
                                    {editForm.imageUrl
                                      ? "Change Image"
                                      : "Upload Image"}
                                  </Button>
                                  <span className="text-xs text-muted-foreground">
                                    Max 2 MB
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 sm:col-span-2">
                                <Button
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90 text-white gap-1"
                                  onClick={saveEdit}
                                >
                                  <Check className="w-3 h-3" /> Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="text-2xl">{item.emoji}</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm text-foreground truncate">
                                    {item.name}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs shrink-0 ${item.isAvailable ? "text-green-600 border-green-200" : "text-muted-foreground"}`}
                                  >
                                    {item.isAvailable
                                      ? "Available"
                                      : "Unavailable"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.description}
                                </p>
                              </div>
                              <span className="font-bold text-primary shrink-0">
                                ₹{item.price}
                              </span>
                              <Switch
                                checked={item.isAvailable}
                                onCheckedChange={() =>
                                  toggleMenuItemAvailability(item.id)
                                }
                              />
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete "${item.name}"?`)) {
                                    deleteMenuItem(item.id);
                                    toast.success("Item deleted");
                                  }
                                }}
                                className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TABLES & QR */}
        {section === "tables" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-foreground">
                Tables & QR Codes
              </h2>
              <Button
                className="bg-primary hover:bg-primary/90 text-white gap-1.5"
                size="sm"
                onClick={() => {
                  addTable();
                  toast.success("Table added");
                }}
              >
                <Plus className="w-4 h-4" />
                Add Table
              </Button>
            </div>

            {/* QR code info notice */}
            {tables.length > 0 && (
              <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">✅</span>
                <span>
                  <strong>Menu is embedded in QR codes.</strong> Customers can
                  scan from any phone without needing a network connection to
                  this device. After adding or editing menu items, return here
                  to reprint QR codes so customers see the updated menu.
                </span>
              </div>
            )}

            {tables.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🪑</div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">
                  No Tables Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add tables to generate QR codes for customers.
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    addTable();
                    toast.success("Table added");
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Table
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => {
                  // Build compact payload — menu embedded directly in the URL
                  // so any customer's phone can decode without prior localStorage data.
                  const compactPayload: CompactMenuPayload = {
                    r: restaurantId,
                    rn: restaurantInfo?.name ?? "Restaurant",
                    t: table.id,
                    tn: table.tableNumber,
                    g: gstPercent,
                    m: menuItems
                      .filter((item) => item.isAvailable)
                      .map((item) => ({
                        i: item.id,
                        n: item.name,
                        c: item.category,
                        p: item.price,
                        e: item.emoji,
                      })),
                  };
                  const encoded = encodeCompactMenu(compactPayload);
                  const qrData = `${window.location.origin}/?d=${encoded}`;
                  // Use error correction L (lowest) for maximum data capacity
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=000000&margin=10&ecc=L`;
                  return (
                    <div
                      key={table.id}
                      className="bg-white rounded-2xl border border-border shadow-card p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-display font-bold text-foreground">
                          {table.tableNumber}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              table.isOccupied
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-green-50 text-green-700 border-green-200"
                            }
                          >
                            {table.isOccupied ? "Occupied" : "Available"}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete ${table.tableNumber}?`)) {
                                deleteTable(table.id);
                                toast.success("Table deleted");
                              }
                            }}
                            className="w-6 h-6 rounded bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                      {/* QR Code */}
                      <div className="flex justify-center my-3">
                        <div className="p-3 bg-white border-2 border-border rounded-xl">
                          <img
                            src={qrUrl}
                            alt={`QR for ${table.tableNumber}`}
                            className="w-32 h-32"
                            loading="lazy"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mb-3 break-all line-clamp-1">
                        {qrData}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                        onClick={() => printQR(table.tableNumber, qrUrl)}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print QR Code
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REPORTS */}
        {section === "reports" && (
          <div>
            <h2 className="font-display font-bold text-xl text-foreground mb-4">
              Sales Reports
            </h2>

            {/* Summary Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: "Today's Revenue",
                  value: `₹${todayRevenue}`,
                  icon: "💰",
                },
                {
                  label: "Today's Orders",
                  value: String(todayBills.length),
                  icon: "📋",
                },
                {
                  label: "Total Revenue",
                  value: `₹${totalRevenue}`,
                  icon: "📊",
                },
                {
                  label: "Total Orders",
                  value: String(orders.length),
                  icon: "🛒",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-white rounded-2xl border border-border shadow-card p-4"
                >
                  <div className="text-3xl mb-2">{card.icon}</div>
                  <div className="text-2xl font-display font-bold text-foreground">
                    {card.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {card.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Bills Table */}
            <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">All Bills</h3>
              </div>
              {bills.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No bills yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {[
                          "Table",
                          "Items",
                          "Subtotal",
                          "GST",
                          "Total",
                          "Payment",
                          "Status",
                          "Date",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...bills]
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((bill) => (
                          <tr
                            key={bill.id}
                            className="border-b border-border last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-foreground">
                              {bill.tableNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {bill.items.length}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              ₹{bill.subtotal}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              ₹{bill.gstAmount}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-foreground">
                              ₹{bill.grandTotal}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {bill.paymentMethod ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={
                                  bill.isPaid
                                    ? "text-green-600 border-green-200 bg-green-50"
                                    : "text-orange-600 border-orange-200 bg-orange-50"
                                }
                              >
                                {bill.isPaid ? "Paid" : "Pending"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(bill.createdAt).toLocaleDateString(
                                "en-IN",
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GST SETTINGS */}
        {section === "gst" && (
          <div>
            <h2 className="font-display font-bold text-xl text-foreground mb-4">
              GST Settings
            </h2>
            <div className="max-w-md">
              <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Percent className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current GST Rate
                    </p>
                    <p className="text-2xl font-display font-bold text-primary">
                      {gstPercent}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="gst-input"
                  >
                    Update GST Percentage
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="gst-input"
                      type="number"
                      value={gstInput}
                      onChange={(e) => setGstInput(e.target.value)}
                      min="0"
                      max="100"
                      className="flex-1"
                      placeholder="Enter GST %"
                    />
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white font-semibold shrink-0"
                      onClick={() => {
                        const val = Number.parseFloat(gstInput);
                        if (Number.isNaN(val) || val < 0 || val > 100) {
                          toast.error("Enter a valid GST percentage (0-100)");
                          return;
                        }
                        updateGST(val);
                        toast.success(`GST updated to ${val}%`);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This GST rate will be applied to all new bills.
                  </p>
                </div>

                {/* GST Preview */}
                <div className="mt-4 p-4 bg-muted rounded-xl">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    GST Preview
                  </p>
                  {[100, 250, 500, 1000].map((amount) => {
                    const gst = Math.round(amount * (gstPercent / 100));
                    return (
                      <div
                        key={amount}
                        className="flex justify-between text-sm py-1"
                      >
                        <span className="text-muted-foreground">
                          ₹{amount} subtotal
                        </span>
                        <span className="text-foreground font-medium">
                          → ₹{amount + gst} (GST ₹{gst})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
