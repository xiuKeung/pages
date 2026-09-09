const DAY = 86400000;
export const parseDate = value => new Date(`${value}T00:00:00`);
export const daysBetween = (start, end) => Math.round((parseDate(end) - parseDate(start)) / DAY);

export function prepareRecords(source) {
  return [...source].sort((a, b) => a.date.localeCompare(b.date)).map((record, index, records) => {
    const previous = records[index - 1];
    const daysFromStart = daysBetween(records[0].date, record.date) + 1;
    const intervalDays = previous ? daysBetween(previous.date, record.date) : null;
    const change = previous ? record.weight - previous.weight : null;
    return { ...record, daysFromStart, intervalDays, change, dailyChange: previous ? change / intervalDays : null };
  });
}

export function summarize(records) {
  const first = records[0], latest = records.at(-1);
  const totalDays = latest.daysFromStart;
  const intervals = records.slice(1);
  const highestPace = intervals.reduce((best, item) => item.dailyChange > (best?.dailyChange ?? -Infinity) ? item : best, null);
  return {
    first, latest, totalDays, totalGain: latest.weight - first.weight,
    averageDailyGain: (latest.weight - first.weight) / (totalDays - 1),
    highestPace,
    coverage: records.length / totalDays,
    averagePace: intervals.reduce((sum, item) => sum + item.dailyChange, 0) / intervals.length
  };
}

export function filterByRange(records, range) {
  if (range === 'all') return records;
  const last = records.at(-1);
  const threshold = new Date(parseDate(last.date).getTime() - (Number(range) - 1) * DAY);
  return records.filter(record => parseDate(record.date) >= threshold);
}

export function phaseGrowth(records) {
  const phaseMap = new Map();
  records.forEach(record => {
    const phase = Math.floor((record.daysFromStart - 1) / 30) + 1;
    if (!phaseMap.has(phase)) phaseMap.set(phase, { phase, start: record, end: record });
    phaseMap.get(phase).end = record;
  });
  return [...phaseMap.values()].map(item => ({ ...item, gain: item.end.weight - item.start.weight }));
}
