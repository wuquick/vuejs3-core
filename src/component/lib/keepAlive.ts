import {
  Component,
  EType,
  KeepAliveComp,
  KeepAliveComponentInstance,
  VElement,
  VNode,
  VObject,
} from "../../types";
import { currentInstance } from "./currentInstance";

// keep-alive组件是通过缓存管理 + 特殊的挂载/卸载逻辑
const keepAlive: KeepAliveComp = {
  _isKeepAlive: true,
  name: "keepAliveComponent",
  render: () => ({} as VNode),
  data: () => ({} as VObject),
  setup(props, { slots }) {
    const cache = new Map<number, VNode>();
    const instance = currentInstance as KeepAliveComponentInstance;
    const { move, createElement } = instance.keepAliceCtx;

    // 隐藏容器
    const storageContainer = createElement("div");
    instance._activate = (vnode: VNode, container: VElement, anchor: Node) => {
      move(vnode, container, anchor);
    };
    instance._deActivate = (vnode: VNode) => {
      move(vnode, storageContainer);
    };

    return () => {
      // keep-alive的默认插槽
      let rawVNode: VNode = slots.default();
      if (rawVNode.type !== EType.COMPONENT) {
        return rawVNode;
      }
      const cachedVNode = cache.get(rawVNode.id as number);
      if (cachedVNode) {
        rawVNode.component = cachedVNode.component;
        // 避免渲染器重新挂载它
        rawVNode.keptAlive = true;
      } else {
        cache.set(rawVNode.id as number, rawVNode)
      }

      // 避免渲染器将组件卸载
      rawVNode.shouldKeepAlive = true;
      rawVNode.keepAliveInstance = instance;
      return rawVNode;
    };
  },
};
