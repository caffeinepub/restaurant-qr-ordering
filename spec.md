# Restaurant QR Ordering

## Current State
The app has a multi-restaurant QR ordering system where:
- Seller dashboard manages restaurants (2-step PIN: 6598 then 6478)
- Each restaurant logs in with name/owner/phone, then role PIN (Admin/Kitchen/Billing)
- Admin can add menu items (with images), create tables, generate QR codes
- Kitchen dashboard shows orders with status controls
- Billing counter generates bills and processes payments
- Customer scans QR and sees a menu

**Critical Bug:** The customer QR scan always fails with "Menu Not Available" because the system stores menu data in `localStorage` under a `menu_snapshot_` key and tries to load it on the customer's phone -- but the customer's phone is a completely different device/browser with a completely different localStorage. The data never crosses devices.

All prior attempts to fix this at the localStorage level have failed. The only correct fix is to store menu, table, restaurant, and order data in the **Motoko backend canister** so any device can fetch it via API calls.

## Requested Changes (Diff)

### Add
- Motoko backend with full data model: restaurants, menu items, tables, orders, bills
- Backend APIs for all CRUD operations: restaurants, menu, tables, orders, billing
- Customer QR scan fetches menu from backend (works on any device)
- Orders placed by customers are stored in backend (visible to kitchen/billing in real time)
- Menu updates by admin are immediately visible to customers (no QR regeneration needed)
- Seller authentication stored in backend with two-code verification
- Restaurant authentication via backend (name + owner + phone match)
- Role-based PIN verification against backend data

### Modify
- CustomerMenu: fetch restaurant info + menu from backend using restaurantId + tableId from QR URL
- AdminPanel: write all changes (menu items, tables, GST) to backend
- KitchenDashboard: read orders from backend, update kitchen status via backend
- BillingCounter: read orders/bills from backend, process payments via backend
- RestaurantLogin: verify restaurant credentials against backend data
- SellerDashboard: manage restaurants via backend, set PINs via backend
- QR code URL format stays the same: `?r=RESTAURANT_ID&t=TABLE_ID` (short, scannable)

### Remove
- All localStorage-based data stores (sellerStore.ts, restaurantDataStore.ts)
- Menu snapshot system (qrPayload.ts saveMenuSnapshot/loadMenuSnapshot)
- All Zustand persist stores for restaurant/seller data
- QRPayload type with embedded menuItems (no longer needed in URL)

## Implementation Plan

### Backend (Motoko)
1. Seller entity: two-code auth (code1=6598, code2=6478), manages restaurants
2. Restaurant entity: id, name, ownerName, ownerPhone, isActive, subscriptionEndDate, pins (admin/kitchen/billing)
3. MenuItem entity: id, restaurantId, name, category, price, description, emoji, imageUrl, isAvailable
4. Table entity: id, restaurantId, tableNumber, isOccupied, currentOrderId, sessionToken
5. Order entity: id, restaurantId, tableId, tableNumber, items[], status, kitchenStatus, createdAt
6. Bill entity: id, restaurantId, orderId, tableId, items[], subtotal, gstPercent, gstAmount, grandTotal, paymentMethod, isPaid, paidAt

APIs needed:
- Seller: verifySeller(code1, code2), addRestaurant, removeRestaurant, getRestaurants, toggleRestaurantActive, updateRestaurantPins, renewSubscription
- Restaurant auth: verifyRestaurant(name, ownerName, phone) -> restaurantId | null, verifyPin(restaurantId, role, pin) -> bool
- Menu: getMenu(restaurantId), addMenuItem, updateMenuItem, deleteMenuItem, toggleItemAvailability
- Tables: getTables(restaurantId), addTable, deleteTable, resetTable
- Orders: getOrders(restaurantId), placeOrder, addItemsToOrder, updateKitchenStatus, getOrdersByTable
- Bills: generateBill, processPayment, getBills(restaurantId)
- Restaurant info: getRestaurantInfo(restaurantId) -> name, isActive, gstPercent

### Frontend
- Replace all Zustand persist stores with backend API calls
- CustomerMenu: on load, call getRestaurantInfo(rid) + getMenu(rid) + getOrdersByTable(rid, tid) -- all from backend
- Use React Query or simple useEffect + useState for async data fetching
- QR URL stays: `?r=RESTAURANT_ID&t=TABLE_ID`
- Keep all existing UI/UX identical, just wire to backend APIs
- Seller dashboard: two-code login using verifySeller backend call
- Restaurant login: verifyRestaurant + verifyPin backend calls
- Admin: all CRUD via backend
- Kitchen: poll backend for new orders every 5 seconds
- Billing: poll backend for orders/bills
