import sql from "mssql";
import { getDbPool } from "../utils/db.config.js";
import ExcelJS from "exceljs"
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
          cut,
          isActive
        FROM stone_master
        WHERE
          (@search IS NULL
            OR sku LIKE '%' + @search + '%'
            OR stone_name LIKE '%' + @search + '%'
          )
        ORDER BY stoneName ASC
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
            UPPER(stone_name) AS stoneName,
            UPPER(sku) AS label,
          UPPER(family) as family,
          UPPER(stone_type) AS category,
          size,
          UPPER(shape) as shape,
          UPPER(quality) AS grade,
          UPPER(colour) as colour,
          UPPER(mou) as mou,
          UPPER(grs) AS certificate,
          min_height AS minHeight,
          max_height AS maxHeight,
          UPPER(mou_type) AS mouType,
          UPPER(cut) as cut
        FROM stone_master 
        WHERE isActive = 1
        ORDER BY stoneName ASC
      `);
        console.log(dataQuery.recordset,'hfcgvjhbk')
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
      cut,
    } = req.body;

    const imageFileName = req.file ? req.file.filename : null;

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
    const minHeightVal = minHeight ? parseFloat(minHeight) : null;
    const maxHeightVal = maxHeight ? parseFloat(maxHeight) : null;

    if (minHeightVal !== null && isNaN(minHeightVal)) {
      return res.status(400).json({ success: false, message: "Invalid min height" });
    }

    if (maxHeightVal !== null && isNaN(maxHeightVal)) {
      return res.status(400).json({ success: false, message: "Invalid max height" });
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
      .input("min_height", sql.Decimal(10, 2), minHeight ? Number(minHeight) : null)
      .input("max_height", sql.Decimal(10, 2), maxHeight ? Number(maxHeight) : null)
      .input("mou_type", sql.NVarChar, mouType || null)
      .input("cut", sql.NVarChar, cut || null)
      .input("image", sql.NVarChar, imageFileName)
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
          cut,
          image
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
          @cut,
          @image
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
          tool_name AS toolName,
          type,
          usage,
          comments,
          notes,
          mou,
          category,
          isActive
        FROM tool_master
        WHERE
          (@search IS NULL
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
          UPPER(tool_name) AS label,
          UPPER(type) as type,
          UPPER(usage) as usage,
          UPPER(comments) as comments,
          UPPER(notes) as notes,
          UPPER(mou) as mou,
          UPPER(category) as category
        FROM tool_master
        WHERE isActive = 1
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
  console.log(req.body, 'req.body')
  try {
    const {
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


    /* ---- Insert Tool ---- */
    await pool
      .request()
      .input("tool_name", sql.NVarChar, toolName)
      .input("type", sql.NVarChar, type || null)
      .input("usage", sql.NVarChar, usage || null)
      .input("comments", sql.NVarChar, comments || null)
      .input("notes", sql.NVarChar, notes || null)
      .input("mou", sql.NVarChar, mou || null)
      .input("category", sql.NVarChar, category || null)
      .query(`
        INSERT INTO tool_master (
          tool_name,
          type,
          usage,
          comments,
          notes,
          mou,
          category
        )
        VALUES (
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
          status,
          isActive,
          companyName,
          alternate_number,
          bankAcNo,
          bankName,
          entityType,
          address,contactPerson
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
          UPPER(broker_name) AS label
        FROM broker_master
                WHERE isActive = 1 AND entityType = 'Broker'
        `);

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
export const getManufacturerMasterController = async (req, res) => {
  try {
    const pool = await getDbPool();

    const dataQuery = await pool
      .request()
      .query(`
        SELECT
          id as value,
          UPPER(broker_name) AS label
        FROM broker_master
                WHERE isActive = 1 AND entityType = 'Manufacturer'
        `);

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
      companyName,
      contactPerson,
      entityType
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
      .input("companyName", sql.NVarChar, companyName)
      .input("entityType", sql.NVarChar, entityType)
      .input("contactPerson", sql.NVarChar, contactPerson)
      .query(`
        INSERT INTO broker_master
        (broker_name, phone_number, alternate_number, city, gst_number, address, status,bankAcNo,bankName,companyName,entityType,contactPerson)
        VALUES
        (@broker_name, @phone_number, @alternate_number, @city, @gst_number, @address, @status,@bankAcNo,@bankName,@companyName,@entityType,@contactPerson)
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
        SELECT master_code as id, UPPER(master_name) as name
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

export const createPriceLogicController = async (req, res) => {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      status,
      applicabilityType, // "stone" | "tool"
      stone,
      stoneName,
      tool,
      toolName,
      basePrice,
      minPrice,
      maxPrice,
      updatedBy,
    } = req.body;

    if (!basePrice) {
      return res.status(400).json({ success: false, message: "Base price is required" });
    }

    if (applicabilityType === "stone" && !stone) {
      return res.status(400).json({ success: false, message: "Stone is required" });
    }

    if (applicabilityType === "tool" && !tool) {
      return res.status(400).json({ success: false, message: "Tool is required" });
    }

    await transaction.begin();

    /* --------------------------------------------------
       🔴 DUPLICATE ACTIVE CHECK (use a fresh Request)
       -------------------------------------------------- */
    if (status === 1 || status === true) {
      if (applicabilityType === "stone") {
        const checkReq = new sql.Request(transaction);
        const existingActive = await checkReq
          .input("stoneId", sql.Int, Number(stone))
          .query(`
            SELECT TOP 1 id
            FROM PriceLogicMaster
            WHERE stoneId = @stoneId
              AND status = 1
              AND applicabilityType = 'stone'
          `);

        if (existingActive.recordset.length > 0) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            message: "Active price logic already exists for this stone.",
          });
        }
      }

      if (applicabilityType === "tool") {
        const checkReq = new sql.Request(transaction);
        const existingActive = await checkReq
          .input("toolId", sql.Int, Number(tool))
          .query(`
            SELECT TOP 1 id
            FROM PriceLogicMaster
            WHERE toolId = @toolId
              AND status = 1
              AND applicabilityType = 'tool'
          `);

        if (existingActive.recordset.length > 0) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            message: "Active price logic already exists for this tool.",
          });
        }
      }
    }

    /* --------------------------------------------------
       ✅ INSERT (use another fresh Request)
       -------------------------------------------------- */
    const insertReq = new sql.Request(transaction);

    await insertReq
      .input("status", sql.Bit, status ? 1 : 0)
      .input("applicabilityType", sql.VarChar(20), applicabilityType)
      .input("stoneId", sql.Int, applicabilityType === "stone" ? Number(stone) : null)
      .input("stoneName", sql.VarChar(100), applicabilityType === "stone" ? stoneName : null)
      .input("toolId", sql.Int, applicabilityType === "tool" ? Number(tool) : null)
      .input("toolName", sql.VarChar(100), applicabilityType === "tool" ? toolName : null)
      .input("basePrice", sql.Decimal(18, 2), Number(basePrice))
      .input("minPrice", sql.Decimal(18, 2), minPrice ? Number(minPrice) : null)
      .input("maxPrice", sql.Decimal(18, 2), maxPrice ? Number(maxPrice) : null)
      .input("createdBy", sql.VarChar(100), updatedBy || "System")
      .query(`
        INSERT INTO PriceLogicMaster (
          status,
          applicabilityType,
          stoneId,
          stoneName,
          toolId,
          toolName,
          basePrice,
          minPrice,
          maxPrice,
          createdBy
        )
        VALUES (
          @status,
          @applicabilityType,
          @stoneId,
          @stoneName,
          @toolId,
          @toolName,
          @basePrice,
          @minPrice,
          @maxPrice,
          @createdBy
        )
      `);

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Price Logic created successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Price Logic Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create price logic" });
  }
};




