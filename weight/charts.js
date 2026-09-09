const svg = (content, viewBox = '0 0 640 250') => `<svg viewBox="${viewBox}" preserveAspectRatio="none" aria-hidden="true">${content}</svg>`;
const esc = text => String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]);

export function renderTrend(target, records) {
  if (!records.length) return;
  const values = records.map(item => item.weight), min = Math.floor((Math.min(...values) - .15) * 10) / 10, max = Math.ceil((Math.max(...values) + .15) * 10) / 10;
  const x = index => 42 + index / Math.max(1, records.length - 1) * 570;
  const y = value => 210 - (value - min) / (max - min || 1) * 164;
  const points = records.map((item, index) => `${x(index)},${y(item.weight)}`).join(' ');
  const grid = [0, .5, 1].map(ratio => { const value = min + (max - min) * ratio, py = y(value); return `<line x1="42" x2="612" y1="${py}" y2="${py}"/><text x="0" y="${py + 4}">${value.toFixed(1)}</text>`; }).join('');
  const labels = [records[0], records[Math.floor((records.length - 1) / 2)], records.at(-1)].map((item, index) => `<text class="x-label" x="${[42, 327, 612][index]}" y="240" text-anchor="${index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}">${item.date.slice(5).replace('-', '/')}</text>`).join('');
  target.innerHTML = svg(`<g class="grid">${grid}</g><polyline class="trend-line" points="${points}"/><g class="trend-points">${records.map((item, index) => `<circle class="data-point" data-index="${index}" tabindex="0" role="button" aria-label="${esc(item.date)}，${item.weight.toFixed(2)} kg" cx="${x(index)}" cy="${y(item.weight)}" r="${index === records.length - 1 ? 5 : 2.5}"><title>${esc(item.date)} · ${item.weight.toFixed(2)} kg</title></circle>`).join('')}</g>${labels}`);
}

export function renderBars(target, values, { color = 'purple', formatter = value => `${value}g`, labels = [], yAxis = false } = {}) {
  if (!values.length) return;
  const peak = Math.max(...values.map(Math.abs), 1);
  const axisPeak = yAxis ? Math.ceil(peak / 25) * 25 : peak;
  const left = yAxis ? 52 : 22, right = 622, top = 20, bottom = 184;
  const min = yAxis ? -axisPeak : 0, max = axisPeak;
  const y = value => bottom - (value - min) / (max - min || 1) * (bottom - top);
  const baseline = y(0), width = (right - left) / values.length;
  const bars = values.map((value, index) => {
    const valueY = y(value), height = Math.max(3, Math.abs(valueY - baseline)), px = left + index * width, py = Math.min(valueY, baseline);
    const label = labels[index] || '';
    return `<rect class="bar data-point ${color} ${value < 0 ? 'negative' : ''}" data-index="${index}" tabindex="0" role="button" aria-label="${esc(label)}，${formatter(value)}" x="${px}" y="${py}" width="${Math.max(4, width - 5)}" height="${height}" rx="3"><title>${esc(label)} · ${formatter(value)}</title></rect>`;
  }).join('');
  const axis = yAxis ? [axisPeak, 0, -axisPeak].map(value => `<line class="bar-grid" x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}"/><text class="bar-axis-label" x="${left - 8}" y="${y(value) + 4}" text-anchor="end">${value > 0 ? '+' : ''}${value}g</text>`).join('') : '';
  const endLabels = labels.length > 1 ? `<text class="x-label" x="${left}" y="224">${esc(labels[0])}</text><text class="x-label" x="${right}" y="224" text-anchor="end">${esc(labels.at(-1))}</text>` : '';
  target.innerHTML = svg(`${axis}<line class="zero-line" x1="${left}" x2="${right}" y1="${baseline}" y2="${baseline}"/>${bars}${endLabels}`, '0 0 640 234');
}
