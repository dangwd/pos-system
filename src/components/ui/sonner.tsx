"use client"

// antd <App> wrapping in providers.tsx cung cấp message context — không cần Toaster riêng.
// Component này giữ lại để không phá vỡ import hiện có.
function Toaster(_props: Record<string, unknown>) {
  return null
}

export { Toaster }
