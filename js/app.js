// js/app.js
import { saveState, loadState, clearState } from './storage.js';

// Application State
let currentTab = 'config';
let isConfigured = false;
let scannedProducts = []; // Now stores unique products with quantities
let productDatabase = [];
let lastScanTime = 0;
let config = {
    depot: '',
    zone: '',
    inventoriedBy: '', // Nouveau champ pour la personne qui inventorie
    date: ''
};

// DOM Elements (cached for performance)
const configTabBtn = document.getElementById('configTab');
const scanTabBtn = document.getElementById('scanTab');
const resultsTabBtn = document.getElementById('resultsTab');

const configModule = document.getElementById('configModule');
const scanModule = document.getElementById('scanModule');
const resultsModule = document.getElementById('resultsModule');

const depotSelect = document.getElementById('depotSelect');
const zoneInput = document.getElementById('zoneInput');
const inventoriedBySelect = document.getElementById('inventoriedBySelect'); // Nouveau DOM element
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
const manualLabelInput = document.getElementById('manualLabel');
const addManualProductBtn = document.getElementById('addManualProduct');
const cancelManualBtn = document.getElementById('cancelManual');
const recentScansDiv = document.getElementById('recentScans');

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
});

function initializeApp() {
    // Load state from localStorage
    const savedConfig = loadState('inventoryConfig');
    const savedScannedProducts = loadState('scannedProducts');

    if (savedConfig) {
        config = savedConfig;
        depotSelect.value = config.depot;
        zoneInput.value = config.zone;
        inventoriedBySelect.value = config.inventoriedBy; // Charge la personne qui inventorie
        dateInput.value = config.date;
        isConfigured = true;
        updateExportFileName();
    } else {
        // Si aucune configuration n'est sauvegardée, initialise la date à aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    if (savedScannedProducts) {
        scannedProducts = savedScannedProducts;
        updateRecentScans();
        updateScanCount();
    }

    // Set current date for display (this is separate from the input field)
    currentDateDiv.textContent = new Date().toLocaleDateString('fr-FR');

    // Initial tab display
    switchTab(currentTab);
}

function setupEventListeners() {
    // Tab navigation
    configTabBtn.addEventListener('click', () => switchTab('config'));
    scanTabBtn.addEventListener('click', () => switchTab('scan'));
    resultsTabBtn.addEventListener('click', () => switchTab('results'));

    // Configuration
    validateConfigBtn.addEventListener('click', validateConfiguration);
    importExcelBtn.addEventListener('click', () => excelFile.click());
    excelFile.addEventListener('change', handleExcelImport);
    depotSelect.addEventListener('change', updateExportFileName);
    zoneInput.addEventListener('input', updateExportFileName);
    inventoriedBySelect.addEventListener('change', updateExportFileName); // Écouteur pour le nouveau champ

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

function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('[id$="Tab"]').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-gray-600');
    });
    document.getElementById(tab + 'Tab').classList.add('bg-blue-600', 'text-white');
    document.getElementById(tab + 'Tab').classList.remove('text-gray-600');

    // Show/hide modules
    configModule.classList.add('hidden');
    scanModule.classList.add('hidden');
    resultsModule.classList.add('hidden');
    document.getElementById(tab + 'Module').classList.remove('hidden');

    currentTab = tab;

    // Prevent access to scan/results without configuration
    if ((tab === 'scan' || tab === 'results') && !isConfigured) {
        showNotification('Veuillez d\'abord configurer l\'inventaire', 'warning');
        switchTab('config');
    }
}

function validateConfiguration() {
    const depot = depotSelect.value;
    const zone = zoneInput.value;
    const inventoriedBy = inventoriedBySelect.value; // Récupère la valeur du nouveau champ
    const date = dateInput.value;

    if (!depot || !zone || !inventoriedBy || !date) { // Ajoute inventoriedBy à la validation
        showNotification('Veuillez remplir tous les champs requis pour la configuration.', 'error');
        return;
    }

    if (productDatabase.length === 0) {
        showNotification('Veuillez importer la base d\'articles avant de valider la configuration.', 'error');
        return;
    }

    config = { depot, zone, inventoriedBy, date }; // Inclut inventoriedBy dans la configuration
    isConfigured = true;
    saveState('inventoryConfig', config); // Save config
    showNotification('Configuration validée avec succès !', 'success');
    switchTab('scan'); // Move to scan tab after successful configuration
}

