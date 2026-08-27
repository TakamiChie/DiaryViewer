"use strict";

const STORAGE_KEY = "githubDiaryViewerSettingsV1";
const API_VERSION = "2022-11-28";
const MEDIA_EXTENSIONS = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp|aac|flac|m4a|mp3|oga|ogg|opus|wav)(?:[?#].*)?$/i;

const defaultSettings = {
  owner: "",
  repo: "",
  branch: "main",
  folder: "",
  attachmentFolder: "attachment_files",
  fileTemplate: "{YYYY}-{MM}-{DD}.md",
  token: "",
  cutoffHour: 4
};

const state = {
  settings: loadSettings(),
  selectedDate: getLogicalToday(4),
  visibleWeekDate: getLogicalToday(4),
  requestId: 0
};

const elements = {
  contentPanel: document.querySelector("#contentPanel"),
  weekGrid: document.querySelector("#weekGrid"),
  weekLabel: document.querySelector("#weekLabel"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  openSettingsButton: document.querySelector("#openSettingsButton"),
  cancelSettingsButton: document.querySelector("#cancelSettingsButton"),
  clearSettingsButton: document.querySelector("#clearSettingsButton"),
  previousWeekButton: document.querySelector("#previousWeekButton"),
  nextWeekButton: document.querySelector("#nextWeekButton"),
  ownerInput: document.querySelector("#ownerInput"),
  repoInput: document.querySelector("#repoInput"),
  branchInput: document.querySelector("#branchInput"),
  folderInput: document.querySelector("#folderInput"),
  attachmentFolderInput: document.querySelector("#attachmentFolderInput"),
  fileTemplateInput: document.querySelector("#fileTemplateInput"),
  tokenInput: document.querySelector("#tokenInput"),
  cutoffHourInput: document.querySelector("#cutoffHourInput")
};

initialize();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("オフライン機能を有効にできませんでした。", error);
    });
  });
}

function initialize() {
  bindEvents();

  const cutoffHour = normalizeCutoffHour(state.settings.cutoffHour);
  state.selectedDate = getLogicalToday(cutoffHour);
  state.visibleWeekDate = new Date(state.selectedDate);

  renderWeek();

  if (hasRequiredSettings(state.settings)) {
    loadDiary(state.selectedDate);
  } else {
    showStatus("最初にGitHub接続設定を入力してください。");
    openSettings();
  }
}

function bindEvents() {
  elements.openSettingsButton.addEventListener("click", openSettings);
  elements.cancelSettingsButton.addEventListener("click", () => {
    elements.settingsDialog.close();
  });

  elements.clearSettingsButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state.settings = { ...defaultSettings };
    fillSettingsForm(state.settings);
    showStatus("設定を消去しました。");
  });

  elements.previousWeekButton.addEventListener("click", () => {
    state.visibleWeekDate = addDays(state.visibleWeekDate, -7);
    renderWeek();
  });

  elements.nextWeekButton.addEventListener("click", () => {
    state.visibleWeekDate = addDays(state.visibleWeekDate, 7);
    renderWeek();
  });

  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();

    state.settings = {
      owner: elements.ownerInput.value.trim(),
      repo: elements.repoInput.value.trim(),
      branch: elements.branchInput.value.trim() || "main",
      folder: trimSlashes(elements.folderInput.value.trim()),
      attachmentFolder: trimSlashes(elements.attachmentFolderInput.value.trim()),
      fileTemplate: elements.fileTemplateInput.value.trim(),
      token: elements.tokenInput.value.trim(),
      cutoffHour: normalizeCutoffHour(elements.cutoffHourInput.value)
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    elements.settingsDialog.close();

    state.selectedDate = getLogicalToday(state.settings.cutoffHour);
    state.visibleWeekDate = new Date(state.selectedDate);
    renderWeek();
    loadDiary(state.selectedDate);
  });
}

function openSettings() {
  fillSettingsForm(state.settings);
  elements.settingsDialog.showModal();
}

function fillSettingsForm(settings) {
  elements.ownerInput.value = settings.owner || "";
  elements.repoInput.value = settings.repo || "";
  elements.branchInput.value = settings.branch || "main";
  elements.folderInput.value = settings.folder || "";
  elements.attachmentFolderInput.value = settings.attachmentFolder || "";
  elements.fileTemplateInput.value =
    settings.fileTemplate || "{YYYY}-{MM}-{DD}.md";
  elements.tokenInput.value = settings.token || "";
  elements.cutoffHourInput.value =
    normalizeCutoffHour(settings.cutoffHour);
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultSettings, ...(stored || {}) };
  } catch (error) {
    console.warn("設定を読み込めませんでした。", error);
    return { ...defaultSettings };
  }
}

