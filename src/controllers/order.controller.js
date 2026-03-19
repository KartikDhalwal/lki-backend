import sql from "mssql";
import { getDbPool } from "../utils/db.config.js";
import { SendWhatsAppMessgae } from "../utils/whatsApp.js";
const statusMain = {
  0: 'Draft',
  1: 'Sent For Review',
  2: 'Reviewer Approved',
  3: 'Order Recieved By Operator',
  5: 'Recieved Order Reviewed by Reviewer',
  99: 'Admin Order'
}
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
    let category = "UNKNOWN";

    if (stones.length && tools.length) {
      category = "MIXED";
    } else if (stones.length) {
      category = "STONE";
    } else if (tools.length) {
      category = "TOOL";
    }

    await transaction.begin();

    const orderResult = await transaction
      .request()
      .input("order_no", sql.NVarChar, orderNo)
      .input("status", sql.NVarChar, status)
      .input("category", sql.NVarChar, category || null)
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
      .input("createdBy", sql.NVarChar, orderHeader.createdBy || null)
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
          total_quantity,
          createdBy
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
          @total_quantity,
          @createdBy
        )
      `);

    const orderId = orderResult.recordset[0].id;

    for (const stone of stones) {
      const minHeightVal = stone?.minHeight ? parseFloat(stone?.minHeight) : null;
      const maxHeightVal = stone?.maxHeight ? parseFloat(stone?.maxHeight) : null;

      if (minHeightVal !== null && isNaN(minHeightVal)) {
        return res.status(400).json({ success: false, message: "Invalid min height" });
      }

      if (maxHeightVal !== null && isNaN(maxHeightVal)) {
        return res.status(400).json({ success: false, message: "Invalid max height" });
      }
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
        .input("min_height", sql.Decimal(10, 2), stone?.minHeight ? Number(stone?.minHeight) : null)
        .input("max_height", sql.Decimal(10, 2), stone?.maxHeight ? Number(stone?.maxHeight) : null)
        .input(
          "length_of_string",
          sql.Int,
          stone.lengthOfString || null
        )
        .input("comments", sql.NVarChar, stone.comments || null)
        .input("supply_date", sql.DateTime, stone.supplyDate || null)
        .input("statusMain", sql.Int, status === 'DRAFT' ? 0 : status === 'REVIEW' ? 1 : 99 || null)
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
            supply_date,
            statusMain
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
            @supply_date,
            @statusMain
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
        .input("statusMain", sql.Int, status === 'DRAFT' ? 0 : status === 'REVIEW' ? 1 : 99 || null)
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
            comments,
            statusMain
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
            @comments,
            @statusMain
          )
        `);
    }

    await transaction.commit();
    // const printUrl = `https://lkigems.cloud/api/public/review-print?order_id=${order_id}&item_id=${item_id}&item_type=${item_type}`;

    // SendWhatsAppMessgae(
    //   broker.phone_number,
    //   "order_creation_brkr_msg",
    //   [
    //     { type: "text", text: broker.order_no },
    //     { type: "text", text: broker.created_by },
    //     { type: "text", text: new Date(broker.created_at).toLocaleDateString("en-GB") },
    //     { type: "text", text: printUrl }, 
    //   ]
    // ).catch((err) => {
    //   console.log(
    //     `WhatsApp send failed for broker ${broker.broker_id}:`,
    //     err.message
    //   );
    // });


    res.status(201).json({
      success: true,
      message: "Order saved successfully",
      orderNo,
    });
  } catch (error) {
    try {
      if (transaction._aborted !== true && transaction._begun) {
        await transaction.rollback();
      }
    } catch (rbErr) {
      console.error("Rollback failed:", rbErr.message);
    }

    console.error("Create Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save order",
    });
  }
};

