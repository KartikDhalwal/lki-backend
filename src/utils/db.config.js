import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),

  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: false,
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },

  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool;

export const getDbPool = async () => {
  try {
    if (!pool) {
      pool = await sql.connect(dbConfig);
      console.log("✅ MSSQL connected");
    }
    return pool;
  } catch (error) {
    console.error("❌ MSSQL connection failed:", error);
    throw error;
  }
};

export default sql;
