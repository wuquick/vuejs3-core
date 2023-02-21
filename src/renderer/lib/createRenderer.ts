import { patchComponent } from "../../component/lib/component";
import { EType, VElement, VNode, VObject } from "../../types";

function unmount(vnode: VNode) {
  if (vnode.type === EType.FRAGMENT) {
    if (!vnode.children || !Array.isArray(vnode.children)) {
      return;
    }
    vnode.children.forEach((c) => unmount(c));
    return;
  } else if (vnode.type === EType.COMPONENT) {
    // keep-alive组件里的组件调用自身的生命周期钩子
    if (vnode.shouldKeepAlive) {
      vnode.keepAliveInstance._deActivate(vnode);
    } else {
      unmount(vnode.component?.subTree as VNode);
    }
    return;
  }
  const parent = vnode.element?.parentNode;
  if (parent && vnode.element) {
    parent.removeChild(vnode.element);
  }
}
function insert(
  parent: VElement,
  children: VElement,
  anchor: null | Node = null
) {
  parent.insertBefore(children, anchor);
}
function shouldSetAsProps(element: VElement, key: string) {
  return key in element;
}
function normalizeClass(classValue: string | VObject | (string | VObject)[]) {
  const ret = new Set<string>();
  if (typeof classValue === "string") {
    return classValue;
  } else if (Array.isArray(classValue)) {
    classValue.forEach((v) => {
      if (typeof v === "string") {
        ret.add(v);
      } else {
        for (let key in v) {
          v[key] && ret.add(v[key]);
        }
      }
    });
    return [...ret].join(" ");
  } else {
    for (let key in classValue) {
      classValue[key] && ret.add(classValue[key]);
    }
    return [...ret].join(" ");
  }
}
function mountElement(
  vnode: VNode,
  container: VElement,
  anchor: null | Node = null
) {
  const { type, children } = vnode;
  const element = (vnode.element = document.createElement(
    type as keyof HTMLElementTagNameMap
  ));
  if (typeof children === "string") {
    element.innerHTML = children;
  } else if (Array.isArray(children)) {
    children.forEach((v) => patch(null, v, element));
  }
  if (vnode.props) {
    for (const key in vnode.props) {
      const value = vnode.props[key];
      patchProps(element, key, null, value);
    }
  }
  insert(container, element, anchor);
}
function patchChildren(n1: VNode, n2: VNode, element: VElement) {
  if (typeof n2.children === "string") {
    if (Array.isArray(n1.children)) {
      n1.children.forEach((v) => unmount(v));
    }
    element.innerHTML = n2.children;
  } else if (Array.isArray(n2.children)) {
    if (Array.isArray(n1.children)) {
      // diff
    } else {
      element.innerHTML = "";
      n2.children.forEach((v) => patch(null, v, element));
    }
  } else {
    if (Array.isArray(n1.children)) {
      n1.children.forEach((c) => unmount(c));
    } else if (typeof n1.children === "string") {
      element.innerHTML = "";
    }
  }
}
function patchProps(element: VElement, key: string, preVal: any, newVal: any) {
  if (key.startsWith("on")) {
    const invokers = element.vei || (element.vei = {});
    const name = key.slice(2).toLowerCase();
    let invoker = invokers[key];
    if (newVal) {
      if (!invoker) {
        invoker = element.vei[key] = (e: Event) => {
          if (e.timeStamp < invoker.attached) {
            return;
          }
          if (Array.isArray(invoker.value)) {
            invoker.value.forEach((fn) => fn(e));
          } else {
            invoker.value(e);
          }
        };
        invoker.value = newVal;
        invoker.attached = performance.now();
        element.addEventListener(name, invoker);
      } else {
        invoker.value = newVal;
      }
    } else {
      element.removeEventListener(name, invoker);
    }
  } else if (key === "class") {
    element.className = normalizeClass(newVal) || "";
  } else if (shouldSetAsProps(element, key)) {
    const type = typeof element[key];
    if (type === "boolean" && newVal === "") {
      element[key] = true;
    } else {
      element[key] = newVal;
    }
  } else {
    element.setAttribute(key, newVal);
  }
}
function patchElement(n1: VNode, n2: VNode) {
  const el = (n2.element = n1.element);
  if (!el) return;
  const oldProps = n1.props;
  const newProps = n2.props;
  for (const key in newProps) {
    if (newProps[key] !== oldProps[key]) {
      patchProps(el, key, oldProps[key], newProps[key]);
    }
  }
  for (const key in oldProps) {
    if (!(key in newProps)) {
      patchProps(el, key, oldProps[key], newProps[key]);
    }
  }
  patchChildren(n1, n2, el);
}
export function patch(
  n1: VNode | null | undefined,
  n2: VNode,
  container: VElement,
  anchor?: HTMLElement
) {
  const { type } = n2;
  if (n1 && n1.type !== type) {
    unmount(n1);
    n1 = null;
  }
  switch (type) {
    case EType.TEXT:
    case EType.COMMENT: {
      if (!n1) {
        let node: Text | Comment;
        if (type === EType.TEXT)
          node = document.createTextNode(n2.children as string);
        else node = document.createComment(n2.children as string);
        container.appendChild(node);
      } else {
        const el = (n2.element = n1.element);
        if (el && n2.children !== n1.children) {
          el.nodeValue = n2.children as string;
        }
      }
      break;
    }
    case EType.FRAGMENT: {
      if (!Array.isArray(n2.children)) {
        return;
      }
      if (!n1) {
        n2.children.forEach((v) => patch(null, v, container));
      } else {
        patchChildren(n1, n2, container);
      }
      break;
    }
    case EType.COMPONENT: {
      if (!n1) {
        // keep-alive组件调用自身的生命周期钩
        if (n2.keptAlive) {
          n2.keepAliveInstance._active(n2, container, anchor);
        } else {
          mountElement(n2, container, anchor);
        }
      } else {
        patchComponent(n1, n2, anchor as HTMLElement);
      }
      break;
    }
    default: {
      if (!n1) {
        mountElement(n2, container, anchor);
      } else {
        patchElement(n1, n2);
      }
    }
  }
}
export function render(vnode: VNode, container: VElement) {
  if (vnode) {
    patch(container.vnode, vnode, container);
  } else {
    if (container.vnode) {
      unmount(container.vnode);
    }
  }
  container.vnode = vnode;
}
