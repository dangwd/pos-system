import { redirect } from 'next/navigation'

// "Báo cáo" không còn màn riêng — chỉ là mục cha gom 2 báo cáo con.
// Vào /admin/reports sẽ nhảy thẳng tới báo cáo con đầu tiên.
export default function ReportsPage() {
  redirect('/admin/reports/inventory')
}
