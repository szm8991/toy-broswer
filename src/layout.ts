import { HTMLElement } from './type'
function getStyle(element: HTMLElement) {
  if (!element.layoutStyle) element.layoutStyle = {}
  for (const prop of Object.keys(element.computedStyle!)) {
    // console.log(JSON.stringify(element.computedStyle![prop].value))
    // @ts-ignore
    const p = element.computedStyle![prop].value.children[0]
    // 暂时忽略了单位
    element.layoutStyle[prop] = parseInt(p.value)
  }
  if (!element.layoutStyle.display) element.layoutStyle.display = 'flex'
  // console.log(element.layoutStyle)
  return element.layoutStyle
}

export function layout(element: HTMLElement) {
  if (!element.computedStyle) return

  const elementStyle = getStyle(element)

  if (elementStyle.display !== 'flex') return

  const items = element.children!.filter(e => e.type === 'element')

  items.sort((a, b) => {
    return (a.order || 0) - (b.order || 0)
  })
  // 设置flex相关初始值
  ;['width', 'height'].forEach(size => {
    if (!elementStyle[size] || elementStyle[size] === 'auto' || elementStyle[size] === '')
      elementStyle[size] = null
  })
  if (!elementStyle.flexDirection || elementStyle.flexDirection === 'auto') {
    elementStyle.flexDirection = 'row'
  }
  if (!elementStyle.alignItems || elementStyle.alignItems === 'auto') {
    elementStyle.alignItems = 'stretch'
  }
  if (!elementStyle.justifyContent || elementStyle.justifyContent === 'auto') {
    elementStyle.justifyContent = 'flex-start'
  }
  if (!elementStyle.flexWrap || elementStyle.flexWrap === 'auto') {
    elementStyle.flexWrap = 'nowrap'
  }
  if (!elementStyle.alignContent || elementStyle.alignContent === 'auto') {
    elementStyle.alignContent = 'stretch'
  }
  //   console.log(elementStyle)
  //   主轴尺寸
  let mainSize, mainStart, mainEnd, mainSign, mainBase
  //   交叉轴尺寸
  let corssSize, corssStart, corssEnd, corssSign, corssBase
  if (elementStyle.flexDirection === 'row') {
    mainSize = 'width'
    mainStart = 'left'
    mainEnd = 'right'
    mainSign = +1
    mainBase = 0

    corssSize = 'height'
    corssStart = 'top'
    corssEnd = 'bottom'
  }
  if (elementStyle.flexDirection === 'row-reverse') {
    mainSize = 'width'
    mainStart = 'right'
    mainEnd = 'left'
    mainSign = -1
    mainBase = elementStyle.width

    corssSize = 'height'
    corssStart = 'top'
    corssEnd = 'bottom'
  }
  if (elementStyle.flexDirection === 'column') {
    mainSize = 'height'
    mainStart = 'top'
    mainEnd = 'bottom'
    mainSign = +1
    mainBase = 0

    corssSize = 'width'
    corssStart = 'left'
    corssEnd = 'right'
  }
  if (elementStyle.flexDirection === 'column-reverse') {
    mainSize = 'height'
    mainStart = 'bottom'
    mainEnd = 'top'
    mainSign = -1
    mainBase = elementStyle.height

    corssSize = 'width'
    corssStart = 'left'
    corssEnd = 'right'
  }
  if (elementStyle.flexWrap === 'wrap-reverse') {
    let tmp = corssStart
    corssStart = corssEnd
    corssEnd = tmp
    corssSign = -1
  } else {
    corssBase = 0
    corssSign = +1
  }
}
