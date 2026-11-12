document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#booking-form');
  if (!form) return;

  const checkIn = form.elements.checkin;
  const checkOut = form.elements.checkout;
  const room = form.elements.room;
  const total = document.querySelector('#booking-total');
  const status = document.querySelector('#form-status');
  const submitButton = form.querySelector('[type="submit"]');
  const testModeInput = form.elements.test_mode_acknowledged;
  const paymentReference = form.elements.payment_reference;
  const rates = { '1-bedroom-suite': 3000, '2-bedroom-suite': 4000, '3-bedroom-villa': 6000, '4-bedroom-villa': 7500, 'whole-compound': 15000 };
  const names = { '1-bedroom-suite': '1 Bedroom Suite', '2-bedroom-suite': '2 Bedroom Suite', '3-bedroom-villa': '3 Bedroom Family Villa', '4-bedroom-villa': '4 Bedroom Family Villa', 'whole-compound': '8 Bedroom Whole Compound / Private Event' };
  const format = value => new Intl.NumberFormat('en-KE').format(value);
  const dateInNairobi = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };
  const isPrivateEvent = () => form.elements.stay_type.value === 'Private event';
  const depositRate = () => room.value === 'whole-compound' || isPrivateEvent() ? 0.5 : 0.3;
  const getNights = () => Math.round((new Date(`${checkOut.value}T00:00:00Z`) - new Date(`${checkIn.value}T00:00:00Z`)) / 86400000);
  const bookingTotal = () => getNights() * rates[room.value];

  checkIn.min = dateInNairobi();

  const calculate = () => {
    if (!checkIn.value || !checkOut.value || !rates[room.value]) {
      total.textContent = 'Choose your dates and accommodation to see an estimated stay total.';
      return;
    }
    const nights = getNights();
    if (nights < 1) {
      total.textContent = 'Your check-out date needs to be after check-in.';
      return;
    }
    const method = form.elements.payment_option.value;
    const amount = bookingTotal();
    const percentage = Math.round(depositRate() * 100);
    const paymentText = method === 'deposit'
      ? `A ${percentage}% deposit of KSh ${format(Math.ceil(amount * depositRate()))} is due now; the balance is paid at check-in.`
      : method === 'pay-now'
        ? `KSh ${format(amount)} is due now.`
        : method === 'pay-later'
          ? 'No online payment is due now. The team will check availability; dates are not reserved until you receive confirmation.'
          : 'Choose a payment option to see your payment schedule.';
    total.innerHTML = `<strong>${nights} night${nights === 1 ? '' : 's'} × KSh ${format(rates[room.value])}</strong><br>Estimated accommodation total: <strong>KSh ${format(amount)}</strong> for the ${names[room.value]}. ${paymentText}`;
  };

  checkIn.addEventListener('change', () => {
    checkOut.min = checkIn.value || checkIn.min;
    if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = '';
    calculate();
  });
  [checkOut, room, form.elements.stay_type, ...form.querySelectorAll('[name="payment_option"]')]
    .forEach(element => element.addEventListener('change', calculate));

  const params = new URLSearchParams(window.location.search);
  const chosen = params.get('room');
  if (chosen && rates[chosen]) room.value = chosen;
  const privateTestMode = params.get('payment-test') === '1';
  testModeInput.value = privateTestMode ? 'true' : 'false';
  calculate();

  const onlineOptions = [...form.querySelectorAll('[value="pay-now"], [value="deposit"]')];
  const disableOnlinePayments = message => {
    onlineOptions.forEach(option => {
      option.disabled = true;
      option.closest('.payment-option').classList.add('payment-option--disabled');
    });
    status.textContent = message;
  };

  fetch('/.netlify/functions/payment-status')
    .then(response => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then(payment => {
      if (payment.enabled) return;
      if (payment.testAvailable && privateTestMode) {
        status.textContent = 'Paystack test mode is active. Use test payment details only; no real money will be charged.';
        status.classList.add('form-status--test');
        return;
      }
      disableOnlinePayments(payment.testAvailable
        ? 'Online payments are in final testing. You can still send a pay-at-check-in request.'
        : 'Online payment setup is being completed. You can still send a pay-at-check-in request.');
    })
    .catch(() => disableOnlinePayments('Online payments are temporarily unavailable. You can still send a pay-at-check-in request.'));

  const submitLead = async () => {
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    });
    if (!response.ok) throw new Error('We could not save your booking details. Please try again or contact us on WhatsApp.');
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (checkIn.value < checkIn.min) {
      status.textContent = 'Please choose a check-in date from today onward.';
      checkIn.focus();
      return;
    }
    if (getNights() < 1) {
      status.textContent = 'Please choose a check-out date after your check-in date.';
      checkOut.focus();
      return;
    }

    const method = form.elements.payment_option.value;
    if (method === 'pay-later') {
      form.elements.payment_status.value = 'pay-at-check-in requested; awaiting availability confirmation';
      form.submit();
      return;
    }

    submitButton.disabled = true;
    status.textContent = 'Preparing secure Paystack checkout…';
    try {
      const response = await fetch('/.netlify/functions/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.link || !data.reference) throw new Error(data.message || 'Online payment is not available yet.');
      paymentReference.value = data.reference;
      form.elements.payment_status.value = `Paystack ${data.mode} checkout created`;
      status.textContent = 'Saving your booking and opening secure checkout…';
      await submitLead();
      window.location.assign(data.link);
    } catch (error) {
      status.textContent = error.message || 'We could not start secure checkout. Please WhatsApp us and we will help.';
      submitButton.disabled = false;
    }
  });
});
