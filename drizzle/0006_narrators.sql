CREATE TABLE narrators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  passphrase_salt TEXT NOT NULL,
  passphrase_hash TEXT NOT NULL,
  passphrase_iterations INTEGER NOT NULL,
  titles_json TEXT NOT NULL DEFAULT '[]',
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE narrator_sessions (
  id TEXT PRIMARY KEY,
  narrator_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(narrator_id) REFERENCES narrators(id) ON DELETE CASCADE
);

CREATE INDEX narrator_sessions_narrator_idx ON narrator_sessions(narrator_id);
CREATE INDEX narrator_sessions_expiry_idx ON narrator_sessions(expires_at);

ALTER TABLE node_descriptions ADD COLUMN narrator_id TEXT REFERENCES narrators(id);
CREATE INDEX node_descriptions_narrator_idx ON node_descriptions(narrator_id);

ALTER TABLE treasure_descriptions ADD COLUMN narrator_id TEXT REFERENCES narrators(id);
CREATE INDEX treasure_descriptions_narrator_idx ON treasure_descriptions(narrator_id);

ALTER TABLE treasures ADD COLUMN recorder_narrator_id TEXT REFERENCES narrators(id);
