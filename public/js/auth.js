/**
 * NovaTalk Authentication & Session Service
 */

const AppAuth = {
  token: localStorage.getItem('omni_token') || null,
  currentUser: null,

  async getSession() {
    this.token = localStorage.getItem('omni_token') || null;
    if (!this.token) {
      this.currentUser = null;
      return null;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.currentUser = data.user;
        localStorage.setItem('omni_user', JSON.stringify(data.user));
        return data.user;
      } else {
        this.logout();
        return null;
      }
    } catch (err) {
      console.warn('Session check network warning:', err);
      const stored = localStorage.getItem('omni_user');
      if (stored && this.token) {
        try { this.currentUser = JSON.parse(stored); return this.currentUser; } catch (e) {}
      }
      return null;
    }
  },

  getAuthHeader() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  },

  async login(identifier, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem('omni_token', data.token);
    localStorage.setItem('omni_user', JSON.stringify(data.user));
    return data;
  },

  async signup(username, email, password, confirmPassword, fullName) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, confirmPassword, fullName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem('omni_token', data.token);
    localStorage.setItem('omni_user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_user');
  }
};

window.AppAuth = AppAuth;
