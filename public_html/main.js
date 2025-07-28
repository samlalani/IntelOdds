import App from './App.js';

//-------------------------------------------------------------------------------------------------
/**
 * Main entry point for the application.
 * This script waits for the DOM to be fully loaded, then creates an instance
 * of the main App class to initialize and run the entire application.
 */
//-------------------------------------------------------------------------------------------------
document.addEventListener ('DOMContentLoaded', () =>
    {
    // Create a new instance of the App class to start the application.
    // This instance will manage all other components and services.
    new App();
    });
