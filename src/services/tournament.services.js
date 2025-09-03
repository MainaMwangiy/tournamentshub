import { DatabaseHelper } from "../config/database.js"
import logger from "../middleware/logger.js"
import { ValidationError } from "../middleware/errors.js"

class TournamentsService {
  static async createTournament(tournamentData, userId) {
    const {
      name,
      description,
      tournament_type = "single_elimination",
      max_players = 16,
      entry_fee = 0,
    } = tournamentData

    if (!name) {
      throw new ValidationError("Tournament name is required")
    }

    try {
      // Check if tournament exists
      const existingTournament = await DatabaseHelper.executeQuery(
        "SELECT id FROM tournaments WHERE name = $1 AND created_by = $2 AND is_deleted = 0",
        [name, userId],
      )

      if (existingTournament.rows.length > 0) {
        throw new ValidationError("Tournament with this name already exists")
      }

      // Insert tournament
      const result = await DatabaseHelper.executeQuery(
        "INSERT INTO tournaments (id, name, description, tournament_type, max_players, entry_fee, status, created_by, is_active, created_on, is_deleted) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, 1, CURRENT_TIMESTAMP, 0) RETURNING *",
        [name, description, tournament_type, max_players, entry_fee, "draft", userId],
      )

      const tournament = result.rows[0]
      logger.info(`Tournament ${tournament.id} (${name}) created by user ${userId}`)
      return tournament
    } catch (error) {
      logger.error(`Error creating tournament: ${error.message}`)
      throw error
    }
  }

  static async getAllTournaments(userId) {
    try {
      const result = await DatabaseHelper.executeQuery(
        "SELECT t.*, u.username as created_by_username FROM tournaments t LEFT JOIN users u ON t.created_by = u.id WHERE t.created_by = $1 AND t.is_deleted = 0 ORDER BY t.created_on DESC",
        [userId],
      )
      return result.rows
    } catch (error) {
      logger.error(`Error fetching tournaments for user ${userId}: ${error.message}`)
      throw error
    }
  }