export const listOrdersController = async (req, res) => {
  try {
    const createdBy = req.query.createdBy;
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const search = req.query.search || null;
    const offset = (page - 1) * limit;
    console.log(page, limit, search, offset)
    const pool = await getDbPool();
    console.log(createdBy, 'createdBy')
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
        AND o.createdBy = '${createdBy}'
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
            AND o.createdBy = '${createdBy}'
      `);

    const totalItems = countResult.recordset[0].total;
    console.log(dataResult.recordset, 'dataResult.recordset')
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
    os.isReviewed,
    bm.broker_name
FROM order_stones os
LEFT JOIN stone_master sm 
    ON sm.id = os.stone_id
LEFT JOIN broker_master bm 
    ON bm.id = os.broker_id
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
        ot.isReviewed,
        plm.basePrice,
        plm.minPrice,
        plm.maxPrice,
        bm.broker_name,
        ot.manufacturer_id as broker_id
        FROM order_tools ot
        LEFT JOIN tool_master tm ON tm.id = ot.tool_id
        LEFT JOIN broker_master bm 
    ON bm.id = ot.manufacturer_id
        LEFT JOIN PriceLogicMaster plm ON plm.toolId = ot.tool_id AND plm.status = 1
        WHERE ot.order_id = @order_id
      `);

    const brokers = {};

    // group stones
    stonesRes.recordset.forEach((stone) => {
      const brokerId = stone.broker_id || "unknown";

      if (!brokers[brokerId]) {
        brokers[brokerId] = {
          broker_id: brokerId,
          broker_name: stone.broker_name,
          stones: [],
          tools: [],
        };
      }

      brokers[brokerId].stones.push(stone);
    });

    // group tools
    toolsRes.recordset.forEach((tool) => {
      const brokerId = tool.manufacturer_id || "unknown";

      if (!brokers[brokerId]) {
        brokers[brokerId] = {
          broker_id: brokerId,
          broker_name: tool.broker_name,
          stones: [],
          tools: [],
        };
      }

      brokers[brokerId].tools.push(tool);
    });

    res.json({
      success: true,
      data: {
        orderHeader: order,
        brokers: Object.values(brokers),
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
            AND o.createdBy != 'ADMIN'
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
  console.log(req.body, 'req.body')
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { order_id, broker_id, items } = req.body;

    if (!order_id || !broker_id || !items?.length) {
      return res.status(400).json({
        success: false,
        message: "order_id, broker_id and items required",
      });
    }

    await transaction.begin();

    for (const item of items) {

      const {
        item_id,
        item_type,
        base_price,
        final_price,
        discount,
        discount_reason,
      } = item;

      const request = new sql.Request(transaction);

      request
        .input("order_id", sql.Int, order_id)
        .input("item_id", sql.Int, item_id)
        .input("base_price", sql.Decimal(18, 2), base_price || null)
        .input("final_price", sql.Decimal(18, 2), final_price)
        .input("discount", sql.Decimal(5, 2), discount || null)
        .input("discount_reason", sql.VarChar(255), discount_reason || null)
        .input("reviewed_at", sql.DateTime, new Date());

      let query = "";

      if (item_type === "STONE") {
        query = `
          UPDATE order_stones
          SET
            reviewed_base_price = @base_price,
            reviewed_final_price = @final_price,
            reviewed_discount = @discount,
            reviewed_discount_reason = @discount_reason,
            reviewed_at = @reviewed_at,
            isReviewed = 1,
            statusMain = 2
          WHERE id = @item_id
          AND order_id = @order_id
        `;
      }
      else if (item_type === "TOOL") {
        query = `
          UPDATE order_tools
          SET
            reviewed_base_price = @base_price,
            reviewed_final_price = @final_price,
            reviewed_discount = @discount,
            reviewed_discount_reason = @discount_reason,
            reviewed_at = @reviewed_at,
            isReviewed = 1,
            statusMain = 2
          WHERE id = @item_id
          AND order_id = @order_id
        `;
      }

      const updateResult = await request.query(query);

      if (updateResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Item ${item_id} not found`,
        });
      }
    }

    // Check if order fully reviewed
    const pendingCheck = await new sql.Request(transaction)
      .input("order_id", sql.Int, order_id)
      .query(`
        SELECT
        (
          SELECT COUNT(*) 
          FROM order_stones 
          WHERE order_id = @order_id AND ISNULL(isReviewed,0)=0
        ) +
        (
          SELECT COUNT(*) 
          FROM order_tools 
          WHERE order_id = @order_id AND ISNULL(isReviewed,0)=0
        ) AS pendingCount
      `);

    const pendingCount = pendingCheck.recordset[0].pendingCount;

    if (pendingCount === 0) {
      await new sql.Request(transaction)
        .input("order_id", sql.Int, order_id)
        .query(`
          UPDATE orders
          SET isReviewed = 1
          WHERE id = @order_id
        `);
    }

    // Broker details (single broker for all items)
    const brokerDetails = await new sql.Request(transaction)
      .input("broker_id", sql.Int, broker_id)
      .input("order_id", sql.Int, order_id)
      .query(`
        SELECT 
          o.order_no,
          o.created_at,
          b.id AS broker_id,
          b.broker_name,
          b.phone_number
        FROM orders o
        JOIN broker_master b ON b.id = @broker_id
        WHERE o.id = @order_id
      `);

    if (!brokerDetails.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const broker = brokerDetails.recordset[0];

    // Create encoded items for print URL
    const encoded = encodeURIComponent(JSON.stringify(items));

    const printUrl =
      `https://lkigems.cloud/api/public/review-print?order_id=${order_id}&items=${encoded}`;

    // WhatsApp message
    SendWhatsAppMessgae(
      broker.phone_number,
      "final_1_msg",
      [
        { type: "text", text: broker.broker_name },
        { type: "text", text: broker.order_no },
        { type: "text", text: new Date(broker.created_at).toLocaleDateString("en-GB") },
        { type: "text", text: new Date(broker.created_at).toLocaleDateString("en-GB") },
        { type: "text", text: printUrl },
      ]
    ).catch((err) => {
      console.log(
        `WhatsApp send failed for broker ${broker.broker_id}:`,
        err.message
      );
    });

    await transaction.commit();

    res.json({
      success: true,
      message: "All items reviewed successfully",
      print_url: printUrl,
    });

  } catch (error) {

    await transaction.rollback();

    console.error("Review Pricing Error:", error);

    res.status(500).json({
      success: false,
      message: "Review failed",
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
        SELECT CASE 
        WHEN isReviewed = 1 THEN 'REVIEWED'
        ELSE status 
        END AS FinalStatus,
        * FROM orders WHERE id = @id
      `);

    if (!order.recordset.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const stones = await pool.request()
      .input("id", sql.Int, id)
      .query(`SELECT 
  os.*,sm.stone_name AS StoneName,
  b.broker_name,
  m.broker_name AS manufacturer_name
FROM order_stones os
LEFT JOIN broker_master b ON b.id = os.broker_id
LEFT JOIN broker_master m ON m.id = os.manufacturer_id
LEFT JOIN stone_master sm ON sm.id = os.stone_id
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
    console.log({
      ...order.recordset[0],
      stones: stones.recordset,
      tools: tools.recordset,
    })
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
        .input("statusMain", sql.Int, status === 'DRAFT' ? 0 : status === 'REVIEW' ? 1 : 99 || null)
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
            supply_date,
            statusMain
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
            @supply_date,
            @statusMain
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
        .input("statusMain", sql.Int, status === 'DRAFT' ? 0 : status === 'REVIEW' ? 1 : 99 || null)
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
            comments,
            statusMain
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
            @comments,
            @statusMain
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
    console.log({ err })
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
      WHERE
        createdBy != 'ADMIN'
    `);

    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

export const receiveOrderViewController = async (req, res) => {
  const pool = await getDbPool();

  try {
    const { orderId } = req.params;
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const offset = (page - 1) * pageSize;

    const orderResult = await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT 
          o.id,
          o.order_no,
          o.total_quantity,
          o.delivery_date,
          o.received_status,
          b.broker_name AS brokerName,
          o.force_completed,
          o.completed_at,
          o.created_at
        FROM orders o
        LEFT JOIN broker_master b ON b.id = o.broker_id
        WHERE o.id = @orderId
      `);

    if (!orderResult.recordset.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderResult.recordset[0];

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
        CAST(s.id AS NVARCHAR) AS code,
        s.stone_name AS name,
        os.size,
        os.received_weight AS weight,
        os.quantity AS orderedQty,
        os.receive_status,
        ISNULL(SUM(oir.received_qty),0) AS receivedQty,
ISNULL(SUM(oir.rejectedQty),0) AS rejectedQty,
os.quantity - (
    ISNULL(SUM(oir.received_qty),0) - ISNULL(SUM(oir.rejectedQty),0)
) AS pendingQty,        
 os.isReviewed
    FROM order_stones os
    JOIN stone_master s 
        ON s.id = os.stone_id
    LEFT JOIN order_item_receive oir 
        ON oir.item_id = os.stone_id 
        AND oir.item_type = 'STONE'
    WHERE os.order_id = @orderId
    GROUP BY 
        os.id, os.order_id, s.sku, s.stone_name, os.size, 
        os.received_weight, os.quantity, os.receive_status, os.isReviewed, s.id

    UNION ALL

    SELECT
        ot.id,
        ot.order_id,
        'TOOL' AS type,
        CAST(t.id AS NVARCHAR) AS code,
        t.tool_name AS name,
        NULL AS size,
        NULL AS weight,
        ot.quantity AS orderedQty,
        ot.receive_status,
        ISNULL(SUM(oir.received_qty),0) AS receivedQty,
        ISNULL(SUM(oir.rejectedQty),0) AS rejectedQty,
        ot.quantity - (
    ISNULL(SUM(oir.received_qty),0) - ISNULL(SUM(oir.rejectedQty),0)
) AS pendingQty,
        ot.isReviewed
    FROM order_tools ot
    JOIN tool_master t 
        ON t.id = ot.tool_id
    LEFT JOIN order_item_receive oir 
        ON oir.item_id = ot.tool_id 
        AND oir.item_type = 'TOOL'
    WHERE ot.order_id = @orderId
    GROUP BY 
        ot.id, ot.order_id, t.id, t.tool_name, ot.quantity, ot.receive_status,ot.isReviewed
) X
ORDER BY type
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
      `);

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
        receivedStatus: order.received_status,
        created_at: order.created_at,
        force_completed: order.force_completed,
        completed_at: order.completed_at,
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
        pendingQty: r.pendingQty,
        receivedQty: r.receivedQty,
        isReviewed: r.isReviewed,
        receiveStatus: r.receive_status,
      })),
      total: countResult.recordset[0].total,
    });

  } catch (err) {
    console.error("Receive View Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load receive view",
    });
  }
};
export const receivePocViewController = async (req, res) => {
  const pool = await getDbPool();

  try {
    const { id, orderId } = req.params;
    console.log(id, orderId, 'id, orderId')
    /* ---------- Order Header ---------- */
    const orderResult = await pool.request()
      .input("orderId", sql.Int, orderId)
      .input("id", sql.Int, id)
      .query(`
        SELECT 
    itr.*,itr.received_at AT TIME ZONE 'UTC' 
        AT TIME ZONE 'India Standard Time' AS received_at_ist,
    CASE 
        WHEN itr.item_type = 'STONE' THEN sm.stone_name
        WHEN itr.item_type = 'TOOL' THEN tm.tool_name
    END AS item_name
FROM order_item_receive itr

LEFT JOIN stone_master sm 
    ON itr.item_type = 'STONE' 
    AND itr.item_id = sm.id

LEFT JOIN tool_master tm 
    ON itr.item_type = 'TOOL' 
    AND itr.item_id = tm.id

WHERE itr.order_id = @orderId 
AND itr.item_id = @id`);
    console.log(orderResult)
    if (!orderResult.recordset.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderResult.recordset;
    res.json({
      success: true,
      order
    });

  } catch (err) {
    console.error("Receive View Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load receive view",
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

    /* ---------- WHERE CONDITIONS ---------- */
    let where = `WHERE 1=1`;

    // 🔍 Search
    if (search) {
      where += ` AND (o.order_no LIKE @search OR b.broker_name LIKE @search)`;
    }

    // 📦 Order approval status
    if (status) {
      where += ` AND o.status = @status`;
    }

    // 📥 Receive status filter
    if (receivedStatus) {
      where += ` AND o.received_status = @receivedStatus`;
    } else {
      // Default show orders that still need receiving
      where += ` AND o.received_status IN ('Pending','Partial')`;
    }

    /* ---------- DATA QUERY ---------- */
    const ordersResult = await pool
      .request()
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
          o.created_at,
          b.broker_name
        FROM orders o
        LEFT JOIN broker_master b ON b.id = o.broker_id
        ${where}
        AND o.createdBy != 'ADMIN'
        ORDER BY o.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    /* ---------- COUNT QUERY ---------- */
    const countResult = await pool
      .request()
      .input("search", sql.NVarChar, `%${search}%`)
      .input("status", sql.NVarChar, status)
      .input("receivedStatus", sql.NVarChar, receivedStatus)
      .query(`
        SELECT COUNT(*) AS total
        FROM orders o
        LEFT JOIN broker_master b ON b.id = o.broker_id
        ${where}
        AND o.createdBy != 'ADMIN'
      `);

    res.json({
      success: true,
      data: ordersResult.recordset.map((o) => ({
        id: o.id,
        orderNo: o.order_no,
        category: o.category,
        brokerName: o.broker_name,
        totalQuantity: o.total_quantity,
        deliveryDate: o.delivery_date,
        status: o.status,
        receivedStatus: o.received_status,
        createdAt: o.created_at,
      })),
      pagination: {
        page,
        pageSize,
        total: countResult.recordset[0].total,
      },
    });

  } catch (err) {
    console.error("Orders Receive Listing Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch receive orders",
    });
  }
};

export const receiveOrderItemController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      orderId,
      type,
      id,
      itemId,
      receivedQty,
      receivedWeight,
      issue,
      returnDate,
      handoverTo,
    } = req.body;

    if (!orderId || !itemId || !type || !receivedQty) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const tableName =
      type === "STONE"
        ? "order_stones"
        : type === "TOOL"
          ? "order_tools"
          : null;

    if (!tableName) throw new Error("Invalid item type");

    await transaction.begin();

    const order = await transaction.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT order_no
        FROM orders 
        WHERE id = @orderId
      `);
    const orderNo = order.recordset[0].order_no;

    const item = await transaction.request()
      .input("id", sql.Int, parseInt(id))
      .query(`
        SELECT it.*, bm.broker_name, bm.phone_number
        FROM ${tableName} it
        JOIN broker_master bm on bm.id = it.${tableName === "order_stones" ? 'broker_id' : 'manufacturer_id'}
        WHERE it.id = @id
      `);
    const orderedQty = item.recordset[0].quantity;

    const receivedResult = await transaction.request()
      .input("itemId", sql.Int, itemId)
      .input("type", sql.NVarChar, type)
      .query(`
        SELECT 
  ISNULL(SUM(received_qty),0) as totalReceived,
  ISNULL(SUM(rejectedQty),0) as totalRejected
        FROM order_item_receive
        WHERE item_id = @itemId
        AND item_type = @type
      `);

    const totalReceived = receivedResult.recordset[0].totalReceived;
    const totalRejected = receivedResult.recordset[0].totalRejected;

    const alreadyAccepted = totalReceived - totalRejected;

    const newAccepted = alreadyAccepted + Number(receivedQty);

    if (newAccepted > orderedQty) {
      throw new Error("Accepted quantity exceeds ordered quantity");
    }

    await transaction.request()
      .input("orderId", sql.Int, orderId)
      .input("itemId", sql.Int, itemId)
      .input("type", sql.NVarChar, type)
      .input("receivedQty", sql.Int, receivedQty)
      .input("receivedWeight", sql.Decimal(10, 2), receivedWeight || null)
      .input("issue", sql.NVarChar, issue || null)
      .input("returnDate", sql.Date, returnDate || null)
      .input("handoverTo", sql.NVarChar, handoverTo || null)
      .query(`
              INSERT INTO order_item_receive
              (
                order_id,
                item_id,
                item_type,
                received_qty,
                received_weight,
                issue,
                return_date,
                handover_to,
                received_at
              )
              VALUES
              (
                @orderId,
                @itemId,
                @type,
                @receivedQty,
                @receivedWeight,
                @issue,
                @returnDate,
                @handoverTo,
                DATEADD(MINUTE, 330, GETUTCDATE())
              )`);

    let status = "Partial";
    if (newAccepted === orderedQty) status = "Completed";
    await transaction.request()
      .input("id", sql.Int, id)
      .input("status", sql.NVarChar, status)
      .query(`
        UPDATE ${tableName}
        SET receive_status = @status
        WHERE id = @id
      `);

    const pending = await transaction.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT
        (
          SELECT COUNT(*) FROM order_stones
          WHERE order_id=@orderId AND receive_status!='Completed'
        ) +
        (
          SELECT COUNT(*) FROM order_tools
          WHERE order_id=@orderId AND receive_status!='Completed'
        ) AS pending
      `);

    const pendingCount = pending.recordset[0].pending;

    const orderStatus = pendingCount === 0 ? "Completed" : "Partial";

    await transaction.request()
      .input("orderId", sql.Int, orderId)
      .input("status", sql.NVarChar, orderStatus)
      .query(`
        UPDATE orders
        SET received_status = @status
        WHERE id=@orderId
      `);

    SendWhatsAppMessgae(
      item.recordset[0].phone_number,
      "ordr_recv_msg",
      [
        { type: "text", text: item.recordset[0].broker_name },
        { type: "text", text: orderNo },
        { type: "text", text: new Date().toLocaleDateString("en-GB") }
      ]
    ).catch((err) => {
      console.warn(
        `WhatsApp send failed for broker ${item.broker_id}:`,
        err.message
      );
    });

    await transaction.commit();
    res.json({
      success: true,
      message: "Receive entry added",
      itemStatus: status,
      orderStatus,
    });

  } catch (err) {
    await transaction.rollback();
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const listOrdersReceiveReviewController = async (req, res) => {
  const pool = await getDbPool();

  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const offset = (page - 1) * pageSize;

    const result = await pool.request()
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize)
      .query(`
        SELECT
          o.id,
          o.order_no,
          o.total_quantity,
          o.received_status,
          o.receive_review_status,
          o.created_at
        FROM orders o
        WHERE o.received_status IN ('Partial','Completed')
        AND o.createdBy != 'ADMIN'
        ORDER BY o.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    const count = await pool.request().query(`
      SELECT COUNT(*) AS total
      FROM orders
      WHERE received_status IN ('Partial','Completed')
        AND receive_review_status = 'Pending'
        AND createdBy != 'ADMIN'
    `);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page,
        pageSize,
        total: count.recordset[0].total,
      },
    });

  } catch (err) {
    console.error("Receive Review List Error", err);
    res.status(500).json({
      success: false,
      message: "Failed to load receive review orders",
    });
  }
};

export const receiveReviewViewController = async (req, res) => {
  const pool = await getDbPool();
  const { orderId } = req.params;

  try {
    const order = await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT
          id,
          order_no,
          total_quantity,
          received_status,
          receive_review_status
        FROM orders
        WHERE id = @orderId
      `);

    const items = await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT * FROM (
          SELECT
            os.id,
            'STONE' AS type,
            os.stone_name AS name,
            os.received_qty,
            os.ok_qty,
            os.rejected_qty,
            os.receive_status,
            os.receive_review_status,
            os.receive_review_comment
          FROM order_stones os
          WHERE os.order_id = @orderId
            AND os.receive_status <> 'Pending'

          UNION ALL

          SELECT
            ot.id,
            'TOOL' AS type,
            t.tool_name AS name,
            ot.received_qty,
            ot.ok_qty,
            ot.rejected_qty,
            ot.receive_status,
            ot.receive_review_status,
            ot.receive_review_comment
          FROM order_tools ot
          JOIN tool_master t ON t.id = ot.tool_id
          WHERE ot.order_id = @orderId
            AND ot.receive_status <> 'Pending'
        ) X
        ORDER BY type
      `);

    res.json({
      success: true,
      order: order.recordset[0],
      items: items.recordset,
    });

  } catch (err) {
    console.error("Receive Review View Error", err);
    res.status(500).json({
      success: false,
      message: "Failed to load receive review view",
    });
  }
};

