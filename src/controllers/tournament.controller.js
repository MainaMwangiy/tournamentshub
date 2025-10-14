import TournamentsService from "../services/tournament.services.js"
import { SuccessResponse } from "../middleware/responses.js"
import logger from "../middleware/logger.js"
import { ValidationError } from "../middleware/errors.js"

class TournamentsController {
  static async createTournament(req, res, next) {
    try {
      const tournamentData = req.body
      const userId = req.user.id
      const tournament = await TournamentsService.createTournament(tournamentData, userId)
      return SuccessResponse(res, 201, "Tournament created successfully", tournament)
    } catch (error) {
      logger.error(`Create tournament error: ${error.message}`)
      next(error)
    }
  }

  static async getAllTournaments(req, res, next) {
    try {
      const userId = req.user.id
      const tournaments = await TournamentsService.getAllTournaments(userId)
      return SuccessResponse(res, 200, "Tournaments retrieved successfully", tournaments)
    } catch (error) {
      logger.error(`Get all tournaments error: ${error.message}`)
      next(error)
    }
  }

  static async getTournamentById(req, res, next) {
    try {
      const { id } = req.params
      const tournament = await TournamentsService.getTournamentById(id)
      return SuccessResponse(res, 200, "Tournament retrieved successfully", tournament)
    } catch (error) {
      logger.error(`Get tournament error: ${error.message}`)
      next(error)
    }
  }

  static async getTournamentDetails(req, res, next) {
    try {
      const { id } = req.params;
      const tournament = await TournamentsService.getTournamentDetails(id)
      return SuccessResponse(res, 200, "Tournament details retrieved successfully", tournament)
    } catch (error) {
      logger.error(`Get tournament details error: ${error.message}`)
      next(error)
    }
  }

  static async updateTournament(req, res, next) {
    try {
      const { id } = req.params
      const tournamentData = req.body
      const userId = req.user.id
      const tournament = await TournamentsService.updateTournament(id, tournamentData, userId)
      return SuccessResponse(res, 200, "Tournament updated successfully", tournament)
    } catch (error) {
      logger.error(`Update tournament error: ${error.message}`)
      next(error)
    }
  }

  static async deleteTournament(req, res, next) {
    try {
      const { id } = req.params
      const userId = req.user.id
      const tournament = await TournamentsService.deleteTournament(id, userId)
      return SuccessResponse(res, 200, "Tournament deleted successfully", tournament)
    } catch (error) {
      logger.error(`Delete tournament error: ${error.message}`)
      next(error)
    }
  }

  static async startTournament(req, res, next) {
    try {
      const { id } = req.params
      const userId = req.user.id
      const tournament = await TournamentsService.startTournament(id, userId)
      return SuccessResponse(res, 200, "Tournament started successfully", tournament)
    } catch (error) {
      logger.error(`Start tournament error: ${error.message}`)
      next(error)
    }
  }

  static async endTournament(req, res, next) {
    try {
      const { id } = req.params
      const userId = req.user.id
      const tournament = await TournamentsService.endTournament(id, userId)
      return SuccessResponse(res, 200, "Tournament ended successfully", tournament)
    } catch (error) {
      logger.error(`End tournament error: ${error.message}`)
      next(error)
    }
  }

  static async generateTournamentUrl(req, res, next) {
    try {
      const { id } = req.params
      const userId = req.user.id
      const url = await TournamentsService.generateTournamentUrl(id, userId)
      return SuccessResponse(res, 200, "Tournament URL generated successfully", { url })
    } catch (error) {
      logger.error(`Generate tournament URL error: ${error.message}`)
      next(error)
    }
  }

  static async getTournamentBracket(req, res, next) {
    try {
      const { id } = req.params
      const bracket = await TournamentsService.getTournamentBracket(id)
      return SuccessResponse(res, 200, "Tournament bracket retrieved successfully", bracket)
    } catch (error) {
      logger.error(`Get tournament bracket error: ${error.message}`)
      next(error)
    }
  }

  static async updateMatchResult(req, res, next) {
    try {
      const { tournamentId } = req.params
      const matchData = req.body // { round, matchIndex, score1, score2 }
      const userId = req.user.id
      const result = await TournamentsService.updateMatchResult(tournamentId, matchData, userId)
      return SuccessResponse(res, 200, "Match result updated successfully", result)
    } catch (error) {
      logger.error(`Update match result error: ${error.message}`)
      next(error)
    }
  }

  // Add this for saving bracket
  static async saveBracket(req, res, next) {
    try {
      const { tournamentId } = req.params
      const { bracket, players } = req.body
      const userId = req.user.id
      // console.log(bracket, players)
      const result = await TournamentsService.saveBracket(tournamentId, bracket, players, userId)
      return SuccessResponse(res, 200, "Bracket saved successfully", result)
    } catch (error) {
      logger.error(`Save bracket error: ${error.message}`)
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: [],
        })
      } else {
        return res.status(500).json({
          success: false,
          message: "Internal server error",
          errors: [],
        })
      }
    }
  }

  // Add this for adding player
  static async addPlayer(req, res, next) {
    try {
      const { tournamentId } = req.params
      const playerData = req.body // { name, seed }
      const userId = req.user.id
      const result = await TournamentsService.addPlayerToTournament(tournamentId, playerData, userId)
      return SuccessResponse(res, 201, "Player added successfully", result)
    } catch (error) {
      logger.error(`Add player error: ${error.message}`)
      next(error)
    }
  }
}

export default TournamentsController
