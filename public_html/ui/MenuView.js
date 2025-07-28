/**
 * @class MenuView
 * Manages the top navigation menu, including the sport buttons, custom display
 * buttons, and their associated league submenus.
 */
export default class MenuView
    {
    constructor (selectionHandler, state, leagueOrderModal)
        {
        this.selectionHandler = selectionHandler; // App's handleMenuSelection method
        this.state = state;
        this.leagueOrderModal = leagueOrderModal; // Reference to the modal instance

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

        // This is a simplified rendering. A full implementation would
        // respect sport order and visibility from localStorage.
        const allItems =
            [
            ...this.state.menuData.data,
            ...this.leagueOrderModal.customDisplays.map(d => ({...d, type: 'custom'}))
            ];
            
        allItems.forEach (item =>
            {
            if (item.type === 'custom')
                menuHtml += this.generateCustomDisplayItem (item);
            else
                menuHtml += this.generateSportItem (item);
            });

        this.dom.sportsMenuContent.innerHTML = menuHtml;
        this.bindMenuEventListeners ();
        this.updateSelectedViewLabel();
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

        // Use "TODAY" for the button text and data-attribute when the ID is 0
        const buttonText = sport.id === 0 ? 'TODAY' : sport.name;
        const dataName   = sport.id === 0 ? 'TODAY' : sport.name;

        return `
            <div class="sport-item" data-sport-id="${sport.id}">
                <a href="#" class="sport-link" data-sport-id="${sport.id}" data-sport-name="${dataName}">${buttonText}</a>
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
    generateCustomDisplayItem(display)
        {
        return `
            <div class="sport-item custom-display-item" data-sport-id="${display.id}">
                <a href="#" class="sport-link" data-sport-id="${display.id}" data-sport-name="${display.name}">${display.name}</a>
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
                const type = id.startsWith ('C') ? 'CUSTOM_DISPLAY' : 'SPORT';
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
            chipText = `⭐ ${this.state.currentViewName}`;
        else if (this.state.currentViewName)
            chipText = this.state.currentViewName;

        if (chipText)
            {
            const displayTypeDropdown = document.getElementById('display-type-dropdown');
            if (displayTypeDropdown)
                {
                const chip = document.createElement('span');
                chip.className = 'selected-view-chip';
                chip.id = 'selected-view-label';
                chip.textContent = chipText;
                displayTypeDropdown.insertAdjacentElement('afterend', chip);
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
        const link = document.querySelector(`.sport-link[data-sport-id="${this.state.currentViewId}"]`);
        if (link)
            link.classList.add('selected');
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Removes all 'selected' classes from menu items.
     */
    //-------------------------------------------------------------------------------------------------
    clearMenuHighlights()
        {
        this.dom.sportsMenuContent.querySelectorAll('.sport-link.selected').forEach(link => {
            link.classList.remove('selected');
        });
        }
    }
