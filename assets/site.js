/* Blank. website: support form and FAQ deep links. No cookies, no storage, no trackers. */
(function () {
  'use strict';

  var ENDPOINT = 'https://nxibeiykcgxpbmkeadth.supabase.co/functions/v1/reps-api/v1/support';
  var MIN = 10;
  var MAX = 4000;
  var TIMEOUT_MS = 15000;

  /* Open a FAQ answer when the page is opened at its #id, e.g. support.html#cancel. */
  function openFromHash() {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    if (!id) return;
    var el = document.getElementById(id);
    var details = el && (el.tagName === 'DETAILS' ? el : el.closest('details'));
    if (details && !details.open) {
      details.open = true;
      el.scrollIntoView();
    }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  var form = document.querySelector('[data-support-form]');
  if (!form) return;

  var message = form.querySelector('#message');
  var email = form.querySelector('#email');
  var website = form.querySelector('#website');
  var button = form.querySelector('button[type="submit"]');
  var counter = form.querySelector('#message-count');
  var messageError = form.querySelector('#message-error');
  var emailError = form.querySelector('#email-error');
  var status = form.querySelector('#form-status');
  var sent = document.getElementById('form-sent');
  var sentTitle = document.getElementById('form-sent-title');
  var again = document.getElementById('form-again');
  var buttonLabel = button.textContent;
  var fmt = new Intl.NumberFormat('en-US');

  button.disabled = false;

  function updateCount() {
    var n = message.value.trim().length;
    counter.textContent = fmt.format(n) + ' / ' + fmt.format(MAX);
    counter.classList.toggle('is-over', n > MAX);
  }

  function setError(field, box, text) {
    box.textContent = text;
    if (text) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function validate() {
    var text = message.value.trim();
    var addr = email.value.trim();
    var firstBad = null;

    if (text.length < MIN) {
      setError(message, messageError, 'Please write at least ' + MIN + ' characters so we know how to help.');
      firstBad = message;
    } else if (text.length > MAX) {
      setError(message, messageError, 'That\u2019s over ' + fmt.format(MAX) + ' characters. Please shorten it a little.');
      firstBad = message;
    } else {
      setError(message, messageError, '');
    }

    if (addr && !validEmail(addr)) {
      setError(email, emailError, 'That email address doesn\u2019t look right. Check it, or leave it blank.');
      firstBad = firstBad || email;
    } else {
      setError(email, emailError, '');
    }

    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function setSending(on) {
    button.disabled = on;
    button.textContent = on ? 'Sending\u2026' : buttonLabel;
    form.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function failText(res) {
    if (!res) return 'We couldn\u2019t reach our server. Check your connection and try again.';
    if (res.status === 429) return 'Too many messages from this connection. Please try again later.';
    if (res.status >= 400 && res.status < 500) return 'That didn\u2019t go through. Check your message and try again.';
    return 'Something went wrong on our side. Please try again in a few minutes.';
  }

  message.addEventListener('input', function () {
    updateCount();
    if (messageError.textContent) setError(message, messageError, '');
  });
  email.addEventListener('input', function () {
    if (emailError.textContent) setError(email, emailError, '');
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    status.textContent = '';
    if (button.disabled || !validate()) return;

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    setSending(true);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: message.value.trim(),
        email: email.value.trim(),
        source: 'web',
        website: website.value
      }),
      signal: controller ? controller.signal : undefined,
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    })
      .then(function (res) {
        if (!res.ok) throw res;
        return res.json().catch(function () { return {}; });
      })
      .then(function (data) {
        if (data && data.ok === false) throw { status: 500 };
        form.reset();
        updateCount();
        form.hidden = true;
        sent.hidden = false;
        sentTitle.focus();
      })
      .catch(function (err) {
        status.textContent = failText(err && typeof err.status === 'number' ? err : null);
      })
      .then(function () {
        if (timer) clearTimeout(timer);
        setSending(false);
      });
  });

  again.addEventListener('click', function () {
    sent.hidden = true;
    form.hidden = false;
    message.focus();
  });

  updateCount();
})();
