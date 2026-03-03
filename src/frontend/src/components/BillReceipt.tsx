/**
 * BillReceipt — A printable GST invoice component.
 *
 * Styled with inline styles so it renders correctly in print context.
 * Use the `printBill` utility from utils/billPrint.ts to trigger printing.
 */

import type { Bill, BillSettings } from "../types";

interface Props {
  bill: Bill;
  settings?: BillSettings;
  restaurantName: string;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function BillReceipt({ bill, settings, restaurantName }: Props) {
  const name = settings?.restaurantName?.trim() || restaurantName;
  const address = settings?.address ?? "";
  const phone = settings?.phone ?? "";
  const gstin = settings?.gstin ?? "";
  const gstPct = bill.gstPercent;
  const scPct = bill.serviceChargePercent ?? 0;
  const thankYou =
    settings?.thankYouMessage ?? "Thank You! Please Visit Again!";
  const billDate = formatDate(bill.createdAt);

  const mono: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: "12px",
    maxWidth: "80mm",
    margin: "0 auto",
    padding: "8px",
    color: "#000",
    background: "#fff",
  };

  const hr: React.CSSProperties = {
    borderTop: "1px dashed #000",
    margin: "6px 0",
  };

  const thStyle: React.CSSProperties = {
    padding: "2px 4px",
    textAlign: "left",
    fontSize: "11px",
    borderBottom: "1px dashed #000",
  };

  const tdLeft: React.CSSProperties = {
    padding: "2px 4px",
    textAlign: "left",
    fontSize: "11px",
  };

  const tdCenter: React.CSSProperties = {
    padding: "2px 4px",
    textAlign: "center",
    fontSize: "11px",
  };

  const tdRight: React.CSSProperties = {
    padding: "2px 4px",
    textAlign: "right",
    fontSize: "11px",
  };

  return (
    <div id="bill-receipt-print" style={mono}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            letterSpacing: "0.5px",
          }}
        >
          {name}
        </div>
        {address && (
          <div style={{ fontSize: "11px", marginTop: "2px" }}>{address}</div>
        )}
        {phone && <div style={{ fontSize: "11px" }}>Tel: {phone}</div>}
      </div>

      <div style={hr} />

      {/* Title */}
      <div
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "13px",
          marginBottom: "6px",
        }}
      >
        GST Invoice
      </div>
      {gstin && (
        <div style={{ fontSize: "11px", marginBottom: "4px" }}>
          GSTIN: {gstin}
        </div>
      )}

      {/* Bill meta */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          marginBottom: "4px",
        }}
      >
        <span>
          Bill No: <b>#{bill.billNumber}</b>
        </span>
        <span>Date: {billDate}</span>
        <span>{bill.tableNumber}</span>
      </div>

      <div style={hr} />

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Item</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Qty</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item) => (
            <tr key={item.menuItemId}>
              <td style={tdLeft}>{item.name}</td>
              <td style={tdCenter}>{item.quantity}</td>
              <td style={tdRight}>{item.price}</td>
              <td style={tdRight}>{item.price * item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={hr} />

      {/* Totals */}
      <table style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td colSpan={3} style={{ ...tdRight, textAlign: "right" }}>
              Subtotal
            </td>
            <td style={tdRight}>₹{bill.subtotal}</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ ...tdRight, textAlign: "right" }}>
              GST @ {gstPct}%
            </td>
            <td style={tdRight}>₹{bill.gstAmount}</td>
          </tr>
          {scPct > 0 && (
            <tr>
              <td colSpan={3} style={{ ...tdRight, textAlign: "right" }}>
                Service Charge ({scPct}%)
              </td>
              <td style={tdRight}>₹{bill.serviceChargeAmount ?? 0}</td>
            </tr>
          )}
          <tr>
            <td
              colSpan={3}
              style={{
                ...tdRight,
                textAlign: "right",
                fontWeight: "bold",
                fontSize: "13px",
                paddingTop: "4px",
                borderTop: "1px dashed #000",
              }}
            >
              Grand Total
            </td>
            <td
              style={{
                ...tdRight,
                fontWeight: "bold",
                fontSize: "13px",
                paddingTop: "4px",
                borderTop: "1px dashed #000",
              }}
            >
              ₹{bill.grandTotal}
            </td>
          </tr>
        </tbody>
      </table>

      {bill.isPaid && bill.paymentMethod && (
        <p style={{ margin: "4px 0", fontSize: "12px" }}>
          Paid By: {bill.paymentMethod}
        </p>
      )}

      <div style={hr} />

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "11px" }}>
        <div style={{ fontStyle: "italic" }}>{thankYou}</div>
        <div style={{ marginTop: "4px" }}>For {name}</div>
      </div>
    </div>
  );
}
