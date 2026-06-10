'use client'

import { AnimatePresence, motion } from 'motion/react'
import { usePathname } from 'next/navigation'

interface Props {
  children: React.ReactNode
}

export function PageTransition({ children }: Props) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
