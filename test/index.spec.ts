import { describe, it, expect } from 'vitest'
import { stack, parseHTML } from '../src/parser'
import { html } from '../src/server'
describe('test', () => {
  it('test', () => {
    parseHTML(html)
    expect(stack).toMatchInlineSnapshot()
  })
})
