ALTER TABLE narrators ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
UPDATE narrators SET is_admin=1 WHERE name_key='eros';

CREATE TABLE proposal_posts (
  id TEXT PRIMARY KEY,
  author_narrator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  pinned_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(author_narrator_id) REFERENCES narrators(id)
);
CREATE INDEX proposal_posts_created_idx ON proposal_posts(created_at, id);
CREATE INDEX proposal_posts_pinned_idx ON proposal_posts(is_pinned, pinned_at);

CREATE TABLE proposal_replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_narrator_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(post_id) REFERENCES proposal_posts(id) ON DELETE CASCADE,
  FOREIGN KEY(author_narrator_id) REFERENCES narrators(id)
);
CREATE INDEX proposal_replies_post_created_idx ON proposal_replies(post_id, created_at, id);

CREATE TABLE proposal_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  voter_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(post_id, voter_key),
  FOREIGN KEY(post_id) REFERENCES proposal_posts(id) ON DELETE CASCADE
);
CREATE INDEX proposal_likes_post_idx ON proposal_likes(post_id);
