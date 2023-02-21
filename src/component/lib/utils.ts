import { VObject } from "../../types";

export function resolveProps(options: VObject = {}, propsData: VObject = {}) {
  const props: VObject = {};
  const attrs: VObject = {};
  for (const key in propsData) {
    if (key in options || key.startsWith('on')) {
      props[key] = propsData[key]
    } else {
      attrs[key] = propsData[key]
    }
  }
  return {
    props,
    attrs
  }
}

export function hasPropsChanged(prevProps: VObject = {}, nextProps: VObject = {}) {
  const nextKeys = Object.keys(nextProps);
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true;
  }
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    if (nextKeys[key] !== prevProps[key]) {
      return true;
    }
  }
  return false;
}