function hasRequiredSettings(settings) {
  return Boolean(
    settings.owner &&
    settings.repo &&
    settings.branch &&
    settings.fileTemplate &&
    settings.token
  );
}

function normalizeCutoffHour(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return 4;
  }
  return Math.min(23, Math.max(0, parsed));
}

function getLogicalToday(cutoffHour) {
  const now = new Date();
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  if (now.getHours() < cutoffHour) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

function getWeekStart(date) {
  const result = new Date(date);
  const day = result.getDay();
  const daysFromMonday = (day + 6) % 7;
  result.setDate(result.getDate() - daysFromMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

function renderWeek() {
  const weekStart = getWeekStart(state.visibleWeekDate);
  const weekEnd = addDays(weekStart, 6);
  const logicalToday = getLogicalToday(
    normalizeCutoffHour(state.settings.cutoffHour)
  );
  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

  elements.weekLabel.textContent =
    `${formatJapaneseDate(weekStart)} 〜 ${formatJapaneseDate(weekEnd)}`;
  elements.weekGrid.replaceChildren();

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(weekStart, index);
    const button = document.createElement("button");
    const weekday = document.createElement("span");
    const dayNumber = document.createElement("span");

    button.type = "button";
    button.className = "day-button";
    button.dataset.date = formatIsoDate(date);
    button.setAttribute(
      "aria-label",
      `${formatJapaneseDate(date)}曜日の日記を表示`
    );

    if (isSameDate(date, logicalToday)) {
      button.classList.add("is-today");
    }

    if (isSameDate(date, state.selectedDate)) {
      button.classList.add("is-selected");
      button.setAttribute("aria-current", "date");
    }

    weekday.className = "weekday";
    weekday.textContent = weekdays[index];

    dayNumber.className = "day-number";
    dayNumber.textContent = String(date.getDate());

    button.append(weekday, dayNumber);
    button.addEventListener("click", () => {
      state.selectedDate = date;
      state.visibleWeekDate = new Date(date);
      renderWeek();
      loadDiary(date);
    });

    elements.weekGrid.append(button);
  }
}

async function loadDiary(date) {
  if (!hasRequiredSettings(state.settings)) {
    showStatus("GitHub接続設定を入力してください。");
    return;
  }

  const requestId = ++state.requestId;
  const path = buildDiaryPath(date, state.settings);
  showStatus(`${formatJapaneseDate(date)}の日記を読み込んでいます。`);

  try {
    const markdown = await fetchDiary(path, state.settings);

    if (requestId !== state.requestId) {
      return;
    }

    await renderDiary(date, path, markdown);
  } catch (error) {
    if (requestId !== state.requestId) {
      return;
    }

    console.error(error);
    showStatus(createFriendlyError(error, path), true);
  }
}

async function fetchDiary(path, settings) {
  const encodedOwner = encodeURIComponent(settings.owner);
  const encodedRepo = encodeURIComponent(settings.repo);
  const encodedPath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url =
    `https://api.github.com/repos/${encodedOwner}/${encodedRepo}` +
    `/contents/${encodedPath}?ref=${encodeURIComponent(settings.branch)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/vnd.github.raw+json",
      "Authorization": `Bearer ${settings.token}`,
      "X-GitHub-Api-Version": API_VERSION
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`GitHub API: ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return response.text();
}

function buildDiaryPath(date, settings) {
  const folder = applyDateTemplate(
    trimSlashes(settings.folder),
    date
  );
  const fileName = applyDateTemplate(settings.fileTemplate, date);

  return [folder, fileName]
    .filter(Boolean)
    .join("/");
}

function applyDateTemplate(template, date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const replacements = {
    "{YYYY}": String(year),
    "{YY}": String(year).slice(-2),
    "{MM}": String(month).padStart(2, "0"),
    "{M}": String(month),
    "{DD}": String(day).padStart(2, "0"),
    "{D}": String(day)
  };

  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(key, value),
    template
  );
}

async function renderDiary(date, path, markdown) {
  const meta = document.createElement("header");
  const titleRow = document.createElement("div");
  const title = document.createElement("h2");
  const tocButton = document.createElement("button");
  const tocPanel = document.createElement("nav");
  const pathText = document.createElement("p");
  const article = document.createElement("article");

  meta.className = "diary-meta";
  titleRow.className = "diary-title-row";
  title.textContent = formatJapaneseDate(date);
  tocButton.type = "button";
  tocButton.className = "toc-button";
  tocButton.textContent = "TOC";
  tocButton.setAttribute("aria-label", "見出し一覧を表示");
  tocButton.setAttribute("aria-expanded", "false");
  tocButton.setAttribute("aria-controls", "toc-panel-meta");
  tocPanel.id = "toc-panel-meta";
  tocPanel.className = "toc-panel";
  tocPanel.setAttribute("aria-label", "見出し一覧");
  tocPanel.hidden = true;
  pathText.textContent =
    `${state.settings.owner}/${state.settings.repo} / ${path}`;

  article.className = "markdown-body";

  if (!window.marked) {
    throw new Error("Markdown変換ライブラリを読み込めませんでした。");
  }

  const parser = new window.marked.Marked({ gfm: true, breaks: true });
  parser.use(createMediaLinkExtension(date, path, state.settings));
  const rawHtml = parser.parse(markdown);

  if (window.DOMPurify) {
    article.innerHTML = window.DOMPurify.sanitize(rawHtml);
  } else {
    article.innerHTML = rawHtml;
  }

  article.querySelectorAll("a.media-file-link").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  const headings = prepareHeadings(article);
  renderToc(tocPanel, headings, tocButton);
  addHeadingTocButtons(headings);

  titleRow.append(title, tocButton);
  meta.append(titleRow, tocPanel, pathText);
  elements.contentPanel.replaceChildren(meta, article);
  document.title = `${formatIsoDate(date)} - GitHub 日記ビューアー`;

  await renderMermaidDiagrams(article);
}

function createMediaLinkExtension(date, diaryPath, settings) {
  return {
    extensions: [{
      name: "obsidianMediaLink",
      level: "inline",
      start(source) {
        return source.indexOf("![[");
      },
      tokenizer(source) {
        const match = /^!\[\[([^\]\n]+)\]\]/.exec(source);
        if (!match) {
          return undefined;
        }

        const [targetPart, labelPart] = match[1].split("|", 2);
        const target = targetPart.trim();
        if (!MEDIA_EXTENSIONS.test(target)) {
          return undefined;
        }

        return {
          type: "obsidianMediaLink",
          raw: match[0],
          target,
          label: (labelPart || target.split("/").pop()).trim()
        };
      },
      renderer(token) {
        const href = buildGitHubFileUrl(token.target, date, diaryPath, settings);
        return `<a class="media-file-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(token.label)}</a>`;
      }
    }]
  };
}

