/**
 * menuSync.ts — Cross-device menu synchronisation via ICP backend.
 *
 * Stores the restaurant menu snapshot in the ICP canister using the same
 * addSale/getAllSales key-value trick as orderSync.ts.
 *
 * Record format:
 *   id                    = "RM_{restaurantId}"
 *   item                  = JSON.stringify(MenuSyncPayload)
 *   customerContact.email = restaurantId
 *   customerContact.phone = "menu"
 *   quantity              = 1n
 *   price                 = 0n
 *   timestamp             = Date.now() * 1_000_000n (nanoseconds)
 *
 * "RM_" prefix separates menu records from order records ("RO_").
 */

import type { backendInterface } from "../backend.d";
import type { MenuItem } from "../types";

type Actor = backendInterface;

const MENU_PREFIX = "RM_";

export interface MenuSyncPayload {
  restaurantId: string;
  restaurantName: string;
  gstPercent: number;
  isActive: boolean;
  menuItems: MenuItem[];
  savedAt: number;
}

function makeMenuId(restaurantId: string): string {
  return `${MENU_PREFIX}${restaurantId}`;
}

/**
 * Push the current menu snapshot to the ICP canister.
 * Non-fatal — if the call fails, the local snapshot is still valid.
 */
export async function saveMenuToBackend(
  actor: Actor,
  payload: MenuSyncPayload,
): Promise<void> {
  try {
    // Strip large base64 images to keep payload small (emoji fallback used on customer side)
    const lean: MenuSyncPayload = {
      ...payload,
      menuItems: payload.menuItems.map((item) => ({
        ...item,
        imageUrl: undefined,
      })),
    };
    await actor.addSale({
      id: makeMenuId(payload.restaurantId),
      item: JSON.stringify(lean),
      customerContact: {
        email: payload.restaurantId,
        phone: "menu",
      },
      quantity: BigInt(1),
      price: BigInt(0),
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
    });
  } catch (err) {
    console.warn("[menuSync] saveMenuToBackend failed (non-fatal):", err);
  }
}

/**
 * Fetch the latest menu snapshot for a restaurant from the ICP canister.
 * Returns null if not found or on error.
 */
export async function fetchMenuFromBackend(
  actor: Actor,
  restaurantId: string,
): Promise<MenuSyncPayload | null> {
  try {
    const targetId = makeMenuId(restaurantId);
    const sales = await actor.getAllSales();
    for (const sale of sales) {
      if (sale.id === targetId) {
        try {
          const payload = JSON.parse(sale.item) as MenuSyncPayload;
          if (
            payload &&
            typeof payload.restaurantId === "string" &&
            Array.isArray(payload.menuItems)
          ) {
            return payload;
          }
        } catch {
          // malformed record
        }
      }
    }
    return null;
  } catch (err) {
    console.warn("[menuSync] fetchMenuFromBackend failed (non-fatal):", err);
    return null;
  }
}
