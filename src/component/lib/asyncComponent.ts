import { ref } from "../../reactive";
import {
  AsyncComponentOption,
  Component,
  EType,
  VNode,
} from "../../types";
import { onUnmounted } from "./ComponentLifeHook";


const placeholder: VNode = { type: EType.TEXT, children: "", props: {} };

export function defineAsyncComponent(options: AsyncComponentOption) {
  const loader = options.loader;
  let innerComp: Component | null = null;
  let retries = 0;

  function load() {
    return loader().catch(err => {
      if (options.onError) {
        return new Promise((resolve, reject) => {
          const retry = () => {
            resolve(load);
            retries++;
          };
          const fail = () => {
            reject(err);
          };
          options.onError && options.onError(retry, fail, retries);
        })
      } else {
        throw err;
      }
    })
  }
  return {
    name: "AsyncComponentWrapper",
    setup() {
      const loaded = ref(false);
      const error = ref(null);
      const loading = ref(false);
      let loadingTimer = 0;
      
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true;
        }, options.delay);
      } else {
        loading.value = true;
      }
      load()
        .then((c) => {
          innerComp = c as Component;
          loaded.value = true;
        })
        .catch((e) => (error.value = e)).finally(() => {
          loading.value = false;
          clearTimeout(loadingTimer);
        });

      let timer: number = 0;
      if (options.timeout) {
        timer = setTimeout(() => {
          const err = new Error("timeout");
          error.value = err;
        }, options.timeout);
      }
      onUnmounted(() => clearTimeout(timer));
      return () => {
        if (loaded.value) {
          return {
            type: EType.COMPONENT,
            content: innerComp as Component,
            children: "",
            props: {},
          };
        } else if (error.value && options.errorComponent) {
          return {
            type: EType.COMPONENT,
            content: options.errorComponent,
            children: "",
            props: { error: error.value },
          } as VNode;
        } else if (loading.value && options.loadingComponent) {
          return {
            type: EType.COMPONENT,
            content: options.loadingComponent,
            children: "",
            props: {}
          }
        }
        return placeholder;
      };
    },
  };
}
