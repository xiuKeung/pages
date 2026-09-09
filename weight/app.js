import { weightRecords } from './data/weight-records.js';
import { prepareRecords, summarize, filterByRange, phaseGrowth } from './analytics.js';
import { renderTrend, renderBars } from './charts.js';

const records = prepareRecords(weightRecords);
const stats = summarize(records);
const $ = selector => document.querySelector(selector);
const formatDate = date => date.replaceAll('-', '.');
const signed = (value, digits = 0) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
const weightText = value => `${signed(value, 2)} kg`;
const gramText = value => `${signed(value * 1000, 0)} g`;

function writeSummary() {
  $('#latestWeight').textContent = stats.latest.weight.toFixed(2);
  $('#latestDate').textContent = formatDate(stats.latest.date);
  $('#summarySentence').textContent = `第 ${stats.latest.daysFromStart} 天 · 从 ${stats.first.weight.toFixed(2)} kg 稳步成长至 ${stats.latest.weight.toFixed(2)} kg。`;
  $('#totalGain').textContent = weightText(stats.totalGain);
  $('#averageDailyGain').textContent = gramText(stats.averageDailyGain);
  $('#maxDailyGain').textContent = gramText(stats.highestPace.dailyChange);
  $('#maxDailyGainDate').textContent = `${formatDate(stats.highestPace.date)} · ${stats.highestPace.intervalDays} 天间隔`;
  $('#coverageRate').textContent = `${Math.round(stats.coverage * 100)}%`;
  $('#coverageNote').textContent = `${records.length} 次记录，覆盖 ${stats.totalDays} 天`;
  $('#paceAverage').textContent = `${signed(stats.averagePace * 1000, 0)} g/天`;
  const phases = phaseGrowth(records);
  $('#phaseBest').textContent = `最高 ${signed(Math.max(...phases.map(item => item.gain)), 2)} kg`;
  $('#recordCount').textContent = `共 ${records.length} 次称重`;
}

function renderRecords() {
  $('#recordsBody').innerHTML = [...records].reverse().map(item => `<tr><td>${formatDate(item.date)}</td><td>第 ${item.daysFromStart} 天</td><td><strong>${item.weight.toFixed(2)} kg</strong></td><td class="${item.change >= 0 ? 'positive' : 'negative'}">${item.change === null ? '—' : weightText(item.change)}</td><td>${item.intervalDays === null ? '—' : `${item.intervalDays} 天`}</td><td class="${item.dailyChange >= 0 ? 'positive' : 'negative'}">${item.dailyChange === null ? '—' : `${signed(item.dailyChange * 1000, 1)} g/天`}</td></tr>`).join('');
}

function render(range = 'all') {
  const visible = filterByRange(records, range);
  const first = visible[0], latest = visible.at(-1), gain = latest.weight - first.weight;
  $('#trendRange').textContent = `${formatDate(first.date)} — ${formatDate(latest.date)} · ${visible.length} 次记录`;
  $('#trendGain').textContent = `${signed(gain, 2)} kg`;
  renderTrend($('#trendChart'), visible);
  const paceItems = visible.slice(1);
  renderBars($('#paceChart'), paceItems.map(item => item.dailyChange * 1000), { color: 'teal', formatter: value => `${signed(value, 1)} g/天`, labels: paceItems.map(item => item.date.slice(5).replace('-', '/')), yAxis: true });
  const phases = phaseGrowth(visible);
  renderBars($('#phaseChart'), phases.map(item => item.gain * 1000), { color: 'gold', formatter: value => `${signed(value / 1000, 2)} kg`, labels: phases.map(item => `第${item.phase}阶段`) });
}

writeSummary(); renderRecords(); render();
document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
  document.querySelector('[data-range].is-active').classList.remove('is-active');
  button.classList.add('is-active'); render(button.dataset.range);
}));
