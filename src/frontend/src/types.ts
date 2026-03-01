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
}

export interface Bill {
  id: string;
  orderId: string;
  tableId: string;
  tableNumber: string;
  items: CartItem[];
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  paymentMethod: "Cash" | "UPI" | "Card" | null;
  isPaid: boolean;
  createdAt: number;
  paidAt: number | null;
}

export type UserRole = "admin" | "kitchen" | "billing" | null;

export interface AppState {
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  orders: Order[];
  bills: Bill[];
  gstPercent: number;
  userRole: UserRole;
}
