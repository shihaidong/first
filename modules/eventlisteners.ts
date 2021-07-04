import { VNode, VNodeData } from "../src/vnode";
import { Module } from './module';

type Listener<T> = (this: VNode, ev: T, vnode: VNode) => void;

export type On = {
    [N in keyof HTMLElementEventMap]?:
        | Listener<HTMLElementEventMap[N]>
        | Array<Listener<HTMLElementEventMap[N]>>;
} & {
    [event: string]: Listener<any> | Array<Listener<any>>;
};

type SomeListener<N extends keyof HTMLElementEventMap> = 
    | Listener<HTMLElementEventMap[N]>
    | Listener<any>;

function invokeHandler<N extends keyof HTMLElementEventMap>(
    handler: SomeListener<N> | Array<SomeListener<N>>,
    vnode: VNode,
    event?: Event
): void {
    if(typeof handler === "function") {
        handler.call(vnode, event, vnode);
    }else if(typeof handler === "object"){
        for(let i = 0; i < handler.length; i++){
            invokeHandler(handler[i], vnode, event);
        }
    }
}
