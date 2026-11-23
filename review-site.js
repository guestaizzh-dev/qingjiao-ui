(() => {
  const el = id => document.getElementById(id);
  const screens = window.currentReviewScreens;
  const byId = new Map(screens.map(page => [page.id, page]));
  const groups = [...new Set(screens.map(page => page.module))];
  const data = { screens };
  let current = "00";
  let overview = false;

  const actionNotes = {
    sms: ["获取演示验证码", "校验手机号，显示演示码和重发倒计时。"],
    smsFailed: ["模拟短信发送失败", "保留输入，提示重新获取验证码。"],
    smsExpired: ["模拟验证码过期", "保留表单，原验证码不可用，可重新获取。"],
    consent: ["切换协议同意状态", "需要主动勾选。阅读协议后仍由学生自行确认。"],
    auth: ["校验表单", "校验手机号、验证码与协议。注册还需填写姓名。"],
    userPolicy: ["阅读用户协议", "关闭后回到来源页，保留表单内容。"],
    privacy: ["阅读隐私政策", "关闭后回到来源页，保留表单内容。"],
    childPrivacy: ["阅读儿童隐私政策", "关闭后回到来源页，保留勾选和输入状态。"],
    textbook: ["查询教材匹配结果", "四项选齐才确认。按当前组合显示匹配或暂无课包。"],
    retryTextbook: ["重查已确认的教材", "沿用已经保存的学段、年级、版本与册别。"],
    backFromTextbook: ["关闭筛选", "保留已确认的教材与原课包状态，回到打开筛选的页面。"],
    previousWeek: ["切到上周", "周历与下方安排一起更新。"],
    nextWeek: ["切到下周", "周历与下方安排一起更新。"],
    pendingLearningHome: ["回当前身份的首页", "体验账号回免费课包入口，正式账号回伴学首页。"],
    pendingLearningProfile: ["回当前身份的个人中心", "显示对应的体验或正式服务资料。"],
    backToSchedule: ["回来源首页或周历", "从周历进入时回到原先选择的课时日期。"],
    video: ["切换播放与暂停", "播放器记录当前演示位置，暂停后停止计时。"],
    speed: ["调整播放器倍速", "确认后应用到当前视频，关闭选项时保留原倍速。"],
    volume: ["切换音量状态", "在静音和恢复声音之间切换。"],
    fullscreen: ["放大课堂画面", "打开当前画面的大图预览，关闭后回播放器。"],
    slides: ["翻看课堂截图", "查看当前视频的图组，首尾限制翻页，关闭后回课堂截图页。"],
    closeSummary: ["收起课堂截图", "回进入时的视频状态，保存观看位置。"],
    thirdVideo: ["预览第三段内容", "查看第三段内容样例，与前两段的总结分别展示。"],
    backFromVideo: ["回课包或正式课时", "保存当前演示进度，回打开视频的入口。"],
    retryVideo: ["重新请求播放", "成功后回原视频，并保留本次观看位置。"],
    print: ["打开示例原卷", "在原卷查看器内使用系统打印或存为 PDF。"],
    freePractice: ["查看免费练习入口", "正式文件可预览和打印。当前演示展示入口，免费练习没有提交按钮。"],
    freeCourse: ["打开免费课包的交互演示", "可进入视频、预览免费练习或演示课程申请。"],
    freeCourseFailure: ["演示课程申请失败", "保持未申请，可在同一入口重试。"],
    backFromExercise: ["回原来进入的课时或视频", "从视频进入则回原视频并暂停。"],
    backFromHomework: ["回本次作业的来源", "按课时、练习、周历或服务动态入口返回。"],
    addHomeworkImages: ["打开设备图片选择器", "支持多选。取消留在原页，确认后进图片准备样例。"],
    permissions: ["查看授权说明", "可演示拍照，或开启权限后重新选择。"],
    returnToDraft: ["回到本次草稿", "保留已选图片和顺序，可继续检查或编辑。"],
    waitForQueue: ["等待图片全部入队", "此时仍停留本页。全部入队后才开放返回。"],
    returnToUpload: ["继续原上传任务", "从确认弹窗回到原来的上传或失败状态。"],
    queryHomework: ["核对这次提交结果", "未取得正式结果时保持待确认，可在右栏查看明确收件、取消和失败的分支。"],
    homeworkReceived: ["展示正式收件结果", "按进入来源打开只读提交，图片保持原顺序。"],
    backToActivity: ["回原服务动态", "恢复之前的筛选与列表位置。"],
    backToHomeworkCalendar: ["回原周历日期", "优先恢复从学习页进入作业时选中的课时。"],
    backFromFeedback: ["回反馈的来源页", "从动态进入时恢复原筛选与位置。"],
    closeAnnotations: ["关闭批注抽屉", "回到原反馈页和错题组。"],
    closeAnnotationImage: ["关闭批注大图", "回刚才浏览的批注列表。"],
    returnProfile: ["回原来的个人中心", "保持账号和当时的服务状态。"],
    requestLogout: ["选择退出提示", "有上传任务先看进度，其余情况弹出退出确认。"],
    logOut: ["结束本次登录演示", "清理演示会话中的表单草稿和播放状态，进入验证码登录页。"],
    backFromSuggestion: ["退出意见反馈页", "回进入时的个人中心状态。"],
    feedback: ["打开可编辑的意见表单", "选择类型、填写描述、选择联系意愿后完成演示校验。"],
    contact: ["查看联系专员", "未配置的联系方式显示说明。关闭后回反馈中心。"],
    atlas: ["浏览八个单元", "可点选单元和知识点，使用地图控件缩放、拖动和复位。"],
    unit1: ["查看第二单元", "打开「位置」章节的路线和知识点。"],
    unit2: ["查看第三单元", "打开「小数除法」章节的路线和知识点。"],
    homeworkPhotoZoom: ["放大作业原图", "按原比例打开作业查看器，关闭回原提交。"],
    annotationZoom7: ["放大第 8 张批注", "保持图序，可还原或返回上一张。"],
  };
  const calendarNotes = [
    "周一有历史课时，页面显示历史学习安排。",
    "周二暂无已发布课时，下方显示空态。",
    "周三有当日课时，页面显示视频、练习和作业入口。",
    "周四暂无已发布课时，下方显示空态。",
    "周五有已发布的未来课时，允许预览已发布的练习。",
    "周六暂无已发布课时，下方显示空态。",
    "周日暂无已发布课时，下方显示空态。",
  ];

  function make(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function go(id, push = true) {
    if (!byId.has(id)) id = "00";
    const changed = id !== current;
    current = id;
    if (location.hash !== "#" + id) {
      if (push) history.pushState(null, "", "#" + id);
      else if (location.hash) history.replaceState(null, "", "#" + id);
    }
    if (changed) {
      el("stage").scrollTop = 0;
      el("interaction-detail").scrollTop = 0;
    }
    render();
    if (overview && push) toggleOverview(false);
  }

  function activate(target) {
    if (target.startsWith("!")) window.currentReviewAction(target.slice(1));
    else window.currentReviewTransition(target);
  }

  function artworkUrl(page) {
    return encodeURI(page.file) + (page.revision ? "?v=" + page.revision : "");
  }

  function outcome(target) {
    if (!target.startsWith("!")) {
      const page = byId.get(target);
      return [page.title, page.feature];
    }
    const action = target.slice(1);
    if (/^calendarDay\d$/.test(action)) {
      return ["更新所选日期", calendarNotes[Number(action.at(-1))] + " 适用于示例周。"];
    }
    if (/^annotation\d$/.test(action)) return ["打开批注大图", "查看当前示例批注，可翻页、缩放和还原。"];
    if (/^homeworkPhoto\d$/.test(action)) return ["打开作业大图", "按当前清单的顺序查看，关闭回原作业页。"];
    if (/^wrong\d$/.test(action)) return ["查看这道错题", "显示原练习题号、题面、作答、参考答案和解题思路。"];
    return actionNotes[action];
  }

  function actionCard([label, target]) {
    const [title, detail] = outcome(target);
    const card = make("button", undefined, "action-card");
    const headline = make("span", undefined, "action-head");
    headline.append(make("strong", label), make("span", title + " →", "action-target"));
    card.append(headline, make("small", detail, "action-detail"));
    card.onclick = () => {
      const source = current;
      activate(target);
      if (current !== source && matchMedia("(max-width: 900px)").matches) {
        el("page-title").scrollIntoView({ block: "start" });
      }
    };
    return card;
  }

  function hotspot([label, target, x, y, w, h, continuation]) {
    const button = make("button", undefined, "hotspot");
    button.setAttribute("aria-label", label);
    button.title = label;
    Object.assign(button.style, {
      left: x + "%", top: y + "%", width: w + "%", height: h + "%",
    });
    button.append(make("span", label));
    if (continuation) {
      const [cx, cy, cw, ch] = continuation;
      const tail = make("i", undefined, "hotspot-continuation");
      tail.setAttribute("aria-hidden", "true");
      Object.assign(tail.style, {
        left: ((cx - x) / w * 100) + "%",
        top: ((cy - y) / h * 100) + "%",
        width: (cw / w * 100) + "%",
        height: (ch / h * 100) + "%",
      });
      button.append(tail);
    }
    button.onclick = () => activate(target);
    return button;
  }

  function render() {
    const page = byId.get(current);
    el("page-title").textContent = page.id + " / " + page.title;
    el("page-meta").textContent = page.module + " · 手机原图 852 × 1846";
    el("detail-title").textContent = page.title;
    el("feature").textContent = page.feature;
    el("requirements").textContent = "PRD V1.0 · " + page.requirements.join(" · ");
    el("rules").replaceChildren(...page.rules.map(rule => make("li", rule)));
    el("actions").replaceChildren(...page.controls.map(actionCard));
    el("actions-section").hidden = !page.controls.length;
    el("examples").replaceChildren(...(page.examples || []).map(actionCard));
    el("examples-section").hidden = !page.examples?.length;
    el("original").href = el("download").href = artworkUrl(page);
    el("download").download = page.file.split("/").at(-1);
    el("screen-image").src = artworkUrl(page);
    el("screen-image").alt = page.title;
    el("hotspots").replaceChildren(...page.controls.map(hotspot));

    for (const node of el("nav").querySelectorAll(".nav-item")) {
      const active = node.dataset.id === current;
      node.classList.toggle("active", active);
      if (active) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    }
    document.title = page.title + " · 青椒伴学 UI 设计";
    window.renderCurrentReview?.(page);
  }

  function select(id) {
    window.resetCurrentReviewContext?.();
    go(id);
  }

  function buildNav() {
    for (const group of groups) {
      const section = make("section");
      section.append(make("h3", group));
      for (const page of screens.filter(page => page.module === group)) {
        const button = make("button", undefined, "nav-item");
        button.dataset.id = page.id;
        button.append(make("span", page.id), make("b", page.title));
        button.onclick = () => select(page.id);
        section.append(button);
      }
      el("nav").append(section);
    }
  }

  function buildOverview() {
    for (const group of groups) {
      const grid = make("div", undefined, "grid");
      for (const page of screens.filter(page => page.module === group)) {
        const button = make("button", undefined, "thumb");
        const img = make("img");
        img.src = artworkUrl(page);
        img.alt = page.title;
        img.loading = "lazy";
        img.decoding = "async";
        button.append(img, make("span", page.id + " / " + page.title));
        button.onclick = () => select(page.id);
        grid.append(button);
      }
      const section = make("section");
      section.append(make("h2", group), grid);
      el("overview-groups").append(section);
    }
  }

  function toggleOverview(show = !overview) {
    overview = show;
    el("shell").hidden = show;
    el("overview").hidden = !show;
    el("overview-toggle").textContent = show ? "返回逐页审阅" : "页面总览";
    el("hotspot-toggle").closest("label").hidden = show;
    if (show) {
      if (!el("overview-groups").children.length) buildOverview();
      document.title = "青椒伴学 · UI 设计图";
    } else {
      document.title = byId.get(current).title + " · 青椒伴学 UI 设计";
    }
  }

  function step(offset) {
    const index = screens.findIndex(page => page.id === current);
    select(screens[(index + offset + screens.length) % screens.length].id);
  }

  el("read-interaction").onclick = () => el("interaction-detail").scrollIntoView({ behavior: "smooth", block: "start" });
  el("overview-toggle").onclick = () => toggleOverview();
  el("study-start").onclick = () => select("03-01");
  el("hotspot-toggle").onchange = event => el("screen").classList.toggle("show-hotspots", event.target.checked);
  el("search").oninput = event => {
    const query = event.target.value.trim().toLowerCase();
    for (const button of el("nav").querySelectorAll(".nav-item")) {
      const page = byId.get(button.dataset.id);
      button.style.display = (page.id + page.title + page.module).toLowerCase().includes(query) ? "" : "none";
    }
  };
  el("previous").onclick = () => step(-1);
  el("next").onclick = () => step(1);
  window.addEventListener("popstate", () => {
    go(location.hash.slice(1) || "00", false);
    toggleOverview(!location.hash);
  });

  window.review = { data, go, current: () => current };
  buildNav();
  go(location.hash.slice(1) || "00", false);
  toggleOverview(!location.hash);
})();