export const getNextPriceLogicIdController = async (req, res) => {
  try {
    const pool = await getDbPool();

    const result = await pool.request().query(`
      SELECT ISNULL(MAX(id), 0) + 1 AS nextId
      FROM PriceLogicMaster
    `);

    return res.status(200).json({
      success: true,
      nextId: result.recordset[0].nextId,
    });
  } catch (error) {
    console.error("Get Next ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch next id",
    });
  }
};

export const listPriceLogicController = async (req, res) => {
  try {
    const pool = await getDbPool();

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.limit) || 10;
    const search = req.query.search?.toString().trim() || "";

    const offset = (page - 1) * pageSize;

    const request = pool.request()
      .input("search", sql.VarChar(100), `%${search}%`)
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize);

    /* ---------- Count ---------- */
    const countResult = await request.query(`
      SELECT COUNT(*) AS total
      FROM PriceLogicMaster
      WHERE
        (@search = '%%')
        OR stoneName LIKE @search
        OR toolName LIKE @search
        OR CAST(stoneId AS VARCHAR) LIKE @search
        OR CAST(toolId AS VARCHAR) LIKE @search
    `);

    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    /* ---------- Data ---------- */
    const dataResult = await request.query(`
      SELECT
        id,
        status,
        applicabilityType,
        stoneId,
        stoneName,
        toolId,
        toolName,
        basePrice,
        minPrice,
        maxPrice,
        createdBy,
        createdOn
      FROM PriceLogicMaster
      WHERE
        (@search = '%%')
        OR stoneName LIKE @search
        OR toolName LIKE @search
        OR CAST(stoneId AS VARCHAR) LIKE @search
        OR CAST(toolId AS VARCHAR) LIKE @search
      ORDER BY id DESC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
    `);

    return res.status(200).json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("List Price Logic Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch price logic list",
    });
  }
};


