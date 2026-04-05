import { Hono } from 'hono'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import sharp from 'sharp'
import { logger } from '../logger.js'
import type { AttachmentStore } from '../stores/attachment-store.js'
import type { SessionStore } from '../stores/session-store.js'
import '../auth/types.js'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_FILE_IDS_PER_SEND = 10
const THUMBNAIL_SIZE = 256

function getAttachmentDir(dataDir: string, userId: string, fileId: string): string {
  return join(dataDir, 'users', userId, 'attachments', fileId)
}

export function createFileRoutes(
  attachmentStore: AttachmentStore,
  sessionStore: SessionStore,
  dataDir: string,
): Hono {
  const app = new Hono()

  // Upload file
  app.post('/api/files/upload', async (c) => {
    const userId = c.get('userId')

    const formData = await c.req.formData()
    const file = formData.get('file')
    const sessionId = formData.get('sessionId')

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'file is required' }, 400)
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return c.json({ error: 'sessionId is required' }, 400)
    }

    // Session ownership check
    const session = sessionStore.findById(sessionId, userId)
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    // File type check
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return c.json({ error: `Unsupported file type: ${file.type}. Allowed: ${[...ALLOWED_IMAGE_TYPES].join(', ')}` }, 400)
    }

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `File too large: ${file.size} bytes. Max: ${MAX_FILE_SIZE}` }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Magic bytes validation
    if (!validateImageMagicBytes(buffer, file.type)) {
      return c.json({ error: 'File content does not match declared MIME type' }, 400)
    }

    // Create DB record
    const attachment = attachmentStore.create({
      userId,
      sessionId,
      fileName: file.name || 'unnamed',
      mimeType: file.type,
      size: file.size,
    })

    // Write files to disk
    const dir = getAttachmentDir(dataDir, userId, attachment.id)
    mkdirSync(dir, { recursive: true })

    const ext = file.name?.split('.').pop() || mimeToExt(file.type)
    const originalPath = join(dir, `original.${ext}`)
    writeFileSync(originalPath, buffer)

    // Generate thumbnail
    try {
      const thumbnailPath = join(dir, 'thumbnail.webp')
      await sharp(buffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(thumbnailPath)
    } catch (err) {
      logger.warn({ attachmentId: attachment.id, err }, 'files.thumbnail_generation_failed')
      // Non-fatal: upload succeeds even if thumbnail fails
    }

    logger.info({
      attachmentId: attachment.id,
      userId,
      sessionId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    }, 'files.uploaded')

    return c.json({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      thumbnailUrl: `/api/files/${attachment.id}/thumbnail`,
    }, 201)
  })

  // Get thumbnail
  app.get('/api/files/:fileId/thumbnail', (c) => {
    const userId = c.get('userId')
    const fileId = c.req.param('fileId')

    const attachment = attachmentStore.findByIdAndUser(fileId, userId)
    if (!attachment) {
      return c.json({ error: 'File not found' }, 404)
    }

    const thumbnailPath = join(getAttachmentDir(dataDir, userId, fileId), 'thumbnail.webp')
    if (!existsSync(thumbnailPath)) {
      return c.json({ error: 'Thumbnail not available' }, 404)
    }

    const data = readFileSync(thumbnailPath)
    c.header('Content-Type', 'image/webp')
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
    return c.body(data)
  })

  // Get original file
  app.get('/api/files/:fileId/original', (c) => {
    const userId = c.get('userId')
    const fileId = c.req.param('fileId')

    const attachment = attachmentStore.findByIdAndUser(fileId, userId)
    if (!attachment) {
      return c.json({ error: 'File not found' }, 404)
    }

    const dir = getAttachmentDir(dataDir, userId, fileId)
    const ext = attachment.fileName.split('.').pop() || mimeToExt(attachment.mimeType)
    const originalPath = join(dir, `original.${ext}`)

    if (!existsSync(originalPath)) {
      return c.json({ error: 'Original file not available' }, 404)
    }

    const data = readFileSync(originalPath)
    c.header('Content-Type', attachment.mimeType)
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
    return c.body(data)
  })

  return app
}

/** Resolve file IDs to ImageContent for LLM prompt */
export async function resolveFileIdsToImages(
  fileIds: string[],
  userId: string,
  attachmentStore: AttachmentStore,
  dataDir: string,
): Promise<{ type: 'image'; data: string; mimeType: string }[]> {
  const images: { type: 'image'; data: string; mimeType: string }[] = []

  for (const fileId of fileIds) {
    const attachment = attachmentStore.findByIdAndUser(fileId, userId)
    if (!attachment) {
      throw new Error(`Attachment not found: ${fileId}`)
    }

    if (!ALLOWED_IMAGE_TYPES.has(attachment.mimeType)) {
      continue // Skip non-image attachments for now
    }

    const dir = getAttachmentDir(dataDir, userId, fileId)
    const ext = attachment.fileName.split('.').pop() || mimeToExt(attachment.mimeType)
    const originalPath = join(dir, `original.${ext}`)
    const buffer = readFileSync(originalPath)

    // Compress to max 2048px longest side before base64
    const compressed = await sharp(buffer)
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .toBuffer()

    images.push({
      type: 'image',
      data: compressed.toString('base64'),
      mimeType: attachment.mimeType,
    })
  }

  // Mark as referenced
  attachmentStore.markReferenced(fileIds)

  return images
}

export { MAX_FILE_IDS_PER_SEND }

function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false

  switch (mimeType) {
    case 'image/jpeg':
      return buffer[0] === 0xFF && buffer[1] === 0xD8
    case 'image/png':
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
    case 'image/gif':
      return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46
    case 'image/webp':
      return buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
        && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    default:
      return false
  }
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/gif': return 'gif'
    case 'image/webp': return 'webp'
    default: return 'bin'
  }
}
