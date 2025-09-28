// js/app.js
import { store } from './store.js';

// Application State (now managed by the store, only transient state here)
let lastScanTime = 0;

// DOM Elements (cached for performance)
const configTabBtn = document.getElementById('configTab');
const scanTabBtn = document.getElementById('scanTab');
const resultsTabBtn = document.getElementById('resultsTab');

const configModule = document.getElementById('configModule');
const scanModule = document.getElementById('scanModule');
const resultsModule = document.getElementById('resultsModule');

const depotSelect = document.getElementById('depotSelect');
const zoneInput = document.getElementById('zoneInput');
const inventoriedBySelect = document.getElementById('inventoriedBySelect');
const dateInput = document.getElementById('dateInput');
const importExcelBtn = document.getElementById('importExcelBtn');
const excelFile = document.getElementById('excelFile');
const importStatusDiv = document.getElementById('importStatus');
const validateConfigBtn = document.getElementById('validateConfig');

const scanCountSpan = document.getElementById('scanCount');
const scannerStatusDiv = document.getElementById('scannerStatus');
const manualScanInput = document.getElementById('manualScan');
const scanBtn = document.getElementById('scanBtn');
const scanResultDiv = document.getElementById('scanResult');
const manualAddDiv = document.getElementById('manualAdd');
const manualBarcodeInput = document.getElementById('manualBarcode');
const manualCodeInput = document.getElementById('manualCode');
const manualLabelInput = document.getElementById("manualLabel");
const addManualProductBtn = document.getElementById('addManualProduct');
const cancelManualBtn = document.getElementById('cancelManual');
const recentScansDiv = document.getElementById('recentScans');
const emptyRecentScansPlaceholder = document.getElementById('emptyRecentScansPlaceholder');

const totalItemsSpan = document.getElementById('totalItems');
const exportFileNameSpan = document.getElementById('exportFileName');
const exportBtn = document.getElementById('exportBtn');
const resultsTableDiv = document.getElementById('resultsTable');
const clearResultsBtn = document.getElementById('clearResults');

const currentDateDiv = document.getElementById('currentDate');
const mobileContainer = document.querySelector('.mobile-container');

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    store.subscribe(render); // S'abonner aux changements d'état pour rafraîchir l'UI
});

function initializeApp() {
    const state = store.getState();

    // Initialisation des champs de configuration depuis le store
    depotSelect.value = state.config.depot;
    zoneInput.value = state.config.zone;
    inventoriedBySelect.value = state.config.inventoriedBy;
    dateInput.value = state.config.date;

    // Set current date for display (this is separate from the input field)
    currentDateDiv.textContent = new Date().toLocaleDateString('fr-FR');

    // Rendu initial de l'UI
    render(state);
}

function setupEventListeners() {
    // Tab navigation
    configTabBtn.addEventListener('click', () => store.setCurrentTab('config'));
    scanTabBtn.addEventListener('click', () => store.setCurrentTab('scan'));
    resultsTabBtn.addEventListener('click', () => store.setCurrentTab('results'));

    // Configuration
    validateConfigBtn.addEventListener('click', validateConfiguration);
    importExcelBtn.addEventListener('click', () => excelFile.click());
    excelFile.addEventListener('change', handleExcelImport);
    depotSelect.addEventListener('change', updateExportFileName);
    zoneInput.addEventListener('input', updateExportFileName);
    inventoriedBySelect.addEventListener('change', updateExportFileName);

    // Scanning
    scanBtn.addEventListener('click', performScan);
    manualScanInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performScan();
    });

    // Manual add
    addManualProductBtn.addEventListener('click', addManualProduct);
    cancelManualBtn.addEventListener('click', cancelManualAdd);

    // Results
    exportBtn.addEventListener('click', exportResults);
    clearResultsBtn.addEventListener('click', clearResults);
}

