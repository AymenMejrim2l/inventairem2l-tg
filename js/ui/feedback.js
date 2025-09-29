// js/ui/feedback.js

// Les fichiers audio ne sont pas disponibles, donc nous désactivons la lecture des sons.
// const successSound = new Audio('../../audio/success.mp3');
// const errorSound = new Audio('../../audio/error.mp3');

// Précharger les sons pour s'assurer qu'ils sont prêts (désactivé)
// successSound.load();
// errorSound.load();

const mobileContainer = document.querySelector('.mobile-container');

export function triggerScanFeedback(type) {
    if (!mobileContainer) {
        console.error("Element .mobile-container not found for scan feedback.");
        return;
    }

    if (type === 'success') {
        mobileContainer.classList.add('scan-success');
        // console.log("Tentative de jouer le son de succès. Source:", successSound.src);
        // successSound.currentTime = 0;
        // successSound.play().catch(e => console.error("Erreur lors de la lecture du son de succès:", e));
    } else if (type === 'error') {
        mobileContainer.classList.add('scan-error');
        // console.log("Tentative de jouer le son d'erreur. Source:", errorSound.src);
        // errorSound.currentTime = 0;
        // errorSound.play().catch(e => console.error("Erreur lors de la lecture du son d'erreur:", e));
    }

    setTimeout(() => {
        mobileContainer.classList.remove('scan-success', 'scan-error');
    }, 500);
}