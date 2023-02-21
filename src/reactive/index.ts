import { createReactive, readOnly, effect } from "./lib/createReactive";

function reactive<T extends Object>(obj: T): T {
  return createReactive(obj);
}
function shallowReactive<T extends Object>(obj: T): T {
  return createReactive(obj, true);
}
function shallowReadOnly<T extends Object>(obj: T): T {
  return createReactive(obj, true, true);
}
function ref(val) {
  const wrapper = {
    value: val,
  };
  // 判断一个对象是不是ref
  Object.defineProperty(wrapper, "_v_isRef", {
    value: true,
  });
  return createReactive(wrapper);
}
function toRef<T extends Object, U extends keyof T>(obj: T, key: U) {
  const wrapper = {
    get value() {
      return obj[key];
    },
    set value(val) {
      obj[key] = val;
    },
  };
  Object.defineProperty(obj, "_v_isRef", {
    value: true,
  });
  return wrapper;
}
function toRefs<T extends Object>(obj: T): T {
  const ret: any = {};
  for (const key in obj) {
    ret[key] = toRef(obj, key);
  }
  return ret;
}
// 在模板中使用自动脱ref
function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return value._v_isRef ? value.value : value;
    },
    set(target, key, newVal, receiver) {
      const value = target[key];
      if (value._v_isRef) {
        value.value = newVal;
        return true;
      }
      return Reflect.set(target, key, newVal, receiver);
    },
  });
}

export {
  effect,
  createReactive,
  readOnly,
  reactive,
  shallowReactive,
  shallowReadOnly,
  ref,
  toRef,
  toRefs,
  proxyRefs,
};
