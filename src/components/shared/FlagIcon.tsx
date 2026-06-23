'use client'

import { cn } from '@/lib/utils'

// Converts a flag emoji (e.g. "🇺🇸") to ISO 3166-1 alpha-2 country code ("us").
// Regional Indicator Symbols: 🇦 = U+1F1E6, 🇧 = U+1F1E7, ..., 🇿 = U+1F1FF
function emojiToIso2(emoji: string): string | null {
  const codes: number[] = []
  for (const c of [...emoji]) {
    const cp = c.codePointAt(0)
    if (cp !== undefined && cp >= 0x1F1E6 && cp <= 0x1F1FF) {
      codes.push(cp - 0x1F1E6 + 65) // 65 = ASCII 'A'
    }
  }
  if (codes.length === 2) {
    return String.fromCharCode(codes[0], codes[1]).toLowerCase()
  }
  return null
}

interface FlagIconProps {
  flag: string | null | undefined
  className?: string
  style?: React.CSSProperties
  fallback?: string
}

/**
 * Renders a country flag using flag-icons CSS sprites (cross-platform, works on Windows).
 * Accepts a flag emoji string (e.g. "🇺🇸") and renders it as an image-based flag.
 * Falls back to raw text for non-flag inputs (e.g. "₭", "💱").
 */
export function FlagIcon({ flag, className, style, fallback = '—' }: FlagIconProps) {
  if (!flag) {
    return <span className={className} style={style}>{fallback}</span>
  }

  const iso = emojiToIso2(flag)

  if (!iso) {
    // Not a flag emoji — render as plain text (e.g. "₭", "💱")
    return <span className={className} style={style}>{flag}</span>
  }

  return (
    <span
      className={cn(`fi fi-${iso}`, className)}
      style={{ lineHeight: 1, ...style }}
    />
  )
}
