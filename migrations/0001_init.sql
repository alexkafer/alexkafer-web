CREATE TABLE IF NOT EXISTS ab_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  experiment TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('A','B')),
  event TEXT NOT NULL CHECK (event IN ('impression','conversion'))
);
CREATE INDEX IF NOT EXISTS idx_ab_events_exp_variant ON ab_events(experiment, variant);
CREATE INDEX IF NOT EXISTS idx_ab_events_session ON ab_events(session_id);
