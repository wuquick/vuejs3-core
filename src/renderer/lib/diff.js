function simpleDiff(n1, n2, container) {
  const oldChildren = n1.children;
  const newChildren = n2.children;
  let lastIndex = 0;
  for (let i = 0; i < newChildren.length; i++) {
    let find = false;
    for (let j = 0; j < oldChildren.length; j++) {
      if (newChildren[i].key === oldChildren[j].key) {
        find = true;
        patch(oldChildren[j], newChildren[i], container);
        if (j < lastIndex) {
          // 需要移动节点
          const preNode = newChildren[i - 1];
          if (preNode) {
            const anchor = preNode.element.nextSibling;
            insert(container, newChildren[i].element, anchor);
          }
        } else {
          lastIndex = j;
        }
        break;
      }
    }
    if (!find) {
      const preNode = newChildren[i - 1];
      let anchor = null;
      if (preNode) {
        anchor = preNode.element.nextSibling;
      } else {
        anchor = container.firstChild;
      }
      patch(null, newChildren[i], container, anchor);
    }
  }
  for (let i = 0; i < oldChildren.length; i++) {
    const has = newChildren.find((c) => c.key === oldChildren[i].key);
    if (!has) {
      unmount(oldChildren[i]);
    }
  }
}
function twoSideDiff(n1, n2, container) {
  const oldChildren = n1.children;
  const newChildren = n2.children;
  const oldStart = 0;
  const oldEnd = oldChildren.length - 1;
  const newStart = 0;
  const newEnd = newChildren.length - 1;
  while (oldStart <= oldEnd && newStart <= newEnd) {
    if (!oldChildren[oldStart]) {
      oldStart++;
    } else if (!oldChildren[oldEnd]) {
      oldEnd--;
    } else if (oldChildren[oldStart].key === newChildren[newStart].key) {
      patch(oldChildren[oldStart], newChildren[newStart], container);
      oldStart++;
      newStart++;
    } else if (oldChildren[oldEnd].key === newChildren[newEnd].key) {
      patch(oldChildren[oldEnd], newChildren[newEnd], container);
      oldEnd--;
      newEnd--;
    } else if (oldChildren[oldEnd].key === newChildren[newStart].key) {
      patch(oldChildren[oldEnd], newChildren[newStart], container);
      insert(
        container,
        oldChildren[oldEnd].element,
        oldChildren[oldStart].element
      );
      oldEnd--;
      newStart++;
    } else if (oldChildren[oldStart].key === newChildren[newEnd].key) {
      patch(oldChildren[oldStart], newChildren[newEnd], container);
      insert(
        container,
        oldChildren[oldStart].element,
        oldChildren[oldEnd].element
      );
      oldStart++;
      newEnd--;
    } else {
      const idxInOld = oldChildren.find(
        (c) => c.key === newChildren[newStart].key
      );
      if (idxInOld > 0) {
        const vnodeToMove = oldChildren[idxInOld];
        patch(vnodeToMove, newChildren[newStart], container);
        insert(container, vnodeToMove.element, oldChildren[oldStart].element);
        oldChildren[idxInOld] = undefined;
      } else {
        patch(
          null,
          newChildren[newStart],
          container,
          oldChildren[oldStart].element
        );
      }
      newStart++;
    }
  }
  if (oldEnd < oldStart && newStart <= newEnd) {
    for (let i = newStart; i < newEnd; i++) {
      patch(null, newChildren[i], container, oldChildren[oldStart].element);
    }
  } else if (newEnd < newStart && oldStart <= oldEnd) {
    for (let i = oldStart; i < oldEnd; i++) {
      unmount(oldChildren[i]);
    }
  }
}
function quickDiff(n1, n2, container) {
  const newChildren = n2.children;
  const oldChildren = n1.children;
  let j = 0;
  while (newChildren[j].key === oldChildren[j].key) {
    patch(oldChildren[j], newChildren[j], container);
    j++;
  }
  let oldEnd = oldChildren[oldChildren.length - 1];
  let newEnd = newChildren[newChildren.length - 1];
  while (newChildren[newEnd].key === oldChildren[oldEnd].key) {
    patch(oldChildren[oldEnd], newChildren[newEnd], container);
    oldEnd--;
    newEnd--;
  }
  if (j > oldEnd && j <= newEnd) {
    const anchorIndex = newEnd + 1;
    const anchor =
      anchorIndex < newChildren.length ? newChildren[anchorIndex] : null;
    while (j <= newEnd) {
      patch(null, newChildren[j], container, anchor);
      j++;
    }
  } else if (j > newEnd && j <= oldEnd) {
    while (j <= oldEnd) {
      unmount(oldChildren[j++]);
    }
  } else {
    const count = newEnd - j + 1;
    const source = new Array(count).fill(-1);
    let oldStart = j;
    let newStart = j;
    let moved = false;
    let pos = 0;
    const keyIndex = {};
    for (let i = newStart; i < newChildren.length; i++) {
      keyIndex[newChildren[i].key] = i;
    }
    let patched = 0;
    for (let i = oldStart; i < oldChildren.length; i++) {
      const oldVNode = oldChildren[i];
      const k = keyIndex[newVNode.key];
      if (patched < count) {
        if (k !== undefined) {
          const newVNode = newChildren[keyIndex[newVNode.key]];
          patch(oldVNode, newVNode, container);
          patched++;
          source[k - newStart] = i;
          if (k < pos) {
            moved = true;
          } else {
            pos = k;
          }
        } else {
          unmount(oldVNode);
        }
      } else {
        unmount(oldVNode);
      }
    }
    if (moved) {
      const seq = lis(source);
      let s = seq.length - 1;
      let i = count - 1;
      for (i; i >= 0; i--) {
        if (source[i] === -1) {
          // 新节点
          const pos = i + newStart;
          const newVNode = newChildren[pos];
          const nextPos = pos + 1;
          const anchor =
            newChildren.length > nextPos
              ? newChildren[nextPos].element
              : null;
          patch(null, newVNode, container, anchor);
        } else if (i !== seq[s]) {
          // 需要移动的节点
          const pos = i + newStart;
          const newVNode = newChildren[pos];
          const nextPos = pos + 1;
          const anchor =
            newChildren.length > nextPos
              ? newChildren[nextPos].element
              : null;
          insert(container, newVNode, anchor);
        } else {
          s--;
        }
      }
    }
  }
}