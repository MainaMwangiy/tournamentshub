import express from "express"
import TournamentsController from "../controllers/tournament.controller.js"
import authMiddleware from "../middleware/auth.middleware.js"

const router = express.Router()

// Public routes
router.get("/view/:id", TournamentsController.getTournamentById)
router.get("/bracket/:id", TournamentsController.getTournamentBracket)

// Protected routes
router.post("/create", authMiddleware, TournamentsController.createTournament)
router.get("/list", authMiddleware, TournamentsController.getAllTournaments)
router.get("/details/:id", authMiddleware, TournamentsController.getTournamentDetails)
router.put("/update/:id", authMiddleware, TournamentsController.updateTournament) // Fixed: removed trailing comma
router.delete("/delete/:id", authMiddleware, TournamentsController.deleteTournament)
router.post("/start/:id", authMiddleware, TournamentsController.startTournament)
router.post("/end/:id", authMiddleware, TournamentsController.endTournament)
router.post("/generate-url/:id", authMiddleware, TournamentsController.generateTournamentUrl)

// New routes
router.put("/:tournamentId/match-result", authMiddleware, TournamentsController.updateMatchResult) // Fixed: authMiddleware
router.post("/:tournamentId/bracket", authMiddleware, TournamentsController.saveBracket)
router.post("/:tournamentId/player", authMiddleware, TournamentsController.addPlayer)

// Additional updates
router.post("/:tournamentId/save-bracket", authMiddleware, TournamentsController.saveBracket)

export default router
