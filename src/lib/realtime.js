export function subscribeToGroup(client,groupId,onChange){
 const channel=client.channel(`group:${groupId}`)
 const groupTables=['group_users','members','expenses','expense_participants','settlements']
 groupTables.forEach(table=>{
  ;['INSERT','UPDATE'].forEach(event=>channel.on('postgres_changes',{event,schema:'public',table,filter:`group_id=eq.${groupId}`},onChange))
  // DELETE payloads do not reliably contain filter columns unless they are part of the PK.
  // RLS still limits delivery; any accessible deletion triggers a fresh group query.
  channel.on('postgres_changes',{event:'DELETE',schema:'public',table},onChange)
 })
 ;['INSERT','UPDATE'].forEach(event=>channel.on('postgres_changes',{event,schema:'public',table:'groups',filter:`id=eq.${groupId}`},onChange))
 channel.on('postgres_changes',{event:'DELETE',schema:'public',table:'groups'},onChange)
 channel.subscribe()
 return ()=>client.removeChannel(channel)
}
