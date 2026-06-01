
export function fragment(items, render){
  const frag = document.createDocumentFragment();
  items.forEach(item=>frag.appendChild(render(item)));
  return frag;
}
export function clear(node){
  while(node.firstChild) node.removeChild(node.firstChild);
}