function handleExcelImport(event) {
    const file = event.target.files[0];
    importStatusDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-800', 'text-red-800');
    importStatusDiv.innerHTML = '';
    productDatabase = []; // Clear previous database on new import attempt

    if (!file) {
        importStatusDiv.classList.add('hidden');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                displayImportError('Fichier Excel vide ou format incorrect.');
                return;
            }

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            if (!worksheet) {
                displayImportError('La première feuille du fichier Excel est vide.');
                return;
            }

            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!json || json.length === 0) {
                displayImportError('Le fichier Excel ne contient pas de données.');
                return;
            }

            // Ensure the first row (header) exists and is an array
            if (!Array.isArray(json[0])) {
                displayImportError('La première ligne du fichier Excel n\'est pas un format de tableau valide.');
                return;
            }

            const headerRow = json[0];
            if (headerRow[0] !== 'CodeBarres' || headerRow[1] !== 'CodeArticle' || headerRow[2] !== 'Libelle') {
                displayImportError('Format de fichier Excel incorrect. Attendu: CodeBarres | CodeArticle | Libelle.');
                return;
            }

            // Process data rows
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
                return;
            }

            productDatabase = importedData;
            displayImportSuccess(`${productDatabase.length} articles importés avec succès.`);

        } catch (error) {
            displayImportError(`Erreur lors de l\'importation du fichier: ${error.message}`);
        }
    };
    reader.readAsArrayBuffer(file);
}

function displayImportError(message) {
    importStatusDiv.classList.add('bg-red-100', 'text-red-800', 'p-2', 'rounded');
    importStatusDiv.innerHTML = `<i class="fas fa-times-circle mr-2"></i>Erreur: ${message}`;
    showNotification(`Erreur lors de l\'importation: ${message}`, 'error');
    productDatabase = []; // Ensure database is cleared on error
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

    // Find product in database
    const productInfo = productDatabase.find(p => p.barcode === barcode);

    if (productInfo) {
        const existingProductIndex = scannedProducts.findIndex(p => p.barcode === barcode);

        if (existingProductIndex !== -1) {
            // If exists, remove it, update, and add back to top
            const existingProduct = scannedProducts[existingProductIndex];
            scannedProducts.splice(existingProductIndex, 1); // Remove from current position
            existingProduct.quantity++;
            existingProduct.timestamp = new Date().toLocaleString('fr-FR');
            scannedProducts.unshift(existingProduct); // Add back to the beginning
        } else {
            // If not exists, add new product with quantity 1
            const newProduct = {
                id: Date.now(), // Unique ID for each scanned item
                barcode: productInfo.barcode,
                code: productInfo.code,
                label: productInfo.label,
                quantity: 1, // Initialize quantity to 1
                timestamp: new Date().toLocaleString('fr-FR')
            };
            scannedProducts.unshift(newProduct); // Add to the beginning
        }
        saveState('scannedProducts', scannedProducts); // Save scanned products
        updateRecentScans();
        updateScanCount();
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

    const existingProductIndex = scannedProducts.findIndex(p => p.barcode === barcode);

    if (existingProductIndex !== -1) {
        const existingProduct = scannedProducts[existingProductIndex];
        scannedProducts.splice(existingProductIndex, 1); // Remove from current position
        existingProduct.quantity++;
        existingProduct.timestamp = new Date().toLocaleString('fr-FR');
        scannedProducts.unshift(existingProduct); // Add back to the beginning
    } else {
        const newProduct = {
            id: Date.now(),
            barcode: barcode,
            code: code,
            label: label,
            quantity: 1, // Initialize quantity to 1 for manual add
            timestamp: new Date().toLocaleString('fr-FR')
        };
        scannedProducts.unshift(newProduct);
    }
    productDatabase.push({ barcode, code, label }); // Add to productDatabase for future scans
    saveState('scannedProducts', scannedProducts); // Save scanned products
    updateRecentScans();
    updateScanCount();
    showNotification(`Produit ajouté manuellement: ${label}`, 'success');
    cancelManualAdd();
    triggerScanFeedback('success');
}

function cancelManualAdd() {
    manualAddDiv.classList.add('hidden');
    manualScanInput.value = '';
}

function updateRecentScans() {
    recentScansDiv.innerHTML = '';

    if (scannedProducts.length === 0) {
        recentScansDiv.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                <i class="fas fa-barcode text-4xl mb-2"></i>
                <p>Aucun produit scanné</p>
            </div>
        `;
        return;
    }

    scannedProducts.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.classList.add('flex', 'items-center', 'justify-between', 'p-3', 'border-b', 'last:border-b-0', 'depot-item');
        productDiv.innerHTML = `
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
        recentScansDiv.appendChild(productDiv);
    });
}

