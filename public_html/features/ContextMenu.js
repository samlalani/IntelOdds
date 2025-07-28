/**
 * @class ContextMenu
 * Encapsulates the logic for the right-click context menu on sportsbook headers.
 */
export default class ContextMenu
    {
    constructor (highlightManager, state)
        {
        this.highlightManager = highlightManager;
        this.state = state;
        this.menu = document.getElementById ('sportsbook-context-menu');
        this.currentSportsbookId = null;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Initializes the context menu by adding event listeners.
     */
    //-------------------------------------------------------------------------------------------------
    init ()
        {
        document.addEventListener ('contextmenu', this.handleShowMenu.bind (this));
        document.addEventListener ('click', this.handleHideMenu.bind (this));
        this.menu.addEventListener ('click', this.handleMenuClick.bind (this));
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles the right-click event to show and position the context menu.
     * @param {MouseEvent} e - The contextmenu event.
     */
    //-------------------------------------------------------------------------------------------------
    handleShowMenu (e)
        {
        const target = e.target.closest ('th[data-sportsbook]');
        if (target)
            {
            e.preventDefault ();
            this.currentSportsbookId = target.dataset.sportsbook;
            this.updateMenuState ();
            this.menu.style.left = `${e.pageX}px`;
            this.menu.style.top = `${e.pageY}px`;
            this.menu.classList.add ('show');
            }
        else
            {
            this.menu.classList.remove ('show');
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Hides the context menu when a click occurs outside of it.
     * @param {MouseEvent} e - The click event.
     */
    //-------------------------------------------------------------------------------------------------
    handleHideMenu (e)
        {
        if (!this.menu.contains (e.target))
            {
            this.menu.classList.remove ('show');
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles clicks on the menu items to trigger actions.
     * @param {MouseEvent} e - The click event.
     */
    //-------------------------------------------------------------------------------------------------
    handleMenuClick (e)
        {
        const item = e.target.closest ('.sportsbook-context-menu-item');
        if (!item || !this.currentSportsbookId || item.classList.contains ('disabled')) return;

        const action = item.dataset.action;

        switch (action)
            {
            case 'highlight-all-sports':
            case 'highlight-this-sport':
            case 'highlight-this-table':
                this.highlightManager.highlightSportsbook (this.currentSportsbookId, action.replace ('highlight-', ''));
                break;
            case 'unhighlight-all-sports':
            case 'unhighlight-this-sport':
            case 'unhighlight-this-table':
                this.highlightManager.unhighlightSportsbook (this.currentSportsbookId);
                break;
            }

        this.menu.classList.remove ('show');
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Updates the enabled/disabled state of menu items based on the current context.
     */
    //-------------------------------------------------------------------------------------------------
    updateMenuState ()
        {
        const currentHighlight = this.highlightManager.highlightedSportsbooks.get (this.currentSportsbookId);

        this.menu.querySelectorAll ('.sportsbook-context-menu-item').forEach (item =>
            {
            const action = item.dataset.action;
            let isDisabled = false;

            if (currentHighlight)
                {
                // An item is highlighted, so disable all "highlight" actions
                if (action.startsWith ('highlight-'))
                    {
                    isDisabled = true;
                    }
                // Enable the specific "unhighlight" action that matches the current highlight type
                if (action === `unhighlight-${currentHighlight.type}`)
                    {
                    isDisabled = false;
                    }
                }
            else
                {
                // Nothing is highlighted, so disable all "unhighlight" actions
                if (action.startsWith ('unhighlight-'))
                    {
                    isDisabled = true;
                    }
                }

            item.classList.toggle ('disabled', isDisabled);
            });
        }
    }
