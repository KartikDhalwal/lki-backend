import sql from "mssql";
import { getDbPool } from "../utils/db.config.js";
export const postOrderController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      status,
      deliveryDate,
      instructions,
      stones = [],
      tools = [],
    } = req.body;

    if (!stones.length && !tools.length) {
      return res.status(400).json({
        success: false,
        message: "At least one stone or tool item is required",
      });
    }

    /* ---- Calculate Total Quantity ---- */
    const totalQuantity = [...stones, ...tools].reduce(
      (sum, i) => sum + Number(i.quantity || 0),
      0
    );

    const orderNo = `ORD-${Date.now()}`;

    await transaction.begin();

    /* ---------- ORDER HEADER ---------- */
    const orderResult = await transaction
      .request()
      .input("order_no", sql.NVarChar, orderNo)
      .input("status", sql.NVarChar, status)
      .input("total_quantity", sql.Int, totalQuantity)
      .input("instructions", sql.NVarChar, instructions || null)
      .input("delivery_date", sql.Date, deliveryDate || null)
      .query(`
        INSERT INTO orders (
          order_no,
          status,
          total_quantity,
          instructions,
          delivery_date
        )
        OUTPUT INSERTED.id
        VALUES (
          @order_no,
          @status,
          @total_quantity,
          @instructions,
          @delivery_date
        )
      `);

    const orderId = orderResult.recordset[0].id;

    /* ---------- STONES ---------- */
    for (const stone of stones) {
      await transaction
        .request()
        .input("order_id", sql.Int, orderId)
        .input("stone_id", sql.Int, stone.stoneId)
        .input("broker_id", sql.Int, stone.brokerId)
        .input("quantity", sql.Int, stone.quantity)
        .input("quantity_type", sql.NVarChar, stone.quantityType)
        .input("size", sql.NVarChar, stone.size || null)
        .input("shape", sql.NVarChar, stone.shape || null)
        .input("color", sql.NVarChar, stone.color || null)
        .input("min_height", sql.Int, stone.minHeight || null)
        .input("max_height", sql.Int, stone.maxHeight || null)
        .query(`
          INSERT INTO order_stones (
            order_id,
            stone_id,
            broker_id,
            quantity,
            quantity_type,
            size,
            shape,
            color,
            min_height,
            max_height
          )
          VALUES (
            @order_id,
            @stone_id,
            @broker_id,
            @quantity,
            @quantity_type,
            @size,
            @shape,
            @color,
            @min_height,
            @max_height
          )
        `);
    }

    /* ---------- TOOLS ---------- */
    for (const tool of tools) {
      await transaction
        .request()
        .input("order_id", sql.Int, orderId)
        .input("tool_id", sql.Int, tool.toolId)
        .input("manufacturer_id", sql.Int, tool.manufacturerId)
        .input("quantity", sql.Int, tool.quantity)
        .input("mou", sql.NVarChar, tool.mou)
        .query(`
          INSERT INTO order_tools (
            order_id,
            tool_id,
            manufacturer_id,
            quantity,
            mou
          )
          VALUES (
            @order_id,
            @tool_id,
            @manufacturer_id,
            @quantity,
            @mou
          )
        `);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderNo,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};


export const listOrdersController = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const search = req.query.search || null;
    const offset = (page - 1) * limit;

    const pool = await getDbPool();

    /* ================= DATA QUERY ================= */
    const dataResult = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .input("search", sql.NVarChar, search)
      .query(`
        WITH order_data AS (
          SELECT
            o.id,
            o.order_no,
            o.status,
            o.created_at,
            o.delivery_date,

            /* quantities */
            SUM(os.quantity) AS stone_qty,
            SUM(ot.quantity) AS tool_qty,

            /* references */
            MAX(os.stone_id) AS stone_id,
            MAX(os.broker_id) AS broker_id,
            MAX(bm.broker_name) AS broker_name,
            MAX(ot.tool_id) AS tool_id

          FROM orders o
          LEFT JOIN order_stones os 
            ON os.order_id = o.id
          LEFT JOIN broker_master bm 
            ON bm.id = os.broker_id
          LEFT JOIN order_tools ot 
            ON ot.order_id = o.id

          WHERE
            (@search IS NULL OR o.order_no LIKE '%' + @search + '%')

          GROUP BY
            o.id, o.order_no, o.status, o.created_at, o.delivery_date
        )
        SELECT
          id,
          order_no AS orderId,
          status,
          created_at AS orderCreated,
          delivery_date AS expected,

          ISNULL(stone_qty, 0) + ISNULL(tool_qty, 0) AS quantity,

          CASE
            WHEN stone_qty IS NOT NULL AND tool_qty IS NOT NULL THEN 'MIXED'
            WHEN stone_qty IS NOT NULL THEN 'STONE'
            WHEN tool_qty IS NOT NULL THEN 'TOOL'
            ELSE 'UNKNOWN'
          END AS type,

          /* display reference */
          CASE
            WHEN stone_id IS NOT NULL THEN CAST(stone_id AS NVARCHAR)
            WHEN tool_id IS NOT NULL THEN CAST(tool_id AS NVARCHAR)
            ELSE '-'
          END AS stoneId,

          broker_name AS broker

        FROM order_data
        ORDER BY orderCreated DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    /* ================= COUNT QUERY ================= */
    const countResult = await pool
      .request()
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT COUNT(*) AS total
        FROM orders o
        WHERE
          (@search IS NULL OR o.order_no LIKE '%' + @search + '%')
      `);

    const totalItems = countResult.recordset[0].total;

    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    console.error("Order List Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};


