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
    console.log(tools, 'tools')
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
        .input("supply_date", sql.DateTime, stone.supplyDate || null)
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
            comments,
            supply_date
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
            @comments,
            @supply_date
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
           CASE
      WHEN o.status = 'REVIEW' AND ISNULL(o.isReviewed, 0) <> 1 THEN 'REVIEW'
      WHEN o.status = 'DRAFT' THEN 'DRAFT'
      WHEN o.isReviewed = 1 THEN 'REVIEWED'
      ELSE o.status
    END AS status,
            o.created_at,
            o.delivery_date,

            SUM(os.quantity) AS stone_qty,
            SUM(ot.quantity) AS tool_qty,

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
            o.id, o.order_no, o.status, o.created_at, o.delivery_date,o.isReviewed
        )
        SELECT
          id,
          order_no AS orderId,
          status,
          created_at AS orderCreated,
          delivery_date AS expected,
          ISNULL(stone_qty, 0) as stoneQty,
          ISNULL(tool_qty, 0) as toolQty,
          ISNULL(stone_qty, 0) + ISNULL(tool_qty, 0) AS quantity,

          CASE
            WHEN stone_qty IS NOT NULL AND tool_qty IS NOT NULL THEN 'MIXED'
            WHEN stone_qty IS NOT NULL THEN 'STONE'
            WHEN tool_qty IS NOT NULL THEN 'TOOL'
            ELSE 'UNKNOWN'
          END AS type
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
    plm.basePrice,
    plm.minPrice,
    plm.maxPrice,
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
    sm.cut,
    os.isReviewed
FROM order_stones os
LEFT JOIN stone_master sm 
    ON sm.id = os.stone_id
LEFT JOIN PriceLogicMaster plm 
    ON plm.stoneId = os.stone_id 
    AND plm.status = 1
WHERE os.order_id = @order_id;

  `);


    const toolsRes = await pool
      .request()
      .input("order_id", sql.Int, id)
      .query(`
        SELECT 
          ot.*,
          tm.tool_name,
          ot.isReviewed
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

export const listOrdersReviewerController = async (req, res) => {
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
            CASE WHEN o.isReviewed = 1 THEN 'REVIEWED'
            ELSE 'REVIEW' END AS status,
            o.created_at,
            o.delivery_date,

            SUM(os.quantity) AS stone_qty,
            SUM(ot.quantity) AS tool_qty,

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
          o.status = 'REVIEW' AND 
            (@search IS NULL OR o.order_no LIKE '%' + @search + '%')

          GROUP BY
            o.id, o.order_no, o.status, o.created_at, o.delivery_date,o.isReviewed
        )
        SELECT
          id,
          order_no AS orderId,
          status,
          created_at AS orderCreated,
          delivery_date AS expected,
          ISNULL(stone_qty, 0) as stoneQty,
          ISNULL(tool_qty, 0) as toolQty,
          ISNULL(stone_qty, 0) + ISNULL(tool_qty, 0) AS quantity,

          CASE
            WHEN stone_qty IS NOT NULL AND tool_qty IS NOT NULL THEN 'MIXED'
            WHEN stone_qty IS NOT NULL THEN 'STONE'
            WHEN tool_qty IS NOT NULL THEN 'TOOL'
            ELSE 'UNKNOWN'
          END AS type
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

