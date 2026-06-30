/**
 * FinTrack — Personal Expense Tracker
 * All data persists in localStorage.
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

  // ===== Category Filter State =====
  let currentCategoryFilter = 'all';
  const CATEGORIES = ['all', 'groceries', 'dining-out', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other'];
  const CATEGORY_ICONS = {
    'all': '📁',
    'groceries': '🛒',
    'dining-out': '🍔',
    'transport': '🚗',
    'entertainment': '🎬',
    'utilities': '💡',
    'healthcare': '🏥',
    'shopping': '🛍️',
    'other': '📦',
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

  // Apply theme immediately to prevent flash
  applyTheme(getPreferredTheme());

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

  // ===== DOM References =====
  const $ = (id) => document.getElementById(id);

  const expenseTableBody = $('expenseTableBody');
  const emptyState = $('emptyState');
  const expenseCount = $('expenseCount');
  const totalSpending = $('totalSpending');
  const changePercent = $('changePercent');
  const searchInput = $('searchInput');

  // Modal elements
  const expenseModal = $('expenseModal');
  const modalTitle = $('modalTitle');
  const expenseForm = $('expenseForm');
  const expenseId = $('expenseId');
  const expenseAmount = $('expenseAmount');
  const expenseCategory = $('expenseCategory');
  const expenseDate = $('expenseDate');
  const expenseNote = $('expenseNote');
  const expenseTags = $('expenseTags');
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

  // ===== Formatting Helpers =====
  function formatCurrency(amount) {
    return window.formatCurrency ? window.formatCurrency(amount) : '$' + Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(dateStr) {
    return window.formatDate ? window.formatDate(dateStr) : new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getCategoryLabel(cat) {
    return window.getCategoryLabel ? window.getCategoryLabel(cat) : (CATEGORY_LABELS[cat] || cat);
  }

  function getCategoryClass(cat) {
    return cat || 'other';
  }

  // ===== Filter Dropdown rendering =====
  function renderFilterDropdown() {
    const dropdown = $('filterDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = CATEGORIES.map(cat => {
      const isAll = cat === 'all';
      const label = isAll
        ? (window.getTranslation ? window.getTranslation('cat_all') : 'All Categories')
        : getCategoryLabel(cat);
      const icon = CATEGORY_ICONS[cat] || '📦';
      const isActive = currentCategoryFilter === cat;

      return `
        <button class="filter-dropdown-item ${isActive ? 'active' : ''}" data-cat="${cat}">
          <span class="filter-dropdown-item__icon">${icon}</span>
          <span>${label}</span>
        </button>
      `;
    }).join('');

    // Attach click listeners
    dropdown.querySelectorAll('.filter-dropdown-item').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategoryFilter = btn.getAttribute('data-cat');
        dropdown.classList.remove('active');
        renderFilterDropdown();
        renderExpenses(searchInput.value);
      });
    });
  }

  // ===== Rendering =====
  function renderExpenses(filter = '') {
    let expenses = loadExpenses();

    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply category filter
    if (currentCategoryFilter !== 'all') {
      expenses = expenses.filter((e) => (e.category || 'other') === currentCategoryFilter);
    }

    // Apply search filter
    if (filter.trim()) {
      const q = filter.toLowerCase();
      expenses = expenses.filter(
        (e) =>
          e.note.toLowerCase().includes(q) ||
          getCategoryLabel(e.category).toLowerCase().includes(q) ||
          formatDate(e.date).toLowerCase().includes(q) ||
          formatCurrency(e.amount).includes(q) ||
          (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Update count
    expenseCount.textContent = expenses.length;

    // Toggle empty state
    if (expenses.length === 0) {
      expenseTableBody.innerHTML = '';
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      expenseTableBody.innerHTML = expenses.map((e) => buildRow(e)).join('');
    }

    // Update summary
    updateSummary();
  }

  function buildRow(expense) {
    return `
      <tr data-id="${expense.id}">
        <td><span class="expense-date">${formatDate(expense.date)}</span></td>
        <td><span class="category-badge ${getCategoryClass(expense.category)}">${getCategoryLabel(expense.category)}</span></td>
        <td><span class="expense-note" title="${escapeHtml(expense.note)}">${escapeHtml(expense.note) || '—'}</span></td>
        <td>
          <div class="tag-chips">
            ${(expense.tags || []).map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}
          </div>
        </td>
        <td><span class="expense-amount">${formatCurrency(expense.amount)}</span></td>
        <td>
          <div class="expense-actions">
            <button class="btn-icon btn-edit" title="Edit" onclick="window.fintrack.editExpense('${expense.id}')">✏️</button>
            <button class="btn-icon btn-delete" title="Delete" onclick="window.fintrack.deleteExpense('${expense.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updateSummary() {
    const expenses = loadExpenses();
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    totalSpending.textContent = formatCurrency(total);

    // Compute a pseudo "last month" comparison
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let currentMonthTotal = 0;
    let lastMonthTotal = 0;

    expenses.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        currentMonthTotal += Number(e.amount);
      }
      const lm = thisMonth === 0 ? 11 : thisMonth - 1;
      const ly = thisMonth === 0 ? thisYear - 1 : thisYear;
      if (d.getMonth() === lm && d.getFullYear() === ly) {
        lastMonthTotal += Number(e.amount);
      }
    });

    if (lastMonthTotal > 0) {
      const pct = (((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1);
      const sign = pct >= 0 ? '+' : '';
      if (window.getTranslation) {
        changePercent.textContent = window.getTranslation('trend_desc', { pct: `${sign}${pct}` });
      } else {
        changePercent.textContent = `${sign}${pct}% from last month`;
      }
    } else {
      if (window.getTranslation) {
        changePercent.textContent = window.getTranslation('trend_no_data');
      } else {
        changePercent.textContent = 'No data for last month';
      }
    }
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
      expenseTags.value = (expense.tags || []).join(', ');
    } else {
      modalTitle.textContent = window.getTranslation ? window.getTranslation('modal_add_title') : 'Add New Expense';
      btnSaveExpense.textContent = window.getTranslation ? window.getTranslation('save') : 'Save Expense';
      expenseForm.reset();
      expenseId.value = '';
      if (expenseTags) expenseTags.value = '';
      // Default date to today
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
    if (window.fintrackNotify) {
      $('notifReminder').checked = window.fintrackNotify.isReminderEnabled();
      $('notifAlerts').checked = window.fintrackNotify.isAlertsEnabled();
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
      window.i18n.setLanguage($('langInput').value);
      window.i18n.setCurrency($('currencyInput').value);
      window.i18n.translatePage();
    }

    if (window.fintrackNotify) {
      window.fintrackNotify.setReminder($('notifReminder').checked);
      window.fintrackNotify.setAlerts($('notifAlerts').checked);
    }

    showToast(window.getTranslation ? window.getTranslation('toast_settings_saved') : 'Settings saved successfully!', 'success');
    renderExpenses(searchInput.value);
    closeSettings();
    updateAmountLabel();
    renderFilterDropdown();
  }

  function toggleKeyVisibility() {
    const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
    apiKeyInput.setAttribute('type', type);
    btnToggleKeyVisibility.textContent = type === 'password' ? '👁️' : '🙈';
  }

  // ===== AI Categorization =====
  function classifyOffline(note) {
    const s = note.toLowerCase();
    
    // Food & Dining Out / Groceries
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
    
    // Groceries
    if (s.includes('grocery') || s.includes('groceries') || s.includes('milk') || s.includes('bread') || 
        s.includes('vegetable') || s.includes('fruit') || s.includes('meat') || s.includes('egg') || 
        s.includes('market') || s.includes('supermarket') || s.includes('chợ') || s.includes('vinmart') || s.includes('bach hoa')) {
      return { category: 'groceries', label: 'Groceries' };
    }
    
    // Transport
    if (s.includes('transport') || s.includes('taxi') || s.includes('subway') || s.includes('bus') || 
        s.includes('train') || s.includes('flight') || s.includes('plane') || s.includes('ticket') || 
        s.includes('grab') || s.includes('uber') || s.includes('gojek') || s.includes('gas') || 
        s.includes('fuel') || s.includes('xăng') || s.includes('parking') || s.includes('car') || s.includes('bike')) {
      return { category: 'transport', label: 'Transport' };
    }
    
    // Entertainment
    if (s.includes('entertainment') || s.includes('movie') || s.includes('cinema') || s.includes('film') || 
        s.includes('theater') || s.includes('netflix') || s.includes('spotify') || s.includes('youtube') || 
        s.includes('music') || s.includes('concert') || s.includes('game') || s.includes('steam') || 
        s.includes('nintendo') || s.includes('playstation') || s.includes('book') || s.includes('comic') || 
        s.includes('travel') || s.includes('hotel') || s.includes('trip') || s.includes('party')) {
      return { category: 'entertainment', label: 'Entertainment' };
    }
    
    // Shopping
    if (s.includes('shopping') || s.includes('buy') || s.includes('cloth') || s.includes('shoes') || 
        s.includes('shirt') || s.includes('pants') || s.includes('dress') || s.includes('bag') || 
        s.includes('watch') || s.includes('phone') || s.includes('laptop') || s.includes('computer') || 
        s.includes('keyboard') || s.includes('mouse') || s.includes('ikea') || s.includes('shopee') || 
        s.includes('lazada') || s.includes('amazon') || s.includes('gift') || s.includes('present')) {
      return { category: 'shopping', label: 'Shopping' };
    }
    
    // Healthcare
    if (s.includes('health') || s.includes('medical') || s.includes('hospital') || s.includes('clinic') || 
        s.includes('doctor') || s.includes('dentist') || s.includes('medicine') || s.includes('pill') || 
        s.includes('drug') || s.includes('pharmacy') || s.includes('vaccine') || s.includes('insurance') || 
        s.includes('gym') || s.includes('workout') || s.includes('fitness') || s.includes('bệnh viện') || s.includes('thuốc')) {
      return { category: 'healthcare', label: 'Healthcare' };
    }
    
    // Bills & Utilities
    if (s.includes('bill') || s.includes('utility') || s.includes('utilities') || s.includes('electric') || 
        s.includes('electricity') || s.includes('water') || s.includes('gas') || s.includes('internet') || 
        s.includes('wifi') || s.includes('phone bill') || s.includes('rent') || s.includes('apartment') || 
        s.includes('maintenance') || s.includes('fee') || s.includes('tax') || s.includes('tiền điện') || s.includes('tiền nước')) {
      return { category: 'utilities', label: 'Utilities' };
    }
    
    return { category: 'other', label: 'Other' };
  }

  function runOfflineClassification(note, statusMessage) {
    const offlineResult = classifyOffline(note);
    activeSuggestionValue = offlineResult.category;

    // Display suggested category with an offline notice
    aiSuggestionText.innerHTML = `Suggested (Offline): <strong>${offlineResult.label}</strong>`;
    aiSuggestion.style.display = 'flex';

    // Auto-select in the dropdown
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

    // Set loading state
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

      // Fallback to gemini-1.5-flash-latest if gemini-1.5-flash fails
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

      // Map to dropdown value
      const mappedValue = mapAiCategoryToDropdown(suggested);
      activeSuggestionValue = mappedValue;

      // Display suggested category
      aiSuggestionText.innerHTML = `Suggested: <strong>${suggested}</strong>`;
      aiSuggestion.style.display = 'flex';

      // Auto-select in the dropdown
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
      tags: expenseTags && expenseTags.value.trim() ? expenseTags.value.split(',').map(t => t.trim()).filter(t => t) : [],
    };

    if (id) {
      // Edit existing
      const idx = expenses.findIndex((e) => e.id === id);
      if (idx !== -1) {
        expenses[idx] = { ...expenses[idx], ...data };
      }
      showToast(window.getTranslation ? window.getTranslation('toast_expense_updated') : 'Expense updated successfully!', 'success');
    } else {
      // Add new
      data.id = generateId();
      expenses.push(data);
      showToast(window.getTranslation ? window.getTranslation('toast_expense_added') : 'Expense added successfully!', 'success');
    }

    saveExpenses(expenses);
    if (window.fintrackNotify) window.fintrackNotify.checkSpendingSpike();
    
    closeModal();
    renderExpenses(searchInput.value);
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;

    let expenses = loadExpenses();
    expenses = expenses.filter((e) => e.id !== pendingDeleteId);
    saveExpenses(expenses);

    closeDeleteDialog();
    renderExpenses(searchInput.value);
    showToast(window.getTranslation ? window.getTranslation('toast_expense_deleted') : 'Expense deleted.', 'success');
  }

  // ===== Toast Notifications =====
  function showToast(message, type = 'success') {
    const container = $('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    // Trigger reflow then animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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

  // ===== Event Binding =====
  function init() {
    // Translate page immediately on load
    if (window.translatePage) {
      window.translatePage();
    }
    updateAmountLabel();
    renderFilterDropdown();

    // Set up Filter Dropdown toggle
    const btnFilter = $('btnFilter');
    const filterDropdown = $('filterDropdown');
    if (btnFilter && filterDropdown) {
      btnFilter.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!filterDropdown.contains(e.target) && e.target !== btnFilter) {
          filterDropdown.classList.remove('active');
        }
      });
    }

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



    // Render initial list
    renderExpenses();

    // Dark mode toggle
    $('themeToggle').addEventListener('click', toggleTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
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

    // Open add modal
    $('btnOpenAddModal').addEventListener('click', () => openModal('add'));

    // Close modal
    $('btnCloseModal').addEventListener('click', closeModal);
    $('btnCancelModal').addEventListener('click', closeModal);

    // Overlay click to close
    expenseModal.addEventListener('click', (e) => {
      if (e.target === expenseModal) closeModal();
    });

    // Save expense
    btnSaveExpense.addEventListener('click', saveExpenseHandler);

    // Enter key in form
    expenseForm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveExpenseHandler();
      }
    });

    // Delete dialog
    $('btnCancelDelete').addEventListener('click', closeDeleteDialog);
    $('btnConfirmDelete').addEventListener('click', confirmDelete);
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteDialog();
    });

    // Search
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        renderExpenses(searchInput.value);
      }, 250);
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

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
