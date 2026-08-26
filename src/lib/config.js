function jwtRole(key){
 try{const parts=key.split('.');if(parts.length!==3)return null;const body=parts[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(body.padEnd(Math.ceil(body.length/4)*4,'='))).role||null}catch{return null}
}
export function getSupabaseConfig(env=import.meta.env){
 const url=env?.VITE_SUPABASE_URL?.trim(),anonKey=(env?.VITE_SUPABASE_ANON_KEY||env?.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim()
 const placeholders=/your-project|your-public|placeholder/i
 if(!url||!anonKey||placeholders.test(url)||placeholders.test(anonKey))return {configured:false,reason:'Укажите VITE_SUPABASE_URL и публичный anon/publishable key в .env'}
 if(jwtRole(anonKey)==='service_role')return {configured:false,reason:'Service-role ключ нельзя использовать в клиентском приложении'}
 try{const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error();return {configured:true,url:parsed.toString().replace(/\/$/,''),anonKey}}catch{return {configured:false,reason:'VITE_SUPABASE_URL должен быть корректным HTTPS-адресом'}}
}