export const reviewOrderPricingController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      order_id,
      item_id,
      item_type, // STONE | TOOL
      base_price,
      final_price,
      discount,
      discount_reason,
    } = req.body;

    if (!order_id || !item_id || !item_type) {
      return res.status(400).json({
        success: false,
        message: "order_id, item_id and item_type are required",
      });
    }

    if (!final_price) {
      return res.status(400).json({
        success: false,
        message: "Final Price is required",
      });
    }

    await transaction.begin();

    const request = new sql.Request(transaction);

    request
      .input("order_id", sql.Int, order_id)
      .input("item_id", sql.Int, item_id)
      .input("base_price", sql.Decimal(18, 2), base_price || null)
      .input("final_price", sql.Decimal(18, 2), final_price)
      .input("discount", sql.Decimal(5, 2), discount || null)
      .input("discount_reason", sql.VarChar(255), discount_reason || null)
      .input("reviewed_at", sql.DateTime, new Date());

    /* ---------------------------------------------------
       1️⃣ Update reviewed item
    --------------------------------------------------- */

    let updateItemQuery = "";

    if (item_type === "STONE") {
      updateItemQuery = `
        UPDATE order_stones
        SET 
          reviewed_base_price = @base_price,
          reviewed_final_price = @final_price,
          reviewed_discount = @discount,
          reviewed_discount_reason = @discount_reason,
          reviewed_at = @reviewed_at,
          isReviewed = 1
        WHERE id = @item_id
          AND order_id = @order_id
          AND ISNULL(isReviewed, 0) = 0
      `;
    } else if (item_type === "TOOL") {
      updateItemQuery = `
        UPDATE order_tools
        SET 
          reviewed_base_price = @base_price,
          reviewed_final_price = @final_price,
          reviewed_discount = @discount,
          reviewed_discount_reason = @discount_reason,
          reviewed_at = @reviewed_at,
          isReviewed = 1
        WHERE id = @item_id
          AND order_id = @order_id
          AND ISNULL(isReviewed, 0) = 0
      `;
    } else {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid item_type",
      });
    }

    const updateResult = await request.query(updateItemQuery);

    if (updateResult.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Item not found or already reviewed",
      });
    }

    /* ---------------------------------------------------
       2️⃣ Check if ANY item is still unreviewed
    --------------------------------------------------- */

    const pendingCheck = await request.query(`
      SELECT
        (
          SELECT COUNT(*) 
          FROM order_stones 
          WHERE order_id = @order_id AND ISNULL(isReviewed, 0) = 0
        ) +
        (
          SELECT COUNT(*) 
          FROM order_tools 
          WHERE order_id = @order_id AND ISNULL(isReviewed, 0) = 0
        ) AS pendingCount
    `);

    const pendingCount = pendingCheck.recordset[0].pendingCount;

    /* ---------------------------------------------------
       3️⃣ If none pending → mark order reviewed
    --------------------------------------------------- */

    if (pendingCount === 0) {
      await request.query(`
        UPDATE orders
        SET isReviewed = 1
        WHERE id = @order_id
      `);
    }

    await transaction.commit();

    return res.json({
      success: true,
      message:
        pendingCount === 0
          ? "Last item reviewed. Order marked as reviewed."
          : "Item reviewed successfully",
      orderReviewed: pendingCount === 0,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Review Pricing Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save pricing review",
    });
  }
};

