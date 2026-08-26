const palette=['#6c5ce7','#00b894','#e17055','#0984e3','#e84393','#fdcb6e']
const colorFor=id=>palette[[...String(id)].reduce((a,c)=>a+c.charCodeAt(0),0)%palette.length]
export function mapGroup(row){
 return {id:row.id,name:row.name,currency:row.currency,ownerId:row.owner_id,inviteCode:row.invite_code||null,
  members:(row.members||[]).map(x=>({id:x.id,userId:x.user_id||null,name:x.name||'Участник',color:x.color||colorFor(x.id)})),
  expenses:(row.expenses||[]).map(mapExpense).sort((a,b)=>String(b.date).localeCompare(String(a.date))),
  settlements:(row.settlements||[]).map(mapSettlement)}
}
export function mapExpense(row){return {id:row.id,groupId:row.group_id,description:row.description,amount:Number(row.amount),payerId:row.paid_by,participantIds:(row.expense_participants||[]).map(x=>x.member_id),date:row.expense_date,createdBy:row.created_by}}
export function mapSettlement(row){return {id:row.id,groupId:row.group_id,fromId:row.from_member_id,toId:row.to_member_id,amount:Number(row.amount),date:row.settled_at,createdBy:row.created_by}}
