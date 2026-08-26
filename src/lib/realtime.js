export function subscribeToGroup(client,groupId,onChange){
 const channel=client.channel(`group:${groupId}`)
 ;['group_users','members','expenses','expense_participants','settlements'].forEach(table=>{
  channel.on('postgres_changes',{event:'*',schema:'public',table,filter:`group_id=eq.${groupId}`},onChange)
 })
 // groups uses id rather than group_id, so keep a dedicated subscription.
 channel.on('postgres_changes',{event:'*',schema:'public',table:'groups',filter:`id=eq.${groupId}`},onChange)
 channel.subscribe()
 return ()=>client.removeChannel(channel)
}
