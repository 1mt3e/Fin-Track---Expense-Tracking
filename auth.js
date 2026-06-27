/**
 * FinTrack — Authentication and Theme Management
 * For login.html and signup.html
 */

(function () {
  'use strict';

  const USERS_KEY = 'fintrack_users';
  const SESSION_KEY = 'fintrack_session_user';
  const THEME_KEY = 'fintrack_theme';

  // ===== DOM Helpers =====
  const $ = (id) => document.getElementById(id);

  // ===== Theme Initialization & Handling =====
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

  // Apply theme immediately
  applyTheme(getPreferredTheme());

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

  // ===== Auth Helper Functions =====
  function getUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveUser(user) {
    const users = getUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // ===== Event Listeners =====
  document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeBtn = $('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }

    // Login Form
    const loginForm = $('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const emailInput = $('email');
        const passwordInput = $('password');
        const emailErr = $('emailError');
        const passwordErr = $('passwordError');

        // Reset errors
        emailInput.classList.remove('error');
        passwordInput.classList.remove('error');
        emailErr.classList.remove('visible');
        passwordErr.classList.remove('visible');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        let valid = true;

        if (!validateEmail(email)) {
          emailInput.classList.add('error');
          emailErr.classList.add('visible');
          valid = false;
        }

        if (!password) {
          passwordInput.classList.add('error');
          passwordErr.classList.add('visible');
          valid = false;
        }

        if (!valid) return;

        // Verify credentials
        const users = getUsers();
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!foundUser || foundUser.password !== password) {
          showToast('Invalid email or password.', 'error');
          return;
        }

        // Login success
        localStorage.setItem(SESSION_KEY, foundUser.email);
        showToast('Login successful! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);
      });
    }

    // Signup Form
    const signupForm = $('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const emailInput = $('email');
        const passwordInput = $('password');
        const confirmInput = $('confirmPassword');
        
        const emailErr = $('emailError');
        const passwordErr = $('passwordError');
        const confirmErr = $('confirmPasswordError');

        // Reset errors
        emailInput.classList.remove('error');
        passwordInput.classList.remove('error');
        confirmInput.classList.remove('error');
        emailErr.classList.remove('visible');
        passwordErr.classList.remove('visible');
        confirmErr.classList.remove('visible');

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmInput.value;

        let valid = true;

        if (!validateEmail(email)) {
          emailInput.classList.add('error');
          emailErr.classList.add('visible');
          valid = false;
        }

        if (password.length < 6) {
          passwordInput.classList.add('error');
          passwordErr.classList.add('visible');
          valid = false;
        }

        if (password !== confirmPassword) {
          confirmInput.classList.add('error');
          confirmErr.classList.add('visible');
          valid = false;
        }

        if (!valid) return;

        // Check if user already exists
        const users = getUsers();
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          showToast('An account with this email already exists.', 'error');
          return;
        }

        // Save new user
        saveUser({ email, password });
        
        // Log in user
        localStorage.setItem(SESSION_KEY, email);
        showToast('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);
      });
    }
  });
})();
