if (requireRole('bank')) init();

function init() {
  loadProfile(); loadStock(); loadRequests(); loadDonors(); loadDonations();
}

async function loadProfile() {
  const p = await api('/api/bank/profile');
  document.getElementById('bankTitle').textContent = p.bankName + ' (' + p.city + ')';
  document.getElementById('address').value = p.address;
  document.getElementById('contactNumber').value = p.contactNumber;
  document.getElementById('licenseNo').textContent = p.licenseNo;
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/api/bank/profile', 'PUT', { address: document.getElementById('address').value.trim(), contactNumber: document.getElementById('contactNumber').value.trim() });
    showMsg('profileMsg', r.message, 'success');
  } catch (err) { showMsg('profileMsg', err.message); }
});

async function loadStock() {
  const stock = await api('/api/bank/stock');
  document.getElementById('stockGrid').innerHTML = stock.map((s) => `
    <div class="stock-item"><b>${s.bloodGroup}</b>
      <input type="number" min="0" value="${s.unitsAvailable}" id="s_${s.bloodGroup}" aria-label="Units of ${s.bloodGroup}">
      <button class="small" data-group="${s.bloodGroup}">Save</button></div>`).join('');
  document.querySelectorAll('#stockGrid button').forEach((b) => b.addEventListener('click', async () => {
    try {
      const r = await api('/api/bank/stock', 'PUT', { bloodGroup: b.dataset.group, units: document.getElementById('s_' + b.dataset.group).value });
      showMsg('stockMsg', r.message, 'success');
    } catch (err) { showMsg('stockMsg', err.message); }
  }));
}

async function loadRequests() {
  const list = await api('/api/requests/bank');
  const pending = list.filter((r) => r.status === 'Pending').length;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statTotal').textContent = list.length;
  document.getElementById('statFulfilled').textContent = list.filter((r) => r.status === 'Fulfilled').length;
  const body = document.getElementById('reqBody');
  if (!list.length) { body.innerHTML = '<tr><td colspan="6">No requests received yet.</td></tr>'; return; }
  body.innerHTML = list.map((r) => {
    let act = '-';
    if (r.status === 'Pending') act = `<button class="small" data-id="${r.id}" data-s="Approved">Approve</button> <button class="small ghost" data-id="${r.id}" data-s="Rejected">Reject</button>`;
    if (r.status === 'Approved') act = `<button class="small" data-id="${r.id}" data-s="Fulfilled">Mark fulfilled</button>`;
    return `<tr><td>#${r.id}</td><td>${esc(r.userName)}<br><small>${esc(r.userPhone)}</small></td><td>${esc(r.bloodGroup)}</td>
      <td>${r.unitsRequired}</td><td><span class="badge ${r.status}">${r.status}</span></td><td>${act}</td></tr>`;
  }).join('');
  body.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', async () => {
    try {
      const r = await api('/api/requests/' + b.dataset.id, 'PATCH', { status: b.dataset.s });
      showMsg('reqMsg', r.message, 'success');
      loadRequests(); loadStock();
    } catch (err) { showMsg('reqMsg', err.message); }
  }));
}

async function loadDonors() {
  const donors = await api('/api/bank/donors');
  document.getElementById('donorSelect').innerHTML = donors.length
    ? donors.map((d) => `<option value="${d.id}">${esc(d.name)} (${esc(d.bloodGroup)})</option>`).join('')
    : '<option value="">No donors in this city yet</option>';
  document.getElementById('donorBody').innerHTML = donors.length
    ? donors.map((d) => `<tr><td>${esc(d.name)}</td><td>${esc(d.bloodGroup)}</td><td>${esc(d.phone)}</td><td>${esc(d.email)}</td></tr>`).join('')
    : '<tr><td colspan="4">No registered donors in your city.</td></tr>';
}

document.getElementById('donationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/api/bank/donations', 'POST', { donorId: document.getElementById('donorSelect').value, quantity: document.getElementById('quantity').value });
    showMsg('donationMsg', r.message, 'success');
    loadStock(); loadDonations();
  } catch (err) { showMsg('donationMsg', err.message); }
});

async function loadDonations() {
  const list = await api('/api/bank/donations');
  document.getElementById('donationBody').innerHTML = list.length
    ? list.map((x) => `<tr><td>${esc(x.donorName)}</td><td>${esc(x.bloodGroup)}</td><td>${x.quantity}</td><td>${fmtDate(x.donationDate)}</td></tr>`).join('')
    : '<tr><td colspan="4">No donations logged yet.</td></tr>';
}
