import { VNode, VNodeData } from '../src/vnode';
import { Module } from './module'

export type Classes = Record<string, boolean>;

//更新样式的适配器（只负责更改实际的dom而不负责改变虚拟dom）
/**
 * 
 * @param oldVnode
 * @param vnode 
 * @returns 
 */
function updateClass(oldVnode: VNode, vnode: VNode): void {
    let cur: any;
    let name: string;
    //获取新结点
    const elm: Element = vnode.elm as Element;
    //旧结点的样式（虚拟结点）
    let oldClass = (oldVnode.data as VNodeData).class;
    //新结点的样式（虚拟结点）
    let klass = (vnode.data as VNodeData).class;
    if(!oldVnode && !vnode) return;
    if(oldVnode === vnode) return;
    oldClass = oldClass || {};
    klass = klass || {};
    //遍历所有oldClass的所有属性（包括继承属性）
    for(name in oldClass){
        //如果旧结点存在此样式，新结点不存在该样式，则移除该样式。
        if(oldClass[name] && !Object.prototype.hasOwnProperty.call(klass, name)){
            //was 'true' and now not provided
            elm.classList.remove(name);
        }

    }
    //遍历新结点
    for(name in klass){
        cur = klass[name];
        //如果新结点的样式不等于旧节点的样式或者旧结点不出在该样式，则往旧的结点添加该样式。
        if(cur != oldClass[name]){
            (elm.classList as any)[cur ? 'add' : 'remove'](name);
        }
    }
}


export const classModule: Module = { create: updateClass, update: updateClass };