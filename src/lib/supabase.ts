import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          user_id: string;
          employee_id: string;
          name: string;
          email: string;
          role: 'admin' | 'employee';
          department: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          employee_id: string;
          name: string;
          email: string;
          role?: 'admin' | 'employee';
          department: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          employee_id?: string;
          name?: string;
          email?: string;
          role?: 'admin' | 'employee';
          department?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          check_in_time: string | null;
          check_out_time: string | null;
          location_lat: number | null;
          location_lng: number | null;
          status: 'present' | 'absent' | 'late' | 'on_leave';
          method: 'qr' | 'manual' | 'biometric';
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          date?: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          status?: 'present' | 'absent' | 'late' | 'on_leave';
          method?: 'qr' | 'manual' | 'biometric';
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          date?: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          status?: 'present' | 'absent' | 'late' | 'on_leave';
          method?: 'qr' | 'manual' | 'biometric';
          created_at?: string;
        };
      };
      leave_requests: {
        Row: {
          id: string;
          employee_id: string;
          leave_type: 'sick' | 'casual' | 'annual' | 'maternity' | 'paternity' | 'unpaid';
          subject: string;
          description: string;
          from_date: string;
          to_date: string;
          status: 'pending' | 'approved' | 'rejected';
          has_document: boolean;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          leave_type: 'sick' | 'casual' | 'annual' | 'maternity' | 'paternity' | 'unpaid';
          subject: string;
          description: string;
          from_date: string;
          to_date: string;
          status?: 'pending' | 'approved' | 'rejected';
          has_document?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          leave_type?: 'sick' | 'casual' | 'annual' | 'maternity' | 'paternity' | 'unpaid';
          subject?: string;
          description?: string;
          from_date?: string;
          to_date?: string;
          status?: 'pending' | 'approved' | 'rejected';
          has_document?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          assigned_to: string;
          created_by: string;
          status: 'pending' | 'in_progress' | 'completed' | 'overdue';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          due_date: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          assigned_to: string;
          created_by: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          due_date: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          assigned_to?: string;
          created_by?: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          due_date?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
