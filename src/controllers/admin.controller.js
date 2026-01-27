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


export const getOperatorDashboardController = async (req, res) => {
  try {
    const pool = await getDbPool();
    const { operatorId } = req.query;

    const request = pool.request();
    if (operatorId) {
      request.input("operatorId", sql.Int, operatorId);
    }

    const statsQuery = `
      SELECT
  COUNT(DISTINCT id) AS totalOrders,
  SUM(CASE WHEN status = 'REVIEW' AND isReviewed != 1 THEN 1 ELSE 0 END) AS sentForReview,
  SUM(CASE WHEN received_status IS NULL THEN 1 ELSE 0 END) AS pendingOrders,
  SUM(CASE WHEN received_status IS NOT NULL THEN 1 ELSE 0 END) AS completedOrders
FROM orders 
`;

    const stats = (await request.query(statsQuery)).recordset[0];
    console.log(stats,'stats')

    const receivedChartQuery = `
      SELECT
        DATENAME(MONTH, o.created_at) AS label,
        COUNT(*) AS count
      FROM orders o
      WHERE o.created_at >= DATEADD(MONTH, -7, GETDATE())
      GROUP BY DATENAME(MONTH, o.created_at), MONTH(o.created_at)
      ORDER BY MONTH(o.created_at)
    `;

    const receivedChart = (await request.query(receivedChartQuery)).recordset;


    const reviewStatusQuery = `
SELECT
  SUM(CASE WHEN receive_review_status IS NULL THEN 1 ELSE 0 END) AS received,
  SUM(CASE WHEN receive_review_status = 'Pending' THEN 1 ELSE 0 END) AS sentForReview,
  SUM(CASE WHEN receive_review_status = 'Approved' THEN 1 ELSE 0 END) AS completed
FROM order_stones;
 `;

    const reviewStatus = (await request.query(reviewStatusQuery)).recordset[0];

//     const timelineQuery = `
// SELECT
//   SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS ordered,
//   SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS inTransit,
//   SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS received,
//   SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) AS sentForReview,
//   SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) AS completed
// FROM orders;

//     `;

//     const timeline = (await request.query(timelineQuery)).recordset[0];

    const assignedOrdersQuery = `
SELECT TOP 10
  o.order_no AS id,
  b.broker_name AS broker,
  FORMAT(o.delivery_date, 'dd MMM yyyy') AS date,
  CONCAT(o.total_quantity, ' Pcs') AS qty,
  CASE
    WHEN o.delivery_date < CAST(GETDATE() AS DATE) THEN 'Delayed'
    WHEN o.delivery_date = CAST(GETDATE() AS DATE) THEN 'Due Today'
    ELSE 'On Time'
  END AS sla
FROM orders o
LEFT JOIN broker_master b ON b.id = o.broker_id
WHERE o.status IN ('REVIEW')
ORDER BY o.created_at DESC;

    `;

    const assignedOrders = (await request.query(assignedOrdersQuery)).recordset;

    const recentActivityQuery = `
SELECT TOP 10
  o.order_no AS id,
  CASE
    WHEN os.receive_review_status = 'Approved' THEN 'Reviewed'
    WHEN os.receive_review_status = 'Pending' THEN 'Sent for Review'
    ELSE 'Updated'
  END AS type,
  FORMAT(os.receive_reviewed_at, 'dd MMM yyyy') AS date,
  FORMAT(os.receive_reviewed_at, 'hh:mm tt') AS time,
  CASE
    WHEN os.receive_review_status = 'Approved' THEN 'Success'
    ELSE 'Pending'
  END AS status
FROM order_stones os
INNER JOIN orders o ON o.id = os.order_id
WHERE os.receive_reviewed_at IS NOT NULL
ORDER BY os.receive_reviewed_at DESC;
 `;

    const recentActivity = (await request.query(recentActivityQuery)).recordset;

    return res.status(200).json({
      success: true,
      data: {
        stats,
        receivedChart,
        reviewStatus,
        // timeline,
        assignedOrders,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Operator Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load operator dashboard",
    });
  }
};

export const ORDER_STATUS = {
  ORDERED: 0,
  IN_TRANSIT: 1,
  RECEIVED: 2,
  SENT_FOR_REVIEW: 3,
  COMPLETED: 4,
};

export const RECEIVE_STATUS = {
  NOT_RECEIVED: 0,
  RECEIVED: 1,
  RETURNED: 2,
};

export const RECEIVE_REVIEW_STATUS = {
  PENDING: 0,
  SENT_FOR_REVIEW: 1,
  REVIEW_COMPLETED: 2,
};
