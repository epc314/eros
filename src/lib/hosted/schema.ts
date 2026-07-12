export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS worlds (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, protocol_version TEXT NOT NULL,
    genesis_timestamp_ms TEXT NOT NULL, initialized_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY, world_id TEXT NOT NULL, protocol_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('GENESIS','DESCENDANT')),
    name TEXT NOT NULL, name_key TEXT NOT NULL, genome_hex TEXT NOT NULL UNIQUE,
    chromosome0_hex TEXT NOT NULL, chromosome1_hex TEXT NOT NULL,
    generation INTEGER NOT NULL, is_dead INTEGER NOT NULL DEFAULT 0,
    records_locked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
    UNIQUE(world_id, name_key), FOREIGN KEY(world_id) REFERENCES worlds(id)
  )`,
  `CREATE INDEX IF NOT EXISTS nodes_world_generation_idx ON nodes(world_id, generation)`,
  `CREATE TABLE IF NOT EXISTS reproductions (
    id TEXT PRIMARY KEY, child_node_id TEXT NOT NULL UNIQUE, parent_low_id TEXT NOT NULL,
    parent_high_id TEXT NOT NULL, low_choice INTEGER NOT NULL, high_choice INTEGER NOT NULL,
    segment_swap_mode INTEGER NOT NULL DEFAULT 0,
    low_selected_hex TEXT NOT NULL, low_unused_hex TEXT NOT NULL,
    high_selected_hex TEXT NOT NULL, high_unused_hex TEXT NOT NULL,
    base_genome_hex TEXT NOT NULL, hamming_distance INTEGER NOT NULL,
    same_bit_count INTEGER NOT NULL, similarity_ratio REAL NOT NULL,
    similarity_mask_hex TEXT NOT NULL, requested_mutation_bits INTEGER NOT NULL,
    mutation_bit_count INTEGER NOT NULL, mutation_seed_hex TEXT NOT NULL,
    mutation_mask_hex TEXT NOT NULL, flipped_bit_positions_json TEXT NOT NULL,
    changed_token_positions_json TEXT NOT NULL, created_at TEXT NOT NULL,
    FOREIGN KEY(child_node_id) REFERENCES nodes(id), FOREIGN KEY(parent_low_id) REFERENCES nodes(id),
    FOREIGN KEY(parent_high_id) REFERENCES nodes(id)
  )`,
  `CREATE TABLE IF NOT EXISTS parent_edges (
    id TEXT PRIMARY KEY, parent_node_id TEXT NOT NULL, child_node_id TEXT NOT NULL,
    created_at TEXT NOT NULL, UNIQUE(parent_node_id, child_node_id),
    FOREIGN KEY(parent_node_id) REFERENCES nodes(id), FOREIGN KEY(child_node_id) REFERENCES nodes(id)
  )`,
  `CREATE INDEX IF NOT EXISTS parent_edges_child_idx ON parent_edges(child_node_id)`,
  `CREATE TABLE IF NOT EXISTS node_descriptions (
    id TEXT PRIMARY KEY, node_id TEXT NOT NULL, body TEXT NOT NULL, author_label TEXT,
    status TEXT NOT NULL DEFAULT 'VISIBLE', kind TEXT NOT NULL DEFAULT 'STORY', created_at TEXT NOT NULL,
    FOREIGN KEY(node_id) REFERENCES nodes(id)
  )`,
  `CREATE INDEX IF NOT EXISTS node_descriptions_node_created_idx ON node_descriptions(node_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS description_feedback (
    id TEXT PRIMARY KEY, description_id TEXT NOT NULL, voter_key TEXT NOT NULL,
    is_true INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE(description_id, voter_key), FOREIGN KEY(description_id) REFERENCES node_descriptions(id)
  )`,
  `CREATE INDEX IF NOT EXISTS description_feedback_description_idx ON description_feedback(description_id)`,
  `CREATE TABLE IF NOT EXISTS generated_images (
    id TEXT PRIMARY KEY, node_id TEXT NOT NULL, provider TEXT NOT NULL, provider_model TEXT,
    provider_request_id TEXT, exact_prompt TEXT NOT NULL, prompt_version TEXT NOT NULL,
    provider_seed TEXT, variation_id TEXT, image_url TEXT, r2_key TEXT,
    content_type TEXT, width INTEGER, height INTEGER, is_primary INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', error_message TEXT, created_at TEXT NOT NULL,
    FOREIGN KEY(node_id) REFERENCES nodes(id)
  )`,
  `CREATE INDEX IF NOT EXISTS generated_images_node_created_idx ON generated_images(node_id, created_at)`,
] as const;
