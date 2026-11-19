import { createClient } from './vendor/supabase-js.js';

const SB_URL = 'https://kknpnhpmgkghuerpnlyz.supabase.co';
const SB_KEY = 'sb_publishable_gWJFQNaGgeIAXZ2JUDj_Sw_E-elPQAF';
const sb = createClient(SB_URL, SB_KEY);
window.__sb = sb; // TEST MODE ONLY - remove before any live launch

const PRODUCTS = [
  ['bridge','Bridge'],['ground_up_construction','Ground-up construction'],['fix_flip','Fix & flip'],
  ['dscr_rental','DSCR rental'],['cash_out_refi','Cash-out refi'],['conforming_agency','Conforming / agency'],
  ['home_equity','Home equity']
];
const PROPS = [
  ['single_family','Single-family'],['2_4_unit','2-4 unit'],['condo','Condo'],['townhome','Townhome'],
  ['small_multifamily_5','Small multifamily (5+)'],['mixed_use','Mixed-use'],['other','Other']
];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});


function mapDbError(e){
  const m = (e && e.message) || '';
  if (m.includes('guidelines_fico_range')) return 'Min FICO must be between 300 and 850.';
  if (m.includes('guidelines_ltv_range')) return 'Max LTV must be between 0 and 100.';
  if (m.includes('guidelines_loan_range')) return 'Min loan is above max loan.';
  if (m.includes('guidelines_products_valid') || m.includes('guidelines_property_types_valid')) return 'One of the selected values is not recognized. Reload and try again.';
  if (m.includes('guidelines_states_nationwide_only')) return 'Nationwide cannot be combined with individual states.';
  if (m.includes('guidelines_states_valid')) return 'States must be real 2-letter codes, or Nationwide alone.';
  if (m.includes('guidelines_arrays_nonempty')) return 'Pick at least one product, one property type, and one state.';
  if (m.includes('duplicate key')) return 'That version already exists. Reload the page and try again.';
  if (m.includes('row-level security') || m.includes('permission denied')) return 'That change is not allowed on this account.';
  return null;
}
const friendly = e => mapDbError(e) || 'Something went wrong. Check the fields and try again.';

function showMsg(kind, text){
  const el = $(kind === 'err' ? 'msg-err' : 'msg-ok');
  el.textContent = text; el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 6000);
}

function buildPills(el, pairs){
  el.innerHTML = pairs.map(([v, label], i) =>
    `<input type="checkbox" id="${el.id}-${i}" value="${esc(v)}"><label for="${el.id}-${i}">${esc(label)}</label>`
  ).join('');
}
const pillValues = el => [...el.querySelectorAll('input:checked')].map(i => i.value);
const setPills = (el, vals) => { [...el.querySelectorAll('input')].forEach(i => { i.checked = vals.includes(i.value); }); };

buildPills($('g-products'), PRODUCTS);
buildPills($('g-props'), PROPS);

let lender = null;
let versions = [];

function parseStates(raw){
  const t = raw.trim();
  if (!t) return [];
  if (/^nationwide$/i.test(t)) return ['Nationwide'];
  return t.split(/[,\s]+/).filter(Boolean).map(s => s.toUpperCase());
}

async function loadApp(){
  const { data: mapRows, error: mapErr } = await sb.from('lender_users').select('lender_id');
  if (mapErr) throw mapErr;
  if (!mapRows || !mapRows.length) { showMsg('err', 'This sign-in is not linked to a lender yet.'); return; }
  const lenderId = mapRows[0].lender_id;

  const [{ data: lrow, error: lerr }, { data: vrows, error: verr }] = await Promise.all([
    sb.from('lenders').select('*').eq('id', lenderId).single(),
    sb.from('lender_guidelines').select('*').eq('lender_id', lenderId).order('version', { ascending: false })
  ]);
  if (lerr) throw lerr;
  if (verr) throw verr;
  lender = lrow; versions = vrows || [];

  $('app-company').textContent = lender.company || 'Your company';
  $('p-company').value = lender.company || '';
  $('p-type').value = lender.lender_type || '';
  $('p-email').value = lender.email || '';
  $('p-contact').value = lender.contact_name || '';
  $('p-phone').value = lender.phone || '';
  savedContact = { name: $('p-contact').value.trim(), phone: $('p-phone').value.trim() };

  renderVersions();
  prefillForm();
  $('view-signin').hidden = true;
  $('view-app').hidden = false;
}


