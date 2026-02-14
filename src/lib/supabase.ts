import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ewfbpmlcbmkvedgbqfgj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZmJwbWxjYm1rdmVkZ2JxZmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTUxNzYsImV4cCI6MjA4NjY3MTE3Nn0.V-ptTSZKrlnec4vsq4bpCwenGN41c7D1ayViO0vastc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
