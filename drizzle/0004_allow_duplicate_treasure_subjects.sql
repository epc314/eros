PRAGMA defer_foreign_keys = ON;

CREATE TABLE treasures_v2 (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  owner_node_id TEXT NOT NULL,
  protocol_version TEXT NOT NULL,
  name TEXT NOT NULL,
  subject_index INTEGER NOT NULL,
  subject_name TEXT NOT NULL,
  subject_group TEXT NOT NULL,
  instance_number INTEGER NOT NULL DEFAULT 1,
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
  UNIQUE(owner_node_id, subject_index, instance_number),
  UNIQUE(owner_node_id, search_hash_hex),
  FOREIGN KEY(world_id) REFERENCES worlds(id),
  FOREIGN KEY(owner_node_id) REFERENCES nodes(id)
);

CREATE TABLE treasure_descriptions_v2 (
  id TEXT PRIMARY KEY,
  treasure_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author_label TEXT,
  status TEXT NOT NULL DEFAULT 'VISIBLE',
  kind TEXT NOT NULL DEFAULT 'STORY' CHECK(kind IN ('DISCOVERY','STORY')),
  created_at TEXT NOT NULL,
  FOREIGN KEY(treasure_id) REFERENCES treasures_v2(id)
);

CREATE TABLE treasure_description_feedback_v2 (
  id TEXT PRIMARY KEY,
  description_id TEXT NOT NULL,
  voter_key TEXT NOT NULL,
  is_true INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(description_id, voter_key),
  FOREIGN KEY(description_id) REFERENCES treasure_descriptions_v2(id)
);

CREATE TABLE treasure_images_v2 (
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
  FOREIGN KEY(treasure_id) REFERENCES treasures_v2(id)
);

INSERT INTO treasures_v2 (
  id,world_id,owner_node_id,protocol_version,name,subject_index,subject_name,subject_group,instance_number,
  search_timestamp_ms,search_attempt,search_hash_hex,match_score,owner_feature_hex,tokens_json,exact_prompt,
  recorder_name,status,created_at,collected_at
)
SELECT
  id,world_id,owner_node_id,protocol_version,name,subject_index,subject_name,subject_group,1,
  search_timestamp_ms,search_attempt,search_hash_hex,match_score,owner_feature_hex,tokens_json,exact_prompt,
  recorder_name,status,created_at,collected_at
FROM treasures;

INSERT INTO treasure_descriptions_v2 SELECT * FROM treasure_descriptions;
INSERT INTO treasure_description_feedback_v2 SELECT * FROM treasure_description_feedback;
INSERT INTO treasure_images_v2 SELECT * FROM treasure_images;

DROP TABLE treasure_description_feedback;
DROP TABLE treasure_descriptions;
DROP TABLE treasure_images;
DROP TABLE treasures;

ALTER TABLE treasures_v2 RENAME TO treasures;
ALTER TABLE treasure_descriptions_v2 RENAME TO treasure_descriptions;
ALTER TABLE treasure_description_feedback_v2 RENAME TO treasure_description_feedback;
ALTER TABLE treasure_images_v2 RENAME TO treasure_images;

CREATE INDEX treasures_world_status_created_idx ON treasures(world_id, status, created_at);
CREATE INDEX treasures_owner_status_idx ON treasures(owner_node_id, status);
CREATE INDEX treasure_descriptions_treasure_created_idx ON treasure_descriptions(treasure_id, created_at);
CREATE INDEX treasure_description_feedback_description_idx ON treasure_description_feedback(description_id);
CREATE INDEX treasure_images_treasure_created_idx ON treasure_images(treasure_id, created_at);

PRAGMA defer_foreign_keys = OFF;
