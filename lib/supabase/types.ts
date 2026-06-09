export type DbRole = {
  id: string;
  name_zh: string;
  created_at: string;
};

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role_id: string;
  created_at: string;
};

export type DbStaff = {
  id: string;
  name: string;
  department: string | null;
  position: string;
  role_id: string;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  contract_type: string | null;
  weekly_hours: number | null;
  hourly_rate: number;
  status: string;
  fixed_rest_day_1: string | null;
  fixed_rest_day_2: string | null;
  fixed_shift: string | null;
  created_at: string;
  updated_at: string;
};

export type DbStaffInsert = {
  id?: string;
  name: string;
  department?: string | null;
  position: string;
  role_id: string;
  phone?: string | null;
  email?: string | null;
  hire_date?: string | null;
  contract_type?: string | null;
  weekly_hours?: number | null;
  hourly_rate?: number;
  status?: string;
  fixed_rest_day_1?: string | null;
  fixed_rest_day_2?: string | null;
  fixed_shift?: string | null;
};

export type DbStaffUpdate = Partial<DbStaffInsert>;

export type DbUserInsert = {
  id?: string;
  email: string;
  password_hash: string;
  name: string;
  role_id: string;
};

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: DbRole;
        Insert: { id: string; name_zh: string };
        Update: Partial<{ id: string; name_zh: string }>;
        Relationships: [];
      };
      users: {
        Row: DbUser;
        Insert: DbUserInsert;
        Update: Partial<DbUserInsert>;
        Relationships: [];
      };
      staff: {
        Row: DbStaff;
        Insert: DbStaffInsert;
        Update: DbStaffUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
