// js/ui/feedback.js

const errorSound = new Audio('../../audio/error.mp3'); // Chemin corrigé vers votre fichier audio d'erreur

// Précharger les sons pour s'assurer qu'ils sont prêts
errorSound.load();

const mobileContainer = document.querySelector('.mobile-container');

export function triggerScanFeedback(type) {
    if (!mobileContainer) {
        console.error("Element .mobile-container not found for scan feedback.");
        return;
    }

    if (type === 'success') {
        mobileContainer.classList.add('scan-success');
        // Si vous souhaitez réactiver le son de succès, décommentez les lignes ci-dessous et assurez-vous d'avoir un fichier success.mp3
        // successSound.currentTime = 0;
        // successSound.play().catch(e => console.error("Erreur lors de la lecture du son de succès:", e));
    } else if (type === 'error') {
        mobileContainer.classList.add('scan-error');
        console.log("Tentative de jouer le son d'erreur. Source:", errorSound.src);
        errorSound.currentTime = 0;
        errorSound.play().catch(e => console.error("Erreur lors de la lecture du son d'erreur:", e));
    }

    setTimeout(() => {
        mobileContainer.classList.remove('scan-success', 'scan-error');
    }, 500);
}