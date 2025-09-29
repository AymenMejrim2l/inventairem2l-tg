// js/ui/feedback.js

// Dynamiquement déterminer le chemin de base de l'application
const getAppBasePath = () => {
    const pathParts = window.location.pathname.split('/');
    // Si le dernier segment est un nom de fichier (ex: index.html), on remonte d'un niveau
    if (pathParts.length > 1 && pathParts[pathParts.length - 1].includes('.')) {
        return pathParts.slice(0, -1).join('/') + '/';
    }
    // Sinon, c'est déjà un chemin de répertoire
    return window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
};

const appBasePath = getAppBasePath();
const errorSound = new Audio(`${appBasePath}audio/error.mp3`);

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