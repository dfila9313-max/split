import {beforeEach,describe,expect,it} from 'vitest'
import {fireEvent,render,screen} from '@testing-library/react'
import App from './App'

describe('Split v2 без облачной конфигурации',()=>{
 beforeEach(()=>{localStorage.clear();document.documentElement.removeAttribute('data-theme')})

 it('не пытается подключаться с отсутствующими ключами',()=>{
  render(<App/>)
  expect(screen.getByRole('heading',{name:'Нужна настройка Supabase'})).toBeInTheDocument()
  expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeInTheDocument()
 })

 it('сохраняет локальные данные v1 и открывает только просмотр',()=>{
  localStorage.setItem('split-data-v1',JSON.stringify({theme:'dark',groups:[{id:'old',name:'Старая поездка',currency:'EUR',members:[],expenses:[],settlements:[]}]}))
  render(<App/>)
  expect(screen.getByText(/1 групп/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Открыть локальный просмотр'}))
  expect(screen.getByText('Старая поездка')).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('data-theme','dark')
  expect(JSON.parse(localStorage.getItem('split-data-v1')).groups[0].name).toBe('Старая поездка')
 })
})
