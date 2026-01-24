import { getDbPool } from "../utils/db.config.js";
import sql from "mssql";

export const getAdminDashboardController = async (req, res) => {
  try {
    const pool = await getDbPool();

    const { from, to, brokerId } = req.query;

    const dateFilter = from && to
      ? `AND o.created_at BETWEEN @from AND @to`
      : "";

    const brokerFilter = brokerId
      ? `AND o.broker_id = @brokerId`
      : "";

    const request = pool.request();

    if (from && to) {
      request.input("from", sql.Date, from);
      request.input("to", sql.Date, to);
    }
    if (brokerId) {
      request.input("brokerId", sql.Int, brokerId);
    }

    /* ------------------------------------------------
       1. STATS CARDS
    ------------------------------------------------ */
    const statsQuery = `
      SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN o.receive_review_status = 'PENDING' THEN 1 ELSE 0 END) AS pendingReview,
        SUM(CASE WHEN o.status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN o.status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeOrders,
        SUM(CASE WHEN o.status = 'DELAYED' THEN 1 ELSE 0 END) AS delayedOrders,
        SUM(CASE WHEN o.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completedOrders
      FROM orders o
      WHERE 1=1
      ${dateFilter}
      ${brokerFilter}
    `;

    const statsResult = await request.query(statsQuery);
    const stats = statsResult.recordset[0];

    /* ------------------------------------------------
       2. LINE CHART – MONTHLY ORDER VALUE
       Net Value = reviewed_final_price - reviewed_discount
    ------------------------------------------------ */
    const lineChartQuery = `
      SELECT
        DATENAME(MONTH, o.created_at) AS name,
        MONTH(o.created_at) AS monthNo,
        SUM(ISNULL(os.reviewed_final_price, 0) - ISNULL(os.reviewed_discount, 0)) AS curr,
        SUM(ISNULL(os.reviewed_base_price, 0)) AS prev
      FROM orders o
      LEFT JOIN order_stones os ON os.order_id = o.id
      WHERE 1=1
      ${dateFilter}
      ${brokerFilter}
      GROUP BY DATENAME(MONTH, o.created_at), MONTH(o.created_at)
      ORDER BY monthNo
    `;

    const lineChart = (await request.query(lineChartQuery)).recordset;

    /* ------------------------------------------------
       3. PIE CHART – ORDER STATUS DISTRIBUTION
    ------------------------------------------------ */
    const pieChartQuery = `
      SELECT
        o.status AS name,
        COUNT(*) AS value
      FROM orders o
      WHERE 1=1
      ${dateFilter}
      ${brokerFilter}
      GROUP BY o.status
    `;

    const pieChart = (await request.query(pieChartQuery)).recordset;

    /* ------------------------------------------------
       4. BROKER TABLE
    ------------------------------------------------ */
    const brokerQuery = `
      SELECT
        mo.master_name AS name,
        COUNT(o.id) AS orders,
        SUM(CASE WHEN o.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN o.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        CONCAT(
          CAST(AVG(ISNULL(os.reviewed_discount, 0)) AS INT),
          '%'
        ) AS discount,
        CONCAT(
          '₹',
          FORMAT(SUM(ISNULL(os.reviewed_final_price, 0)), 'N0')
        ) AS total
      FROM orders o
      LEFT JOIN master_options mo
        ON mo.id = o.broker_id
        AND mo.master_type = 'BROKER'
      LEFT JOIN order_stones os ON os.order_id = o.id
      WHERE 1=1
      ${dateFilter}
      GROUP BY mo.master_name
      ORDER BY total DESC
    `;

    const brokers = (await request.query(brokerQuery)).recordset;

    /* ------------------------------------------------
       5. STONE TABLE
    ------------------------------------------------ */
    const stoneQuery = `
      SELECT
        os.stone_name AS name,
        COUNT(DISTINCT o.id) AS active,
        CONCAT(SUM(os.quantity), ' pcs') AS qty
      FROM order_stones os
      INNER JOIN orders o ON o.id = os.order_id
      WHERE o.status = 'ACTIVE'
      ${dateFilter}
      GROUP BY os.stone_name
      ORDER BY active DESC
    `;

    const stones = (await request.query(stoneQuery)).recordset;

    /* ------------------------------------------------
       FINAL RESPONSE
    ------------------------------------------------ */
    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalOrders: stats.totalOrders,
          pendingReview: stats.pendingReview,
          confirmed: stats.confirmed,
          activeOrders: stats.activeOrders,
          delayedOrders: stats.delayedOrders,
          completedOrders: stats.completedOrders,
        },
        lineChart,
        pieChart,
        brokers,
        stones,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
    });
  }
};
