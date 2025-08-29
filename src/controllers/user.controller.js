import UsersService from "../services/user.services.js"
import { SuccessResponse } from "../middleware/responses.js"
import logger from "../middleware/logger.js"

class UsersController {
  static async register(req, res, next) {
    try {
      const userData = req.body
      const user = await UsersService.register(userData)
      return SuccessResponse(res, 201, "User registered successfully", user)
    } catch (error) {
      logger.error(`Register user error: ${error.message}`)
      next(error)
    }
  }

  static async login(req, res, next) {
    try {
      const { username, password } = req.body
      const result = await UsersService.login(username, password)
      return SuccessResponse(res, 200, "Login successful", result)
    } catch (error) {
      logger.error(`Login error: ${error.message}`)
      next(error)
    }
  }

  static async adminLogin(req, res, next) {
    try {
      const { password } = req.body
      const result = await UsersService.adminLogin(password)
      return SuccessResponse(res, 200, "Admin login successful", result)
    } catch (error) {
      logger.error(`Admin login error: ${error.message}`)
      next(error)
    }
  }

  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id
      const user = await UsersService.getUserById(userId)
      return SuccessResponse(res, 200, "Profile retrieved successfully", user)
    } catch (error) {
      logger.error(`Get profile error: ${error.message}`)
      next(error)
    }
  }

  static async updateUser(req, res, next) {
    try {
      const { id } = req.params
      const userData = req.body
      const userId = req.user.id
      const user = await UsersService.updateUser(id, userData, userId)
      return SuccessResponse(res, 200, "User updated successfully", user)
    } catch (error) {
      logger.error(`Update user error: ${error.message}`)
      next(error)
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params
      const userId = req.user.id
      const user = await UsersService.deleteUser(id, userId)
      return SuccessResponse(res, 200, "User deleted successfully", user)
    } catch (error) {
      logger.error(`Delete user error: ${error.message}`)
      next(error)
    }
  }

  static async getAllUsers(req, res, next) {
    try {
      const users = await UsersService.getAllUsers()
      return SuccessResponse(res, 200, "Users retrieved successfully", users)
    } catch (error) {
      logger.error(`Get all users error: ${error.message}`)
      next(error)
    }
  }
}

export default UsersController
