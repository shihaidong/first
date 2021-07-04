import { Module } from "../modules/module";
import { vnode, VNode } from "./vnode";
import * as is from "./is";
import { htmlDomApi, DOMAPI } from "./htmldomapi";

//技巧
type NonUndefined<T> = T extends undefined ? never : T;

//如果是undefined则返回true
function isUndef(s: any): boolean {
    return s === undefined;
}

//如果不是undefined则断言为指定的类型
function isDef<A>(s: A): s is NonUndefined<A> {
    return s !== undefined;
}

type VNodeQueue = VNode[];

const emptyNode = vnode("", {}, [], undefined, undefined);

function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
    const isSameKey = vnode1.key === vnode2.key;
    const isSameIs = vnode1.data?.is === vnode2.data?.is;
    const isSameSel = vnode1.sel === vnode2.sel;

    return isSameSel && isSameKey && isSameSel;
}

//如果该类型的sel存在，则断言为一个虚拟结点类型
function isVnode(vnode: any): vnode is VNode {
    return vnode.sel !== undefined;
}

type KeyToIndexMap = { [key: string]: number };

type ArrayOf<T> = {
    [K in keyof T]: Array<T[K]>;
}

type ModuleHooks = ArrayOf<Required<Module>>;

function createKeyToOldIdx(
    children: VNode[],
    beginIdx: number,
    endIdx: number
  ): KeyToIndexMap {
    const map: KeyToIndexMap = {};
    for (let i = beginIdx; i <= endIdx; ++i) {
      const key = children[i]?.key;
      if (key !== undefined) {
        map[key as string] = i;
      }
    }
    return map;
  }
//静态的东西不要放到闭包中，闭包会占用内存
const hooks: Array<keyof Module> = [
    "create",
    "update",
    "remove",
    "destory",
    "pre",
    "post"
];

