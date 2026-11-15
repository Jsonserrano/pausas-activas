// alarmScheduler.js

const timeouts = new Set();

// Programar una alarma en ms
function setAlarm(delayMs, callback) {
  const t = setTimeout(() => {
    try { callback(); } finally { timeouts.delete(t); }
  }, delayMs);
  timeouts.add(t);
  return t;
}

function clearAlarm(timeoutId) {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeouts.delete(timeoutId);
    return true;
  }
  return false;
}

function clearAllAlarms() {
  for (const t of timeouts) clearTimeout(t);
  timeouts.clear();
}

module.exports = {
  setAlarm,
  clearAlarm,
  clearAllAlarms,
};
