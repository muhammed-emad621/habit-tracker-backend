-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  share_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- HABITS TABLE
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date TIMESTAMP DEFAULT now(),
  last_failure_date TIMESTAMP,
  share_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- HABIT HISTORY TABLE (failure dates)
CREATE TABLE habit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  failure_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- ALMOST RELAPSES TABLE
CREATE TABLE almost_relapses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================
-- 5. HABIT SHARES TABLE (who a habit is shared with)
-- ============================================
CREATE TABLE habit_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(habit_id, shared_with_user_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_share_code ON habits(share_code);
CREATE INDEX idx_habit_history_habit_id ON habit_history(habit_id);
CREATE INDEX idx_almost_relapses_habit_id ON almost_relapses(habit_id);
CREATE INDEX idx_habit_shares_habit_id ON habit_shares(habit_id);
CREATE INDEX idx_habit_shares_user_id ON habit_shares(shared_with_user_id);
CREATE INDEX idx_users_email ON users(email);
