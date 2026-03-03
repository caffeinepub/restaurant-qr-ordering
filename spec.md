# Restaurant QR Ordering

## Current State
- Multi-restaurant system with Seller Dashboard, Admin Panel, Kitchen Dashboard, Billing Counter, and Customer Menu
- Bills are generated in the Billing Counter only; customer has no way to request a bill from their phone
- Bill format is a simple modal with items/totals — no printable/downloadable format
- Billing Counter dashboard shows occupied tables and bills, but the "pending" and "paid" tabs show no data because orders from customer phones (synced via ICP canister) are not merged into the bills list
- Admin Panel has GST Settings section; no bill detail settings (restaurant address, GSTIN, phone, thank-you message)
- Bill numbers are not generated; no sequential bill numbering
- No PDF download of bills

## Requested Changes (Diff)

### Add
- `BillSettings` type in types.ts: restaurantName, address, phone, gstin, gstPercent, serviceChargePercent, thankYouMessage, billNumberPrefix, currentBillNumber, lastResetDate
- `billSettings` field in RestaurantStore with default values; persist alongside restaurant data
- `updateBillSettings`, `getNextBillNumber` functions in RestaurantStore
- Bill Settings tab in Admin Panel ("Bill Settings") — editable form for all BillSettings fields
- `billNumber` field added to Bill type (sequential, resets daily: 1001, 1002...)
- `generateBill` updated to assign the next bill number from store
- "Request Bill" button in CustomerMenu confirmation view — when tapped, it signals billing (writes a `billRequested` flag to the order in localStorage/canister); visible after order is placed
- PDF bill download in BillingCounter — a printable bill component matching the image format exactly: restaurant name centered, address, phone, "GST Invoice" header, GSTIN, bill no/date/table row, itemized table (Item/Qty/Rate/Amount), Subtotal, GST@%, Grand Total, Paid By, thank-you footer
- PDF download button on both the payment modal (after payment) and in the paid bills list
- Billing dashboard fix: BillingCounter now merges backendOrders into the tables/pending/paid tabs — currently `backendOrders` is fetched but never merged into `orders` used for table lookups. Fix the `handleGenerateBill` and table card logic to use the merged `orders` array (already computed as `const orders = mergeOrders(...)`) for finding active table orders

### Modify
- `Bill` type: add `billNumber: number` field
- `AppState` type: add `billSettings: BillSettings` field
- `generateBill` in RestaurantStore: read `billSettings`, compute next sequential bill number (reset if new day), assign to bill
- Admin Panel section nav: add "Bill Settings" tab
- CustomerMenu confirmation screen: add "Request Bill" button that sets `billRequested: true` on the order and syncs to backend
- BillingCounter table cards: use already-merged `orders` for `order` lookup (this is already done via `mergeOrders` — the bug is that `table.currentOrderId` is set from localStorage but backend orders use the same ID, so the merge should work; root cause is that backend orders don't update `table.currentOrderId` in local store — fix by also checking `backendOrders` for orders matching `table.id`)
- BillingCounter pending/paid tabs: these already read from `bills` in localStorage — the issue is that `generateBill` is never called for backend-only orders (customer scanned QR → order on backend → billing counter never called generateBill for that table). Fix: when backend orders arrive that match an occupied table with no existing bill, auto-generate the bill or show the Generate Bill button correctly

### Remove
- Nothing removed

## Implementation Plan
1. Add `BillSettings` interface to types.ts; add `billNumber` to Bill
2. Update RestaurantStore: add billSettings state, updateBillSettings action, getNextBillNumber logic, update generateBill to use bill number
3. Add "Bill Settings" section to Admin Panel with editable form fields
4. Add `BillReceipt` printable component — matches the GST Invoice image exactly
5. Add PDF download (window.print with print-only CSS) to BillingCounter payment modal and paid bills list
6. Fix Billing dashboard: when backend orders arrive, ensure table cards show "Generate Bill" correctly by looking up orders by tableId in backendOrders too
7. Add "Request Bill" button to CustomerMenu confirmation view — sets billRequested flag on order and syncs to backend
8. Show bill request indicator in BillingCounter table cards ("Bill Requested" badge)
