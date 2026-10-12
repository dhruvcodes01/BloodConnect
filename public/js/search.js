const results = document.getElementById('results');
fillGroups('group');

api('/api/cities').then((cities) => {
  document.getElementById('city').innerHTML = '<option value="">Select</option>' + cities.map((c) => `<option>${esc(c)}</option>`).join('');
});

document.getElementById('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const group = document.getElementById('group').value;
  const city = document.getElementById('city').value;
  document.getElementById('msg').className = 'msg';
  if (!group || !city) return showMsg('msg', 'Choose both a blood group and a city.');
  try {
    const banks = await api(`/api/stock?group=${encodeURIComponent(group)}&city=${encodeURIComponent(city)}`);
    render(banks, group, city);
  } catch (err) { showMsg('msg', err.message); }
});

function render(banks, group, city) {
  const inStock = banks.filter((b) => b.units > 0);
  banks.sort((a, b) => b.units - a.units);
  let html = '';
  if (!inStock.length) html += `<div class="msg error">No stock of ${esc(group)} found in ${esc(city)} right now. Call the banks below or try a nearby city.</div>`;
  else html += `<p><b>${inStock.length}</b> blood bank(s) in ${esc(city)} have ${esc(group)} in stock.</p>`;
  if (!banks.length) html = `<div class="msg error">No blood banks registered in ${esc(city)}.</div>`;
  html += '<div class="grid">' + banks.map((b) => `
    <div class="card ${b.units > 0 ? 'instock' : 'nostock'}">
      <h3>${esc(b.bankName)}</h3>
      <div class="units">${b.units} <small>units of ${esc(group)}</small></div>
      <p>${esc(b.address)}<br>Phone: <a href="tel:${esc(b.contactNumber)}">${esc(b.contactNumber)}</a><br>
      <small>Updated: ${fmtDate(b.lastUpdated)}</small></p>
      ${b.units > 0 ? `<div class="field"><label>Units needed</label><input type="number" min="1" max="${b.units}" value="1" id="u${b.id}"></div>
      <button data-bank="${b.id}">Request blood</button><div class="msg" id="m${b.id}"></div>` : '<small>Out of stock</small>'}
    </div>`).join('') + '</div>';
  results.innerHTML = html;
  results.querySelectorAll('button[data-bank]').forEach((btn) => btn.addEventListener('click', () => sendRequest(btn.dataset.bank, group)));
}

async function sendRequest(bankId, group) {
  if (session.type !== 'user') { alert('Please log in as a user to request blood.'); location.href = 'login.html'; return; }
  const units = document.getElementById('u' + bankId).value;
  try {
    const r = await api('/api/requests', 'POST', { bankId, bloodGroup: group, units });
    showMsg('m' + bankId, r.message, 'success');
  } catch (err) { showMsg('m' + bankId, err.message); }
}
