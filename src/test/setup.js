import '@testing-library/jest-dom'
const store=new Map()
Object.defineProperty(globalThis,'localStorage',{value:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key),clear:()=>store.clear()},configurable:true})
