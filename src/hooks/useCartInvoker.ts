import { useRef, useCallback } from 'react'
import { CartCommandInvoker } from '@/lib/commands/cart.command'

export function useCartInvoker() {
  const invokerRef = useRef(new CartCommandInvoker())

  const run = useCallback((cmd: Parameters<CartCommandInvoker['run']>[0]) => {
    invokerRef.current.run(cmd)
  }, [])

  const undo = useCallback(() => {
    invokerRef.current.undo()
  }, [])

  return { run, undo }
}
