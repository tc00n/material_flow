import { NextResponse, type NextRequest } from 'next/server'

// Auth protection is handled server-side in src/app/(protected)/layout.tsx
// This middleware is a no-op pass-through.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}