export const togglePriceLogicStatusController = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getDbPool();

    await pool
      .request()
      .input("id", sql.Int, Number(id))
      .query(`
        UPDATE PriceLogicMaster
        SET status = CASE WHEN status = 1 THEN 0 ELSE 1 END
        WHERE id = @id
      `);

    return res.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (err) {
    console.error("Toggle Price Logic Status Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

export const exportStoneImportTemplateController = async (req, res) => {
  try {
    const pool = await getDbPool();

    /* ---------------- Fetch master options ---------------- */
    const result = await pool.request().query(`
      SELECT master_type, master_name
      FROM master_options
      WHERE isActive = 1
      ORDER BY master_type, master_name
    `);

    const grouped = {};
    result.recordset.forEach(({ master_type: type, master_name: value }) => {
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(value);
    });

    const workbook = new ExcelJS.Workbook();

    /* ---------------- Sheet 1: Import Template ---------------- */
    const templateSheet = workbook.addWorksheet("Stone_Import_Template");

    /** 🔹 Column definition WITH colour metadata */
    const columns = [
      { header: "stoneName", key: "stoneName", width: 25, colour: "yellow" },
      { header: "family", key: "family", width: 20, colour: "red" },
      { header: "category", key: "category", width: 15, colour: "red" },
      { header: "size", key: "size", width: 15, colour: "yellow" },
      { header: "shape", key: "shape", width: 20, colour: "red" },
      { header: "grade", key: "grade", width: 20, colour: "red" },
      { header: "colour", key: "colour", width: 20, colour: "red" },
      { header: "minHeight", key: "minHeight", width: 15, colour: "yellow" },
      { header: "maxHeight", key: "maxHeight", width: 15, colour: "yellow" },
      { header: "mouType", key: "mouType", width: 15, colour: "red" },
      { header: "cut", key: "cut", width: 25, colour: "red" },
    ];

    /** 🔹 Assign columns WITHOUT colour (exceljs-safe) */
    templateSheet.columns = columns.map(({ colour, ...col }) => col);

    /* ---------------- Header Styling ---------------- */
    const COLOR_MAP = {
      yellow: "FFFF00",
      red: "FF4D4D",
    };

    const headerRow = templateSheet.getRow(1);

    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);

      if (col.colour) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR_MAP[col.colour] },
        };
      }

      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    headerRow.commit();

    /* ---------------- Sheet 2: Reference Data ---------------- */
    const refSheet = workbook.addWorksheet("Reference_Data");

    let colIndex = 1;
    for (const type in grouped) {
      refSheet.getCell(1, colIndex).value = type.toUpperCase();
      refSheet.getCell(1, colIndex).font = { bold: true };

      grouped[type].forEach((val, i) => {
        refSheet.getCell(i + 2, colIndex).value = val;
      });

      refSheet.getColumn(colIndex).width = 25;
      colIndex++;
    }

    /* ---------------- Response ---------------- */
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Stone_Import_Template.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Export Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate Excel template",
    });
  }
};

