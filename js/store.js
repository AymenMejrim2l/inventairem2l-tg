// js/store.js
import { saveState, loadState, clearState } from './storage.js';

// État initial de l'application
const initialState = {
    currentTab: 'config',
    isConfigured: false,
    scannedProducts: [], // Stores unique products with quantities
    productDatabase: [], // Base d'articles importée
    config: {
        depot: '',
        zone: '',
        inventoriedBy: '',
        date: ''
    }
};

let state = { ...initialState };
const subscribers = [];

// Charger l'état persistant au démarrage
const savedConfig = loadState('inventoryConfig');
if (savedConfig) {
    state.config = savedConfig;
    state.isConfigured = true;
} else {
    // Si aucune configuration n'est sauvegardée, initialise la date à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    state.config.date = today;
}

const savedScannedProducts = loadState('scannedProducts');
if (savedScannedProducts) {
    state.scannedProducts = savedScannedProducts;
}

function notifySubscribers() {
    subscribers.forEach(callback => callback(state));
}

export const store = {
    getState() {
        // Retourne une copie de l'état pour éviter les modifications directes
        return JSON.parse(JSON.stringify(state));
    },

    // Méthodes pour modifier l'état
    setCurrentTab(tab) {
        state.currentTab = tab;
        notifySubscribers();
    },

    setIsConfigured(value) {
        state.isConfigured = value;
        notifySubscribers();
    },

    setConfig(newConfig) {
        state.config = { ...state.config, ...newConfig };
        saveState('inventoryConfig', state.config);
        notifySubscribers();
    },

    setProductDatabase(database) {
        state.productDatabase = database;
        notifySubscribers();
    },

    addOrUpdateScannedProduct(productInfo, isManualAdd = false) {
        let productToUpdate = state.scannedProducts.find(p => p.barcode === productInfo.barcode);

        if (productToUpdate) {
            // Product exists, update quantity and move to front
            state.scannedProducts = state.scannedProducts.filter(p => p.id !== productToUpdate.id); // Remove old entry
            productToUpdate.quantity++;
            productToUpdate.timestamp = new Date().toLocaleString('fr-FR');
            state.scannedProducts.unshift(productToUpdate); // Add updated to front
        } else {
            // New product
            const newProduct = {
                id: Date.now(),
                barcode: productInfo.barcode,
                code: productInfo.code,
                label: productInfo.label,
                quantity: 1,
                timestamp: new Date().toLocaleString('fr-FR')
            };
            state.scannedProducts.unshift(newProduct); // Add new to front
            if (isManualAdd) {
                // Add to productDatabase if manually added and not already there
                if (!state.productDatabase.some(p => p.barcode === newProduct.barcode)) {
                    state.productDatabase.push({ barcode: newProduct.barcode, code: newProduct.code, label: newProduct.label });
                }
            }
        }
        saveState('scannedProducts', state.scannedProducts);
        notifySubscribers();
    },

    updateScannedProductDetails(id, newDetails) {
        const index = state.scannedProducts.findIndex(p => p.id === id);
        if (index > -1) {
            const updatedProduct = {
                ...state.scannedProducts[index],
                ...newDetails,
                timestamp: new Date().toLocaleString('fr-FR') // Update timestamp on edit
            };
            // Remove old entry and add updated to front
            state.scannedProducts = state.scannedProducts.filter(p => p.id !== id);
            state.scannedProducts.unshift(updatedProduct);
            saveState('scannedProducts', state.scannedProducts);
            notifySubscribers();
        }
    },

    deleteScannedProduct(id) {
        state.scannedProducts = state.scannedProducts.filter(product => product.id !== id);
        saveState('scannedProducts', state.scannedProducts);
        notifySubscribers();
    },

    clearScannedProducts() {
        state.scannedProducts = [];
        clearState('scannedProducts');
        notifySubscribers();
    },

    // Méthode pour s'abonner aux changements d'état
    subscribe(callback) {
        subscribers.push(callback);
        // Retourne une fonction de désabonnement
        return () => {
            const index = subscribers.indexOf(callback);
            if (index > -1) {
                subscribers.splice(index, 1);
            }
        };
    }
};