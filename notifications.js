/**
 * FinTrack — Browser Notifications System
 * Handles daily reminders (8 PM) and spending spike alerts.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'fintrack_session_user';
  const activeUser = localStorage.getItem(SESSION_KEY);
  
  if (!activeUser) return;

  const PREF_REMINDER = `fintrack_notif_reminder_${activeUser}`;
  const PREF_ALERTS = `fintrack_notif_alerts_${activeUser}`;
  const LAST_REMINDER_DATE = `fintrack_last_reminder_${activeUser}`;

  let reminderInterval = null;

  function t(key, params = {}) {
    return window.getTranslation ? window.getTranslation(key, params) : key;
  }

  // ===== Permission Management =====
  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications.');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  function showInAppToast(msg, type = 'success') {
    // Attempt to use the dashboard/app.js showToast if available, else fallback
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ===== Preferences =====
  function isReminderEnabled() {
    return localStorage.getItem(PREF_REMINDER) === 'true';
  }

  function isAlertsEnabled() {
    return localStorage.getItem(PREF_ALERTS) === 'true';
  }

  async function setReminder(enabled) {
    if (enabled) {
      const granted = await requestPermission();
      if (!granted) {
        showInAppToast(t('notif_permission_denied'), 'error');
        return false;
      }
    }
    localStorage.setItem(PREF_REMINDER, enabled);
    if (enabled) startReminderScheduler();
    else stopReminderScheduler();
    return true;
  }

  async function setAlerts(enabled) {
    if (enabled) {
      const granted = await requestPermission();
      if (!granted) {
        showInAppToast(t('notif_permission_denied'), 'error');
        return false;
      }
    }
    localStorage.setItem(PREF_ALERTS, enabled);
    return true;
  }

  // ===== Daily Reminder (8 PM) =====
  function checkDailyReminder() {
    if (!isReminderEnabled() || Notification.permission !== 'granted') return;

    const now = new Date();
    // Only check if it's past 8 PM (20:00)
    if (now.getHours() < 20) return;

    const todayStr = now.toISOString().slice(0, 10);
    const lastReminder = localStorage.getItem(LAST_REMINDER_DATE);

    if (lastReminder === todayStr) return; // Already reminded today

    // Check if any expenses were logged today
    try {
      const STORAGE_KEY = `fintrack_expenses_${activeUser}`;
      const raw = localStorage.getItem(STORAGE_KEY);
      const expenses = raw ? JSON.parse(raw) : [];
      
      const loggedToday = expenses.some(e => e.date === todayStr);
      if (!loggedToday) {
        new Notification(t('notif_reminder_title'), {
          body: t('notif_reminder_body'),
          icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzBkOTQ4OCIgZD0iTTEyIDJhMTAgMTAgMCAxIDAgMTAgMTAgMTAgMTAgMCAwIDAtMTAtMTB6bTAgMThhOCA4IDAgMSAxIDgtOCA4IDggMCAwIDEtOCA4em0xLTdoLTJWN2gyeiIvPjwvc3ZnPg=='
        });
        localStorage.setItem(LAST_REMINDER_DATE, todayStr);
      }
    } catch (e) {
      console.error('Failed to check expenses for reminder', e);
    }
  }

  function startReminderScheduler() {
    stopReminderScheduler();
    // Check immediately, then every hour
    checkDailyReminder();
    reminderInterval = setInterval(checkDailyReminder, 60 * 60 * 1000);
  }

  function stopReminderScheduler() {
    if (reminderInterval) {
      clearInterval(reminderInterval);
      reminderInterval = null;
    }
  }

  // ===== Spending Spike Alert =====
  function checkSpendingSpike() {
    if (!isAlertsEnabled() || Notification.permission !== 'granted') return;

    try {
      const STORAGE_KEY = `fintrack_expenses_${activeUser}`;
      const raw = localStorage.getItem(STORAGE_KEY);
      const expenses = raw ? JSON.parse(raw) : [];
      if (expenses.length === 0) return;

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      
      // Calculate 30-day average
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let past30Total = 0;
      let todayTotal = 0;

      expenses.forEach(e => {
        const d = new Date(e.date + 'T00:00:00');
        const amt = Number(e.amount);
        if (e.date === todayStr) {
          todayTotal += amt;
        }
        if (d >= thirtyDaysAgo && d <= now) {
          past30Total += amt;
        }
      });

      // Avoid divide by zero, assume at least 1 day
      const dailyAvg = (past30Total - todayTotal) / 30 || 1; 

      // Spike defined as today's spending > 150% of daily avg AND today > $50
      if (todayTotal > 50 && todayTotal > dailyAvg * 1.5) {
        const pct = Math.round(((todayTotal - dailyAvg) / dailyAvg) * 100);
        
        // Prevent duplicate alerts for the same day (store a flag)
        const SPIKE_FLAG = `fintrack_spike_alert_${activeUser}_${todayStr}`;
        if (!localStorage.getItem(SPIKE_FLAG)) {
          new Notification(t('notif_spike_title'), {
            body: t('notif_spike_body', { 
              amount: window.formatCurrency ? window.formatCurrency(todayTotal) : '$' + todayTotal, 
              pct 
            }),
            icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2RiMjcyNyIgZD0iTTEgMjF2LTJoMjJ2MmgtMjJ6bTMtMTZsMi41LTIuNSA1IDUgNSA1IDUuNS01LjUgMS41IDEuNS03IDctNS01LTUtNXoiLz48L3N2Zz4='
          });
          localStorage.setItem(SPIKE_FLAG, 'true');
        }
      }

    } catch (e) {
      console.error('Failed to check spending spike', e);
    }
  }

  // ===== Initialization =====
  function init() {
    if (isReminderEnabled()) {
      startReminderScheduler();
    }
  }

  // Export globally
  window.fintrackNotify = {
    isReminderEnabled,
    isAlertsEnabled,
    setReminder,
    setAlerts,
    checkSpendingSpike
  };

  // Start scheduler if needed
  init();

})();
