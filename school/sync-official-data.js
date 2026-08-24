#!/usr/bin/env node

/*
 * 一键同步南山、福田官方学区图。
 * 仅读取本文件中的四个教育局官方页面，成功后自动更新：
 * - school-districts-official.json（保留原始多边形）
 * - official-district-data.js（移动网页查询用）
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const directory = __dirname;
const sources = [
  { url: 'https://nszs.szns.gov.cn/visitnsgbxyxqdt', district: '南山', level: '小学' },
  { url: 'https://nszs.szns.gov.cn/visitnsgbcyxqdt', district: '南山', level: '初中' },
  { url: 'https://zs.szft.gov.cn/visitftgbxyxqdt', district: '福田', level: '小学' },
  { url: 'https://zs.szft.gov.cn/visitftgbcyxqdt', district: '福田', level: '初中' }
];

function fail(message) {
  throw new Error(message);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: directory, stdio: 'inherit', shell: false });
  if (result.status !== 0) fail(command + ' ' + args.join(' ') + ' 执行失败。');
}

function npxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function ensurePlaywright() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    console.log('\n首次运行：正在安装 Playwright…');
    run(npmCommand(), ['install', 'playwright']);
    playwright = require('playwright');
  }

  if (!fs.existsSync(playwright.chromium.executablePath())) {
    console.log('\n首次运行：正在下载 Playwright Chromium 浏览器组件…');
    run(npxCommand(), ['playwright', 'install', 'chromium']);
  }
  return playwright;
}

function normalizeRecords(records, source) {
  return records.filter(item => item && typeof item === 'object').map(item => ({
    district: source.district,
    level: source.level,
    name: item.MC || item.SCHOOL_NAME || item.SCHOOLNAME || item.NAME || item.name || '',
    homes: String(item.XQ || '').split(/[,;，；]+/).map(name => name.trim()).filter(Boolean),
    polygon: item.MAPDATA || null,
    center: item.POINTX && item.POINTY ? [Number(item.POINTX), Number(item.POINTY)] : null
  })).filter(item => item.name);
}

async function readSource(browser, source, index) {
  console.log('\n[' + (index + 1) + '/4] 正在读取' + source.district + source.level + '官方学区图…');
  const page = await browser.newPage();
  await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => {
    const value = globalThis.otherxx;
    const records = Array.isArray(value) ? value : Object.values(value || {});
    return records.length > 0;
  }, { timeout: 60_000 });
  const records = await page.evaluate(() => {
    const value = globalThis.otherxx;
    return Array.isArray(value) ? value : Object.values(value || {});
  });
  const schools = normalizeRecords(records, source);
  await page.close();
  if (!schools.length) fail(source.district + source.level + '官方图未提取到学校数据。');
  console.log('完成：' + schools.length + ' 所学校。');
  return schools;
}

function writeOutputs(schools) {
  const now = new Date();
  const raw = {
    source: '南山、福田教育局官方学区图',
    sources: sources.map(source => source.url),
    exportedAt: now.toISOString(),
    schemaVersion: 4,
    schools,
    updatedAt: Date.now()
  };
  const mobile = {
    updatedAt: raw.updatedAt,
    exportedAt: raw.exportedAt,
    sources: raw.sources,
    schools: schools.map(({ district, level, name, homes }) => ({ district, level, name, homes }))
  };
  const jsonPath = path.join(directory, 'school-districts-official.json');
  const jsPath = path.join(directory, 'official-district-data.js');
  const js = [
    '/* 由 sync-official-data.js 自动生成；来源仅限四张官方学区图。 */',
    'globalThis.NanshanDistrictData = ' + JSON.stringify(mobile) + ';',
    'globalThis.SchoolDistrictDataReady = Promise.resolve();',
    ''
  ].join('\n');

  fs.writeFileSync(jsonPath + '.tmp', JSON.stringify(raw), 'utf8');
  fs.writeFileSync(jsPath + '.tmp', js, 'utf8');
  fs.renameSync(jsonPath + '.tmp', jsonPath);
  fs.renameSync(jsPath + '.tmp', jsPath);

  const links = schools.reduce((count, school) => count + school.homes.length, 0);
  console.log('\n同步完成。');
  console.log('学校：' + schools.length + ' 所');
  console.log('学校—小区关联：' + links + ' 条');
  console.log('已更新：school-districts-official.json');
  console.log('已更新：official-district-data.js');
}

(async () => {
  try {
    console.log('南山、福田官方学区图自动同步');
    const chromium = ensurePlaywright().chromium;
    console.log('\n正在启动受控 Chromium 浏览器；将依次打开四张官方图。');
    const browser = await chromium.launch({ headless: false });
    try {
      const groups = [];
      for (const [index, source] of sources.entries()) groups.push(await readSource(browser, source, index));
      writeOutputs(groups.flat());
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('\n同步失败：' + error.message);
    process.exitCode = 1;
  }
})();
