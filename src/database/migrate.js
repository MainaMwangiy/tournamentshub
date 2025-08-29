import { pool } from "../config/database.js"
import dotenv from "dotenv"

dotenv.config()

const migrations = [
  {
    version: 1,
    name: "create_tournament_system_tables",
    up: `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        name VARCHAR(100),
        google_uid VARCHAR(255),
        profile_picture TEXT,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        last_login TIMESTAMP WITH TIME ZONE,
        preferences JSONB DEFAULT '{}',
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_deleted INTEGER DEFAULT 0 CHECK (is_deleted IN (0, 1)),
        created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create tournaments table
      CREATE TABLE IF NOT EXISTS tournaments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tournament_type VARCHAR(50) DEFAULT 'single_elimination' CHECK (tournament_type IN ('single_elimination', 'double_elimination', 'round_robin')),
        max_players INTEGER DEFAULT 16 CHECK (max_players > 0),
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'in_progress', 'completed', 'cancelled')),
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        registration_deadline TIMESTAMP WITH TIME ZONE,
        entry_fee DECIMAL(10,2) DEFAULT 0 CHECK (entry_fee >= 0),
        prize_pool DECIMAL(10,2) DEFAULT 0 CHECK (prize_pool >= 0),
        rules TEXT,
        settings JSONB DEFAULT '{}',
        share_url VARCHAR(500),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_deleted INTEGER DEFAULT 0 CHECK (is_deleted IN (0, 1)),
        created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create tournament_entries table
      CREATE TABLE IF NOT EXISTS tournament_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        player_name VARCHAR(100) NOT NULL,
        player_email VARCHAR(255),
        player_phone VARCHAR(20),
        seed_number INTEGER,
        registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
        notes TEXT,
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_deleted INTEGER DEFAULT 0 CHECK (is_deleted IN (0, 1)),
        created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, player_name)
      );

      -- Create matches table
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL CHECK (round_number > 0),
        match_number INTEGER NOT NULL CHECK (match_number > 0),
        player1_id UUID REFERENCES tournament_entries(id) ON DELETE SET NULL,
        player2_id UUID REFERENCES tournament_entries(id) ON DELETE SET NULL,
        player1_name VARCHAR(100),
        player2_name VARCHAR(100),
        scheduled_time TIMESTAMP WITH TIME ZONE,
        actual_start_time TIMESTAMP WITH TIME ZONE,
        actual_end_time TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'bye')),
        winner_id UUID REFERENCES tournament_entries(id) ON DELETE SET NULL,
        winner_name VARCHAR(100),
        match_type VARCHAR(20) DEFAULT 'regular' CHECK (match_type IN ('regular', 'semifinal', 'final', 'third_place')),
        notes TEXT,
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_deleted INTEGER DEFAULT 0 CHECK (is_deleted IN (0, 1)),
        created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, round_number, match_number)
      );

      -- Create match_results table
      CREATE TABLE IF NOT EXISTS match_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        player1_score INTEGER DEFAULT 0 CHECK (player1_score >= 0),
        player2_score INTEGER DEFAULT 0 CHECK (player2_score >= 0),
        sets_data JSONB DEFAULT '[]',
        duration_minutes INTEGER CHECK (duration_minutes > 0),
        referee_notes TEXT,
        verified BOOLEAN DEFAULT false,
        verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMP WITH TIME ZONE,
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_deleted INTEGER DEFAULT 0 CHECK (is_deleted IN (0, 1)),
        created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create tournament_brackets table
      CREATE TABLE IF NOT EXISTS tournament_brackets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        bracket_data JSONB NOT NULL DEFAULT '[]',
        bracket_type VARCHAR(20) DEFAULT 'main' CHECK (bracket_type IN ('main', 'losers', 'consolation')),
        last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_deleted INTEGER DEFAULT 0 CHECK (is_deleted IN (0, 1)),
        created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, bracket_type)
      );

      -- Create tournament_settings table
      CREATE TABLE IF NOT EXISTS tournament_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSONB NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_deleted INTEGER DEFAULT 0 CHECK (is_deleted IN (0, 1)),
        created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, setting_key)
      );

      -- Create user_refresh_tokens table
      CREATE TABLE IF NOT EXISTS user_refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `,
    down: `
      DROP TABLE IF EXISTS user_refresh_tokens CASCADE;
      DROP TABLE IF EXISTS tournament_settings CASCADE;
      DROP TABLE IF EXISTS tournament_brackets CASCADE;
      DROP TABLE IF EXISTS match_results CASCADE;
      DROP TABLE IF EXISTS matches CASCADE;
      DROP TABLE IF EXISTS tournament_entries CASCADE;
      DROP TABLE IF EXISTS tournaments CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `,
  },
  {
    version: 2,
    name: "create_indexes_and_triggers",
    up: `
      -- Create performance indexes
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_users_google_uid ON users(google_uid) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament_id ON tournament_entries(tournament_id) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_tournament_entries_player_name ON tournament_entries(player_name) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_matches_round_number ON matches(round_number) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_match_results_tournament_id ON match_results(tournament_id) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_tournament_brackets_tournament_id ON tournament_brackets(tournament_id) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_tournament_settings_tournament_id ON tournament_settings(tournament_id) WHERE is_deleted = 0;
      CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_user_id ON user_refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_expires_at ON user_refresh_tokens(expires_at);

      -- Create function to update modified_on timestamp
      CREATE OR REPLACE FUNCTION update_modified_on_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.modified_on = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create triggers for modified_on
      CREATE TRIGGER update_users_modified_on BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_on_column();
      CREATE TRIGGER update_tournaments_modified_on BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_modified_on_column();
      CREATE TRIGGER update_tournament_entries_modified_on BEFORE UPDATE ON tournament_entries FOR EACH ROW EXECUTE FUNCTION update_modified_on_column();
      CREATE TRIGGER update_matches_modified_on BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_modified_on_column();
      CREATE TRIGGER update_match_results_modified_on BEFORE UPDATE ON match_results FOR EACH ROW EXECUTE FUNCTION update_modified_on_column();
      CREATE TRIGGER update_tournament_brackets_modified_on BEFORE UPDATE ON tournament_brackets FOR EACH ROW EXECUTE FUNCTION update_modified_on_column();
      CREATE TRIGGER update_tournament_settings_modified_on BEFORE UPDATE ON tournament_settings FOR EACH ROW EXECUTE FUNCTION update_modified_on_column();
      CREATE TRIGGER update_user_refresh_tokens_modified_on BEFORE UPDATE ON user_refresh_tokens FOR EACH ROW EXECUTE FUNCTION update_modified_on_column();
    `,
    down: `
      -- Drop triggers
      DROP TRIGGER IF EXISTS update_users_modified_on ON users;
      DROP TRIGGER IF EXISTS update_tournaments_modified_on ON tournaments;
      DROP TRIGGER IF EXISTS update_tournament_entries_modified_on ON tournament_entries;
      DROP TRIGGER IF EXISTS update_matches_modified_on ON matches;
      DROP TRIGGER IF EXISTS update_match_results_modified_on ON match_results;
      DROP TRIGGER IF EXISTS update_tournament_brackets_modified_on ON tournament_brackets;
      DROP TRIGGER IF EXISTS update_tournament_settings_modified_on ON tournament_settings;
      DROP TRIGGER IF EXISTS update_user_refresh_tokens_modified_on ON user_refresh_tokens;

      -- Drop function
      DROP FUNCTION IF EXISTS update_modified_on_column;

      -- Drop indexes
      DROP INDEX IF EXISTS idx_users_username;
      DROP INDEX IF EXISTS idx_users_email;
      DROP INDEX IF EXISTS idx_users_google_uid;
      DROP INDEX IF EXISTS idx_tournaments_status;
      DROP INDEX IF EXISTS idx_tournaments_created_by;
      DROP INDEX IF EXISTS idx_tournament_entries_tournament_id;
      DROP INDEX IF EXISTS idx_tournament_entries_player_name;
      DROP INDEX IF EXISTS idx_matches_tournament_id;
      DROP INDEX IF EXISTS idx_matches_round_number;
      DROP INDEX IF EXISTS idx_matches_status;
      DROP INDEX IF EXISTS idx_match_results_match_id;
      DROP INDEX IF EXISTS idx_match_results_tournament_id;
      DROP INDEX IF EXISTS idx_tournament_brackets_tournament_id;
      DROP INDEX IF EXISTS idx_tournament_settings_tournament_id;
      DROP INDEX IF EXISTS idx_user_refresh_tokens_user_id;
      DROP INDEX IF EXISTS idx_user_refresh_tokens_expires_at;
    `,
  },
]