function prefillForm(){
  const v = versions[0];
  if (!v) return;
  setPills($('g-products'), v.products || []);
  setPills($('g-props'), v.property_types || []);
  $('g-states').value = (v.states || []).join(', ');
  $('g-ltv').value = v.max_ltv_pct != null ? v.max_ltv_pct : '';
  $('g-min').value = v.min_loan_usd != null ? v.min_loan_usd : '';
  $('g-max').value = v.max_loan_usd != null ? v.max_loan_usd : '';
  $('g-fico').value = v.min_fico != null ? v.min_fico : '';
  $('g-notes').value = v.notes || '';
}

function renderVersions(){
  const newest = versions[0];
  if (newest) {
    $('app-updated').textContent = 'Guidelines last updated ' + fmtDate(newest.created_at);
    const age = Date.now() - new Date(newest.created_at).getTime();
    $('app-stale').hidden = age < 90 * 24 * 3600 * 1000;
  } else {
    $('app-updated').textContent = 'No guidelines on file';
    $('app-stale').hidden = true;
  }
  if (!versions.length) { $('v-list').innerHTML = '<p class="v-empty">No versions yet.</p>'; return; }
  $('v-list').innerHTML = versions.map((v, i) => {
    const label = slug => { const p = PRODUCTS.find(x => x[0] === slug) || PROPS.find(x => x[0] === slug); return p ? p[1] : slug; };
    const bits = [];
    if (v.products && v.products.length) bits.push(v.products.map(label).join(', '));
    if (v.states && v.states.length) bits.push(v.states.join(', '));
    if (v.max_ltv_pct != null) bits.push('up to ' + v.max_ltv_pct + '% LTV');
    const sub = bits.join(', ');
    return `<div class="v-row">
      <span class="v-num">v${esc(v.version)}</span>
      <div class="v-main"><b>${esc(fmtDate(v.created_at))}</b> ${i === 0 ? '<span class="badge cur">Current</span>' : ''}
        ${sub ? `<div class="v-sub">${esc(sub)}</div>` : ''}</div>
      ${v.pdf_path ? `<button class="btn ghost sm v-dl" data-path="${esc(v.pdf_path)}">PDF</button>` : '<span></span>'}
    </div>`;
  }).join('');
  [...document.querySelectorAll('.v-dl')].forEach(b => b.addEventListener('click', async () => {
    // Open the window synchronously so popup blockers allow it, then aim it.
    const w = window.open('', '_blank');
    const { data, error } = await sb.storage.from('guidelines').createSignedUrl(b.dataset.path, 60);
    if (error) { if (w) w.close(); showMsg('err', 'Could not open that file. Try again.'); return; }
    if (w) { w.location.href = data.signedUrl; w.opener = null; }
    else window.location.href = data.signedUrl;
  }));
}

$('app-print').addEventListener('click', () => window.print());

let savedContact = { name: '', phone: '' };
const contactDirty = () => $('p-contact').value.trim() !== savedContact.name || $('p-phone').value.trim() !== savedContact.phone;
window.addEventListener('beforeprint', () => { $('p-dirty').classList.toggle('on', contactDirty()); });
window.addEventListener('afterprint', () => { $('p-dirty').classList.remove('on'); });



$('si-email').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $('si-send').click(); }
});

$('si-send').addEventListener('click', async () => {
  const email = $('si-email').value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showMsg('err', 'Enter a valid email.'); return; }
  $('si-send').disabled = true;
  // shouldCreateUser: false + the same message either way, so the form
  // does not reveal which emails are on the panel.
  await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } });
  $('si-send').disabled = false;
  $('si-hint').textContent = 'If that email is on the panel, a sign-in link is on its way. It opens this page signed in.';
});

$('app-signout').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });

