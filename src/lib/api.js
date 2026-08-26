import {mapGroup} from './mappers'

const groupSelect=`id,name,currency,owner_id,invite_code,created_at,members(id,user_id,name,color,created_at),expenses(id,group_id,description,amount,paid_by,expense_date,created_by,created_at,expense_participants(member_id)),settlements(id,group_id,from_member_id,to_member_id,amount,settled_at,created_by)`
const ok=({data,error})=>{if(error)throw error;return data}

export async function loadGroups(client){
 const rows=ok(await client.from('groups').select(groupSelect).order('created_at',{ascending:false}))
 return rows.map(mapGroup)
}
export async function createGroup(client,name,currency){return ok(await client.rpc('create_group_with_invite',{p_name:name,p_currency:currency})).at(0)}
export async function joinGroup(client,code){return ok(await client.rpc('join_group_by_code',{p_code:code.trim().toUpperCase()})).at(0)}
export async function saveProfile(client,userId,displayName){return ok(await client.from('profiles').upsert({id:userId,display_name:displayName},{onConflict:'id'}).select().single())}
export async function addMember(client,groupId,name){return ok(await client.from('members').insert({group_id:groupId,name:name.trim()}).select().single())}
export async function saveExpense(client,groupId,expense){
 return ok(await client.rpc('save_expense',{p_group_id:groupId,p_expense_id:expense.id||null,p_description:expense.description,p_amount:expense.amount,p_paid_by:expense.payerId,p_expense_date:expense.date,p_participant_ids:expense.participantIds}))
}
export async function deleteExpense(client,id){ok(await client.from('expenses').delete().eq('id',id))}
export async function addSettlement(client,groupId,d){return ok(await client.from('settlements').insert({group_id:groupId,from_member_id:d.fromId,to_member_id:d.toId,amount:d.amount}).select().single())}
export async function importLocalV1(client,data){return ok(await client.rpc('import_local_v1',{p_data:data}))}
