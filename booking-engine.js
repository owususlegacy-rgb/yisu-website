/* ============================================================
   YISU — SHARED BOOKING WIZARD ENGINE
   Services → Date & Time (dropdowns) → Details → Confirm
   WhatsApp handoff. Payment wired later.
   ============================================================ */

(function () {
  const CFG = window.SALON_CONFIG;
  if (!CFG || !document.getElementById('bookRoot')) return;

  /* ---- constants ---- */
  const BOOKING_FEE = 50;
  const WHATSAPP    = "27680965235";
  const SLOT_MINS   = 30;

  // Yoco Payment Page base link. Amount and reference are pre-filled;
  // redirectOnPaymentSuccess is built dynamically per booking below,
  // carrying the booking details through to booking-confirmed.html.
  const YOCO_BASE = "https://pay.yoco.com/salon-booking-fees";
  const SITE_BASE = "https://yisubeuaty.com"; // update if the domain changes
  // Show dates from today up to Dec 31 2026.
  // To extend: change the END_DATE string below.
  const END_DATE   = new Date('2026-12-31');
  const _today0    = new Date(); _today0.setHours(0,0,0,0);
  const DAYS_AHEAD = Math.max(1, Math.ceil((END_DATE - _today0) / 86400000) + 1);
  const HOURS = CFG.hours || {
    0:["07:00","18:00"], 1:["07:00","18:00"], 2:["07:00","18:00"],
    3:["07:00","18:00"], 4:["07:00","18:00"], 5:["07:00","18:00"],
    6:["07:00","18:00"]
  };

  const DOW  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MON  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const rand = n => Math.random().toString(36).slice(2, 2 + n).toUpperCase();

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const getSvc = id => {
    for (const cat of CFG.categories) {
      const f = cat.services.find(s => s.id === id);
      if (f) return f;
    }
    return null;
  };

  const state = { step: 1, services: [], date: null, time: null };

  /* ======================= STEP 1 — SERVICES ======================= */

  function paintServices () {
    $('#pickServices').innerHTML = CFG.categories.map((cat, i) => `
      <details class="cat-drop" ${i === 0 ? 'open' : ''}>
        <summary class="cat-drop-head">
          <span class="cat-drop-name">${cat.name}</span>
          <span class="cat-drop-meta">
            <span class="cat-drop-count" data-count-for="${cat.name}">${cat.services.length} services</span>
            <span class="cat-drop-arrow" aria-hidden="true"></span>
          </span>
        </summary>
        <div class="chips">${cat.services.map(s => `
          <button class="chip" type="button" data-pick="${s.id}" aria-pressed="false">
            <b>${s.name}</b>
            <span class="p">R${BOOKING_FEE}</span>
            <small>Booking fee</small>
          </button>`).join('')}</div>
      </details>`).join('');
  }

  /* Keeps each category's summary line showing how many of its
     services are currently selected, e.g. "2 of 6 selected". */
  function updateCategoryCounts () {
    CFG.categories.forEach(cat => {
      const el = document.querySelector(`[data-count-for="${CSS.escape(cat.name)}"]`);
      if (!el) return;
      const chosen = cat.services.filter(s => state.services.includes(s.id)).length;
      el.textContent = chosen > 0
        ? `${chosen} of ${cat.services.length} selected`
        : `${cat.services.length} services`;
      el.classList.toggle('has-selection', chosen > 0);
    });
  }

  function toggleService (id) {
    const i = state.services.indexOf(id);
    i > -1 ? state.services.splice(i, 1) : state.services.push(id);
    syncChips();
    updateCategoryCounts();
    paintSummary();
  }

  function syncChips () {
    $$('[data-pick]').forEach(el => {
      const on = state.services.includes(el.dataset.pick);
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on);
    });
  }

  /* ======================= STEP 2 — DATE & TIME DROPDOWNS ======================= */

  function buildDateOptions () {
    const sel = $('#dateSelect');
    sel.innerHTML = '<option value="">— Choose a day —</option>';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      if (!HOURS[d.getDay()]) continue; // closed that day

      const key   = d.toDateString();
      const label = i === 0
        ? `Today — ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
        : i === 1
        ? `Tomorrow — ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
        : `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;

      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = label;
      if (state.date === key) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function buildTimeOptions () {
    const sel = $('#timeSelect');
    sel.innerHTML = '<option value="">— Choose a time —</option>';
    sel.disabled = !state.date;

    if (!state.date) return;

    const d   = new Date(state.date);
    const h   = HOURS[d.getDay()];
    const [oh, om] = h[0].split(':').map(Number);
    const [ch, cm] = h[1].split(':').map(Number);
    const closeMin = ch * 60 + cm;

    const now     = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const nowMin  = now.getHours() * 60 + now.getMinutes();

    let t = oh * 60 + om;
    while (t + SLOT_MINS <= closeMin) {
      const label = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
      const past  = isToday && t <= nowMin + 30;

      if (!past) {
        const opt = document.createElement('option');
        opt.value       = label;
        opt.textContent = label;
        if (state.time === label) opt.selected = true;
        sel.appendChild(opt);
      }
      t += SLOT_MINS;
    }

    if (sel.options.length === 1) {
      sel.options[0].textContent = '— No slots left today, pick another day —';
    }
  }

  /* ======================= SUMMARY ======================= */

  function paintSummary () {
    const list = $('#sumlist');

    if (!state.services.length) {
      list.innerHTML = '<li class="muted"><span>No services selected</span><span>—</span></li>';
    } else {
      list.innerHTML = state.services.map(id => {
        const s = getSvc(id);
        return `<li><span>${s.name}</span><span>R${BOOKING_FEE}</span></li>`;
      }).join('');
    }

    $('#total').textContent = 'R' + (state.services.length * BOOKING_FEE);

    const bits = [];
    if (state.date) {
      const d = new Date(state.date);
      bits.push(`<b>${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}</b>${state.time ? ` at <b>${state.time}</b>` : ''}`);
    }
    if (state.services.length) {
      bits.push(`${state.services.length} service${state.services.length > 1 ? 's' : ''} &mdash; booking fee only. Service cost settled at salon.`);
    }
    $('#when').innerHTML = bits.length ? bits.join('<br>') : 'Select a service to begin.';
  }

  /* ======================= STEPS ======================= */

  function show (step) {
    state.step = step;
    $$('.panel').forEach(p => p.classList.toggle('on', +p.dataset.panel === step));
    $$('#steps span').forEach(s => {
      const n = +s.dataset.step;
      s.classList.toggle('on',   n === step);
      s.classList.toggle('done', n < step);
    });
    $('#navbtns').style.display   = step === 5 ? 'none' : 'flex';
    $('#back').style.visibility   = step === 1 ? 'hidden' : 'visible';
    $('#next').textContent        = step === 4 ? 'Proceed to payment' : 'Continue';
    if (step === 4) paintRecap();
    if (step === 2) { buildDateOptions(); buildTimeOptions(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validate (step) {
    if (step === 1 && !state.services.length) {
      alert('Select at least one service to continue.');
      return false;
    }
    if (step === 2) {
      if (!state.date) { alert('Please choose a day.'); return false; }
      if (!state.time) { alert('Please choose a time slot.'); return false; }
    }
    if (step === 3) {
      let ok = true;
      [
        ['fname',  v => v.trim().length > 1],
        ['fphone', v => v.replace(/\D/g, '').length >= 9]
      ].forEach(([id, test]) => {
        const f    = $('#' + id).closest('.field');
        const good = test($('#' + id).value);
        f.classList.toggle('bad', !good);
        if (!good) ok = false;
      });
      if (!ok) { const bad = $('.field.bad input'); if (bad) bad.focus(); }
      return ok;
    }
    return true;
  }

  function paintRecap () {
    const d = new Date(state.date);
    $('#recap').innerHTML =
      `<b>${$('#fname').value}</b> · ${$('#fphone').value}<br>` +
      `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} at ${state.time}<br>` +
      `${state.services.map(id => getSvc(id).name).join(', ')}<br>` +
      `Booking fee: R${state.services.length * BOOKING_FEE}`;
  }

  function waLink (ref) {
    const d     = new Date(state.date);
    const notes = $('#fnotes').value.trim();
    const email = $('#femail').value.trim();
    const msg =
`New booking — ${CFG.salonName}
Ref: ${ref}
Name: ${$('#fname').value}
Phone: ${$('#fphone').value}${email ? '\nEmail: ' + email : ''}
Date: ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} at ${state.time}
Services: ${state.services.map(id => getSvc(id).name).join(', ')}
Booking fee: R${state.services.length * BOOKING_FEE}${notes ? '\nNotes: ' + notes : ''}`;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  /* Builds the Yoco payment link with booking details baked into the
     redirect URL, so booking-confirmed.html can rebuild the WhatsApp
     message once the customer is sent back after paying. */
  function yocoLink (ref) {
    const d       = new Date(state.date);
    const dateStr = `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
    const notes   = $('#fnotes').value.trim();
    const email   = $('#femail').value.trim();
    const serviceNames = state.services.map(id => getSvc(id).name).join(', ');
    const total   = state.services.length * BOOKING_FEE;

    const returnParams = new URLSearchParams({
      salon:   CFG.salonName,
      ref:     ref,
      name:    $('#fname').value,
      phone:   $('#fphone').value,
      email:   email,
      date:    dateStr,
      time:    state.time,
      service: serviceNames,
      notes:   notes
    });
    const returnUrl = `${SITE_BASE}/booking-confirmed.html?${returnParams.toString()}`;

    const yocoParams = new URLSearchParams({
      amount: total.toFixed(2),
      reference: ref,
      redirectOnPaymentSuccess: returnUrl
    });
    return `${YOCO_BASE}?${yocoParams.toString()}`;
  }

  /* ======================= EVENT WIRING ======================= */

  /* service chip clicks */
  document.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick]');
    if (pick) { toggleService(pick.dataset.pick); }
  });

  /* date dropdown */
  document.addEventListener('change', e => {
    if (e.target.id === 'dateSelect') {
      state.date = e.target.value || null;
      state.time = null;
      buildTimeOptions();
      paintSummary();
    }
    if (e.target.id === 'timeSelect') {
      state.time = e.target.value || null;
      paintSummary();
    }
  });

  /* nav buttons */
  $('#next').addEventListener('click', () => {
    if (!validate(state.step)) return;
    if (state.step === 4) {
      const ref  = CFG.refPrefix + new Date().getFullYear().toString().slice(2) + rand(4);
      // Send the customer to pay first. booking-confirmed.html picks up
      // the booking details from the return URL and opens WhatsApp
      // automatically once payment succeeds.
      window.location.href = yocoLink(ref);
      return;
    }
    show(state.step + 1);
  });

  $('#back').addEventListener('click', () => show(state.step - 1));

  $('#restart').addEventListener('click', () => {
    state.services = [];
    state.date     = null;
    state.time     = null;
    ['fname','fphone','femail','fnotes'].forEach(id => $('#' + id).value = '');
    syncChips();
    updateCategoryCounts();
    paintSummary();
    show(1);
  });

  /* ---- boot ---- */
  paintServices();
  updateCategoryCounts();
  paintSummary();
  show(1);

})();