function buildGitHubFileUrl(target, date, diaryPath, settings) {
  const cleanTarget = target.replace(/\\/g, "/").split("#", 1)[0].split("?", 1)[0];
  const diaryFolder = diaryPath.includes("/")
    ? diaryPath.slice(0, diaryPath.lastIndexOf("/"))
    : "";
  const attachmentFolder = applyDateTemplate(
    trimSlashes(settings.attachmentFolder),
    date
  );
  const combinedPath = cleanTarget.startsWith("/")
    ? cleanTarget.slice(1)
    : [diaryFolder, attachmentFolder, cleanTarget].filter(Boolean).join("/");
  const resolvedPath = normalizeRepositoryPath(combinedPath);
  const encodedPath = resolvedPath.split("/").map(encodeURIComponent).join("/");

  return `https://github.com/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/blob/${encodeURIComponent(settings.branch)}/${encodedPath}`;
}

function normalizeRepositoryPath(path) {
  const parts = [];
  path.split("/").forEach((part) => {
    if (!part || part === ".") {
      return;
    }
    if (part === "..") {
      parts.pop();
      return;
    }
    parts.push(part);
  });
  return parts.join("/");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function renderMermaidDiagrams(article) {
  const blocks = Array.from(article.querySelectorAll("pre > code.language-mermaid"));
  if (blocks.length === 0) {
    return;
  }

  if (!window.mermaid) {
    blocks.forEach((block) => {
      block.parentElement.classList.add("mermaid-unavailable");
    });
    console.warn("Mermaid描画ライブラリを読み込めませんでした。");
    return;
  }

  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default"
  });

  const diagrams = blocks.map((block) => {
    const diagram = document.createElement("div");
    diagram.className = "mermaid";
    diagram.textContent = block.textContent;
    block.parentElement.replaceWith(diagram);
    return diagram;
  });

  try {
    await window.mermaid.run({ nodes: diagrams, suppressErrors: true });
  } catch (error) {
    console.error("Mermaid記法を描画できませんでした。", error);
  }
}

