import { EffectFn, WatchConfig } from "../../types";
import { addJob, flushJob } from "../scheduler/flushJob";
import { effect } from "./createReactive";

function traverse(target: Object, seen = new Set()) {
  for (let key in target) {
    if (Object.prototype.toString.call(target[key]) === '[object Object]') {
      traverse(target[key]);
    } else {
      seen.add(target[key]);
    }
  }
}

function watch(getter: () => any, cb: (newVal: any, oldVal: any) => any, watchConfig?: WatchConfig): void;
function watch(target: Object, cb: (newVal: any, oldVal: any) => any, watchConfig?: WatchConfig): void
function watch(source: Object | (() => any), cb: (_newVal: any, _oldVal: any) => any, watchConfig: WatchConfig = {}) {
  let getter = source instanceof Function ? source : () => traverse(source);
  let newVal: any, oldVal: any;

  async function job() {
    newVal = effectFn && effectFn();
    addJob(() => cb(newVal, oldVal));
    await flushJob();
    oldVal = newVal;
  }

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      job();
    }
  });

  if (watchConfig.immediate) {
    job();
  } else {
    oldVal = effectFn && effectFn()
  }
  
}

export {
  watch
}