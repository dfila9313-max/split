import {createClient} from '@supabase/supabase-js'
import {getSupabaseConfig} from './config'
const config=getSupabaseConfig()
export const supabase=config.configured?createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null
export {config}