async function runMigrations() {
  let client

  try {
    // Verify database connection
    client = await pool.connect()
    console.log("Successfully connected to the database")

    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Get executed migrations
    const result = await client.query("SELECT version FROM migrations ORDER BY version")
    const executedVersions = result.rows.map((row) => row.version)

    // Apply migrations
    for (const migration of migrations) {
      if (!executedVersions.includes(migration.version)) {
        console.log(`Applying migration ${migration.version}: ${migration.name}`)
        await client.query("BEGIN")
        try {
          await client.query(migration.up)
          await client.query("INSERT INTO migrations (version, name) VALUES ($1, $2)", [
            migration.version,
            migration.name,
          ])
          await client.query("COMMIT")
          console.log(`Migration ${migration.version} applied successfully`)
        } catch (err) {
          await client.query("ROLLBACK")
          console.error(`Migration ${migration.version} failed: ${err.message}`)
          throw new Error(`Migration ${migration.version} failed: ${err.message}`)
        }
      } else {
        console.log(`Skipping migration ${migration.version}: already applied`)
      }
    }

    console.log("All migrations completed successfully")
  } catch (error) {
    console.error("Migration process failed:", error.message)
    throw new Error(`Migration process failed: ${error.message}`)
  } finally {
    if (client) {
      client.release()
      console.log("Database connection released")
    }
  }
}
// runMigrations()

export { runMigrations }
export default runMigrations