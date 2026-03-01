import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  Bill,
  CartItem,
  MenuItem,
  Order,
  RestaurantTable,
  UserRole,
} from "./types";

const SAMPLE_MENU_ITEMS: MenuItem[] = [
  {
    id: "m1",
    name: "Paneer Tikka",
    category: "Starters",
    price: 220,
    description: "Cottage cheese marinated in spices, grilled to perfection",
    emoji: "🧀",
    isAvailable: true,
  },
  {
    id: "m2",
    name: "Veg Spring Rolls",
    category: "Starters",
    price: 160,
    description: "Crispy rolls filled with seasoned vegetables",
    emoji: "🥢",
    isAvailable: true,
  },
  {
    id: "m3",
    name: "Chicken Wings",
    category: "Starters",
    price: 280,
    description: "Spiced crispy chicken wings with dipping sauce",
    emoji: "🍗",
    isAvailable: true,
  },
  {
    id: "m4",
    name: "Samosa (2 pcs)",
    category: "Starters",
    price: 80,
    description: "Golden fried pastry with spiced potato filling",
    emoji: "🥟",
    isAvailable: true,
  },
  {
    id: "m5",
    name: "Dal Makhani",
    category: "Main Course",
    price: 240,
    description: "Slow-cooked black lentils in creamy tomato gravy",
    emoji: "🫘",
    isAvailable: true,
  },
  {
    id: "m6",
    name: "Butter Chicken",
    category: "Main Course",
    price: 320,
    description: "Tender chicken in rich buttery tomato sauce",
    emoji: "🍛",
    isAvailable: true,
  },
  {
    id: "m7",
    name: "Paneer Butter Masala",
    category: "Main Course",
    price: 280,
    description: "Cottage cheese in smooth, spiced butter gravy",
    emoji: "🧀",
    isAvailable: true,
  },
  {
    id: "m8",
    name: "Veg Biryani",
    category: "Main Course",
    price: 260,
    description: "Fragrant basmati rice with mixed vegetables and spices",
    emoji: "🍚",
    isAvailable: true,
  },
  {
    id: "m9",
    name: "Chicken Biryani",
    category: "Main Course",
    price: 340,
    description: "Aromatic basmati rice with tender spiced chicken",
    emoji: "🍗",
    isAvailable: true,
  },
  {
    id: "m10",
    name: "Garlic Naan",
    category: "Main Course",
    price: 60,
    description: "Soft leavened bread with garlic butter",
    emoji: "🫓",
    isAvailable: true,
  },
  {
    id: "m11",
    name: "Mango Lassi",
    category: "Beverages",
    price: 120,
    description: "Thick, creamy mango yogurt drink",
    emoji: "🥭",
    isAvailable: true,
  },
  {
    id: "m12",
    name: "Masala Chai",
    category: "Beverages",
    price: 50,
    description: "Traditional spiced Indian tea",
    emoji: "☕",
    isAvailable: true,
  },
  {
    id: "m13",
    name: "Fresh Lime Soda",
    category: "Beverages",
    price: 80,
    description: "Refreshing lime with soda, sweet or salted",
    emoji: "🍋",
    isAvailable: true,
  },
  {
    id: "m14",
    name: "Cold Coffee",
    category: "Beverages",
    price: 140,
    description: "Chilled coffee blended with milk and ice cream",
    emoji: "☕",
    isAvailable: true,
  },
  {
    id: "m15",
    name: "Gulab Jamun (2 pcs)",
    category: "Desserts",
    price: 100,
    description: "Soft milk solids dumplings soaked in rose syrup",
    emoji: "🍮",
    isAvailable: true,
  },
  {
    id: "m16",
    name: "Rasmalai",
    category: "Desserts",
    price: 130,
    description: "Soft cottage cheese patties in sweetened milk",
    emoji: "🍮",
    isAvailable: true,
  },
  {
    id: "m17",
    name: "Chocolate Brownie",
    category: "Desserts",
    price: 160,
    description: "Warm fudgy brownie served with vanilla ice cream",
    emoji: "🍫",
    isAvailable: true,
  },
  {
    id: "m18",
    name: "Ice Cream (2 scoops)",
    category: "Desserts",
    price: 120,
    description: "Choice of vanilla, chocolate or strawberry",
    emoji: "🍨",
    isAvailable: true,
  },
];

const SAMPLE_TABLES: RestaurantTable[] = Array.from({ length: 6 }, (_, i) => ({
  id: `t${i + 1}`,
  tableNumber: `Table ${i + 1}`,
  sessionToken: `table-${i + 1}-token-abc${(i + 1) * 111}`,
  isOccupied: false,
  currentOrderId: null,
}));

interface Store extends AppState {
  // Auth
  login: (role: UserRole) => void;
  logout: () => void;

  // Menu
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  toggleMenuItemAvailability: (id: string) => void;

  // Tables
  addTable: () => void;
  deleteTable: (id: string) => void;
  resetTableSession: (tableId: string) => void;

