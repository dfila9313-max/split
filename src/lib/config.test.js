import {describe,expect,it} from 'vitest'
import {getSupabaseConfig} from './config'

const jwt=role=>`x.${btoa(JSON.stringify({role})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}.x`
describe('Supabase config',()=>{
 it('отклоняет пустые и placeholder значения',()=>{expect(getSupabaseConfig({} ).configured).toBe(false);expect(getSupabaseConfig({VITE_SUPABASE_URL:'https://your-project.supabase.co',VITE_SUPABASE_ANON_KEY:'placeholder'}).configured).toBe(false)})
 it('отклоняет service-role JWT',()=>{expect(getSupabaseConfig({VITE_SUPABASE_URL:'https://demo.supabase.co',VITE_SUPABASE_ANON_KEY:jwt('service_role')}).reason).toMatch(/Service-role/)})
 it('принимает публичный JWT и publishable key',()=>{expect(getSupabaseConfig({VITE_SUPABASE_URL:'https://demo.supabase.co',VITE_SUPABASE_ANON_KEY:jwt('anon')}).configured).toBe(true);expect(getSupabaseConfig({VITE_SUPABASE_URL:'https://demo.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_123'}).configured).toBe(true)})
})
