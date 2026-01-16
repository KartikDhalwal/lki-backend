import sql from "mssql";
import { getDbPool } from "../utils/db.config.js";
export const postOrderController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      status,
      orderHeader = {},
      stones = [],
      tools = [],
    } = req.body;

    if (!stones.length && !tools.length) {
      return res.status(400).json({
        success: false,
        message: "At least one stone or tool item is required",
      });
    }

    const totalQuantity = [...stones, ...tools].reduce(
      (sum, i) => sum + Number(i.quantity || 0),
      0
    );

    const orderNo = `ORD-${Date.now()}`;

    await transaction.begin();

    const orderResult = await transaction
      .request()
      .input("order_no", sql.NVarChar, orderNo)
      .input("status", sql.NVarChar, status)
      .input("category", sql.NVarChar, orderHeader.category || null)
      .input("broker_id", sql.Int, orderHeader.brokerId || null)
      .input("phone_number", sql.NVarChar, orderHeader.phoneNumber || null)
      .input(
        "primary_contact_auto",
        sql.NVarChar,
        orderHeader.primaryContactAuto || null
      )
      .input(
        "primary_contact_message",
        sql.NVarChar,
        orderHeader.primaryContactMessage || null
      )
      .input(
        "secondary_contact_message",
        sql.NVarChar,
        orderHeader.secondaryContactMessage || null
      )
      .input("instructions", sql.NVarChar, orderHeader.instructions || null)
      .input(
        "delivery_date",
        sql.Date,
        orderHeader.deliveryDate || null
      )
      .input("total_quantity", sql.Int, totalQuantity)
      .query(`
        INSERT INTO orders (
          order_no,
          status,
          category,
          broker_id,
          phone_number,
          primary_contact_auto,
          primary_contact_message,
          secondary_contact_message,
          instructions,
          delivery_date,
          total_quantity
        )
        OUTPUT INSERTED.id
        VALUES (
          @order_no,
          @status,
          @category,
          @broker_id,
          @phone_number,
          @primary_contact_auto,
          @primary_contact_message,
          @secondary_contact_message,
          @instructions,
          @delivery_date,
          @total_quantity
        )
      `);

    const orderId = orderResult.recordset[0].id;

    for (const stone of stones) {
      await transaction
        .request()
        .input("order_id", sql.Int, orderId)
        .input("stone_id", sql.Int, stone.stoneId)
        .input("broker_id", sql.Int, stone.brokerId || null)
        .input("manufacturer_id", sql.Int, stone.manufacturerId || null)
        .input("quantity", sql.Int, stone.quantity)
        .input("quantity_type", sql.NVarChar, stone.quantityType)
        .input("stone_name", sql.NVarChar, stone.stoneName || null)
        .input("size", sql.NVarChar, stone.size || null)
        .input("shape", sql.NVarChar, stone.shape || null)
        .input("color", sql.NVarChar, stone.color || null)
        .input("family", sql.NVarChar, stone.family || null)
        .input("cut", sql.NVarChar, stone.cut || null)
        .input("min_height", sql.Int, stone.minHeight || null)
        .input("max_height", sql.Int, stone.maxHeight || null)
        .input(
          "length_of_string",
          sql.Int,
          stone.lengthOfString || null
        )
        .input("comments", sql.NVarChar, stone.comments || null)
        .query(`
          INSERT INTO order_stones (
            order_id,
            stone_id,
            broker_id,
            manufacturer_id,
            quantity,
            quantity_type,
            stone_name,
            size,
            shape,
            color,
            family,
            cut,
            min_height,
            max_height,
            length_of_string,
            comments
          )
          VALUES (
            @order_id,
            @stone_id,
            @broker_id,
            @manufacturer_id,
            @quantity,
            @quantity_type,
            @stone_name,
            @size,
            @shape,
            @color,
            @family,
            @cut,
            @min_height,
            @max_height,
            @length_of_string,
            @comments
          )
        `);
    }

    for (const tool of tools) {
      await transaction
        .request()
        .input("order_id", sql.Int, orderId)
        .input("tool_id", sql.Int, tool.toolId)
        .input("manufacturer_id", sql.Int, tool.manufacturerId || null)
        .input("quantity", sql.Int, tool.quantity)
        .input("quantity_type", sql.NVarChar, tool.quantityType)
        .input("mou", sql.NVarChar, tool.mou || null)
        .input("usage", sql.NVarChar, tool.usage || null)
        .input("guage_size", sql.NVarChar, tool.guageSize || null)
        .input(
          "supply_date",
          sql.Date,
          tool.supplyDate || null
        )
        .input("comments", sql.NVarChar, tool.comments || null)
        .query(`
          INSERT INTO order_tools (
            order_id,
            tool_id,
            manufacturer_id,
            quantity,
            quantity_type,
            mou,
            usage,
            guage_size,
            supply_date,
            comments
          )
          VALUES (
            @order_id,
            @tool_id,
            @manufacturer_id,
            @quantity,
            @quantity_type,
            @mou,
            @usage,
            @guage_size,
            @supply_date,
            @comments
          )
        `);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Order saved successfully",
      orderNo,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save order",
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

export const getOrderByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getDbPool();

    const orderRes = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          o.*,
          b.broker_name
        FROM orders o
        LEFT JOIN broker_master b ON b.id = o.broker_id
        WHERE o.id = @id
      `);

    if (!orderRes.recordset.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderRes.recordset[0];

const stonesRes = await pool
  .request()
  .input("order_id", sql.Int, id)
  .query(`
    SELECT 
      os.*,

      sm.sku,
      sm.stone_name AS master_stone_name,
      sm.family AS master_family,
      sm.stone_type,
      sm.size AS master_size,
      sm.shape AS master_shape,
      sm.quality,
      sm.colour,
      sm.mou,
      sm.mou_type,
      sm.min_height,
      sm.max_height,
      sm.cut

    FROM order_stones os
    LEFT JOIN stone_master sm ON sm.id = os.stone_id
    WHERE os.order_id = @order_id
  `);


    const toolsRes = await pool
      .request()
      .input("order_id", sql.Int, id)
      .query(`
        SELECT 
          ot.*,
          tm.tool_name
        FROM order_tools ot
        LEFT JOIN tool_master tm ON tm.id = ot.tool_id
        WHERE ot.order_id = @order_id
      `);

    res.json({
      success: true,
      data: {
        orderHeader: order,
        stones: stonesRes.recordset,
        tools: toolsRes.recordset,
      },
    });
  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

