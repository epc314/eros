CREATE TABLE treasures (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  owner_node_id TEXT NOT NULL,
  protocol_version TEXT NOT NULL,
  name TEXT NOT NULL,
  subject_index INTEGER NOT NULL,
  subject_name TEXT NOT NULL,
  subject_group TEXT NOT NULL,
  search_timestamp_ms TEXT NOT NULL,
  search_attempt INTEGER NOT NULL,
  search_hash_hex TEXT NOT NULL,
  match_score INTEGER NOT NULL,
  owner_feature_hex TEXT NOT NULL,
  tokens_json TEXT NOT NULL,
  exact_prompt TEXT NOT NULL,
  recorder_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COLLECTED')),
  created_at TEXT NOT NULL,
  collected_at TEXT,
  UNIQUE(owner_node_id, subject_index),
  FOREIGN KEY(world_id) REFERENCES worlds(id),
  FOREIGN KEY(owner_node_id) REFERENCES nodes(id)
);

CREATE INDEX treasures_world_status_created_idx ON treasures(world_id, status, created_at);
CREATE INDEX treasures_owner_status_idx ON treasures(owner_node_id, status);

CREATE TABLE treasure_descriptions (
  id TEXT PRIMARY KEY,
  treasure_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author_label TEXT,
  status TEXT NOT NULL DEFAULT 'VISIBLE',
  kind TEXT NOT NULL DEFAULT 'STORY' CHECK(kind IN ('DISCOVERY','STORY')),
  created_at TEXT NOT NULL,
  FOREIGN KEY(treasure_id) REFERENCES treasures(id)
);

CREATE INDEX treasure_descriptions_treasure_created_idx ON treasure_descriptions(treasure_id, created_at);

CREATE TABLE treasure_description_feedback (
  id TEXT PRIMARY KEY,
  description_id TEXT NOT NULL,
  voter_key TEXT NOT NULL,
  is_true INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(description_id, voter_key),
  FOREIGN KEY(description_id) REFERENCES treasure_descriptions(id)
);

CREATE INDEX treasure_description_feedback_description_idx ON treasure_description_feedback(description_id);

CREATE TABLE treasure_images (
  id TEXT PRIMARY KEY,
  treasure_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_model TEXT,
  provider_request_id TEXT,
  exact_prompt TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  provider_seed TEXT,
  variation_id TEXT,
  image_url TEXT,
  r2_key TEXT,
  content_type TEXT,
  width INTEGER,
  height INTEGER,
  is_primary INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(treasure_id) REFERENCES treasures(id)
);

CREATE INDEX treasure_images_treasure_created_idx ON treasure_images(treasure_id, created_at);
