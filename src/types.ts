// reactive
export interface EffectFn extends Function {
  deps: Array<Set<Function>>,
  options: EffectOption
}

export interface EffectOption {
  scheduler?: Function,
  lazy?: boolean
}

export interface WatchConfig {
  immediate?: boolean
}

export enum ETriggerType{
  ADD,
  SET,
  DELETE
}


// renderer
export enum EType {
  TEXT,
  COMMENT,
  FRAGMENT,
  COMPONENT
}
export interface VObject extends Object {
  [propName: string]: any
}
export interface VNode extends VObject {
  id?: number,
  type: keyof HTMLElementTagNameMap | EType,
  children: void | VNode[] | string,
  key?: string,
  element?: VElement,
  props: VObject,
  // 当该虚拟节点表示组件的时候,
  content?: Component
  component?: ComponentInstance
}
export interface VElement extends HTMLElement {
  vnode?: VNode
  vei?: VObject
}

// component
export interface Component {
  name: string,
  render: () => VNode,
  data: (...args: any[]) => VObject,
  props?: VObject
  setup?: (props: VObject, context: SetupContext) => any
}
export interface ComponentInstance {
  state: VObject,
  props?: VObject,
  slots?: VObject,
  isMounted: boolean,
  subTree: VNode | null,
  mounted?: Function[],
  unMounted?: Function[],
}
export interface SetupContext {
  slots: any,
  emit: Function,
  attrs: VObject,
  expose: Function
}
export interface AsyncComponentOption {
  loader: () => Promise<Component>,
  timeout?: number,
  errorComponent?: Component,
  loadingComponent?: Component,
  delay?: number,
  onError?: Function
}

// keep-alive
export interface KeepAliveComp extends Component {
  _isKeepAlive: true
}
export interface KeepAliveCtx extends Object {
  move: Function,
  createElement: Function
}
export interface KeepAliveComponentInstance extends ComponentInstance {
  _activate: Function,
  _deActivate: Function,
  keepAliceCtx: KeepAliveCtx
}