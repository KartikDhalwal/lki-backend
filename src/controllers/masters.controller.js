import sql from "mssql";
import { getDbPool } from "../utils/db.config.js";
export const getStoneController = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const search = req.query.search || null;
    const offset = (page - 1) * limit;

    const pool = await getDbPool();

    const dataQuery = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT
          id,
          sku AS code,
          stone_name AS stoneName,
          family,
          stone_type AS category,
          size,
          shape,
          quality AS grade,
          colour,
          mou,
          grs AS certificate,
          min_height AS minHeight,
          max_height AS maxHeight,
          mou_type AS mouType,
          cut
        FROM stone_master
        WHERE
          (@search IS NULL
            OR sku LIKE '%' + @search + '%'
            OR stone_name LIKE '%' + @search + '%'
          )
        ORDER BY id DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    const countQuery = await pool
      .request()
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT COUNT(*) AS total
        FROM stone_master
        WHERE
          (@search IS NULL
            OR sku LIKE '%' + @search + '%'
            OR stone_name LIKE '%' + @search + '%'
          )
      `);

    res.json({
      success: true,
      data: dataQuery.recordset,
      pagination: {
        page,
        limit,
        totalItems: countQuery.recordset[0].total,
        totalPages: Math.ceil(countQuery.recordset[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Stone Master Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stone master data",
    });
  }
};

export const getStoneMasterController = async (req, res) => {
  try {
    const pool = await getDbPool();

    const dataQuery = await pool
      .request()
      .query(`
        SELECT
            id as value,
            stone_name AS stoneName,
            sku AS label,
          family,
          stone_type AS category,
          size,
          shape,
          quality AS grade,
          colour,
          mou,
          grs AS certificate,
          min_height AS minHeight,
          max_height AS maxHeight,
          mou_type AS mouType,
          cut
        FROM stone_master
      `);

    res.json({
      success: true,
      data: dataQuery.recordset,
    });
  } catch (error) {
    console.error("Stone Master Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stone master data",
    });
  }
};
export const postStoneController = async (req, res) => {
  try {
    const {
      code,
      stoneName,
      family,
      category,
      size,
      shape,
      grade,
      colour,
      mou,
      certificate,
      minHeight,
      maxHeight,
      mouType,
      cut
    } = req.body;

    if (!code || !stoneName) {
      return res.status(400).json({
        success: false,
        message: "Stone code and name are required",
      });
    }

    const pool = await getDbPool();

    /* ---- Check Duplicate Code ---- */
    const duplicate = await pool
      .request()
      .input("sku", sql.NVarChar, code)
      .query(`SELECT id FROM stone_master WHERE sku = @sku`);

    if (duplicate.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Stone code already exists",
      });
    }

    /* ---- Insert Stone ---- */
    await pool
      .request()
      .input("sku", sql.NVarChar, code)
      .input("stone_name", sql.NVarChar, stoneName)
      .input("family", sql.NVarChar, family || null)
      .input("stone_type", sql.NVarChar, category || null)
      .input("size", sql.NVarChar, size || null)
      .input("shape", sql.NVarChar, shape || null)
      .input("quality", sql.NVarChar, grade || null)
      .input("colour", sql.NVarChar, colour || null)
      .input("mou", sql.NVarChar, mou || null)
      .input("grs", sql.NVarChar, certificate || null)
      .input("min_height", sql.Int, minHeight || null)
      .input("max_height", sql.Int, maxHeight || null)
      .input("mou_type", sql.NVarChar, mouType || null)
      .input("cut", sql.NVarChar, cut || null)
      .query(`
        INSERT INTO stone_master (
          sku,
          stone_name,
          family,
          stone_type,
          size,
          shape,
          quality,
          colour,
          mou,
          grs,
          min_height,
          max_height,
          mou_type,
          cut
        )
        VALUES (
          @sku,
          @stone_name,
          @family,
          @stone_type,
          @size,
          @shape,
          @quality,
          @colour,
          @mou,
          @grs,
          @min_height,
          @max_height,
          @mou_type,
          @cut
        )
      `);

    res.status(201).json({
      success: true,
      message: "Stone created successfully",
    });
  } catch (error) {
    console.error("Create Stone Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create stone",
    });
  }
};


export const getToolsController = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const search = req.query.search || null;
    const offset = (page - 1) * limit;

    const pool = await getDbPool();

    const dataQuery = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT
          id,
          tool_code AS toolCode,
          tool_name AS toolName,
          type,
          usage,
          comments,
          notes,
          mou,
          category
        FROM tool_master
        WHERE
          (@search IS NULL
            OR tool_code LIKE '%' + @search + '%'
            OR tool_name LIKE '%' + @search + '%'
          )
        ORDER BY id DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    const countQuery = await pool
      .request()
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT COUNT(*) AS total
        FROM tool_master
        WHERE
          (@search IS NULL
            OR tool_code LIKE '%' + @search + '%'
            OR tool_name LIKE '%' + @search + '%'
          )
      `);

    res.json({
      success: true,
      data: dataQuery.recordset,
      pagination: {
        page,
        limit,
        totalItems: countQuery.recordset[0].total,
        totalPages: Math.ceil(countQuery.recordset[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch Tool Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tools",
    });
  }
};

export const getToolsMasterController = async (req, res) => {
  try {
    const pool = await getDbPool();

    const dataQuery = await pool
      .request()
      .query(`
        SELECT
          id as value,
          tool_name AS label,
          type,
          usage,
          comments,
          notes,
          mou,
          category
        FROM tool_master
      `);

    res.json({
      success: true,
      data: dataQuery.recordset
    });
  } catch (error) {
    console.error("Fetch Tool Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tools",
    });
  }
};