export const importStoneExcelController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.getWorksheet("Stone_Import_Template");
    if (!sheet) {
      return res.status(400).json({
        success: false,
        message: "Invalid template",
      });
    }

    const pool = await getDbPool();

    // Load master options into memory
    const masterRes = await pool.request().query(`
  SELECT master_type, master_name
  FROM master_options
  WHERE isActive = 1
`);


    const masterMap = {};
    masterRes.recordset.forEach(({ master_type, master_name }) => {
      if (!masterMap[master_type]) masterMap[master_type] = new Set();
      masterMap[master_type].add(master_name);
    });


    const errors = [];
    let successCount = 0;

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const data = {
        stoneName: row.getCell(1)?.value?.toString().trim(),
        family: row.getCell(2)?.value,
        category: row.getCell(3)?.value,
        size: row.getCell(4)?.value,
        shape: row.getCell(5)?.value,
        grade: row.getCell(6)?.value,
        colour: row.getCell(7)?.value,
        minHeight: row.getCell(8)?.value,
        maxHeight: row.getCell(9)?.value,
        mouType: row.getCell(10)?.value,
        cut: row.getCell(11)?.value,
      };




      if (!data.stoneName) {
        errors.push(`Row ${i}: Stone Name is required`);
        continue;
      }
      const sku = generateStoneCode(data);

      const duplicate = await pool
        .request()
        .input("sku", sql.NVarChar, sku)
        .query(`SELECT id FROM stone_master WHERE sku = @sku`);

      if (duplicate.recordset.length) {
        errors.push(`Row ${i}: Duplicate stone detected (${sku})`);
        continue;
      }



      // Validate dropdown fields
      const validations = [
        ["family", data.family],
        ["category", data.category],
        ["shape", data.shape],
        ["grade", data.grade],
        ["colour", data.colour],
        ["cut", data.cut],
        ["mouType", data.mouType],
      ];

      const invalid = validations.find(
        ([type, val]) => val && !masterMap[type]?.has(val)
      );

      if (invalid) {
        errors.push(`Row ${i}: Invalid ${invalid[0]} value`);
        continue;
      }

      try {
        await pool
          .request()
          .input("sku", sql.NVarChar, sku)
          .input("stone_name", sql.NVarChar, data.stoneName)
          .input("family", sql.NVarChar, data.family || null)
          .input("stone_type", sql.NVarChar, data.category || null)
          .input("size", sql.NVarChar, data.size || null)
          .input("shape", sql.NVarChar, data.shape || null)
          .input("quality", sql.NVarChar, data.grade || null)
          .input("colour", sql.NVarChar, data.colour || null)
          .input("mou", sql.NVarChar, data.mou || null)
          .input("grs", sql.NVarChar, data.certificate || null)
          .input("min_height", sql.Int, data.minHeight || null)
          .input("max_height", sql.Int, data.maxHeight || null)
          .input("mou_type", sql.NVarChar, data.mouType || null)
          .input("cut", sql.NVarChar, data.cut || null)
          .query(`
    INSERT INTO stone_master (
      sku, stone_name, family, stone_type, size, shape,
      quality, colour, mou, grs,
      min_height, max_height, mou_type, cut
    )
    VALUES (
      @sku, @stone_name, @family, @stone_type, @size, @shape,
      @quality, @colour, @mou, @grs,
      @min_height, @max_height, @mou_type, @cut
    )
  `);


        successCount++;
      } catch (err) {
        errors.push(`Row ${i}: ${err.message}`);
      }
    }

    res.json({
      success: errors.length === 0,
      inserted: successCount,
      errors,
    });
  } catch (error) {
    console.error("Excel Import Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to import Excel",
    });
  }
};

const generateStoneCode = (data) => {
  const parts = [
    data.stoneName,
    data.family,
    data.category,
    data.size,
    data.shape,
    data.colour,
  ];

  return parts
    .filter(Boolean)
    .map((p) => p.toString().trim().toUpperCase().replace(/\s+/g, "-"))
    .join("-");
};

// controllers/master.controller.ts
export const toggleMasterStatusController = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { isActive } = req.body;

    const tableMap = {
      stone: "stone_master",
      tool: "tool_master",
      broker: "broker_master",
    };

    const table = tableMap[type];

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid master type",
      });
    }

    const pool = await getDbPool();

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("isActive", sql.Bit, isActive ? 1 : 0)
      .query(`
        UPDATE ${table}
        SET isActive = @isActive,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Toggle Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};
