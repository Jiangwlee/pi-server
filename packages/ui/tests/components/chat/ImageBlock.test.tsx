// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImageBlock } from '../../../src/components/chat/ImageBlock.js'

describe('ImageBlock', () => {
  it('renders image with base64 data url src', () => {
    render(
      <ImageBlock
        content={{
          type: 'image',
          data: 'aGVsbG8=',
          mimeType: 'image/png',
        }}
      />, 
    )

    const image = screen.getByRole('img', { name: 'message image' }) as HTMLImageElement
    expect(image.src).toContain('data:image/png;base64,aGVsbG8=')
  })
})
