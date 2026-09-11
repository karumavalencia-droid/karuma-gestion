-- Nombre legal usado para reconocer automáticamente a cada empleado dentro de PDFs de nóminas.
alter table public.staff
  add column if not exists payroll_name text;

create index if not exists idx_staff_payroll_name_lower
  on public.staff (lower(payroll_name))
  where payroll_name is not null;
