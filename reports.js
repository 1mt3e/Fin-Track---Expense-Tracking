/**
 * FinTrack — Reports Page Logic
 * Handles period selection, data aggregation, Chart.js trend chart,
 * category breakdown table, CSV export, and comparison analytics.
 */
(function () {
  'use strict';

  // ===== Auth Guard =====
  const SESSION_KEY = 'fintrack_session_user';
  const activeUser = localStorage.getItem(SESSION_KEY);
  if (!activeUser) {
    window.location.href = 'login.html';
    return;
  }

  // ===== Constants =====
  const STORAGE_KEY = `fintrack_expenses_${activeUser}`;
  const THEME_KEY = 'fintrack_theme';
  const API_KEY_NAME = `fintrack_gemini_api_key_${activeUser}`;

  const CATEGORY_LABELS = {
    'groceries': 'Groceries', 'dining-out': 'Dining Out', 'transport': 'Transport',
    'entertainment': 'Entertainment', 'utilities': 'Utilities', 'healthcare': 'Healthcare',
    'shopping': 'Shopping', 'other': 'Other',
  };
  const CATEGORY_ICONS = {
    'groceries': '🛒', 'dining-out': '🍔', 'transport': '🚗', 'entertainment': '🎬',
    'utilities': '💡', 'healthcare': '🏥', 'shopping': '🛍️', 'other': '📦',
  };
  const CATEGORY_COLORS = {
    'groceries': '#0f766e', 'dining-out': '#9a3412', 'transport': '#1e40af',
    'entertainment': '#15803d', 'utilities': '#5b21b6', 'healthcare': '#991b1b',
    'shopping': '#92400e', 'other': '#64748b',
  };

  // ===== Dark Mode =====
  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }
  applyTheme(getPreferredTheme());

  // ===== DOM Helpers =====
  const $ = (id) => document.getElementById(id);

  // ===== Formatting =====
  function formatCurrency(amount) {
    return window.formatCurrency ? window.formatCurrency(amount) : '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatDate(dateStr) {
    return window.formatDate ? window.formatDate(dateStr) : new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function getCategoryLabel(cat) {
    return window.getCategoryLabel ? window.getCategoryLabel(cat) : (CATEGORY_LABELS[cat] || cat);
  }
  function t(key, params) {
    return window.getTranslation ? window.getTranslation(key, params) : key;
  }

  // ===== Data Layer =====
  function loadExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  // ===== Period Logic =====
  let currentPeriod = 'week';

  function getPeriodRange(period, offset = 0) {
    const now = new Date();
    let start, end;

    if (period === 'week') {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day + (offset * 7));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      start = new Date(now.getFullYear() + offset, 0, 1);
      end = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999);
    }

    return { start, end };
  }

  function filterByRange(expenses, start, end) {
    return expenses.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d >= start && d <= end;
    });
  }

  function daysBetween(start, end) {
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  }

  // ===== Data Aggregation =====
  function aggregateByCategory(expenses) {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || 'other';
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += Number(e.amount);
      map[cat].count++;
    });
    return Object.entries(map)
      .map(([cat, data]) => ({ cat, ...data, avg: data.total / data.count }))
      .sort((a, b) => b.total - a.total);
  }

  function aggregateByDay(expenses, start, end) {
    const map = {};
    // Initialize all days in range
    const d = new Date(start);
    while (d <= end) {
      const key = d.toISOString().slice(0, 10);
      map[key] = 0;
      d.setDate(d.getDate() + 1);
    }
    expenses.forEach(e => {
      if (map[e.date] !== undefined) {
        map[e.date] += Number(e.amount);
      }
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }

  function aggregateByMonth(expenses, start, end) {
    const map = {};
    const d = new Date(start);
    while (d <= end) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = 0;
      d.setMonth(d.getMonth() + 1);
    }
    expenses.forEach(e => {
      const ed = new Date(e.date + 'T00:00:00');
      const key = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}`;
      if (map[key] !== undefined) {
        map[key] += Number(e.amount);
      }
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }

  // ===== Rendering =====
  let trendChartInstance = null;

  function updateReport() {
    const expenses = loadExpenses();
    const { start, end } = getPeriodRange(currentPeriod, 0);
    const { start: prevStart, end: prevEnd } = getPeriodRange(currentPeriod, -1);

    const current = filterByRange(expenses, start, end);
    const previous = filterByRange(expenses, prevStart, prevEnd);

    const currentTotal = current.reduce((s, e) => s + Number(e.amount), 0);
    const previousTotal = previous.reduce((s, e) => s + Number(e.amount), 0);
    const days = daysBetween(start, Math.min(end, new Date()));
    const avgPerDay = days > 0 ? currentTotal / days : 0;

    // Stat cards
    $('reportTotalSpent').textContent = formatCurrency(currentTotal);
    $('reportAvgPerDay').textContent = formatCurrency(avgPerDay);
    $('reportTxnCount').textContent = current.length;

    // Top category
    const catData = aggregateByCategory(current);
    if (catData.length > 0) {
      $('reportTopCategory').textContent = getCategoryLabel(catData[0].cat);
    } else {
      $('reportTopCategory').textContent = '—';
    }

    // Change indicators
    renderChangeIndicator('reportTotalChange', currentTotal, previousTotal);
    const prevDays = daysBetween(prevStart, prevEnd);
    const prevAvg = prevDays > 0 ? previousTotal / prevDays : 0;
    renderChangeIndicator('reportAvgChange', avgPerDay, prevAvg);

    // Comparison section
    $('compCurrent').textContent = formatCurrency(currentTotal);
    $('compPrevious').textContent = formatCurrency(previousTotal);
    renderComparisonChange(currentTotal, previousTotal);

    // Breakdown table
    renderBreakdownTable(catData, currentTotal);

    // Trend chart
    renderTrendChart(current, start, end);
  }

  function renderChangeIndicator(elId, current, previous) {
    const el = $(elId);
    if (!el) return;
    if (previous === 0 && current === 0) {
      el.textContent = '';
      el.className = 'stat-card__change';
      return;
    }
    if (previous === 0) {
      el.textContent = '↑ New';
      el.className = 'stat-card__change';
      return;
    }
    const pct = (((current - previous) / previous) * 100).toFixed(1);
    const sign = pct >= 0 ? '+' : '';
    const arrow = pct >= 0 ? '↑' : '↓';
    el.textContent = `${arrow} ${sign}${pct}%`;
    el.className = `stat-card__change ${pct >= 0 ? '' : 'negative'}`;
  }

  function renderComparisonChange(current, previous) {
    const el = $('compChange');
    if (!el) return;
    if (previous === 0 && current === 0) {
      el.textContent = '—';
      el.className = 'comparison-card__value comparison-card__change';
      return;
    }
    if (previous === 0) {
      el.textContent = '▲ New';
      el.className = 'comparison-card__value comparison-card__change positive';
      return;
    }
    const diff = current - previous;
    const pct = ((diff / previous) * 100).toFixed(1);
    const isUp = diff >= 0;
    el.textContent = `${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${pct}%`;
    // For spending: up is bad (negative/red), down is good (green)
    el.className = `comparison-card__value comparison-card__change ${isUp ? 'negative' : 'positive'}`;
  }

  function renderBreakdownTable(catData, total) {
    const tbody = $('breakdownBody');
    const emptyEl = $('reportEmpty');
    const tableWrap = document.querySelector('.breakdown-table-wrap');

    if (catData.length === 0) {
      tbody.innerHTML = '';
      if (tableWrap) tableWrap.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }

    if (tableWrap) tableWrap.style.display = '';
    emptyEl.style.display = 'none';

    tbody.innerHTML = catData.map(row => {
      const pct = total > 0 ? ((row.total / total) * 100).toFixed(1) : 0;
      const color = CATEGORY_COLORS[row.cat] || '#64748b';
      const icon = CATEGORY_ICONS[row.cat] || '📦';

      return `
        <tr>
          <td>
            <div class="breakdown-cat">
              <span class="breakdown-cat__icon">${icon}</span>
              <span>${getCategoryLabel(row.cat)}</span>
            </div>
          </td>
          <td class="breakdown-amount">${formatCurrency(row.total)}</td>
          <td>
            <div class="percent-bar-wrap">
              <div class="percent-bar">
                <div class="percent-bar__fill" style="width:${pct}%; background:${color}"></div>
              </div>
              <span class="percent-bar__label">${pct}%</span>
            </div>
          </td>
          <td class="breakdown-count">${row.count}</td>
          <td class="breakdown-avg">${formatCurrency(row.avg)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderTrendChart(expenses, start, end) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const isYear = currentPeriod === 'year';

    let dataPoints;
    if (isYear) {
      dataPoints = aggregateByMonth(expenses, start, end);
    } else {
      dataPoints = aggregateByDay(expenses, start, end);
    }

    const labels = dataPoints.map(([key]) => {
      if (isYear) {
        const [y, m] = key.split('-');
        const d = new Date(Number(y), Number(m) - 1, 1);
        return d.toLocaleDateString(window.i18n && window.i18n.getLanguage() === 'vi' ? 'vi-VN' : 'en-US', { month: 'short' });
      } else {
        const d = new Date(key + 'T00:00:00');
        return d.toLocaleDateString(window.i18n && window.i18n.getLanguage() === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' });
      }
    });
    const values = dataPoints.map(([, val]) => val);

    const ctx = $('trendChart');
    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, isDark ? 'rgba(20, 184, 166, 0.3)' : 'rgba(13, 148, 136, 0.15)');
    gradient.addColorStop(1, isDark ? 'rgba(20, 184, 166, 0)' : 'rgba(13, 148, 136, 0)');

    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: t('report_total_spent'),
          data: values,
          fill: true,
          backgroundColor: gradient,
          borderColor: isDark ? '#14b8a6' : '#0d9488',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: isDark ? '#14b8a6' : '#0d9488',
          tension: 0.35,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
            ticks: {
              color: isDark ? '#94a3b8' : '#64748b',
              font: { size: 11 },
              callback: (val) => formatCurrency(val)
            }
          }
        }
      }
    });
  }

  // ===== CSV Export =====
  function exportCSV() {
    const expenses = loadExpenses();
    const { start, end } = getPeriodRange(currentPeriod, 0);
    const filtered = filterByRange(expenses, start, end);

    if (filtered.length === 0) {
      showToast(t('report_no_data'), 'error');
      return;
    }

    const BOM = '\uFEFF';
    const headers = ['Date', 'Category', 'Note', 'Amount', 'Tags'];
    const rows = filtered.map(e => [
      e.date,
      getCategoryLabel(e.category || 'other'),
      `"${(e.note || '').replace(/"/g, '""')}"`,
      e.amount,
      (e.tags || []).join('; ')
    ]);

    const csv = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack_report_${currentPeriod}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
  }

  // ===== Toast =====
  function showToast(message, type = 'success') {
    const container = $('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ===== Settings =====
  const settingsModal = $('settingsModal');
  const apiKeyInput = $('apiKeyInput');
  const btnToggleKeyVisibility = $('btnToggleKeyVisibility');

  function openSettings() {
    apiKeyInput.value = localStorage.getItem(API_KEY_NAME) || '';
    if (window.i18n) {
      $('langInput').value = window.i18n.getLanguage();
      $('currencyInput').value = window.i18n.getCurrency();
    }
    // Load notification prefs
    if (window.fintrackNotify) {
      $('notifReminder').checked = window.fintrackNotify.isReminderEnabled();
      $('notifAlerts').checked = window.fintrackNotify.isAlertsEnabled();
    }
    settingsModal.classList.add('active');
  }

  function closeSettings() {
    settingsModal.classList.remove('active');
  }

  function saveSettings() {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem(API_KEY_NAME, key);
    } else {
      localStorage.removeItem(API_KEY_NAME);
    }

    if (window.i18n) {
      window.i18n.setLanguage($('langInput').value);
      window.i18n.setCurrency($('currencyInput').value);
      window.i18n.translatePage();
    }

    // Save notification prefs
    if (window.fintrackNotify) {
      window.fintrackNotify.setReminder($('notifReminder').checked);
      window.fintrackNotify.setAlerts($('notifAlerts').checked);
    }

    showToast(t('toast_settings_saved'), 'success');
    closeSettings();
    updateReport();
  }

  function toggleKeyVisibility() {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    btnToggleKeyVisibility.textContent = isPassword ? '🙈' : '👁️';
  }

  // ===== Init =====
  function init() {
    if (window.translatePage) window.translatePage();

    // User profile
    const userProfile = $('userProfile');
    const userEmailDisplay = $('userEmailDisplay');
    if (userProfile && userEmailDisplay) {
      userEmailDisplay.textContent = activeUser;
      userProfile.style.display = 'flex';
    }
    $('btnLogout')?.addEventListener('click', () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = 'login.html';
    });

    // Theme
    $('themeToggle').addEventListener('click', () => {
      toggleTheme();
      updateReport();
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
        updateReport();
      }
    });

    // Period selector
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPeriod = btn.getAttribute('data-period');
        updateReport();
      });
    });

    // Export
    $('btnExportCsv')?.addEventListener('click', exportCSV);
    $('btnPrint')?.addEventListener('click', () => window.print());

    // Settings
    $('btnOpenSettings').addEventListener('click', openSettings);
    $('btnCloseSettings').addEventListener('click', closeSettings);
    $('btnCancelSettings').addEventListener('click', closeSettings);
    $('btnSaveApiKey').addEventListener('click', saveSettings);
    btnToggleKeyVisibility.addEventListener('click', toggleKeyVisibility);
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal.classList.contains('active')) closeSettings();
    });

    // Initial render
    updateReport();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
