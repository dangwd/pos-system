import { App } from 'antd'

export function useToast() {
  const { message } = App.useApp()
  return {
    success: (content: string) => message.success(content),
    error:   (content: string) => message.error(content),
  }
}
