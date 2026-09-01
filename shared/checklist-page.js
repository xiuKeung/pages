(() => {
  // src/checklist-page.js
  (() => {
    const stages = [
      ["\u770B\u623F\u524D\u51C6\u5907", [["budget", "\u786E\u8BA4\u9996\u4ED8\u9884\u7B97\u4E0E\u53EF\u627F\u53D7\u6708\u4F9B", "\u5148\u4F7F\u7528\u623F\u8D37\u8BA1\u7B97\u5668\u9884\u4F30\u73B0\u91D1\u6D41\u3002", "../calculator/index.html", "\u8BA1\u7B97\u6708\u4F9B"], ["credit", "\u6838\u9A8C\u5F81\u4FE1\u4E0E\u8D37\u6B3E\u8D44\u683C", "\u5411\u94F6\u884C\u6216\u8D37\u6B3E\u7ECF\u7406\u8FDB\u884C\u9884\u5BA1\u3002"], ["school", "\u6838\u5BF9\u76EE\u6807\u5C0F\u533A\u5B98\u65B9\u5B66\u533A", "\u5B66\u533A\u4E0E\u62DB\u751F\u653F\u7B56\u5E94\u4EE5\u5F53\u5E74\u5B98\u65B9\u4FE1\u606F\u4E3A\u51C6\u3002", "../school/index.html", "\u67E5\u5B66\u533A"], ["fund", "\u786E\u8BA4\u516C\u79EF\u91D1\u4F59\u989D\u4E0E\u53EF\u8D37\u989D\u5EA6", "\u516C\u79EF\u91D1\u989D\u5EA6\u3001\u9996\u4ED8\u6BD4\u4F8B\u8BF7\u4EE5\u5BA1\u6279\u7ED3\u679C\u4E3A\u51C6\u3002"], ["cash", "\u786E\u8BA4\u9996\u4ED8\u4E0E\u7A0E\u8D39\u8D44\u91D1\u6765\u6E90", "\u907F\u514D\u5C06\u88C5\u4FEE\u3001\u7A0E\u8D39\u3001\u5E94\u6025\u8D44\u91D1\u5168\u90E8\u8BA1\u5165\u9996\u4ED8\u3002"]]],
      ["\u9009\u623F\u4E0E\u6838\u9A8C", [["viewing", "\u5B9E\u5730\u770B\u623F\u5E76\u8BB0\u5F55\u4F18\u7F3A\u70B9", "\u67E5\u770B\u91C7\u5149\u3001\u566A\u97F3\u3001\u697C\u5C42\u3001\u6F0F\u6C34\u3001\u516C\u5171\u533A\u57DF\u7B49\u3002", "../viewings/index.html", "\u8BB0\u5F55\u770B\u623F"], ["price", "\u6838\u5BF9\u62A5\u4EF7\u3001\u6210\u4EA4\u53C2\u8003\u4E0E\u5355\u4EF7", "\u91CD\u70B9\u6BD4\u8F83\u540C\u5C0F\u533A\u3001\u540C\u6237\u578B\u3001\u540C\u697C\u5C42\u6761\u4EF6\u3002"], ["title", "\u6838\u9A8C\u4EA7\u6743\u3001\u62B5\u62BC\u4E0E\u4EA4\u6613\u9650\u5236", "\u7B7E\u7EA6\u524D\u8BF7\u5411\u4E13\u4E1A\u4EBA\u58EB\u3001\u767B\u8BB0\u90E8\u95E8\u6216\u4E2D\u4ECB\u6838\u9A8C\u3002"], ["schoolLock", "\u786E\u8BA4\u5B66\u4F4D\u5360\u7528\u4E0E\u5165\u5B66\u98CE\u9669", "\u5C24\u5176\u5173\u6CE8\u5171\u4EAB\u5B66\u533A\u3001\u591A\u6821\u9009\u62E9\u4E0E\u5B66\u4F4D\u9501\u5B9A\u3002", "../school/index.html", "\u67E5\u5B66\u533A"], ["taxEstimate", "\u4F30\u7B97\u7A0E\u8D39", "\u4E0D\u8981\u53EA\u6BD4\u8F83\u9996\u4ED8\u4E0E\u6302\u724C\u603B\u4EF7\u3002"], ["agentEstimate", "\u4F30\u7B97\u4E2D\u4ECB\u8D39", "\u786E\u8BA4\u6536\u8D39\u6807\u51C6\u3001\u670D\u52A1\u8303\u56F4\u4E0E\u4ED8\u6B3E\u8282\u70B9\u3002"], ["renovationEstimate", "\u4F30\u7B97\u88C5\u4FEE\u4E0E\u6301\u6709\u6210\u672C", "\u9884\u7559\u88C5\u4FEE\u3001\u7269\u4E1A\u3001\u7EF4\u4FEE\u4E0E\u5E94\u6025\u8D44\u91D1\u3002"]]],
      ["\u8D37\u6B3E\u4E0E\u7B7E\u7EA6", [["loanPlan", "\u786E\u5B9A\u5546\u8D37 / \u516C\u79EF\u91D1 / \u7EC4\u5408\u8D37\u65B9\u6848", "\u5C06\u5B9E\u9645\u94F6\u884C\u62A5\u4EF7\u586B\u5165\u8BA1\u7B97\u5668\u590D\u6838\u3002", "../calculator/index.html", "\u590D\u6838\u8D37\u6B3E"], ["contract", "\u9010\u9879\u6838\u5BF9\u4E70\u5356\u5408\u540C\u4E0E\u8865\u5145\u534F\u8BAE", "\u91CD\u70B9\u786E\u8BA4\u4ED8\u6B3E\u8282\u70B9\u3001\u8FDD\u7EA6\u8D23\u4EFB\u4E0E\u4EA4\u4ED8\u6761\u4EF6\u3002"], ["funds", "\u786E\u8BA4\u8D44\u91D1\u76D1\u7BA1\u548C\u4ED8\u6B3E\u8DEF\u5F84", "\u4ED8\u6B3E\u524D\u6838\u5BF9\u6536\u6B3E\u8D26\u6237\u53CA\u76D1\u7BA1\u8981\u6C42\u3002"], ["identityDocs", "\u6574\u7406\u8EAB\u4EFD\u8BC1\u660E\u6750\u6599", "\u6309\u94F6\u884C\u548C\u4EA4\u6613\u6D41\u7A0B\u8981\u6C42\u51C6\u5907\u3002"], ["marriageDocs", "\u6574\u7406\u5A5A\u59FB\u72B6\u51B5\u6750\u6599", "\u6309\u5B9E\u9645\u5A5A\u59FB\u72B6\u51B5\u51C6\u5907\u76F8\u5173\u8BC1\u660E\u3002"], ["incomeDocs", "\u6574\u7406\u94F6\u884C\u6D41\u6C34\u4E0E\u6536\u5165\u6750\u6599", "\u6309\u94F6\u884C\u8981\u6C42\u51C6\u5907\u6D41\u6C34\u3001\u6536\u5165\u6216\u8D44\u4EA7\u8BC1\u660E\u3002"]]],
      ["\u8FC7\u6237\u4E0E\u4EA4\u697C", [["taxPayment", "\u786E\u8BA4\u5E94\u7F34\u7A0E\u8D39", "\u4EE5\u4EA4\u6613\u4E2D\u5FC3\u5B9E\u9645\u6838\u5B9A\u91D1\u989D\u548C\u901A\u77E5\u4E3A\u51C6\u3002"], ["transfer", "\u786E\u8BA4\u8FC7\u6237\u5B89\u6392", "\u6838\u5BF9\u9884\u7EA6\u65F6\u95F4\u3001\u5230\u573A\u4EBA\u5458\u548C\u6240\u9700\u6750\u6599\u3002"], ["certificate", "\u786E\u8BA4\u9886\u8BC1\u5B89\u6392", "\u786E\u8BA4\u4E0D\u52A8\u4EA7\u6743\u8BC1\u9886\u53D6\u65B9\u5F0F\u4E0E\u65F6\u95F4\u3002"], ["inspection", "\u9A8C\u623F", "\u68C0\u67E5\u623F\u5C4B\u73B0\u72B6\u3001\u8BBE\u65BD\u8BBE\u5907\u4E0E\u7EA6\u5B9A\u4EA4\u4ED8\u7269\u3002"], ["propertyHandover", "\u529E\u7406\u7269\u4E1A\u4EA4\u5272", "\u6838\u5BF9\u7269\u4E1A\u8D39\u3001\u505C\u8F66\u8D39\u3001\u95E8\u7981\u4E0E\u94A5\u5319\u6E05\u5355\u3002"], ["utilityHandover", "\u529E\u7406\u6C34\u7535\u71C3\u6C14\u4EA4\u5272", "\u62CD\u7167\u8BB0\u5F55\u8868\u8BA1\u6570\u503C\u5E76\u5B8C\u6210\u8D26\u6237\u4EA4\u63A5\u3002"], ["schoolPlan", "\u6309\u62DB\u751F\u65F6\u95F4\u8282\u70B9\u51C6\u5907\u5165\u5B66\u6750\u6599", "\u6700\u7EC8\u8D44\u683C\u548C\u6750\u6599\u8981\u6C42\u4EE5\u5F53\u5E74\u6559\u80B2\u90E8\u95E8\u901A\u77E5\u4E3A\u51C6\u3002", "../school/index.html", "\u67E5\u770B\u5B66\u533A\u56FE"], ["contractArchive", "\u4FDD\u5B58\u4E70\u5356\u5408\u540C\u4E0E\u8865\u5145\u534F\u8BAE", "\u5EFA\u8BAE\u540C\u65F6\u4FDD\u7559\u7535\u5B50\u5907\u4EFD\u3002"], ["receiptArchive", "\u4FDD\u5B58\u7A0E\u8D39\u53CA\u4ED8\u6B3E\u7968\u636E", "\u4FDD\u7559\u8D44\u91D1\u76D1\u7BA1\u3001\u7A0E\u8D39\u3001\u4F63\u91D1\u7B49\u51ED\u8BC1\u3002"], ["loanArchive", "\u4FDD\u5B58\u8D37\u6B3E\u4E0E\u4EA4\u5272\u8D44\u6599", "\u4FDD\u7559\u8D37\u6B3E\u5408\u540C\u3001\u8FD8\u6B3E\u8BA1\u5212\u3001\u4EA4\u5272\u5355\u7B49\u3002"]]]
    ];
    const $ = (id) => document.getElementById(id);
    const esc = (value) => String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
    let state = {};
    function toast(message) {
      $("toast").textContent = message;
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => {
        $("toast").textContent = "";
      }, 2200);
    }
    function save() {
      window.NativeStore.saveChecklistState(state).catch((error) => {
        console.error("\u4FDD\u5B58\u8D2D\u623F\u6E05\u5355\u5931\u8D25", error);
        toast("\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
      });
    }
    function renderProgress() {
      const tasks = stages.flatMap(([, items]) => items);
      const done = tasks.filter(([id]) => state[id]?.done).length;
      $("progressText").textContent = `${done} / ${tasks.length} \u5DF2\u5B8C\u6210`;
      $("progressBar").style.width = `${tasks.length ? done / tasks.length * 100 : 0}%`;
    }
    function render() {
      $("stages").innerHTML = stages.map(([title, items]) => {
        const done = items.filter(([id]) => state[id]?.done).length;
        return `<section class="card stage"><h2>${title}<span>${done} / ${items.length} \u5DF2\u5B8C\u6210</span></h2>${items.map(([id, name, desc, href, link]) => `<article class="task ${state[id]?.done ? "done" : ""}"><div class="task-main"><input id="check-${id}" type="checkbox" data-check="${id}" ${state[id]?.done ? "checked" : ""}><label for="check-${id}">${name}<p>${desc}</p></label></div><div class="task-actions">${href ? `<a class="button" href="${href}">${link} \u2192</a>` : ""}<button data-note="${id}" type="button">${state[id]?.note ? "\u7F16\u8F91\u5907\u6CE8" : "\u6DFB\u52A0\u5907\u6CE8"}</button></div><textarea class="note" data-note-box="${id}" placeholder="\u5199\u4E0B\u4E2A\u4EBA\u5907\u6CE8\u2026" ${state[id]?.open ? "" : "hidden"}>${esc(state[id]?.note)}</textarea></article>`).join("")}</section>`;
      }).join("");
      document.querySelectorAll("[data-check]").forEach((node) => {
        node.onchange = () => {
          const id = node.dataset.check;
          state[id] = { ...state[id] || {}, done: node.checked };
          save();
          render();
          renderProgress();
        };
      });
      document.querySelectorAll("[data-note]").forEach((node) => {
        node.onclick = () => {
          const id = node.dataset.note;
          state[id] = { ...state[id] || {}, open: !state[id]?.open };
          save();
          render();
        };
      });
      document.querySelectorAll("[data-note-box]").forEach((node) => {
        node.oninput = () => {
          const id = node.dataset.noteBox;
          state[id] = { ...state[id] || {}, note: node.value, open: true };
          save();
          renderProgress();
        };
      });
      renderProgress();
    }
    async function init() {
      try {
        await window.NativeStore.ready();
        state = await window.NativeStore.getChecklistState();
        render();
      } catch (error) {
        console.error("\u521D\u59CB\u5316\u8D2D\u623F\u6E05\u5355\u5931\u8D25", error);
        toast("\u672C\u5730\u6570\u636E\u5E93\u521D\u59CB\u5316\u5931\u8D25\u3002");
      }
    }
    $("reset").onclick = () => {
      if (!confirm("\u91CD\u7F6E\u6240\u6709\u52FE\u9009\u548C\u5907\u6CE8\uFF1F")) return;
      state = {};
      save();
      render();
      toast("\u6E05\u5355\u5DF2\u91CD\u7F6E\u3002");
    };
    init();
  })();
})();
