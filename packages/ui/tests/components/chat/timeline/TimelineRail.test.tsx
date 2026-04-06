// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { TimelineRail } from '../../../../src/components/chat/timeline/TimelineRail.js'

afterEach(() => {
  cleanup()
})

describe('TimelineRail', () => {
  it('renders icon and both connectors when non-first and non-last', () => {
    render(<TimelineRail state="inprogress" />)

    expect(screen.getByTestId('rail-icon')).toBeTruthy()

    const top = screen.getByTestId('rail-top-connector')
    expect(top.getAttribute('data-visible')).toBe('true')

    const bottom = screen.getByTestId('rail-bottom-connector')
    expect(bottom.getAttribute('data-visible')).toBe('true')
  })

  it('hides top connector when isFirst', () => {
    render(<TimelineRail state="complete" isFirst />)

    const top = screen.getByTestId('rail-top-connector')
    expect(top.getAttribute('data-visible')).toBe('false')
    expect(top.style.backgroundColor).toBe('transparent')

    const bottom = screen.getByTestId('rail-bottom-connector')
    expect(bottom.getAttribute('data-visible')).toBe('true')
  })

  it('omits bottom connector when isLast', () => {
    render(<TimelineRail state="error" isLast />)

    // Bottom connector should not be rendered at all when isLast
    expect(screen.queryByTestId('rail-bottom-connector')).toBeNull()

    const top = screen.getByTestId('rail-top-connector')
    expect(top.getAttribute('data-visible')).toBe('true')
  })

  it('renders inprogress state with dashed circle icon', () => {
    render(<TimelineRail state="inprogress" />)
    const icon = screen.getByTestId('rail-icon')
    const svg = icon.querySelector('svg')
    expect(svg).toBeTruthy()
    const circle = svg!.querySelector('circle')
    expect(circle?.getAttribute('stroke-dasharray')).toBeTruthy()
  })

  it('renders complete state with checkmark icon', () => {
    render(<TimelineRail state="complete" />)
    const icon = screen.getByTestId('rail-icon')
    const svg = icon.querySelector('svg')
    expect(svg).toBeTruthy()
    const path = svg!.querySelector('path')
    expect(path?.getAttribute('d')).toContain('5 8')
  })

  it('renders error state with X icon', () => {
    render(<TimelineRail state="error" />)
    const icon = screen.getByTestId('rail-icon')
    const svg = icon.querySelector('svg')
    expect(svg).toBeTruthy()
    const circle = svg!.querySelector('circle')
    expect(circle).toBeTruthy()
    const path = svg!.querySelector('path')
    expect(path?.getAttribute('d')).toContain('5.5')
  })
})