export const receiveReviewItemController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      orderId,
      itemId,
      type,                 // STONE | TOOL
      reviewStatus,         // Approved | Rejected
      reviewComment,
      reviewerId,
    } = req.body;

    await transaction.begin();

    const table =
      type === "STONE" ? "order_stones" :
        type === "TOOL" ? "order_tools" :
          null;

    if (!table) throw new Error("Invalid item type");

    await transaction.request()
      .input("id", sql.Int, itemId)
      .input("status", sql.NVarChar, reviewStatus)
      .input("comment", sql.NVarChar, reviewComment || null)
      .input("reviewer", sql.Int, reviewerId)
      .query(`
        UPDATE ${table}
        SET
          receive_review_status = @status,
          receive_review_comment = @comment,
          receive_reviewed_at = GETDATE(),
          receive_reviewed_by = @reviewer
        WHERE id = @id
      `);

    /* ---------- Check if all received items reviewed ---------- */
    const pending = await transaction.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT
          (
            SELECT COUNT(*) FROM order_stones
            WHERE order_id = @orderId
              AND receive_status <> 'Pending'
              AND receive_review_status = 'Pending'
          ) +
          (
            SELECT COUNT(*) FROM order_tools
            WHERE order_id = @orderId
              AND receive_status <> 'Pending'
              AND receive_review_status = 'Pending'
          ) AS pending
      `);

    if (pending.recordset[0].pending === 0) {
      await transaction.request()
        .input("orderId", sql.Int, orderId)
        .query(`
          UPDATE orders
          SET receive_review_status = 'Completed'
          WHERE id = @orderId
        `);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Receive review saved successfully",
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Receive Review Save Error", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to save receive review",
    });
  }
};

export const pocSaveController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      orderId,
      itemId,
      itemType,
      rows,
      issue,
      returnDate,
      handoverTo,
    } = req.body;

    if (!orderId || !itemId || !itemType || !rows?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await transaction.begin();

    const request = new sql.Request(transaction);

    for (const row of rows) {
      if (!row.isPocDone) {
        const request = new sql.Request(transaction);
        console.log('arrived')
        const {
          receiveId,
          acceptedQty,
          acceptedWeight,
          rejectedQty,
          rejectedWeight,
        } = row;

        await request
          .input("id", sql.Int, receiveId)
          .input("acceptedQty", sql.Int, acceptedQty || 0)
          .input("acceptedWeight", sql.Decimal(18, 3), acceptedWeight || 0)
          .input("rejectedQty", sql.Int, rejectedQty || 0)
          .input("rejectedWeight", sql.Decimal(18, 3), rejectedWeight || 0)
          .input("issue", sql.NVarChar, issue || null)
          .input("returnDate", sql.DateTime, returnDate || null)
          .input("handoverTo", sql.NVarChar, handoverTo || null)
          .query(`
      UPDATE order_item_receive
      SET 
        acceptedQty = @acceptedQty,
        acceptedWeight = @acceptedWeight,
        rejectedQty = @rejectedQty,
        rejectedWeight = @rejectedWeight,
        issue = @issue,
        return_date = @returnDate,
        handover_to = @handoverTo,
        isPocDone = 1
      WHERE id = @id
    `);
      }
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "POC saved successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("POC Save Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save POC",
    });
  }
};

export const completeOrderController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID required",
      });
    }

    await transaction.begin();

    await transaction.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        UPDATE orders
        SET 
          received_status = 'Completed',
          force_completed = 1,
          completed_at = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE id = @orderId
      `);

    await transaction.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        UPDATE order_stones
        SET receive_status = 'Completed'
        WHERE order_id = @orderId;

        UPDATE order_tools
        SET receive_status = 'Completed'
        WHERE order_id = @orderId;
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: "Order force completed successfully",
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Complete Order Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to complete order",
    });
  }
};