import type { Role } from "./permissions";

export type MockAccount = {
  email: string;
  password: string;
  name: string;
  role: Role;
};

export const MOCK_ACCOUNTS: MockAccount[] = [
  { email: "owner@karuma.es", password: "123456", name: "Zhou", role: "owner" },
  { email: "manager@karuma.es", password: "123456", name: "Maria", role: "manager" },
  { email: "kitchen@karuma.es", password: "123456", name: "Wang", role: "kitchen" },
  { email: "sushi@karuma.es", password: "123456", name: "Chen", role: "sushi" },
  { email: "waiter@karuma.es", password: "123456", name: "Laura", role: "waiter" },
  { email: "cashier@karuma.es", password: "123456", name: "Ana", role: "cashier" },
  { email: "dishwasher@karuma.es", password: "123456", name: "Pedro", role: "dishwasher" },
];

export function findAccount(email: string, password: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find(
    (a) => a.email === email.trim().toLowerCase() && a.password === password,
  );
}