export const getOrderByIdOperatorController = async (req, res) => {
  const pool = await getDbPool();
  const { id } = req.params;

  try {
    const order = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT * FROM orders WHERE id = @id
      `);

    if (!order.recordset.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const stones = await pool.request()
      .input("id", sql.Int, id)
      .query(`SELECT 
  os.*,
  b.broker_name,
  m.broker_name AS manufacturer_name
FROM order_stones os
LEFT JOIN broker_master b ON b.id = os.broker_id
LEFT JOIN broker_master m ON m.id = os.manufacturer_id
WHERE os.order_id = @id
`);

    const tools = await pool.request()
      .input("id", sql.Int, id)
      .query(`SELECT 
  ot.*,
  t.tool_name,
  b.broker_name AS manufacturer_name
FROM order_tools ot
LEFT JOIN tool_master t ON t.id = ot.tool_id
LEFT JOIN broker_master b ON b.id = ot.manufacturer_id
WHERE ot.order_id = @id
`);

    res.json({
      success: true,
      data: {
        ...order.recordset[0],
        stones: stones.recordset,
        tools: tools.recordset,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load order" });
  }
};

export const updateOrderController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);
  const { id } = req.params;

  try {
    const { status, orderHeader, stones = [], tools = [] } = req.body;

    await transaction.begin();

    const totalQuantity = [...stones, ...tools].reduce(
      (s, i) => s + Number(i.quantity || 0),
      0
    );

    await transaction.request()
      .input("id", sql.Int, id)
      .input("status", sql.NVarChar, status)
      .input("category", sql.NVarChar, orderHeader.category)
      .input("broker_id", sql.Int, orderHeader.brokerId || null)
      .input("phone_number", sql.NVarChar, orderHeader.phoneNumber || null)
      .input("primary_contact_auto", sql.NVarChar, orderHeader.primaryContactAuto || null)
      .input("primary_contact_message", sql.NVarChar, orderHeader.primaryContactMessage || null)
      .input("secondary_contact_message", sql.NVarChar, orderHeader.secondaryContactMessage || null)
      .input("instructions", sql.NVarChar, orderHeader.instructions || null)
      .input("delivery_date", sql.Date, orderHeader.deliveryDate || null)
      .input("total_quantity", sql.Int, totalQuantity)
      .query(`
        UPDATE orders SET
          status=@status,
          category=@category,
          broker_id=@broker_id,
          phone_number=@phone_number,
          primary_contact_auto=@primary_contact_auto,
          primary_contact_message=@primary_contact_message,
          secondary_contact_message=@secondary_contact_message,
          instructions=@instructions,
          delivery_date=@delivery_date,
          total_quantity=@total_quantity,
          updated_at=GETDATE()
        WHERE id=@id
      `);

    await transaction.request().input("id", sql.Int, id)
      .query(`DELETE FROM order_stones WHERE order_id=@id`);
    await transaction.request().input("id", sql.Int, id)
      .query(`DELETE FROM order_tools WHERE order_id=@id`);

    for (const s of stones) {
      await transaction.request()
        .input("order_id", sql.Int, id)
        .input("stone_id", sql.Int, s.stoneId)
        .input("broker_id", sql.Int, s.brokerId || null)
        .input("manufacturer_id", sql.Int, s.manufacturerId || null)
        .input("quantity", sql.Int, s.quantity)
        .input("quantity_type", sql.NVarChar, s.quantityType)
        .input("stone_name", sql.NVarChar, s.stoneName || null)
        .input("size", sql.NVarChar, s.size || null)
        .input("shape", sql.NVarChar, s.shape || null)
        .input("color", sql.NVarChar, s.color || null)
        .input("family", sql.NVarChar, s.family || null)
        .input("cut", sql.NVarChar, s.cut || null)
        .input("min_height", sql.Int, s.minHeight || null)
        .input("max_height", sql.Int, s.maxHeight || null)
        .input("length_of_string", sql.Int, s.lengthOfString || null)
        .input("comments", sql.NVarChar, s.comments || null)
        .input("supply_date", sql.Date, s.supplyDate || null)
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
            comments,
            supply_date
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
            @comments,
            @supply_date
          )
        `);
    }

    for (const t of tools) {
      await transaction.request()
        .input("order_id", sql.Int, id)
        .input("tool_id", sql.Int, t.toolId)
        .input("manufacturer_id", sql.Int, t.manufacturerId || null)
        .input("quantity", sql.Int, t.quantity)
        .input("mou", sql.NVarChar, t.mou || null)
        .input("usage", sql.NVarChar, t.usage || null)
        .input("guage_size", sql.NVarChar, t.guageSize || null)
        .input("supply_date", sql.Date, t.supplyDate || null)
        .input("comments", sql.NVarChar, t.comments || null)
        .query(`
         INSERT INTO order_tools (
            order_id,
            tool_id,
            manufacturer_id,
            quantity,
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
            @mou,
            @usage,
            @guage_size,
            @supply_date,
            @comments
          )
        `);
    }

    await transaction.commit();

    res.json({
      success: true,
      message:
        status === "REVIEW"
          ? "Order sent for review"
          : "Order updated successfully",
    });
  } catch (err) {
    await transaction.rollback();
    console.log({err})
    res.status(500).json({ message: err });
  }
};