export function init(modules: Array<Module>, domApi?: DOMAPI){
    let i: number;
    let j: number;
    //这个对象中存放所有的回调函数，用来处理dom树中不同的内容
    const cbs: ModuleHooks = {
        create: [],
        update: [],
        remove: [],
        destory: [],
        pre: [],
        post: []
    }

    const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;
    //将形参modules中的适配器的hook（钩子）绑定到cbs中。
    for (i = 0; i < hooks.length; ++i){
        //eg: cbs.create = []; cbs.update = []; 清空操作；
        cbs[hooks[i]] = [];
        //modules === [classModule, propsModule, ...arg];//各种适配器
        for(j = 0; j< modules.length; ++j){
            //eg: classModule.create
            const hook = modules[j][hooks[i]];
            if(hook !== undefined){
                //细节：编译和预编译
                (cbs[hooks[i]] as any[]).push(hook);
            }
        }
    }
    //根据dom结点转化为空的虚拟结点
    function emptyNodeAt(elm: Element): VNode{
        const id = elm.id ? "#" + elm.id : "";  //eg: #app
        //eg: <div class="app main"></div> 时，c 为 .app.main;
        const c = elm.className ? "." + elm.className.split(" ").join(".") : "";
        return vnode(
            api.tagName(elm).toLowerCase() + id + c,
            {},
            [],
            undefined,
            elm
        );
    }

    function createRmCb(childElm: Node, listeners: number) {
        return function rmCb() {
            if(--listeners === 0){
                const parent = api.parentNode(childElm) as Node;
                api.removeChild(parent, childElm);
            }
        }
    }
    //创建elm,执行h函数后创建虚拟结点中的elm是undefined，执行完patch函数后才会被赋值
    function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node{
        let i: any;
        let data = vnode.data;
        if(data !== undefined){
            const init = data.hook?.init;
            if(isDef(init)) {
                init(vnode);
                data = vnode.data;
            }
        }
        const children = vnode.children;
        const sel = vnode.sel;
        if(sel === "!"){
            if(isUndef(vnode.text)){
                vnode.text = "";
            }
            vnode.elm = api.createComment(vnode.text);
        }else if(sel !== undefined){
            //eg:div#app.main.name
            const hashIdx = sel.indexOf("#");   //3
            const dotIdx = sel.indexOf(".", hashIdx);   //7
            //如果不存在id或样式就返回tagName的长度
            const hash = hashIdx > 0 ? hashIdx : sel.length;
            const dot = dotIdx > 0 ? dotIdx : sel.length;
            const tag = 
                hashIdx !== -1 || dotIdx !== -1
                    ? sel.slice(0, Math.min(hash, dot))
                    : sel;
            const elm = (vnode.elm = 
                isDef(data) && isDef((i = data.ns))
                    ? api.createElementNS(i, tag, data)
                    : api.createElement(tag, data));
            //设置dom结点的id和class（注意：这根据的是sel的名称设置的，并非是data中的class数据）
            if(hash < dot) elm.setAttribute("id", sel.slice(hash + 1, dot));
            if(dotIdx > 0)
                elm.setAttribute("class", sel.slice(dot + 1).replace(/\./g, " "));
            //根据cbs中的适配器来处理dom结点
            for(i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
            //以同样的方式处理孩子结点
            if(is.array(children)){
                for(i = 0; i < children.length; ++i){
                    const ch = children[i];
                    if(ch != null){
                        api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue));
                    }
                }
            }else if(is.primitive(vnode.text)){
                api.appendChild(elm, api.createTextNode(vnode.text));
            }
            const hook = vnode.data!.hook;
            if(isDef(hook)){
                hook.create?.(emptyNode, vnode);
                if(hook.insert){
                    insertedVnodeQueue.push(vnode)
                }
            }
        }else{
            vnode.elm = api.createTextNode(vnode.text!);
        }
        return vnode.elm;
    }

    function addVnodes(
        parentElm: Node,
        before: Node | null,
        vnodes: VNode[],
        startIdx: number,
        endIdx: number,
        insertedVnodeQueue: VNodeQueue
      ) {
        for (; startIdx <= endIdx; ++startIdx) {
          const ch = vnodes[startIdx];
          if (ch != null) {
            api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
          }
        }
      }
    function invokeDestoryHook(vnode: VNode){
        const data = vnode.data;
        if(data !== undefined){
            data?.hook?.destory?.(vnode);
            for(let i = 0; i < cbs.destory.length; ++i) cbs.destory[i](vnode);
            if(vnode.children !== undefined){
                for(let j = 0; j < vnode.children.length; ++j){
                    const child = vnode.children[j];
                    if(child != null && typeof child !== "string"){
                        invokeDestoryHook(child);
                    }
                }
            }
        }
    }

    function removeVnodes(
        parentElm: Node,
        vnodes: VNode[],
        startIdx: number,
        endIdx: number
    ):void {
        for(; startIdx <= endIdx; ++startIdx){
            let listeners:number;
            let rm: () => void;
            const ch = vnodes[startIdx];
            if(ch != null){
                if(isDef(ch.sel)){
                    invokeDestoryHook(ch);
                    listeners = cbs.remove.length + 1;
                    rm = createRmCb(ch.elm!, listeners);
                    for(let i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
                    const removeHook = ch?.data?.hook?.remove;
                    if(isDef(removeHook)){
                        removeHook(ch, rm);
                    }else{
                        rm();
                    }
                }else{
                    api.removeChild(parentElm, ch.elm!);
                }
            }
        }
    }
    
    function updateChildren(
        parentElm: Node,
        oldCh: VNode[],
        newCh: VNode[],
        insertedVnodeQueue: VNodeQueue
      ) {
        let oldStartIdx = 0;
        let newStartIdx = 0;
        let oldEndIdx = oldCh.length - 1;
        let oldStartVnode = oldCh[0];
        let oldEndVnode = oldCh[oldEndIdx];
        let newEndIdx = newCh.length - 1;
        let newStartVnode = newCh[0];
        let newEndVnode = newCh[newEndIdx];
        let oldKeyToIdx: KeyToIndexMap | undefined;
        let idxInOld: number;
        let elmToMove: VNode;
        let before: any;
    
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
          if (oldStartVnode == null) {
            oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
          } else if (oldEndVnode == null) {
            oldEndVnode = oldCh[--oldEndIdx];
          } else if (newStartVnode == null) {
            newStartVnode = newCh[++newStartIdx];
          } else if (newEndVnode == null) {
            newEndVnode = newCh[--newEndIdx];
          } else if (sameVnode(oldStartVnode, newStartVnode)) {
            patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
            oldStartVnode = oldCh[++oldStartIdx];
            newStartVnode = newCh[++newStartIdx];
          } else if (sameVnode(oldEndVnode, newEndVnode)) {
            patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
            oldEndVnode = oldCh[--oldEndIdx];
            newEndVnode = newCh[--newEndIdx];
          } else if (sameVnode(oldStartVnode, newEndVnode)) {
            // Vnode moved right
            patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
            api.insertBefore(
              parentElm,
              oldStartVnode.elm!,
              api.nextSibling(oldEndVnode.elm!)
            );
            oldStartVnode = oldCh[++oldStartIdx];
            newEndVnode = newCh[--newEndIdx];
          } else if (sameVnode(oldEndVnode, newStartVnode)) {
            // Vnode moved left
            patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
            api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!);
            oldEndVnode = oldCh[--oldEndIdx];
            newStartVnode = newCh[++newStartIdx];
          } else {
            if (oldKeyToIdx === undefined) {
              oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
            }
            idxInOld = oldKeyToIdx[newStartVnode.key as string];
            if (isUndef(idxInOld)) {
              // New element
              api.insertBefore(
                parentElm,
                createElm(newStartVnode, insertedVnodeQueue),
                oldStartVnode.elm!
              );
            } else {
              elmToMove = oldCh[idxInOld];
              if (elmToMove.sel !== newStartVnode.sel) {
                api.insertBefore(
                  parentElm,
                  createElm(newStartVnode, insertedVnodeQueue),
                  oldStartVnode.elm!
                );
              } else {
                patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
                oldCh[idxInOld] = undefined as any;
                api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!);
              }
            }
            newStartVnode = newCh[++newStartIdx];
          }
        }
        if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
          if (oldStartIdx > oldEndIdx) {
            before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
            addVnodes(
              parentElm,
              before,
              newCh,
              newStartIdx,
              newEndIdx,
              insertedVnodeQueue
            );
          } else {
            removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
          }
        }
      }
    function patchVnode(
        oldVnode: VNode,
        vnode: VNode,
        insertedVnodeQueue: VNodeQueue
    ) {
        const hook = vnode.data?.hook;
        hook?.prepatch?.(oldVnode, vnode);
        const elm = (vnode.elm = oldVnode.elm)!;
        const oldCh = oldVnode.children as VNode[];
        const ch = vnode.children as VNode[];
        if(oldVnode === vnode) return;
        if(vnode.data !== undefined){
            for(let i = 0; i < cbs.update.length; ++i)
                cbs.update[i](oldVnode, vnode);
            vnode.data.hook?.update?.(oldVnode, vnode);
        }
        if(isUndef(vnode.text)){
            if(isDef(oldCh) && isDef(ch)){
                if(oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
            }else if(isDef(ch)){
                if(isDef(oldVnode.text)) api.setTextContent(elm, "");
                addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
            }else if(isDef(oldCh)){
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }else if(isDef(oldVnode.text)){
                api.setTextContent(elm, "");
            }
        }else if(oldVnode.text !== vnode.text){
            if(isDef(oldCh)){
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            api.setTextContent(elm, vnode.text);
        }
    }


    return function patch(oldVnode: VNode | Element, vnode: VNode): VNode{
        let i: number, elm: Node, parent: Node;
        const insertedVnodeQueue: VNodeQueue = [];
        for(i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();
        //如果传入的值是一个element时，转化为一个空的虚拟结点，只初始化该虚拟结点的sel属性，因为这个时候浏览器还没有渲染任何内容。
        if(!isVnode(oldVnode)) {
            oldVnode = emptyNodeAt(oldVnode);
        }

        if(sameVnode(oldVnode, vnode)) {
            // console.log("patchVnode")
            patchVnode(oldVnode, vnode, insertedVnodeQueue);
        }else {
            elm = oldVnode.elm!;
            parent = api.parentNode(elm) as Node;
            //将vnode初始化为虚拟结点
            createElm(vnode, insertedVnodeQueue);
            if(parent !== null){
                //替换掉父节点中的旧节点
                api.insertBefore(parent, vnode.elm!, api.nextSibling(elm));
                removeVnodes(parent, [oldVnode], 0, 0);
            }
        }
        for(i = 0; i < insertedVnodeQueue.length; ++i){
            insertedVnodeQueue[i].data!.hook!.insert!(insertedVnodeQueue[i]);
        }
        for(i = 0; i < cbs.post.length; ++i) cbs.post[i]();

        return vnode;
    }
}