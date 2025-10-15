import express from "express"
import TournamentsController from "../controllers/tournament.controller.js"
import authMiddleware from "../middleware/auth.middleware.js"

const router = express.Router()

// Public routes
router.get("/view/:id", TournamentsController.getTournamentById)
router.get("/bracket/:id", TournamentsController.getTournamentBracket)
router.get("/details/:id", TournamentsController.getTournamentDetails)

// Protected routes
router.post("/create", authMiddleware, TournamentsController.createTournament)
router.get("/list", authMiddleware, TournamentsController.getAllTournaments)
router.put("/update/:id", authMiddleware, TournamentsController.updateTournament) 
router.delete("/delete/:id", authMiddleware, TournamentsController.deleteTournament)
router.post("/start/:id", authMiddleware, TournamentsController.startTournament)
router.post("/end/:id", authMiddleware, TournamentsController.endTournament)
router.post("/generate-url/:id", authMiddleware, TournamentsController.generateTournamentUrl)

// New routes
router.put("/:tournamentId/match-result", authMiddleware, TournamentsController.updateMatchResult)
router.post("/:tournamentId/bracket", authMiddleware, TournamentsController.saveBracket)
router.post("/:tournamentId/player", authMiddleware, TournamentsController.addPlayer)

// Additional updates
router.post("/:tournamentId/save-bracket", authMiddleware, TournamentsController.saveBracket)

router.put("/:tournamentId/player/:entryId", authMiddleware, TournamentsController.updatePlayer)
router.delete("/:tournamentId/player/:entryId", authMiddleware, TournamentsController.deletePlayer)

export default router
