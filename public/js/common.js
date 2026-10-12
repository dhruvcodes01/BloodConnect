// Shared helpers used by every page.
const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const session = {
  get token() { return localStorage.getItem('bc_token'); },
  get type() { return localStorage.getItem('bc_type'); },
  get name() { return localStorage.getItem('bc_name'); },
  set(token, type, name) {
    localStorage.setItem('bc_token', token);
    localStorage.setItem('bc_type', type);
    localStorage.setItem('bc_name', name);
  },
  clear() {
    ['bc_token', 'bc_type', 'bc_name'].forEach((key) => localStorage.removeItem(key));
  }
};

async function api(url, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (session.token) opts.headers['x-token'] = session.token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    session.clear();
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showMsg(id, text, type = 'error') {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'msg ' + type;
}

function fillGroups(selectId) {
  document.getElementById(selectId).innerHTML = '<option value="">Select</option>' + GROUPS.map((g) => `<option>${g}</option>`).join('');
}

function fmtDate(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

// Build the nav bar depending on who is logged in.
function renderNav() {
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  const link = (href, label, page = href, extraClass = '') => {
    const classes = [extraClass, currentPage === page ? 'active' : ''].filter(Boolean).join(' ');
    return `<a href="${href}"${classes ? ` class="${classes}"` : ''}${currentPage === page ? ' aria-current="page"' : ''}>${label}</a>`;
  };

  let links = link('index.html', 'Home') +
    '<a href="index.html#services">Services</a>' +
    '<a href="index.html#about">About Us</a>';
  if (session.type === 'user') links += link('dashboard.html', 'My Dashboard');
  else if (session.type === 'bank') links += link('admin.html', 'Bank Panel');
  if (session.token) {
    links += `<span class="nav-greeting">Hello, ${esc(session.name)}</span><button class="nav-btn nav-link-button" id="logoutBtn">Log out</button>`;
  } else {
    links += link('login.html', 'Login') + link('register.html', 'Join Us', 'register.html', 'nav-btn');
  }
  const header = document.querySelector('header');
  header.classList.add('navbar');
  header.innerHTML = `<a href="index.html" class="logo" aria-label="BloodConnect home"><span class="logo-icon" aria-hidden="true">🩸</span> Blood<span>Connect</span></a><nav aria-label="Main navigation">${links}</nav>`;
  const lb = document.getElementById('logoutBtn');
  if (lb) {
    lb.onclick = async () => {
      try {
        await api('/api/logout', 'POST');
      } catch (error) {
        // Clear the local session even if the server cannot be reached.
      }
      session.clear();
      location.href = 'index.html';
    };
  }
}

// Redirect away if the wrong kind of person opens a page.
function requireRole(type) {
  if (session.type !== type) {
    location.href = 'login.html';
    return false;
  }
  return true;
}
document.addEventListener('DOMContentLoaded', renderNav);
