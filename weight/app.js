import { weightRecords } from './data/weight-records.js';
import { girlWeightReference } from './data/girl-weight-reference.js';
import { prepareRecords, summarize, filterByRange, phaseGrowth } from './analytics.js';
import { renderTrend, renderBars } from './charts.js';

const records = prepareRecords(weightRecords);
const stats = summarize(records);
const $ = selector => document.querySelector(selector);
const formatDate = date => date.replaceAll('-', '.');
const signed = (value, digits = 0) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
const weightText = value => `${signed(value, 2)} kg`;
const gramText = value => `${signed(value * 1000, 0)} g`;
let startIndex = 0;
let endIndex = records.length - 1;
let recordsExpanded = false;

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
  const newestFirst = [...records].reverse();
  const visible = recordsExpanded ? newestFirst : newestFirst.slice(0, 5);
  $('#recordsBody').innerHTML = visible.map(item => `<tr><td>${formatDate(item.date)}</td><td>第 ${item.daysFromStart} 天</td><td><strong>${item.weight.toFixed(2)} kg</strong></td><td class="${item.change >= 0 ? 'positive' : 'negative'}">${item.change === null ? '—' : weightText(item.change)}</td><td>${item.intervalDays === null ? '—' : `${item.intervalDays} 天`}</td><td class="${item.dailyChange >= 0 ? 'positive' : 'negative'}">${item.dailyChange === null ? '—' : `${signed(item.dailyChange * 1000, 1)} g/天`}</td></tr>`).join('');
  const toggle = $('#recordsToggle');
  toggle.hidden = records.length <= 5;
  toggle.textContent = recordsExpanded ? '收起记录' : `展开全部 ${records.length} 条记录`;
  toggle.setAttribute('aria-expanded', String(recordsExpanded));
}

function render() {
  const visible = records.slice(startIndex, endIndex + 1);
  const first = visible[0], latest = visible.at(-1), gain = latest.weight - first.weight;
  $('#trendRange').textContent = `${formatDate(first.date)} — ${formatDate(latest.date)} · ${visible.length} 次记录`;
  $('#trendGain').textContent = `${signed(gain, 2)} kg`;
  const reference = girlWeightReference(Array.from({ length: latest.daysFromStart - first.daysFromStart + 1 }, (_, index) => first.daysFromStart - 1 + index));
  renderTrend($('#trendChart'), visible, reference);
  $('#trendSelection').textContent = '点击图中的点查看该次记录。';
  const paceItems = visible.slice(1);
  renderBars($('#paceChart'), paceItems.map(item => item.dailyChange * 1000), { color: 'teal', formatter: value => `${signed(value, 1)} g/天`, labels: paceItems.map(item => item.date.slice(5).replace('-', '/')), yAxis: true });
  $('#paceSelection').textContent = '点击柱子查看这段时间的变化。';
  const phases = phaseGrowth(visible);
  renderBars($('#phaseChart'), phases.map(item => item.gain * 1000), { color: 'gold', formatter: value => `${signed(value / 1000, 2)} kg`, labels: phases.map(item => `第${item.phase}阶段`) });
  $('#phaseSelection').textContent = '点击柱子查看该阶段详情。';

  bindChartDetails('#trendChart', item => `${formatDate(item.date)} · 第 ${item.daysFromStart} 天 · <strong>${item.weight.toFixed(2)} kg</strong>${item.change === null ? '' : ` · 较上次 ${weightText(item.change)}`}`, visible, '#trendSelection');
  bindChartDetails('#paceChart', item => `${formatDate(item.date)} · ${item.intervalDays} 天内 ${weightText(item.change)} · 日均 <strong>${signed(item.dailyChange * 1000, 1)} g/天</strong>`, paceItems, '#paceSelection');
  bindChartDetails('#phaseChart', item => `第 ${item.phase} 阶段 · ${formatDate(item.start.date)} — ${formatDate(item.end.date)} · <strong>${signed(item.gain, 2)} kg</strong>`, phases, '#phaseSelection');
  updateRangeControl();
}

function updateRangeControl() {
  const max = records.length - 1;
  const start = $('#trendStart'), end = $('#trendEnd');
  start.min = 0; start.max = max - 1; start.value = startIndex;
  end.min = 1; end.max = max; end.value = endIndex;
  $('#trendStartLabel').textContent = formatDate(records[startIndex].date);
  $('#trendEndLabel').textContent = formatDate(records[endIndex].date);
  $('#sliderFill').style.left = `${startIndex / max * 100}%`;
  $('#sliderFill').style.width = `${(endIndex - startIndex) / max * 100}%`;
}

function setSelection(start, end) {
  startIndex = Math.max(0, Math.min(start, records.length - 2));
  endIndex = Math.min(records.length - 1, Math.max(end, startIndex + 1));
  document.querySelectorAll('[data-range]').forEach(button => button.classList.remove('is-active'));
  render();
}

function bindChartDetails(chartSelector, makeDetail, items, detailSelector) {
  const show = index => { $(detailSelector).innerHTML = makeDetail(items[index]); };
  $(chartSelector).querySelectorAll('.data-point').forEach(point => {
    point.addEventListener('click', () => show(Number(point.dataset.index)));
    point.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(Number(point.dataset.index)); } });
  });
}

writeSummary(); renderRecords(); render();
document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
  const visible = filterByRange(records, button.dataset.range);
  startIndex = records.indexOf(visible[0]); endIndex = records.indexOf(visible.at(-1));
  document.querySelectorAll('[data-range]').forEach(item => item.classList.toggle('is-active', item === button));
  render();
}));
$('#trendStart').addEventListener('input', event => setSelection(Number(event.target.value), endIndex));
$('#trendEnd').addEventListener('input', event => setSelection(startIndex, Number(event.target.value)));
$('#recordsToggle').addEventListener('click', () => { recordsExpanded = !recordsExpanded; renderRecords(); });
