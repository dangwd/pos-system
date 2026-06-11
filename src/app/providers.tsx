'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { App, ConfigProvider, theme } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import { Toaster } from '@/components/ui/sonner'

// Blue-600 #2563EB, matches --primary in globals.css
const BLUE = '#2563EB'

const antdTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary:     BLUE,
    colorSuccess:     '#16A34A',
    colorWarning:     '#F59E0B',
    colorError:       '#DC2626',
    colorInfo:        BLUE,
    colorLink:        BLUE,
    colorBgLayout:    '#F8FAFC',
    colorBgContainer: '#FFFFFF',
    borderRadius:     8,
    fontFamily:       'inherit',
    fontSize:         14,
    controlHeight:    36,
  },
  components: {
    Button:  { controlHeight: 36, borderRadius: 6, fontWeight: 500 },
    Input:   { controlHeight: 36, borderRadius: 6 },
    Select:  { controlHeight: 36, borderRadius: 6 },
    Modal:   { borderRadiusLG: 8 },
  },
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60, retry: 1 },
    },
  }))
  return (
    <QueryClientProvider client={qc}>
      <StyleProvider>
        <ConfigProvider theme={antdTheme}>
          <App>
            {children}
            <Toaster richColors position="top-right" />
          </App>
        </ConfigProvider>
      </StyleProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
