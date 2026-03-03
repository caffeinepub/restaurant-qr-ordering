export type MenuCategory =
  | "Starters"
  | "Main Course"
  | "Beverages"
  | "Desserts";

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description: string;
  emoji: string;
  imageUrl?: string;
  isAvailable: boolean;
}

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  sessionToken: string;
  isOccupied: boolean;
  currentOrderId: string | null;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export type OrderStatus = "active" | "billed" | "paid";

export interface Order {
  id: string;
  tableId: string;
  tableNumber: string;
  items: CartItem[];
  status: OrderStatus;
  kitchenStatus: "pending" | "preparing" | "ready" | "delivered";
  createdAt: number;
  billRequested?: boolean;
}

export interface Bill {
  id: string;
  billNumber: number;
  orderId: string;
  tableId: string;
  tableNumber: string;
  items: CartItem[];
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  grandTotal: number;
  paymentMethod: "Cash" | "UPI" | "Card" | null;
  isPaid: boolean;
  createdAt: number;
  paidAt: number | null;
}

export interface BillSettings {
  restaurantName: string;
  address: string;
  phone: string;
  gstin: string;
  gstPercent: number;
  serviceChargePercent: number;
  thankYouMessage: string;
  billNumberPrefix: number; // daily reset start (e.g. 1001)
  currentBillNumber: number;
  lastResetDate: string; // ISO date string YYYY-MM-DD
}

export type UserRole = "admin" | "kitchen" | "billing" | null;

export interface AppState {
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  orders: Order[];
  bills: Bill[];
  gstPercent: number;
  userRole: UserRole;
  billSettings: BillSettings;
}

export interface RestaurantPins {
  admin: string;
  kitchen: string;
  billing: string;
}

export interface Restaurant {
  id: string;
  name: string;
  ownerName: string;
  ownerPhone: string;
  subscriptionStartDate: number; // timestamp ms
  subscriptionEndDate: number; // timestamp ms (30 days from start)
  isActive: boolean;
  createdAt: number;
  pins?: RestaurantPins;
}

export interface QRPayload {
  restaurantId: string;
  restaurantName: string;
  tableId: string;
  tableNumber: string;
  sessionToken: string;
  gstPercent: number;
  menuItems: MenuItem[];
}
