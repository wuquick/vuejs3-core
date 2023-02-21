import {
  ComponentInstance,
  SetupContext,
  VElement,
  VNode,
  VObject,
} from "../../types";
import { patch } from "../../renderer/lib/createRenderer";
import { reactive, effect, shallowReactive } from "../../reactive/index";
import { renderJobQueue } from "../../reactive/scheduler/flushJob";
import { hasPropsChanged, resolveProps } from "./utils";
import { setCurrentInstance } from "./currentInstance";

// 挂载组件
export function mountComponent(
  vnode: VNode,
  container: VElement,
  anchor: HTMLElement
) {
  if (!vnode.content) {
    return;
  }

  const { render, data, props: propsOption, setup } = vnode.content;

  // beforeCreate
  const state = reactive(data());
  const { props, attrs } = resolveProps(propsOption, vnode.props);
  const slots = vnode.children || {};

  const instance: ComponentInstance = {
    state,
    props: shallowReactive(props),
    isMounted: false,
    subTree: null,
    slots,
    mounted: []
  };

  vnode.component = instance;

  let setupState = {};
  function emit(event: string, ...payload: any[]) {
    const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
    const handler = instance.props?.[eventName];
    if (handler) {
      handler(...payload);
    } else {
      console.error("事件不存在");
    }
  }
  const setupContext: SetupContext = {
    attrs,
    slots,
    expose: () => {},
    emit,
  };
  if (setup) {
    setCurrentInstance(instance);
    const setupRes = setup(
      shallowReactive(instance.props as VObject),
      setupContext
    );
    setCurrentInstance(null);
    if (typeof setupRes === "function") {
      console.error("conflict");
    } else {
      setupState = setupRes;
    }
  }

  // 渲染上下文对象，本质上就是组件实例的代理
  // 渲染上下文对象将会作为render函数和生命周期钩子中的this值
  const renderContext = new Proxy(instance, {
    get(t, k, r) {
      const { state, props } = t;
      if (k === "$slots") {
        return slots;
      }
      if (state && k in state) {
        return state[k as string];
      } else if (props && k in props) {
        return props[k as string];
      } else if (setupState && k in setupState) {
        return setupState[k as string];
      } else {
        console.error("不存在");
      }
    },
    set(t, k, v, r) {
      const { state, props } = t;
      if (state && k in state) {
        state[k as string] = v;
      } else if (props && k in props) {
        props[k as string] = v;
      } else if (setupState && k in setupState) {
        setupState[k as string] = v;
      } else {
        console.error("不存在");
      }
      return true;
    },
  });

  //created

  // 组件自更新
  effect(
    () => {
      const subTree = render.call(renderContext);
      if (!instance.isMounted) {
        // beforeMount
        patch(null, subTree, container, anchor);
        instance.isMounted = true;
        // mounted
        if (instance.mounted) {
          instance.mounted.forEach(fn => fn.call(renderContext));
        }
      } else {
        // beforeUpdate
        patch(instance.subTree, subTree, container, anchor);
        // updated
      }
      instance.subTree = subTree;
    },
    {
      scheduler: renderJobQueue, // 通过调度器使副作用函数缓存到微任务中去执行，避免多次执行副作用函数带来的性能开销
    }
  );
}

// 父组件自更新导致子组件更新
// 需要做两件事
// 1. 检测子组件是否真的需要更新, props可能被设定为不可变
// 2. 如果需要更新，那么久更新子组件的props, slots等内容
export function patchComponent(n1: VNode, n2: VNode, anchor: HTMLElement | null) {
  const instance = (n2.component = n1.component);
  const props = { instance };
  if (hasPropsChanged(n1.props, n2.props)) {
    const { props: nextProps } = resolveProps(n2.content?.props, n2.props);
    for (const k in nextProps) {
      props[k] = nextProps[k];
    }
    for (const k in props) {
      delete props[k];
    }
  }
}
