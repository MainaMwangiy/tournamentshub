import jwt from "jsonwebtoken"
import { pool } from "../config/database.js"

class AuthService {
  // SSO Login - create or get user
async ssoLogin(userData) {
  const client = await pool.connect()
  try {
    const { user_id: uid, email, name, image_url: picture } = userData

    // Check if user exists
    const userQuery = "SELECT * FROM users WHERE email = $1 AND is_deleted = 0"
    const userResult = await client.query(userQuery, [email])

    let user;
    if (userResult.rows.length === 0) {
      // Create new user - use name as username
      const insertQuery = `
        INSERT INTO users (username, email, name, profile_picture, google_uid, is_active, created_on, modified_on)
        VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW())
        RETURNING *
      `
      const insertResult = await client.query(insertQuery, [name, email, name, picture, uid])
      user = insertResult.rows[0]
    } else {
      // Update existing user
      const updateQuery = `
        UPDATE users 
        SET name = $1, profile_picture = $2, google_uid = $3, modified_on = NOW()
        WHERE email = $4 AND is_deleted = 0
        RETURNING *
      `
      const updateResult = await client.query(updateQuery, [name, picture, uid, email])
      user = updateResult.rows[0]
    }

    // Generate JWT token
    const token = this.generateToken(user)
    const refreshToken = this.generateRefreshToken(user)

    // Save refresh token to database
    await this.saveRefreshToken(client, user.id, refreshToken)

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile_picture: user.profile_picture,
        is_admin: user.role === 'admin',
      },
      token,
      refreshToken,
    }
  } catch (error) {
    console.log(`SSO Login failed: ${error.message}`)
    throw new Error(`SSO Login failed: ${error.message}`)
  } finally {
    client.release()
  }
}
  // Generate JWT access token (expires in 1 hour)
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    )
  }

  // Generate refresh token (expires in 7 days)
  generateRefreshToken(user) {
    return jwt.sign({ id: user.id, type: "refresh" }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
      expiresIn: "7d",
    })
  }

  // Save refresh token to database
  async saveRefreshToken(client, userId, refreshToken) {
    const query = `
      INSERT INTO user_refresh_tokens (user_id, token, expires_at, created_on)
      VALUES ($1, $2, NOW() + INTERVAL '7 days', NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '7 days', modified_on = NOW()
    `
    await client.query(query, [userId, refreshToken])
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    const client = await pool.connect()
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)

      // Check if refresh token exists in database and is valid
      const tokenQuery = `
        SELECT rt.*, u.* FROM user_refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = $1 AND rt.expires_at > NOW() AND u.is_deleted = 0 AND u.is_active = 1
      `
      const tokenResult = await client.query(tokenQuery, [refreshToken])

      if (tokenResult.rows.length === 0) {
        throw new Error("Invalid or expired refresh token")
      }

      const user = tokenResult.rows[0]

      // Generate new access token
      const newAccessToken = this.generateToken(user)

      return {
        success: true,
        token: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile_picture: user.profile_picture,
          is_admin: user.is_admin || false,
        },
      }
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`)
    } finally {
      client.release()
    }
  }

  // Logout - invalidate refresh token
  async logout(userId) {
    const client = await pool.connect()
    try {
      await client.query("DELETE FROM user_refresh_tokens WHERE user_id = $1", [userId])
      return { success: true, message: "Logged out successfully" }
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`)
    } finally {
      client.release()
    }
  }

  // Verify user exists and is active
  async verifyUser(userId) {
    const client = await pool.connect()
    try {
      const query = "SELECT * FROM users WHERE id = $1 AND is_deleted = 0 AND is_active = 1"
      const result = await client.query(query, [userId])
      return result.rows[0] || null
    } catch (error) {
      throw new Error(`User verification failed: ${error.message}`)
    } finally {
      client.release()
    }
  }
}

export default new AuthService()
