import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ikijhzoijipoaqgwnmvv.supabase.co";
const supabaseAnonKey = "sb_publishable_8CxOhlxyWPoXeWQxhbxfDA_4_YBXDY6";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

