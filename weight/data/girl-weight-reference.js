// 国家卫健委 WS/T 423—2022《7岁以下儿童生长标准》表 A.2：女童年龄别体重（kg）。
// 当前记录覆盖 0～6 月龄；后续记录超过 6 月时，按同一表格继续补充整月数据即可。
const monthlyPercentiles = [
  { month: 0, p3: 2.7, p50: 3.3, p75: 3.6, p90: 3.8, p97: 4.1 },
  { month: 1, p3: 3.5, p50: 4.3, p75: 4.6, p90: 4.9, p97: 5.3 },
  { month: 2, p3: 4.4, p50: 5.4, p75: 5.8, p90: 6.2, p97: 6.6 },
  { month: 3, p3: 5.1, p50: 6.2, p75: 6.7, p90: 7.2, p97: 7.6 },
  { month: 4, p3: 5.6, p50: 6.9, p75: 7.4, p90: 7.9, p97: 8.4 },
  { month: 5, p3: 6.0, p50: 7.4, p75: 7.9, p90: 8.5, p97: 9.1 },
  { month: 6, p3: 6.4, p50: 7.8, p75: 8.4, p90: 9.0, p97: 9.6 }
];

const DAYS_PER_MONTH = 30.4375;
const interpolate = (left, right, ratio, key) => left[key] + (right[key] - left[key]) * ratio;

export function girlWeightReference(days) {
  return days.map(day => {
    const month = day / DAYS_PER_MONTH;
    const leftIndex = Math.min(Math.floor(month), monthlyPercentiles.length - 2);
    const left = monthlyPercentiles[leftIndex], right = monthlyPercentiles[leftIndex + 1];
    const ratio = Math.min(1, Math.max(0, month - left.month));
    const p75 = interpolate(left, right, ratio, 'p75');
    const p90 = interpolate(left, right, ratio, 'p90');
    return { day, p3: interpolate(left, right, ratio, 'p3'), p50: interpolate(left, right, ratio, 'p50'), p85: p75 + (p90 - p75) * (2 / 3), p97: interpolate(left, right, ratio, 'p97') };
  });
}

export const girlWeightReferenceSource = '国家卫健委 WS/T 423—2022 · 女童年龄别体重（P3 / P50 / P85 / P97）';
