if (requireRole('user')) init();

async function init() {
  try {
    const me = await api('/api/me');
    document.getElementById('profile').innerHTML = `<b>${esc(me.name)}</b> &middot; ${esc(me.email)} &middot; ${esc(me.phone)}<br>
      Blood group: <b>${esc(me.bloodGroup)}</b> &middot; City: ${esc(me.city)} &middot; Role: ${esc(me.role)}`;
    if (me.role !== 'Recipient') document.getElementById('donorBtn').hidden = true;
    else document.getElementById('donorNote').hidden = true;
    loadRequests();
  } catch (e) { location.href = 'login.html'; }
}

document.getElementById('donorBtn').addEventListener('click', async () => {
  try {
    const r = await api('/api/donors', 'POST');
    showMsg('msg', r.message, 'success');
    init();
  } catch (err) { showMsg('msg', err.message); }
});

async function loadRequests() {
  const list = await api('/api/requests/mine');
  const body = document.getElementById('reqBody');
  if (!list.length) { body.innerHTML = '<tr><td colspan="6">No requests yet. <a href="index.html">Search for blood</a> to make one.</td></tr>'; return; }
  body.innerHTML = list.map((r) => `<tr><td>#${r.id}</td><td>${esc(r.bankName)}<br><small>${esc(r.contactNumber)}</small></td>
    <td>${esc(r.bloodGroup)}</td><td>${r.unitsRequired}</td><td><span class="badge ${r.status}">${r.status}</span></td><td>${fmtDate(r.requestDate)}</td></tr>`).join('');
}
