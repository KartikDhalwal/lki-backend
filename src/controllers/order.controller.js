import sql from "mssql";
import { getDbPool } from "../utils/db.config.js";
export const postOrderController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      instructions,
      deliveryDate,
      status,
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

    /* ---- Generate Order No ---- */
    const orderNo = `ORD-${Date.now()}`;

    await transaction.begin();

    /* ---- Insert Order Header ---- */
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

    /* ---- Helper: Insert Items ---- */
    const insertItem = async (item, type) => {
      await transaction
        .request()
        .input("order_id", sql.Int, orderId)
        .input("item_type", sql.NVarChar, type)
        .input("item_id", sql.Int, item.stone.value)
        .input("item_name", sql.NVarChar, item.stone.label)
        .input("broker_id", sql.Int, item.broker.value)
        .input("broker_name", sql.NVarChar, item.broker.label)
        .input("quantity", sql.Decimal(10, 2), item.quantity)
        .input("quantity_type", sql.NVarChar, item.quantityType)
        .input("color", sql.NVarChar, item.color || null)
        .input("size", sql.NVarChar, item.size || null)
        .input("shape", sql.NVarChar, item.shape || null)
        .query(`
          INSERT INTO order_items (
            order_id,
            item_type,
            item_id,
            item_name,
            broker_id,
            broker_name,
            quantity,
            quantity_type,
            color,
            size,
            shape
          )
          VALUES (
            @order_id,
            @item_type,
            @item_id,
            @item_name,
            @broker_id,
            @broker_name,
            @quantity,
            @quantity_type,
            @color,
            @size,
            @shape
          )
        `);
    };

    /* ---- Insert Stone Items ---- */
    for (const stone of stones) {
      await insertItem(stone, "STONE");
    }

    /* ---- Insert Tool Items ---- */
    for (const tool of tools) {
      await insertItem(tool, "TOOL");
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

    /* ---------- DATA QUERY ---------- */
    const dataResult = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT
          o.id,
          o.order_no AS orderId,
          o.status,
          o.created_at AS orderCreated,
          o.delivery_date AS expected,
          SUM(oi.quantity) AS totalQuantity,
          MAX(oi.item_type) AS type,
          MAX(oi.item_name) AS stoneId,
          MAX(oi.broker_name) AS broker
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE
          (@search IS NULL
            OR o.order_no LIKE '%' + @search + '%'
            OR oi.item_name LIKE '%' + @search + '%'
            OR oi.broker_name LIKE '%' + @search + '%')
        GROUP BY o.id, o.order_no, o.status, o.created_at, o.delivery_date
        ORDER BY o.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    /* ---------- COUNT QUERY ---------- */
    const countResult = await pool
      .request()
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT COUNT(DISTINCT o.id) AS total
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE
          (@search IS NULL
            OR o.order_no LIKE '%' + @search + '%'
            OR oi.item_name LIKE '%' + @search + '%'
            OR oi.broker_name LIKE '%' + @search + '%')
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
