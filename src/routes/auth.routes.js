import express from "express"
import AuthController from "../controllers/auth.controllers.js"
import authMiddleware from "../middleware/auth.middleware.js"

const router = express.Router()

router.post("/sso", AuthController.ssoLogin)
router.post("/refresh-token", AuthController.refreshToken)
router.post("/logout", authMiddleware, AuthController.logout)
router.get("/profile", authMiddleware, AuthController.getProfile)

export default router