'use client'

import { InputNumber as AntdInputNumber } from 'antd'
import type { InputNumberProps } from 'antd'

function fmt(value: number | string | undefined) {
  if (value === undefined || value === null || value === '') return ''
  const parts = String(value).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

function parse(value: string | undefined): number {
  return Number(value?.replace(/,/g, '') ?? 0)
}

export function InputNumber(props: InputNumberProps) {
  return <AntdInputNumber formatter={fmt} parser={parse} {...props} />
}
