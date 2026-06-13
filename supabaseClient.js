import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkmylkafhknknewsrbea.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jzpaMXj7gwmJibb6wb-paw_bNqxu6tI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
