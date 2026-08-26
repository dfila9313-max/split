import {describe,expect,it} from 'vitest'
import {mapGroup} from './mappers'

describe('Supabase mappers',()=>{
 it('преобразует numeric и отдельные group members',()=>{
  const group=mapGroup({id:'g',name:'Trip',currency:'EUR',owner_id:'u',invite_code:'ABC',members:[{id:'m1',user_id:'u',name:'Ivan'}],expenses:[{id:'e',group_id:'g',description:'Dinner',amount:'12.50',paid_by:'m1',expense_date:'2026-08-26',created_by:'u',expense_participants:[{member_id:'m1'}]}],settlements:[{id:'s',group_id:'g',from_member_id:'m1',to_member_id:'m2',amount:'4.25'}]})
  expect(group.members[0]).toMatchObject({id:'m1',userId:'u',name:'Ivan'})
  expect(group.expenses[0]).toMatchObject({amount:12.5,payerId:'m1',participantIds:['m1']})
  expect(group.settlements[0].amount).toBe(4.25)
 })
})
