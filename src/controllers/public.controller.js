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
  o.order_no, o.created_at,
  b.broker_name,
  t.tool_name AS item_name,
  t.guage_size, t.quantity,
  t.reviewed_final_price, t.*
FROM orders o
JOIN order_tools t ON t.order_id = o.id
JOIN broker_master b ON b.id = t.broker_id
WHERE o.id = @order_id 
  AND t.id = @item_id

    `;
    }

    const result = await pool.request()
      .input("order_id", sql.Int, order_id)
      .input("item_id", sql.Int, item_id)
      .query(query);

    const item = result.recordset[0];
    if (!item) return res.status(404).send("Item not found");

    res.send(`
<!DOCTYPE html>
<html>
  <head>
    <title>Bill - ${item.order_no} | Lord Krishna International</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { size: A4; margin: 15mm; }
      body {
        font-family: Inter, Arial, sans-serif;
        font-size: 12px;
        color: #222;
        margin: 0;
        padding: 0;
      }
      .container {
        padding: 20px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .company h1 {
        margin: 0;
        font-size: 20px;
        letter-spacing: 1px;
      }
      .company p {
        margin: 2px 0;
        font-size: 11px;
        color: #444;
      }
      .bill-title {
        text-align: right;
      }
      .bill-title h2 {
        margin: 0;
        font-size: 18px;
      }
      .meta {
        margin: 15px 0;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px 20px;
        font-size: 12px;
      }
      .meta div span {
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      th, td {
        padding: 8px;
        border-bottom: 1px solid #ccc;
        text-align: left;
      }
      th {
        background: #f4f4f4;
        text-transform: uppercase;
        font-size: 11px;
      }
      .text-right { text-align: right; }
      .total-row td {
        font-weight: 700;
        font-size: 13px;
        border-top: 2px solid #000;
      }
      .footer {
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
        font-size: 11px;
      }
      .signature {
        text-align: right;
        margin-top: 50px;
      }
      .sign-line {
        display: inline-block;
        width: 200px;
        border-top: 1px solid #000;
        padding-top: 5px;
        font-weight: 600;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; }
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
          <p><strong>Order No:</strong> ${item.order_no}</p>
        </div>
      </div>

      <div class="meta">
        <div><span>Broker:</span> ${item.broker_name}</div>
        <div><span>Date:</span> ${new Date(item.reviewed_at).toLocaleDateString("en-GB")}</div>
        <div><span>Item Name:</span> ${item.item_name}</div>
        <div><span>Quantity:</span> ${item.quantity}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item Name</th>
            ${item_type === "STONE" ? `
  <th>Shape</th>
  <th>Size</th>
  <th>Color</th>
  <th>Family</th>
  <th>Cut</th>
  <th>Min. Height</th>
  <th>Max. Height</th>
` : ``}
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
            <th class="text-right">Comments</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>${item.item_name}</td>
            ${item_type === "STONE" ? `
  <td>${item.shape}</td>
  <td>${item.size}</td>
  <td>${item.color}</td>
  <td>${item.family}</td>
  <td>${item.cut}</td>
  <td>${item.min_height}</td>
  <td>${item.max_height}</td>
` : ``}
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">₹${Number(item.reviewed_final_price).toLocaleString("en-IN")}</td>
            <td class="text-right">₹${(Number(item.reviewed_final_price) * Number(item.quantity)).toLocaleString("en-IN", {minimumFractionDigits:2})}</td>
            <td class="text-right">${(item.comments)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="12" class="text-right">Grand Total</td>
            <td class="text-right">₹${(Number(item.reviewed_final_price) * Number(item.quantity)).toLocaleString("en-IN", {minimumFractionDigits:2})}</td>
          </tr>
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
        setTimeout(() => {
          window.print();
        }, 500);
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

