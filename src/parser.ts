import * as csstree from 'css-tree'
import { layout } from './layout.js'
import { Attribute, HTMLElement, HTMLToken } from './type'

const EOF = Symbol('EOF') // EOF: End of File
let currentToken: HTMLToken | null = null
let currentAttribute: Attribute | null = null
export let stack: HTMLElement[] = [{ type: 'document', children: [] }]
let currentTextNode: HTMLElement | null = null

function emit(token: HTMLToken) {
  // console.log(token)
  let top = stack[stack.length - 1]
  if (token.type === 'startTag') {
    let element: HTMLElement = {
      type: 'element',
      children: [],
      attributes: [],
    }
    element.tagName = token.tagName
    for (const p in token) {
      if (p !== 'type' && p !== 'tagName') {
        element.attributes!.push({
          name: p,
          value: token[p],
        })
      }
    }
    if (
      element.tagName !== 'head' &&
      element.tagName !== 'meta' &&
      element.tagName !== 'style' &&
      element.tagName !== 'title' &&
      element.tagName !== 'script'
    )
      computeCSS(element)

    top.children!.push(element)
    element.parent = top
    if (!token.isSelfClosing) stack.push(element)
    currentTextNode = null
  } else if (token.type === 'endTag') {
    if (top.tagName !== token.tagName) throw new Error('Tag start end not match!')
    else {
      if (token.tagName === 'style') {
        addCSSRules(top.children![0].content!)
      }
      layout(top)
      stack.pop()
    }
    currentTextNode = null
  } else if (token.type === 'text') {
    if (currentTextNode == null) {
      currentTextNode = {
        type: 'text',
        content: '',
      }
      top.children!.push(currentTextNode)
    }
    currentTextNode.content += token.content!
  }
}

function computeCSS(element: HTMLElement) {
  // 获取父元素序列
  const elements = stack.slice().reverse()
  if (!element.computedStyle) element.computedStyle = {}
  if (rules.length == 0) {
    console.log('rules lengt equal 0')
    return
  }
  for (const rule of rules) {
    let selectorParts = rule.prelude.children[0].children.slice().reverse()
    // console.log(selectorParts)

    if (!match(element, selectorParts[0])) continue

    let matched = false
    let j = 1,
      i = 0
    while (i < elements.length) {
      if (j >= selectorParts.length) break
      if (selectorParts[j].type === 'Combinator') {
        j++
        continue
      }
      if (match(elements[i], selectorParts[j])) j++
      i++
    }
    if (j >= selectorParts.length) matched = true

    if (matched) {
      const sp = specificity(selectorParts)
      const computedStyle = element.computedStyle
      for (const declaration of rule.block.children) {
        // @ts-ignore
        if (!computedStyle[declaration.property]) computedStyle[declaration.property] = {}
        if (!computedStyle[declaration.property].specificity) {
          computedStyle[declaration.property].value = declaration.value
          // @ts-ignore
          computedStyle[declaration.property].specificity = sp
        } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
          computedStyle[declaration.property].value = declaration.value
          // @ts-ignore
          computedStyle[declaration.property].specificity = sp
        }
      }
    }
  }
  // console.log(
  //   element.tagName,
  //   Object.keys(element.computedStyle).map(key => `${key}`)
  // )
}

// count css specificity
function specificity(selectorParts: any) {
  const p = [0, 0, 0, 0]
  for (const selector of selectorParts) {
    if (selector.type === 'TypeSelector') p[3] += 1
    else if (selector.type === 'IdSelector') p[1] += 1
    else if (selector.type === 'ClassSelector') p[2] += 1
  }
  return p
}

// compare css specificity
function compare(sp1: any, sp2: any) {
  if (sp1[0] - sp2[0]) return sp1[0] - sp2[0]
  if (sp1[1] - sp2[1]) return sp1[1] - sp2[1]
  if (sp1[2] - sp2[2]) return sp1[2] - sp2[2]
  return sp1[3] - sp2[3]
}

let rules: any = []
function addCSSRules(text: string) {
  const ast = csstree.parse(text)
  // console.log(JSON.stringify(ast))
  // @ts-ignore
  rules.push(...JSON.parse(JSON.stringify(ast.children)))
}

function match(element: HTMLElement, selector: any): boolean {
  if (!selector || !element.attributes) return false
  if (selector.type === 'IdSelector') {
    const attr = element.attributes.filter(attr => attr.name === 'id')[0]
    if (attr && attr.value === selector.name) return true
  } else if (selector.type === 'ClassSelector') {
    const attr = element.attributes.filter(attr => attr.name === 'class')[0]
    if (attr && attr.value!.includes(selector.name)) return true
  } else if (selector.type === 'TypeSelector') {
    if (element.tagName === selector.name) return true
  }
  return false
}

