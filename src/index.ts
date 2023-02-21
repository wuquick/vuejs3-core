import { createReactive } from "./reactive"
import { computed } from "./reactive/lib/computed";
import { effect } from "./reactive/lib/createReactive";
import { watch } from "./reactive/lib/watch";
import { addJob, flushJob } from "./reactive/scheduler/flushJob";

const obj = {
  a: 1,
  isOK: true
}
const proxy = createReactive(obj);

// effect(() => {
//   if (proxy.isOK) {
//     console.log('effect', proxy.a);
//   } else {
//     console.log('不需要a了');
//   }
// })
// proxy.a = 33;
// proxy.isOK = false;
// proxy.a = 2;
// proxy.a = 3;

// let temp1, temp2;
// effect(() => {
//   console.log('effect1');
//   effect(() => {
//     console.log('effect2');
//     temp2 = proxy.isOK;
//   })
//   temp1 = proxy.a;
// })

// proxy.isOK = false;
// proxy.a = 2;

// effect(() => {
//   proxy.a = proxy.a + 1;
//   console.log(proxy.a);
// }, {
//   scheduler(fn: Function) {
//     addJob(fn);
//     flushJob();
//   }
// })

// proxy.a++;
// proxy.a++;
// proxy.a++;
// proxy.a++;
// proxy.a++;

watch(() => proxy.a, (newVal, oldVal) => {
  console.log('watch', newVal, oldVal);
}, {
  immediate: true
})

setTimeout(() => {
  proxy.a = 4;
}, 1000);

setTimeout(() => {
  proxy.a = 2;
}, 20);

setTimeout(() => {
  proxy.a = 5;
}, 2000);




