import { ComponentInstance } from "../../types";

let currentInstance: ComponentInstance | null = null;
function setCurrentInstance(instance: ComponentInstance | null) {
  currentInstance = instance;
}

export {
  currentInstance,
  setCurrentInstance
}