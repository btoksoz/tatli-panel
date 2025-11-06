import React, { createContext, useContext, useState } from 'react'
type TabsCtx = { value: string, setValue: (v:string)=>void }
const Ctx = createContext<TabsCtx | null>(null)
export function Tabs({ defaultValue, className='', children }: {defaultValue:string, className?:string, children:any}){
  const [value, setValue] = useState(defaultValue)
  return <div className={className}><Ctx.Provider value={{value,setValue}}>{children}</Ctx.Provider></div>
}
export function TabsList({className='', ...props}: any){ return <div className={`grid grid-cols-5 gap-2 ${className}`} {...props}/> }
export function TabsTrigger({value, className='', children}: any){
  const ctx = useContext(Ctx)!
  const active = ctx.value === value
  return <button onClick={()=>ctx.setValue(value)} className={`rounded-md border px-3 py-1 text-sm ${active?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-700 border-slate-300'}`}>{children}</button>
}
export function TabsContent({value, className='', children}: any){
  const ctx = useContext(Ctx)!
  if(ctx.value !== value) return null
  return <div className={className}>{children}</div>
}