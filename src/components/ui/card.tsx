import React from 'react'
export function Card({className='', ...props}: any){ return <div className={`rounded-xl border border-slate-200 bg-white ${className}`} {...props}/> }
export function CardHeader({className='', ...props}: any){ return <div className={`p-4 border-b ${className}`} {...props}/> }
export function CardTitle({className='', ...props}: any){ return <h3 className={`text-base font-semibold ${className}`} {...props}/> }
export function CardDescription({className='', ...props}: any){ return <p className={`text-xs text-slate-500 ${className}`} {...props}/> }
export function CardContent({className='', ...props}: any){ return <div className={`p-4 ${className}`} {...props}/> }