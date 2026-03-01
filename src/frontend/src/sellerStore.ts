import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Restaurant, RestaurantPins } from "./types";

// Default PINs for every restaurant
export const DEFAULT_PINS: RestaurantPins = {
  admin: "0000",
  kitchen: "1234",
  billing: "5678",
};

interface SellerState {
  restaurants: Restaurant[];
  isSellerAuthenticated: boolean;
  appSuspended: boolean;
  /** The restaurant currently selected/active in the app (used for PIN lookup) */
  activeRestaurantId: string | null;
  /** True once Zustand has finished loading from localStorage */
  _hasHydrated: boolean;
}

interface SellerStore extends SellerState {
  sellerLogin: () => void;
  sellerLogout: () => void;
  setActiveRestaurant: (id: string | null) => void;
  setHasHydrated: (v: boolean) => void;
  addRestaurant: (data: {
    name: string;
    ownerName: string;
    ownerPhone: string;
  }) => void;
  removeRestaurant: (id: string) => void;
  toggleRestaurantActive: (id: string) => void;
  renewSubscription: (id: string) => void;
  updateRestaurantPins: (id: string, pins: Partial<RestaurantPins>) => void;
  getActivePins: () => RestaurantPins;
  getActivePinsForRestaurant: (id: string) => RestaurantPins;
}

// Synchronously check if we already have data in localStorage so we can
// set _hasHydrated = true immediately on the first render, avoiding the
// race condition that caused "Restaurant Not Found" on QR scan page loads.
function getInitialSellerState(): Pick<
  SellerState,
  "restaurants" | "appSuspended" | "_hasHydrated"
> {
  try {
    const raw = localStorage.getItem("restaurant_seller_state");
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed?.state;
      if (state) {
        return {
          restaurants: state.restaurants ?? [],
          appSuspended: state.appSuspended ?? false,
          _hasHydrated: true,
        };
      }
    }
  } catch {
    // ignore parse errors
  }
  return { restaurants: [], appSuspended: false, _hasHydrated: false };
}

const _initialSellerState = getInitialSellerState();

export const useSellerStore = create<SellerStore>()(
  persist(
    (set, get) => ({
      ..._initialSellerState,
      isSellerAuthenticated: false,
      activeRestaurantId: null,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      sellerLogin: () => set({ isSellerAuthenticated: true }),
      sellerLogout: () => set({ isSellerAuthenticated: false }),
      setActiveRestaurant: (id) => set({ activeRestaurantId: id }),

      getActivePins: () => {
        const { restaurants, activeRestaurantId } = get();
        const active = restaurants.find((r) => r.id === activeRestaurantId);
        if (!active?.pins) return DEFAULT_PINS;
        return { ...DEFAULT_PINS, ...active.pins };
      },

      getActivePinsForRestaurant: (id: string) => {
        const { restaurants } = get();
        const r = restaurants.find((r) => r.id === id);
        if (!r?.pins) return DEFAULT_PINS;
        return { ...DEFAULT_PINS, ...r.pins };
      },

      addRestaurant: (data) => {
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const restaurant: Restaurant = {
          id: crypto.randomUUID(),
          name: data.name,
          ownerName: data.ownerName,
          ownerPhone: data.ownerPhone,
          subscriptionStartDate: now,
          subscriptionEndDate: now + thirtyDays,
          isActive: true,
          createdAt: now,
        };
        set((state) => ({ restaurants: [...state.restaurants, restaurant] }));
      },

      removeRestaurant: (id) =>
        set((state) => {
          const remaining = state.restaurants.filter((r) => r.id !== id);
          // If removing the last active-managed restaurant, check suspension
          const anyInactive = remaining.some((r) => !r.isActive);
          return {
            restaurants: remaining,
            appSuspended: remaining.length === 0 ? false : anyInactive,
          };
        }),

      toggleRestaurantActive: (id) =>
        set((state) => {
          const updated = state.restaurants.map((r) =>
            r.id === id ? { ...r, isActive: !r.isActive } : r,
          );
          // If any restaurant is inactive, app is suspended
          const anyInactive = updated.some((r) => !r.isActive);
          return {
            restaurants: updated,
            appSuspended: anyInactive,
          };
        }),

      renewSubscription: (id) =>
        set((state) => ({
          restaurants: state.restaurants.map((r) => {
            if (r.id !== id) return r;
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            // Extend from existing end date if still in future, otherwise from now
            const baseDate =
              r.subscriptionEndDate > now ? r.subscriptionEndDate : now;
            return {
              ...r,
              subscriptionEndDate: baseDate + thirtyDays,
              isActive: true,
            };
          }),
          // Recompute appSuspended after renewal (renewed = active again)
          appSuspended: (() => {
            const updatedList = get().restaurants.map((r) => {
              if (r.id !== id) return r;
              const thirtyDays = 30 * 24 * 60 * 60 * 1000;
              const now = Date.now();
              const baseDate =
                r.subscriptionEndDate > now ? r.subscriptionEndDate : now;
              return {
                ...r,
                subscriptionEndDate: baseDate + thirtyDays,
                isActive: true,
              };
            });
            return updatedList.some((r) => !r.isActive);
          })(),
        })),

      updateRestaurantPins: (id, pins) =>
        set((state) => ({
          restaurants: state.restaurants.map((r) =>
            r.id === id
              ? {
                  ...r,
                  pins: { ...DEFAULT_PINS, ...r.pins, ...pins },
                }
              : r,
          ),
        })),
    }),
    {
      name: "restaurant_seller_state",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