export const postToolsController = async (req, res) => {
  try {
    const {
      toolCode,
      toolName,
      type,
      usage,
      comments,
      notes,
      mou,
      category,
    } = req.body;

    if (!toolName) {
      return res.status(400).json({
        success: false,
        message: "Tool name is required",
      });
    }

    const pool = await getDbPool();

    /* ---- Duplicate Check ---- */
    const exists = await pool
      .request()
      .input("tool_code", sql.NVarChar, toolCode)
      .query(`SELECT id FROM tool_master WHERE tool_code = @tool_code`);

    if (exists.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tool code already exists",
      });
    }

    /* ---- Insert Tool ---- */
    await pool
      .request()
      .input("tool_code", sql.NVarChar, toolCode)
      .input("tool_name", sql.NVarChar, toolName)
      .input("type", sql.NVarChar, type || null)
      .input("usage", sql.NVarChar, usage || null)
      .input("comments", sql.NVarChar, comments || null)
      .input("notes", sql.NVarChar, notes || null)
      .input("mou", sql.NVarChar, mou || null)
      .input("category", sql.NVarChar, category || null)
      .query(`
        INSERT INTO tool_master (
          tool_code,
          tool_name,
          type,
          usage,
          comments,
          notes,
          mou,
          category
        )
        VALUES (
          @tool_code,
          @tool_name,
          @type,
          @usage,
          @comments,
          @notes,
          @mou,
          @category
        )
      `);

    res.status(201).json({
      success: true,
      message: "Tool created successfully",
    });
  } catch (error) {
    console.error("Create Tool Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create tool",
    });
  }
};


export const getBrokersController = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const search = req.query.search || null;
    const offset = (page - 1) * limit;

    const pool = await getDbPool();

    const dataQuery = await pool
      .request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT
          id,
          broker_code AS brokerCode,
          broker_name AS brokerName,
          phone_number AS phoneNumber,
          city,
          gst_number AS gstNumber,
          status
        FROM broker_master
        WHERE
          (@search IS NULL OR broker_code LIKE '%' + @search + '%'
           OR broker_name LIKE '%' + @search + '%')
        ORDER BY id DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    const countQuery = await pool
      .request()
      .input("search", sql.NVarChar, search)
      .query(`
        SELECT COUNT(*) AS total
        FROM broker_master
        WHERE
          (@search IS NULL OR broker_code LIKE '%' + @search + '%'
           OR broker_name LIKE '%' + @search + '%')
      `);

    res.json({
      success: true,
      data: dataQuery.recordset,
      pagination: {
        page,
        limit,
        totalItems: countQuery.recordset[0].total,
        totalPages: Math.ceil(countQuery.recordset[0].total / limit),
      },
    });
  } catch (err) {
    console.error("Fetch Broker Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch brokers",
    });
  }
};
export const getBrokersMasterController = async (req, res) => {
  try {
    const pool = await getDbPool();

    const dataQuery = await pool
      .request()
      .query(`
        SELECT
          id as value,
          broker_name AS label
        FROM broker_master`);

    res.json({
      success: true,
      data: dataQuery.recordset
    });
  } catch (err) {
    console.error("Fetch Broker Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch brokers",
    });
  }
};