// Fonction de rendu principale qui réagit aux changements d'état
function render(state) {
    // Gérer l'affichage des onglets
    document.querySelectorAll('[id$="Tab"]').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-gray-600');
    });
    document.getElementById(state.currentTab + 'Tab').classList.add('bg-blue-600', 'text-white');
    document.getElementById(state.currentTab + 'Tab').classList.remove('text-gray-600');

    // Gérer l'affichage des modules
    configModule.classList.add('hidden');
    scanModule.classList.add('hidden');
    resultsModule.classList.add('hidden');
    document.getElementById(state.currentTab + 'Module').classList.remove('hidden');

    // Empêcher l'accès aux onglets scan/results sans configuration
    if ((state.currentTab === 'scan' || state.currentTab === 'results') && !state.isConfigured) {
        showNotification('Veuillez d\'abord configurer l\'inventaire', 'warning');
        store.setCurrentTab('config'); // Revenir à l'onglet de configuration
        return; // Arrêter le rendu pour éviter des erreurs
    }

    // Mettre à jour les éléments spécifiques à chaque module
    if (state.currentTab === 'scan') {
        updateRecentScansUI(state.scannedProducts);
        updateScanCountUI(state.scannedProducts);
    } else if (state.currentTab === 'results') {
        updateResultsTableUI(state.scannedProducts, state.config);
        updateScanCountUI(state.scannedProducts); // Pour mettre à jour le total des articles
        updateExportFileName(); // S'assurer que le nom du fichier d'export est à jour
    }
    // Pour l'onglet config, les champs sont déjà liés via value, pas de rendu spécifique ici
}

function validateConfiguration() {
    const depot = depotSelect.value;
    const zone = zoneInput.value;
    const inventoriedBy = inventoriedBySelect.value;
    const date = dateInput.value;
    const productDatabase = store.getState().productDatabase;

    if (!depot || !zone || !inventoriedBy || !date) {
        showNotification('Veuillez remplir tous les champs requis pour la configuration.', 'error');
        return;
    }

    if (productDatabase.length === 0) {
        showNotification('Veuillez importer la base d\'articles avant de valider la configuration.', 'error');
        return;
    }

    store.setConfig({ depot, zone, inventoriedBy, date });
    store.setIsConfigured(true);
    showNotification('Configuration validée avec succès !', 'success');
    store.setCurrentTab('scan'); // Move to scan tab after successful configuration
}

function handleExcelImport(event) {
    console.log('handleExcelImport: Fonction d\'importation Excel déclenchée.');
    const file = event.target.files[0];
    importStatusDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-800', 'text-red-800');
    importStatusDiv.innerHTML = '';
    store.setProductDatabase([]); // Clear previous database on new import attempt

    if (!file) {
        console.log('handleExcelImport: Aucun fichier sélectionné.');
        importStatusDiv.classList.add('hidden');
        return;
    }

    console.log('handleExcelImport: Fichier sélectionné:', file.name, file.type, file.size, 'bytes');

    const reader = new FileReader();

    reader.onload = function(e) {
        console.log('FileReader.onload: Lecture du fichier terminée avec succès.');
        try {
            const data = new Uint8Array(e.target.result);
            console.log('XLSX.read: Tentative de lecture du classeur Excel.');
            const workbook = XLSX.read(data, { type: 'array' });
            console.log('XLSX.read: Classeur lu.', workbook);

            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                displayImportError('Fichier Excel vide ou format incorrect.');
                console.error('handleExcelImport: Erreur - Fichier Excel vide ou format incorrect.');
                return;
            }

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            console.log('XLSX.utils.sheet_to_json: Tentative de conversion de la feuille en JSON.');

            if (!worksheet) {
                displayImportError('La première feuille du fichier Excel est vide.');
                console.error('handleExcelImport: Erreur - La première feuille du fichier Excel est vide.');
                return;
            }

            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log('XLSX.utils.sheet_to_json: Feuille convertie en JSON.', json);

            if (!json || json.length === 0) {
                displayImportError('Le fichier Excel ne contient pas de données.');
                console.error('handleExcelImport: Erreur - Le fichier Excel ne contient pas de données.');
                return;
            }

            // Ensure the first row (header) exists and is an array
            if (!Array.isArray(json[0])) {
                displayImportError('La première ligne du fichier Excel n\'est pas un format de tableau valide.');
                console.error('handleExcelImport: Erreur - La première ligne du fichier Excel n\'est pas un format de tableau valide.');
                return;
            }

            const headerRow = json[0];
            if (headerRow[0] !== 'CodeBarres' || headerRow[1] !== 'CodeArticle' || headerRow[2] !== 'Libelle') {
                displayImportError('Format de fichier Excel incorrect. Attendu: CodeBarres | CodeArticle | Libelle.');
                console.error('handleExcelImport: Erreur - Format de fichier Excel incorrect. Attendu: CodeBarres | CodeArticle | Libelle.');
                return;
            }

            // Process data rows
            console.log('handleExcelImport: Traitement des lignes de données.');
            const importedData = json.slice(1).map(row => {
                if (!Array.isArray(row) || row.length < 3) {
                    console.warn("Skipping malformed row in Excel import:", row);
                    return null;
                }
                return {
                    barcode: String(row[0]),
                    code: String(row[1]),
                    label: String(row[2])
                };
            }).filter(Boolean); // Remove null entries

            if (importedData.length === 0) {
                displayImportError('Aucune donnée d\'article valide trouvée après l\'importation.');
                console.error('handleExcelImport: Erreur - Aucune donnée d\'article valide trouvée après l\'importation.');
                return;
            }

            store.setProductDatabase(importedData);
            displayImportSuccess(`${importedData.length} articles importés avec succès.`);
            console.log('handleExcelImport: Importation réussie. Nombre d\'articles:', importedData.length);

        } catch (error) {
            displayImportError(`Erreur lors de l\'importation du fichier: ${error.message}`);
            console.error('handleExcelImport: Erreur inattendue lors du traitement du fichier:', error);
        }
    };

    reader.onerror = function(error) {
        displayImportError(`Erreur de lecture du fichier: ${error.message}`);
        console.error('FileReader.onerror: Erreur lors de la lecture du fichier:', error);
    };

    console.log('FileReader.readAsArrayBuffer: Démarrage de la lecture du fichier.');
    reader.readAsArrayBuffer(file);
}

