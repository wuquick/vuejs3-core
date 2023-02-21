const p = Promise.resolve();
const jobQueue = new Set<Function>();
let isFlushing = false;

export function addJob(fn: Function) {
  jobQueue.add(fn);
}

export async function flushJob() {
  if (isFlushing) {
    return;
  }
  isFlushing = true;
  await p.then(() => {
    jobQueue.forEach(fn => {
      fn();
    })
  }).finally(() => {
    isFlushing = false;
    jobQueue.clear();
  })
}

export async function renderJobQueue(job: Function) {
  jobQueue.add(job);
  if (isFlushing) {
    return;
  }
  isFlushing = true;
  await p.then(() => {
    jobQueue.forEach(fn => {
      fn();
    })
  }).finally(() => {
    isFlushing = false;
    jobQueue.clear();
  })
}