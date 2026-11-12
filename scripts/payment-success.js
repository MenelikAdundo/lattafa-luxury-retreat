document.addEventListener('DOMContentLoaded', async () => {
  const card = document.querySelector('#payment-result');
  if (!card) return;
  const mark = card.querySelector('.success-mark');
  const eyebrow = card.querySelector('.eyebrow');
  const heading = card.querySelector('h1');
  const message = card.querySelector('#payment-message');
  const details = card.querySelector('#payment-details');
  const reference = new URLSearchParams(window.location.search).get('reference');

  const fail = text => {
    mark.textContent = '!';
    mark.classList.add('success-mark--error');
    eyebrow.textContent = 'Payment not verified';
    heading.textContent = 'We could not confirm this payment yet.';
    message.textContent = text;
    card.removeAttribute('aria-busy');
  };

  if (!reference) {
    fail('No Paystack payment reference was supplied. If you have paid, contact Phillip and share your Paystack receipt.');
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/verify-payment?reference=${encodeURIComponent(reference)}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.paid) throw new Error(result.message || 'Payment could not be verified.');
    mark.textContent = '✓';
    eyebrow.textContent = 'Payment verified';
    heading.textContent = 'Thank you. Your payment is secure.';
    message.textContent = 'Paystack has confirmed your payment. Phillip will now verify availability and send your final booking confirmation.';
    details.textContent = `${result.accommodation} · KSh ${new Intl.NumberFormat('en-KE').format(result.amount)} · Reference ${result.reference}`;
    details.hidden = false;
    card.removeAttribute('aria-busy');
  } catch (error) {
    fail(`${error.message || 'Payment verification is temporarily unavailable.'} Reference: ${reference}. No second payment is needed while the team checks this.`);
  }
});