// Expose functions to global scope for inline event handlers
window.updateQuantity = function(id, newQuantity) {
    const product = scannedProducts.find(p => p.id === id);
    if (product) {
        const quantity = parseInt(newQuantity);
        if (!isNaN(quantity) && quantity >= 1) {
            product.quantity = quantity;
            saveState('scannedProducts', scannedProducts); // Save scanned products
            updateScanCount(); // Update total count and results table
            showNotification(`Quantité mise à jour pour ${product.label}`, 'success');
        } else {
            showNotification('La quantité doit être un nombre valide et supérieur ou égal à 1.', 'error');
            // Revert input field to original quantity if invalid
            updateRecentScans();
        }
    }
};

window.updateScanCount = function() {
    // Sum up quantities for total items
    const totalScannedItems = scannedProducts.reduce((sum, product) => sum + product.quantity, 0);
    scanCountSpan.textContent = totalScannedItems;
    totalItemsSpan.textContent = totalScannedItems;
    updateResultsTable();
};

function updateResultsTable() {
    resultsTableDiv.innerHTML = '';

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
        scannedProducts = scannedProducts.filter(product => product.id !== id);
        saveState('scannedProducts', scannedProducts); // Save scanned products
        updateRecentScans();
        updateScanCount();
        showNotification('Produit supprimé.', 'success');
    }
};

window.editProduct = function(id) {
    const productToEdit = scannedProducts.find(product => product.id === id);
    if (!productToEdit) return;

    const newBarcode = prompt('Modifier le code-barres:', productToEdit.barcode);
    const newCode = prompt('Modifier le code article:', productToEdit.code);
    const newLabel = prompt('Modifier le libellé:', productToEdit.label);
    const newQuantity = prompt('Modifier la quantité:', productToEdit.quantity);

    if (newBarcode !== null && newCode !== null && newLabel !== null && newQuantity !== null) {
        const quantity = parseInt(newQuantity);
        if (!isNaN(quantity) && quantity >= 1) {
            productToEdit.barcode = newBarcode;
            productToEdit.code = newCode;
            productToEdit.label = newLabel;
            productToEdit.quantity = quantity;
            productToEdit.timestamp = new Date().toLocaleString('fr-FR'); // Update timestamp on edit
            saveState('scannedProducts', scannedProducts); // Save scanned products
            updateRecentScans();
            updateScanCount();
            showNotification('Produit modifié avec succès.', 'success');
        } else {
            showNotification('La quantité doit être un nombre valide et supérieur ou égal à 1.', 'error');
        }
    }
};

function exportResults() {
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
        currentDepot, // Use current DOM value
        currentZone,  // Use current DOM value
        currentDate,  // Use current DOM value
        currentInventoriedBy // Use current DOM value
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
        ['CodeBarres', 'CodeArticle', 'Libelle', 'Quantité', 'Date/Heure Dernier Scan', 'Dépôt', 'Zone', 'Date Inventaire', 'Inventorié par'],
        ...data
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');

    const fileName = `Inventaire_${currentDepot}_${currentZone}_${currentDate}_${currentInventoriedBy}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showNotification('Exportation Excel réussie !', 'success');
}

function clearResults() {
    if (confirm('Êtes-vous sûr de vouloir vider tous les résultats scannés ?')) {
        scannedProducts = [];
        clearState('scannedProducts'); // Clear scanned products from storage
        updateRecentScans();
        updateScanCount();
        showNotification('Tous les résultats ont été vidés.', 'success');
    }
}

function updateExportFileName() {
    const depot = depotSelect.value || 'depot';
    const zone = zoneInput.value || 'zone';
    const date = dateInput.value || 'date';
    const inventoriedBy = inventoriedBySelect.value || 'inventorieur'; // Récupère la valeur du nouveau champ
    exportFileNameSpan.textContent = `${depot}_${zone}_${date}_${inventoriedBy}`; // Inclut la personne qui inventorie
}

// --- Scan Feedback (Visual & Sound) ---
const successSound = new Audio('https://www.soundjay.com/button/button-09.mp3'); // Nouveau son de succès (bip)
const errorSound = new Audio('https://www.soundjay.com/misc/fail-buzzer-01.mp3'); // Example sound

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