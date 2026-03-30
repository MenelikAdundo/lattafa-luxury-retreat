document.addEventListener('DOMContentLoaded', () => {
    // Parse URL params for pre-selected room
    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedRoom = urlParams.get('room');
    if (preSelectedRoom) {
        const option = document.querySelector(`.room-option[data-val="${preSelectedRoom}"]`);
        if (option) {
            selectRoom(preSelectedRoom, option);
            // Optionally auto-skip to step 2 if they came from a room link?
            // nextStep(2); 
        }
    }

    const form = document.getElementById('booking-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            // Simulate API logic and Anti-Gravity CRM integration
            const formData = new FormData(form);
            const bookingData = Object.fromEntries(formData.entries());
            console.log("Anti-Gravity CRM - New Booking Lead Captured:", bookingData);
            
            // Show Success
            document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
            document.getElementById('step-success').classList.add('active');
            document.querySelector('.step-indicator').style.display = 'none';
        });
    }
});

function nextStep(step) {
    if (step === 2) {
        const checkin = document.querySelector('input[name="checkin"]').value;
        const checkout = document.querySelector('input[name="checkout"]').value;
        if (!checkin || !checkout) {
            alert('Please select check-in and check-out dates.');
            return;
        }
    }
    if (step === 3) {
        const room = document.getElementById('selected-room').value;
        if (!room) {
            alert('Please select a room type.');
            return;
        }
    }
    
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    for (let i = 1; i <= step; i++) {
        document.getElementById(`indicator-${i}`).classList.add('active');
    }
}

function prevStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    for (let i = 1; i <= step; i++) {
        document.getElementById(`indicator-${i}`).classList.add('active');
    }
}

function selectRoom(val, element) {
    document.getElementById('selected-room').value = val;
    document.querySelectorAll('.room-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}
