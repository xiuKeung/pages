# 看房记录页面结构

`index.html` 只保留页面结构和资源引用。

- `style.css`：页面全部样式。
- `scripts/01-loan.js`：贷款计算。
- `scripts/02-core.js`：基础记录读取、渲染与返回行为。
- `scripts/03-editor-basics.js`：编辑器与小区联想等基础交互。
- `scripts/04-record-summary.js`：列表摘要、筛选与折叠信息。
- `scripts/05-editor-fields.js`：字段布局、字段迁移和录入体验。
- `scripts/06-copy-and-index.js`：复制与列表序号。
- `scripts/07-layout.js`：编辑器布局调整。
- `scripts/08-save-and-autofill.js`：保存状态和同小区自动带入。
- `scripts/09-images.js`：图片选择、拍照、预览、缩放、保存与删除。
- `scripts/10-date-control.js`：日期控件的 iOS 兼容显示。
- `scripts/11-record-actions.js`：列表操作按钮的最终状态。

脚本按 `index.html` 中的顺序加载；现有功能依赖此顺序。App 构建时会直接复制整个 `viewings/` 目录到原生 Web 资源目录。