function addHeadingTocButtons(headings) {
  headings.forEach((heading, index) => {
    const row = document.createElement("div");
    const button = document.createElement("button");
    const panel = document.createElement("nav");
    const panelId = `toc-panel-heading-${index + 1}`;

    row.className = "markdown-heading-row";
    button.type = "button";
    button.className = "toc-button heading-toc-button";
    button.textContent = "TOC";
    button.setAttribute("aria-label", `${heading.text}から見出し一覧を表示`);
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", panelId);
    panel.id = panelId;
    panel.className = "toc-panel";
    panel.setAttribute("aria-label", "見出し一覧");
    panel.hidden = true;

    heading.element.replaceWith(row);
    row.append(heading.element, button, panel);
    renderToc(panel, headings, button);
  });
}

function prepareHeadings(article) {
  const usedIds = new Set();

  return Array.from(article.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .map((heading, index) => {
      const text = heading.textContent.trim();
      if (!text) {
        return null;
      }

      const baseId = createHeadingId(text) || `heading-${index + 1}`;
      let id = baseId;
      let suffix = 2;

      while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      usedIds.add(id);
      heading.id = id;
      heading.tabIndex = -1;

      return {
        element: heading,
        id,
        level: Number(heading.tagName.slice(1)),
        text
      };
    })
    .filter(Boolean);
}

function createHeadingId(text) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}_-]/gu, "")
    .replace(/^-+|-+$/g, "");
}

function renderToc(panel, headings, button) {
  if (headings.length === 0) {
    button.disabled = true;
    button.title = "見出しがありません";
    return;
  }

  const list = document.createElement("ol");
  const minimumLevel = Math.min(...headings.map((heading) => heading.level));

  list.className = "toc-list";
  headings.forEach((heading) => {
    const item = document.createElement("li");
    const link = document.createElement("a");

    item.style.setProperty("--toc-depth", heading.level - minimumLevel);
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.text;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      closeToc(panel, button);
      heading.element.scrollIntoView({ behavior: "smooth", block: "start" });
      heading.element.focus({ preventScroll: true });
      history.replaceState(null, "", `#${encodeURIComponent(heading.id)}`);
    });

    item.append(link);
    list.append(item);
  });
  panel.append(list);

  button.addEventListener("click", () => {
    const shouldOpen = panel.hidden;
    panel.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", String(shouldOpen));
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !panel.contains(event.target) && event.target !== button) {
      closeToc(panel, button);
    }
  }, { signal: createRemovalSignal(panel) });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      closeToc(panel, button);
      button.focus();
    }
  }, { signal: createRemovalSignal(panel) });
}

function closeToc(panel, button) {
  panel.hidden = true;
  button.setAttribute("aria-expanded", "false");
}

function createRemovalSignal(element) {
  const controller = new AbortController();
  const observer = new MutationObserver(() => {
    if (!element.isConnected) {
      controller.abort();
      observer.disconnect();
    }
  });
  observer.observe(elements.contentPanel, { childList: true });
  return controller.signal;
}

function showStatus(message, isError = false) {
  const status = document.createElement("p");
  status.className = `status${isError ? " error" : ""}`;
  status.textContent = message;
  elements.contentPanel.replaceChildren(status);
}

function createFriendlyError(error, path) {
  if (error.status === 404) {
    return `日記が見つかりません: ${path}`;
  }

  if (error.status === 401) {
    return "認証に失敗しました。アクセストークンを確認してください。";
  }

  if (error.status === 403) {
    return "アクセスが拒否されました。トークンの対象リポジトリとContents読み取り権限を確認してください。";
  }

  if (error instanceof TypeError) {
    return "GitHub APIへ接続できませんでした。通信状態やブラウザの制限を確認してください。";
  }

  return `日記の読み込みに失敗しました。${error.message || ""}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDate(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatJapaneseDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}
