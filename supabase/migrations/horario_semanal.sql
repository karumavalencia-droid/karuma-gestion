-- Horario de reservas por día de la semana
-- 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
CREATE TABLE IF NOT EXISTS horario_semanal (
  dia         smallint PRIMARY KEY CHECK (dia >= 0 AND dia <= 6),
  activo      boolean NOT NULL DEFAULT true,
  comida_activa  boolean NOT NULL DEFAULT true,
  comida_inicio  varchar(5) NOT NULL DEFAULT '13:00',
  comida_fin     varchar(5) NOT NULL DEFAULT '15:00',
  cena_activa    boolean NOT NULL DEFAULT true,
  cena_inicio    varchar(5) NOT NULL DEFAULT '20:00',
  cena_fin       varchar(5) NOT NULL DEFAULT '22:00'
);

ALTER TABLE horario_semanal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read horario_semanal"  ON horario_semanal FOR SELECT USING (true);
CREATE POLICY "service write horario_semanal" ON horario_semanal FOR ALL USING (auth.role() = 'service_role');

-- Valores por defecto según la configuración del restaurante:
-- L-V: comida 13:00-13:45 (4 pases), cena 16:00-22:00
-- Sáb-Dom: todo el día — comida 13:00-15:00, cena 20:00-22:00
INSERT INTO horario_semanal (dia, activo, comida_activa, comida_inicio, comida_fin, cena_activa, cena_inicio, cena_fin) VALUES
(0, true, true, '13:00', '15:00', true, '20:00', '22:00'),
(1, true, true, '13:00', '13:45', true, '16:00', '22:00'),
(2, true, true, '13:00', '13:45', true, '16:00', '22:00'),
(3, true, true, '13:00', '13:45', true, '16:00', '22:00'),
(4, true, true, '13:00', '13:45', true, '16:00', '22:00'),
(5, true, true, '13:00', '13:45', true, '16:00', '22:00'),
(6, true, true, '13:00', '15:00', true, '20:00', '22:00')
ON CONFLICT (dia) DO NOTHING;
