(() => {
  const root = document.createElement("div");
  root.id = "native-layer";
  root.className = "native-layer";
  document.getElementById("screen").append(root);
  let annotationIndex = null;
  let modalReturnFocus = null;
  let selectedCourse = 0;
  let zoom = 1;
  let pan = { x: 0, y: 0 };
  let focusMain = null;
  let selectedCourseStudent = "";
  const states = new Map();
  const feedbackDrafts = new Map();
  const courses = [
    {
      title: "小数乘法的算理", board: "0.3 + 0.3 + 0.3 + 0.3", equation: "0.3 × 4 = 1.2",
      duration: 720, initial: 204, cues: [[200, 230]],
      intro: "把小数乘法看作相同小数的连加，理解计算背后的道理。",
      core: ["乘法意义：多个相同小数相加", "计算示例：0.3 × 4 = 1.2", "算理理解：将乘法转化为加法"],
      gain: "理解小数乘法与加法的关系，为后续计算打好基础。",
    },
    {
      title: "小数乘整数", board: "0.6 + 0.6 + 0.6", equation: "0.6 × 3 = 1.8",
      duration: 600, initial: 0, cues: [[90, 120]],
      intro: "先按整数乘法计算，再确定积的小数位数。",
      core: ["计算方法：先按整数乘法计算", "计算示例：0.6 × 3 = 1.8", "小数定位：积保留一位小数"],
      gain: "掌握小数乘整数的方法，计算后检查小数点位置。",
    },
    {
      title: "小数乘法的应用", board: "每支彩笔2.5元，3支共多少钱？", equation: "2.5 × 3 = 7.5（元）",
      duration: 480, initial: 0, cues: [[60, 90]],
      intro: "读懂单价与数量，用小数乘法解决生活中的问题。",
      core: ["数量关系：总价＝单价×数量", "列式计算：2.5 × 3 = 7.5", "检查答案：结果合理，单位完整"],
      gain: "先找数量关系，再列式计算，最后检查结果和单位。",
    },
  ];
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function button(text, action, className) {
    const b = node("button", text, className);
    b.type = "button";
    b.onclick = action;
    return b;
  }
  function icon(kind) {
    const paths = {
      volume: "M11 5 6 9H3v6h3l5 4V5m4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
      muted: "M11 5 6 9H3v6h3l5 4V5m5 4 5 6m0-6-5 6",
      fullscreen: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
      feedback: "M21 11a9 8 0 0 1-9 8 13 13 0 0 1-4-.6L3 21l1.4-5A7.5 7.5 0 0 1 3 11a9 8 0 0 1 18 0M8 11h.1m3.9 0h.1m3.9 0h.1",
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", paths[kind]);
    shape.setAttribute("fill", "none");
    shape.setAttribute("stroke", "currentColor");
    shape.setAttribute("stroke-width", "1.8");
    shape.setAttribute("stroke-linecap", "round");
    shape.setAttribute("stroke-linejoin", "round");
    svg.append(shape);
    return svg;
  }
  function go(id) { window.review.go(id); }
  function studentKey() {
    return typeof selectedStudent === "string" ? selectedStudent : "林小禾";
  }
  function state() {
    const key = `${studentKey()}:${selectedCourse}`;
    if (!states.has(key)) states.set(key, { time: courses[selectedCourse].initial, speed: "1.0", paused: false, muted: false });
    return states.get(key);
  }
  function basePage(title, back, className = "") {
    const page = node("section", undefined, `native-page ${className}`);
    const status = node("div", undefined, "native-status");
    status.append(node("span", "9:41"), node("small", "▮▮▮  5G  ▰"));
    const nav = node("nav", undefined, "native-nav");
    nav.setAttribute("aria-label", title);
    const backButton = button("‹", () => go(back), "native-back");
    backButton.setAttribute("aria-label", "返回");
    nav.append(backButton, node("h2", title));
    page.append(status, nav, node("div", undefined, "native-home-indicator"));
    root.append(page);
    return page;
  }
  const fmt = seconds => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  function renderVideo() {
    if (selectedCourseStudent !== studentKey()) {
      selectedCourseStudent = studentKey();
      selectedCourse = 0;
    }
    const page = basePage("视频学习", "08");
    if (selectedCourse === 0) page.classList.add("raster-video");
    const tabs = node("div", undefined, "course-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "选择课程");
    courses.forEach((course, index) => {
      const tab = button("", () => {
        selectedCourse = index;
        root.replaceChildren();
        renderVideo();
        root.querySelectorAll(".course-tab")[index].focus();
      }, "course-tab");
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-label", course.title);
      tab.id = `course-tab-${index}`;
      tab.setAttribute("aria-selected", String(index === selectedCourse));
      tab.setAttribute("aria-controls", "course-panel");
      tab.tabIndex = index === selectedCourse ? 0 : -1;
      tab.append(node("span", `${String(index + 1).padStart(2, "0")} ${course.title}`));
      tab.append(node("small", index === selectedCourse ? "▶ 播放中" : "点击切换"));
      tab.onkeydown = event => {
        const offsets = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: 2 - index };
        if (event.key in offsets) {
          event.preventDefault();
          tabs.children[(index + offsets[event.key] + 3) % 3].click();
        }
      };
      tabs.append(tab);
    });
    page.append(tabs);
    const course = courses[selectedCourse];
    const saved = state();
    const player = node("section", undefined, "demo-player");
    player.id = "course-panel";
    player.setAttribute("role", "tabpanel");
    player.setAttribute("aria-labelledby", `course-tab-${selectedCourse}`);
    player.append(node("h3", course.title, "lesson-title"), node("p", course.board, "lesson-board-copy"), node("div", course.equation, "lesson-equation"));
    const teacher = node("div", undefined, "ai-teacher");
    teacher.setAttribute("role", "img");
    teacher.setAttribute("aria-label", "AI老师在关键知识点讲解的人物示意");
    teacher.append(node("span", "AI老师 · 讲解中"));
    teacher.hidden = !course.cues.some(([start, end]) => saved.time >= start && saved.time <= end);
    const controls = node("div", undefined, "player-controls");
    const pause = button(saved.paused ? "▶" : "Ⅱ", () => {
      saved.paused = !saved.paused;
      pause.textContent = saved.paused ? "▶" : "Ⅱ";
      pause.setAttribute("aria-label", saved.paused ? "播放示意" : "暂停示意");
    });
    pause.setAttribute("aria-label", saved.paused ? "播放示意" : "暂停示意");
    const clock = node("time", `${fmt(saved.time)} / ${fmt(course.duration)}`);
    const progress = node("input", undefined, "player-progress");
    progress.type = "range";
    progress.min = 0;
    progress.max = course.duration;
    progress.value = saved.time;
    progress.setAttribute("aria-label", "播放进度");
    progress.oninput = () => {
      saved.time = Number(progress.value);
      clock.textContent = `${fmt(saved.time)} / ${fmt(course.duration)}`;
      teacher.hidden = !course.cues.some(([start, end]) => saved.time >= start && saved.time <= end);
    };
    const speed = node("select", undefined, "player-speed");
    speed.setAttribute("aria-label", "播放倍速");
    for (const value of ["0.75", "1.0", "1.25", "1.5", "2.0"]) {
      const option = node("option", `${value}×`);
      option.value = value;
      speed.append(option);
    }
    speed.value = saved.speed;
    speed.onchange = () => { saved.speed = speed.value; };
    const sound = button("", () => {
      saved.muted = !saved.muted;
      sound.replaceChildren(icon(saved.muted ? "muted" : "volume"));
      sound.setAttribute("aria-label", saved.muted ? "取消静音示意" : "静音示意");
    });
    sound.append(icon(saved.muted ? "muted" : "volume"));
    sound.setAttribute("aria-label", saved.muted ? "取消静音示意" : "静音示意");
    const expand = button("", () => {
      const expanded = player.classList.toggle("expanded");
      expand.setAttribute("aria-label", expanded ? "退出全屏示意" : "全屏示意");
    });
    expand.append(icon("fullscreen"));
    expand.setAttribute("aria-label", "全屏示意");
    controls.append(pause, clock, progress, speed, sound, expand);
    player.append(teacher, controls);
    page.append(player);
    const summary = node("section", undefined, "video-summary");
    const heading = node("div", undefined, "summary-heading");
    heading.append(node("h3", "✦ 智能内容总结"), node("span", "AI生成", "ai-badge"));
    const core = node("div", undefined, "summary-core");
    core.append(node("h4", "核心内容"));
    const rows = node("div", undefined, "summary-list");
    course.core.forEach((text, index) => {
      const row = node("div", undefined, "summary-row");
      row.append(node("span", `0${index + 1}`, "summary-number"), node("span", text));
      rows.append(row);
    });
    core.append(rows);
    const gain = node("div", undefined, "summary-gain");
    gain.append(node("h4", "学习收获"), node("p", course.gain));
    summary.append(heading, node("p", course.intro, "summary-intro"), core, gain, button("去练习  ›", () => go("15"), "summary-practice"));
    page.append(summary);
  }
  const artPosition = index => `${(index % 2) * 100}% ${Math.floor(index / 2) * 100 / 3}%`;
  function annotationArt(index) {
    const art = node("div", undefined, `annotation-art${index === 5 ? " single" : ""}`);
    art.style.backgroundPosition = artPosition(index);
    art.setAttribute("role", "img");
    art.setAttribute("aria-label", `第${index + 1}张批注示例原图`);
    return art;
  }
  function lockBackground() {
    focusMain = document.querySelector("#native-layer > .feedback-base");
    for (const id of ["hotspots", "learning-fields"]) document.getElementById(id).inert = true;
    if (focusMain) focusMain.inert = true;
  }
  function unlockBackground() {
    for (const id of ["hotspots", "learning-fields"]) document.getElementById(id).inert = false;
    if (focusMain) focusMain.inert = false;
  }
  function closeAnnotations() {
    root.querySelectorAll(".annotation-shade,.annotation-sheet,.annotation-full").forEach(el => el.remove());
    annotationIndex = null;
    unlockBackground();
    if (window.review.current() === "24A") {
      go("24");
      root.querySelector(".annotation-trigger")?.focus();
    } else modalReturnFocus?.focus();
  }
  function openAnnotations() {
    modalReturnFocus = document.activeElement;
    lockBackground();
    root.querySelectorAll(".annotation-shade,.annotation-sheet,.annotation-full").forEach(el => el.remove());
    annotationIndex = null;
    const shade = node("div", undefined, "annotation-shade");
    shade.onclick = closeAnnotations;
    const sheet = node("section", undefined, "annotation-sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "annotation-sheet-title");
    sheet.tabIndex = -1;
    sheet.append(node("div", undefined, "drawer-handle"));
    const heading = node("div", undefined, "drawer-heading");
    const title = node("h3", "练习批改详情");
    title.id = "annotation-sheet-title";
    const close = button("×", closeAnnotations, "drawer-close");
    close.setAttribute("aria-label", "关闭批注详情");
    heading.append(title, close);
    sheet.append(heading, node("p", "共8张 · 点击缩略图查看原图 · 批注示例", "drawer-meta"));
    const grid = node("div", undefined, "annotation-grid");
    for (let index = 0; index < 8; index++) {
      const thumbnail = button("", () => openAnnotationImage(index), "annotation-thumb");
      thumbnail.setAttribute("aria-label", `查看第${index + 1}张批注`);
      thumbnail.append(annotationArt(index), node("span", index + 1, "annotation-number"));
      grid.append(thumbnail);
    }
    sheet.append(grid);
    root.append(shade, sheet);
    close.focus({ preventScroll: true });
  }
  function openAnnotationImage(index) {
    const returnIndex = annotationIndex;
    annotationIndex = index;
    zoom = 1;
    pan = { x: 0, y: 0 };
    root.querySelector(".annotation-full")?.remove();
    const sheet = root.querySelector(".annotation-sheet");
    sheet.inert = true;
    const full = node("section", undefined, "annotation-full");
    full.setAttribute("role", "dialog");
    full.setAttribute("aria-modal", "true");
    full.setAttribute("aria-label", `批注原图 ${index + 1} / 8`);
    const head = node("div", undefined, "annotation-full-head");
    const back = button("‹ 返回缩略图", () => {
      full.remove();
      sheet.inert = false;
      sheet.querySelectorAll(".annotation-thumb")[index].focus({ preventScroll: true });
      annotationIndex = null;
    });
    head.append(back, node("span", `${index + 1} / 8`));
    const viewport = node("div", undefined, "annotation-viewport");
    const surface = node("div", undefined, "annotation-zoom-surface");
    surface.append(annotationArt(index));
    viewport.append(surface);
    const transform = () => {
      surface.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
      smaller.disabled = zoom <= 1;
      larger.disabled = zoom >= 3;
    };
    const tools = node("div", undefined, "annotation-zoom-tools");
    const smaller = button("− 缩小", () => { zoom = Math.max(1, zoom - .5); if (zoom === 1) pan = { x: 0, y: 0 }; transform(); });
    const reset = button("还原", () => { zoom = 1; pan = { x: 0, y: 0 }; transform(); });
    const larger = button("＋ 放大", () => { zoom = Math.min(3, zoom + .5); transform(); });
    smaller.disabled = true;
    tools.append(smaller, reset, larger);
    const pointers = new Map();
    let drag = null;
    let pinch = null;
    const distance = () => {
      const points = [...pointers.values()];
      return points.length >= 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
    };
    viewport.onpointerdown = event => {
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      drag = { x: event.clientX - pan.x, y: event.clientY - pan.y };
      if (pointers.size === 2) pinch = { distance: distance(), zoom };
    };
    viewport.onpointermove = event => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2 && pinch) zoom = Math.min(3, Math.max(1, pinch.zoom * distance() / pinch.distance));
      else if (zoom > 1 && drag) pan = { x: event.clientX - drag.x, y: event.clientY - drag.y };
      transform();
    };
    const releasePointer = event => { pointers.delete(event.pointerId); drag = null; pinch = null; };
    viewport.onpointerup = releasePointer;
    viewport.onpointercancel = releasePointer;
    const paging = node("div", undefined, "annotation-paging");
    const previous = button("‹ 上一张", () => openAnnotationImage(index - 1));
    previous.disabled = index === 0;
    const next = button("下一张 ›", () => openAnnotationImage(index + 1));
    next.disabled = index === 7;
    paging.append(previous, node("span", `第${index + 1}张批注示例`), next);
    full.append(head, viewport, tools, paging, node("p", "批注示例 · 支持放大、拖动与双指缩放", "annotation-full-note"));
    root.append(full);
    if (returnIndex !== null) (index > returnIndex ? next : previous).focus({ preventScroll: true });
    else back.focus({ preventScroll: true });
    if (document.activeElement.disabled) back.focus({ preventScroll: true });
  }
  function renderFeedback() {
    if (window.review.current() === "24A") {
      document.getElementById("screen-image").src = "assets/feedback-reference.png";
    }
    const base = node("div", undefined, "feedback-base");
    base.append(node("div", "先算12×5＝60，再除以10，得到6千米。", "feedback-solution"));
    const open = button("", openAnnotations, "annotation-trigger");
    open.setAttribute("aria-label", "查看批注详情");
    base.append(open);
    root.append(base);
    if (window.review.current() === "24A") openAnnotations();
  }
  function renderMy() {
    const entry = button("", () => go("37"), "feedback-entry");
    entry.setAttribute("aria-label", "反馈中心");
    const text = node("span");
    text.append(node("strong", "反馈中心"), node("small", "表扬、投诉与建议，我们认真听"));
    const mark = node("span", undefined, "feedback-entry-icon");
    mark.append(icon("feedback"));
    entry.append(mark, text, node("span", "›", "feedback-entry-arrow"));
    root.append(entry);
  }
  function renderLogout() {
    const shade = node("div", undefined, "logout-shade");
    const dialog = node("section", undefined, "logout-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "logout-heading");
    const heading = node("h3", "退出当前账号？");
    heading.id = "logout-heading";
    const actions = node("div", undefined, "logout-actions");
    actions.append(
      button("取消", () => go("27"), "logout-cancel"),
      button("确认退出", () => go("01"), "logout-confirm"),
    );
    dialog.append(heading, node("p", "学习记录会保留，下次登录后可继续查看。"), actions);
    root.append(shade, dialog);
  }
  function renderFeedbackCenter() {
    const back = button("", () => go("27"), "center-back");
    back.setAttribute("aria-label", "返回我的");
    root.append(back);
    const form = node("form", undefined, "center-form");
    form.setAttribute("aria-label", "反馈表单");
    const saved = feedbackDrafts.get(studentKey()) || { type: "", description: "", human: "" };
    function radioGroup(title, name, values, selected, className = "") {
      const fieldset = node("fieldset", undefined, className);
      fieldset.setAttribute("aria-label", title);
      for (const [value, label] of values) {
        const choice = node("label");
        const input = node("input");
        input.type = "radio";
        input.name = name;
        input.value = value;
        input.checked = value === selected;
        input.required = true;
        input.setAttribute("aria-label", value === "no" ? "否" : value === "yes" ? "是" : label);
        choice.append(input, node("span", label));
        fieldset.append(choice);
      }
      return fieldset;
    }
    form.append(radioGroup("反馈类型", "type", [["praise", "表扬"], ["complaint", "投诉"], ["suggestion", "建议"]], saved.type, "center-types"));
    const description = node("textarea", undefined, "center-description");
    description.id = "feedback-description";
    description.name = "description";
    description.setAttribute("aria-label", "问题描述");
    description.placeholder = "请描述你遇到的问题或建议";
    description.required = true;
    description.maxLength = 500;
    description.value = saved.description;
    const counter = node("span", `${description.value.length} / 500`, "center-counter");
    form.append(description, counter, radioGroup("是否需要人工联系", "human", [["yes", "是，需要联系"], ["no", "暂时不需要"]], saved.human, "center-human"));
    const result = node("p", "", "center-result");
    result.setAttribute("role", "status");
    const submit = node("button", "", "center-submit");
    submit.type = "submit";
    submit.setAttribute("aria-label", "提交反馈");
    form.append(result, submit);
    function saveDraft() {
      const fields = new FormData(form);
      feedbackDrafts.set(studentKey(), {
        type: String(fields.get("type") || ""),
        description: description.value,
        human: String(fields.get("human") || ""),
      });
    }
    description.oninput = () => {
      description.setCustomValidity("");
      counter.textContent = `${description.value.length} / 500`;
      saveDraft();
    };
    form.onchange = saveDraft;
    form.onsubmit = event => {
      event.preventDefault();
      if (!description.value.trim()) {
        description.setCustomValidity("请填写问题或建议");
        description.reportValidity();
        return;
      }
      saveDraft();
      result.textContent = "表单预览完成，反馈尚未发送。";
    };
    const contact = button("", () => { result.textContent = "请通过已有服务渠道联系专员，联系方式待接入。"; }, "center-contact");
    contact.setAttribute("aria-label", "联系专员");
    root.append(contact, form);
  }
  window.renderEnhancements = () => {
    unlockBackground();
    annotationIndex = null;
    root.replaceChildren();
    const current = window.review.current();
    root.style.pointerEvents = ["10", "24", "24A", "27", "29", "37"].includes(current) ? "auto" : "none";
    if (current === "10") renderVideo();
    if (current === "24" || current === "24A") renderFeedback();
    if (current === "27") renderMy();
    if (current === "29") renderLogout();
    if (current === "37") renderFeedbackCenter();
  };
  document.addEventListener("keydown", event => {
    const dialog = root.querySelector(".annotation-full") || root.querySelector(".annotation-sheet");
    if (!dialog) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (annotationIndex !== null) dialog.querySelector("button").click();
      else closeAnnotations();
    }
    if (event.key === "Tab") {
      const controls = [...dialog.querySelectorAll("button,input,select,[tabindex]")].filter(el => !el.disabled && el.tabIndex >= 0);
      if (!controls.length) return;
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus({ preventScroll: true }); }
      if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus({ preventScroll: true }); }
    }
    if (annotationIndex !== null && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      const next = annotationIndex + (event.key === "ArrowRight" ? 1 : -1);
      if (next >= 0 && next < 8) { event.preventDefault(); openAnnotationImage(next); }
    }
  });
  window.reviewEnhancements = { openAnnotations, openAnnotationImage, closeAnnotations };
  window.renderEnhancements();
})();