function displayImportError(message) {
    importStatusDiv.classList.add('bg-red-100', 'text-red-800', 'p-2', 'rounded');
    importStatusDiv.innerHTML = `<i class="fas fa-times-circle mr-2"></i>Erreur: ${message}`;
    showNotification(`Erreur lors de l\'importation: ${message}`, 'error');
    store.setProductDatabase([]); // Ensure database is cleared on error
}

function displayImportSuccess(message) {
    importStatusDiv.classList.add('bg-green-100', 'text-green-800', 'p-2', 'rounded');
    importStatusDiv.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    showNotification(message, 'success');
}

function showNotification(message, type) {
    const notificationDiv = document.createElement('div');
    notificationDiv.textContent = message;
    notificationDiv.classList.add('notification', 'fixed', 'bottom-4', 'left-1/2', '-translate-x-1/2', 'px-4', 'py-2', 'rounded-lg', 'shadow-lg', 'text-white', 'z-50');

    if (type === 'success') {
        notificationDiv.classList.add('bg-green-500');
    } else if (type === 'error') {
        notificationDiv.classList.add('bg-red-500');
    } else if (type === 'warning') {
        notificationDiv.classList.add('bg-yellow-500');
    }

    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.remove();
    }, 3000);
}

// --- Helper functions for Recent Scans DOM manipulation ---
function createProductItemElement(product) {
    const productDiv = document.createElement('div');
    productDiv.classList.add('flex', 'items-center', 'justify-between', 'p-3', 'border-b', 'last:border-b-0', 'depot-item');
    productDiv.dataset.productId = product.id; // Use data-product-id for easy lookup
    updateProductItemElement(productDiv, product); // Populate content
    return productDiv;
}

function updateProductItemElement(element, product) {
    element.innerHTML = `
        <div>
            <p class="font-medium text-gray-800">${product.label}</p>
            <p class="text-sm text-gray-600">Code: ${product.code} | Barcode: ${product.barcode}</p>
            <p class="text-xs text-gray-500">Scanné le: ${product.timestamp}</p>
        </div>
        <div class="flex items-center space-x-2">
            <input type="number" min="1" value="${product.quantity}"
                   class="w-16 p-1 border rounded text-center"
                   onchange="window.updateQuantity(${product.id}, this.value)">
            <button class="text-blue-500 hover:text-blue-700" onclick="window.editProduct(${product.id})"><i class="fas fa-pencil-alt"></i></button>
            <button class="text-red-500 hover:text-red-700" onclick="window.deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
        </div>
    `;
}

function toggleEmptyRecentScansPlaceholder(scannedProducts) {
    if (scannedProducts.length === 0) {
        if (emptyRecentScansPlaceholder) {
            emptyRecentScansPlaceholder.classList.remove('hidden');
        } else {
            const placeholder = document.createElement('div');
            placeholder.id = 'emptyRecentScansPlaceholder';
            placeholder.classList.add('p-4', 'text-center', 'text-gray-500');
            placeholder.innerHTML = `<i class="fas fa-barcode text-4xl mb-2"></i><p>Aucun produit scanné</p>`;
            recentScansDiv.appendChild(placeholder);
        }
    } else {
        if (emptyRecentScansPlaceholder) {
            emptyRecentScansPlaceholder.classList.add('hidden');
        }
    }
}

