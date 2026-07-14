ALTER TABLE treasures ADD COLUMN title TEXT;

UPDATE treasures
SET name = (
  SELECT n.name
  FROM nodes n
  WHERE n.id = treasures.owner_node_id
) || ' 的 ' || subject_name || CASE
  WHEN instance_number > 1 THEN '（' || instance_number || '）'
  ELSE ''
END
WHERE EXISTS (
  SELECT 1
  FROM nodes n
  WHERE n.id = treasures.owner_node_id
);

UPDATE treasure_descriptions
SET body = (
  SELECT t.name || ' 由 ' || COALESCE(NULLIF(t.recorder_name, ''), '匿名') || ' 从 ' || n.name || ' 的命运中寻得，并收入宝物图鉴。'
  FROM treasures t
  JOIN nodes n ON n.id = t.owner_node_id
  WHERE t.id = treasure_descriptions.treasure_id
)
WHERE kind = 'DISCOVERY';
