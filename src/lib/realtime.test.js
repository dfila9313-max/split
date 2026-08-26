import {describe,expect,it,vi} from 'vitest'
import {subscribeToGroup} from './realtime'

describe('Realtime subscription',()=>{
 it('подписывается только на строки выбранной группы и очищает канал',()=>{
  const channel={on:vi.fn().mockReturnThis(),subscribe:vi.fn().mockReturnThis()}
  const client={channel:vi.fn(()=>channel),removeChannel:vi.fn()}
  const onChange=vi.fn(),cleanup=subscribeToGroup(client,'g1',onChange)

  expect(client.channel).toHaveBeenCalledWith('group:g1')
  expect(channel.subscribe).toHaveBeenCalledOnce()
  expect(channel.on).toHaveBeenCalledTimes(18)
  expect(channel.on).toHaveBeenCalledWith('postgres_changes',expect.objectContaining({event:'UPDATE',table:'expense_participants',filter:'group_id=eq.g1'}),onChange)
  expect(channel.on).toHaveBeenCalledWith('postgres_changes',expect.objectContaining({event:'DELETE',table:'expense_participants'}),onChange)
  expect(channel.on).toHaveBeenCalledWith('postgres_changes',expect.objectContaining({event:'UPDATE',table:'groups',filter:'id=eq.g1'}),onChange)

  cleanup()
  expect(client.removeChannel).toHaveBeenCalledWith(channel)
 })
})
