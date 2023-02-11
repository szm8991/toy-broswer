import { HTMLElement } from './type'
function getStyle(element: HTMLElement) {
  if (!element.layoutStyle) element.layoutStyle = {}
  for (const prop of Object.keys(element.computedStyle!)) {
    // console.log(JSON.stringify(element.computedStyle![prop].value))
    // @ts-ignore
    const p = element.computedStyle![prop].value.children[0]
    // 暂时忽略了单位
    if (prop === 'width' || prop === 'height' || prop === 'flex')
      element.layoutStyle[prop] = parseInt(p.value)
    else if (prop === 'background-color')
      element.layoutStyle[prop] =
        p.name +
        // @ts-ignore
        p.children.reduce((pre, cur) => {
          return pre + cur.value
        }, '(') +
        ')'
    else element.layoutStyle[prop] = p.name
  }
  //   if (!element.layoutStyle.display) element.layoutStyle.display = 'flex'
  // console.log(element.layoutStyle)
  return element.layoutStyle
}

export function layout(element: HTMLElement) {
  // 没有计算完的样式表
  if (!element.computedStyle) return
  // 样式表预处理获取其值
  const elementStyle = getStyle(element)
  // 当前元素不是flex排版容器元素——只支持flex排版/布局
  if (elementStyle.display !== 'flex') return
  // 过滤掉文本节点
  const items = element.children!.filter(e => e.type === 'element')
  // hack order属性
  items.sort((a, b) => {
    return (a.order || 0) - (b.order || 0)
  })
  // 设置flex排版相关初始值
  ;['width', 'height'].forEach(size => {
    if (!elementStyle[size] || elementStyle[size] === 'auto' || elementStyle[size] === '')
      elementStyle[size] = null
  })
  if (!elementStyle.flexDirection || elementStyle.flexDirection === 'auto')
    elementStyle.flexDirection = 'row'
  if (!elementStyle.alignItems || elementStyle.alignItems === 'auto')
    elementStyle.alignItems = 'stretch'
  if (!elementStyle.justifyContent || elementStyle.justifyContent === 'auto')
    elementStyle.justifyContent = 'flex-start'
  if (!elementStyle.flexWrap || elementStyle.flexWrap === 'auto') elementStyle.flexWrap = 'nowrap'
  if (!elementStyle.alignContent || elementStyle.alignContent === 'auto')
    elementStyle.alignContent = 'stretch'

  // 获取主轴方向、主轴伸缩方向、主轴排版方向、元素尺寸位置
  let mainSize = '',
    mainStart = '',
    mainEnd = '',
    mainSign: any,
    mainBase: any
  // 获取交叉轴方向、交叉轴伸缩方向、交叉轴排版方向、元素尺寸位置
  let crossSize = '',
    crossStart = '',
    crossEnd = '',
    crossSign: any,
    crossBase: any
  if (elementStyle.flexDirection === 'row') {
    mainSize = 'width'
    mainStart = 'left'
    mainEnd = 'right'
    mainSign = +1
    mainBase = 0

    crossSize = 'height'
    crossStart = 'top'
    crossEnd = 'bottom'
  } else if (elementStyle.flexDirection === 'row-reverse') {
    mainSize = 'width'
    mainStart = 'right'
    mainEnd = 'left'
    mainSign = -1
    mainBase = elementStyle.width

    crossSize = 'height'
    crossStart = 'top'
    crossEnd = 'bottom'
  } else if (elementStyle.flexDirection === 'column') {
    mainSize = 'height'
    mainStart = 'top'
    mainEnd = 'bottom'
    mainSign = +1
    mainBase = 0

    crossSize = 'width'
    crossStart = 'left'
    crossEnd = 'right'
  } else if (elementStyle.flexDirection === 'column-reverse') {
    mainSize = 'height'
    mainStart = 'bottom'
    mainEnd = 'top'
    mainSign = -1
    mainBase = elementStyle.height

    crossSize = 'width'
    crossStart = 'left'
    crossEnd = 'right'
  }
  if (elementStyle.flexWrap === 'wrap-reverse') {
    let tmp = crossStart
    crossStart = crossEnd
    crossEnd = tmp
    crossSign = -1
  } else {
    crossSign = +1
    crossBase = 0
  }

  // flex排版容器元素没设置主轴尺寸时
  let isAutoMainSize = false
  if (!elementStyle[mainSize]) {
    elementStyle[mainSize] = 0
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemStyle = getStyle(item)
      if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== 'auto') {
        // @ts-ignore
        elementStyle[mainSize] += itemStyle[mainSize]
      }
    }
    isAutoMainSize = true
  }

  // flex排版行信息
  let flexLine: any = [],
    flexLines: any = [flexLine]
  // 当前行主轴剩余空间
  let mainRemainSpace = elementStyle[mainSize]
  // 当前行交叉轴高-由当前行最高子元素决定
  let crossSpace = 0
  // 收集子元素入行，设置行主轴、交叉轴尺寸信息
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const itemStyle = getStyle(item)
    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0
    }

    if (itemStyle.flex) flexLine.push(item)
    else if (elementStyle.flexWrap === 'nowrap' && isAutoMainSize) {
      // @ts-ignore
      mainRemainSpace -= itemStyle[mainSize]
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0)
        // @ts-ignore
        crossSpace = Math.max(crossSpace, itemStyle[crossSize])
      flexLine.push(item)
    } else {
      // @ts-ignore
      if (itemStyle[mainSize] > elementStyle[mainSize]) itemStyle[mainSize] = elementStyle[mainSize]
      // @ts-ignore
      if (mainRemainSpace < itemStyle[mainSize]) {
        flexLine.mainRemainSpace = mainRemainSpace
        flexLine.crossSpace = crossSpace
        flexLine = [item]
        flexLines.push(flexLine)
        mainRemainSpace = elementStyle[mainSize]
        crossSpace = 0
      } else {
        // @ts-ignore
        mainRemainSpace -= itemStyle[mainSize]
        if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0)
          // @ts-ignore
          crossSpace = Math.max(crossSpace, itemStyle[crossSize])
        flexLine.push(item)
      }
    }
  }
  // 行模型主轴剩余尺寸
  flexLine.mainRemainSpace = mainRemainSpace
  // 行模型交叉轴高
  if (elementStyle.flexWrap === 'nowrap' || isAutoMainSize) {
    flexLine.crossSpace =
      elementStyle[crossSize] !== undefined ? elementStyle[crossSize] : crossSpace
  } else flexLine.crossSpace = crossSpace

  // 根据主轴剩余尺寸计算主轴尺寸-压缩或拉伸设置flex属性的子元素尺寸并计算其位置
  // @ts-ignore
  if (mainRemainSpace < 0) {
    // @ts-ignore
    const scale = elementStyle[mainSize] / (elementStyle[mainSize] - mainRemainSpace)
    let currentMainStart = mainBase
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemStyle = getStyle(item)
      if (itemStyle.flex) {
        itemStyle[mainSize] = 0
      }
      // @ts-ignore
      itemStyle[mainSize] *= scale
      // @ts-ignore
      itemStyle[mainStart] = currentMainStart
      // @ts-ignore
      itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
      currentMainStart = itemStyle[mainEnd]
    }
  } else {
    flexLines.forEach((line: any) => {
      // @ts-ignore
      let mainRemainSpaceT = mainRemainSpace
      let elementFlexTotal = 0
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemStyle = getStyle(item)
        if (itemStyle.flex !== null && itemStyle.flex !== void 0) {
          // @ts-ignore
          elementFlexTotal += itemStyle.flex
          continue
        }
      }
      // 有没有设置flex属性的元素
      if (elementFlexTotal > 0) {
        let currentMainStart = mainBase
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          const itemStyle = getStyle(item)
          if (itemStyle.flex) {
            // @ts-ignore
            itemStyle[mainSize] = (mainRemainSpace / elementFlexTotal) * itemStyle.flex
          }
          // @ts-ignore
          itemStyle[mainStart] = currentMainStart
          // @ts-ignore
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
          currentMainStart = itemStyle[mainEnd]
        }
      } else {
        // justify-content规则
        let currentMainStart = mainBase
        let step = 0
        if (elementStyle.justifyContent === 'flex-end')
          // @ts-ignore
          currentMainStart = mainRemainSpaceT * mainSign + mainBase
        else if (elementStyle.justifyContent === 'center')
          // @ts-ignore
          currentMainStart = (mainRemainSpaceT / 2) * mainSign + mainBase
        else if (elementStyle.justifyContent === 'space-between')
          // @ts-ignore
          step = (mainRemainSpaceT / (items.length - 1)) * mainSign
        else if (elementStyle.justifyContent === 'space-around') {
          // @ts-ignore
          step = (mainRemainSpaceT / items.length) * mainSign
          currentMainStart = step / 2 + mainBase
        }
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          const itemStyle = getStyle(item)
          // @ts-ignore
          itemStyle[mainStart] = currentMainStart
          // @ts-ignore
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
          // @ts-ignore
          currentMainStart = itemStyle[mainEnd] + step
        }
      }
    })
  }
  // 根据交叉轴尺寸计算子元素交叉轴尺寸和位置
  let crossRemainSpace = 0
  if (!elementStyle[crossSize]) {
    elementStyle[crossSize] = 0
    for (let i = 0; i < flexLines.length; i++) elementStyle[crossSize] += flexLines[i].crossSpace
  } else {
    // @ts-ignore
    crossRemainSpace = elementStyle[crossSize]
    for (let i = 0; i < flexLines.length; i++) crossRemainSpace -= flexLines[i].crossSpace
  }

  if (elementStyle.flexWrap === 'warp-reverse') {
    crossBase = elementStyle[crossSize]
  } else crossBase = 0
  // @ts-ignore
  // let lineSize = elementStyle[crossSize] / flexLines.length
  let step = 0
  if (elementStyle.alignContent === 'flex-start') {
    crossBase += 0
    step = 0
  } else if (elementStyle.alignContent === 'flex-end') {
    crossBase += crossSign * crossRemainSpace
    step = 0
  } else if (elementStyle.alignContent === 'center') {
    crossBase += (crossSign * crossRemainSpace) / 2
    step = 0
  } else if (elementStyle.alignContent === 'space-between') {
    crossBase += 0
    step = crossRemainSpace / (flexLines.length - 1)
  } else if (elementStyle.alignContent === 'space-around') {
    step = crossRemainSpace / flexLines.length
    crossBase += (crossSign * step) / 2
  }
  if (elementStyle.alignContent === 'stretch') {
    crossBase += 0
    step = 0
  }
  // @ts-ignore
  flexLines.forEach(line => {
    let lineCrossSize =
      elementStyle.alignContent === 'stretch'
        ? line.crossSpace + crossRemainSpace / flexLines.length
        : line.crossSpace

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemStyle = getStyle(item)
      let align = itemStyle.alignSelf || elementStyle.alignItems
      if (item === null) itemStyle[crossSize] = align === 'stretch' ? lineCrossSize : 0
      if (align === 'flex-start') {
        itemStyle[crossStart] = crossBase
        // @ts-ignore
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
      }

      if (align === 'flex-end') {
        itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize
        // @ts-ignore
        itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize]
      }

      if (align === 'center') {
        // @ts-ignore
        itemStyle[crossStart] = crossBase + (crossSign * (lineCrossSize - itemStyle[crossSize])) / 2
        // @ts-ignore
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
      }

      if (align === 'stretch') {
        itemStyle[crossStart] = crossBase
        itemStyle[crossEnd] =
          // @ts-ignore
          crossBase + crossSign * lineCrossSize
        // crossBase + crossSign * (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0)
        //   ? lineCrossSize
        //   : 0
        // @ts-ignore
        if(!itemStyle[crossSize]) itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart])
      }
    }

    crossBase += crossSign * (lineCrossSize + step)
  })
}
