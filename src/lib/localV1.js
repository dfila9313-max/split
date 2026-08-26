const KEY='split-data-v1'
export function detectLocalV1(storage=globalThis.localStorage){
 try{const raw=storage?.getItem(KEY);if(!raw)return {available:false,count:0};const data=JSON.parse(raw);const count=Array.isArray(data?.groups)?data.groups.length:0;return {available:count>0,count,data}}catch{return {available:false,count:0,invalid:true}}
}
export const LOCAL_V1_KEY=KEY
