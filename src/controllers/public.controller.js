import { getDbPool } from "../utils/db.config.js";
import sql from "mssql";

export const brokerRevieweditemPrint = async (req, res) => {
  try {
    const pool = await getDbPool();
    const { order_id, items } = req.query;

    if (!order_id || !items) {
      return res.status(400).send("Missing params");
    }

    const parsedItems = JSON.parse(items);

    const stoneIds = parsedItems
      .filter((i) => i.item_type === "STONE")
      .map((i) => i.item_id);

    const toolIds = parsedItems
      .filter((i) => i.item_type === "TOOL")
      .map((i) => i.item_id);

    let allItems = [];

    if (stoneIds.length) {
      const stoneResult = await pool
        .request()
        .input("order_id", sql.Int, order_id)
        .query(`
        SELECT 
          o.order_no,
          o.created_at,
          b.broker_name,
          s.stone_name AS item_name,
          'STONE' AS item_type,
          s.*
        FROM orders o
        JOIN order_stones s ON s.order_id = o.id
        JOIN broker_master b ON b.id = s.broker_id
        WHERE o.id = @order_id
        AND s.id IN (${stoneIds.join(",")})
      `);

      allItems.push(...stoneResult.recordset);
    }

    if (toolIds.length) {
      const toolResult = await pool
        .request()
        .input("order_id", sql.Int, order_id)
        .query(`
        SELECT 
          o.order_no,
          o.created_at,
          b.broker_name,
          tm.tool_name AS item_name,
          'TOOL' AS item_type,
          t.*
        FROM orders o
        JOIN order_tools t ON t.order_id = o.id
        JOIN tool_master tm ON tm.id = t.tool_id
        JOIN broker_master b ON b.id = t.manufacturer_id
        WHERE o.id = @order_id
        AND t.id IN (${toolIds.join(",")})
      `);

      allItems.push(...toolResult.recordset);
    }

    if (!allItems.length) {
      return res.status(404).send("Items not found");
    }

    const firstItem = allItems[0];

    let rowsHtml = "";
    let grandTotal = 0;

    allItems.forEach((item, index) => {
      const isStone = item.item_type === "STONE";
      const amount =
        Number(item.reviewed_final_price || 0) * Number(item.quantity || 0);

      grandTotal += amount;

      rowsHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.item_name || "-"}</td>

          ${
            isStone
              ? `
            <td>${item.shape || "-"}</td>
            <td>${item.size || "-"}</td>
            <td>${item.color || "-"}</td>
            <td>${item.cut || "-"}</td>
            <td>${item.min_height || "-"}</td>
            <td>${item.max_height || "-"}</td>
          `
              : ""
          }

          <td class="text-right">${item.quantity || 0}</td>
          <td class="text-right">₹${Number(
            item.reviewed_base_price || 0
          ).toLocaleString("en-IN")}</td>
          <td class="text-right">${Number(
            item.reviewed_discount || 0
          ).toLocaleString("en-IN")} %</td>
          <td class="text-right">₹${Number(
            item.reviewed_final_price || 0
          ).toLocaleString("en-IN")}</td>
          <td class="text-right">₹${amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}</td>
        </tr>
      `;
    });

    const isStone = allItems.some((i) => i.item_type === "STONE");

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Bill - ${firstItem.order_no || "N/A"} | Lord Krishna International</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>
        @page { size: A4; margin: 10mm; } /* Reduced margin slightly to fit more columns */
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            font-size: 11px; /* Slightly smaller base font */
            color: #222;
            margin: 0;
            padding: 0;
            line-height: 1.4;
        }

        /* Force browser to print background colors */
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }

        .container { padding: 10px; }

        /* Header Alignment */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #333;
            padding-bottom: 12px;
            margin-bottom: 15px;
        }

        .company h1 { 
            margin: 0 0 5px 0; 
            font-size: 20px; 
            color: #000;
            text-transform: uppercase;
        }
        
        .company p { margin: 2px 0; font-size: 10px; color: #555; max-width: 350px; }

        .bill-title { text-align: right; }
        .bill-title h2 { margin: 0; font-size: 22px; color: #333; letter-spacing: 1px; }
        .bill-title p { margin: 5px 0 0; font-size: 12px; }

        /* Meta Information Grid */
        .meta {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
            background: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
        }

        .meta div { font-size: 10px; }
        .meta div span { font-weight: 700; color: #333; margin-right: 5px; }

        /* Table Alignment & Spacing */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            table-layout: auto;
        }

        th, td {
            padding: 8px 4px; /* Tighter padding for horizontal space */
            border-bottom: 1px solid #eee;
            text-align: left;
            font-size: 10px;
        }

        th {
            background: #eaeaea;
            color: #333;
            text-transform: uppercase;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 0.5px;
            white-space: nowrap; /* CRITICAL: Prevents headers from breaking into multiple lines */
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }

        /* Style for the Total Row */
        .total-row td {
            font-weight: 800;
            font-size: 12px;
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            padding: 10px 4px;
        }

        /* Signature Section */
        .footer {
            margin-top: 50px;
            display: flex;
            justify-content: flex-end;
        }

        .signature { text-align: center; }
        .sign-line {
            display: inline-block;
            width: 200px;
            border-top: 1.5px solid #000;
            padding-top: 8px;
            font-weight: 600;
            font-size: 11px;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <div class="company">
                <h1>LORD KRISHNA INTERNATIONAL</h1>
                <p>H-236 RIICO Industrial area, Mansarover, Jaipur, Rajasthan - 302020</p>
                <p><strong>Phone:</strong> +91-9829950454 | <strong>Email:</strong> info@lordkrishnainternational.com</p>
            </div>
            <div class="bill-title">
                <h2>ESTIMATION</h2>
                <p><strong>Order No:</strong> ${firstItem.order_no || "N/A"}</p>
            </div>
        </div>

        <div class="meta">
            <div><span>Vendor Partner:</span> ${firstItem.broker_name || "N/A"}</div>
            <div class="text-center"><span>Date:</span> ${new Date().toLocaleDateString("en-GB")}</div>
            <div class="text-right"><span>Total Items:</span> ${allItems.length}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 20px;">#</th>
                    <th>${isStone ? 'Stone Name' : 'Tool Name'}</th>
                    ${isStone ? `
                        <th>Shape</th>
                        <th>Size</th>
                        <th>Color</th>
                        <th>Cut</th>
                        <th class="text-right">Min. H</th>
                        <th class="text-right">Max. H</th>
                    ` : ""}
                    <th class="text-right">Qty</th>
                    <th class="text-right">Base Price</th>
                    <th class="text-right">Disc</th>
                    <th class="text-right">Rate per Carat/Wt</th>
                    <th class="text-right">Net Price</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
                <tr class="total-row">
                    <td colspan="${isStone ? 12 : 6}" class="text-right">Total Estimation</td>
                    <td class="text-right">
                        ₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <div class="signature">
                <br><br><br>
                <div class="sign-line">Authorized Signatory</div>
            </div>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(() => { window.print(); }, 700);
        }
    </script>
</body>
</html>
`);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get data",
    });
  }
};

