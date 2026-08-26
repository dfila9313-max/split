import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'

for(const raw of readFileSync(new URL('../.env',import.meta.url),'utf8').split(/\r?\n/)){
 const line=raw.trim()
 if(!line||line.startsWith('#')||!line.includes('='))continue
 const at=line.indexOf('='),name=line.slice(0,at).trim()
 let value=line.slice(at+1).trim()
 if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1)
 if(!process.env[name])process.env[name]=value
}

const required=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','SPLIT_TEST_USER1_EMAIL','SPLIT_TEST_USER1_PASSWORD','SPLIT_TEST_USER2_EMAIL','SPLIT_TEST_USER2_PASSWORD']
for(const key of required)if(!process.env[key])throw new Error(`Missing ${key}`)
const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const owner=client(),member=client(),stamp=Date.now(),groupName=`Split integration ${stamp}`
let groupId=null,channel=null
const pass=message=>console.log(`PASS ${message}`)
const expect=(condition,message)=>{if(!condition)throw new Error(message);pass(message)}
const ok=({data,error},label)=>{if(error)throw new Error(`${label}: ${error.message}`);return data}
const waitFor=(setup,timeout=20000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Realtime timeout')),timeout);setup(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)})})

try{
 const ownerAuth=ok(await owner.auth.signInWithPassword({email:process.env.SPLIT_TEST_USER1_EMAIL,password:process.env.SPLIT_TEST_USER1_PASSWORD}),'owner auth')
 const memberAuth=ok(await member.auth.signInWithPassword({email:process.env.SPLIT_TEST_USER2_EMAIL,password:process.env.SPLIT_TEST_USER2_PASSWORD}),'member auth')
 expect(Boolean(ownerAuth.session&&memberAuth.session),'Auth works for both confirmed accounts')

 const created=ok(await owner.rpc('create_group_with_invite',{p_name:groupName,p_currency:'EUR'}),'create group')?.[0]
 groupId=created?.group_id
 expect(Boolean(groupId&&created.invite_code),'Owner creates a group and receives an invite code')

 const beforeJoin=ok(await member.from('groups').select('id').eq('id',groupId),'pre-join select')
 expect(beforeJoin.length===0,'RLS hides the group before joining')
 await member.from('groups').update({name:'forbidden update'}).eq('id',groupId)
 const unchanged=ok(await owner.from('groups').select('name').eq('id',groupId).single(),'owner verifies group')
 expect(unchanged.name===groupName,'Non-member cannot update the hidden group')

 const joined=ok(await member.rpc('join_group_by_code',{p_code:created.invite_code}),'join group')?.[0]
 expect(joined?.group_id===groupId,'Second account joins with invite code')
 const visible=ok(await member.from('groups').select('id,name').eq('id',groupId).single(),'post-join select')
 expect(visible.id===groupId,'Joined member can read the group')

 await member.from('groups').update({name:'member forbidden update'}).eq('id',groupId)
 const ownerOnly=ok(await owner.from('groups').select('name').eq('id',groupId).single(),'owner-only update verification')
 expect(ownerOnly.name===groupName,'RLS prevents a regular member from editing group metadata')

 const ownerId=ownerAuth.user.id
 await owner.from('group_users').delete().eq('group_id',groupId).eq('user_id',ownerId)
 const ownerMembership=ok(await owner.from('group_users').select('role').eq('group_id',groupId).eq('user_id',ownerId).single(),'owner membership verification')
 expect(ownerMembership.role==='owner','Owner cannot remove their own access row')

 const members=ok(await owner.from('members').select('id,user_id').eq('group_id',groupId),'load expense members')
 const ownerMember=members.find(x=>x.user_id===ownerAuth.user.id),joinedMember=members.find(x=>x.user_id===memberAuth.user.id)
 expect(Boolean(ownerMember&&joinedMember),'Both accounts have linked expense participants')
 const expenseId=ok(await owner.rpc('save_expense',{p_group_id:groupId,p_expense_id:null,p_description:'Integration dinner',p_amount:42.5,p_paid_by:ownerMember.id,p_expense_date:'2026-08-26',p_participant_ids:[ownerMember.id,joinedMember.id]}),'save expense')
 expect(Boolean(expenseId),'Transactional expense RPC creates an expense')
 const memberExpense=ok(await member.from('expenses').select('id,description,expense_participants(member_id)').eq('id',expenseId).single(),'member reads expense')
 expect(memberExpense.expense_participants.length===2,'Joined member reads expense and participants')

 await member.from('expenses').update({description:'forbidden edit'}).eq('id',expenseId)
 const protectedExpense=ok(await owner.from('expenses').select('description').eq('id',expenseId).single(),'expense protection verification')
 expect(protectedExpense.description==='Integration dinner','RLS prevents another member from editing owner expense')

 await member.realtime.setAuth(memberAuth.session.access_token)
 const realtimePromise=waitFor((done,fail)=>{
  channel=member.channel(`integration:${groupId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'members',filter:`group_id=eq.${groupId}`},payload=>done(payload)).subscribe(async(status,error)=>{
   if(status==='SUBSCRIBED'){
    const {error:insertError}=await owner.from('members').insert({group_id:groupId,name:'Realtime participant'})
    if(insertError)fail(new Error(`Realtime test insert: ${insertError.message}`))
   }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))fail(new Error(`Realtime ${status}: ${error?.message||'no details'}`))
  })
 })
 const payload=await realtimePromise
 expect(payload?.new?.group_id===groupId,'Realtime delivers a filtered group change to the joined member')
}finally{
 if(channel)await member.removeChannel(channel)
 if(groupId){
  let {error}=await owner.from('groups').delete().eq('id',groupId)
  if(error){
   for(const table of ['expense_participants','settlements','expenses'])await owner.from(table).delete().eq('group_id',groupId)
   ;({error}=await owner.from('groups').delete().eq('id',groupId))
  }
  if(error)console.error(`CLEANUP_ERROR ${error.message}`)
  else{
   const {data}=await owner.from('groups').select('id').eq('id',groupId)
   if(data?.length===0)pass('Test group deleted')
   else console.error('CLEANUP_ERROR group still exists')
  }
 }
 await owner.auth.signOut()
 await member.auth.signOut()
}
