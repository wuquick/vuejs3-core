import { currentInstance } from "./currentInstance";

export function onMounted(fn: Function) {
  if (currentInstance) {
    currentInstance.mounted?.push(fn);
  } else {
    console.error("error");
  }
}

export function onUnmounted(fn: Function) {
  if (currentInstance) {
    currentInstance.unMounted?.push(fn);
  } else {
    console.error("error");
  }
}
