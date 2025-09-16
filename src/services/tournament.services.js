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
      console.log(`Error fetching tournaments for user ${userId}: ${error.message}`)
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

  static async getTournamentDetails(tournamentId) {
    try {
      // Get tournament with entries count
      const tournamentResult = await DatabaseHelper.executeQuery(
        "SELECT t.*, u.username as created_by_username, COUNT(te.id) as entries_count FROM tournaments t LEFT JOIN users u ON t.created_by = u.id LEFT JOIN tournament_entries te ON t.id = te.tournament_id AND te.is_deleted = 0 WHERE t.id = $1 AND t.is_deleted = 0 GROUP BY t.id, u.username",
        [tournamentId],
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

      // Get entries (map to frontend format: { name, seed, id })
      const entriesResult = await DatabaseHelper.executeQuery(
        "SELECT id, player_name as name, seed_number as seed FROM tournament_entries WHERE tournament_id = $1 AND is_deleted = 0 ORDER BY seed_number ASC NULLS LAST",
        [tournamentId],
      )
      const entries = entriesResult.rows.map((row) => ({ ...row, seed: row.seed || 0 })) // Ensure seed is number

      // Get matches with results and player names/seeds
      const matchesResult = await DatabaseHelper.executeQuery(
        `SELECT m.*, mr.player1_score, mr.player2_score, 
                te1.player_name as player1_name, te1.seed_number as player1_seed,
                te2.player_name as player2_name, te2.seed_number as player2_seed
         FROM matches m 
         LEFT JOIN match_results mr ON m.id = mr.match_id 
         LEFT JOIN tournament_entries te1 ON m.player1_id = te1.id 
         LEFT JOIN tournament_entries te2 ON m.player2_id = te2.id 
         WHERE m.tournament_id = $1 AND m.is_deleted = 0 
         ORDER BY m.round_number, m.match_number`,
        [tournamentId],
      )

      // Format matches into bracket structure (array of rounds [0-based])
      const bracket = []
      const maxRound = Math.max(...matchesResult.rows.map((m) => (m.round_number || 1) - 1), 0) // Convert to 0-based
      for (let r = 0; r <= maxRound; r++) {
        const roundMatches = matchesResult.rows
          .filter((m) => m.round_number - 1 === r)
          .map((m) => ({
            player1: {
              name: m.player1_name || "BYE",
              seed: m.player1_seed || 0,
              id: m.player1_id,
            },
            player2: {
              name: m.player2_name || "BYE",
              seed: m.player2_seed || 0,
              id: m.player2_id,
            },
            score1: m.player1_score || 0,
            score2: m.player2_score || 0,
          }))
        bracket.push(roundMatches)
      }

      return {
        tournament,
        entries, // Frontend expects 'entries' or 'entryList'
        bracket, // Now returns formatted bracket for direct use
        matches: matchesResult.rows,
      }
    } catch (error) {
      logger.error(`Error fetching tournament bracket ${tournamentId}: ${error.message}`)
      throw error
    }
  }

  static async updateMatchResult(tournamentId, matchData, userId) {
    const { round, matchIndex, score1, score2 } = matchData

    try {
      // Verify tournament exists and user has permission
      const tournamentResult = await DatabaseHelper.executeQuery(
        "SELECT id FROM tournaments WHERE id = $1 AND created_by = $2 AND is_deleted = 0",
        [tournamentId, userId],
      )

      if (tournamentResult.rows.length === 0) {
        throw new ValidationError("Tournament not found or unauthorized")
      }

      console.log(
        `[DEBUG] Looking for match: tournamentId=${tournamentId}, round_number=${round + 1}, match_number=${matchIndex + 1}`,
      )

      // Check if ANY matches exist for this tournament
      const allMatchesQuery = await DatabaseHelper.executeQuery(
        "SELECT COUNT(*) as count FROM matches WHERE tournament_id = $1 AND is_deleted = 0",
        [tournamentId],
      )
      console.log(`[DEBUG] Total matches in tournament: ${allMatchesQuery.rows[0].count}`)

      // Find the match (round/matchIndex 0-based in frontend, 1-based in DB)
      let matchResultQuery = await DatabaseHelper.executeQuery(
        "SELECT id, player1_id, player2_id, player1_name, player2_name FROM matches WHERE tournament_id = $1 AND round_number = $2 AND match_number = $3 AND is_deleted = 0",
        [tournamentId, round + 1, matchIndex + 1],
      )

      if (matchResultQuery.rows.length === 0) {
        console.log(`[DEBUG] Match not found, creating placeholder match for R${round + 1}M${matchIndex + 1}`)

        // Create a placeholder match with TBD players
        await DatabaseHelper.executeQuery(
          "INSERT INTO matches (tournament_id, round_number, match_number, player1_id, player2_id, player1_name, player2_name, status, created_on, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, 0)",
          [
            tournamentId,
            round + 1,
            matchIndex + 1,
            null, // player1_id
            null, // player2_id
            "TBD", // player1_name
            "TBD", // player2_name
            "pending",
          ],
        )

        // Re-query to get the created match
        matchResultQuery = await DatabaseHelper.executeQuery(
          "SELECT id, player1_id, player2_id, player1_name, player2_name FROM matches WHERE tournament_id = $1 AND round_number = $2 AND match_number = $3 AND is_deleted = 0",
          [tournamentId, round + 1, matchIndex + 1],
        )

        console.log(`[DEBUG] Created placeholder match with ID: ${matchResultQuery.rows[0].id}`)
      }

      const match = matchResultQuery.rows[0]
      const matchId = match.id

      // Prevent updating if one of the players is BYE
      if (match.player1_name === "BYE" || match.player2_name === "BYE") {
        throw new ValidationError("Cannot update scores for a BYE match")
      }

      // Check if result exists
      const existingResult = await DatabaseHelper.executeQuery(
        "SELECT id FROM match_results WHERE match_id = $1 AND is_deleted = 0",
        [matchId],
      )

      let result
      await DatabaseHelper.executeQuery("BEGIN")

      if (existingResult.rows.length > 0) {
        // Update
        result = await DatabaseHelper.executeQuery(
          "UPDATE match_results SET player1_score = $1, player2_score = $2, modified_on = CURRENT_TIMESTAMP WHERE match_id = $3 AND is_deleted = 0 RETURNING *",
          [score1, score2, matchId],
        )
      } else {
        // Insert
        result = await DatabaseHelper.executeQuery(
          "INSERT INTO match_results (match_id, tournament_id, player1_score, player2_score, created_on, modified_on) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *",
          [matchId, tournamentId, score1, score2],
        )
      }

      if (result.rows.length === 0) {
        throw new ValidationError("Failed to update match result")
      }

      // Update match status
      await DatabaseHelper.executeQuery(
        "UPDATE matches SET status = $1, modified_on = CURRENT_TIMESTAMP WHERE id = $2",
        [score1 !== score2 ? "completed" : "pending", matchId],
      )

      if (score1 !== score2) {
        const winnerId = score1 > score2 ? match.player1_id : match.player2_id
        const winnerName = score1 > score2 ? match.player1_name : match.player2_name

        // Find next round match
        const nextRound = round + 2 // Convert to 1-based and go to next round
        const nextMatchIndex = Math.floor(matchIndex / 2) + 1 // Convert to 1-based

        const nextMatchQuery = await DatabaseHelper.executeQuery(
          "SELECT id FROM matches WHERE tournament_id = $1 AND round_number = $2 AND match_number = $3 AND is_deleted = 0",
          [tournamentId, nextRound, nextMatchIndex],
        )

        if (nextMatchQuery.rows.length > 0) {
          const nextMatchId = nextMatchQuery.rows[0].id
          const isPlayer1 = matchIndex % 2 === 0

          if (isPlayer1) {
            await DatabaseHelper.executeQuery(
              "UPDATE matches SET player1_id = $1, player1_name = $2, modified_on = CURRENT_TIMESTAMP WHERE id = $3",
              [winnerId, winnerName, nextMatchId],
            )
          } else {
            await DatabaseHelper.executeQuery(
              "UPDATE matches SET player2_id = $1, player2_name = $2, modified_on = CURRENT_TIMESTAMP WHERE id = $3",
              [winnerId, winnerName, nextMatchId],
            )
          }
        }
      }

      await DatabaseHelper.executeQuery("COMMIT")
      logger.info(`Match result updated for match ${matchId} in tournament ${tournamentId} by user ${userId}`)
      return result.rows[0]
    } catch (error) {
      await DatabaseHelper.executeQuery("ROLLBACK")
      logger.error(`Error updating match result for tournament ${tournamentId}: ${error.message}`)
      throw error
    }
  }

static async saveBracket(tournamentId, bracket, players, userId) {
  try {
    logger.info(`[DEBUG] saveBracket called with tournamentId: ${tournamentId}, userId: ${userId}`);
    logger.info(`[DEBUG] bracket length: ${bracket?.length}, players count: ${players?.length}`);
    if (!bracket || !players) {
      throw new ValidationError("Missing bracket or players data");
    }

    // Verify tournament
    const tournamentResult = await DatabaseHelper.executeQuery(
      "SELECT id, max_players FROM tournaments WHERE id = $1 AND created_by = $2 AND is_deleted = 0",
      [tournamentId, userId],
    );
    if (tournamentResult.rows.length === 0) {
      throw new ValidationError("Tournament not found or unauthorized");
    }

    const { max_players } = tournamentResult.rows[0];
    if (
      !players ||
      players.length < 2 ||
      !Number.isInteger(Math.log2(players.length)) ||
      players.length > max_players
    ) {
      throw new ValidationError("Invalid number of players for bracket");
    }

    // Start transaction
    logger.info(`[DEBUG] Starting transaction`);
    await DatabaseHelper.executeQuery("BEGIN");

    // Soft delete existing data
    logger.info(`[DEBUG] Soft deleting existing data`);
    await DatabaseHelper.executeQuery(
      "UPDATE tournament_entries SET is_deleted = 1 WHERE tournament_id = $1 AND is_deleted = 0",
      [tournamentId],
    );
    await DatabaseHelper.executeQuery(
      "UPDATE matches SET is_deleted = 1 WHERE tournament_id = $1 AND is_deleted = 0",
      [tournamentId],
    );
    await DatabaseHelper.executeQuery(
      "UPDATE match_results SET is_deleted = 1 WHERE tournament_id = $1 AND is_deleted = 0",
      [tournamentId],
    );
    logger.info(`[DEBUG] Soft delete completed`);

    const playerEntryIds = {};
    logger.info(`[DEBUG] Inserting ${players.length} players`);
    for (const player of players) {
      if (!player.name || player.name === "BYE") {
        continue;
      }

      logger.info(`[DEBUG] Inserting player: ${player.name}, seed: ${player.seed}`);
      try {
        const result = await DatabaseHelper.executeQuery(
          `INSERT INTO tournament_entries (tournament_id, player_name, seed_number, created_on, is_deleted) 
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 0) 
           ON CONFLICT (tournament_id, player_name) 
           DO UPDATE SET 
             seed_number = EXCLUDED.seed_number,
             is_deleted = 0,
             modified_on = CURRENT_TIMESTAMP
           RETURNING id`,
          [tournamentId, player.name, player.seed || 0],
        );
        playerEntryIds[player.name] = result.rows[0].id;
        logger.info(`[DEBUG] Player ${player.name} inserted with ID: ${result.rows[0].id}`);
      } catch (playerError) {
        logger.error(`[DEBUG] Failed to insert player ${player.name}: ${playerError.message}`);
        throw playerError;
      }
    }

    logger.info(`[DEBUG] Player entry IDs created: ${Object.keys(playerEntryIds).length}`);

    let totalMatchesInserted = 0;
    for (let r = 0; r < bracket.length; r++) {
      logger.info(`[DEBUG] Processing round ${r + 1} with ${bracket[r].length} matches`);
      for (let m = 0; m < bracket[r].length; m++) {
        const match = bracket[r][m];
        const player1Id = match.player1.name === "BYE" ? null : playerEntryIds[match.player1.name];
        const player2Id = match.player2.name === "BYE" ? null : playerEntryIds[match.player2.name];

        if (!player1Id && match.player1.name !== "BYE") {
          continue;
          // logger.error(`[DEBUG] Missing player1Id for ${match.player1.name} in round ${r + 1}, match ${m + 1}`);
          // throw new ValidationError(`Invalid player data for ${match.player1.name} in match ${m + 1} of round ${r + 1}`);
        }
        if (!player2Id && match.player2.name !== "BYE") {
          logger.error(`[DEBUG] Missing player2Id for ${match.player2.name} in round ${r + 1}, match ${m + 1}`);
          throw new ValidationError(`Invalid player data for ${match.player2.name} in match ${m + 1} of round ${r + 1}`);
        }

        logger.info(
          `[DEBUG] About to insert match R${r + 1}M${m + 1}: ${match.player1.name} vs ${match.player2.name}`,
        );

        try {
          const matchInsert = await DatabaseHelper.executeQuery(
            `INSERT INTO matches (tournament_id, round_number, match_number, player1_id, player2_id, player1_name, player2_name, status, created_on, is_deleted) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, 0) 
             ON CONFLICT (tournament_id, round_number, match_number) 
             DO UPDATE SET 
               player1_id = EXCLUDED.player1_id,
               player2_id = EXCLUDED.player2_id,
               player1_name = EXCLUDED.player1_name,
               player2_name = EXCLUDED.player2_name,
               status = EXCLUDED.status,
               is_deleted = 0,
               modified_on = CURRENT_TIMESTAMP
             RETURNING id`,
            [
              tournamentId,
              r + 1,
              m + 1,
              player1Id,
              player2Id,
              match.player1.name,
              match.player2.name,
              match.player1.name === "BYE" || match.player2.name === "BYE" ? "completed" : "pending",
            ],
          );
          const matchId = matchInsert.rows[0].id;
          totalMatchesInserted++;
          logger.info(`[DEBUG] Successfully inserted match ${matchId} for R${r + 1}M${m + 1}`);

          if (match.player1.name === "BYE" || match.player2.name === "BYE") {
            const winnerScore = match.player1.name === "BYE" ? (match.score2 || 1) : (match.score1 || 1);
            const loserScore = 0;
            await DatabaseHelper.executeQuery(
              "INSERT INTO match_results (match_id, tournament_id, player1_score, player2_score, created_on) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
              [matchId, tournamentId, match.player1.name === "BYE" ? loserScore : winnerScore, match.player2.name === "BYE" ? loserScore : winnerScore],
            );
            logger.info(`[DEBUG] Inserted match result for BYE match ${matchId}`);
          } else if ((match.score1 && match.score1 > 0) || (match.score2 && match.score2 > 0)) {
            await DatabaseHelper.executeQuery(
              "INSERT INTO match_results (match_id, tournament_id, player1_score, player2_score, created_on) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
              [matchId, tournamentId, match.score1 || 0, match.score2 || 0],
            );
            logger.info(`[DEBUG] Inserted match result for match ${matchId}`);
          }
        } catch (matchError) {
          logger.error(
            `[DEBUG] Failed to insert match R${r + 1}M${m + 1} with params: ${JSON.stringify([
              tournamentId,
              r + 1,
              m + 1,
              player1Id,
              player2Id,
              match.player1.name,
              match.player2.name,
              match.player1.name === "BYE" || match.player2.name === "BYE" ? "completed" : "pending",
            ])}`,
          );
          throw matchError;
        }
      }
    }

    logger.info(`[DEBUG] Total matches inserted: ${totalMatchesInserted}`);

    try {
      await DatabaseHelper.executeQuery(
        "INSERT INTO tournament_brackets (tournament_id, bracket_data, last_updated_by, created_on) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)",
        [tournamentId, JSON.stringify(bracket), userId],
      );
      logger.info(`[DEBUG] Bracket data saved to tournament_brackets table`);
    } catch (bracketError) {
      logger.info(`[DEBUG] Bracket data not stored in tournament_brackets table: ${bracketError.message}`);
    }

    logger.info(`[DEBUG] Committing transaction`);
    await DatabaseHelper.executeQuery("COMMIT");

    const verifyMatches = await DatabaseHelper.executeQuery(
      "SELECT COUNT(*) as count FROM matches WHERE tournament_id = $1 AND is_deleted = 0",
      [tournamentId],
    );
    logger.info(
      `[DEBUG] POST-COMMIT verification: ${verifyMatches.rows[0].count} matches found in database after commit`,
    );

    const matchList = await DatabaseHelper.executeQuery(
      "SELECT round_number, match_number, player1_name, player2_name FROM matches WHERE tournament_id = $1 AND is_deleted = 0 ORDER BY round_number, match_number",
      [tournamentId],
    );
    logger.info(`[DEBUG] Matches in database: ${JSON.stringify(matchList.rows)}`);

    logger.info(`Bracket saved for tournament ${tournamentId} by user ${userId}`);
    return { success: true, bracket, matchesCreated: totalMatchesInserted };
  } catch (error) {
    logger.error(`[DEBUG] ===== SAVE BRACKET FAILED =====`);
    logger.error(`[DEBUG] Error message: ${error.message}`);
    logger.error(`[DEBUG] Error stack: ${error.stack}`);
    await DatabaseHelper.executeQuery("ROLLBACK");
    logger.error(`Error saving bracket for tournament ${tournamentId}: ${error.message}`);
    throw error;
  }
}

  static async addPlayerToTournament(tournamentId, playerData, userId) {
    try {
      const { name, seed } = playerData
      if (!name) throw new ValidationError("Player name is required")

      // Check if player already exists
      const existing = await DatabaseHelper.executeQuery(
        "SELECT id FROM tournament_entries WHERE tournament_id = $1 AND player_name = $2 AND is_deleted = 0",
        [tournamentId, name],
      )
      if (existing.rows.length > 0) {
        throw new ValidationError("Player already added")
      }

      await DatabaseHelper.executeQuery(
        "INSERT INTO tournament_entries (tournament_id, player_name, seed_number, created_on) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)",
        [tournamentId, name, seed || (await this.getPlayerCount(tournamentId)) + 1],
      )

      logger.info(`Player ${name} added to tournament ${tournamentId} by user ${userId}`)
      return { success: true }
    } catch (error) {
      logger.error(`Error adding player to tournament ${tournamentId}: ${error.message}`)
      throw error
    }
  }

  static async getPlayerCount(tournamentId) {
    const result = await DatabaseHelper.executeQuery(
      "SELECT COUNT(*) as count FROM tournament_entries WHERE tournament_id = $1 AND is_deleted = 0",
      [tournamentId],
    )
    return Number.parseInt(result.rows[0].count)
  }
}

export default TournamentsService
