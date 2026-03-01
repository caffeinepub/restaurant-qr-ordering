# Restaurant QR Ordering

## Current State
The app is a fully client-side React/Zustand app where all data (restaurants, menus, tables, orders, bills) is stored in browser localStorage. This means:
- Customer's phone (QR scan) writes orders to THEIR localStorage
- Kitchen tablet reads from ITS OWN localStorage
- These are different devices — data never syncs between them
- BroadcastChannel/storage events only work within the same browser on the same device
- Result: orders placed by customers are NEVER visible on the kitchen or billing dashboards

The seller dashboard, restaurant login, admin panel, kitchen dashboard, and billing counter are all functional but broken by this fundamental cross-device data isolation.

## Requested Changes (Diff)

### Add
- ICP Motoko backend to serve as the shared, real-time data store for all restaurants
- Backend APIs: restaurant management (CRUD), menu items (CRUD per restaurant), tables (CRUD per restaurant), orders (place, update status, add items), bills (generate, process payment)
- All cross-device data flows through the backend canister — customer phone, kitchen tablet, billing counter, and admin panel all read/write the same data
- Frontend polling (every 3-5 seconds) on Kitchen and Billing dashboards to fetch fresh orders from the backend
- QR codes use ?r=restaurantId&t=tableId (short URL) since menu now loads from backend, not baked into QR

### Modify
- restaurantDataStore.ts: replace localStorage-only Zustand store with backend API calls for orders, tables, and menu items
- sellerStore.ts: restaurant registry (name, owner, phone, subscription, active status, PINs) stays in localStorage on the seller's device — this is intentional (seller manages from one device)
- AdminPanel.tsx: menu and table CRUD now calls backend APIs; QR codes use short ?r=&t= format
- KitchenDashboard.tsx: orders fetched from backend with auto-refresh polling every 3 seconds
- BillingCounter.tsx: orders and bills fetched from backend with polling
- CustomerMenu.tsx: menu items loaded from backend by restaurantId; order placement writes to backend
- QR payload no longer embeds full menu — just restaurantId + tableId

### Remove
- All localStorage-based order/menu/table/bill storage from restaurantDataStore.ts
- Menu snapshot saving/loading (saveMenuSnapshot, loadMenuSnapshot) — no longer needed
- CompactMenuPayload / encodeCompactMenu / decodeCompactMenu — no longer needed
- ?d=BASE64 QR format — replaced with simple ?r=&t= format

## Implementation Plan
1. Generate Motoko backend with:
   - Restaurant data: menuItems[], tables[], orders[], bills[] keyed by restaurantId (text)
   - No authentication — all calls are open (PIN auth is frontend-only)
   - placeOrder(restaurantId, tableId, tableNumber, items) -> Order
   - addItemsToOrder(restaurantId, orderId, items) -> ()
   - updateOrderKitchenStatus(restaurantId, orderId, status) -> ()
   - generateBill(restaurantId, orderId) -> Bill
   - processPayment(restaurantId, billId, method) -> ()
   - getOrders(restaurantId) -> [Order]
   - getBills(restaurantId) -> [Bill]
   - addMenuItem(restaurantId, item) -> MenuItem
   - updateMenuItem(restaurantId, id, updates) -> ()
   - deleteMenuItem(restaurantId, id) -> ()
   - getMenuItems(restaurantId) -> [MenuItem]
   - addTable(restaurantId, tableNumber) -> Table
   - deleteTable(restaurantId, id) -> ()
   - getTables(restaurantId) -> [Table]
   - resetTableSession(restaurantId, tableId) -> ()
2. Update restaurantDataStore.ts to use backend APIs (async) with local cache for fast UI
3. Update all pages (AdminPanel, KitchenDashboard, BillingCounter, CustomerMenu) to use the new async data flow
4. Kitchen and Billing dashboards poll backend every 3 seconds for fresh orders
5. QR codes encode only restaurantId + tableId (?r=RID&t=TID)
6. CustomerMenu loads menu from backend on mount, places orders via backend
