import jwt from "jsonwebtoken"
import AuthService from "../services/auth.services.js"

const AuthController = {
  ssoLogin: async (req, res) => {
    try {
      const { user_id, name, email, image_url } = req.body

      if (!user_id || !email || !name) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: user_id, email, name",
        })
      }

      const result = await AuthService.ssoLogin({ user_id, name, email, image_url })

      res.status(200).json({
        success: true,
        message: "SSO login successful",
        ...result,
      })
    } catch (error) {
      console.error("Error during SSO login:", error)
      res.status(500).json({
        success: false,
        message: "Internal server error during SSO login",
        error: error.message,
      })
    }
  },

  // <CHANGE> Added refresh token endpoint
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        })
      }

      const result = await AuthService.refreshToken(refreshToken)

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        ...result,
      })
    } catch (error) {
      console.error("Error during token refresh:", error)
      res.status(401).json({
        success: false,
        message: error.message,
      })
    }
  },

  // <CHANGE> Added logout endpoint
  logout: async (req, res) => {
    try {
      const userId = req.user.id

      const result = await AuthService.logout(userId)

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      })
    } catch (error) {
      console.error("Error during logout:", error)
      res.status(500).json({
        success: false,
        message: "Internal server error during logout",
        error: error.message,
      })
    }
  },

  // <CHANGE> Added profile endpoint to get current user
  getProfile: async (req, res) => {
    try {
      const user = await AuthService.verifyUser(req.user.id)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile_picture: user.profile_picture,
          is_admin: user.is_admin || false,
        },
      })
    } catch (error) {
      console.error("Error getting profile:", error)
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      })
    }
  },
}

export default AuthController
