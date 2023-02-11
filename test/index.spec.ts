import { describe, expect, it } from 'vitest'
import { parseHTML, stack } from '../src/parser'
import { html2 } from '../src/server'
describe('test', () => {
  it('test', () => {
    parseHTML(html2)
    expect(stack).toMatchInlineSnapshot()
  })
})
