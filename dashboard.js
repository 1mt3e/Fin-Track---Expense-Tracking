/**
 * FinTrack — Dashboard
 * Reads and manages expenses with Chart.js visualization.
 */

(function () {
  'use strict';

  // ===== Session Verification / Auth Guard =====
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
    'groceries':     '#0f766e',
    'dining-out':    '#9a3412',
    'transport':     '#1e40af',
    'entertainment': '#15803d',
    'utilities':     '#5b21b6',
    'healthcare':    '#991b1b',
    'shopping':      '#92400e',
    'other':         '#334155',
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

  // ===== DOM References =====
  // Modal elements
  const expenseModal = $('expenseModal');
  const modalTitle = $('modalTitle');
  const expenseForm = $('expenseForm');
  const expenseId = $('expenseId');
  const expenseAmount = $('expenseAmount');
  const expenseCategory = $('expenseCategory');
  const expenseDate = $('expenseDate');
  const expenseNote = $('expenseNote');
  const amountError = $('amountError');
  const btnSaveExpense = $('btnSaveExpense');

  // Settings modal elements
  const settingsModal = $('settingsModal');
  const btnOpenSettings = $('btnOpenSettings');
  const btnCloseSettings = $('btnCloseSettings');
  const btnCancelSettings = $('btnCancelSettings');
  const btnSaveApiKey = $('btnSaveApiKey');
  const apiKeyInput = $('apiKeyInput');
  const btnToggleKeyVisibility = $('btnToggleKeyVisibility');

  // AI elements
  const btnAiCategorize = $('btnAiCategorize');
  const aiSuggestion = $('aiSuggestion');
  const aiSuggestionText = $('aiSuggestionText');
  const btnAcceptSuggestion = $('btnAcceptSuggestion');
  const btnDismissSuggestion = $('btnDismissSuggestion');
  const aiError = $('aiError');

  // Delete modal
  const deleteModal = $('deleteModal');
  let pendingDeleteId = null;
  let activeSuggestionValue = null;

  // Chart instances
  let categoryChartInstance = null;
  let monthlyTrendChartInstance = null;

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

  // Apply theme immediately to prevent flash
  applyTheme(getPreferredTheme());

  // ===== Data Layer =====
  function loadExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveExpenses(expenses) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ===== Formatting =====
  function formatCurrency(amount) {
    return window.formatCurrency ? window.formatCurrency(amount) : '$' + Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(dateStr) {
    return window.formatDate ? window.formatDate(dateStr) : new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getCategoryLabel(cat) {
    return window.getCategoryLabel ? window.getCategoryLabel(cat) : (CATEGORY_LABELS[cat] || cat);
  }

  // ===== Toast Notifications =====
  function showToast(message, type = 'success') {
    const container = $('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ===== Modal Management =====
  function updateAmountLabel() {
    const label = $('amountLabel');
    if (!label) return;
    const currency = window.i18n ? window.i18n.getCurrency() : 'USD';
    const amountText = window.getTranslation ? window.getTranslation('amount_label') : 'Amount';
    label.textContent = `${amountText} (${currency === 'VND' ? '₫' : '$'})`;
  }

  function openModal(mode = 'add', expense = null) {
    clearValidation();
    if (aiSuggestion) aiSuggestion.style.display = 'none';
    if (aiError) aiError.style.display = 'none';
    updateAmountLabel();

    if (mode === 'edit' && expense) {
      modalTitle.textContent = window.getTranslation ? window.getTranslation('modal_edit_title') : 'Edit Expense';
      btnSaveExpense.textContent = window.getTranslation ? window.getTranslation('save') : 'Update Expense';
      expenseId.value = expense.id;
      expenseAmount.value = expense.amount;
      expenseCategory.value = expense.category;
      expenseDate.value = expense.date;
      expenseNote.value = expense.note;
    } else {
      modalTitle.textContent = window.getTranslation ? window.getTranslation('modal_add_title') : 'Add New Expense';
      btnSaveExpense.textContent = window.getTranslation ? window.getTranslation('save') : 'Save Expense';
      expenseForm.reset();
      expenseId.value = '';
      expenseDate.value = new Date().toISOString().slice(0, 10);
    }
    expenseModal.classList.add('active');
    setTimeout(() => expenseAmount.focus(), 200);
  }

  function closeModal() {
    expenseModal.classList.remove('active');
  }

  function openDeleteDialog(id) {
    pendingDeleteId = id;
    deleteModal.classList.add('active');
  }

  function closeDeleteDialog() {
    pendingDeleteId = null;
    deleteModal.classList.remove('active');
  }

  // ===== Validation =====
  function clearValidation() {
    expenseAmount.classList.remove('error');
    amountError.classList.remove('visible');
  }

  function validateForm() {
    let valid = true;
    clearValidation();

    const amt = parseFloat(expenseAmount.value);
    if (isNaN(amt) || amt <= 0 || expenseAmount.value.trim() === '') {
      expenseAmount.classList.add('error');
      amountError.classList.add('visible');
      valid = false;
    }

    return valid;
  }

  // ===== Settings Management =====
  function openSettings() {
    apiKeyInput.value = localStorage.getItem(API_KEY_NAME) || '';
    if (window.i18n) {
      $('langInput').value = window.i18n.getLanguage();
      $('currencyInput').value = window.i18n.getCurrency();
    }
    settingsModal.classList.add('active');
  }

  function closeSettings() {
    settingsModal.classList.remove('active');
  }

  function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem(API_KEY_NAME, key);
    } else {
      localStorage.removeItem(API_KEY_NAME);
    }

    if (window.i18n) {
      const selectedLang = $('langInput').value;
      const selectedCurrency = $('currencyInput').value;
      window.i18n.setLanguage(selectedLang);
      window.i18n.setCurrency(selectedCurrency);
      window.i18n.translatePage();
    }

    const toastMsg = window.getTranslation ? window.getTranslation('toast_settings_saved') : 'Settings saved successfully!';
    showToast(toastMsg, 'success');
    
    closeSettings();
    updateAmountLabel();
    updateDashboard();
  }

  function toggleKeyVisibility() {
    const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
    apiKeyInput.setAttribute('type', type);
    btnToggleKeyVisibility.textContent = type === 'password' ? '👁️' : '🙈';
  }

  // ===== AI Categorization =====
  function classifyOffline(note) {
    const s = note.toLowerCase();
    
    if (s.includes('food') || s.includes('eat') || s.includes('din') || s.includes('lunch') || 
        s.includes('breakfast') || s.includes('restaurant') || s.includes('cafe') || s.includes('pizza') || 
        s.includes('coffee') || s.includes('starbucks') || s.includes('phở') || s.includes('bánh mì') || 
        s.includes('sushi') || s.includes('drink') || s.includes('beer') || s.includes('wine')) {
      if (s.includes('market') || s.includes('supermarket') || s.includes('store') || s.includes('grocery') || 
          s.includes('groceries') || s.includes('whole foods') || s.includes('chợ') || s.includes('coop') || s.includes('vinmart')) {
        return { category: 'groceries', label: 'Groceries' };
      }
      return { category: 'dining-out', label: 'Dining Out' };
    }
    
    if (s.includes('grocery') || s.includes('groceries') || s.includes('milk') || s.includes('bread') || 
        s.includes('vegetable') || s.includes('fruit') || s.includes('meat') || s.includes('egg') || 
        s.includes('supermarket') || s.includes('food land') || s.includes('coop') || s.includes('chợ')) {
      return { category: 'groceries', label: 'Groceries' };
    }

    if (s.includes('bus') || s.includes('taxi') || s.includes('uber') || s.includes('grab') || 
        s.includes('train') || s.includes('subway') || s.includes('gas') || s.includes('petrol') || 
        s.includes('parking') || s.includes('flight') || s.includes('ticket') || s.includes('fare') || 
        s.includes('fuel') || s.includes('xe ôm') || s.includes('vé xe') || s.includes('xăng')) {
      return { category: 'transport', label: 'Transport' };
    }

    if (s.includes('movie') || s.includes('cinema') || s.includes('netflix') || s.includes('spotify') || 
        s.includes('concert') || s.includes('game') || s.includes('play') || s.includes('theater') || 
        s.includes('book') || s.includes('museum') || s.includes('pub') || s.includes('club') || s.includes('karaoke')) {
      return { category: 'entertainment', label: 'Entertainment' };
    }

    if (s.includes('clothes') || s.includes('shoes') || s.includes('shirt') || s.includes('bag') || 
        s.includes('jacket') || s.includes('mall') || s.includes('amazon') || s.includes('ebay') || 
        s.includes('shopee') || s.includes('lazada') || s.includes('gift') || s.includes('present')) {
      return { category: 'shopping', label: 'Shopping' };
    }

    if (s.includes('doctor') || s.includes('dentist') || s.includes('hospital') || s.includes('clinic') || 
        s.includes('medicine') || s.includes('pharmacy') || s.includes('pill') || s.includes('health') || 
        s.includes('insurance') || s.includes('optical') || s.includes('physio')) {
      return { category: 'healthcare', label: 'Healthcare' };
    }

    if (s.includes('electricity') || s.includes('water') || s.includes('gas') || s.includes('internet') || 
        s.includes('wifi') || s.includes('phone bill') || s.includes('rent') || s.includes('apartment') || 
        s.includes('maintenance') || s.includes('fee') || s.includes('tax') || s.includes('tiền điện') || s.includes('tiền nước')) {
      return { category: 'utilities', label: 'Utilities' };
    }
    
    return { category: 'other', label: 'Other' };
  }

  function runOfflineClassification(note, statusMessage) {
    const offlineResult = classifyOffline(note);
    activeSuggestionValue = offlineResult.category;

    aiSuggestionText.innerHTML = `Suggested (Offline): <strong>${offlineResult.label}</strong>`;
    aiSuggestion.style.display = 'flex';

    expenseCategory.value = offlineResult.category;
    showToast(statusMessage, 'success');
  }

  async function handleAiCategorize() {
    const note = expenseNote.value.trim();
    if (!note) {
      showToast('Please enter a note first.', 'error');
      expenseNote.focus();
      return;
    }

    const apiKey = localStorage.getItem(API_KEY_NAME);
    if (!apiKey) {
      runOfflineClassification(note, 'Offline Mode: Suggesting based on keywords.');
      return;
    }

    btnAiCategorize.classList.add('loading');
    btnAiCategorize.disabled = true;
    const originalText = btnAiCategorize.innerHTML;
    btnAiCategorize.innerHTML = '<span class="ai-sparkle">⏳</span> Classifying...';
    aiSuggestion.style.display = 'none';
    aiError.style.display = 'none';

    try {
      async function callGemini(modelName) {
        return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expense assistant. Classify this expense note: "${note}" into the single most appropriate category from this list: Food, Transport, Entertainment, Shopping, Health, Education, Bills, Other. Return ONLY the category name. No other text, markdown formatting, or punctuation.`
              }]
            }]
          })
        });
      }

      let response = await callGemini('gemini-1.5-flash');

      if (!response.ok) {
        console.warn('gemini-1.5-flash call failed, trying gemini-1.5-flash-latest...');
        response = await callGemini('gemini-1.5-flash-latest');
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${response.status} error`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid response structure from Gemini API');
      }

      const suggested = data.candidates[0].content.parts[0].text.trim().replace(/[^\w\s-]/g, '');
      const mappedValue = mapAiCategoryToDropdown(suggested);
      activeSuggestionValue = mappedValue;

      aiSuggestionText.innerHTML = `Suggested: <strong>${suggested}</strong>`;
      aiSuggestion.style.display = 'flex';

      expenseCategory.value = mappedValue;
      showToast(window.getTranslation ? window.getTranslation('toast_ai_categorized_to', { category: getCategoryLabel(mappedValue) }) : `Category set to: ${suggested}`, 'success');
    } catch (err) {
      console.warn('AI API Error, falling back to offline classification:', err);
      runOfflineClassification(note, 'Offline Mode: Suggesting based on keywords.');
    } finally {
      btnAiCategorize.classList.remove('loading');
      btnAiCategorize.disabled = false;
      btnAiCategorize.innerHTML = originalText;
    }
  }

  function mapAiCategoryToDropdown(suggested) {
    const s = suggested.toLowerCase();
    if (s.includes('food') || s.includes('din') || s.includes('grocer') || s.includes('eat')) {
      if (s.includes('din') || s.includes('restaurant') || s.includes('cafe')) {
        return 'dining-out';
      }
      return 'groceries';
    }
    if (s.includes('transport') || s.includes('taxi') || s.includes('subway') || s.includes('bus') || s.includes('ride') || s.includes('fuel') || s.includes('gas')) {
      return 'transport';
    }
    if (s.includes('entertainment') || s.includes('movie') || s.includes('show') || s.includes('game') || s.includes('stream') || s.includes('music')) {
      return 'entertainment';
    }
    if (s.includes('shopping') || s.includes('buy') || s.includes('store') || s.includes('cloth') || s.includes('shoes')) {
      return 'shopping';
    }
    if (s.includes('health') || s.includes('med') || s.includes('dent') || s.includes('doctor') || s.includes('drug') || s.includes('pharm')) {
      return 'healthcare';
    }
    if (s.includes('bill') || s.includes('utilit') || s.includes('elect') || s.includes('water') || s.includes('rent') || s.includes('internet') || s.includes('phone')) {
      return 'utilities';
    }
    return 'other';
  }

  // ===== CRUD Operations =====
  function saveExpenseHandler() {
    if (!validateForm()) return;

    const expenses = loadExpenses();
    const id = expenseId.value;
    const data = {
      amount: parseFloat(parseFloat(expenseAmount.value).toFixed(2)),
      category: expenseCategory.value || 'other',
      date: expenseDate.value || new Date().toISOString().slice(0, 10),
      note: expenseNote.value.trim(),
    };

    if (id) {
      const idx = expenses.findIndex((e) => e.id === id);
      if (idx !== -1) {
        expenses[idx] = { ...expenses[idx], ...data };
      }
      showToast(window.getTranslation ? window.getTranslation('toast_expense_updated') : 'Expense updated successfully!', 'success');
    } else {
      data.id = generateId();
      expenses.push(data);
      showToast(window.getTranslation ? window.getTranslation('toast_expense_added') : 'Expense added successfully!', 'success');
    }

    saveExpenses(expenses);
    closeModal();
    updateDashboard();
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;

    let expenses = loadExpenses();
    expenses = expenses.filter((e) => e.id !== pendingDeleteId);
    saveExpenses(expenses);
    closeDeleteDialog();
    showToast(window.getTranslation ? window.getTranslation('toast_expense_deleted') : 'Expense deleted successfully!', 'success');
    updateDashboard();
  }

  // ===== Stats Cards & Summary Card =====
  function renderStats(expenses) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let thisMonthTotal = 0;
    let thisMonthCount = 0;
    const thisMonthCatTotals = {};

    let allTimeTotal = 0;
    let highestExpense = null;

    expenses.forEach((e) => {
      const amt = Number(e.amount);
      allTimeTotal += amt;

      const d = new Date(e.date + 'T00:00:00');
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        thisMonthTotal += amt;
        thisMonthCount++;
        const cat = e.category || 'other';
        thisMonthCatTotals[cat] = (thisMonthCatTotals[cat] || 0) + amt;
      }

      if (!highestExpense || amt > Number(highestExpense.amount)) {
        highestExpense = e;
      }
    });

    // Update This Month Summary Card
    $('statThisMonth').textContent = formatCurrency(thisMonthTotal);
    $('statTransactionsCount').textContent = thisMonthCount;

    // Find top category
    let topCat = 'None';
    let maxCatVal = -1;
    for (const [cat, val] of Object.entries(thisMonthCatTotals)) {
      if (val > maxCatVal) {
        maxCatVal = val;
        topCat = getCategoryLabel(cat);
      }
    }
    $('statTopCategory').textContent = topCat;

    // Update All Time Card
    $('statAllTime').textContent = formatCurrency(allTimeTotal);
    
    if (window.getTranslation) {
      $('statTotalCount').textContent = window.getTranslation('dash_expenses_count', { count: expenses.length });
    } else {
      $('statTotalCount').textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;
    }

    // Update Average Card
    const avg = expenses.length > 0 ? allTimeTotal / expenses.length : 0;
    $('statAverage').textContent = formatCurrency(avg);
    const uniqueCats = new Set(expenses.map((e) => e.category || 'other')).size;
    
    if (window.getTranslation) {
      $('statCategoryCount').textContent = window.getTranslation('categories_count', { count: uniqueCats });
    } else {
      $('statCategoryCount').textContent = `${uniqueCats} categor${uniqueCats !== 1 ? 'ies' : 'y'}`;
    }

    // Update Highest Card
    if (highestExpense) {
      $('statHighest').textContent = formatCurrency(highestExpense.amount);
      $('statHighestCat').textContent = getCategoryLabel(highestExpense.category);
    } else {
      $('statHighest').textContent = formatCurrency(0);
      $('statHighestCat').textContent = '—';
    }
  }

  // ===== Chart.js Rendering =====
  function renderCharts(expenses) {
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }
    if (monthlyTrendChartInstance) {
      monthlyTrendChartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e2e8f0' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    // 1. Category Doughnut Chart
    const catTotals = {};
    expenses.forEach((e) => {
      const cat = e.category || 'other';
      catTotals[cat] = (catTotals[cat] || 0) + Number(e.amount);
    });

    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const labels = sortedCats.map(([cat]) => getCategoryLabel(cat));
    const data = sortedCats.map(([, amt]) => amt);
    const backgroundColors = sortedCats.map(([cat]) => CATEGORY_COLORS[cat] || '#64748b');

    const totalAllTime = data.reduce((a, b) => a + b, 0);

    const ctxPie = $('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textColor,
              boxWidth: 12,
              font: {
                family: 'Inter',
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const val = context.parsed;
                const pct = totalAllTime > 0 ? ((val / totalAllTime) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    });

    // 2. Monthly Trend Bar Chart (Last 6 Months)
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        year: m.getFullYear(),
        month: m.getMonth(),
        label: m.toLocaleDateString(window.i18n && window.i18n.getLanguage() === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', year: '2-digit' })
      });
    }

    const barData = Array(6).fill(0);
    expenses.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const ey = d.getFullYear();
      const em = d.getMonth();
      months.forEach((m, idx) => {
        if (m.year === ey && m.month === em) {
          barData[idx] += Number(e.amount);
        }
      });
    });

    const ctxBar = $('monthlyTrendChart').getContext('2d');
    monthlyTrendChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [{
          label: window.getTranslation ? window.getTranslation('dash_spent_label', { currency: window.i18n && window.i18n.getCurrency() === 'VND' ? '₫' : '$' }) : 'Total Spent ($)',
          data: barData,
          backgroundColor: isDark ? '#14b8a6' : '#0d9488',
          borderRadius: 4,
          maxBarThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const formattedVal = formatCurrency(context.parsed.y);
                return ' ' + (window.getTranslation ? window.getTranslation('dash_chart_total', { amount: formattedVal }) : `Total: ${formattedVal}`);
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: textColor,
              font: {
                family: 'Inter',
                size: 11
              }
            }
          },
          y: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              font: {
                family: 'Inter',
                size: 11
              }
            }
          }
        }
      }
    });
  }

  // ===== Recent Expenses =====
  function renderRecent(expenses) {
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
            <div class="recent-item__title">${escapeHtml(e.note) || getCategoryLabel(cat)}</div>
            <div class="recent-item__meta">
              <span>${formatDate(e.date)}</span>
              <span>·</span>
              <span>${getCategoryLabel(cat)}</span>
            </div>
          </div>
          <div class="recent-item__actions">
            <button class="btn-icon btn-edit" title="Edit" onclick="window.fintrack.editExpense('${e.id}')">✏️</button>
            <button class="btn-icon btn-delete" title="Delete" onclick="window.fintrack.deleteExpense('${e.id}')">🗑️</button>
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

  // ===== Update Dashboard (Unified Render) =====
  function updateDashboard() {
    const expenses = loadExpenses();
    renderStats(expenses);
    renderCharts(expenses);
    renderRecent(expenses);
  }

  // ===== Public API (for inline onclick handlers) =====
  window.fintrack = {
    editExpense(id) {
      const expenses = loadExpenses();
      const expense = expenses.find((e) => e.id === id);
      if (expense) openModal('edit', expense);
    },
    deleteExpense(id) {
      openDeleteDialog(id);
    },
  };



  // ===== Init =====
  function init() {
    // Translate page immediately on load
    if (window.translatePage) {
      window.translatePage();
    }
    updateAmountLabel();

    // Set up user profile
    const userProfile = $('userProfile');
    const userEmailDisplay = $('userEmailDisplay');
    const btnLogout = $('btnLogout');
    if (userProfile && userEmailDisplay) {
      userEmailDisplay.textContent = activeUser;
      userProfile.style.display = 'flex';
    }
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'login.html';
      });
    }



    // Load and render
    updateDashboard();

    // Dark mode toggle
    $('themeToggle').addEventListener('click', () => {
      toggleTheme();
      updateDashboard();
    });

    // System theme change
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
        updateDashboard();
      }
    });

    // Add Expense Button
    $('btnOpenAddModal').addEventListener('click', () => openModal('add'));

    // Modal close events
    $('btnCloseModal').addEventListener('click', closeModal);
    $('btnCancelModal').addEventListener('click', closeModal);
    expenseModal.addEventListener('click', (e) => {
      if (e.target === expenseModal) closeModal();
    });

    // Save Expense
    btnSaveExpense.addEventListener('click', saveExpenseHandler);
    expenseForm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveExpenseHandler();
      }
    });

    // Delete confirmation
    $('btnCancelDelete').addEventListener('click', closeDeleteDialog);
    $('btnConfirmDelete').addEventListener('click', confirmDelete);
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteDialog();
    });

    // Settings modal events
    $('btnOpenSettings').addEventListener('click', openSettings);
    $('btnCloseSettings').addEventListener('click', closeSettings);
    $('btnCancelSettings').addEventListener('click', closeSettings);
    $('btnSaveApiKey').addEventListener('click', saveApiKey);
    btnToggleKeyVisibility.addEventListener('click', toggleKeyVisibility);
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });

    // AI Categorization events
    btnAiCategorize.addEventListener('click', handleAiCategorize);
    btnAcceptSuggestion.addEventListener('click', () => {
      if (activeSuggestionValue) {
        expenseCategory.value = activeSuggestionValue;
        showToast(window.getTranslation ? window.getTranslation('toast_ai_categorized') : 'Suggested category applied!', 'success');
      }
      aiSuggestion.style.display = 'none';
    });
    btnDismissSuggestion.addEventListener('click', () => {
      aiSuggestion.style.display = 'none';
    });
    expenseNote.addEventListener('input', () => {
      aiSuggestion.style.display = 'none';
      aiError.style.display = 'none';
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (expenseModal.classList.contains('active')) closeModal();
        if (deleteModal.classList.contains('active')) closeDeleteDialog();
        if (settingsModal.classList.contains('active')) closeSettings();
      }
    });

    // Real-time validation clear
    expenseAmount.addEventListener('input', clearValidation);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
