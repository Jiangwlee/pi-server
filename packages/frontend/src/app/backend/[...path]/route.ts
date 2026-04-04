import type { NextRequest } from 'next/server'

const PI_SERVER_URL = process.env.PI_SERVER_URL ?? 'http://127.0.0.1:3000'

export const dynamic = 'force-dynamic'

async function forward(request: NextRequest, params: { path: string[] }) {
  const targetPath = params.path.join('/')
  const targetUrl = new URL(`${PI_SERVER_URL}/${targetPath}`)
  targetUrl.search = request.nextUrl.search

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('content-length')

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? await request.arrayBuffer() : undefined

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  })

  const responseHeaders = new Headers(upstream.headers)
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params)
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params)
}
