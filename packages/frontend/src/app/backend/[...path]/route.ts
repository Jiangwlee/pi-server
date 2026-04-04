import type { NextRequest } from 'next/server'
import { request as httpRequest } from 'node:http'

const PI_SERVER_URL = process.env.PI_SERVER_URL ?? 'http://127.0.0.1:3000'

export const dynamic = 'force-dynamic'

/**
 * Stream SSE via Node.js http.request to avoid fetch buffering the response.
 */
function forwardSSE(request: NextRequest, params: { path: string[] }): Response {
  const targetPath = params.path.join('/')
  const targetUrl = new URL(`${PI_SERVER_URL}/${targetPath}`)
  targetUrl.search = request.nextUrl.search

  console.log('[SSE-proxy] forwardSSE to', targetUrl.href)

  const stream = new ReadableStream({
    start(controller) {
      const req = httpRequest(targetUrl, {
        method: 'GET',
        headers: {
          cookie: request.headers.get('cookie') ?? '',
          'last-event-id': request.headers.get('last-event-id') ?? '',
        },
      }, (res) => {
        console.log('[SSE-proxy] upstream status:', res.statusCode)
        res.on('data', (chunk: Buffer) => {
          console.log('[SSE-proxy] chunk', chunk.length, 'bytes')
          controller.enqueue(chunk)
        })
        res.on('end', () => {
          console.log('[SSE-proxy] upstream ended')
          controller.close()
        })
        res.on('error', (err) => {
          console.error('[SSE-proxy] upstream error:', err)
          controller.error(err)
        })
      })
      req.on('error', (err) => {
        console.error('[SSE-proxy] request error:', err)
        controller.error(err)
      })
      req.end()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

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
  const params = await context.params
  // SSE endpoints need streaming via Node.js http to avoid fetch buffering
  if (params.path.at(-1) === 'events') {
    return forwardSSE(request, params)
  }
  return forward(request, params)
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
