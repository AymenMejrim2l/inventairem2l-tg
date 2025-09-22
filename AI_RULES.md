# AI Rules for M2L&TG Inventory App

This document outlines the technical stack and specific library usage rules for the M2L&TG Inventory application. Adhering to these guidelines will ensure consistency, maintainability, and optimal performance.

## Tech Stack Description

*   **HTML5**: The core structure of the application is built using modern HTML5 standards.
*   **CSS3 (Tailwind CSS)**: Styling is primarily handled using Tailwind CSS for a utility-first approach, supplemented by custom CSS for specific gradients and effects.
*   **JavaScript (Vanilla JS)**: All interactive functionalities, DOM manipulation, and business logic are implemented using vanilla JavaScript, without external frameworks like React or Vue.
*   **Progressive Web App (PWA)**: The application is configured as a PWA, including a `manifest.json` and `service-worker.js` for offline capabilities and installability.
*   **Font Awesome**: Used for all iconography throughout the application.
*   **SheetJS (XLSX)**: A client-side JavaScript library for reading, parsing, and writing Excel spreadsheets.

## Library Usage Rules

*   **Styling**:
    *   **ALWAYS** use Tailwind CSS classes for styling components and layouts.
    *   Custom CSS (within `<style>` tags) should be minimized and only used for unique gradient backgrounds, animations, or specific effects that are not easily achievable with Tailwind.
*   **Icons**:
    *   **ALWAYS** use icons from the Font Awesome library. Ensure the correct classes (e.g., `fas fa-warehouse`) are applied.
*   **Excel Operations**:
    *   **ALWAYS** use the SheetJS (XLSX) library for any functionality involving reading from or writing to Excel files (e.g., importing article bases, exporting inventory results).
*   **Interactivity & Logic**:
    *   **ALWAYS** implement all dynamic behavior, event handling, and application logic using vanilla JavaScript. Avoid introducing new JavaScript frameworks or libraries unless explicitly requested.
*   **PWA Features**:
    *   Maintain and respect the existing PWA structure, including the `manifest.json` and `service-worker.js` for offline support and app installation.