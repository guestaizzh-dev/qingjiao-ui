(() => {
  const screen = document.getElementById("screen");
  const layer = document.createElement("div");
  layer.className = "review-interactive";
  screen.append(layer);
  const art = document.getElementById("screen-image");
  let entry = "00";
  let activityReturn;
  let form;
  let consent;
  let codeSent = false;
  let toastTimer;
  let atlasState;
  let dismissPreview;
  const id = () => window.review.current();
  const go = target => {
    const source = id();
    if (/^09-0[1-8]$/.test(source) && /^(06|07)-/.test(target)) activityReturn = source;
    if (!/^(06|07)-/.test(target)) activityReturn = undefined;
    if (target !== source) entry = source;
    window.review.go(target);
  };
  const returnTo = () => window.review.go(entry === id() ? "00" : entry);

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, fn) {
    const control = element("button", label);
    control.type = "button";
    control.onclick = fn;
    return control;
  }

  function notify(message) {
    document.querySelector(".review-toast")?.remove();
    clearTimeout(toastTimer);
    const notice = element("div", message);
    notice.className = "review-toast";
    notice.setAttribute("role", "status");
    document.body.append(notice);
    toastTimer = setTimeout(() => notice.remove(), 3500);
  }

  function dialog(title) {
    document.querySelector(".review-dialog")?.close();
    const box = element("dialog");
    box.className = "review-dialog";
    box.setAttribute("aria-label", title);
    const close = button("关闭", () => box.close());
    close.className = "review-close";
    box.append(close, element("h2", title));
    box.onclose = () => box.remove();
    document.body.append(box);
    box.showModal();
    return box;
  }

  function choices(title, options, selected, onSubmit) {
    const box = dialog(title);
    for (const [label, items] of options) {
      const field = element("label", label);
      const select = element("select");
      for (const item of items) select.add(new Option(item, item));
      select.value = selected[label] || items[0];
      select.onchange = () => selected[label] = select.value;
      const row = element("div");
      row.className = "review-actions";
      row.append(field, select);
      field.htmlFor = select.id = "review-select-" + label;
      box.append(row);
    }
    const actions = element("div");
    actions.className = "review-actions";
    actions.append(button("确认", () => {
      box.close();
      onSubmit();
    }));
    box.append(actions);
  }

  function crop(file, [left, top, width, height]) {
    const frame = element("div");
    frame.style.aspectRatio = (852 * width) / (1846 * height);
    frame.style.position = "relative";
    frame.style.overflow = "hidden";
    const image = element("img");
    image.alt = "";
    image.src = file;
    Object.assign(image.style, {
      position: "absolute",
      width: (10000 / width) + "%",
      maxWidth: "none",
      left: (-left / width * 100) + "%",
      top: (-top / height * 100) + "%",
    });
    frame.append(image);
    return frame;
  }

  function gallery(type, start, magnified = false) {
    const annotation = type === "annotation";
    const count = annotation ? 8 : 2;
    const box = dialog(annotation ? "批改原图 · 示例" : "作业图片 · 示例");
    const view = element("div");
    view.className = "viewer";
    const status = element("span");
    status.setAttribute("aria-live", "polite");
    let index = start;
    let scale = magnified ? 1.6 : 1;
    function paint() {
      let media;
      if (annotation && [0, 7].includes(index)) {
        media = crop(index === 0 ? "screens/07-15.png" : "screens/07-17.png", [5, 15, 90, 64]);
      } else if (annotation) {
        media = element("div");
        media.className = "annotation-art" + (index === 5 ? " single" : "");
        media.style.backgroundPosition = (index % 2 * 100) + "% " + (Math.floor(index / 2) * 100 / 3) + "%";
      } else {
        media = crop("screens/06-17.png", [index === 0 ? 5 : 52, 38, 42, 26.5]);
      }
      media.style.width = (scale * 100) + "%";
      media.setAttribute("role", "img");
      media.setAttribute("aria-label", "第" + (index + 1) + "张图片");
      view.replaceChildren(media);
      status.textContent = (index + 1) + " / " + count + " · " + Math.round(scale * 100) + "%";
      prev.disabled = index === 0;
      next.disabled = index === count - 1;
      minus.disabled = scale <= 1;
      plus.disabled = scale >= 3;
    }

    function step(amount) {
      index = Math.min(count - 1, Math.max(0, index + amount));
      scale = 1;
      view.scrollTo(0, 0);
      paint();
    }

    const prev = button("上一张", () => step(-1));
    const next = button("下一张", () => step(1));
    const minus = button("缩小", () => { scale = Math.max(1, scale - .3); paint(); });
    const plus = button("放大", () => { scale = Math.min(3, scale + .3); paint(); });
    const reset = button("还原", () => { scale = 1; view.scrollTo(0, 0); paint(); });
    const actions = element("div");
    actions.className = "review-actions";
    actions.append(prev, next, minus, plus, reset, status);
    box.append(view, actions);
    box.onkeydown = event => {
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    paint();
  }

  function input(name, hint, x, y, width, maxLength) {
    const field = element("input");
    field.className = "auth-field";
    field.placeholder = hint;
    field.setAttribute("aria-label", name);
    field.autocomplete = "off";
    if (maxLength) {
      field.inputMode = "numeric";
      field.maxLength = maxLength;
    }
    Object.assign(field.style, { left: x + "%", top: y + "%", width: width + "%", height: "3.6%" });
    layer.append(field);
    return field;
  }

  function chooseHomeworkImages() {
    const picker = element("input");
    picker.type = "file";
    picker.accept = "image/*";
    picker.multiple = true;
    picker.hidden = true;
    picker.onchange = () => {
      if (picker.files.length) go("06-06");
      picker.remove();
    };
    picker.oncancel = () => picker.remove();
    layer.append(picker);
    picker.click();
  }

  function renderForm(register) {
    const offset = (register ? 39 : -37) / 1846 * 100;
    form = {
      phone: input("手机号", "请输入手机号", 24.5, (register ? 38.0 : 42.15) + offset, 60, 11),
      code: input("短信验证码", "请输入短信验证码", 11.7, (register ? 55.2 : 50.8) + offset, 50, 6),
      name: register ? input("学生姓名", "请输入学生姓名", 11.7, 46.7 + offset, 75) : null,
    };
    consent = element("input");
    consent.type = "checkbox";
    consent.setAttribute("aria-label", "已阅读并同意协议");
    Object.assign(consent.style, { left: "7.9%", top: ((register ? 61.7 : 57.5) + offset) + "%" });
    layer.append(consent);
    form.code.onkeydown = event => {
      if (event.key === "Enter") window.currentReviewAction("auth");
    };
  }

  function atlas(mode, unit = 0, standalone = false) {
    const frame = element("iframe");
    frame.title = "知识地图交互预览";
    frame.className = "atlas-frame";
    const saved = standalone ? {} : (atlasState || {});
    frame.src = "atlas/index.html#" + [mode, saved.unit ?? unit, standalone ? "dialog" : "", saved.index ?? 0, saved.returnMode ?? "01"].join(",");
    return frame;
  }

  function openAtlas(mode = "01", unit = 0) {
    const box = dialog("知识地图");
    box.append(atlas(mode, unit, true));
  }

  function feedback() {
    const box = dialog("提交反馈 · 演示");
    const form = element("form");
    const category = element("select");
    for (const name of ["建议", "问题", "表扬"]) category.add(new Option(name));
    const description = element("textarea");
    description.maxLength = 500;
    description.required = true;
    const contact = element("select");
    for (const name of ["暂时不需要", "是，需要联系"]) contact.add(new Option(name));
    for (const [label, control] of [["反馈类型", category], ["描述（500 字以内）", description], ["是否需要人工联系", contact]]) {
      const field = element("label", label);
      field.append(control);
      form.append(field);
    }
    const submit = element("button", "提交反馈");
    submit.type = "submit";
    form.append(submit);
    form.onsubmit = event => {
      event.preventDefault();
      if (!description.value.trim()) return description.focus();
      box.close();
      notify("演示反馈已提交");
    };
    box.append(form);
  }

  const wrong = [
    ["3", "1.2 × 5", "6"], ["4", "0.8 × 4", "3.2"], ["5", "2.5 × 3", "7.5"],
    ["6", "2.5 × 4", "10"], ["7", "0.12 × 3", "0.36"], ["8", "1.6 × 5", "8"], ["9", "0.9 × 7", "6.3"]
  ];
  const textbookSelection = {};
  const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const publishedDays = ["03-02", null, "03-01", null, "03-03", null, null];
  const defaultDays = { "03-02": 0, "03-03": 4, "03-04": 3 };
  const calendarSelection = () => (id() === "03-04" && history.state?.calendar) || {
    week: 0,
    day: defaultDays[id()] ?? 2,
  };
  const calendarDate = (week, day) => new Date(Date.UTC(2026, 10, 2 + week * 7 + day));
  const fullDate = date => `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
  const fromTrialHome = () => /^01-1[1-5]$/.test(entry);
  let speed = 1;
  let muted = false;
  let playing = false;
  const handlers = {
    back: returnTo,
    returnToDraft: () => go(/^06-(05|07|16|25)$/.test(entry) ? entry : "06-05"),
    returnToUpload: () => go(/^06-(11|13|14|22)$/.test(entry) ? entry : "06-11"),
    returnProfile: () => go(/^09-(09|10|11|12)$/.test(entry) ? entry : "09-09"),
    backFromFeedback: () => go(activityReturn || "04-05"),
    backFromHomework: () => go(activityReturn || "04-06"),
    atlas: () => openAtlas("05"),
    atlasRoute: () => openAtlas(),
    unit1: () => openAtlas("04", 1),
    unit2: () => openAtlas("04", 2),
    sms: () => {
      if (!/^1\d{10}$/.test(form?.phone.value || "")) {
        notify("请输入 11 位演示手机号");
        form?.phone.focus();
        return;
      }
      codeSent = true;
      form.code.focus();
      notify("演示验证码 682417");
    },
    consent: () => consent.click(),
    auth: () => {
      if (!consent?.checked) return notify("请先阅读并勾选协议");
      if (form.name && !form.name.value.trim()) return notify("请填写学生姓名");
      if (!codeSent) return handlers.sms();
      if (form.code.value !== "682417") return notify("验证码有误，请输入演示码 682417");
      codeSent = false;
      go(id() === "02-02" ? "02-03" : "02-04");
    },
    userPolicy: () => dialog("用户协议").append(element("p", "此处为协议阅读入口，正式正文由应用提供。")),
    privacy: () => dialog("隐私政策").append(element("p", "此处为协议阅读入口，正式正文由应用提供。")),
    childPrivacy: () => dialog("儿童隐私政策").append(element("p", "此处为协议阅读入口，正式正文由应用提供。")),
    textbook: () => choices("选择教材", [
      ["学段", ["小学", "初中"]], ["年级", ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]],
      ["版本", ["人教版", "北师大版", "苏教版"]], ["册别", ["上册", "下册"]]
    ], textbookSelection, () => go(Object.values(textbookSelection).every(value => ["小学", "一年级", "人教版", "上册"].includes(value)) ? "01-12" : "01-14")),
    addHomeworkImages: chooseHomeworkImages,
    pendingLearningHome: () => go(fromTrialHome() ? entry : entry === "09-12" ? "01-11" : "00"),
    pendingLearningProfile: () => go(fromTrialHome() || entry === "09-12" ? "09-12" : "09-09"),
    previousWeek: () => changeWeek(-1),
    nextWeek: () => changeWeek(1),
    video: () => { playing = !playing; notify(playing ? "已播放 · 演示" : "已暂停"); },
    speed: () => {
      const selection = { 倍速: String(speed) };
      choices("播放速度", [["倍速", ["0.75", "1", "1.25", "1.5", "2"]]], selection, () => {
        speed = Number(selection.倍速);
        notify("播放速度 " + speed + "×");
      });
    },
    volume: () => { muted = !muted; notify(muted ? "已静音" : "已恢复声音"); },
    fullscreen: () => {
      const box = dialog("课堂画面");
      box.append(crop(art.getAttribute("src"), [3.5, 14.2, 93, 20.4]));
    },
    slides: () => {
      const slide = { "05-04": [3, ["沿高割补，面积不变", "长方形的长对应该图形的底", "面积等于底乘高"]], "05-06": [2, ["给定数字和小数点", "有序排列，不重复、不遗漏"]], "05-15": [1, ["相同小数连加可以写成乘法"]] }[id()];
      const box = dialog("课堂截图");
      const canvas = crop(art.getAttribute("src"), [5, 62.5, 90, 22]);
      const caption = element("p");
      let index = 0;
      const paint = () => {
        caption.textContent = (index + 1) + " / " + slide[0] + "　" + slide[1][index];
      };
      box.append(canvas, caption, button("上一张", () => { index = Math.max(0, index - 1); paint(); }), button("下一张", () => { index = Math.min(slide[0] - 1, index + 1); paint(); }));
      paint();
    },
    thirdVideo: () => dialog("小数乘法的应用").append(element("p", "每支彩笔 2.5 元，3 支共 7.5 元。先找数量关系，再列式计算。")),
    print: () => {
      const box = dialog("原练习 · 10 道题");
      const questions = ["0.6 × 4.5", "3.2 × 0.7", "小禾每天步行 1.2 千米，5 天共步行多少千米？", "每支铅笔 0.8 元，4 支多少钱？", "一条彩带 2.5 米，3 条共多少米？", "2.5 × 4", "0.12 × 3", "1.6 × 5", "0.9 × 7", "每支铅笔 1.5 元，4 支共多少元？"];
      const list = element("ol");
      for (const question of questions) list.append(element("li", question));
      const print = button("打印 / 保存 PDF", () => {
        const restore = () => document.body.classList.remove("print-review");
        document.body.classList.add("print-review");
        window.addEventListener("afterprint", restore, { once: true });
        window.print();
        restore();
      });
      print.className = "review-actions";
      box.append(element("p", "姓名 __________　日期 __________"), list, print);
    },
    permissions: () => {
      const box = dialog("相册访问");
      box.append(element("p", "在手机设置中打开青椒伴学的照片访问权限，然后回到作业页。"));
      const actions = element("div");
      actions.className = "review-actions";
      actions.append(
        button("继续拍照", () => { box.close(); go("06-06"); }),
        button("演示已开启权限", () => { box.close(); chooseHomeworkImages(); }),
      );
      box.append(actions);
    },
    retrySummary: () => {
      const box = dialog("内容总结");
      box.append(element("p", "相同的小数连加，可以用乘法来表示。"));
      const summary = element("ul");
      for (const point of ["0.3 连加 4 次，可以写成 0.3 × 4。", "4 个 0.3 合起来是 1.2。"]) summary.append(element("li", point));
      box.append(summary);
    },
    feedback,
    contact: () => dialog("联系专员").append(element("p", "此处演示联系入口。服务专员的联系方式由应用提供。")),
    homeworkPhotoZoom: () => gallery("homework", 0, true),
    annotationZoom7: () => gallery("annotation", 7, true),
  };

  function selectCalendarDay(week, day) {
    const target = week === 0 ? publishedDays[day] : null;
    if (target) return go(target);
    const selected = calendarSelection();
    if (id() === "03-04" && selected.week === week && selected.day === day) return;
    const focusLabel = document.activeElement?.closest("#hotspots button")?.getAttribute("aria-label");
    history.pushState({ calendar: { week, day } }, "", "#03-04");
    go("03-04");
    if (focusLabel) Array.from(document.querySelectorAll("#hotspots button"))
      .find(control => control.getAttribute("aria-label") === focusLabel)?.focus({ preventScroll: true });
  }

  function changeWeek(offset) {
    const { week, day } = calendarSelection();
    selectCalendarDay(week + offset, day);
  }

  function renderCalendar(page) {
    const { week, day } = calendarSelection();
    const controls = Array.from(document.querySelectorAll("#hotspots button"));
    for (const control of controls) {
      const index = weekdays.indexOf(control.getAttribute("aria-label"));
      if (index === -1) continue;
      control.setAttribute("aria-pressed", String(index === day));
      control.title = `${weekdays[index]} · ${fullDate(calendarDate(week, index))}`;
      control.setAttribute("aria-description", `${fullDate(calendarDate(week, index))}，${week === 0 && publishedDays[index] ? "有课" : "暂无已发布课程"}`);
    }
    if (page.id !== "03-04") return;
    const announcement = element("span", `${fullDate(calendarDate(week, day))}当天暂无已发布课程`);
    announcement.className = "calendar-preview-announcement";
    announcement.setAttribute("role", "status");
    layer.append(announcement);
    if (week === 0 && day === 3) return;

    const range = element("div", `${fullDate(calendarDate(week, 0))}—${fullDate(calendarDate(week, 6))}`);
    range.className = "calendar-preview-range";
    const days = element("div");
    days.className = "calendar-preview-days";
    weekdays.forEach((label, index) => {
      const cell = element("div");
      if (index === day) cell.className = "selected";
      cell.append(element("span", label), element("strong", calendarDate(week, index).getUTCDate()));
      if (week === 0 && publishedDays[index]) cell.append(element("i"));
      days.append(cell);
    });
    range.setAttribute("aria-hidden", "true");
    days.setAttribute("aria-hidden", "true");
    layer.append(range, days);
  }

  weekdays.forEach((_, day) => {
    handlers["calendarDay" + day] = () => selectCalendarDay(calendarSelection().week, day);
  });
  for (let i = 0; i < 8; i++) handlers["annotation" + i] = () => gallery("annotation", i);
  for (let i = 0; i < 2; i++) handlers["homeworkPhoto" + i] = () => gallery("homework", i);
  wrong.forEach(([number, question, answer], i) => {
    handlers["wrong" + i] = () => {
      const box = dialog("第 " + (i + 1) + " 道错题");
      box.append(element("p", "原练习第 " + number + " 题"), element("p", question), element("p", "参考答案 " + answer), element("p", "先按整数乘法计算，再检查积的小数点和单位。"));
    };
  });

  window.currentReviewAction = action => handlers[action]?.();
  window.currentReviewTransition = go;
  window.renderCurrentReview = page => {
    document.querySelector(".review-dialog")?.close();
    document.querySelector(".review-toast")?.remove();
    layer.replaceChildren();
    dismissPreview = page.dismissDialog;
    const hotspotLayer = document.getElementById("hotspots");
    if (dismissPreview) {
      hotspotLayer.setAttribute("role", "dialog");
      hotspotLayer.setAttribute("aria-label", page.title || page.name);
    } else {
      hotspotLayer.removeAttribute("role");
      hotspotLayer.removeAttribute("aria-label");
    }
    form = consent = null;
    if (page.form) renderForm(page.form === "register");
    if (page.controls?.some(([, to]) => to === "!previousWeek")) renderCalendar(page);
    if (page.id === "08-01") atlasState = null;
    if (page.atlas && page.id !== "08-01") layer.append(atlas(page.id.slice(3)));
  };
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && dismissPreview && !document.querySelector("dialog[open]")) {
      event.preventDefault();
      window.currentReviewAction(dismissPreview.slice(1));
    }
  });
  window.addEventListener("message", event => {
    if (event.origin !== location.origin) return;
    const modal = document.querySelector(".review-dialog .atlas-frame");
    if (event.source === modal?.contentWindow && event.data?.target === "close") modal.closest("dialog").close();
    if (event.source !== layer.querySelector("iframe")?.contentWindow) return;
    if (/^0[1-4]$/.test(event.data?.atlas || "")) {
      atlasState = event.data;
      go("08-" + event.data.atlas);
    }
    if (event.data?.target === "00") go("00");
  });
  window.review.go(id(), false);
})();
