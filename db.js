import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fwxsexmeunqfduqyinwa.supabase.co/rest/v1/';
const supabaseKey = 'sb_publishable_7aSpywmm7QBQhb57T2sBjA_beq7maRi';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);