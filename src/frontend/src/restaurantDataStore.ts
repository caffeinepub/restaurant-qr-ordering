import { create } from "zustand";
import type { StoreApi } from "zustand";
import { useStore as useZustandStore } from "zustand";
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

interface RestaurantStore extends AppState {
  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

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

// Map of store instances keyed by restaurantId
const storeMap = new Map<string, StoreApi<RestaurantStore>>();

type InitialRestaurantState = AppState & { _hasHydrated: boolean };

// Synchronously read restaurant data from localStorage so the store is
// already hydrated on first render — prevents "Restaurant Not Found" on QR scans.
function getInitialRestaurantState(
  restaurantId: string,
): InitialRestaurantState {
  const defaults: InitialRestaurantState = {
    menuItems: [],
    tables: [],
    orders: [],
    bills: [],
    gstPercent: 18,
    userRole: null,
    _hasHydrated: false,
  };
  try {
    const raw = localStorage.getItem(`restaurant_data_${restaurantId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed?.state;
      if (state) {
        return {
          menuItems: state.menuItems ?? [],
          tables: state.tables ?? [],
          orders: state.orders ?? [],
          bills: state.bills ?? [],
          gstPercent: state.gstPercent ?? 18,
          userRole: state.userRole ?? null,
          _hasHydrated: true,
        };
      }
    }
  } catch {
    // ignore parse errors
  }
  return defaults;
}

function createRestaurantStore(
  restaurantId: string,
): StoreApi<RestaurantStore> {
  const _initialState = getInitialRestaurantState(restaurantId);
  return create<RestaurantStore>()(
    persist(
      (set, get) => ({
        // Initial state loaded synchronously from localStorage
        ..._initialState,
        setHasHydrated: (v) => set({ _hasHydrated: v }),

        login: (role) => set({ userRole: role }),
        logout: () => set({ userRole: null }),

        addMenuItem: (item) =>
          set((state) => ({
            menuItems: [
              ...state.menuItems,
              { ...item, id: crypto.randomUUID() },
            ],
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
              item.id === id
                ? { ...item, isAvailable: !item.isAvailable }
                : item,
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

          set((s) => ({
            bills: [...s.bills, bill],
            orders: s.orders.map((o) =>
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
        name: `restaurant_data_${restaurantId}`,
        version: 1,
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.setHasHydrated(true);
          }
        },
      },
    ),
  );
}

export function getOrCreateStore(
  restaurantId: string,
): StoreApi<RestaurantStore> {
  if (!storeMap.has(restaurantId)) {
    storeMap.set(restaurantId, createRestaurantStore(restaurantId));
  }
  return storeMap.get(restaurantId)!;
}

export function useRestaurantStore(restaurantId: string): RestaurantStore {
  const store = getOrCreateStore(restaurantId);
  return useZustandStore(store);
}
