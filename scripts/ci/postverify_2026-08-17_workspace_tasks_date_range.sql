DO $$
DECLARE
  has_end_date boolean;
  has_end_time boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspace_tasks' AND column_name = 'end_date'
  ) INTO has_end_date;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspace_tasks' AND column_name = 'end_time'
  ) INTO has_end_time;

  IF NOT has_end_date THEN
    RAISE EXCEPTION 'FAIL: workspace_tasks.end_date column missing';
  END IF;
  IF NOT has_end_time THEN
    RAISE EXCEPTION 'FAIL: workspace_tasks.end_time column missing';
  END IF;

  RAISE NOTICE 'PASS workspace_tasks end_date/end_time columns present';
END $$;
