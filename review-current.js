(() => {
  const screen = document.getElementById("screen");
  const layer = document.createElement("div");
  layer.className = "review-interactive";
  screen.append(layer);
  const art = document.getElementById("screen-image");
  const stage = document.getElementById("stage");
  const origins = new Map();
  const activityScroll = new Map();
  const activities = /^09-0[1-8]$/;
  const exercises = /^06-(01|02|03|23|24)$/;
  const profiles = /^09-(09|10|11|12)$/;
  const originsByFlow = [
    ["textbook", /^01-16$/, /^01-1[1-5]$/],
    ["schedule", /^04-/, /^(00$|01-|03-)/],
    ["video", /^05-/, /^(01-12$|03-|04-)/],
    ["videoRetry", /^05-(08|09)$/, /^05-(01|02|03|05|07|14|16|17|18|19)$/],
    ["summary", /^05-(04|06|15)$/, /^05-(03|05|14|18)$/],
    ["exercise", exercises, /^(03-|04-|05-)/],
    ["homework", /^06-(0[4-9]|1\d|2[0125])$/, /^(00$|01-|03-|04-|06-(01|02|03|23|24)$|09-0[1-8]$)/],
    ["draft", /^06-09$/, /^06-(05|07|16|25)$/],
    ["upload", /^06-12$/, /^06-(11|13|14|22)$/],
    ["feedback", /^07-/, /^(00$|01-|04-|09-0[1-8]$)/],
    ["annotation", /^07-1[34]$/, /^07-(0\d|1[012])$/],
    ["annotationImage", /^07-1[5-7]$/, /^07-1[34]$/],
    ["profile", /^09-1[34]$/, profiles],
    ["suggestion", /^10-01$/, profiles],
  ];
  let entry = "00";
  let form;
  let consent;
  const demoCode = "123456";
  const registeredPhones = new Set();
  const sms = new Map();
  const feedbackDrafts = new Map();
  let sessionPhone;
  let smsTimer;
  let uploadPending = false;
  let toastTimer;
  let atlasState;
  let dismissPreview;
  const id = () => window.review.current();

  function go(target) {
    const source = id();
    if (target !== source) {
      entry = source;
      for (const [key, destination, allowedSource] of originsByFlow) {
        if (destination.test(target) && allowedSource.test(source)) {
          origins.set(key, { id: source, scrollTop: stage.scrollTop });
        }
      }
      if (activities.test(source)) activityScroll.set(source, stage.scrollTop);
    }
    if (target === "05-03" && /^05-(01|02|17|19)$/.test(source)) playback.delete("formal-area");
    if (target === "05-17" && target !== source) playback.delete("formal-multiply");
    window.review.go(target);
    if (activities.test(target) && activityScroll.has(target)) stage.scrollTop = activityScroll.get(target);
  }

  function backTo(flow, fallback) {
    const origin = origins.get(flow);
    go(origin?.id || fallback);
    if (origin) stage.scrollTop = origin.scrollTop;
  }

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
      const row = element("div");
      row.className = "review-actions";
      row.append(field, select);
      field.htmlFor = select.id = "review-select-" + label;
      box.append(row);
    }
    const actions = element("div");
    actions.className = "review-actions";
    actions.append(button("确认", () => {
      const values = Object.fromEntries(options.map(([label]) => [label, document.getElementById("review-select-" + label).value]));
      box.close();
      onSubmit(values);
    }));
    box.append(actions);
  }

  function smsKey() {
    return id() + ":" + (form?.phone.value || "");
  }

  function refreshSms() {
    clearTimeout(smsTimer);
    if (!form) return;
    const control = document.querySelector('#hotspots [aria-label="获取验证码"]');
    const countdown = layer.querySelector(".sms-countdown");
    const seconds = Math.max(0, Math.ceil(((sms.get(smsKey())?.retryAt || 0) - Date.now()) / 1000));
    control.disabled = seconds > 0;
    countdown.hidden = !seconds;
    if (seconds) {
      countdown.textContent = seconds + " 秒后重发";
      smsTimer = setTimeout(refreshSms, 1000);
    }
  }

  function validPhone() {
    if (/^1\d{10}$/.test(form.phone.value)) return true;
    notify("请输入 11 位手机号");
    form.phone.focus();
    return false;
  }

  function sendCode() {
    if (!validPhone() || sms.get(smsKey())?.retryAt > Date.now()) return;
    sms.set(smsKey(), { retryAt: Date.now() + 60000, expired: false });
    refreshSms();
    form.code.focus();
    notify("演示验证码 " + demoCode);
  }

  function authenticate() {
    if (!validPhone()) return;
    if (!consent.checked) {
      notify("请先阅读并勾选协议");
      return consent.focus();
    }
    if (form.name && !form.name.value.trim()) {
      notify("请填写学生姓名");
      return form.name.focus();
    }
    const challenge = sms.get(smsKey());
    if (!challenge || challenge.expired || form.code.value !== demoCode) {
      notify(!challenge ? "请先获取验证码" : challenge.expired ? "验证码已过期，请重新获取" : "验证码有误");
      return form.code.focus();
    }
    const phone = form.phone.value;
    if (form.name && registeredPhones.has(phone)) {
      notify("这个手机号已注册，请去登录");
      return;
    }
    sms.delete(smsKey());
    if (form.name) {
      registeredPhones.add(phone);
      go("02-03");
    } else {
      sessionPhone = phone;
      go("02-04");
    }
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

  function printableExercise(title, pages) {
    const box = dialog(title);
    const print = button("打印 / 保存 PDF", () => {
      const restore = () => document.body.classList.remove("print-review");
      document.body.classList.add("print-review");
      window.addEventListener("afterprint", restore, { once: true });
      window.print();
      restore();
    });
    print.className = "review-actions";
    const paper = element("div");
    paper.className = "print-worksheet";
    paper.append(...pages);
    box.append(paper, print);
  }

  const applications = new Set();
  function freeCourse(failFirst = false) {
    const box = dialog("免费课包详情 · 演示");
    const key = sessionPhone || "demo";
    const group = element("div");
    group.className = "review-course-actions";
    const message = element("p");
    message.setAttribute("role", "status");
    let submitting = false;
    const apply = rowLabel => {
      const request = button(rowLabel, () => {
        if (submitting || applications.has(key)) return;
        submitting = true;
        refresh();
        setTimeout(() => {
          submitting = false;
          if (failFirst) {
            failFirst = false;
            refresh();
            message.textContent = "演示申请未成功，请重试。";
            return;
          }
          applications.add(key);
          refresh();
          message.textContent = "已记录您的课程申请需求，后续会有专属伴学老师与您联系，制定您的专属伴学计划。此处为演示。";
        }, 300);
      });
      request.className = "course-apply";
      request.dataset.label = rowLabel;
      return request;
    };
    function refresh() {
      for (const request of group.querySelectorAll(".course-apply")) {
        request.disabled = submitting || applications.has(key);
        request.textContent = applications.has(key) ? "已申请" : submitting ? "正在提交" : request.dataset.label;
      }
    }
    for (const [label, action] of [
      ["今日学习", button("开始学习", () => go("05-14"))],
      ["做练习", button("预览免费练习", () => handlers.freePractice())],
      ["交作业", apply("获取更多服务")],
      ["老师反馈", apply("获取更多服务")],
    ]) {
      const row = element("div");
      row.className = "review-course-row";
      row.append(element("strong", label), action);
      group.append(row);
    }
    group.append(apply("获取更多课程"));
    box.append(element("p", "认识 10 以内的数 · 小学一年级上册 · 人教版"), group, message);
    refresh();
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
    const countdown = element("span");
    countdown.className = "sms-countdown";
    Object.assign(countdown.style, { top: register ? "57.3%" : "49.1%" });
    layer.append(countdown);
    form.phone.oninput = refreshSms;
    form.code.onkeydown = event => {
      if (event.key === "Enter") window.currentReviewAction("auth");
    };
    refreshSms();
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
    const fields = element("form");
    const draftKey = sessionPhone || "demo";
    const draft = feedbackDrafts.get(draftKey) || {};
    const category = element("select");
    category.required = true;
    for (const [label, value] of [["请选择",""], ["表扬","表扬"], ["投诉","投诉"], ["建议","建议"]]) {
      category.add(new Option(label, value));
    }
    const description = element("textarea");
    description.maxLength = 500;
    description.required = true;
    const contact = element("select");
    contact.required = true;
    for (const [label, value] of [["请选择",""], ["是，需要联系","yes"], ["暂时不需要","no"]]) {
      contact.add(new Option(label, value));
    }
    const contactInfo = element("input");
    contactInfo.type = "text";
    const count = element("small");
    category.value = draft.category ?? "";
    description.value = draft.description ?? "";
    contact.value = draft.contact ?? "";
    contactInfo.value = draft.contactInfo ?? "";
    for (const [label, control] of [
      ["反馈类型", category],
      ["描述（500 字以内）", description],
      ["是否需要人工联系", contact],
      ["手机号或微信号（选填）", contactInfo],
    ]) {
      const field = element("label", label);
      field.append(control);
      if (control === description) field.append(count);
      fields.append(field);
    }
    function sync() {
      count.textContent = description.value.length + " / 500";
      contactInfo.closest("label").hidden = contact.value !== "yes";
      contactInfo.disabled = contact.value !== "yes";
      feedbackDrafts.set(draftKey, {
        category: category.value, description: description.value,
        contact: contact.value, contactInfo: contactInfo.value,
      });
    }
    fields.oninput = sync;
    sync();
    const submit = element("button", "提交反馈");
    submit.type = "submit";
    fields.append(submit);
    fields.onsubmit = event => {
      event.preventDefault();
      if (!description.value.trim()) {
        notify("请输入反馈描述");
        return description.focus();
      }
      feedbackDrafts.delete(draftKey);
      box.close();
      notify("演示校验通过，未发送反馈");
    };
    box.append(fields);
  }

  const wrong = [
    ["3", "1.2 × 5", "6"], ["4", "0.8 × 4", "3.2"], ["5", "2.5 × 3", "7.5"],
    ["6", "2.5 × 4", "10"], ["7", "0.12 × 3", "0.36"], ["8", "1.6 × 5", "8"], ["9", "0.9 × 7", "6.3"]
  ];
  const defaultTextbook = ["小学", "一年级", "人教版", "上册"];
  let textbookSaved = defaultTextbook.slice();
  let textbookDraft;
  let textbookLayer;
  const gradeOptions = {
    小学: ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"],
    初中: ["七年级", "八年级", "九年级"],
  };

  function place(control, x, y, w, h) {
    Object.assign(control.style, {
      left: x / 8.52 + "%", top: y / 18.46 + "%",
      width: w / 8.52 + "%", height: h / 18.46 + "%",
    });
  }

  function renderTextbook() {
    const rows = [
      ["学段", ["小学", "初中"], 1154, 2],
      ["年级", gradeOptions[textbookDraft[0]], 1271, 3],
      ["版本", ["人教版", "北师大版", "苏教版"], 1477, 3],
      ["册别", ["上册", "下册"], 1594, 2],
    ];
    const children = [];
    if (textbookDraft[0] === "初中") {
      const cover = element("div");
      cover.className = "textbook-grade-cover";
      place(cover, 164, 1357, 646, 83);
      children.push(cover);
    }
    rows.forEach(([label, choices, y, columns], group) => {
      const width = columns === 3 ? 207 : 316;
      const gap = columns === 3 ? 12 : 13;
      choices.forEach((choice, index) => {
        const key = group + "-" + index;
        const control = button(choice, () => {
          if (group === 0 && choice !== textbookDraft[0]) textbookDraft[1] = undefined;
          textbookDraft[group] = choice;
          renderTextbook();
          textbookLayer.querySelector(`[data-option="${key}"]`).focus({ preventScroll: true });
        });
        control.className = "textbook-option";
        control.dataset.option = key;
        control.setAttribute("aria-label", label + " " + choice);
        control.setAttribute("aria-pressed", String(textbookDraft[group] === choice));
        place(control, 165 + (width + gap) * (index % columns), y + 88 * Math.floor(index / columns), width, 78);
        children.push(control);
      });
    });
    if (textbookDraft.some(value => !value)) {
      const disabled = element("span", "确认教材");
      disabled.className = "textbook-confirm-disabled";
      place(disabled, 44, 1718, 764, 78);
      children.push(disabled);
    }
    textbookLayer.replaceChildren(...children);
    document.querySelector('#hotspots [aria-label="确认教材"]').disabled = textbookDraft.some(value => !value);
  }

  function textbookResult() {
    go(textbookSaved.every((value, i) => value === defaultTextbook[i]) ? "01-12" : "01-14");
  }

  function confirmTextbook() {
    if (textbookDraft.some(value => !value)) {
      notify("请选齐学段、年级、版本和册别");
      return;
    }
    textbookSaved = textbookDraft.slice();
    textbookResult();
  }
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
  const videoSamples = {
    "05-01": ["formal-multiply", 204, 720],
    "05-02": ["formal-multiply", 204, 720],
    "05-03": ["formal-area", 720, 720, true],
    "05-05": ["formal-area", 200, 720, true],
    "05-07": ["formal-digits", 80, 600],
    "05-14": ["trial", 90, 720],
    "05-16": ["trial", 165, 720],
    "05-17": ["formal-multiply", 0, 720],
    "05-18": ["formal-digits", 130, 600, true],
    "05-19": ["formal-area", 204, 720],
  };
  const playback = new Map();
  let player;
  let playerTimer;
  const formatTime = seconds => {
    const pad = number => String(Math.floor(number)).padStart(2, "0");
    return pad(seconds / 60) + ":" + pad(seconds % 60);
  };

  function pauseVideo() {
    clearInterval(playerTimer);
    playerTimer = undefined;
  }

  function renderPlayer(sample) {
    const [key, initial, duration, seekable] = sample;
    const state = playback.get(key) || { position: initial, speed: 1, muted: false };
    playback.set(key, state);

    const clock = element("span");
    clock.className = "playback-clock";
    place(clock, 98, 649, 167, 39);
    const rate = element("span");
    rate.className = "playback-rate";
    place(rate, 603, 649, 81, 39);
    const position = element(seekable ? "input" : "progress");
    position.className = "playback-position";
    position.max = duration;
    position.setAttribute("aria-label", seekable ? "拖动回看进度" : "首遍观看进度");
    place(position, 281, 655, 307, 26);
    if (seekable) {
      position.type = "range";
      position.oninput = () => {
        state.position = Number(position.value);
        paint();
      };
    }
    function paint() {
      clock.textContent = formatTime(state.position) + " / " + formatTime(duration);
      rate.textContent = (Number.isInteger(state.speed) ? state.speed.toFixed(1) : state.speed) + "× ⌄";
      position.value = state.position;
      position.style.setProperty("--played", (state.position / duration * 100) + "%");
    }
    layer.append(clock, rate, position);
    player = { state, duration, seekable, paint };
    paint();
  }

  function toggleVideo() {
    const { state, duration, seekable, paint } = player;
    if (playerTimer) {
      pauseVideo();
      return notify("已暂停");
    }
    if (state.position === duration) {
      if (!seekable) return notify("本段演示已结束，可在右栏查看完成态");
      state.position = 0;
    }
    playerTimer = setInterval(() => {
      state.position = Math.min(duration, state.position + state.speed);
      paint();
      if (state.position >= duration) {
        pauseVideo();
        notify("本段演示已结束，可在右栏查看完成态");
      }
    }, 1000);
    notify("已播放 · 演示");
  }

  function resetContext() {
    pauseVideo();
    origins.clear();
    activityScroll.clear();
    entry = "00";
    atlasState = undefined;
  }

  const handlers = {
    backFromTextbook: () => backTo("textbook", "01-11"),
    backToSchedule: () => backTo("schedule", id() === "04-07" ? "03-03" : "03-01"),
    backFromVideo: () => backTo("video", ["05-14","05-15","05-16"].includes(id()) ? "01-12" : "04-01"),
    retryVideo: () => backTo("videoRetry", "05-01"),
    closeSummary: () => backTo("summary", { "05-04": "05-03", "05-06": "05-18", "05-15": "05-14" }[id()]),
    backFromExercise: () => backTo("exercise", id() === "06-02" ? "04-07" : "04-01"),
    returnToDraft: () => backTo("draft", "06-05"),
    returnToUpload: () => backTo("upload", "06-11"),
    returnProfile: () => backTo("profile", "09-09"),
    backFromFeedback: () => backTo("feedback", "04-05"),
    backFromHomework: () => backTo("homework", id() === "06-21" ? "04-11" : "03-01"),
    backToActivity: () => {
      if (activities.test(origins.get("homework")?.id)) backTo("homework", "09-01");
      else go("09-01");
    },
    backToHomeworkCalendar: () => {
      if (/^03-/.test(origins.get("homework")?.id)) backTo("homework", "03-01");
      else go("03-01");
    },
    closeAnnotations: () => backTo("annotation", "07-01"),
    closeAnnotationImage: () => backTo("annotationImage", id() === "07-17" ? "07-14" : "07-13"),
    backFromSuggestion: () => backTo("suggestion", "09-09"),
    waitForQueue: () => notify("图片正在入队，准备好后就可以返回"),
    queryHomework: () => notify("提交结果仍待确认，请稍后查询"),
    homeworkReceived: () => {
      const source = origins.get("homework")?.id;
      go(activities.test(source) ? "06-19" : /^03-/.test(source) ? "06-18" : "06-17");
    },
    requestLogout: () => go(uploadPending ? "09-14" : "09-13"),
    logOut: () => {
      if (uploadPending) return go("09-14");
      feedbackDrafts.delete(sessionPhone || "demo");
      sessionPhone = undefined;
      sms.clear();
      playback.clear();
      textbookSaved = defaultTextbook.slice();
      resetContext();
      window.review.go("02-01");
    },
    atlas: () => openAtlas("05"),
    unit1: () => openAtlas("04", 1),
    unit2: () => openAtlas("04", 2),
    sms: sendCode,
    smsFailed: () => notify("验证码未发出，请重试。已填内容会保留。"),
    smsExpired: () => {
      if (!validPhone()) return;
      sms.set(smsKey(), { expired: true });
      refreshSms();
      notify("验证码已过期，可重新获取");
    },
    consent: () => consent.click(),
    auth: authenticate,
    userPolicy: () => dialog("用户协议").append(element("p", "正式用户协议待配置。")),
    privacy: () => dialog("隐私政策").append(element("p", "正式隐私政策待配置。")),
    childPrivacy: () => dialog("儿童隐私政策").append(element("p", "正式儿童隐私政策待配置。")),
    textbook: confirmTextbook,
    retryTextbook: textbookResult,
    freeCourse,
    freeCourseFailure: () => freeCourse(true),
    freePractice: () => dialog("免费练习预览 · 演示")
      .append(element("p", "正式练习随课包提供，可单独预览与打印。当前只提供入口演示。")),
    addHomeworkImages: chooseHomeworkImages,
    pendingLearningHome: () => go(fromTrialHome() ? entry : entry === "09-12" ? "01-11" : "00"),
    pendingLearningProfile: () => go(fromTrialHome() || entry === "09-12" ? "09-12" : "09-09"),
    previousWeek: () => changeWeek(-1),
    nextWeek: () => changeWeek(1),
    video: toggleVideo,
    speed: () => choices("播放速度", [["倍速", ["0.75", "1", "1.25", "1.5", "2"]]], { 倍速: String(player.state.speed) }, values => {
      player.state.speed = Number(values.倍速);
      player.paint();
      notify("播放速度 " + player.state.speed + "×");
    }),
    volume: () => {
      player.state.muted = !player.state.muted;
      notify(player.state.muted ? "已静音" : "已恢复声音");
    },
    fullscreen: () => {
      const box = dialog("课堂画面");
      box.append(crop(art.getAttribute("src"), [3.5, 14.2, 93, 20.4]));
    },
    slides: () => {
      const slides = {
        "05-04": [0, ["沿高割补，面积不变", "长方形的长对应平行四边形的底", "面积等于底乘高"]],
        "05-06": [1, ["给定数字和小数点", "有序排列，不重复、不遗漏"]],
        "05-15": [0, ["相同小数连加可以写成乘法"]],
      };
      const [actual, captions] = slides[id()];
      const box = dialog("课堂截图");
      const canvas = crop(art.getAttribute("src"), [6, 63.5, 88, 19]);
      const placeholder = element("p", "这张图目前仅演示翻页位置。");
      const image = element("div");
      image.append(canvas, placeholder);
      const caption = element("p");
      caption.setAttribute("aria-live", "polite");
      let index = actual;
      const paint = offset => {
        index = Math.min(captions.length - 1, Math.max(0, index + offset));
        caption.textContent = (index + 1) + " / " + captions.length + "　" + captions[index];
        canvas.hidden = index !== actual;
        placeholder.hidden = index === actual;
        prev.disabled = index === 0;
        next.disabled = index === captions.length - 1;
      };
      const prev = button("上一张", () => paint(-1));
      const next = button("下一张", () => paint(1));
      const actions = element("div");
      actions.className = "review-actions";
      actions.append(prev, next);
      box.append(image, caption, actions);
      box.onkeydown = event => {
        if (event.key === "ArrowLeft") paint(-1);
        if (event.key === "ArrowRight") paint(1);
      };
      paint(0);
    },
    thirdVideo: () => dialog("小数乘法的应用").append(element("p", "每支彩笔 2.5 元，3 支共 7.5 元。先找数量关系，再列式计算。")),
    print: () => printableExercise("原练习 · 图稿示例", [
      crop("screens/06-01.png", [6, 20, 87, 55.5]),
      crop("screens/06-03.png", [6, 20, 87, 56]),
    ]),
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
  window.resetCurrentReviewContext = resetContext;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseVideo();
  });
  window.renderCurrentReview = page => {
    pauseVideo();
    player = null;
    clearTimeout(smsTimer);
    if (/^(06-(10|11|12|13|14|15|22)|09-14)$/.test(page.id)) uploadPending = true;
    if (/^06-(05|07|16|17|18|19|25)$/.test(page.id)) uploadPending = false;
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
    if (page.id === "01-16") {
      textbookDraft = textbookSaved.slice();
      textbookLayer = element("div");
      layer.append(textbookLayer);
      renderTextbook();
    }
    if (videoSamples[page.id]) renderPlayer(videoSamples[page.id]);
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