export const postBrokersController = async (req, res) => {
  try {
    const {
      // brokerCode,
      brokerName,
      phoneNumber,
      alternateNumber,
      city,
      gstNumber,
      address,
      status,
      bankAcNo,
      bankName,
    } = req.body;

    if (!brokerName) {
      return res.status(400).json({
        success: false,
        message: "Broker Name are required",
      });
    }

    const pool = await getDbPool();

    // const exists = await pool
    //   .request()
    //   .input("brokerCode", sql.NVarChar, brokerCode)
    //   .query(`SELECT id FROM broker_master WHERE broker_code = @brokerCode`);

    // if (exists.recordset.length) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Broker code already exists",
    //   });
    // }

    await pool
      .request()
      // .input("broker_code", sql.NVarChar, brokerCode)
      .input("broker_name", sql.NVarChar, brokerName)
      .input("phone_number", sql.NVarChar, phoneNumber)
      .input("alternate_number", sql.NVarChar, alternateNumber)
      .input("city", sql.NVarChar, city)
      .input("gst_number", sql.NVarChar, gstNumber)
      .input("address", sql.NVarChar, address)
      .input("status", sql.NVarChar, status || "Active")
      .input("bankAcNo", sql.NVarChar, bankAcNo)
      .input("bankName", sql.NVarChar, bankName)
      .query(`
        INSERT INTO broker_master
        (broker_name, phone_number, alternate_number, city, gst_number, address, status,bankAcNo,bankName)
        VALUES
        (@broker_name, @phone_number, @alternate_number, @city, @gst_number, @address, @status,@bankAcNo,@bankName)
      `);

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Create Broker Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create broker",
    });
  }
};

export const addMasterOptionController = async (req, res) => {
  const { type, value } = req.body;

  if (!type || !value) {
    return res.status(400).json({
      success: false,
      message: "master type and value are required",
    });
  }

  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1️⃣ Check duplicate (type + name)
    const existsRequest = new sql.Request(transaction);
    const exists = await existsRequest
      .input("master_type", sql.NVarChar, type)
      .input("master_name", sql.NVarChar, value)
      .query(`
        SELECT 1
        FROM master_options
        WHERE master_type = @master_type
          AND master_name = @master_name
      `);

    if (exists.recordset.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `${value} already exists in ${type}`,
      });
    }

    // 2️⃣ Get next master_code WITH LOCK (CRITICAL)
    const codeRequest = new sql.Request(transaction);
    const maxCodeResult = await codeRequest
      .input("master_type", sql.NVarChar, type)
      .query(`
        SELECT ISNULL(MAX(master_code), 0) AS maxCode
        FROM master_options WITH (UPDLOCK, HOLDLOCK)
        WHERE master_type = @master_type
      `);

    const nextMasterCode = maxCodeResult.recordset[0].maxCode + 1;

    // 3️⃣ Insert new record
    const insertRequest = new sql.Request(transaction);
    await insertRequest
      .input("master_code", sql.Int, nextMasterCode)
      .input("master_type", sql.NVarChar, type)
      .input("master_name", sql.NVarChar, value)
      .input("isActive", sql.Bit, 1)
      .query(`
        INSERT INTO master_options
          (master_code, master_type, master_name, isActive)
        VALUES
          (@master_code, @master_type, @master_name, @isActive)
      `);

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Master option added successfully",
      data: {
        master_code: nextMasterCode,
        master_type: type,
        master_name: value,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Add Master Option Error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};

export const getMasterOptions = async (req, res) => {
  const { type } = req.params;

  try {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input("type", sql.NVarChar, type)
      .query(`
        SELECT master_code as id, master_name as name
        FROM master_options
        WHERE master_type = @type AND isActive = 1
        ORDER BY name
      `);

    return res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};