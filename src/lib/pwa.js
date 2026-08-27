export function registerPwa(){
 if(import.meta.env.DEV||!('serviceWorker' in navigator))return
 const hadController=Boolean(navigator.serviceWorker.controller)
 let refreshing=false
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(!hadController||refreshing)return
  refreshing=true
  location.reload()
 })
 addEventListener('load',async()=>{
  try{
   const base=import.meta.env.BASE_URL
   const registration=await navigator.serviceWorker.register(`${base}sw.js`,{scope:base,updateViaCache:'none'})
   const update=()=>registration.update().catch(()=>{})
   update()
   document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')update()})
   setInterval(update,60*60*1000)
  }catch(error){console.warn('PWA service worker registration failed',error)}
 })
}
