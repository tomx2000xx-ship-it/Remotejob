import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://grtnpvoyqeogzgeyiqce.supabase.co";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_g0TvvM9eG6QMINl1xRrrLw_NcZtzPKL";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
