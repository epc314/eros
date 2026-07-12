ALTER TABLE nodes ADD COLUMN is_dead INTEGER NOT NULL DEFAULT 0;
ALTER TABLE nodes ADD COLUMN records_locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE node_descriptions ADD COLUMN kind TEXT NOT NULL DEFAULT 'STORY';

CREATE TABLE IF NOT EXISTS description_feedback (
  id TEXT PRIMARY KEY,
  description_id TEXT NOT NULL,
  voter_key TEXT NOT NULL,
  is_true INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(description_id, voter_key),
  FOREIGN KEY(description_id) REFERENCES node_descriptions(id)
);
CREATE INDEX IF NOT EXISTS description_feedback_description_idx ON description_feedback(description_id);

DELETE FROM description_feedback;
DELETE FROM node_descriptions;
DELETE FROM parent_edges;
DELETE FROM reproductions;
DELETE FROM generated_images
WHERE node_id IN (
  SELECT id FROM nodes
  WHERE world_id = 'eros-world'
    AND name_key NOT IN ('gaia','eros','psyche','tartarus','erebos','khaos','uranus')
);
DELETE FROM nodes
WHERE world_id = 'eros-world'
  AND name_key NOT IN ('gaia','eros','psyche','tartarus','erebos','khaos','uranus');

UPDATE nodes SET is_dead = 0, records_locked = 0 WHERE world_id = 'eros-world';
UPDATE nodes SET is_dead = 1, records_locked = 1 WHERE world_id = 'eros-world' AND name_key = 'eros';

INSERT INTO node_descriptions (id,node_id,body,author_label,status,kind,created_at)
SELECT 'seed-birth-' || id,id,name || '诞生于虚无中...',NULL,'VISIBLE','BIRTH',CURRENT_TIMESTAMP
FROM nodes WHERE world_id = 'eros-world' AND name_key <> 'eros';

INSERT INTO node_descriptions (id,node_id,body,author_label,status,kind,created_at)
SELECT 'seed-birth-' || id,id,'最初，长着黑色羽翼的黑夜，在无边无际的厄瑞玻斯深渊怀抱中产下了一枚未经受孕的神秘之卵。经过漫长岁月的轮回，这枚卵中诞生了优雅的厄洛斯（Eros）',NULL,'VISIBLE','BIRTH',CURRENT_TIMESTAMP
FROM nodes WHERE world_id = 'eros-world' AND name_key = 'eros';

INSERT INTO node_descriptions (id,node_id,body,author_label,status,kind,created_at)
SELECT 'seed-death-' || id,id,'祂终于逃离了生育繁衍的荣耀和诅咒，再次拥抱了虚无......',NULL,'VISIBLE','DEATH',datetime(CURRENT_TIMESTAMP, '+1 second')
FROM nodes WHERE world_id = 'eros-world' AND name_key = 'eros';
