// js/ui/feedback.js

const successSound = new Audio('https://www.soundjay.com/button/button-09.mp3');
const errorSound = new Audio('https://www.soundjay.com/misc/fail-buzzer-01.mp3');

// Précharger les sons pour s'assurer qu'ils sont prêts
successSound.load();
errorSound.load();

const mobileContainer = document.querySelector('.mobile-container'); // Assurez-vous que cet élément existe dans index.html

export function triggerScanFeedback(type) {
    if (!mobileContainer) {
        console.error("Element .mobile-container not found for scan feedback.");
        return;
    }

    if (type === 'success') {
        mobileContainer.classList.add('scan-success');
        console.log("Tentative de jouer le son de succès."); // Log de débogage
        successSound.currentTime = 0; // Remettre le son au début
        successSound.play().catch(e => console.error("Erreur lors de la lecture du son de succès:", e));
    } else if (type === 'error') {
        mobileContainer.classList.add('scan-error');
        console.log("Tentative de jouer le son d'erreur."); // Log de débogage
        errorSound.currentTime = 0; // Remettre le son au début
        errorSound.play().catch(e => console.error("Erreur lors de la lecture du son d'erreur:", e));
    }

    setTimeout(() => {
        mobileContainer.classList.remove('scan-success', 'scan-error');
    }, 500); // Supprimer les classes de feedback après 0.5 secondes
}