import React from 'react'
export function ScrollArea({className='', ...props}: any){ return <div className={`overflow-auto ${className}`} {...props}/> }