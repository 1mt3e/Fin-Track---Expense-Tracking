/**
 * FinTrack — Personal Expense Tracker
 * All data persists in localStorage.
 */

(function () {
  'use strict';

  // ===== Constants =====
  const STORAGE_KEY = 'fintrack_expenses';
  const THEME_KEY = 'fintrack_theme';

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
  const amountError = $('amountError');
  const btnSaveExpense = $('btnSaveExpense');

  // Delete modal
  const deleteModal = $('deleteModal');
  let pendingDeleteId = null;

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
    return '$' + Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getCategoryLabel(cat) {
    return CATEGORY_LABELS[cat] || cat;
  }

  function getCategoryClass(cat) {
    return cat || 'other';
  }

  // ===== Rendering =====
  function renderExpenses(filter = '') {
    let expenses = loadExpenses();

    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply search filter
    if (filter.trim()) {
      const q = filter.toLowerCase();
      expenses = expenses.filter(
        (e) =>
          e.note.toLowerCase().includes(q) ||
          getCategoryLabel(e.category).toLowerCase().includes(q) ||
          formatDate(e.date).toLowerCase().includes(q) ||
          formatCurrency(e.amount).includes(q)
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
      changePercent.textContent = `${sign}${pct}% from last month`;
    } else {
      changePercent.textContent = 'No data for last month';
    }
  }

  // ===== Modal Management =====
  function openModal(mode = 'add', expense = null) {
    clearValidation();
    if (mode === 'edit' && expense) {
      modalTitle.textContent = 'Edit Expense';
      btnSaveExpense.textContent = 'Update Expense';
      expenseId.value = expense.id;
      expenseAmount.value = expense.amount;
      expenseCategory.value = expense.category;
      expenseDate.value = expense.date;
      expenseNote.value = expense.note;
    } else {
      modalTitle.textContent = 'Add New Expense';
      btnSaveExpense.textContent = 'Save Expense';
      expenseForm.reset();
      expenseId.value = '';
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
      // Edit existing
      const idx = expenses.findIndex((e) => e.id === id);
      if (idx !== -1) {
        expenses[idx] = { ...expenses[idx], ...data };
      }
      showToast('Expense updated successfully!', 'success');
    } else {
      // Add new
      data.id = generateId();
      expenses.push(data);
      showToast('Expense added successfully!', 'success');
    }

    saveExpenses(expenses);
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
    showToast('Expense deleted.', 'success');
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

  // ===== Seed Sample Data =====
  function seedIfEmpty() {
    const expenses = loadExpenses();
    if (expenses.length > 0) return;

    const samples = [
      { id: generateId(), amount: 142.50, category: 'groceries', date: '2023-10-24', note: 'Weekly supply at Whole Foods Market' },
      { id: generateId(), amount: 64.20, category: 'dining-out', date: '2023-10-22', note: 'Dinner with the marketing team' },
      { id: generateId(), amount: 127.00, category: 'transport', date: '2023-10-20', note: 'Monthly subway pass renewal' },
      { id: generateId(), amount: 15.99, category: 'entertainment', date: '2023-10-18', note: 'Streaming service subscription' },
      { id: generateId(), amount: 89.00, category: 'utilities', date: '2023-10-16', note: 'Electric bill - October' },
      { id: generateId(), amount: 210.00, category: 'healthcare', date: '2023-10-14', note: 'Dental checkup and cleaning' },
      { id: generateId(), amount: 56.78, category: 'shopping', date: '2023-10-12', note: 'New desk lamp from IKEA' },
      { id: generateId(), amount: 34.50, category: 'groceries', date: '2023-10-10', note: 'Farmers market organic produce' },
    ];

    saveExpenses(samples);
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
    // Seed demo data on first load
    seedIfEmpty();

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
      }
    });

    // Real-time validation clear
    expenseAmount.addEventListener('input', clearValidation);
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
