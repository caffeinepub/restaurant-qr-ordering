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
// the QR URL as a `?d=BASE64` param so a customer's phone can decode it
// without any localStorage or backend calls.
//
// Field names are deliberately short to minimise QR code density:
//   rn = restaurantName
//   g  = gstPercent
//   m  = menu items array
//     i = id (first 8 chars only), n = name, c = category index (0-3),
//     p = price, e = emoji

const CATEGORY_MAP = [
  "Starters",
  "Main Course",
  "Beverages",
  "Desserts",
] as const;

export interface CompactMenuPayload {
  rn: string; // restaurantName
  g: number; // gstPercent
  m: Array<{
    i: string; // id (shortened)
    n: string; // name
    c: number; // category index
    p: number; // price
    e: string; // emoji
  }>;
}

/**
 * Encode the menu into a URL-safe base64 string for embedding in QR URLs.
 * Only available items are included. Images are excluded to keep it small.
 */
export function encodeMenuForQR(
  restaurantName: string,
  gstPercent: number,
  menuItems: MenuItem[],
): string {
  try {
    const payload: CompactMenuPayload = {
      rn: restaurantName,
      g: gstPercent,
      m: menuItems
        .filter((item) => item.isAvailable)
        .map((item) => ({
          i: item.id.slice(0, 8),
          n: item.name,
          c: CATEGORY_MAP.indexOf(
            item.category as (typeof CATEGORY_MAP)[number],
          ),
          p: item.price,
          e: item.emoji || "🍽️",
        })),
    };
    // Use URL-safe base64. encodeURIComponent handles emoji/Unicode safely.
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

/**
 * Decode a QR menu payload from a URL-safe base64 string.
 */
export function decodeMenuFromQR(
  encoded: string,
  restaurantId: string,
  tableId: string,
  tableNumber: string,
): QRPayload | null {
  try {
    // Restore standard base64 from URL-safe variant, handle Unicode
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json) as CompactMenuPayload;
    if (
      typeof parsed.rn !== "string" ||
      typeof parsed.g !== "number" ||
      !Array.isArray(parsed.m)
    ) {
      return null;
    }
    return {
      restaurantId,
      restaurantName: parsed.rn,
      tableId,
      tableNumber,
      sessionToken: tableId,
      gstPercent: parsed.g,
      menuItems: parsed.m.map((item) => ({
        id: item.i,
        name: item.n,
        category: (CATEGORY_MAP[item.c] ?? "Starters") as MenuItem["category"],
        price: item.p,
        emoji: item.e,
        description: "",
        imageUrl: undefined,
        isAvailable: true,
      })),
    };
  } catch {
    return null;
  }
}

// Keep legacy exports for backward compat with old base64 QR format
export interface CompactMenuPayloadLegacy {
  r: string;
  rn: string;
  t: string;
  tn: string;
  g: number;
  m: Array<{ i: string; n: string; c: string; p: number; e: string }>;
}

export function encodeCompactMenu(payload: CompactMenuPayloadLegacy): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  } catch {
    return "";
  }
}

export function decodeCompactMenu(
  encoded: string,
): CompactMenuPayloadLegacy | null {
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
      return parsed as CompactMenuPayloadLegacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function compactToQRPayload(
  compact: CompactMenuPayloadLegacy,
): QRPayload {
  return {
    restaurantId: compact.r,
    restaurantName: compact.rn,
    tableId: compact.t,
    tableNumber: compact.tn,
    sessionToken: compact.t,
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
