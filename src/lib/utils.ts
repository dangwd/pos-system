import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * UUID v4 an toàn cho MỌI context — kể cả HTTP (non-secure).
 *
 * `crypto.randomUUID()` chỉ tồn tại trong secure context (HTTPS hoặc localhost).
 * Khi deploy qua HTTP trên IP LAN (vd http://192.168.x.x), nó là `undefined`
 * và sẽ throw "crypto.randomUUID is not a function" → crash trang. Hàm này
 * fallback sang `crypto.getRandomValues()` (có sẵn cả trên HTTP) để không bao
 * giờ crash. Dùng cho ID cục bộ (tab hóa đơn...), không phải mục đích bảo mật.
 */
export function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40 // version 4
    b[8] = (b[8] & 0x3f) | 0x80 // variant 10xx
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"))
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
  }
  // Fallback cuối (hiếm khi tới) — chỉ cần unique cục bộ.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}
