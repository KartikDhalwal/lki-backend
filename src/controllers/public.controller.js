import { getDbPool } from "../utils/db.config.js";
import sql from "mssql";

export const brokerRevieweditemPrint = async (req, res) => {
  try {
    const pool = await getDbPool();
    const { order_id, item_id, item_type } = req.query;

    if (!order_id || !item_id || !item_type) {
      return res.status(400).send("Missing params");
    }

    let query = "";
    if (item_type === "STONE") {
      query = `
      SELECT 
  o.order_no, o.created_at,
  b.broker_name,
  s.stone_name AS item_name,s.*
FROM orders o
JOIN order_stones s ON s.order_id = o.id
JOIN broker_master b ON b.id = s.broker_id
WHERE o.id = @order_id 
  AND s.id = @item_id

    `;
    } else {
      query = `
SELECT 
  o.order_no, 
  o.created_at,
  b.broker_name,
  tm.tool_name AS item_name,
  t.*
FROM orders o
JOIN order_tools t ON t.order_id = o.id
JOIN tool_master tm ON tm.id = t.tool_id
JOIN broker_master b ON b.id = t.manufacturer_id
WHERE o.id = @order_id 
  AND t.id = @item_id;

    `;
    }

    const result = await pool.request()
      .input("order_id", sql.Int, order_id)
      .input("item_id", sql.Int, item_id)
      .query(query);

    const item = result.recordset[0];
    console.log(item,'item')
    if (!item) return res.status(404).send("Item not found");

  // Dynamic colspan calculation
const isStone = item_type === "STONE";
// Columns before 'Amount': #, Item Name, (Stone Cols), Qty, Rate
const baseColsBeforeAmount = 2; // # and Item Name
const stoneColsCount = isStone ? 7 : 0; 
const pricingColsBeforeAmount = 2; // Qty and Rate
const totalColSpan = baseColsBeforeAmount + stoneColsCount + pricingColsBeforeAmount;

res.send(`
<!DOCTYPE html>
<html>
  <head>
    <title>Bill - ${item.order_no || 'N/A'} | Lord Krishna International</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { size: A4; margin: 10mm; }
      body {
        font-family: 'Inter', Arial, sans-serif;
        font-size: 12px;
        color: #222;
        margin: 0;
        padding: 0;
      }
      .container { padding: 10px; }
      .header {
        display: flex;
        justify-content: space-between;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .company h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
      .company p { margin: 2px 0; font-size: 11px; color: #444; }
      .bill-title { text-align: right; }
      .bill-title h2 { margin: 0; font-size: 18px; }
      
      .meta {
        margin: 15px 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 40px;
      }
      .meta div span { font-weight: 600; margin-right: 5px; }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
        /* Force table to respect container width */
        table-layout: fixed; 
      }
      th, td {
        padding: 6px 4px; /* Reduced padding */
        border-bottom: 1px solid #ccc;
        text-align: left;
        font-size: 10px; /* Smaller font for stone data */
        word-wrap: break-word;
      }
      th {
        background: #f4f4f4;
        text-transform: uppercase;
        font-weight: bold;
        color: #333;
      }
      
      /* Specific column widths to prevent squishing */
      .col-id { width: 25px; }
      .col-item { width: 80px; }
      .col-stone { width: 50px; }
      .col-num { width: 45px; text-align: right; }
      .col-amount { width: 70px; text-align: right; }
      .col-comments { width: 80px; }

      .text-right { text-align: right; }
      .total-row td {
        font-weight: 700;
        font-size: 12px;
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        padding: 10px 4px;
      }

      .footer {
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
        font-size: 11px;
      }
      .signature { text-align: right; margin-top: 40px; }
      .sign-line {
        display: inline-block;
        width: 200px;
        border-top: 1px solid #000;
        padding-top: 5px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="company">
          <h1>LORD KRISHNA INTERNATIONAL</h1>
          <p>Johari Bazaar, Jaipur, Rajasthan - 302003</p>
          <p>Phone: +91-XXXXXXXXXX</p>
          <p>Email: info@lordkrishnainternational.com</p>
        </div>
        <div class="bill-title">
          <h2>BILL</h2>
          <p><strong>Order No:</strong> ${item.order_no || 'N/A'}</p>
        </div>
      </div>

      <div class="meta">
        <div><span>Broker:</span> ${item.broker_name || 'KD'}</div>
        <div><span>Date:</span> ${item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString("en-GB") : '08/03/2026'}</div>
        <div><span>Item Name:</span> ${item.item_name || 'N/A'}</div>
        <div><span>Total Quantity:</span> ${item.quantity || 0}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="col-id">#</th>
            <th class="col-item">Item Name</th>
            ${isStone ? `
              <th class="col-stone">Shape</th>
              <th class="col-stone">Size</th>
              <th class="col-stone">Color</th>
              <th class="col-stone">Family</th>
              <th class="col-stone">Cut</th>
              <th class="col-stone">Min.H</th>
              <th class="col-stone">Max.H</th>
            ` : ''}
            <th class="col-num">Qty</th>
            <th class="col-num">Rate</th>
            <th class="col-amount">Amount</th>
            <th class="col-comments">Comments</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>${item.item_name || '-'}</td>
            ${isStone ? `
              <td>${item.shape || '-'}</td>
              <td>${item.size || '-'}</td>
              <td>${item.color || '-'}</td>
              <td>${item.family || '-'}</td>
              <td>${item.cut || '-'}</td>
              <td>${item.min_height || '-'}</td>
              <td>${item.max_height || '-'}</td>
            ` : ''}
            <td class="text-right">${item.quantity || 0}</td>
            <td class="text-right">₹${Number(item.reviewed_final_price || 0).toLocaleString("en-IN")}</td>
            <td class="text-right">₹${(Number(item.reviewed_final_price || 0) * Number(item.quantity || 0)).toLocaleString("en-IN", {minimumFractionDigits: 2})}</td>
            <td>${item.comments || '-'}</td>
          </tr>
          <tr class="total-row">
            <td colspan="${totalColSpan}" class="text-right">Grand Total</td>
            <td class="text-right">₹${(Number(item.reviewed_final_price || 0) * Number(item.quantity || 0)).toLocaleString("en-IN", {minimumFractionDigits: 2})}</td>
            <td></td> </tr>
        </tbody>
      </table>

      <div class="footer">
        <div>
          <strong>Terms & Conditions</strong>
          <p>1. Goods once sold will not be taken back.</p>
          <p>2. Subject to Jaipur Jurisdiction.</p>
        </div>
        <div class="signature">
          <div class="sign-line">Authorized Signatory</div>
        </div>
      </div>
    </div>

    <script>
      window.onload = function() {
        setTimeout(() => { window.print(); }, 500);
      };
    </script>
  </body>
</html>
`);

  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get data",
    });
  }
};