function data(char: string | typeof EOF) {
  if (char === EOF) {
    emit({
      type: 'EOF',
    })
    return
  } else if (char === '<') return tagOpen
  else {
    emit({
      type: 'text',
      content: char,
    })
    return data
  }
}

function tagOpen(char: string) {
  if (char === '/') return endTagOpen
  else if (char.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'startTag',
      tagName: '',
    }
    return tagName(char)
  } else return
}

function endTagOpen(char: string) {
  if (char === '<') throw new Error('error')
  else if (char.match(/^[a-zA-Z0-9]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: '',
    }
    return tagName(char)
  } else return
}
// @ts-ignore
function tagName(char: string) {
  if (char.match(/^[\t\n\f ]$/)) return beforeAttributeName
  else if (char === '/') return selfClosingStartTag
  else if (char.match(/^[a-zA-Z0-9]$/)) {
    currentToken!.tagName += char
    return tagName
  } else if (char === '>') {
    emit(currentToken!)
    return data
  } else return tagName
}

function beforeAttributeName(char: string) {
  if (char === '/' || char === '>') return afterAttributeName(char)
  else if (char.match(/^[\t\n\f ]$/)) return beforeAttributeName
  else if (char === '=') {
  } else {
    currentAttribute = {
      name: '',
      value: '',
    }
    return attributeName(char)
  }
}

function attributeName(char: string) {
  if (char.match(/^[\t\n\f ]$/) || char === '/' || char === '>') return afterAttributeName(char)
  else if (char === '=') return beforeAttributeValue
  else if (char === '\u0000') {
  } else if (char === '"' || char == "'" || char == '<') {
  } else {
    currentAttribute!.name += char
    return attributeName
  }
}

function beforeAttributeValue(char: string) {
  if (char.match(/^[\t\n\f ]$/) || char === '/' || char === '>') return beforeAttributeValue
  else if (char == '"') return doubleQuoteAttributeValue
  else if (char == "'") return singleQuoteAttributeValue
  else if (char == '>') {
    // return data
  } else return unquotedQuoteAttributeValue
}

function doubleQuoteAttributeValue(char: string) {
  if (char === '"') {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    return afterQuotedAttributeValue
  } else if (char === '\u0000') {
  } else {
    currentAttribute!.value += char
    return doubleQuoteAttributeValue
  }
}

function singleQuoteAttributeValue(char: string) {
  if (char === "'") {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    return afterQuotedAttributeValue
  } else if (char === '\u0000') {
  } else {
    currentAttribute!.value += char
    return singleQuoteAttributeValue
  }
}

function afterQuotedAttributeValue(char: string) {
  if (char.match(/^[\t\n\f ]$/)) return beforeAttributeName
  else if (char === '/') return selfClosingStartTag
  else if (char === '>') {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    emit(currentToken!)
    return data
  } else {
    currentAttribute!.value += char
    return doubleQuoteAttributeValue
  }
}

function unquotedQuoteAttributeValue(char: string) {
  if (char.match(/^[\t\n\f ]$/)) {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    return beforeAttributeName
  } else if (char === '/') {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    return selfClosingStartTag
  } else if (char === '>') {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    emit(currentToken!)
    return data
  } else if (char === '\u0000') {
  } else if (char === '"' || char === "'" || char === '<' || char === '=' || char === '`') {
  } else {
    currentAttribute!.value += char
    return unquotedQuoteAttributeValue
  }
}

function afterAttributeName(char: string) {
  if (char.match(/^[\t\n\f ]$/)) {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    return beforeAttributeName
  } else if (char === '/') {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    return selfClosingStartTag
  } else if (char === '>') {
    currentToken![currentAttribute!.name] = currentAttribute!.value
    emit(currentToken!)
    return data
  }
}

function selfClosingStartTag(char: string | typeof EOF) {
  if (char === EOF) throw new Error('error')

  if (char === '>') {
    currentToken!.isSelfClosing = true
    emit(currentToken!)
    return data
  } else {
  }
}

export function parseHTML(html: string) {
  let state = data
  try {
    for (const char of html) {
      // @ts-ignore
      state = state(char)
    }
    // @ts-ignore
    state = state(EOF)
  } catch (error) {
    console.error(error)
  }
  // console.log(stack[0])
  return stack[0]
}