function updateRecentScansUI(scannedProducts) {
    // Clear existing items to re-render based on the current state order
    recentScansDiv.innerHTML = '';
    scannedProducts.forEach(product => {
        recentScansDiv.appendChild(createProductItemElement(product));
    });
    toggleEmptyRecentScansPlaceholder(scannedProducts);
}
// --- End Helper functions ---


function performScan() {
    const barcode = manualScanInput.value.trim();
    if (!barcode) {
        showNotification('Veuillez entrer un code-barres ou scanner un produit.', 'warning');
        return;
    }

    const now = Date.now();
    if (now - lastScanTime < 300) { // Debounce scans reduced to 300ms
        showNotification('Veuillez attendre avant de scanner à nouveau.', 'warning');
        return;
    }
    lastScanTime = now;

    const productDatabase = store.getState().productDatabase;
    // Find product in database
    const productInfo = productDatabase.find(p => p.barcode === barcode);

    if (productInfo) {
        store.addOrUpdateScannedProduct(productInfo);
        showNotification(`Produit scanné: ${productInfo.label}`, 'success');
        manualScanInput.value = ''; // Clear input after successful scan
        triggerScanFeedback('success');
    } else {
        showNotification(`Produit non trouvé: ${barcode}. Veuillez l\'ajouter manuellement.`, 'error');
        manualBarcodeInput.value = barcode;
        manualCodeInput.value = '';
        manualLabelInput.value = '';
        manualAddDiv.classList.remove('hidden');
        triggerScanFeedback('error');
    }
}

function addManualProduct() {
    const barcode = manualBarcodeInput.value.trim();
    const code = manualCodeInput.value.trim();
    const label = manualLabelInput.value.trim();

    if (!barcode || !code || !label) {
        showNotification('Veuillez remplir tous les champs pour l\'ajout manuel.', 'error');
        return;
    }

    store.addOrUpdateScannedProduct({ barcode, code, label }, true); // Pass true for isManualAdd
    showNotification(`Produit ajouté manuellement: ${label}`, 'success');
    cancelManualAdd();
    triggerScanFeedback('success');
}

function cancelManualAdd() {
    manualAddDiv.classList.add('hidden');
    manualScanInput.value = '';
}

// Expose functions to global scope for inline event handlers
window.updateQuantity = function(id, newQuantity) {
    const state = store.getState();
    const product = state.scannedProducts.find(p => p.id === id);
    if (product) {
        const quantity = parseInt(newQuantity);
        if (!isNaN(quantity) && quantity >= 1) {
            store.updateScannedProductDetails(id, { quantity: quantity });
            showNotification(`Quantité mise à jour pour ${product.label}`, 'success');
        } else {
            showNotification('La quantité doit être un nombre valide et supérieur ou égal à 1.', 'error');
            // Revert input field to original quantity if invalid
            const productElement = document.querySelector(`[data-product-id="${product.id}"]`);
            if (productElement) {
                productElement.querySelector('input[type="number"]').value = product.quantity;
            }
        }
    }
};

function updateScanCountUI(scannedProducts) {
    // Sum up quantities for total items
    const totalScannedItems = scannedProducts.reduce((sum, product) => sum + product.quantity, 0);
    scanCountSpan.textContent = totalScannedItems;
    totalItemsSpan.textContent = totalScannedItems;
}

