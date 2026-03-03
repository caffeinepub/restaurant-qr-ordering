/**
 * billPrint.ts — Generates a printable GST receipt.
 *
 * Uses browser's window.print() with a targeted print stylesheet that hides
 * everything except the receipt container.
 */

import type { Bill, BillSettings } from "../types";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function buildReceiptHTML(
  bill: Bill,
  settings: BillSettings | undefined,
  restaurantName: string,
): string {
  const name = settings?.restaurantName?.trim() || restaurantName;
  const address = settings?.address ?? "";
  const phone = settings?.phone ?? "";
  const gstin = settings?.gstin ?? "";
  const gstPct = bill.gstPercent;
  const scPct = bill.serviceChargePercent ?? 0;
  const thankYou =
    settings?.thankYouMessage ?? "Thank You! Please Visit Again!";
  const billDate = formatDate(bill.createdAt);

  const itemRows = bill.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:2px 4px;text-align:left;">${item.name}</td>
          <td style="padding:2px 4px;text-align:center;">${item.quantity}</td>
          <td style="padding:2px 4px;text-align:right;">${item.price}</td>
          <td style="padding:2px 4px;text-align:right;">${item.price * item.quantity}</td>
        </tr>`,
    )
    .join("");

  const scRow =
    scPct > 0
      ? `<tr>
          <td colspan="3" style="padding:2px 4px;text-align:right;font-size:11px;">Service Charge (${scPct}%)</td>
          <td style="padding:2px 4px;text-align:right;font-size:11px;">₹${bill.serviceChargeAmount ?? 0}</td>
        </tr>`
      : "";

  const paidRow =
    bill.isPaid && bill.paymentMethod
      ? `<p style="margin:4px 0;font-size:12px;">Paid By: ${bill.paymentMethod}</p>`
      : "";

  return `
    <div style="font-family:monospace;font-size:12px;max-width:80mm;margin:0 auto;padding:8px;color:#000;background:#fff;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:16px;font-weight:bold;letter-spacing:0.5px;">${name}</div>
        ${address ? `<div style="font-size:11px;margin-top:2px;">${address}</div>` : ""}
        ${phone ? `<div style="font-size:11px;">Tel: ${phone}</div>` : ""}
      </div>
      <div style="border-top:1px dashed #000;margin:6px 0;"></div>
      <div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:6px;">GST Invoice</div>
      ${gstin ? `<div style="font-size:11px;margin-bottom:4px;">GSTIN: ${gstin}</div>` : ""}
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
        <span>Bill No: <b>#${bill.billNumber}</b></span>
        <span>Date: ${billDate}</span>
        <span>${bill.tableNumber}</span>
      </div>
      <div style="border-top:1px dashed #000;margin:6px 0;"></div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="border-bottom:1px dashed #000;">
            <th style="padding:2px 4px;text-align:left;">Item</th>
            <th style="padding:2px 4px;text-align:center;">Qty</th>
            <th style="padding:2px 4px;text-align:right;">Rate</th>
            <th style="padding:2px 4px;text-align:right;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      <div style="border-top:1px dashed #000;margin:6px 0;"></div>
      <table style="width:100%;font-size:11px;">
        <tr>
          <td colspan="3" style="padding:2px 4px;text-align:right;">Subtotal</td>
          <td style="padding:2px 4px;text-align:right;">₹${bill.subtotal}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:2px 4px;text-align:right;">GST @ ${gstPct}%</td>
          <td style="padding:2px 4px;text-align:right;">₹${bill.gstAmount}</td>
        </tr>
        ${scRow}
        <tr style="font-weight:bold;font-size:13px;border-top:1px dashed #000;">
          <td colspan="3" style="padding:4px 4px;text-align:right;">Grand Total</td>
          <td style="padding:4px 4px;text-align:right;">₹${bill.grandTotal}</td>
        </tr>
      </table>
      ${paidRow}
      <div style="border-top:1px dashed #000;margin:8px 0;"></div>
      <div style="text-align:center;font-size:11px;">
        <div style="font-style:italic;">${thankYou}</div>
        <div style="margin-top:4px;">For ${name}</div>
      </div>
    </div>
  `;
}

/**
 * Opens a print dialog with a formatted GST receipt.
 * Uses a hidden container injected into the body; the print stylesheet
 * in index.css hides everything else.
 */
export function printBill(
  bill: Bill,
  settings: BillSettings | undefined,
  restaurantName: string,
): void {
  const CONTAINER_ID = "bill-receipt-print-container";

  // Get or create the hidden container
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  }

  // Inject the receipt HTML
  container.innerHTML = buildReceiptHTML(bill, settings, restaurantName);

  // Inject a <style> tag that hides everything else during print
  const STYLE_ID = "bill-print-style";
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
    @media print {
      body > *:not(#${CONTAINER_ID}) { display: none !important; }
      #${CONTAINER_ID} { display: block !important; }
    }
    #${CONTAINER_ID} { display: none; }
  `;

  // Show the container temporarily so print preview can see it
  container.style.display = "block";

  window.print();

  // Clean up after print dialog closes
  setTimeout(() => {
    if (container) {
      container.style.display = "none";
      container.innerHTML = "";
    }
  }, 1000);
}
