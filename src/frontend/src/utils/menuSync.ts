/**
 * menuSync.ts — Cross-device menu synchronisation via ICP backend.
 *
 * Uses the new anonymous-accessible endpoints:
 *   saveMenuSnapshot(restaurantId, menuJson) — admin saves menu (no auth required)
 *   getMenuSnapshot(restaurantId)           — customer loads menu (no auth required)
 *
 * This replaces the old addSale/getAllSales approach which required #sales role.
 */

import type { backendInterface } from "../backend.d";
import type { MenuItem } from "../types";

type Actor = backendInterface;

export interface MenuSyncPayload {
  restaurantId: string;
  restaurantName: string;
  gstPercent: number;
  isActive: boolean;
  menuItems: MenuItem[];
  savedAt: number;
}

/**
 * Push the current menu snapshot to the ICP canister.
 * Non-fatal — if the call fails, the local snapshot is still valid.
 * Uses saveMenuSnapshot which requires NO authentication.
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
    await actor.saveMenuSnapshot(payload.restaurantId, JSON.stringify(lean));
  } catch (err) {
    console.warn("[menuSync] saveMenuToBackend failed (non-fatal):", err);
  }
}

/**
 * Fetch the latest menu snapshot for a restaurant from the ICP canister.
 * Returns null if not found or on error.
 * Uses getMenuSnapshot which requires NO authentication.
 */
export async function fetchMenuFromBackend(
  actor: Actor,
  restaurantId: string,
): Promise<MenuSyncPayload | null> {
  try {
    const result = await actor.getMenuSnapshot(restaurantId);
    if (!result) return null;
    try {
      const payload = JSON.parse(result.menuJson) as MenuSyncPayload;
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
    return null;
  } catch (err) {
    console.warn("[menuSync] fetchMenuFromBackend failed (non-fatal):", err);
    return null;
  }
}
