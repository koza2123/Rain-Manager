
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "rain-cycle") return;

  const data = await chrome.storage.local.get([
    "running",
    "interval",
    "logs"
  ]);

  if (!data.running) return;

  const logs = data.logs || [];

  logs.unshift({
    message: "Scheduled cycle reached — website integration pending",
    time: new Date().toLocaleTimeString()
  });

  await chrome.storage.local.set({
    logs: logs.slice(0, 50),
    nextRunAt: Date.now() +
      (data.interval || 60) * 60000
  });
});
