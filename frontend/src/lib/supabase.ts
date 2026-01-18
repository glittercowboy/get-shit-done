import { createClient } from '@supabase/supabase-js';

// Database types - will be generated from schema in production
export interface Database {
  public: {
    Tables: {
      data_sources: {
        Row: {
          id: string;
          name: string;
          source_type: 'iceberg' | 'redshift' | 'athena';
          connection_config: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['data_sources']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['data_sources']['Insert']>;
      };
      datasets: {
        Row: {
          id: string;
          source_id: string;
          database_name: string;
          table_name: string;
          schema_info: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['datasets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['datasets']['Insert']>;
      };
      profile_runs: {
        Row: {
          id: string;
          dataset_id: string;
          status: 'pending' | 'running' | 'completed' | 'failed';
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          step_functions_execution_arn: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profile_runs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['profile_runs']['Insert']>;
      };
      profile_results: {
        Row: {
          id: string;
          run_id: string;
          dataset_id: string;
          row_count: number | null;
          column_count: number | null;
          sampled: boolean;
          sample_size: number | null;
          s3_full_profile_uri: string | null;
          profiled_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profile_results']['Row'], 'id' | 'profiled_at'>;
        Update: Partial<Database['public']['Tables']['profile_results']['Insert']>;
      };
      column_profiles: {
        Row: {
          id: string;
          result_id: string;
          column_name: string;
          inferred_type: string | null;
          null_count: number | null;
          null_percentage: number | null;
          distinct_count: number | null;
          distinct_percentage: number | null;
          min_value: number | null;
          max_value: number | null;
          mean_value: number | null;
          median_value: number | null;
          std_dev: number | null;
          top_values: Array<{ value: string; count: number; percentage: number }> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['column_profiles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['column_profiles']['Insert']>;
      };
      profile_anomalies: {
        Row: {
          id: string;
          result_id: string;
          column_name: string | null;
          anomaly_type: string;
          severity: 'info' | 'warning' | 'critical';
          description: string | null;
          value: number | null;
          threshold: number | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profile_anomalies']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['profile_anomalies']['Insert']>;
      };
    };
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type DataSource = Database['public']['Tables']['data_sources']['Row'];
export type Dataset = Database['public']['Tables']['datasets']['Row'];
export type ProfileRun = Database['public']['Tables']['profile_runs']['Row'];
export type ProfileResult = Database['public']['Tables']['profile_results']['Row'];
export type ColumnProfile = Database['public']['Tables']['column_profiles']['Row'];
export type ProfileAnomaly = Database['public']['Tables']['profile_anomalies']['Row'];
