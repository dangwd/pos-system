import { useRef, useCallback } from 'react'
import { CartCommandInvoker } from '@/lib/commands/cart.command'

export function useCartInvoker() {
  const invokerRef = useRef(new CartCommandInvoker())
  const invoker = invokerRef.current

  const run = useCallback((cmd: Parameters<CartCommandInvoker['run']>[0]) => {
    invoker.run(cmd)
  }, [invoker])

  const undo = useCallback(() => {
    invoker.undo()
  }, [invoker])

  return { run, undo, invoker }
}
