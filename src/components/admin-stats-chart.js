function createText(className, value) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = value ?? '';
  return el;
}

export function renderStatsChart(container, chartData = []) {
  if (!container) return;
  const max = Math.max(...chartData.map(item => Number(item.visits) || 0), 1);
  const frag = document.createDocumentFragment();

  chartData.forEach(item => {
    const visits = Number(item.visits) || 0;
    const height = Math.max(Math.round((visits / max) * 100), 3);
    const col = document.createElement('div');
    col.className = 'chart-col';

    const value = createText('chart-val', visits || '');

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${height}%`;

    const label = createText('chart-label', item.label || '');

    col.append(value, bar, label);
    frag.appendChild(col);
  });

  container.replaceChildren(frag);
}
