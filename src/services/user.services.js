import { DatabaseHelper } from "../config/database.js"
import logger from "../middleware/logger.js"
import { ValidationError, UnauthorizedError } from "../middleware/errors.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

class UsersService {
  static async register(userData) {
    const { username, email, password, role = "user" } = userData

    if (!username || !email || !password) {
      throw new ValidationError("Username, email, and password are required")
    }

    try {
      // Check if user exists
      const existingUser = await DatabaseHelper.executeQuery(
        "SELECT id FROM users WHERE username = $1 OR email = $2 AND is_deleted = 0",
        [username, email],
      )

      if (existingUser.rows.length > 0) {
        throw new ValidationError("User already exists")
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Insert user
      const result = await DatabaseHelper.executeQuery(
        "INSERT INTO users (id, username, email, password_hash, role, is_active, created_on, is_deleted) VALUES (uuid_generate_v4(), $1, $2, $3, $4, 1, CURRENT_TIMESTAMP, 0) RETURNING id, username, email, role, created_on",
        [username, email, hashedPassword, role],
      )

      const user = result.rows[0]
      logger.info(`User ${user.id} (${username}) registered successfully`)
      return user
    } catch (error) {
      logger.error(`Error registering user: ${error.message}`)
      throw error
    }
  }

  static async login(username, password) {
    if (!username || !password) {
      throw new ValidationError("Username and password are required")
    }

    try {
      const result = await DatabaseHelper.executeQuery(
        "SELECT id, username, email, password_hash, role FROM users WHERE username = $1 AND is_deleted = 0 AND is_active = 1",
        [username],
      )

      if (result.rows.length === 0) {
        throw new UnauthorizedError("Invalid credentials")
      }

      const user = result.rows[0]
      const isValidPassword = await bcrypt.compare(password, user.password_hash)

      if (!isValidPassword) {
        throw new UnauthorizedError("Invalid credentials")
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || "tournament_secret",
        { expiresIn: "24h" },
      )

      logger.info(`User ${user.id} (${username}) logged in successfully`)
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      }
    } catch (error) {
      logger.error(`Error logging in user: ${error.message}`)
      throw error
    }
  }

  static async adminLogin(password) {
    const adminPassword = process.env.ADMIN_PASSWORD || "admin"

    if (password !== adminPassword) {
      throw new UnauthorizedError("Invalid admin credentials")
    }

    // Generate admin token
    const token = jwt.sign(
      { id: "admin", username: "admin", role: "admin" },
      process.env.JWT_SECRET || "tournament_secret",
      { expiresIn: "24h" },
    )

    logger.info("Admin logged in successfully")
    return {
      user: {
        id: "admin",
        username: "admin",
        role: "admin",
      },
      token,
    }
  }

  static async getUserById(userId) {
    try {
      const result = await DatabaseHelper.executeQuery(
        "SELECT id, username, email, role, created_on FROM users WHERE id = $1 AND is_deleted = 0",
        [userId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("User not found")
      }

      return result.rows[0]
    } catch (error) {
      logger.error(`Error fetching user ${userId}: ${error.message}`)
      throw error
    }
  }

  static async getAllUsers() {
    try {
      const result = await DatabaseHelper.executeQuery(
        "SELECT id, username, email, role, created_on FROM users WHERE is_deleted = 0 ORDER BY created_on DESC",
      )
      return result.rows
    } catch (error) {
      logger.error(`Error fetching users: ${error.message}`)
      throw error
    }
  }

  static async updateUser(userId, userData, requesterId) {
    const { username, email } = userData

    try {
      const result = await DatabaseHelper.executeQuery(
        "UPDATE users SET username = $1, email = $2, modified_on = CURRENT_TIMESTAMP WHERE id = $3 AND is_deleted = 0 RETURNING id, username, email, role",
        [username, email, userId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("User not found")
      }

      logger.info(`User ${userId} updated by user ${requesterId}`)
      return result.rows[0]
    } catch (error) {
      logger.error(`Error updating user ${userId}: ${error.message}`)
      throw error
    }
  }

  static async deleteUser(userId, requesterId) {
    try {
      const result = await DatabaseHelper.executeQuery(
        "UPDATE users SET is_deleted = 1, modified_on = CURRENT_TIMESTAMP WHERE id = $1 AND is_deleted = 0 RETURNING id, username",
        [userId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("User not found")
      }

      logger.info(`User ${userId} soft deleted by user ${requesterId}`)
      return result.rows[0]
    } catch (error) {
      logger.error(`Error deleting user ${userId}: ${error.message}`)
      throw error
    }
  }
}

export default UsersService
