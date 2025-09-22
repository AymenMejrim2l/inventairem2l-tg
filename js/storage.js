// js/storage.js
export const saveState = (key, state) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(key, serializedState);
    } catch (error) {
        console.error("Error saving state to localStorage:", error);
    }
};

export const loadState = (key) => {
    try {
        const serializedState = localStorage.getItem(key);
        if (serializedState === null) {
            return undefined; // Let reducers initialize the state
        }
        return JSON.parse(serializedState);
    } catch (error) {
        console.error("Error loading state from localStorage:", error);
        return undefined;
    }
};

export const clearState = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Error clearing state from localStorage:", error);
    }
};