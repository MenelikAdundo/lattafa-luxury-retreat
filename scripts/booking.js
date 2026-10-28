document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#booking-form');
  if (!form) return;
  const checkIn = form.elements.checkin;
  const checkOut = form.elements.checkout;
  const room = form.elements.room;
  const total = document.querySelector('#booking-total');
  const status = document.querySelector('#form-status');
  const rates = { '1-bedroom-suite': 3000, '2-bedroom-suite': 4000, '3-bedroom-villa': 6000, '4-bedroom-villa': 7500, 'whole-compound': 15000 };
  const names = { '1-bedroom-suite': '1 Bedroom Suite', '2-bedroom-suite': '2 Bedroom Suite', '3-bedroom-villa': '3 Bedroom Family Villa', '4-bedroom-villa': '4 Bedroom Family Villa', 'whole-compound': 'Whole Compound / Private Event' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().slice(0, 10);
  checkIn.min = todayString;
  const number = value => new Intl.NumberFormat('en-KE').format(value);
  const calculate = () => {
    if (!checkIn.value || !checkOut.value || !rates[room.value]) { total.innerHTML = 'Choose your dates and accommodation to see an estimated stay total.'; return; }
    const nights = Math.round((new Date(`${checkOut.value}T00:00:00`) - new Date(`${checkIn.value}T00:00:00`)) / 86400000);
    if (nights < 1) { total.innerHTML = 'Your check-out date needs to be after check-in.'; return; }
    total.innerHTML = `<strong>${nights} night${nights === 1 ? '' : 's'} × KSh ${number(rates[room.value])}</strong><br>Estimated accommodation total: <strong>KSh ${number(nights * rates[room.value])}</strong> for the ${names[room.value]}. Final availability and confirmation will be shared by our team.`;
  };
  checkIn.addEventListener('change', () => { checkOut.min = checkIn.value || todayString; if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = ''; calculate(); });
  [checkOut, room].forEach(element => element.addEventListener('change', calculate));
  const chosen = new URLSearchParams(window.location.search).get('room');
  if (chosen && rates[chosen]) { room.value = chosen; calculate(); }
  form.addEventListener('submit', event => {
    if (!checkIn.value || !checkOut.value || new Date(checkOut.value) <= new Date(checkIn.value)) {
      event.preventDefault(); status.textContent = 'Please choose a check-out date after your check-in date.'; checkOut.focus(); return;
    }
    status.textContent = 'Sending your booking enquiry…';
  });
});
