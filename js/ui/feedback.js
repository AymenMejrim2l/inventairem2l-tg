// js/ui/feedback.js

const successSound = new Audio('https://www.soundjay.com/button/button-09.mp3');
const errorSound = new Audio('https://www.soundjay.com/misc/fail-buzzer-01.mp3');
const mobileContainer = document.querySelector('.mobile-container'); // Assurez-vous que cet élément existe dans index.html

export function triggerScanFeedback(type) {
    if (!mobileContainer) {
        console.error("Element .mobile-container not found for scan feedback.");
        return;
    }

    if (type === 'success') {
        mobileContainer.classList.add('scan-success');
        successSound.play().catch(e => console.error("Error playing success sound:", e));
    } else if (type === 'error') {
        mobileContainer.classList.add('scan-error');
        errorSound.play().catch(e => console.error("Error playing error sound:", e));
    }

    setTimeout(() => {
        mobileContainer.classList.remove('scan-success', 'scan-error');
    }, 500); // Remove feedback classes after 0.5 seconds
}