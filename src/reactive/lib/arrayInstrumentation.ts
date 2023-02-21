const arrayInstrumentation: Object = {};
let shouldTrack = true;

['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
  const originMethod = Array.prototype[method];
  arrayInstrumentation[method] = function(...args) {
    let res = originMethod.apply(this, args);
    if (res === false) {
      res = originMethod.apply(this.raw, args);
    }
    return res;
  }
});

// 这些方法会同时读取和修改‘length’属性导致栈溢出，所以屏蔽对length属性track
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const originMethod = Array.prototype[method];
  arrayInstrumentation[method] = function(...args) {
    shouldTrack = false;
    let res = originMethod.apply(this, args);
    shouldTrack = true;
    return res;
  }
})



export {
  shouldTrack,
  arrayInstrumentation
}