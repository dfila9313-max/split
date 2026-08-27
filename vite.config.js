import {createHash} from 'node:crypto'
import {readdir,readFile,writeFile} from 'node:fs/promises'
import {join,relative,resolve,sep} from 'node:path'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

async function filesIn(directory){
 const entries=await readdir(directory,{withFileTypes:true})
 const files=await Promise.all(entries.map(entry=>entry.isDirectory()?filesIn(join(directory,entry.name)):join(directory,entry.name)))
 return files.flat()
}

function splitServiceWorker(){
 let base='/'
 return {name:'split-service-worker',apply:'build',configResolved(config){base=config.base},async closeBundle(){
  const dist=resolve('dist')
  const files=(await filesIn(dist)).filter(file=>!file.endsWith('.map')&&!file.endsWith(`${sep}sw.js`)).sort()
  const paths=files.map(file=>`${base}${relative(dist,file).split(sep).join('/')}`)
  const hash=createHash('sha256')
  for(let index=0;index<files.length;index++){hash.update(paths[index]);hash.update(await readFile(files[index]))}
  const version=hash.digest('hex').slice(0,16)
  const shell=`${base}index.html`
  const worker=`const CACHE_NAME='split-shell-${version}'
const PRECACHE=${JSON.stringify(paths)}
const PRECACHE_SET=new Set(PRECACHE)
const SHELL=${JSON.stringify(shell)}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting())))
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('split-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())))
self.addEventListener('fetch',event=>{
 const request=event.request
 if(request.method!=='GET')return
 const url=new URL(request.url)
 if(url.origin!==self.location.origin)return
 if(request.mode==='navigate'){
  event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
   if(response.ok&&response.type==='basic')caches.open(CACHE_NAME).then(cache=>cache.put(SHELL,response.clone()))
   return response
  }).catch(()=>caches.match(SHELL)))
  return
 }
 if(!PRECACHE_SET.has(url.pathname))return
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)))
})
`
  await writeFile(join(dist,'sw.js'),worker)
 }}
}

export default defineConfig({base:process.env.VITE_BASE_PATH||'/',plugins:[react(),splitServiceWorker()],test:{environment:'jsdom',globals:true,setupFiles:'./src/test/setup.js'}})
