
const $ = (id) => document.getElementById(id);

let timerInterval;

async function addLog(message) {
  const data = await chrome.storage.local.get("logs");
  const logs = data.logs || [];

  logs.unshift({
    message,
    time: new Date().toLocaleTimeString()
  });

  await chrome.storage.local.set({
    logs: logs.slice(0, 50)
  });

  renderLogs();
}

async function renderLogs() {
  const data = await chrome.storage.local.get("logs");
  const logs = data.logs || [];
  const container = $("logs");

  container.replaceChildren();

  if (!logs.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No activity yet.";
    container.appendChild(empty);
    return;
  }

  logs.forEach(log => {
    const item = document.createElement("div");
    item.className = "log";
    item.textContent = `${log.time} — ${log.message}`;
    container.appendChild(item);
  });
}

async function updateTimer() {
  const data = await chrome.storage.local.get([
    "nextRunAt",
    "running"
  ]);

  if (!data.running || !data.nextRunAt) {
    $("timer").textContent = "--:--:--";
    return;
  }

  const remaining = Math.max(
    0,
    data.nextRunAt - Date.now()
  );

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor(
    (remaining % 3600000) / 60000
  );
  const seconds = Math.floor(
    (remaining % 60000) / 1000
  );

  $("timer").textContent = [
    hours,
    minutes,
    seconds
  ].map(n => String(n).padStart(2, "0")).join(":");
}

async function loadSettings() {
  const data = await chrome.storage.local.get([
    "website",
    "number",
    "interval",
    "running"
  ]);

  $("website").value = data.website || "";
  $("number").value = data.number ?? "";
  $("interval").value = String(data.interval || 60);

  $("status").textContent =
    data.running ? "SCHEDULED" : "OFFLINE";

  $("status").style.color =
    data.running ? "#38df9a" : "#ff6868";

  await renderLogs();
  await updateTimer();

  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
}

$("start").addEventListener("click", async () => {
  const website = $("website").value.trim();
  const number = $("number").value.trim();
  const interval = Number($("interval").value);

  try {
    const parsed = new URL(website);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    alert("Enter a valid website URL.");
    return;
  }

  if (number === "" || !Number.isFinite(Number(number))) {
    alert("Enter a valid number.");
    return;
  }

  await chrome.storage.local.set({
    website,
    number,
    interval,
    running: true,
    nextRunAt: Date.now() + interval * 60000
  });

  await chrome.alarms.clear("rain-cycle");

  await chrome.alarms.create("rain-cycle", {
    delayInMinutes: interval,
    periodInMinutes: interval
  });

  await addLog("Schedule started");
  await loadSettings();
});

$("stop").addEventListener("click", async () => {
  await chrome.alarms.clear("rain-cycle");

  await chrome.storage.local.set({
    running: false,
    nextRunAt: null
  });

  await addLog("Schedule stopped");
  await loadSettings();
});

$("clear").addEventListener("click", async () => {
  await chrome.storage.local.set({ logs: [] });
  await renderLogs();
});

chrome.storage.onChanged.addListener(() => {
  renderLogs();
  updateTimer();
});

loadSettings();
