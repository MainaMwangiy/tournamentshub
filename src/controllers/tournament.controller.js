import TournamentsService from "../services/tournament.services.js"
import { SuccessResponse } from "../middleware/responses.js"
import logger from "../middleware/logger.js"

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
      const { id } = req.params
      const userId = req.user.id
      const tournament = await TournamentsService.getTournamentDetails(id, userId)
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
}

export default TournamentsController
