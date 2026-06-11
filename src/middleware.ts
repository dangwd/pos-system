import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

const CASHIER_HOME = '/pos'
const ADMIN_HOME = '/admin/dashboard'

function getHomeByRole(role: string | undefined): string {
  return role === 'Cashier' ? CASHIER_HOME : ADMIN_HOME
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = request.cookies.has('is_authenticated')
  const role = request.cookies.get('user_role')?.value

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(getHomeByRole(role), request.url))
    }
    return NextResponse.next()
  }

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
