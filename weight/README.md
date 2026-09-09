# 体重记录页面

## 更新数据

只编辑 `data/weight-records.js`：按 `{ date: 'YYYY-MM-DD', weight: 0.00 }` 的形式添加日期与体重（kg）。页面会自动排序并重新计算第几天、与上次的变化、日均变化、阶段增长及所有图表。

## 页面结构

- `index.html`：页面语义结构
- `data/weight-records.js`：唯一需要日常维护的原始数据
- `analytics.js`：指标与阶段统计
- `charts.js`：无依赖 SVG 图表渲染
- `app.js`：页面装配与时间范围交互
- `styles.css`：响应式样式
