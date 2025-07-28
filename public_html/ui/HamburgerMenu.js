/**
 * @class HamburgerMenu
 * Manages the hover-to-open functionality for the main hamburger menu.
 */
export default class HamburgerMenu
    {
    constructor ()
        {
        this.dom = {
            hamburgerMenu: document.querySelector ('.hamburger-menu'),
            hamburgerButton: document.getElementById ('hamburger-button'),
            hamburgerDropdown: document.getElementById ('hamburger-dropdown'),
            };
        this.hideTimer = null;

        if (this.dom.hamburgerMenu)
            {
            this.init ();
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Initializes the component by binding event listeners.
     */
    //-------------------------------------------------------------------------------------------------
    init ()
        {
        this.bindEventListeners ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Binds mouseenter and mouseleave events to the menu elements.
     */
    //-------------------------------------------------------------------------------------------------
    bindEventListeners ()
        {
        this.dom.hamburgerMenu.addEventListener ('mouseenter', () => this.showMenu ());
        this.dom.hamburgerDropdown.addEventListener ('mouseenter', () => this.showMenu ());
        this.dom.hamburgerMenu.addEventListener ('mouseleave', () => this.startHideTimer ());
        this.dom.hamburgerDropdown.addEventListener ('mouseleave', () => this.startHideTimer ());
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Shows the menu and cancels any pending hide timers.
     */
    //-------------------------------------------------------------------------------------------------
    showMenu ()
        {
        if (this.hideTimer)
            {
            clearTimeout (this.hideTimer);
            this.hideTimer = null;
            }
        this.dom.hamburgerDropdown.classList.remove ('hidden');
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Starts a timer to hide the menu, giving the user time to move their mouse
     * from the button to the dropdown.
     */
    //-------------------------------------------------------------------------------------------------
    startHideTimer ()
        {
        this.hideTimer = setTimeout (() =>
            {
            // Re-check hover state before hiding to prevent race conditions
            const isHoveringMenu = this.dom.hamburgerMenu.matches (':hover');
            const isHoveringDropdown = this.dom.hamburgerDropdown.matches (':hover');
            if (!isHoveringMenu && !isHoveringDropdown)
                {
                this.dom.hamburgerDropdown.classList.add ('hidden');
                }
            }, 250);
        }
    }