function updateResultsTableUI(scannedProducts, config) {
    resultsTableDiv.innerHTML = ''; // Clear previous table content

    if (scannedProducts.length === 0) {
        resultsTableDiv.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                <i class="fas fa-inbox text-4xl mb-2"></i>
                <p>Aucun résultat à afficher</p>
            </div>
        `;
        clearResultsBtn.classList.add('hidden');
        return;
    }

    clearResultsBtn.classList.remove('hidden');

    // Group products by barcode for results table
    const groupedProducts = {};
    scannedProducts.forEach(product => {
        if (groupedProducts[product.barcode]) {
            groupedProducts[product.barcode].quantity += product.quantity;
            if (new Date(product.timestamp) > new Date(groupedProducts[product.barcode].timestamp)) {
                groupedProducts[product.barcode].timestamp = product.timestamp;
            }
        } else {
            groupedProducts[product.barcode] = { ...product };
        }
    });

    const table = document.createElement('table');
    table.classList.add('min-w-full', 'divide-y', 'divide-gray-200');
    table.innerHTML = `
        <thead class="bg-gray-50">
            <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code-barres</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code Article</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Libellé</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Heure Dernier Scan</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
        </tbody>
    `;
    const tbody = table.querySelector('tbody');

    Object.values(groupedProducts).forEach(product => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${product.barcode}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${product.code}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${product.label}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${product.quantity}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${product.timestamp}</td>
            <td class="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-2" onclick="window.editProduct(${product.id})"><i class="fas fa-pencil-alt"></i></button>
                <button class="text-red-600 hover:text-red-900" onclick="window.deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
    });
    resultsTableDiv.appendChild(table);
}

window.deleteProduct = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
        store.deleteScannedProduct(id);
        showNotification('Produit supprimé.', 'success');
    }
};

window.editProduct = function(id) {
    const state = store.getState();
    const productToEdit = state.scannedProducts.find(product => product.id === id);
    if (!productToEdit) return;

    const newBarcode = prompt('Modifier le code-barres:', productToEdit.barcode);
    const newCode = prompt('Modifier le code article:', productToEdit.code);
    const newLabel = prompt('Modifier le libellé:', productToEdit.label);
    const newQuantity = prompt('Modifier la quantité:', productToEdit.quantity);

    if (newBarcode !== null && newCode !== null && newLabel !== null && newQuantity !== null) {
        const quantity = parseInt(newQuantity);
        if (!isNaN(quantity) && quantity >= 1) {
            store.updateScannedProductDetails(id, {
                barcode: newBarcode,
                code: newCode,
                label: newLabel,
                quantity: quantity
            });
            showNotification('Produit modifié avec succès.', 'success');
        } else {
            showNotification('La quantité doit être un nombre valide et supérieur ou égal à 1.', 'error');
        }
    }
};

function exportResults() {
    const state = store.getState();
    const scannedProducts = state.scannedProducts;
    const config = state.config;

    if (scannedProducts.length === 0) {
        showNotification('Aucun produit à exporter.', 'warning');
        return;
    }

    // Retrieve current configuration values directly from DOM elements
    const currentDepot = depotSelect.value;
    const currentZone = zoneInput.value;
    const currentDate = dateInput.value;
    const currentInventoriedBy = inventoriedBySelect.value;

    // Validate if configuration fields are filled before export
    if (!currentDepot || !currentZone || !currentInventoriedBy || !currentDate) {
        showNotification('Veuillez vous assurer que tous les champs de configuration sont remplis avant d\'exporter.', 'error');
        return;
    }

    // Group products by barcode for export
    const groupedProducts = {};
    scannedProducts.forEach(product => {
        if (groupedProducts[product.barcode]) {
            groupedProducts[product.barcode].quantity += product.quantity;
            if (new Date(product.timestamp) > new Date(groupedProducts[product.barcode].timestamp)) {
                groupedProducts[product.barcode].timestamp = product.timestamp;
            }
        } else {
            groupedProducts[product.barcode] = { ...product };
        }
    });

    const data = Object.values(groupedProducts).map(p => [
        p.barcode,
        p.code,
        p.label,
        p.quantity,
        p.timestamp,
        currentDepot,
        currentZone,
        currentDate,
        currentInventoriedBy
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
        ['CodeBarres', 'CodeArticle', 'Libelle', 'Quantité', 'Date/Heure Dernier Scan', 'Dépôt', 'Zone', 'Date Inventaire', 'Inventorié par'],
        ...data
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');

    const fileName = `Inventaire_${currentDepot}_${currentZone}_${currentDate}_${currentInventoriedBy}.xlsx`;
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Vider les résultats après l'exportation réussie
    store.clearScannedProducts();
    showNotification('Exportation Excel réussie et liste des résultats vidée !', 'success');
}

function clearResults() {
    if (confirm('Êtes-vous sûr de vouloir vider tous les résultats scannés ?')) {
        store.clearScannedProducts();
        showNotification('Tous les résultats ont été vidés.', 'success');
    }
}

function updateExportFileName() {
    const state = store.getState();
    const depot = depotSelect.value || 'depot';
    const zone = zoneInput.value || 'zone';
    const date = dateInput.value || 'date';
    const inventoriedBy = inventoriedBySelect.value || 'inventorieur';
    exportFileNameSpan.textContent = `${depot}_${zone}_${date}_${inventoriedBy}`;
}

// --- Scan Feedback (Visual & Sound) ---
const successSound = new Audio('https://www.soundjay.com/button/button-09.mp3');
const errorSound = new Audio('https://www.soundjay.com/misc/fail-buzzer-01.mp3');

function triggerScanFeedback(type) {
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