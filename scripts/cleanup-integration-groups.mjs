import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
const env={}
for(const raw of readFileSync(new URL('../.env',import.meta.url),'utf8').split(/\r?\n/)){
 const line=raw.trim();if(!line||line.startsWith('#')||!line.includes('='))continue
 const at=line.indexOf('=');let value=line.slice(at+1).trim()
 if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1)
 env[line.slice(0,at).trim()]=value
}
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const {error:authError}=await client.auth.signInWithPassword({email:env.SPLIT_TEST_USER1_EMAIL,password:env.SPLIT_TEST_USER1_PASSWORD})
if(authError)throw authError
const {data:groups,error}=await client.from('groups').select('id,name').like('name','Split integration %')
if(error)throw error
for(const group of groups){
 for(const table of ['expense_participants','settlements','expenses']){
  const {error:deleteError}=await client.from(table).delete().eq('group_id',group.id)
  if(deleteError)throw new Error(`${table}: ${deleteError.message}`)
 }
 const {error:groupError}=await client.from('groups').delete().eq('id',group.id)
 if(groupError)throw groupError
 console.log('PASS removed integration group')
}
if(!groups.length)console.log('PASS no integration groups found')
await client.auth.signOut()
