/**
 * @class MenuView
 * Manages the top navigation menu, including the sport buttons, custom display
 * buttons, and their associated league submenus.
 */
export default class MenuView
    {
    constructor (selectionHandler, state, leagueOrderModal, storageService)
        {
        this.selectionHandler = selectionHandler; // App's handleMenuSelection method
        this.state = state;
        this.leagueOrderModal = leagueOrderModal; // Reference to the modal instance
        this.storageService = storageService; // Reference to the storage service

        this.dom = {
            sportsMenu: document.getElementById ('sports-menu'),
            sportsMenuContent: document.querySelector ('#sports-menu .sports-menu-content'),
            addCustomDisplayButton: document.getElementById ('add-custom-display-button'),
            };
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Updates the entire sports menu based on the current menu data,
     * custom displays, and visibility settings.
     */
    //-------------------------------------------------------------------------------------------------
    updateMenu ()
        {
        if (!this.state.menuData || !this.dom.sportsMenuContent)
            return;

        this.dom.sportsMenu.classList.remove ('hidden');
        let menuHtml = '';

        // Load item order and visibility
        const itemOrder = this.storageService.loadItemOrder ();
        const itemsVisibility = this.storageService.loadItemsVisibility ();

        // Create all available items with type/id structure
        const allItems = [];
        
        // Add TODAY and TOMORROW as CUSTOM_DISPLAY items
        allItems.push ({ id: 'TODAY', name: 'TODAY', type: 'CUSTOM_DISPLAY' });
        allItems.push ({ id: 'TOMORROW', name: 'TOMORROW', type: 'CUSTOM_DISPLAY' });
        
        // Add sports (filter out old TODAY sport with ID 0)
        this.state.menuData.data.filter (sport => sport.id !== 0).forEach (sport =>
            {
            allItems.push ({ id: sport.id.toString (), name: sport.name, type: 'SPORT', sport: sport });
            });
        
        // Add custom displays
        this.leagueOrderModal.customDisplays.forEach (display =>
            {
            allItems.push ({ id: display.id, name: display.name, type: 'CUSTOM_DISPLAY', display: display });
            });

        // Add league buttons from sports buttons data
        if (this.app && this.app.sportsButtonsModal && this.app.sportsButtonsModal.sportsButtonsData)
            {
            this.app.sportsButtonsModal.sportsButtonsData
                .filter (item => item.type === 'LEAGUE' && item.enabled)
                .forEach (item =>
                    {
                    allItems.push ({ id: item.id.toString (), name: item.name, type: 'LEAGUE', league: item });
                    });
            }

        // Add league buttons from storage
        const leagueButtons = this.storageService.loadLeagueButtons () || [];
        leagueButtons.forEach (league =>
            {
            allItems.push ({ id: league.id.toString (), name: league.name, type: 'LEAGUE', league: league });
            });

        // Create a map for quick lookup
        const itemMap = new Map (allItems.map (item => [`${item.type}:${item.id}`, item]));

        // Build ordered and filtered items
        const orderedItems = [];
        const processedKeys = new Set ();
        
        // Add items in saved order
        itemOrder.forEach (itemKey =>
            {
            if (itemMap.has (itemKey))
                {
                const item = itemMap.get (itemKey);
                const isVisible = itemsVisibility[itemKey] !== false; // default to true
                if (isVisible)
                    {
                    orderedItems.push (item);
                    }
                processedKeys.add (itemKey);
                }
            });

        // Add remaining items that weren't in the saved order
        allItems.forEach (item =>
            {
            const itemKey = `${item.type}:${item.id}`;
            if (!processedKeys.has (itemKey))
                {
                const isVisible = itemsVisibility[itemKey] !== false; // default to true
                if (isVisible)
                    {
                    orderedItems.push (item);
                    }
                }
            });
            
        // Generate HTML for each visible item
        orderedItems.forEach (item =>
            {
            if (item.type === 'CUSTOM_DISPLAY')
                {
                menuHtml += this.generateCustomDisplayItem (item);
                }
            else if (item.type === 'SPORT')
                {
                menuHtml += this.generateSportItem (item.sport);
                }
            else if (item.type === 'LEAGUE')
                {
                menuHtml += this.generateLeagueItem (item);
                }
            });

        this.dom.sportsMenuContent.innerHTML = menuHtml;
        this.bindMenuEventListeners ();
        this.updateSelectedViewLabel ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Generates the HTML for a single sport item button and its submenu.
     * @param {object} sport - The sport data object.
     * @returns {string} The HTML string for the sport item.
     */
    //-------------------------------------------------------------------------------------------------
    generateSportItem (sport)
        {
        let submenuHtml = '';
        if (sport.submenu && sport.submenu.length > 0)
            {
            submenuHtml += '<div class="leagues-submenu">';
            sport.submenu.forEach (league =>
                {
                submenuHtml += `<div class="league-item"><a href="#" class="league-link" data-league-id="${league.id}" data-parent-sport-id="${sport.id}" data-league-name="${league.name}">${league.name}</a></div>`;
                });
            submenuHtml += '</div>';
            }

        return `
            <div class="sport-item" data-sport-id="${sport.id}">
                <a href="#" class="sport-link" data-sport-id="${sport.id}" data-sport-name="${sport.name}">${sport.name}</a>
                ${submenuHtml}
            </div>
        `;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Generates the HTML for a single custom display item button.
     * @param {object} display - The custom display data object.
     * @returns {string} The HTML string for the custom display item.
     */
    //-------------------------------------------------------------------------------------------------
    generateCustomDisplayItem (item)
        {
        return `
            <div class="sport-item custom-display-item" data-sport-id="${item.id}">
                <a href="#" class="sport-link" data-sport-id="${item.id}" data-sport-name="${item.name}">${item.name}</a>
            </div>
        `;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Generates the HTML for a single league item button.
     * @param {object} league - The league data object.
     * @returns {string} The HTML string for the league item.
     */
    //-------------------------------------------------------------------------------------------------
    generateLeagueItem (league)
        {
        return `
            <div class="sport-item league-item" data-league-id="${league.id}" data-parent-sport-id="${league.parentSportId}">
                <a href="#" class="sport-link" data-league-id="${league.id}" data-league-name="${league.name}">${league.name}</a>
            </div>
        `;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Binds event listeners to all sport and league links in the menu.
     */
    //-------------------------------------------------------------------------------------------------
    bindMenuEventListeners ()
        {
        this.dom.sportsMenuContent.querySelectorAll ('.sport-link').forEach (link =>
            {
            link.addEventListener ('click', (e) =>
                {
                e.preventDefault ();
                const id = e.currentTarget.dataset.sportId;
                const name = e.currentTarget.dataset.sportName;
                // Check if it's a custom display (starts with 'C') or TODAY/TOMORROW
                const type = (id.startsWith ('C') || id === 'TODAY' || id === 'TOMORROW') ? 'CUSTOM_DISPLAY' : 'SPORT';
                this.selectionHandler (type, id, name);
                });
            });

        // EXACT CHANGE: Added the missing contextmenu event listener for custom displays.
        this.dom.sportsMenuContent.querySelectorAll ('.custom-display-item .sport-link').forEach (link =>
            {
            link.addEventListener ('contextmenu', (e) =>
                {
                e.preventDefault ();
                e.stopPropagation ();
                const customId = e.currentTarget.dataset.sportId;
                // Don't allow editing of TODAY and TOMORROW
                if (customId === 'TODAY' || customId === 'TOMORROW')
                    return;
                const customDisplay = this.leagueOrderModal.customDisplays.find (d => d.id === customId);
                if (customDisplay)
                    this.leagueOrderModal.openForEdit (customDisplay);
                });
            });

        this.dom.sportsMenuContent.querySelectorAll ('.league-link').forEach (link =>
            {
            link.addEventListener ('click', (e) =>
                {
                e.preventDefault ();
                const id = e.currentTarget.dataset.leagueId;
                const name = e.currentTarget.dataset.leagueName;
                this.selectionHandler ('LEAGUE', id, name);
                });
            });

        // Add event listeners for league items (from Add League Buttons)
        this.dom.sportsMenuContent.querySelectorAll ('.league-item .sport-link').forEach (link =>
            {
            link.addEventListener ('click', (e) =>
                {
                e.preventDefault ();
                const id = e.currentTarget.dataset.leagueId;
                const name = e.currentTarget.dataset.leagueName;
                this.selectionHandler ('LEAGUE', id, name);
                });
            });
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Updates the label indicating the currently selected view.
     */
    //-------------------------------------------------------------------------------------------------
    updateSelectedViewLabel()
        {
        const existingLabel = document.getElementById('selected-view-label');
        if (existingLabel)
            existingLabel.remove();
        
        let chipText = '';
        if (this.state.currentViewType === 'CUSTOM_DISPLAY')
            {
            // Don't show star for TODAY and TOMORROW since they are special
            if (this.state.currentViewId === 'TODAY' || this.state.currentViewId === 'TOMORROW')
                chipText = this.state.currentViewName;
            else
                chipText = `⭐ ${this.state.currentViewName}`;
            }
        else if (this.state.currentViewName)
            chipText = this.state.currentViewName;

        if (chipText)
            {
            const oddsFormatDropdown = document.getElementById ('odds-format-dropdown');
            if (oddsFormatDropdown)
                {
                const chip = document.createElement ('span');
                chip.className = 'selected-view-chip';
                chip.id = 'selected-view-label';
                chip.textContent = chipText;
                oddsFormatDropdown.insertAdjacentElement ('afterend', chip);
                }
            }
        this.highlightCurrentSport ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Highlights the currently selected sport/custom display button in the menu.
     */
    //-------------------------------------------------------------------------------------------------
    highlightCurrentSport ()
        {
        this.clearMenuHighlights();
        // Handle TODAY and TOMORROW IDs correctly
        const currentId = this.state.currentViewId;
        const link = document.querySelector(`.sport-link[data-sport-id="${currentId}"]`);
        if (link)
            link.classList.add('selected');
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Removes all 'selected' classes from menu items.
     */
    //-------------------------------------------------------------------------------------------------
    clearMenuHighlights ()
        {
        this.dom.sportsMenuContent.querySelectorAll('.sport-link.selected').forEach (link =>
            {
            link.classList.remove('selected');
            });
        }
    }
