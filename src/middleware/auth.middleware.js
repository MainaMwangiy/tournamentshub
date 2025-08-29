import jwt from "jsonwebtoken"
import AuthService from "../services/auth.services.js"

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided or invalid format.",
      })
    }

    // Extract token
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token is required.",
      })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verify user still exists and is active
    const user = await AuthService.verifyUser(decoded.id)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. User not found or inactive.",
      })
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      is_admin: decoded.is_admin || false,
    }

    next()
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token has expired.",
        code: "TOKEN_EXPIRED",
      })
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token.",
        code: "INVALID_TOKEN",
      })
    } else {
      return res.status(500).json({
        success: false,
        message: "Internal server error during authentication.",
      })
    }
  }
}

// Admin middleware - requires user to be admin
export const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    })
  }
  next()
}

export default authMiddleware