  static async getTournamentById(tournamentId) {
    try {
      const result = await DatabaseHelper.executeQuery(
        "SELECT t.*, u.username as created_by_username FROM tournaments t LEFT JOIN users u ON t.created_by = u.id WHERE t.id = $1 AND t.is_deleted = 0",
        [tournamentId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("Tournament not found")
      }

      return result.rows[0]
    } catch (error) {
      logger.error(`Error fetching tournament ${tournamentId}: ${error.message}`)
      throw error
    }
  }

  static async getTournamentDetails(tournamentId, userId) {
    try {
      // Get tournament with entries count
      const tournamentResult = await DatabaseHelper.executeQuery(
        "SELECT t.*, u.username as created_by_username, COUNT(te.id) as entries_count FROM tournaments t LEFT JOIN users u ON t.created_by = u.id LEFT JOIN tournament_entries te ON t.id = te.tournament_id AND te.is_deleted = 0 WHERE t.id = $1 AND t.created_by = $2 AND t.is_deleted = 0 GROUP BY t.id, u.username",
        [tournamentId, userId],
      )

      if (tournamentResult.rows.length === 0) {
        throw new ValidationError("Tournament not found")
      }

      const tournament = tournamentResult.rows[0]

      // Get tournament entries
      const entriesResult = await DatabaseHelper.executeQuery(
        "SELECT * FROM tournament_entries WHERE tournament_id = $1 AND is_deleted = 0 ORDER BY created_on ASC",
        [tournamentId],
      )

      tournament.entries = entriesResult.rows
      return tournament
    } catch (error) {
      logger.error(`Error fetching tournament details ${tournamentId}: ${error.message}`)
      throw error
    }
  }

  static async updateTournament(tournamentId, tournamentData, userId) {
    const { name, description, max_players, entry_fee } = tournamentData

    try {
      const result = await DatabaseHelper.executeQuery(
        "UPDATE tournaments SET name = $1, description = $2, max_players = $3, entry_fee = $4, modified_on = CURRENT_TIMESTAMP WHERE id = $5 AND created_by = $6 AND is_deleted = 0 RETURNING *",
        [name, description, max_players, entry_fee, tournamentId, userId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("Tournament not found")
      }

      logger.info(`Tournament ${tournamentId} updated by user ${userId}`)
      return result.rows[0]
    } catch (error) {
      logger.error(`Error updating tournament ${tournamentId}: ${error.message}`)
      throw error
    }
  }

  static async deleteTournament(tournamentId, userId) {
    try {
      const result = await DatabaseHelper.executeQuery(
        "UPDATE tournaments SET is_deleted = 1, modified_on = CURRENT_TIMESTAMP WHERE id = $1 AND created_by = $2 AND is_deleted = 0 RETURNING *",
        [tournamentId, userId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("Tournament not found")
      }

      // Soft delete related entries
      await DatabaseHelper.executeQuery(
        "UPDATE tournament_entries SET is_deleted = 1, modified_on = CURRENT_TIMESTAMP WHERE tournament_id = $1 AND is_deleted = 0",
        [tournamentId],
      )

      logger.info(`Tournament ${tournamentId} soft deleted by user ${userId}`)
      return result.rows[0]
    } catch (error) {
      logger.error(`Error deleting tournament ${tournamentId}: ${error.message}`)
      throw error
    }
  }

  static async startTournament(tournamentId, userId) {
    try {
      const result = await DatabaseHelper.executeQuery(
        "UPDATE tournaments SET status = $1, start_date = CURRENT_TIMESTAMP, modified_on = CURRENT_TIMESTAMP WHERE id = $2 AND created_by = $3 AND is_deleted = 0 RETURNING *",
        ["active", tournamentId, userId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("Tournament not found")
      }

      logger.info(`Tournament ${tournamentId} started by user ${userId}`)
      return result.rows[0]
    } catch (error) {
      logger.error(`Error starting tournament ${tournamentId}: ${error.message}`)
      throw error
    }
  }

  static async endTournament(tournamentId, userId) {
    try {
      const result = await DatabaseHelper.executeQuery(
        "UPDATE tournaments SET status = $1, end_date = CURRENT_TIMESTAMP, modified_on = CURRENT_TIMESTAMP WHERE id = $2 AND created_by = $3 AND is_deleted = 0 RETURNING *",
        ["completed", tournamentId, userId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("Tournament not found")
      }

      logger.info(`Tournament ${tournamentId} ended by user ${userId}`)
      return result.rows[0]
    } catch (error) {
      logger.error(`Error ending tournament ${tournamentId}: ${error.message}`)
      throw error
    }
  }

  static async generateTournamentUrl(tournamentId, userId) {
    try {
      // Verify tournament exists and user owns it
      const result = await DatabaseHelper.executeQuery(
        "SELECT id, name FROM tournaments WHERE id = $1 AND created_by = $2 AND is_deleted = 0",
        [tournamentId, userId],
      )

      if (result.rows.length === 0) {
        throw new ValidationError("Tournament not found")
      }

      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000"
      const url = `${baseUrl}/bracket/${tournamentId}`

      logger.info(`Tournament URL generated for ${tournamentId} by user ${userId}`)
      return url
    } catch (error) {
      logger.error(`Error generating tournament URL ${tournamentId}: ${error.message}`)
      throw error
    }
  }

static async getTournamentBracket(tournamentId) {
    try {
      // Get tournament
      const tournamentResult = await DatabaseHelper.executeQuery(
        "SELECT * FROM tournaments WHERE id = $1 AND is_deleted = 0",
        [tournamentId],
      )

      if (tournamentResult.rows.length === 0) {
        throw new ValidationError("Tournament not found")
      }

      const tournament = tournamentResult.rows[0]

      // Get entries
      const entriesResult = await DatabaseHelper.executeQuery(
        "SELECT * FROM tournament_entries WHERE tournament_id = $1 AND is_deleted = 0 ORDER BY created_on ASC",
        [tournamentId],
      )

      // Get matches
      const matchesResult = await DatabaseHelper.executeQuery(
        "SELECT m.*, mr.player1_score, mr.player2_score FROM matches m LEFT JOIN match_results mr ON m.id = mr.match_id WHERE m.tournament_id = $1 AND m.is_deleted = 0 ORDER BY m.round_number, m.match_number",
        [tournamentId],
      )

      return {
        tournament,
        entries: entriesResult.rows,
        matches: matchesResult.rows,
      }
    } catch (error) {
      logger.error(`Error fetching tournament bracket ${tournamentId}: ${error.message}`)
      throw error
    }
}
}

export default TournamentsService
