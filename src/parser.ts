import { Attribute, HTMLElement, HTMLToken, TextNode } from './type'

const EOF = Symbol('EOF') // EOF: End of File
let currentToken: HTMLToken | null = null
let currentAttribute: Attribute | null = null
export let stack: HTMLElement[] = [{ type: 'document', children: [] }]
let currentTextNode: TextNode | null = null
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
    top.children!.push(element)
    element.parent = top
    if (!token.isSelfClosing) stack.push(element)
    currentTextNode = null
  } else if (token.type === 'endTag') {
    if (top.tagName !== token.tagName) throw new Error('Tag start end not match!')
    else stack.pop()
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
  else if (char.match(/^[a-zA-Z]$/)) {
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
  else if (char.match(/^[a-zA-Z]$/)) {
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
  console.log(stack[0])
  return html
}
