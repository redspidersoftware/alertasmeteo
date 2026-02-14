import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iabbabzszkxscykskmex.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhYmJhYnpzemt4c2N5a3NrbWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTc3NTYsImV4cCI6MjA4NjYzMzc1Nn0.pVYSP3_2WlAmYm0hpkIVNpJLd_Da0TNoFZn_D5E4t2k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
