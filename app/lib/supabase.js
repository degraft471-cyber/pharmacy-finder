import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://fcjrvwqxcpphxgfhssov.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjanJ2d3F4Y3BwaHhnZmhzc292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NDI5NjgsImV4cCI6MjEwNzQxODk2OH0.BCnD75ALcrV6rX4CiOvXe1NKuuOd8qEqdkdE23lNKgQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);