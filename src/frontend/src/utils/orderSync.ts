/**
 * orderSync.ts — Cross-device order synchronisation via ICP backend.
 *
 * The ICP canister's addSale / getAllSales methods serve as a shared key-value
 * store. Orders are encoded as SaleTransaction records:
 *
 *   id          = "RO_{restaurantId}_{orderId}"
 *   item        = JSON.stringify(order)
 *   customerContact.email = restaurantId  (used for filtering)
 *   customerContact.phone = orderId
 *   quantity    = 1n
 *   price       = 0n
 *   timestamp   = Date.now() * 1_000_000n  (nanoseconds)
 *
 * "RO_" prefix separates restaurant orders from any real sales data.
 */

import type { backendInterface } from "../backend.d";
import type { Order } from "../types";

type Actor = backendInterface;

/** Prefix used to distinguish restaurant orders from real sale records. */
const ORDER_PREFIX = "RO_";

function makeId(restaurantId: string, orderId: string): string {
  return `${ORDER_PREFIX}${restaurantId}_${orderId}`;
}

/**
 * Publish (or update) a single order to the ICP backend.
 * Non-fatal — if the call fails, the order still lives in localStorage.
 */
export async function syncOrderToBackend(
  actor: Actor,
  restaurantId: string,
  order: Order,
): Promise<void> {
  try {
    await actor.addSale({
      id: makeId(restaurantId, order.id),
      item: JSON.stringify(order),
      customerContact: {
        email: restaurantId,
        phone: order.id,
      },
      quantity: BigInt(1),
      price: BigInt(0),
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
    });
  } catch (err) {
    console.warn("[orderSync] syncOrderToBackend failed (non-fatal):", err);
  }
}

/**
 * Fetch all orders for a restaurant from the ICP backend.
 * Returns an empty array on error.
 */
export async function fetchOrdersFromBackend(
  actor: Actor,
  restaurantId: string,
): Promise<Order[]> {
  try {
    const sales = await actor.getAllSales();
    const orders: Order[] = [];
    for (const sale of sales) {
      if (!sale.id.startsWith(`${ORDER_PREFIX}${restaurantId}_`)) continue;
      try {
        const order = JSON.parse(sale.item) as Order;
        if (order && typeof order.id === "string") {
          orders.push(order);
        }
      } catch {
        // skip malformed records
      }
    }
    return orders;
  } catch (err) {
    console.warn("[orderSync] fetchOrdersFromBackend failed (non-fatal):", err);
    return [];
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
    // Prefer whichever has a more recent createdAt, or merge kitchenStatus
    // from backend (kitchen updates are more authoritative)
    return {
      ...local,
      ...remote,
      // Always keep the latest kitchenStatus from backend
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
