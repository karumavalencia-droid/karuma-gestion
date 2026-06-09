/** 临时关闭路由权限拦截，恢复系统稳定后可改回 true */
export const PERMISSIONS_ENABLED = false;

export type Role =
  | "owner"
  | "manager"
  | "kitchen"
  | "sushi"
  | "waiter"
  | "cashier"
  | "dishwasher";

export type Module =
  | "dashboard"
  | "sales"
  | "foodCost"
  | "staff"
  | "schedule"
  | "inventory"
  | "reviews"
  | "recipes"
  | "ingredients"
  | "invoices"
  | "purchases"
  | "roles"
  | "settings";

export type Permission = {
  module: Module;
  readOnly?: boolean;
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: "老板",
  manager: "店长",
  kitchen: "厨房",
  sushi: "寿司",
  waiter: "服务员",
  cashier: "收银",
  dishwasher: "洗碗",
};

const ALL_MODULES: Module[] = [
  "dashboard",
  "sales",
  "foodCost",
  "staff",
  "schedule",
  "inventory",
  "reviews",
  "recipes",
  "ingredients",
  "invoices",
  "purchases",
  "roles",
  "settings",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_MODULES.map((module) => ({ module })),
  manager: [
    { module: "dashboard" },
    { module: "sales" },
    { module: "staff" },
    { module: "schedule" },
    { module: "inventory" },
    { module: "reviews" },
  ],
  kitchen: [{ module: "recipes" }, { module: "ingredients" }, { module: "schedule" }],
  sushi: [
    { module: "recipes" },
    { module: "foodCost", readOnly: true },
    { module: "schedule" },
  ],
  waiter: [{ module: "schedule" }, { module: "reviews", readOnly: true }],
  cashier: [
    { module: "dashboard" },
    { module: "sales", readOnly: true },
    { module: "schedule" },
  ],
  dishwasher: [{ module: "schedule" }],
};

/** 路由 → 权限模块 */
export const ROUTE_MODULES: Record<string, Module> = {
  "/dashboard": "dashboard",
  "/sales": "sales",
  "/food-cost": "foodCost",
  "/staff": "staff",
  "/schedule": "schedule",
  "/leave": "schedule",
  "/inventory": "inventory",
  "/reviews": "reviews",
  "/recipes": "recipes",
  "/ingredients": "ingredients",
  "/invoices": "invoices",
  "/purchases": "purchases",
  "/roles": "roles",
  "/settings": "settings",
};

export function getModuleForRoute(pathname: string): Module | null {
  if (ROUTE_MODULES[pathname]) return ROUTE_MODULES[pathname];
  const base = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  return ROUTE_MODULES[base] ?? null;
}

const VALID_ROLES = new Set<string>(Object.keys(ROLE_PERMISSIONS));

export function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && VALID_ROLES.has(role);
}

export function normalizeRole(role: unknown): Role {
  return isValidRole(role) ? role : "owner";
}

export function hasModuleAccess(role: Role, module: Module): boolean {
  const perms = ROLE_PERMISSIONS[normalizeRole(role)];
  return perms.some((p) => p.module === module);
}

export function isModuleReadOnly(role: Role, module: Module): boolean {
  const perm = ROLE_PERMISSIONS[normalizeRole(role)].find((p) => p.module === module);
  return Boolean(perm?.readOnly);
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  if (!PERMISSIONS_ENABLED) return true;
  const safeRole = normalizeRole(role);
  const mod = getModuleForRoute(pathname);
  if (!mod) return safeRole === "owner";
  return hasModuleAccess(safeRole, mod);
}

export function getAllowedRoutes(role: Role): string[] {
  return Object.entries(ROUTE_MODULES)
    .filter(([, mod]) => hasModuleAccess(role, mod))
    .map(([route]) => route)
    .filter((route, index, arr) => arr.indexOf(route) === index);
}

export function getDefaultRoute(role: Role): string {
  const allowed = getAllowedRoutes(role);
  if (allowed.includes("/dashboard")) return "/dashboard";
  return allowed[0] ?? "/schedule";
}
