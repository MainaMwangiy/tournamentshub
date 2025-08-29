import express from "express"
import UsersController from "../controllers/user.controller.js"

const router = express.Router()

// Auth routes (no middleware needed)
router.post("/register",  UsersController.register)
router.post("/login", UsersController.login)
router.post("/admin-login", UsersController.adminLogin)

// Protected routes
router.get("/profile", UsersController.getProfile)
router.put("/update/:id", UsersController.updateUser)
router.delete("/delete/:id", UsersController.deleteUser)
router.get("/list", UsersController.getAllUsers)

export default router
