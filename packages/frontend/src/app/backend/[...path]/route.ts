import type { NextRequest } from 'next/server'
import { request as httpRequest, type ClientRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

const PI_SERVER_URL = process.env.PI_SERVER_URL ?? 'http://127.0.0.1:3000'

export const dynamic = 'force-dynamic'

/**
 * Stream SSE via Node.js http/https.request to avoid fetch buffering the response.
 * Propagates upstream error status codes and cleans up on client disconnect.
 */
function forwardSSE(request: NextRequest, params: { path: string[] }): Response {
  const targetPath = params.path.join('/')
  const targetUrl = new URL(`${PI_SERVER_URL}/${targetPath}`)
  targetUrl.search = request.nextUrl.search

  const requestFn = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest
  let upstreamReq: ClientRequest | null = null

  const stream = new ReadableStream({
    start(controller) {
      upstreamReq = requestFn(targetUrl, {
        method: 'GET',
        headers: {
          cookie: request.headers.get('cookie') ?? '',
          'last-event-id': request.headers.get('last-event-id') ?? '',
        },
      }, (res) => {
        if (res.statusCode && res.statusCode !== 200) {
          console.error('[sse-proxy] upstream error', { url: targetUrl.href, status: res.statusCode })
          // Collect error body and close stream so the client gets a proper error
          let body = ''
          res.on('data', (chunk: Buffer) => { body += chunk.toString() })
          res.on('end', () => {
            const errorEvent = `event: error\ndata: ${JSON.stringify({ status: res.statusCode, message: body })}\n\n`
            controller.enqueue(new TextEncoder().encode(errorEvent))
            controller.close()
          })
          return
        }
        res.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk)
        })
        res.on('end', () => {
          controller.close()
        })
        res.on('error', (err) => {
          controller.error(err)
        })
      })
      upstreamReq.on('error', (err) => {
        console.error('[sse-proxy] connection error', { url: targetUrl.href, error: String(err) })
        controller.error(err)
      })
      upstreamReq.end()
    },
    cancel() {
      upstreamReq?.destroy()
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
