/* 模块 2：由原 index.html 内联脚本迁移。 */
(async () => {
  const $ = (id) => document.getElementById(id),
    key = "shenzhen-viewing-records-v1";
  let records = [];
  let renderLimit = 20;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    );
  const wan = (v) =>
    Number(v || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  const sourceHref = (value) => {
    const link = String(value || '').trim();
    if (!link) return '';
    // 浏览器会把 www.baidu.com 视作当前页面的相对路径；明确补全 HTTPS。
    if (/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#].*)?$/i.test(link)) return `https://${link}`;
    return link;
  };
  const time = (v) => {
    const d = new Date(Number(v));
    return Number.isNaN(d.getTime())
      ? "—"
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };
  async function load({ force = false, retries = 2 } = {}) {
    let error;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const stored = await window.NativeStore.getViewingRecords({ force });
        records = Array.isArray(stored) ? stored : [];
        return true;
      } catch (cause) {
        error = cause;
        if (attempt < retries)
          await new Promise((resolve) =>
            setTimeout(resolve, 180 * (attempt + 1)),
          );
      }
    }
    console.warn("读取看房记录失败，将在下次进入时重试。", error);
    showLoadFailure(error);
    return false;
  }
  function showLoadFailure(error) {
    const recordsNode = $('records');
    if (recordsNode.querySelector('.record')) {
      toast('读取记录失败，已保留当前列表');
      return;
    }
    recordsNode.innerHTML = `<div class="card empty"><p>看房记录读取失败，请重试</p><div class="record-actions"><button id="retryViewingRecords" type="button">重试读取</button></div></div>`;
    $('retryViewingRecords')?.addEventListener('click', () => void reloadRecords({ force:true }));
    console.warn('看房记录读取失败：', error);
  }
  async function reloadRecords(options = {}) {
    const loaded = await load(options);
    if (loaded) render();
    return loaded;
  }
  function save() {
    void window.NativeStore.saveViewingRecords(records);
  }
  function toast(t) {
    $("toast").textContent = t;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => {
      $("toast").textContent = "";
    }, 2600);
  }
  function unit(r) {
    return r.totalPrice && r.area ? `${wan(r.totalPrice / r.area)} 万/㎡` : "";
  }
  function priority(v) {
    return v === "focus"
      ? ["重点关注", "focus"]
      : v === "excluded"
        ? ["已排除", "excluded"]
        : ["普通", "normal"];
  }
  function renderHistory() {
    const names = [
      ...new Set(records.map((r) => r.community).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "zh-CN"));
    $("communityHistory").innerHTML = names
      .map((name) => `<option value="${esc(name)}"></option>`)
      .join("");
  }
  function render() {
    const choice = $("filter").value;
    const query = ($("recordSearch")?.value || "").trim().toLocaleLowerCase();
    const list = records
      .filter(
        (r) =>
          (choice === "all" || r.priority === choice) &&
          (!query || JSON.stringify(r).toLocaleLowerCase().includes(query)),
      )
      .sort(
        (a, b) =>
          (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0),
      );
    const recordsNode = $("records");
    const displayed = list.slice(0, renderLimit);
    recordsNode.dataset.total = String(list.length);
    recordsNode.innerHTML = list.length
      ? displayed
          .map((r, index) => {
            const [name, kind] = priority(r.priority),
              floor =
                r.floor && r.totalFloor
                  ? `${r.floor}/${r.totalFloor}层`
                  : r.floor
                    ? `${r.floor}层`
                    : r.totalFloor
                      ? `总${r.totalFloor}层`
                      : "",
              detail = [
                r.area && `${wan(r.area)}㎡`,
                r.layout,
                r.orientation,
                floor,
                r.builtYear && `${r.builtYear}年`,
                r.totalPrice && `${wan(r.totalPrice)}万`,
                unit(r),
              ]
                .filter(Boolean)
                .join(" · ");
            return `<article class="record" data-record-order="${list.length - index}"><div class="record-top"><div><h2>${esc(r.community)}</h2><p class="meta">${esc(detail || "暂未填写价格与面积")} ${r.viewedAt ? `· 看房：${esc(r.viewedAt)}` : ""}</p><p class="meta">最后编辑：${time(r.updatedAt || r.createdAt)}</p></div><span class="badge ${kind}">${name}</span></div><p class="schools">学区：请点击下方“查学区”获取当前官方匹配结果。</p>${r.pros || r.cons || r.notes || r.nearbyLandmark ? `<p class="notes">${r.pros ? `优点：${esc(r.pros)}\n` : ""}${r.cons ? `缺点 / 风险：${esc(r.cons)}\n` : ""}${r.nearbyLandmark ? `附近地标：${esc(r.nearbyLandmark)}\n` : ""}${r.notes ? `备注：${esc(r.notes)}` : ""}</p>` : ""}<div class="record-actions"><a class="button" href="../school/index.html?mode=community&q=${encodeURIComponent(r.community)}">查学区</a>${sourceHref(r.sourceLink) ? `<a class="button" href="${esc(sourceHref(r.sourceLink))}" target="_blank" rel="noreferrer">房源链接 ↗</a>` : ""}<a class="button" href="../calculator/index.html?c=${encodeURIComponent(btoa(JSON.stringify({ type: "commercial", amountMode: "auto", housePrice: r.totalPrice || "", downPaymentRate: "15" })))}">算月供</a><button data-copy="${r.id}" type="button">复制信息</button><button data-edit="${r.id}" type="button">查看</button><button class="danger" data-delete="${r.id}" type="button">删除</button></div></article>`;
          })
          .join("")
      : '<div class="card empty">还没有看房记录。点击“新增房源”开始记录。</div>';
    renderHistory();
    document
      .querySelectorAll("[data-copy]")
      .forEach((b) => (b.onclick = () => copySavedRecord(b.dataset.copy)));
    document
      .querySelectorAll("[data-edit]")
      .forEach((b) => (b.onclick = () => edit(b.dataset.edit)));
    document
      .querySelectorAll("[data-delete]")
      .forEach((b) => (b.onclick = () => remove(b.dataset.delete)));
  }
  function updateUnit() {
    const price = +$("totalPrice").value,
      area = +$("area").value;
    $("unitPrice").textContent =
      price && area
        ? `单价约 ${wan(price / area)} 万/㎡`
        : "填写总价和面积后自动计算单价";
  }
  function openEditor(
    r = { priority: "focus", viewedAt: new Date().toISOString().slice(0, 10) },
  ) {
    $("editor").classList.remove("hidden");
    $("editorTitle").textContent = r.id ? "编辑房源" : "新增房源";
    [
      "recordId",
      "community",
      "priority",
      "totalPrice",
      "area",
      "layout",
      "orientation",
      "floor",
      "totalFloor",
      "builtYear",
      "targetPrice",
      "viewedAt",
      "sourceLink",
      "pros",
      "cons",
      "notes",
    ].forEach((id) => ($(id).value = r[id] ?? ""));
    updateUnit();
    window.scrollTo({ top: $("editor").offsetTop - 12, behavior: "smooth" });
  }
  function edit(id) {
    openEditor(records.find((r) => String(r.id) === id));
  }
  function remove(id) {
    if (!confirm("删除这条看房记录？")) return;
    records = records.filter((r) => String(r.id) !== id);
    save();
    render();
    toast("记录已删除。");
  }
  function download(text, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }
  function recordText(r) {
    const floor =
      r.floor && r.totalFloor
        ? `${r.floor}/${r.totalFloor}层`
        : r.floor
          ? `${r.floor}层`
          : r.totalFloor
            ? `总${r.totalFloor}层`
            : "";
    return [
      ["小区", r.community],
      ["关注等级", priority(r.priority)[0]],
      ["当前报价", r.totalPrice && `${r.totalPrice} 万元`],
      ["面积", r.area && `${r.area} ㎡`],
      [
        "单价",
        r.totalPrice && r.area && `${wan(+r.totalPrice / +r.area)} 万/㎡`,
      ],
      ["户型", r.layout],
      ["朝向", r.orientation],
      ["楼层", floor],
      ["建成年份", r.builtYear && `${r.builtYear} 年`],
      ["预期成交价", r.targetPrice && `${r.targetPrice} 万元`],
      ["看房日期", r.viewedAt],
      ["房源链接", r.sourceLink],
      ["优点", r.pros],
      ["缺点 / 风险", r.cons],
      ["个人备注", r.notes],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}：${value}`)
      .join("\n");
  }
  async function copyText(text, message) {
    if (!text) {
      toast("请先填写至少一项信息。");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast(message);
  }
  async function copyRecord() {
    const values = (id) => $(id).value.trim(),
      data = {
        community: values("community"),
        priority: $("priority").value,
        totalPrice: values("totalPrice"),
        area: values("area"),
        layout: values("layout"),
        orientation: values("orientation"),
        floor: values("floor"),
        totalFloor: values("totalFloor"),
        builtYear: values("builtYear"),
        targetPrice: values("targetPrice"),
        viewedAt: values("viewedAt"),
        sourceLink: values("sourceLink"),
        pros: values("pros"),
        cons: values("cons"),
        notes: values("notes"),
      };
    copyText(recordText(data), "当前编辑信息已复制。");
  }
  async function copySavedRecord(id) {
    const record = records.find((r) => String(r.id) === id);
    if (record) copyText(recordText(record), "当前记录信息已复制。");
  }
  function populateBuiltYears() {
    const select = $("builtYear"),
      current = new Date().getFullYear();
    for (let year = current; year >= 1950; year--)
      select.add(new Option(`${year}年`, year));
  }
  function populateFloors() {
    const select = $("floor");
    for (let floor = 1; floor <= 40; floor++)
      select.add(new Option(`${floor}层`, floor));
  }
  $("add").onclick = () => openEditor();
  $("cancel").onclick = () => {
    $("editor").classList.add("hidden");
  };
  $("copyRecord").onclick = copyRecord;
  $("totalPrice").oninput = updateUnit;
  $("area").oninput = updateUnit;
  $("filter").onchange = () => {
    renderLimit = 20;
    render();
  };
  $("recordForm").onsubmit = (e) => {
    e.preventDefault();
    const r = Object.fromEntries(new FormData(e.target)),
      now = Date.now();
    r.id = r.recordId || now.toString();
    delete r.recordId;
    const i = records.findIndex((x) => x.id === r.id);
    r.createdAt =
      i >= 0 ? records[i].createdAt || records[i].updatedAt || now : now;
    r.updatedAt = now;
    if (i >= 0) records[i] = r;
    else records.push(r);
    save();
    $("editor").classList.add("hidden");
    renderLimit = 20;
    render();
    toast("记录已保存。");
  };
  $("export").onclick = () => {
    download(JSON.stringify(records, null, 2), "shenzhen-viewing-records.json");
    toast("备份文件已导出。");
  };
  $("importButton").onclick = () => $("importFile").click();
  $("importFile").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data)) throw Error();
      records = data.filter((x) => x && x.community);
      save();
      render();
      toast(`已导入 ${records.length} 条记录。`);
    } catch (_) {
      alert("导入失败：请选择本工具导出的 JSON 文件。");
    }
    e.target.value = "";
  };
  populateBuiltYears();
  populateFloors();
  await reloadRecords({ force: true });
  window.addEventListener("pageshow", (event) => {
    // Android WebView 返回到入口后再进入时，页面可能来自历史缓存。
    // 无论是否标记 persisted，都强制从 SQLite 刷新一次。
    void reloadRecords({ force: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void reloadRecords({ force: true });
  });
  window.addEventListener("focus", () => void reloadRecords({ force: true }));
  window.addEventListener("viewing:load-more", () => {
    renderLimit += 20;
    render();
  });
  window.addEventListener("viewing:query-change", () => {
    renderLimit = 20;
    render();
  });
})();

/* 模块 3：由原 index.html 内联脚本迁移。 */
document.querySelector("[data-back]")?.addEventListener("click", (event) => {
  const editor = document.getElementById("editor");
  if (editor && !editor.classList.contains("hidden")) {
    event.preventDefault();
    const form = document.getElementById("recordForm");
    const community = document.getElementById("community")?.value.trim();
    // 查看详情时，返回的第一层含义是结束查看并收起详情；避免直接离开列表。
    if (community) form?.requestSubmit();
    else {
      editor.classList.add("hidden");
      window.dispatchEvent(new Event('viewing:close-editor'));
    }
    return;
  }
  if (history.length > 1) {
    event.preventDefault();
    history.back();
  }
});
