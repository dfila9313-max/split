import {describe,expect,it,vi} from 'vitest'
import {createGroup,joinGroup,saveExpense} from './api'

const rpcClient=result=>({rpc:vi.fn().mockResolvedValue(result)})

describe('Supabase API',()=>{
 it('нормализует tabular ответы create/join RPC',async()=>{
  const create=rpcClient({data:[{group_id:'g1',invite_code:'ABC'}],error:null})
  await expect(createGroup(create,'Trip','EUR')).resolves.toEqual({group_id:'g1',invite_code:'ABC'})
  expect(create.rpc).toHaveBeenCalledWith('create_group_with_invite',{p_name:'Trip',p_currency:'EUR'})

  const join=rpcClient({data:[{group_id:'g1'}],error:null})
  await expect(joinGroup(join,' ab-c ')).resolves.toEqual({group_id:'g1'})
  expect(join.rpc).toHaveBeenCalledWith('join_group_by_code',{p_code:'AB-C'})
 })

 it('передаёт расход в атомарный RPC',async()=>{
  const client=rpcClient({data:'expense-id',error:null})
  const expense={description:'Dinner',amount:42,payerId:'m1',date:'2026-08-26',participantIds:['m1','m2']}
  await expect(saveExpense(client,'g1',expense)).resolves.toBe('expense-id')
  expect(client.rpc).toHaveBeenCalledWith('save_expense',expect.objectContaining({p_group_id:'g1',p_expense_id:null,p_participant_ids:['m1','m2']}))
 })

 it('пробрасывает ошибку Supabase',async()=>{
  const failure=new Error('denied'),client=rpcClient({data:null,error:failure})
  await expect(createGroup(client,'Trip','EUR')).rejects.toBe(failure)
 })
})
