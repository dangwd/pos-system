import { message } from 'antd'

export const toast = {
  success: (content: string) => { message.success(content) },
  error:   (content: string) => { message.error(content) },
}