export const getOrderStatsController = async (req, res) => {
  const pool = await getDbPool();

  try {
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) AS draftOrders,
        SUM(CASE WHEN status = 'REVIEW' AND ISNULL(isReviewed,0) <> 1 THEN 1 ELSE 0 END) AS pendingReview,
        SUM(CASE WHEN isReviewed = 1 THEN 1 ELSE 0 END) AS reviewedOrders
      FROM orders
    `);

    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

export const receiveOrderItemController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      orderId,
      type, // STONE | TOOL
      itemId,
      receivedBy,
      receivedQty,
      receivedWeight,
      okQty,
      okWeight,
      rejectedQty,
      rejectedWeight,
      issue,
      returnDate,
      handoverTo,
      status
    } = req.body;

    await transaction.begin();

    /* ---------- Update Item ---------- */
    const table = type === "STONE" ? "order_stones" : "order_tools";

    await transaction.request()
      .input("id", sql.Int, itemId)
      .input("received_qty", sql.Int, receivedQty)
      .input("received_weight", sql.Decimal(10,2), receivedWeight || null)
      .input("ok_qty", sql.Int, okQty)
      .input("ok_weight", sql.Decimal(10,2), okWeight || null)
      .input("rejected_qty", sql.Int, rejectedQty)
      .input("rejected_weight", sql.Decimal(10,2), rejectedWeight || null)
      .input("issue", sql.NVarChar, issue || null)
      .input("return_date", sql.Date, returnDate || null)
      .input("handover_to", sql.NVarChar, handoverTo || null)
      .input("status", sql.NVarChar, status)
      .query(`
        UPDATE ${table}
        SET
          received_qty = @received_qty,
          received_weight = @received_weight,
          ok_qty = @ok_qty,
          ok_weight = @ok_weight,
          rejected_qty = @rejected_qty,
          rejected_weight = @rejected_weight,
          issue = @issue,
          return_date = @return_date,
          handover_to = @handover_to,
          receive_status = @status
        WHERE id = @id
      `);

    /* ---------- Check Remaining Pending Items ---------- */
    const pendingCheck = await transaction.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT
          (
            SELECT COUNT(*) FROM order_stones 
            WHERE order_id = @orderId AND receive_status = 'Pending'
          ) +
          (
            SELECT COUNT(*) FROM order_tools 
            WHERE order_id = @orderId AND receive_status = 'Pending'
          ) AS pendingCount
      `);

    const pendingCount = pendingCheck.recordset[0].pendingCount;

    /* ---------- Update Order Status ---------- */
    const orderStatus = pendingCount === 0 ? "Completed" : "Partial";

    await transaction.request()
      .input("orderId", sql.Int, orderId)
      .input("status", sql.NVarChar, orderStatus)
      .input("received_by", sql.Int, receivedBy)
      .query(`
        UPDATE orders
        SET
          received_status = @status,
          received_at = GETDATE(),
          received_by = @received_by
        WHERE id = @orderId
      `);

    await transaction.commit();

    res.json({
      success: true,
      message:
        pendingCount === 0
          ? "Order fully received"
          : "Item received successfully",
      orderStatus
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Receive Item Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to receive item"
    });
  }
};

