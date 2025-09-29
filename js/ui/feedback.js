// js/ui/feedback.js

const successSound = new Audio('./audio/success.mp3'); // Chemin local
const errorSound = new Audio('./audio/error.mp3');     // Chemin local

// Précharger les sons pour s'assurer qu'ils sont prêts
successSound.load();
errorSound.load();

const mobileContainer = document.querySelector('.mobile-container');

export function triggerScanFeedback(type) {
    if (!mobileContainer) {
        console.error("Element .mobile-container not found for scan feedback.");
        return;
    }

    if (type === 'success') {
        mobileContainer.classList.add('scan-success');
        console.log("Tentative de jouer le son de succès (local).");
        successSound.currentTime = 0;
        successSound.play().catch(e => console.error("Erreur lors de la lecture du son de succès (local):", e));
    } else if (type === 'error') {
        mobileContainer.classList.add('scan-error');
        console.log("Tentative de jouer le son d'erreur (local).");
        errorSound.currentTime = 0;
        errorSound.play().catch(e => console.error("Erreur lors de la lecture du son d'erreur (local):", e));
    }

    setTimeout(() => {
        mobileContainer.classList.remove('scan-success', 'scan-error');
    }, 500);
}