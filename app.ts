import { h, vnode, init, classModule } from './src/index'

;((doc)=>{
    let k = h('div', h("h1",new Date().toLocaleTimeString()))
    
    
    console.log(k)
    
    // let k1 = vnode('div', {style: { backgroundColor: 'red'}}, [
    //     vnode(undefined, undefined, undefined, 'shi', undefined),
    //     vnode(undefined, undefined, undefined, "32", undefined),
    // ],undefined,undefined);
    
    let patch = init([classModule]);
    let container = doc.getElementById("container");
    
    patch(container, k);
    setInterval(()=>{
        let s = h('div', h("h1",["shihaidong",new Date().toLocaleTimeString()]))
        patch(k, s)
        k = s;
    }, 1000)
    
})(document)
