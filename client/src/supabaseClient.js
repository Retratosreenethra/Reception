// client/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.https://pbaoxoeimnwkyowabwql.supabase.co;
const supabaseKey = import.meta.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYW94b2VpbW53a3lvd2Fid3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3NTExODksImV4cCI6MjA1MTMyNzE4OX0.yGydSL_OczJgHZIAHNWKKk_yvZGEeSq-uSyPA-DyT2U;


export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true, // Ensures session is persisted
      storage: localStorage, // Uses localStorage for session storage
      detectSessionInUrl: true, // Handles session from URL (e.g., after OAuth redirect)
    },
  })
export async function fetchCustomerDetails(mrNumber) {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('mr_number', mrNumber);

    if (error) {
        console.error('Error fetching customer details:', error);
        return null;
    }
    return data[0];
}

export async function fetchPrivilegeCardByPhone(phoneNumber) {
    const { data, error } = await supabase
        .from('privilegecards')
        .select('*')
        .eq('phone_number', phoneNumber);

    if (error) {
        console.error('Error fetching privilege card:', error);
        return null;
    }
    return data[0];
}

export default supabase;


