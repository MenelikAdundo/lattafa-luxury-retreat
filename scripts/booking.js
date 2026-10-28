document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#booking-form');
  if (!form) return;
  const checkIn = form.elements.checkin;
  const checkOut = form.elements.checkout;
  const room = form.elements.room;
  const total = document.querySelector('#booking-total');
  const status = document.querySelector('#form-status');
  const submitButton = form.querySelector('[type="submit"]');
  const rates = { '1-bedroom-suite': 3000, '2-bedroom-suite': 4000, '3-bedroom-villa': 6000, '4-bedroom-villa': 7500, 'whole-compound': 15000 };
  const names = { '1-bedroom-suite': '1 Bedroom Suite', '2-bedroom-suite': '2 Bedroom Suite', '3-bedroom-villa': '3 Bedroom Family Villa', '4-bedroom-villa': '4 Bedroom Family Villa', 'whole-compound': 'Whole Compound / Private Event' };
  const format = value => new Intl.NumberFormat('en-KE').format(value);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  checkIn.min = today.toISOString().slice(0, 10);
  const getNights = () => Math.round((new Date(`${checkOut.value}T00:00:00`) - new Date(`${checkIn.value}T00:00:00`)) / 86400000);
  const bookingTotal = () => getNights() * rates[room.value];
  const calculate = () => {
    if (!checkIn.value || !checkOut.value || !rates[room.value]) { total.textContent = 'Choose your dates and accommodation to see an estimated stay total.'; return; }
    const nights = getNights();
    if (nights < 1) { total.textContent = 'Your check-out date needs to be after check-in.'; return; }
    const method = form.elements.payment_option.value;
    const amount = bookingTotal();
    const paymentText = method === 'deposit' ? `A 30% deposit of KSh ${format(Math.ceil(amount * 0.3))} is due now; the balance is paid at check-in.` : method === 'pay-now' ? `KSh ${format(amount)} is due now.` : method === 'pay-later' ? 'No online payment is due now. We will confirm availability within 12 hours.' : 'Choose a payment option to see your payment schedule.';
    total.innerHTML = `<strong>${nights} night${nights === 1 ? '' : 's'} × KSh ${format(rates[room.value])}</strong><br>Estimated accommodation total: <strong>KSh ${format(amount)}</strong> for the ${names[room.value]}. ${paymentText}`;
  };
  checkIn.addEventListener('change', () => { checkOut.min = checkIn.value || checkIn.min; if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = ''; calculate(); });
  [checkOut, room, ...form.querySelectorAll('[name="payment_option"]')].forEach(element => element.addEventListener('change', calculate));
  const chosen = new URLSearchParams(window.location.search).get('room'); if (chosen && rates[chosen]) room.value = chosen;
  calculate();
  const submitLead = async () => fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (getNights() < 1) { status.textContent = 'Please choose a check-out date after your check-in date.'; checkOut.focus(); return; }
    const method = form.elements.payment_option.value;
    if (method === 'pay-later') { form.elements.payment_status.value = 'pay-at-check-in requested'; form.submit(); return; }
    submitButton.disabled = true; status.textContent = 'Saving your booking details and preparing secure checkout…';
    try {
      await submitLead();
      const response = await fetch('/.netlify/functions/create-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = await response.json();
      if (!response.ok || !data.link) throw new Error(data.message || 'Online payment is not available yet.');
      window.location.assign(data.link);
    } catch (error) { status.textContent = error.message || 'We could not start secure checkout. Please WhatsApp us and we will help.'; submitButton.disabled = false; }
  });
});
