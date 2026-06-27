/**
 * FinTrack — Dashboard
 * Reads expenses from the same localStorage as the Expenses page.
 */

(function () {
  'use strict';

  // ===== Constants =====
  const STORAGE_KEY = 'fintrack_expenses';
  const THEME_KEY = 'fintrack_theme';

  // ===== Dark Mode (shared logic) =====
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

  // Apply immediately
  applyTheme(getPreferredTheme());

  // ===== Category Config =====
  const CATEGORY_LABELS = {
    'groceries': 'Groceries',
    'dining-out': 'Dining Out',
    'transport': 'Transport',
    'entertainment': 'Entertainment',
    'utilities': 'Utilities',
    'healthcare': 'Healthcare',
    'shopping': 'Shopping',
    'other': 'Other',
  };

  const CATEGORY_COLORS = {
    'groceries':     '#0d9488',
    'dining-out':    '#ea580c',
    'transport':     '#2563eb',
    'entertainment': '#16a34a',
    'utilities':     '#7c3aed',
    'healthcare':    '#dc2626',
    'shopping':      '#d97706',
    'other':         '#64748b',
  };

  const CATEGORY_ICONS = {
    'groceries':     '🛒',
    'dining-out':    '🍽️',
    'transport':     '🚌',
    'entertainment': '🎬',
    'utilities':     '⚡',
    'healthcare':    '🏥',
    'shopping':      '🛍️',
    'other':         '📦',
  };

  const CATEGORY_ICON_BG = {
    'groceries':     { bg: '#ccfbf1', dark: '#134e4a' },
    'dining-out':    { bg: '#fff7ed', dark: '#431407' },
    'transport':     { bg: '#dbeafe', dark: '#1e3a5f' },
    'entertainment': { bg: '#dcfce7', dark: '#14532d' },
    'utilities':     { bg: '#ede9fe', dark: '#2e1065' },
    'healthcare':    { bg: '#fee2e2', dark: '#450a0a' },
    'shopping':      { bg: '#fef3c7', dark: '#451a03' },
    'other':         { bg: '#f1f5f9', dark: '#334155' },
  };

  // ===== DOM Helpers =====
  const $ = (id) => document.getElementById(id);

  // ===== Data Layer =====
  function loadExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // ===== Formatting =====
  function formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ===== Stats Cards =====
  function renderStats(expenses) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // This month total
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    const lm = thisMonth === 0 ? 11 : thisMonth - 1;
    const ly = thisMonth === 0 ? thisYear - 1 : thisYear;

    expenses.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        thisMonthTotal += Number(e.amount);
      }
      if (d.getMonth() === lm && d.getFullYear() === ly) {
        lastMonthTotal += Number(e.amount);
      }
    });

    $('statThisMonth').textContent = formatCurrency(thisMonthTotal);

    // Month change
    const changeEl = $('statMonthChange');
    if (lastMonthTotal > 0) {
      const pct = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1);
      const isNeg = pct < 0;
      $('monthChangeText').textContent = `${isNeg ? '' : '+'}${pct}% vs last month`;
      changeEl.className = 'stat-card__change' + (isNeg ? ' negative' : '');
      changeEl.querySelector('.arrow').textContent = isNeg ? '↘' : '↗';
    } else {
      $('monthChangeText').textContent = 'No data last month';
      changeEl.className = 'stat-card__change';
    }

    // All time
    const allTimeTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    $('statAllTime').textContent = formatCurrency(allTimeTotal);
    $('statTotalCount').textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;

    // Average
    const avg = expenses.length > 0 ? allTimeTotal / expenses.length : 0;
    $('statAverage').textContent = formatCurrency(avg);
    const uniqueCats = new Set(expenses.map((e) => e.category)).size;
    $('statCategoryCount').textContent = `${uniqueCats} categor${uniqueCats !== 1 ? 'ies' : 'y'}`;

    // Highest
    if (expenses.length > 0) {
      const highest = expenses.reduce((max, e) => Number(e.amount) > Number(max.amount) ? e : max, expenses[0]);
      $('statHighest').textContent = formatCurrency(highest.amount);
      $('statHighestCat').textContent = CATEGORY_LABELS[highest.category] || highest.category;
    }
  }

  // ===== Pie Chart =====
  function renderPieChart(expenses) {
    // Aggregate by category
    const catTotals = {};
    expenses.forEach((e) => {
      const cat = e.category || 'other';
      catTotals[cat] = (catTotals[cat] || 0) + Number(e.amount);
    });

    const total = Object.values(catTotals).reduce((s, v) => s + v, 0);
    $('chartCenterAmount').textContent = formatCurrency(total);

    // Sort by amount descending
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    // SVG donut chart
    const svg = $('pieChart');
    svg.innerHTML = '';

    const cx = 100;
    const cy = 100;
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', cx);
    bgCircle.setAttribute('cy', cy);
    bgCircle.setAttribute('r', radius);
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', 'var(--color-border)');
    bgCircle.setAttribute('stroke-width', '30');
    svg.appendChild(bgCircle);

    sorted.forEach(([cat, amount]) => {
      const pct = total > 0 ? amount / total : 0;
      const dashLength = pct * circumference;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', CATEGORY_COLORS[cat] || '#64748b');
      circle.setAttribute('stroke-width', '30');
      circle.setAttribute('stroke-dasharray', `${dashLength} ${circumference - dashLength}`);
      circle.setAttribute('stroke-dashoffset', `${-accumulatedOffset}`);
      circle.setAttribute('stroke-linecap', 'butt');
      circle.style.opacity = '0';
      circle.style.transition = 'opacity 0.5s ease';

      svg.appendChild(circle);

      // Animate in
      setTimeout(() => {
        circle.style.opacity = '1';
      }, 50);

      accumulatedOffset += dashLength;
    });

    // Legend
    const legendEl = $('chartLegend');
    legendEl.innerHTML = sorted.map(([cat, amount]) => {
      const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
      return `
        <div class="legend-item">
          <span class="legend-dot" style="background:${CATEGORY_COLORS[cat] || '#64748b'}"></span>
          <div class="legend-info">
            <span class="legend-name">${CATEGORY_LABELS[cat] || cat}</span>
            <span class="legend-value">${formatCurrency(amount)} · ${pct}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== Recent Expenses =====
  function renderRecent(expenses) {
    // Sort by date descending, take 5
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const listEl = $('recentList');
    const emptyEl = $('recentEmpty');

    if (sorted.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    listEl.innerHTML = sorted.map((e) => {
      const cat = e.category || 'other';
      const iconBg = CATEGORY_ICON_BG[cat] || CATEGORY_ICON_BG['other'];
      const bg = isDark ? iconBg.dark : iconBg.bg;

      return `
        <div class="recent-item">
          <div class="recent-item__icon" style="background:${bg}">
            ${CATEGORY_ICONS[cat] || '📦'}
          </div>
          <div class="recent-item__details">
            <div class="recent-item__title">${escapeHtml(e.note) || CATEGORY_LABELS[cat]}</div>
            <div class="recent-item__meta">
              <span>${formatDate(e.date)}</span>
              <span>·</span>
              <span>${CATEGORY_LABELS[cat]}</span>
            </div>
          </div>
          <div class="recent-item__amount">${formatCurrency(e.amount)}</div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Init =====
  function init() {
    const expenses = loadExpenses();

    renderStats(expenses);
    renderPieChart(expenses);
    renderRecent(expenses);

    // Theme toggle
    $('themeToggle').addEventListener('click', () => {
      toggleTheme();
      // Re-render recent to update icon backgrounds
      renderRecent(loadExpenses());
    });

    // System theme change
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
        renderRecent(loadExpenses());
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
