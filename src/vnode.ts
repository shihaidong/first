import { Prop } from '../modules/props'
import { Attrs } from '../modules/attribtes'
import { Classes } from '../modules/class'
import { VNodeStyle } from '../modules/style'
import { Dataset } from '../modules/dataset'
import { On } from '../modules/on'


type Key = string | number | symbol;
export interface VNode {
    sel: string | undefined;
    data: VNodeData | undefined;
    children: Array<VNode | string> | undefined;
    elm: Node | undefined;
    text: string | undefined;
    key: Key | undefined;
}

export interface VNodeData {
    prop?: Prop;
    attrs?: Attrs;
    class?: Classes;
    style?: VNodeStyle;
    dataset?: Dataset;
    on?: On;
    key?: Key;
    ns?: string; //for SVGs
    //hook,attachData,
    fn?: () => VNode;
    args?: any[];
    is?: string; //for custom elements v1
    [key: string]: any;
}

export function vnode(
    sel: string | undefined,
    data: any | undefined,
    children: Array<VNode | string> | undefined,
    text: string | undefined,
    elm: Element | Text | undefined
): VNode{
    const key = data === undefined ? undefined : data.key ;
    return { sel, data, children, text, elm, key};
}