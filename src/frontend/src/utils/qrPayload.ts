import type { MenuItem, QRPayload } from "../types";

export function encodeQRPayload(payload: QRPayload): string {
  const json = JSON.stringify(payload);
  return btoa(encodeURIComponent(json));
}

export function decodeQRPayload(encoded: string): QRPayload | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json);
    // Basic validation
    if (
      typeof parsed.restaurantId === "string" &&
      typeof parsed.tableId === "string" &&
      typeof parsed.sessionToken === "string" &&
      Array.isArray(parsed.menuItems)
    ) {
      return parsed as QRPayload;
    }
    return null;
  } catch {
    return null;
  }
}

// ---- Compact QR helpers ----
// Store menu snapshot in localStorage so the customer page (same origin)
// can load it without embedding everything in the URL.

const SNAPSHOT_PREFIX = "menu_snapshot_";

export interface MenuSnapshot {
  restaurantId: string;
  restaurantName: string;
  gstPercent: number;
  isActive: boolean;
  menuItems: MenuItem[];
  savedAt: number;
}

export function saveMenuSnapshot(snapshot: MenuSnapshot): void {
  try {
    // Strip base64 image data to keep storage lean (emoji fallback used)
    const lean: MenuSnapshot = {
      ...snapshot,
      menuItems: snapshot.menuItems.map((item) => ({
        ...item,
        imageUrl: undefined,
      })),
    };
    localStorage.setItem(
      `${SNAPSHOT_PREFIX}${snapshot.restaurantId}`,
      JSON.stringify(lean),
    );
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

export function loadMenuSnapshot(restaurantId: string): MenuSnapshot | null {
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_PREFIX}${restaurantId}`);
    if (!raw) return null;
    return JSON.parse(raw) as MenuSnapshot;
  } catch {
    return null;
  }
}

// ---- Compact URL-embedded QR payload ----
// This solves the cross-device problem: the entire menu is encoded into
// the QR URL so a customer's phone can decode it without any localStorage.
//
// Field names are deliberately short to minimise QR code density:
//   r  = restaurantId
//   rn = restaurantName
//   t  = tableId
//   tn = tableNumber
//   g  = gstPercent
//   m  = menu items array
//     i = id, n = name, c = category, p = price, e = emoji, a = isAvailable

export interface CompactMenuPayload {
  r: string; // restaurantId
  rn: string; // restaurantName
  t: string; // tableId
  tn: string; // tableNumber
  g: number; // gstPercent
  m: Array<{
    i: string; // id
    n: string; // name
    c: string; // category
    p: number; // price
    e: string; // emoji
  }>;
}

export function encodeCompactMenu(payload: CompactMenuPayload): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  } catch {
    return "";
  }
}

export function decodeCompactMenu(encoded: string): CompactMenuPayload | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json);
    if (
      typeof parsed.r === "string" &&
      typeof parsed.rn === "string" &&
      typeof parsed.t === "string" &&
      typeof parsed.tn === "string" &&
      typeof parsed.g === "number" &&
      Array.isArray(parsed.m)
    ) {
      return parsed as CompactMenuPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Build a QRPayload (used by CustomerMenuInner) from a decoded CompactMenuPayload.
 * Image URLs are not embedded in QR codes for size reasons — emoji fallback is used.
 */
export function compactToQRPayload(compact: CompactMenuPayload): QRPayload {
  return {
    restaurantId: compact.r,
    restaurantName: compact.rn,
    tableId: compact.t,
    tableNumber: compact.tn,
    sessionToken: compact.t, // tableId used as stable token
    gstPercent: compact.g,
    menuItems: compact.m.map((item) => ({
      id: item.i,
      name: item.n,
      category: item.c as MenuItem["category"],
      price: item.p,
      emoji: item.e,
      description: "",
      imageUrl: undefined,
      isAvailable: true,
    })),
  };
}
