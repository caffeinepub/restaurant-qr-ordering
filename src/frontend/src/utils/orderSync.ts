/**
 * orderSync.ts — Cross-device order synchronisation via ICP backend.
 *
 * Uses the new anonymous-accessible restaurant order endpoints:
 *   submitRestaurantOrder  — customer phones call this (no auth needed)
 *   getRestaurantOrders    — kitchen/billing polls this (no auth needed)
 *   updateRestaurantOrderStatus — kitchen updates status (no auth needed)
 *
 * The old addSale/getAllSales approach required #sales role and failed for
 * anonymous customers. These new endpoints have no role requirement.
 */

import type {
  RestaurantOrder as BackendOrder,
  backendInterface,
} from "../backend.d";
import type { CartItem, Order } from "../types";

type Actor = backendInterface;

/** Convert a frontend Order to the backend RestaurantOrder format */
function toBackendOrder(restaurantId: string, order: Order): BackendOrder {
  return {
    id: order.id,
    restaurantId,
    tableId: order.tableId,
    tableNumber: order.tableNumber,
    itemsJson: JSON.stringify(order.items),
    status: order.status,
    kitchenStatus: order.kitchenStatus,
    createdAt: BigInt(order.createdAt),
    updatedAt: BigInt(Date.now()),
  };
}

/** Convert a backend RestaurantOrder to the frontend Order format */
function fromBackendOrder(backendOrder: BackendOrder): Order {
  let items: CartItem[] = [];
  try {
    items = JSON.parse(backendOrder.itemsJson) as CartItem[];
  } catch {
    items = [];
  }
  return {
    id: backendOrder.id,
    tableId: backendOrder.tableId,
    tableNumber: backendOrder.tableNumber,
    items,
    status: backendOrder.status as Order["status"],
    kitchenStatus: backendOrder.kitchenStatus as Order["kitchenStatus"],
    createdAt: Number(backendOrder.createdAt),
  };
}

/**
 * Publish (or update) a single order to the ICP backend.
 * Non-fatal — if the call fails, the order still lives in localStorage.
 * Uses submitRestaurantOrder which requires NO authentication.
 */
export async function syncOrderToBackend(
  actor: Actor,
  restaurantId: string,
  order: Order,
): Promise<void> {
  try {
    await actor.submitRestaurantOrder(toBackendOrder(restaurantId, order));
  } catch (err) {
    console.warn("[orderSync] syncOrderToBackend failed (non-fatal):", err);
  }
}

/**
 * Fetch all orders for a restaurant from the ICP backend.
 * Returns an empty array on error.
 * Uses getRestaurantOrders which requires NO authentication.
 */
export async function fetchOrdersFromBackend(
  actor: Actor,
  restaurantId: string,
): Promise<Order[]> {
  try {
    const backendOrders = await actor.getRestaurantOrders(restaurantId);
    return backendOrders.map(fromBackendOrder);
  } catch (err) {
    console.warn("[orderSync] fetchOrdersFromBackend failed (non-fatal):", err);
    return [];
  }
}

/**
 * Update the kitchen/order status of an order on the backend.
 * Kitchen uses this to mark orders as preparing/ready/delivered.
 * Uses updateRestaurantOrderStatus which requires NO authentication.
 */
export async function updateOrderStatusOnBackend(
  actor: Actor,
  orderId: string,
  kitchenStatus: string,
  orderStatus: string,
): Promise<void> {
  try {
    await actor.updateRestaurantOrderStatus(
      orderId,
      kitchenStatus,
      orderStatus,
    );
  } catch (err) {
    console.warn(
      "[orderSync] updateOrderStatusOnBackend failed (non-fatal):",
      err,
    );
  }
}

/**
 * Merge backend orders with local orders.
 * - Prefer the backend version when the same orderId exists in both
 *   (kitchen/billing may have updated kitchenStatus there).
 * - Local-only orders (not yet synced or sync failed) are kept as-is.
 */
export function mergeOrders(
  localOrders: Order[],
  backendOrders: Order[],
): Order[] {
  const backendMap = new Map<string, Order>(
    backendOrders.map((o) => [o.id, o]),
  );

  // Update or keep local orders
  const merged = localOrders.map((local) => {
    const remote = backendMap.get(local.id);
    if (!remote) return local;
    // Prefer backend for status fields (kitchen updates are authoritative)
    return {
      ...local,
      ...remote,
      kitchenStatus: remote.kitchenStatus,
      status: remote.status,
    };
  });

  // Add backend-only orders (placed on another device)
  const localIds = new Set(localOrders.map((o) => o.id));
  for (const remote of backendOrders) {
    if (!localIds.has(remote.id)) {
      merged.push(remote);
    }
  }

  return merged;
}
