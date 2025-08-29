import express from "express"
import TournamentsController from "../controllers/tournament.controller.js"

const router = express.Router()

// Public routes
router.get("/view/:id", TournamentsController.getTournamentById)
router.get("/bracket/:id", TournamentsController.getTournamentBracket)

// Protected routes
router.post("/create", TournamentsController.createTournament)
router.get("/list", TournamentsController.getAllTournaments)
router.get("/details/:id", TournamentsController.getTournamentDetails)
router.put("/update/:id", TournamentsController.updateTournament,)
router.delete("/delete/:id", TournamentsController.deleteTournament)
router.post("/start/:id", TournamentsController.startTournament)
router.post("/end/:id", TournamentsController.endTournament)
router.post("/generate-url/:id", TournamentsController.generateTournamentUrl)

export default router
