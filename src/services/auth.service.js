import sql from "mssql";
import bcrypt from "bcryptjs";
import { getDbPool } from "../utils/db.config.js";
import { generateToken } from "../utils/jwt.js";

export const loginService = async (email, password, rememberMe = false) => {
  const pool = await getDbPool();

  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .query(`
      SELECT 
        id,
        username,
        email,
        mobileNumber,
        passwordHash,
        role,
        isActive
      FROM Users
      WHERE email = @email
    `);
  if (result.recordset.length === 0) {
    return {
      success: false,
      statusCode: 401,
      message: "Invalid email or password",
    };
  }

  const user = result.recordset[0];

  if (!user.isActive) {
    return {
      success: false,
      statusCode: 403,
      message: "Your account is deactivated. Please contact admin.",
    };
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    return {
      success: false,
      statusCode: 401,
      message: "Invalid email or password",
    };
  }

  // ✅ Case 4: Successful login
  const token = generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    rememberMe
  );

  return {
    success: true,
    statusCode: 200,
    message: "Login successful",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: user.role,
    },
  };
};
