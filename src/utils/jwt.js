import jwt from "jsonwebtoken";

export const generateToken = (payload, rememberMe = false) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: rememberMe ? "7d" : "1d",
  });
};
