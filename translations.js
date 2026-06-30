/**
 * FinTrack — Internationalization (i18n) & Formatting Module
 * Supports English (en) and Vietnamese (vi)
 * Supports USD ($) and VND (₫) formatting
 */

(function () {
  'use strict';

  // Get active user to store preferences per-user or globally
  const SESSION_KEY = 'fintrack_session_user';
  const activeUser = localStorage.getItem(SESSION_KEY);

  // Storage Keys
  const LANG_KEY = 'fintrack_lang'; // Global language so auth pages share the choice
  const CURRENCY_KEY = activeUser ? `fintrack_currency_${activeUser}` : 'fintrack_currency_global';

  // Languages supported
  const SUPPORTED_LANGS = ['en', 'vi'];
  const SUPPORTED_CURRENCIES = ['USD', 'VND'];

  // Current states
  let currentLang = localStorage.getItem(LANG_KEY) || 'en';
  let currentCurrency = localStorage.getItem(CURRENCY_KEY) || 'USD';

  // Fallback to English if stored language is unsupported
  if (!SUPPORTED_LANGS.includes(currentLang)) {
    currentLang = 'en';
  }

  // Translation catalog
  const dictionary = {
    // Navbar
    'nav_dashboard': { en: 'Dashboard', vi: 'Bảng điều khiển' },
    'nav_expenses': { en: 'Expenses', vi: 'Chi tiêu' },
    'nav_reports': { en: 'Reports', vi: 'Báo cáo' },
    'search_placeholder': { en: 'Search...', vi: 'Tìm kiếm...' },
    'logout': { en: 'Logout', vi: 'Đăng xuất' },
    'add_expense': { en: 'Add Expense', vi: 'Thêm chi tiêu' },

    // Page titles & descriptions
    'ledger_title': { en: 'Monthly Ledger', vi: 'Sổ thu chi tháng' },
    'ledger_desc': { en: 'Manage and track your detailed spending history.', vi: 'Quản lý và theo dõi chi tiết lịch sử chi tiêu của bạn.' },
    'dashboard_title': { en: 'Dashboard', vi: 'Bảng điều khiển' },
    'dashboard_desc': { en: 'Your spending overview at a glance.', vi: 'Tổng quan về chi tiêu của bạn.' },

    // Toolbar
    'filters': { en: 'Filters', vi: 'Bộ lọc' },
    'this_month': { en: 'This Month', vi: 'Tháng này' },
    'showing_transactions': {
      en: 'Showing {count} transactions',
      vi: 'Hiển thị {count} giao dịch'
    },
    'showing': { en: 'Showing', vi: 'Hiển thị' },
    'transactions': { en: 'transactions', vi: 'giao dịch' },
    'total_spending_label': { en: 'Total Spending', vi: 'Tổng chi tiêu' },

    // Table Headers
    'th_date': { en: 'Date', vi: 'Ngày' },
    'th_category': { en: 'Category', vi: 'Danh mục' },
    'th_note': { en: 'Note', vi: 'Ghi chú' },
    'th_amount': { en: 'Amount', vi: 'Số tiền' },
    'th_actions': { en: 'Actions', vi: 'Thao tác' },

    // Empty state
    'empty_title': { en: 'No expenses yet', vi: 'Chưa có khoản chi tiêu nào' },
    'empty_desc': { en: 'Click "+ Add Expense" to start tracking your spending.', vi: 'Bấm "+ Thêm chi tiêu" để bắt đầu theo dõi chi tiêu.' },

    // Modals
    'modal_add_title': { en: 'Add Expense', vi: 'Thêm chi tiêu' },
    'modal_edit_title': { en: 'Edit Expense', vi: 'Sửa chi tiêu' },
    'modal_delete_title': { en: 'Delete Expense', vi: 'Xóa khoản chi' },
    'modal_delete_body': { en: 'Are you sure you want to delete this expense? This action cannot be undone.', vi: 'Bạn có chắc chắn muốn xóa khoản chi này? Thao tác này không thể hoàn tác.' },

    // Form inputs & labels
    'amount_label': { en: 'Amount', vi: 'Số tiền' },
    'date_label': { en: 'Date', vi: 'Ngày' },
    'note_label': { en: 'Note', vi: 'Ghi chú' },
    'category_label': { en: 'Category', vi: 'Danh mục' },
    'select_category': { en: 'Select category...', vi: 'Chọn danh mục...' },
    'ai_suggestion': { en: 'AI Suggestion', vi: 'Gợi ý AI' },
    'note_placeholder': { en: 'e.g. Starbucks coffee', vi: 'vd: Cà phê Starbucks' },

    // Buttons
    'cancel': { en: 'Cancel', vi: 'Hủy' },
    'delete': { en: 'Delete', vi: 'Xóa' },
    'save': { en: 'Save', vi: 'Lưu' },
    'apply': { en: 'Apply', vi: 'Áp dụng' },
    'analyze_ai': { en: 'Analyze with AI', vi: 'Phân tích bằng AI' },
    'analyzing_ai': { en: 'Analyzing...', vi: 'Đang phân tích...' },

    // Settings Modal
    'settings_title': { en: '⚙️ Settings', vi: '⚙️ Cài đặt' },
    'settings_info_api': {
      en: 'Enter your Gemini API key to enable AI auto-categorization. Your key is stored locally in your browser and never sent anywhere except the Gemini API.',
      vi: 'Nhập mã API Gemini của bạn để bật tính năng tự động phân loại bằng AI. Mã của bạn được lưu cục bộ trong trình duyệt và không bao giờ được gửi đi đâu ngoại trừ API Gemini.'
    },
    'api_key_label': { en: 'Gemini API Key', vi: 'Mã API Gemini' },
    'language_label': { en: 'Language', vi: 'Ngôn ngữ' },
    'currency_label': { en: 'Currency', vi: 'Tiền tệ' },
    'save_settings': { en: 'Save Settings', vi: 'Lưu cài đặt' },

    // Categories
    'cat_groceries': { en: 'Groceries', vi: 'Tạp hóa / Đi chợ' },
    'cat_dining-out': { en: 'Dining Out', vi: 'Ăn uống ngoài' },
    'cat_transport': { en: 'Transport', vi: 'Di chuyển' },
    'cat_entertainment': { en: 'Entertainment', vi: 'Giải trí' },
    'cat_utilities': { en: 'Utilities', vi: 'Hóa đơn / Tiện ích' },
    'cat_healthcare': { en: 'Healthcare', vi: 'Y tế / Sức khỏe' },
    'cat_shopping': { en: 'Shopping', vi: 'Mua sắm' },
    'cat_other': { en: 'Other', vi: 'Khác' },

    // Dashboard Cards
    'dash_summary_title': { en: "This Month's Summary", vi: 'Tóm tắt tháng này' },
    'dash_total_spent': { en: 'Total Spent:', vi: 'Tổng chi tiêu:' },
    'dash_top_category': { en: 'Top Category:', vi: 'Danh mục chi nhiều nhất:' },
    'dash_transactions': { en: 'Transactions:', vi: 'Giao dịch:' },
    'dash_all_time': { en: 'All Time', vi: 'Tổng tích lũy' },
    'dash_average': { en: 'Average', vi: 'Trung bình' },
    'dash_average_sub': { en: 'Average amount per transaction.', vi: 'Số tiền trung bình mỗi giao dịch.' },
    'dash_highest': { en: 'Highest Expense', vi: 'Chi tiêu lớn nhất' },
    'dash_highest_sub': { en: 'Your single largest transaction.', vi: 'Giao dịch lớn nhất của bạn.' },
    'dash_chart_cat': { en: 'Category Breakdown', vi: 'Phân tích theo danh mục' },
    'dash_chart_trend': { en: 'Monthly Trend', vi: 'Xu hướng theo tháng' },
    'dash_recent': { en: 'Recent Expenses', vi: 'Chi tiêu gần đây' },
    'dash_recent_empty': { en: 'No recent expenses', vi: 'Không có chi tiêu gần đây' },
    'dash_recent_empty_desc': { en: 'Start adding expenses to see them here.', vi: 'Bắt đầu thêm chi tiêu để hiển thị ở đây.' },
    'categories_count': { en: '{count} categories', vi: '{count} danh mục' },
    'history_label': { en: 'History', vi: 'Lịch sử' },
    'view_all': { en: 'View All →', vi: 'Xem tất cả →' },
    'dash_expenses_count': {
      en: '{count} expenses',
      vi: '{count} khoản chi'
    },
    'dash_spent_label': {
      en: 'Total Spent ({currency})',
      vi: 'Tổng đã chi ({currency})'
    },
    'dash_chart_total': {
      en: 'Total: {amount}',
      vi: 'Tổng cộng: {amount}'
    },
    'trend_desc': { en: '{pct}% from last month', vi: '{pct}% so với tháng trước' },
    'trend_no_data': { en: 'No data for last month', vi: 'Không có dữ liệu tháng trước' },

    // Toasts
    'toast_settings_saved': { en: 'Settings saved successfully!', vi: 'Đã lưu cài đặt thành công!' },
    'toast_api_key_cleared': { en: 'API Key cleared.', vi: 'Đã xóa mã API.' },
    'toast_expense_added': { en: 'Expense added successfully!', vi: 'Đã thêm khoản chi thành công!' },
    'toast_expense_updated': { en: 'Expense updated successfully!', vi: 'Đã cập nhật khoản chi thành công!' },
    'toast_expense_deleted': { en: 'Expense deleted successfully!', vi: 'Đã xóa khoản chi thành công!' },
    'toast_logged_out': { en: 'Logged out successfully!', vi: 'Đã đăng xuất thành công!' },
    'toast_invalid_credentials': { en: 'Invalid email or password.', vi: 'Email hoặc mật khẩu không hợp lệ.' },
    'toast_login_success': { en: 'Login successful! Redirecting...', vi: 'Đăng nhập thành công! Đang chuyển hướng...' },
    'toast_email_exists': { en: 'An account with this email already exists.', vi: 'Tài khoản với email này đã tồn tại.' },
    'toast_signup_success': { en: 'Account created successfully! Redirecting...', vi: 'Tạo tài khoản thành công! Đang chuyển hướng...' },
    'toast_ai_categorized': { en: 'Category auto-selected by AI!', vi: 'Đã tự động chọn danh mục bằng AI!' },
    'toast_ai_categorized_to': { en: 'Category set to: {category}', vi: 'Danh mục được đặt thành: {category}' },
    'toast_ai_failed': { en: 'Failed to analyze with AI.', vi: 'Không thể phân tích bằng AI.' },
    'toast_ai_key_required': { en: 'AI API Key is required for analysis.', vi: 'Yêu cầu có mã API Gemini để phân tích.' },

    // Validation Errors
    'err_amount': { en: 'Amount must be a positive number.', vi: 'Số tiền phải là số dương hợp lệ.' },
    'err_date': { en: 'Please enter a valid date.', vi: 'Vui lòng nhập ngày hợp lệ.' },
    'err_note': { en: 'Note is required.', vi: 'Vui lòng nhập ghi chú.' },
    'err_category': { en: 'Please select a category.', vi: 'Vui lòng chọn danh mục.' },

    // Auth Pages
    'auth_welcome_title': { en: 'Welcome back! Please enter your details.', vi: 'Chào mừng trở lại! Vui lòng nhập thông tin đăng nhập.' },
    'auth_email_label': { en: 'Email Address', vi: 'Địa chỉ Email' },
    'auth_password_label': { en: 'Password', vi: 'Mật khẩu' },
    'auth_confirm_password_label': { en: 'Confirm Password', vi: 'Xác nhận mật khẩu' },
    'auth_email_error': { en: 'Please enter a valid email.', vi: 'Vui lòng nhập email hợp lệ.' },
    'auth_password_error': { en: 'Password is required.', vi: 'Vui lòng nhập mật khẩu.' },
    'auth_password_length_error': { en: 'Password must be at least 6 characters.', vi: 'Mật khẩu phải từ 6 ký tự trở lên.' },
    'auth_password_match_error': { en: 'Passwords do not match.', vi: 'Mật khẩu xác nhận không khớp.' },
    'auth_login_btn': { en: 'Log In', vi: 'Đăng nhập' },
    'auth_signup_btn': { en: 'Sign Up', vi: 'Đăng ký' },
    'auth_no_account': { en: "Don't have an account?", vi: 'Chưa có tài khoản?' },
    'auth_signup_link': { en: 'Sign up for free', vi: 'Đăng ký miễn phí' },
    'auth_has_account': { en: 'Already have an account?', vi: 'Đã có tài khoản?' },
    'auth_login_link': { en: 'Log in', vi: 'Đăng nhập' },
    'auth_signup_title': { en: 'Create your account', vi: 'Tạo tài khoản của bạn' },
    'auth_signup_subtitle': { en: 'Start managing your personal expenses today.', vi: 'Bắt đầu quản lý chi tiêu cá nhân của bạn ngay hôm nay.' },
    'auth_session_guard': { en: 'Please log in to access your ledger.', vi: 'Vui lòng đăng nhập để truy cập sổ chi tiêu.' }
  };

  // Helper function to fetch translations
  function getTranslation(key, params = {}) {
    const entry = dictionary[key];
    if (!entry) return key;
    let text = entry[currentLang] || entry['en'] || key;
    
    // Replace parameters
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  }

  // Set Language
  function setLanguage(lang) {
    if (SUPPORTED_LANGS.includes(lang)) {
      currentLang = lang;
      localStorage.setItem(LANG_KEY, lang);
    }
  }

  // Set Currency
  function setCurrency(currency) {
    if (SUPPORTED_CURRENCIES.includes(currency)) {
      currentCurrency = currency;
      localStorage.setItem(CURRENCY_KEY, currency);
    }
  }

  // Dynamic DOM Translation
  function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = getTranslation(key);
      
      // Update placeholder for inputs and textareas, else textContent
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && (el.type === 'text' || el.type === 'password' || el.type === 'number' || !el.type)) {
        el.placeholder = text;
      } else {
        // If the element has specific children like icon spans, preserve them
        const iconSpan = el.querySelector('span:first-child');
        if (iconSpan && iconSpan.classList.contains('logout-icon')) {
          el.innerHTML = `<span class="logout-icon">🚪</span> ${text}`;
        } else if (iconSpan && el.classList.contains('btn-add-expense')) {
          el.innerHTML = `<span>+</span> ${text}`;
        } else if (iconSpan && el.classList.contains('btn-filter')) {
          el.innerHTML = `<span>☰</span> ${text}`;
        } else if (iconSpan && el.classList.contains('btn-month')) {
          el.innerHTML = `<span>📅</span> ${text}`;
        } else if (el.querySelector('.icon-sun')) {
          // theme toggle, do not overwrite content
        } else {
          el.textContent = text;
        }
      }
    });

    // Also update dynamic page attributes like HTML lang
    document.documentElement.lang = currentLang;
  }

  // Format Currency
  function formatCurrency(amount) {
    const num = Number(amount) || 0;
    if (currentCurrency === 'VND') {
      // VND has no decimal points/cents in practice
      return num.toLocaleString('vi-VN') + ' ₫';
    } else {
      // USD format: $1,234.56
      return '$' + num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  }

  // Format Date
  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (currentLang === 'vi') {
      // 30 thg 6, 2026
      return d.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } else {
      // Jun 30, 2026
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  // Localized category labels
  function getCategoryLabel(category) {
    return getTranslation(`cat_${category}`);
  }

  // Export globally
  window.i18n = {
    getTranslation,
    translatePage,
    setLanguage,
    setCurrency,
    formatCurrency,
    formatDate,
    getCategoryLabel,
    getLanguage: () => currentLang,
    getCurrency: () => currentCurrency
  };

  // Helper shortcuts for backward compatibility or simple usage
  window.getTranslation = getTranslation;
  window.translatePage = translatePage;
  window.formatCurrency = formatCurrency;
  window.formatDate = formatDate;
  window.getCategoryLabel = getCategoryLabel;

})();
