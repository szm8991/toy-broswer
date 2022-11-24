import { describe, it, expect } from 'vitest'
import { stack, parseHTML } from '../src/parser'
import { html2, html } from '../src/server'
describe('test', () => {
  it('test', () => {
    parseHTML(html2)
    expect(stack).toMatchInlineSnapshot()
  })
})