  // Orders
  placeOrder: (
    tableId: string,
    tableNumber: string,
    items: CartItem[],
  ) => Order;
  addItemsToOrder: (orderId: string, items: CartItem[]) => void;
  updateOrderKitchenStatus: (
    orderId: string,
    status: Order["kitchenStatus"],
  ) => void;
  markOrderBilled: (orderId: string) => void;

  // Bills
  generateBill: (orderId: string) => Bill;
  processPayment: (billId: string, method: "Cash" | "UPI" | "Card") => void;

  // GST
  updateGST: (percent: number) => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      menuItems: SAMPLE_MENU_ITEMS,
      tables: SAMPLE_TABLES,
      orders: [],
      bills: [],
      gstPercent: 18,
      userRole: null,

      login: (role) => set({ userRole: role }),
      logout: () => set({ userRole: null }),

      addMenuItem: (item) =>
        set((state) => ({
          menuItems: [...state.menuItems, { ...item, id: crypto.randomUUID() }],
        })),

      updateMenuItem: (id, updates) =>
        set((state) => ({
          menuItems: state.menuItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        })),

      deleteMenuItem: (id) =>
        set((state) => ({
          menuItems: state.menuItems.filter((item) => item.id !== id),
        })),

      toggleMenuItemAvailability: (id) =>
        set((state) => ({
          menuItems: state.menuItems.map((item) =>
            item.id === id ? { ...item, isAvailable: !item.isAvailable } : item,
          ),
        })),

      addTable: () =>
        set((state) => {
          const nextNum = state.tables.length + 1;
          const id = crypto.randomUUID();
          return {
            tables: [
              ...state.tables,
              {
                id,
                tableNumber: `Table ${nextNum}`,
                sessionToken: `table-${id}-token-${Date.now()}`,
                isOccupied: false,
                currentOrderId: null,
              },
            ],
          };
        }),

      deleteTable: (id) =>
        set((state) => ({
          tables: state.tables.filter((t) => t.id !== id),
        })),

      resetTableSession: (tableId) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  sessionToken: `table-${t.id}-session-${Date.now()}`,
                  isOccupied: false,
                  currentOrderId: null,
                }
              : t,
          ),
        })),

      placeOrder: (tableId, tableNumber, items) => {
        const orderId = crypto.randomUUID();
        const order: Order = {
          id: orderId,
          tableId,
          tableNumber,
          items,
          status: "active",
          kitchenStatus: "pending",
          createdAt: Date.now(),
        };
        set((state) => ({
          orders: [...state.orders, order],
          tables: state.tables.map((t) =>
            t.id === tableId
              ? { ...t, isOccupied: true, currentOrderId: orderId }
              : t,
          ),
        }));
        return order;
      },

      addItemsToOrder: (orderId, newItems) =>
        set((state) => ({
          orders: state.orders.map((o) => {
            if (o.id !== orderId) return o;
            const merged = [...o.items];
            for (const newItem of newItems) {
              const existing = merged.findIndex(
                (x) => x.menuItemId === newItem.menuItemId,
              );
              if (existing >= 0) {
                merged[existing] = {
                  ...merged[existing],
                  quantity: merged[existing].quantity + newItem.quantity,
                };
              } else {
                merged.push(newItem);
              }
            }
            return { ...o, items: merged, kitchenStatus: "pending" };
          }),
        })),

      updateOrderKitchenStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, kitchenStatus: status } : o,
          ),
        })),

      markOrderBilled: (orderId) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: "billed" } : o,
          ),
        })),

      generateBill: (orderId) => {
        const state = get();
        const order = state.orders.find((o) => o.id === orderId);
        if (!order) throw new Error("Order not found");

        const subtotal = order.items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0,
        );
        const gstAmount = Math.round(subtotal * (state.gstPercent / 100));
        const grandTotal = subtotal + gstAmount;

        const bill: Bill = {
          id: crypto.randomUUID(),
          orderId,
          tableId: order.tableId,
          tableNumber: order.tableNumber,
          items: order.items,
          subtotal,
          gstPercent: state.gstPercent,
          gstAmount,
          grandTotal,
          paymentMethod: null,
          isPaid: false,
          createdAt: Date.now(),
          paidAt: null,
        };

        set((state) => ({
          bills: [...state.bills, bill],
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: "billed" } : o,
          ),
        }));

        return bill;
      },

      processPayment: (billId, method) => {
        const state = get();
        const bill = state.bills.find((b) => b.id === billId);
        if (!bill) return;

        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === billId
              ? {
                  ...b,
                  isPaid: true,
                  paymentMethod: method,
                  paidAt: Date.now(),
                }
              : b,
          ),
          orders: s.orders.map((o) =>
            o.id === bill.orderId ? { ...o, status: "paid" } : o,
          ),
          tables: s.tables.map((t) =>
            t.id === bill.tableId
              ? {
                  ...t,
                  isOccupied: false,
                  currentOrderId: null,
                  sessionToken: `table-${t.id}-session-${Date.now()}`,
                }
              : t,
          ),
        }));
      },

      updateGST: (percent) => set({ gstPercent: percent }),
    }),
    {
      name: "restaurant_app_state",
      version: 1,
    },
  ),
);
