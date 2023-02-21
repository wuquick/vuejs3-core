import { EffectFn, EffectOption, ETriggerType } from "../../types";
import { arrayInstrumentation, shouldTrack } from "./arrayInstrumentation";
import { mutableInstrumentation } from "./mutableInstrumentation";

const bucket: WeakMap<
  Object,
  Map<string | symbol, Set<EffectFn>>
> = new WeakMap();
const reactiveMap: Map<any, any> = new Map();
let activeEffect: EffectFn | null = null;
const effectStack: EffectFn[] = [];
export const ITERATE_KEY = Symbol();
export const ROW = Symbol();
export const MAP_KEY_ITERATE_KEY = Symbol();

function cleanup(effectFn: EffectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    effectFn.deps[i].delete(effectFn);
  }
  effectFn.deps.length = 0;
}

export function effect(fn: Function, options: EffectOption = {}) {
  const effectFn: EffectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    const res = fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  };
  effectFn.deps = [];
  effectFn.options = options;
  if (options.lazy) {
    return effectFn;
  } else {
    effectFn();
  }
}

export function track(target: any, key: string | symbol, receiver?: any) {
  if (!activeEffect || !shouldTrack) {
    return;
  }
  let effectMap = bucket.get(target);
  if (!effectMap) {
    const set: Set<EffectFn> = new Set();
    effectMap = new Map();
    effectMap.set(key, set);
    bucket.set(target, effectMap);
  }
  let effectSet = effectMap.get(key);
  if (!effectSet) {
    effectSet = new Set<EffectFn>();
  }
  effectSet.add(activeEffect);
  activeEffect.deps.push(effectSet);
  effectMap.set(key, effectSet);
}

export function trigger(target: any, key: string | symbol, type: ETriggerType, newVal?: any) {
  const effectMap = bucket.get(target);
  if (!effectMap) {
    return;
  }
  const effectSet = effectMap.get(key) || new Set<EffectFn>();
  const iterateEffects = effectMap.get(ITERATE_KEY) || new Set<EffectFn>();

  const effectsToRun = new Set<EffectFn>();
  effectSet.forEach((fn) => {
    if (fn !== activeEffect) {
      effectsToRun.add(fn);
    }
  });

  if (type === ETriggerType.ADD || type === ETriggerType.DELETE || (type === ETriggerType.SET && Object.prototype.toString.call(target) === '[object Map]')) {
    iterateEffects.forEach((fn) => {
      if (fn !== activeEffect) {
        effectsToRun.add(fn);
      }
    });
  }

  // arr[arr.length] = newVal
  if (type === ETriggerType.ADD && Array.isArray(target)) {
    const lengthEffects = effectMap.get('length');
    lengthEffects && lengthEffects.forEach(fn => {
      if (fn !== activeEffect) {
        effectsToRun.add(fn);
      }
    })
  }

  // arr.length = i (i < arr.length)
  if (Array.isArray(target) && key === 'length') {
    effectMap.forEach((effects, key) => {
      if (Number(key) >= newVal) {
        effects.forEach(fn => {
          if (fn !== activeEffect) {
             effectsToRun.add(fn);
          }
        })
      }
    })
  }

  effectsToRun.forEach((fn) => {
    if (fn.options.scheduler) {
      fn.options.scheduler(fn);
    } else {
      fn();
    }
  });
}

export function readOnly<T extends Object>(obj: T) {
  return createReactive(obj, false, true);
}

export function createReactive<T extends Object>(
  obj: T,
  isShallow: boolean = false,
  isReadOnly: boolean = false
): T {
  const existProxy = reactiveMap.get(obj);
  if (existProxy) {
    return existProxy;
  }
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      // 代理对象可以通过 raw 属性访问原始对象
      if (key === "raw") {
        return target;
      }

      
      // 代理 map set
      const type = Object.prototype.toString.call(target);
      if (type === '[object Map]' || type === '[object Set]') {
        // map 和 set 上的size是一个访问器属性，代理对象上没有
        if (key === 'size') {
          track(target, ITERATE_KEY);
          return Reflect.get(target, key, target);
        }
        return mutableInstrumentation[key];
        
      }

      if (Array.isArray(obj) && arrayInstrumentation.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentation, key, receiver);
      }

      const res = Reflect.get(target, key, receiver);
      if (isShallow) {
        return res;
      }

      // 数组for..of方法会读取symbol.iterator和length，已经通过length触发了，屏蔽了symbol.iterator的track
      if (!isReadOnly && typeof key !== 'symbol') {
        track(target, key, receiver);
      }

      if (typeof res === "object" && res !== null) {
        return isReadOnly ? readOnly(res) : createReactive(res);
      }

      return res;
    },
    // 拦截 in 操作符
    has(target, key) {
      track(target, key);
      return Reflect.has(target, key);
    },
    // 拦截 for .. in
    ownKeys(target) {
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
    deleteProperty(target, key) {
      if (isReadOnly) {
        console.warn("is read only");
        return true;
      }
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const res = Reflect.deleteProperty(target, key);
      if (res && hadKey) {
        trigger(target, key, ETriggerType.DELETE);
      }
      return res;
    },
    set(target, key, newVal, receiver) {
      if (isReadOnly) {
        console.warn("is readOnly");
        return true;
      }
      const oldVal = target[key];
      const type = Array.isArray(target)
        ? Number(key) < target.length
          ? ETriggerType.SET
          : ETriggerType.ADD
        : Object.prototype.hasOwnProperty.call(target, key)
        ? ETriggerType.SET
        : ETriggerType.ADD;
      const res = Reflect.set(target, key, newVal, receiver);
      // 屏蔽原型对象触发的trigger, 屏蔽新老值一致触发的trigger
      if (Object.is(receiver.raw, target) && !Object.is(oldVal, newVal)) {
        trigger(target, key, type, newVal);
      }
      return res;
    },
  });
  reactiveMap.set(obj, proxy);
  return proxy;

}
