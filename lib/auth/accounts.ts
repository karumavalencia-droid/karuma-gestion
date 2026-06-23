import type { Role } from "./permissions";

export type MockAccount = {
  email: string;
  password: string;
  name: string;
  role: Role;
  employeeId?: string;
};

export const MOCK_ACCOUNTS: MockAccount[] = [
  { email: "owner@karuma.es", password: "123456", name: "Zhou", role: "owner" },
  { email: "manager@karuma.es", password: "123456", name: "Maria", role: "manager" },
  { email: "kitchen@karuma.es", password: "123456", name: "Wang", role: "kitchen" },
  { email: "sushi@karuma.es", password: "123456", name: "Chen", role: "sushi" },
  { email: "waiter@karuma.es", password: "123456", name: "Laura", role: "waiter" },
  { email: "cashier@karuma.es", password: "123456", name: "Ana", role: "cashier" },
  { email: "dishwasher@karuma.es", password: "123456", name: "Pedro", role: "dishwasher" },
  { email: "jhoan@karuma.es", password: "123456", name: "Jhoan", role: "waiter", employeeId: "jhoan" },
  { email: "isabel@karuma.es", password: "123456", name: "Isabel", role: "waiter", employeeId: "isabel" },
  { email: "celeste@karuma.es", password: "123456", name: "Celeste", role: "waiter", employeeId: "celeste" },
  { email: "edu@karuma.es", password: "123456", name: "Edu", role: "waiter", employeeId: "edu" },
  { email: "jeferson@karuma.es", password: "123456", name: "Jeferson", role: "sushi", employeeId: "jeferson" },
  { email: "newton@karuma.es", password: "123456", name: "Newton", role: "sushi", employeeId: "newton" },
  { email: "sebastianrodriguez@karuma.es", password: "123456", name: "Sebastian Rodriguez", role: "sushi", employeeId: "sebastian-rodriguez" },
  { email: "sebastiangomez@karuma.es", password: "123456", name: "Sebastian Gomez", role: "sushi", employeeId: "sebastian-gomez" },
  { email: "hoscar@karuma.es", password: "123456", name: "Hoscar", role: "sushi", employeeId: "hoscar" },
  { email: "junfeng@karuma.es", password: "123456", name: "Junfeng", role: "sushi", employeeId: "junfeng" },
  { email: "mauricio@karuma.es", password: "123456", name: "Mauricio", role: "kitchen", employeeId: "mauricio" },
  { email: "alex@karuma.es", password: "123456", name: "Alex", role: "kitchen", employeeId: "alex" },
  { email: "karina@karuma.es", password: "123456", name: "Karina", role: "dishwasher", employeeId: "karina" },
];

export function findAccount(email: string, password: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find(
    (a) => a.email === email.trim().toLowerCase() && a.password === password,
  );
}
