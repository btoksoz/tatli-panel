import React from 'react'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'outline'|'destructive'|'secondary', size?: 'sm'|'md' }
export function Button({variant='default', size='md', className='', ...props}: Props){
  const base = 'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition border'
  const variants: Record<string,string> = {
    default:'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    outline:'bg-white text-slate-800 border-slate-300 hover:bg-slate-50',
    secondary:'bg-slate-800 text-white border-slate-800 hover:bg-black',
    destructive:'bg-red-600 text-white border-red-600 hover:bg-red-700'
  }
  const sizes: Record<string,string> = { sm:'px-2 py-1 text-xs', md:'' }
  return <button className={`${base} ${variants[variant]} ${sizes[size||'md']} ${className}`} {...props} />
}