export const receiveOrderViewController = async (req, res) => {
  const pool = await getDbPool();

  try {
    const { orderId } = req.params;
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const offset = (page - 1) * pageSize;

    /* ---------- Order Header ---------- */
    const orderResult = await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT 
          o.id,
          o.order_no,
          o.total_quantity,
          o.delivery_date,
          o.received_status,
          b.brokerName
        FROM orders o
        LEFT JOIN brokers b ON b.id = o.broker_id
        WHERE o.id = @orderId
      `);

    if (!orderResult.recordset.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const order = orderResult.recordset[0];

    /* ---------- Items (Stone + Tool UNION) ---------- */
    const itemsResult = await pool.request()
      .input("orderId", sql.Int, orderId)
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize)
      .query(`
        SELECT * FROM (
          SELECT 
            os.id,
            os.order_id,
            'STONE' AS type,
            s.code,
            s.stoneName AS name,
            os.size,
            os.received_weight AS weight,
            os.quantity AS orderedQty,
            os.receive_status
          FROM order_stones os
          JOIN stones s ON s.id = os.stone_id
          WHERE os.order_id = @orderId

          UNION ALL

          SELECT
            ot.id,
            ot.order_id,
            'TOOL' AS type,
            t.toolCode AS code,
            t.toolName AS name,
            NULL AS size,
            NULL AS weight,
            ot.quantity AS orderedQty,
            ot.receive_status
          FROM order_tools ot
          JOIN tools t ON t.id = ot.tool_id
          WHERE ot.order_id = @orderId
        ) X
        ORDER BY type
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    /* ---------- Total Count ---------- */
    const countResult = await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT
          (
            SELECT COUNT(*) FROM order_stones WHERE order_id = @orderId
          ) +
          (
            SELECT COUNT(*) FROM order_tools WHERE order_id = @orderId
          ) AS total
      `);

    res.json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.order_no,
        brokerName: order.brokerName,
        totalQuantity: order.total_quantity,
        deliveryDate: order.delivery_date,
        receivedStatus: order.received_status
      },
      items: itemsResult.recordset.map((r) => ({
        id: r.id,
        orderId: r.order_id,
        type: r.type,
        code: r.code,
        name: r.name,
        size: r.size,
        weight: r.weight,
        orderedQty: r.orderedQty,
        receiveStatus: r.receive_status
      })),
      total: countResult.recordset[0].total
    });

  } catch (err) {
    console.error("Receive View Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load receive view"
    });
  }
};

export const listOrdersReceiveController = async (req, res) => {
  const pool = await getDbPool();

  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const search = req.query.search || "";
    const status = req.query.status || null;
    const receivedStatus = req.query.receivedStatus || null;

    const offset = (page - 1) * pageSize;

    /* ---------- WHERE Conditions ---------- */
    let where = `WHERE 1=1`;
    if (search) {
      where += ` AND (o.order_no LIKE @search OR b.brokerName LIKE @search)`;
    }
    if (status) {
      where += ` AND o.status = @status`;
    }
    if (receivedStatus) {
      where += ` AND o.received_status = @receivedStatus`;
    }

    /* ---------- Orders Query ---------- */
    const ordersResult = await pool.request()
      .input("search", sql.NVarChar, `%${search}%`)
      .input("status", sql.NVarChar, status)
      .input("receivedStatus", sql.NVarChar, receivedStatus)
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize)
      .query(`
        SELECT
          o.id,
          o.order_no,
          o.category,
          o.total_quantity,
          o.delivery_date,
          o.status,
          o.received_status,
          o.createdAt,
          b.brokerName
        FROM orders o
        LEFT JOIN brokers b ON b.id = o.broker_id
        ${where}
        ORDER BY o.createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    /* ---------- Count Query ---------- */
    const countResult = await pool.request()
      .input("search", sql.NVarChar, `%${search}%`)
      .input("status", sql.NVarChar, status)
      .input("receivedStatus", sql.NVarChar, receivedStatus)
      .query(`
        SELECT COUNT(*) AS total
        FROM orders o
        LEFT JOIN brokers b ON b.id = o.broker_id
        ${where}
      `);

    res.json({
      success: true,
      data: ordersResult.recordset.map((o) => ({
        id: o.id,
        orderNo: o.order_no,
        category: o.category,
        brokerName: o.brokerName,
        totalQuantity: o.total_quantity,
        deliveryDate: o.delivery_date,
        status: o.status,
        receivedStatus: o.received_status,
        createdAt: o.createdAt
      })),
      pagination: {
        page,
        pageSize,
        total: countResult.recordset[0].total
      }
    });

  } catch (err) {
    console.error("Orders Listing Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
};
