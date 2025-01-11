// server/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.https://pbaoxoeimnwkyowabwql.supabase.co
const supabaseKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYW94b2VpbW53a3lvd2Fid3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3NTExODksImV4cCI6MjA1MTMyNzE4OX0.yGydSL_OczJgHZIAHNWKKk_yvZGEeSq-uSyPA-DyT2U;

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
