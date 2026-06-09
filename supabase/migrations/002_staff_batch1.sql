-- 员工扩展字段 + 第一批真实数据

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS fixed_rest_day_1 TEXT,
  ADD COLUMN IF NOT EXISTS fixed_rest_day_2 TEXT,
  ADD COLUMN IF NOT EXISTS fixed_shift TEXT;

ALTER TABLE staff ALTER COLUMN weekly_hours DROP NOT NULL;

-- 第一批员工（mock id 与 slug 对应，便于开发对照）
INSERT INTO staff (
  id, name, department, position, role_id, email,
  contract_type, weekly_hours, hourly_rate, status,
  fixed_rest_day_1, fixed_rest_day_2, fixed_shift
) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'Jhoan', 'Sala', '服务员', 'waiter', 'jhoan@karuma.es', '全职', NULL, 0, '在职', 'Thursday', NULL, NULL),
  ('b0000001-0000-4000-8000-000000000002', 'Isabel', 'Sala', '服务员', 'waiter', 'isabel@karuma.es', '全职', 40, 0, '在职', 'Sunday', NULL, NULL),
  ('b0000001-0000-4000-8000-000000000003', 'Celeste', 'Sala', '服务员', 'waiter', 'celeste@karuma.es', '全职', 40, 0, '在职', 'Tuesday', NULL, NULL),
  ('b0000001-0000-4000-8000-000000000004', 'Edu', 'Sala', '服务员', 'waiter', 'edu@karuma.es', '全职', 40, 0, '在职', 'Wednesday', NULL, NULL),
  ('b0000001-0000-4000-8000-000000000005', 'Jeferson', 'Sushi', '寿司师傅', 'sushi', 'jeferson@karuma.es', '全职', 40, 0, '在职', 'Sunday', 'Monday', NULL),
  ('b0000001-0000-4000-8000-000000000006', 'Newton', 'Sushi', '寿司师傅', 'sushi', 'newton@karuma.es', '全职', 40, 0, '在职', 'Friday', 'Saturday', NULL),
  ('b0000001-0000-4000-8000-000000000007', 'Sebastian Rodriguez', 'Sushi', '寿司师傅', 'sushi', 'sebastianrodriguez@karuma.es', '全职', 40, 0, '在职', NULL, NULL, NULL),
  ('b0000001-0000-4000-8000-000000000008', 'Sebastian Gomez', 'Sushi', '寿司师傅', 'sushi', 'sebastiangomez@karuma.es', '全职', 40, 0, '在职', NULL, NULL, NULL),
  ('b0000001-0000-4000-8000-000000000009', 'Hoscar', 'Sushi', '寿司师傅', 'sushi', 'hoscar@karuma.es', '全职', 40, 0, '在职', NULL, NULL, NULL),
  ('b0000001-0000-4000-8000-00000000000a', 'Junfeng', 'Sushi', '寿司师傅', 'sushi', 'junfeng@karuma.es', '全职', 40, 0, '在职', NULL, NULL, NULL),
  ('b0000001-0000-4000-8000-00000000000b', 'Mauricio', 'Hot Kitchen', '厨房', 'kitchen', 'mauricio@karuma.es', '全职', 40, 0, '在职', 'Thursday', 'Friday', NULL),
  ('b0000001-0000-4000-8000-00000000000c', 'Alex', 'Hot Kitchen', '厨房', 'kitchen', 'alex@karuma.es', '全职', 40, 0, '在职', NULL, NULL, NULL),
  ('b0000001-0000-4000-8000-00000000000d', 'Karina', 'Dishwasher', '洗碗', 'dishwasher', 'karina@karuma.es', '全职', 40, 0, '在职', 'Monday', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  role_id = EXCLUDED.role_id,
  email = EXCLUDED.email,
  contract_type = EXCLUDED.contract_type,
  weekly_hours = EXCLUDED.weekly_hours,
  status = EXCLUDED.status,
  fixed_rest_day_1 = EXCLUDED.fixed_rest_day_1,
  fixed_rest_day_2 = EXCLUDED.fixed_rest_day_2,
  fixed_shift = EXCLUDED.fixed_shift,
  updated_at = NOW();
