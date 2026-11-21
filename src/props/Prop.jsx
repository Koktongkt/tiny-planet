// <Prop id="bed" position={[x, 0, z]} rotation-y={a} pal={{ quilt: '#8fc3e8' }} />: a baked chibi prop (2-3 draw calls).
import React, { useMemo } from 'react'
import { makeProp } from './index.js'
export function Prop({ id, pal, opts, ...rest }) {
  const obj = useMemo(() => makeProp(id, { ...(opts || {}), ...(pal ? { pal } : {}) }), [id, JSON.stringify(pal), JSON.stringify(opts)])
  return <primitive object={obj} {...rest} />
}
