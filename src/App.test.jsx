import {beforeEach,describe,expect,it} from 'vitest'
import {fireEvent,render,screen} from '@testing-library/react'
import App from './App'

describe('Основные сценарии Split',()=>{
 beforeEach(()=>{localStorage.clear();document.documentElement.removeAttribute('data-theme')})

 it('показывает тестовую группу и открывает детали',()=>{
  render(<App/>)
  expect(screen.getByText('Поездка в Италию')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Поездка в Италию'))
  expect(screen.getByText('Ужин в Риме')).toBeInTheDocument()
  expect(screen.getAllByText(/198,00/).length).toBeGreaterThan(0)
 })

 it('создаёт новую локальную группу',()=>{
  render(<App/>)
  fireEvent.click(screen.getByText('Новая группа'))
  fireEvent.change(screen.getByPlaceholderText('Например, поездка в Японию'),{target:{value:'Выходные'}})
  fireEvent.click(screen.getByRole('button',{name:'Создать группу'}))
  expect(screen.getByText('Выходные')).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('split-data-v1')).groups).toHaveLength(2)
 })

 it('переключает тему и сохраняет выбор',()=>{
  render(<App/>)
  fireEvent.click(screen.getByRole('button',{name:'Тёмная'}))
  expect(document.documentElement).toHaveAttribute('data-theme','dark')
  expect(JSON.parse(localStorage.getItem('split-data-v1')).theme).toBe('dark')
  fireEvent.click(screen.getByRole('button',{name:'Светлая'}))
  expect(document.documentElement).toHaveAttribute('data-theme','light')
  expect(JSON.parse(localStorage.getItem('split-data-v1')).theme).toBe('light')
 })
})
