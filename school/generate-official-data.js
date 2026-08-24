#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const directory = __dirname;
const sourcePath = path.join(directory, 'school-districts-official.json');
const outputPath = path.join(directory, 'official-district-data.js');
const officialSources = new Set([
  'https://nszs.szns.gov.cn/visitnsgbxyxqdt',
  'https://nszs.szns.gov.cn/visitnsgbcyxqdt',
  'https://zs.szft.gov.cn/visitftgbxyxqdt',
  'https://zs.szft.gov.cn/visitftgbcyxqdt'
]);

function fail(message) {
  console.error('\n更新失败：' + message);
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) {
  fail('未找到 school-districts-official.json。请先将插件导出的同名文件放到此目录。');
}

let raw;
try {
  raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
} catch {
  fail('JSON 文件无法解析，请确认导出文件完整。');
}

if (raw.schemaVersion !== 4 || !Array.isArray(raw.schools) || !raw.schools.length) {
  fail('不是有效的官方学区导出文件（需要 schemaVersion 4 和 schools 数据）。');
}

const sources = new Set(raw.sources || []);
if (sources.size !== 4 || [...officialSources].some(source => !sources.has(source))) {
  fail('数据来源校验失败。文件必须同时来自南山、福田的小学和初中四张官方学区图。');
}

const schools = raw.schools.map(({ district, level, name, homes }) => ({
  district,
  level,
  name,
  homes: Array.isArray(homes) ? homes : []
}));

const mobileData = {
  updatedAt: raw.updatedAt,
  exportedAt: raw.exportedAt,
  sources: raw.sources,
  schools
};

const content = [
  '/*',
  ' * 由 generate-official-data.js 自动生成。',
  ' * 来源仅限南山、福田教育局四张官方学区图；请勿手动编辑。',
  ' */',
  'globalThis.NanshanDistrictData = ' + JSON.stringify(mobileData) + ';',
  'globalThis.SchoolDistrictDataReady = Promise.resolve();',
  ''
].join('\n');

fs.writeFileSync(outputPath, content, 'utf8');

const associationCount = schools.reduce((count, school) => count + school.homes.length, 0);
console.log('\n官方数据更新完成。');
console.log('学校：' + schools.length + ' 所');
console.log('学校—小区关联：' + associationCount + ' 条');
console.log('输出：' + outputPath);
