export function rafBatch(fn) {
  let frame = 0;
  return (...args) => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      fn(...args);
    });
  };
}

export function idleTask(fn, timeout = 800) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(fn, { timeout });
  }
  return window.setTimeout(fn, 1);
}

export function cancelIdleTask(id) {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
    return;
  }
  window.clearTimeout(id);
}

export function imageLazyAttrs(img, alt = '') {
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = alt;
  return img;
}
