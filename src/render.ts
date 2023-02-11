import images from 'images';
import { HTMLElement } from './type';
export function createViewport(width:number,height:number){
    return images(width,height)
}
export function render(viewport:images.Image,element:HTMLElement,step:number=0){
    if(element.layoutStyle){
        // @ts-ignore
        const img=images(element.layoutStyle.width,element.layoutStyle.height)
        
        if(element.layoutStyle['background-color']){
            step++
            const color=element.layoutStyle['background-color']||'rgb(0,0,0)'
             // @ts-ignore
            color.match(/rgb\((\d+),(\d+),(\d+)\)/)
            img.fill(Number(RegExp.$1),Number(RegExp.$2),Number(RegExp.$3))
             // @ts-ignore
            viewport.draw(img,element.layoutStyle.left||0,element.layoutStyle.top||0)
            viewport.save(`res${step}.jpg`)
        }
    }

    if(element.children){
        for (const child of element.children) {
            render(viewport,child,step)
        }
    }
}