// Used by login.html and register.html
let mode = 'user';

document.querySelectorAll('.tabs button').forEach((btn) => btn.addEventListener('click', () => {
  mode = btn.dataset.mode;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b === btn));
  const userBox = document.getElementById('userFields');
  const bankBox = document.getElementById('bankFields');
  if (userBox) { userBox.hidden = mode !== 'user'; bankBox.hidden = mode !== 'bank'; }
}));

const loginForm = document.getElementById('loginForm');
if (loginForm) loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showMsg('msg', 'Enter email and password.');
  try {
    const r = await api('/api/login', 'POST', { email, password, type: mode });
    session.set(r.token, r.type, r.name);
    location.href = r.type === 'bank' ? 'admin.html' : 'dashboard.html';
  } catch (err) { showMsg('msg', err.message); }
});

const regForm = document.getElementById('registerForm');
if (regForm) {
  fillGroups('bloodGroup');
  const v = (id) => document.getElementById(id).value.trim();
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      let r;
      if (mode === 'user') {
        r = await api('/api/register', 'POST', { name: v('name'), email: v('email'), password: document.getElementById('password').value, phone: v('phone'), bloodGroup: v('bloodGroup'), city: v('city'), donor: document.getElementById('donor').checked });
      } else {
        r = await api('/api/bank/register', 'POST', { bankName: v('bankName'), address: v('address'), city: v('bcity'), contactNumber: v('contactNumber'), licenseNo: v('licenseNo'), email: v('email'), password: document.getElementById('password').value });
      }
      showMsg('msg', r.message, 'success');
      regForm.reset();
    } catch (err) { showMsg('msg', err.message); }
  });
}