$('p-save').addEventListener('click', async () => {
  if (!lender) return;
  $('p-save').disabled = true;
  const { error } = await sb.from('lenders').update({
    contact_name: $('p-contact').value.trim() || null,
    phone: $('p-phone').value.trim() || null
  }).eq('id', lender.id);
  $('p-save').disabled = false;
  if (error) { showMsg('err', mapDbError(error) || 'Could not save. Try again.'); return; }
  savedContact = { name: $('p-contact').value.trim(), phone: $('p-phone').value.trim() };
  showMsg('ok', 'Contact saved.');
});

$('g-publish').addEventListener('click', async () => {
  if (!lender) return;
  const products = pillValues($('g-products'));
  const props = pillValues($('g-props'));
  const states = parseStates($('g-states').value);
  const ltv = $('g-ltv').value === '' ? null : Number($('g-ltv').value);
  const min = $('g-min').value === '' ? null : Number($('g-min').value);
  const max = $('g-max').value === '' ? null : Number($('g-max').value);
  const fico = $('g-fico').value === '' ? null : Number($('g-fico').value);
  const notes = $('g-notes').value.trim() || null;
  const file = $('g-pdf').files[0] || null;

  for (const id of ['g-ltv','g-min','g-max','g-fico']) {
    if ($(id).validity && $(id).validity.badInput) { showMsg('err', 'Numbers only in the LTV, loan, and FICO fields.'); return; }
  }
  if (!products.length) { showMsg('err', 'Pick at least one product.'); return; }
  if (!props.length) { showMsg('err', 'Pick at least one property type.'); return; }
  if (states.includes('Nationwide') && states.length > 1) { showMsg('err', 'Nationwide cannot be combined with individual states.'); return; }
  if (states.some(s => s !== 'Nationwide' && !/^[A-Z]{2}$/.test(s))) { showMsg('err', 'States must be 2-letter codes (or Nationwide).'); return; }
  if (!states.length) { showMsg('err', 'Enter states, or Nationwide.'); return; }
  if (ltv != null && (ltv < 0 || ltv > 100)) { showMsg('err', 'Max LTV must be 0-100.'); return; }
  if (fico != null && (fico < 300 || fico > 850)) { showMsg('err', 'FICO must be 300-850.'); return; }
  if (min != null && max != null && min > max) { showMsg('err', 'Min loan is above max loan.'); return; }
  if (file && file.type !== 'application/pdf') { showMsg('err', 'Guideline sheet must be a PDF.'); return; }
  if (file && file.size > 10 * 1024 * 1024) { showMsg('err', 'PDF is over 10 MB.'); return; }

  $('g-publish').disabled = true;
  try {
    let pdfPath = null;
    const nextVersion = (versions.length ? versions[0].version : 0) + 1;
    if (file) {
      pdfPath = lender.id + '/v' + nextVersion + '-' + Date.now() + '.pdf';
      const { error: uerr } = await sb.storage.from('guidelines').upload(pdfPath, file, { contentType: 'application/pdf', upsert: false });
      if (uerr) throw uerr;
    }
    const { error: ierr } = await sb.from('lender_guidelines').insert({
      lender_id: lender.id,
      version: nextVersion,
      products, property_types: props, states,
      max_ltv_pct: ltv, min_loan_usd: min, max_loan_usd: max, min_fico: fico,
      notes, pdf_path: pdfPath
    });
    if (ierr) throw ierr;
    showMsg('ok', 'Version ' + nextVersion + ' published.');
    $('g-notes').value = ''; $('g-pdf').value = '';
    const { data: vrows } = await sb.from('lender_guidelines').select('*').eq('lender_id', lender.id).order('version', { ascending: false });
    versions = vrows || [];
    renderVersions();
  } catch (e) {
    showMsg('err', friendly(e));
  } finally {
    $('g-publish').disabled = false;
  }
});

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) { try { await loadApp(); } catch (e) { showMsg('err', 'Load failed: ' + (e.message || e)); } }
  sb.auth.onAuthStateChange(async (event, sess) => {
    if (event === 'SIGNED_IN' && sess && $('view-app').hidden) {
      try { await loadApp(); } catch (e) { showMsg('err', 'Load failed: ' + (e.message || e)); }
    }
  });
})();