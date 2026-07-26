-- 支持6人预约：添加持续时间配置
-- 为6人或以上的预约添加新的持续时间配置
-- 默认150分钟 = 120分钟（3-4人基础） + 30分钟缓冲

ALTER TABLE reservas_config
ADD COLUMN IF NOT EXISTS duracion_5_6_min INTEGER DEFAULT 150 NOT NULL;

-- 记录迁移说明
-- 6人预约现在支持通过拼桌或单张6人表（T17-T19）进行
-- 持续时间由duracion_5_6_min配置管理
