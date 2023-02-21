import { effect, track, trigger } from "./createReactive";

let dirty = true;
let value: any = "";
export function computed(getter: () => any) {
  const effectFn = effect(getter, {
    lazy: true,
    scheduler(fn: Function) {
      console.log('computed');
      dirty = true;
      fn();
      trigger(obj, 'value', value, obj);
    },
  });
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn && effectFn();
        dirty = false;
        track(obj, "value", obj);
      }
      return value;
    },
  };
  return obj;
}
