import { ETriggerType } from "../../types";
import {
  createReactive,
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
  track,
  trigger,
} from "./createReactive";

export const mutableInstrumentation = {
  add(key: string | symbol) {
    const target = this.raw;
    const hadKey = target.has(key);
    const res = target.add(key);
    if (!hadKey) {
      trigger(target, key, ETriggerType.ADD);
    }
    return res;
  },
  delete(key: string | symbol) {
    const target = this.raw;
    const hadKey = target.has(key);
    const res = target.delete(key);
    if (hadKey) {
      trigger(target, key, ETriggerType.DELETE);
    }
    return res;
  },
  get(key: string | symbol) {
    const target = this.raw;
    const hadKey = target.has(key);
    const res = target.get(key);
    if (hadKey) {
      track(target, key);
    }
    return res;
  },
  set(key: string | symbol, value: any) {
    const target = this.raw;
    const hadKey = target.has(key);
    const oldVal = target.get(key);
    // 避免数据污染，把响应式数据设置到原始对象上称为数据污染
    const newVal = value.raw || value;
    target.set(key, newVal);
    if (!hadKey) {
      trigger(target, key, ETriggerType.ADD);
    } else {
      trigger(target, key, ETriggerType.SET);
    }
  },
  forEach(callback: Function, thisArg: any) {
    const wrap = (val) => (typeof val === "object" ? createReactive(val) : val);
    const target = this.raw;
    track(target, ITERATE_KEY);
    target.forEach((v, k) => {
      callback(thisArg, wrap(v), wrap(k), this);
    });
  },
  [Symbol.iterator]: iterationMethod,
  entries: iterationMethod,
  keys: () => singleIterationMethod("keys"),
  values: () => singleIterationMethod("values"),
};

function iterationMethod() {
  const target = this.raw;
  const iter = target[Symbol.iterator]();
  const wrap = (val) => (typeof val === "object" ? createReactive(val) : val);
  track(target, ITERATE_KEY);
  return {
    next() {
      const { value, done } = iter.next();
      return {
        value: value ? [wrap(value[0]), wrap(value[1])] : value,
        done,
      };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

function singleIterationMethod(type) {
  const target = this.raw;
  const itr = target[type]();
  const wrap = (val) => (typeof val === "object" ? createReactive(val) : val);

  if (type === "keys") {
    track(target, MAP_KEY_ITERATE_KEY);
  } else if (type === "values") {
    track(target, ITERATE_KEY);
  }

  return {
    next() {
      const { value, done } = itr.next();
      return {
        value: wrap(value),
        done,
      };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}
