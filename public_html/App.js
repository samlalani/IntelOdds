import ApiService         from './services/ApiService.js';
import StorageService     from './services/StorageService.js';
import TableView          from './ui/TableView.js';
import MenuView           from './ui/MenuView.js';
import HamburgerMenu      from './ui/HamburgerMenu.js';
import DragAndDropManager from './features/DragAndDropManager.js';
import HighlightManager   from './features/HighlightManager.js';
import ContextMenu        from './features/ContextMenu.js';
import ZoomControl        from './features/ZoomControl.js';
import LeagueOrderModal   from './ui/modals/LeagueOrderModal.js';
import SportsButtonsModal from './ui/modals/SportsButtonsModal.js';
import AddLeagueButtonsModal from './ui/modals/AddLeagueButtonsModal.js';
import PrintModal         from './ui/modals/PrintModal.js';

/**
 * @class App
 * The main controller for the entire application.
 * This class instantiates all services, UI components, and feature managers,
 * and orchestrates the communication between them. It holds the central
 * application state.
 */
export default class App
    {
    constructor ()
        {
        // --- Central Application State ---
        this.state =
            {
            currentData        : null,
            menuData           : null,
            sportsData         : null,
            leaguesData        : null,
            sportsbooksList    : [],
            sportsbookOrder    : [],
            sportsbookIdToName : {},
            sportsbookNameToId : {},
            sportsbookIdToAbbr : {},
            groupOrder         : [],
            eventOrder         : new Map (),
            fullLinesRawData   : [],
            scoresByEventId    : {},
            currentViewType    : 'SPORT',
            currentViewId      : 0,
            currentViewName    : 'TODAY',
            selectedPeriodId   : 0,
            selectedDisplayType: 0,
            selectedOddsFormat : 0,
            lastSelectedName   : null,
            };

        // --- DOM Element References ---
        this.dom = {
            loginSection:          document.getElementById ('login-section'),
            dataSection:           document.getElementById ('data-section'),
            connectButton:         document.getElementById ('connect-button'),
            disconnectButton:      document.getElementById ('disconnect-button'),
            usernameInput:         document.getElementById ('username'),
            passwordInput:         document.getElementById ('password'),
            periodDropdown:        document.getElementById ('period-dropdown'),
            displayTypeDropdown:   document.getElementById ('display-type-dropdown'),
            oddsFormatDropdown:    document.getElementById ('odds-format-dropdown'),
            columnHeadersCheckbox: document.getElementById ('column-headers-checkbox'),
            resetOrderButton:      document.getElementById ('reset-order-button'),
            };

        // --- Instantiate Services and Managers ---
        this.storageService = new StorageService ();
        this.apiService     = new ApiService (this.handleApiEvents.bind (this));
        
        // --- Instantiate Modals first, as other components may depend on them ---
        this.leagueOrderModal   = new LeagueOrderModal (this);
        this.sportsButtonsModal = new SportsButtonsModal (this);
        this.addLeagueButtonsModal = new AddLeagueButtonsModal (this);
        this.printModal         = new PrintModal (this);

        // --- Instantiate remaining UI components and Feature Managers ---
        this.highlightManager = new HighlightManager (this.state, this.storageService);
        this.tableView = new TableView (
            this.state, 
            this.highlightManager, 
            this.storageService,
            this.leagueOrderModal
            );
        this.menuView = new MenuView (
            this.handleMenuSelection.bind (this),
            this.state,
            this.leagueOrderModal, // Pass modal instance
            this.storageService // Pass storage service
            );
        this.hamburgerMenu = new HamburgerMenu(); // Initialize the hamburger menu
        this.dndManager = new DragAndDropManager (
            this.handleDragEnd.bind (this),
            this.state,
            this.storageService
            );
        this.contextMenu = new ContextMenu (this.highlightManager, this.state);
        this.zoomControl = new ZoomControl (this.storageService);


        // --- Initialization ---
        this.init ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Initializes the application by loading settings, setting up event listeners,
     * and preparing the initial UI state.
     */
    //-------------------------------------------------------------------------------------------------
    init ()
        {
        this.loadInitialState ();
        this.bindEventListeners ();
        this.zoomControl.init ();
        this.contextMenu.init ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Loads initial state from storage and sets up the UI accordingly.
     */
    //-------------------------------------------------------------------------------------------------
    loadInitialState ()
        {
        // Migrate old sport order/visibility to new type/id format
        this.storageService.migrateSportOrderToItemOrder ();
        
        // Load user credentials and settings
        const settings = this.storageService.loadSettings ();
        if (settings.username) this.dom.usernameInput.value = settings.username;
        if (settings.password) this.dom.passwordInput.value = settings.password;
        if (settings.columnHeadersOnTop) this.dom.columnHeadersCheckbox.checked = settings.columnHeadersOnTop;

        // Load ordering preferences
        this.state.sportsbookOrder = this.storageService.loadSportsbookOrder ();
        this.state.groupOrder = this.storageService.loadGroupOrder ();
        this.state.eventOrder = this.storageService.loadEventOrder ();

        // Load feature states
        this.highlightManager.loadHighlightedEvents ();
        this.highlightManager.loadHighlightedSportsbooks ();
        this.leagueOrderModal.loadCustomDisplays ();

        // Load last view
        const lastView = this.storageService.loadLastSelectedView ();
        if (lastView && lastView.type && lastView.id)
            {
            this.state.currentViewType = lastView.type;
            this.state.currentViewId = lastView.id;
            this.state.currentViewName = lastView.name;
            }

        // Load odds format preference
        const savedOddsFormat = this.storageService.loadOddsFormat ();
        if (savedOddsFormat !== null)
            {
            this.state.selectedOddsFormat = savedOddsFormat;
            this.dom.oddsFormatDropdown.value = savedOddsFormat;
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Binds all primary event listeners for the application.
     */
    //-------------------------------------------------------------------------------------------------
    bindEventListeners ()
        {
        this.dom.connectButton.addEventListener ('click', () =>
            {
            const username = this.dom.usernameInput.value;
            const password = this.dom.passwordInput.value;
            this.apiService.connect (username, password);
            this.storageService.saveSettings ({ username, password, columnHeadersOnTop: this.dom.columnHeadersCheckbox.checked });
            });

        this.dom.disconnectButton.addEventListener ('click', () => this.apiService.disconnect ());

        this.dom.periodDropdown.addEventListener ('change', (e) => this.handleViewChange ('periodId', parseInt (e.target.value, 10)));
        this.dom.displayTypeDropdown.addEventListener ('change', (e) => this.handleViewChange ('displayType', parseInt (e.target.value, 10)));
        this.dom.oddsFormatDropdown.addEventListener ('change', (e) => this.handleViewChange ('oddsFormat', parseInt (e.target.value, 10)));
        this.dom.columnHeadersCheckbox.addEventListener ('change', (e) =>
            {
            this.storageService.saveSettings ({ columnHeadersOnTop: e.target.checked });
            this.redrawAll ();
            });
        this.dom.resetOrderButton.addEventListener ('click', () => this.resetOrder ());

        // Add event listener for Edit Sports Buttons button
        const editSportsButtonsButton = document.getElementById ('edit-sports-buttons-button');
        if (editSportsButtonsButton)
            {
            editSportsButtonsButton.addEventListener ('click', () => this.sportsButtonsModal.open ());
            }

        window.addEventListener ('beforeunload', () => this.apiService.disconnect ());
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles events dispatched from the ApiService.
     * @param {string} type - The type of the event (e.g., 'SCHEDULE', 'LINES_RAW').
     * @param {object} data - The payload of the event.
     */
    //-------------------------------------------------------------------------------------------------
    handleApiEvents (type, data)
        {
        switch (type)
            {
            case 'open':
                this.dom.loginSection.classList.add ('hidden');
                this.dom.disconnectButton.classList.remove ('hidden');
                this.restoreLastView ();
                break;
            case 'close':
                this.dom.loginSection.classList.remove ('hidden');
                this.dom.dataSection.classList.add ('hidden');
                this.dom.disconnectButton.classList.add ('hidden');
                this.tableView.clear ();
                break;
            case 'MENU':
                this.state.menuData = data;
                console.log ("MENU>>>\n" + JSON.stringify (data) + "\n<<<");
                // Don't build the menu yet, wait for LEAGUES data
                break;
            case 'SPORTSBOOKS':
                this.state.sportsbooksList = data.data;
                console.log ("SPORTSBOOKS>>>\n" + JSON.stringify (data.data) + "\n<<<");
                this.updateSportsbookMappings (data.data);
                if (this.state.sportsbookOrder.length === 0)
                    {
                    this.state.sportsbookOrder = data.data.map (sb => sb.id.toString ());
                    this.storageService.saveSportsbookOrder (this.state.sportsbookOrder);
                    }
                break;
            case 'SCHEDULE':
                this.state.currentData = data.data;
                console.log ("SCHEDULE>>>\n" + JSON.stringify (data.data) + "\n<<<");
                this.dom.dataSection.classList.remove ('hidden');
                this.redrawAll ();
                break;
            case 'LINES_RAW':
                this.state.fullLinesRawData = data.data;
                console.log ("LINES_RAW>>>\n" + JSON.stringify (data.data) + "\n<<<");
                this.tableView.updateOddsFromLinesRaw (data.data);
                break;
            case 'SCORES':
                console.log ("SCORES_CHANGES>>>\n" + JSON.stringify (data) + "\n<<<");
                this.tableView.updateScoresData (data);
                break;
            case 'LINES_CHANGES':
                console.log ("LINES_CHANGES>>>\n" + JSON.stringify (data) + "\n<<<");
                this.tableView.applyLinesChanges (data);
                break;
            case 'SCORES_CHANGES':
                console.log ("SCORES_CHANGES>>>\n" + JSON.stringify (data) + "\n<<<");
                this.tableView.applyScoresChanges (data);
                break;
            case 'SCHEDULE_CHANGES':
                this.tableView.applyScheduleChanges (data);
                console.log ("SCHEDULE_CHANGES>>>\n" + JSON.stringify (data) + "\n<<<");
                this.redrawAll ();
                break;
            case 'SPORTS':
                this.state.sportsData = data;
                console.log ("SPORTS>>>\n" + JSON.stringify (data) + "\n<<<");
                break;
            case 'LEAGUES':
                this.state.leaguesData = data;
                console.log ("LEAGUES>>>\n" + JSON.stringify (data) + "\n<<<");
                // Now that we have LEAGUES data, check if we also have MENU data
                if (this.state.menuData)
                    {
                    this.menuView.updateMenu ();
                    this.restoreLastView (); // Restore view after menu is loaded
                    }
                break;
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Restores the last selected view or defaults to 'TODAY'.
     */
    //-------------------------------------------------------------------------------------------------
    restoreLastView ()
        {
        // This check is now more important, as this can be called before the menu is built
        if (!this.state.menuData || !this.state.leaguesData) return;

        const lastView = this.storageService.loadLastSelectedView ();
        if (lastView && lastView.type && lastView.id)
            this.handleMenuSelection (lastView.type, lastView.id, lastView.name);
        else
            this.handleMenuSelection ('CUSTOM_DISPLAY', 'TODAY', 'TODAY'); // Default to TODAY
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles a change in the view parameters like period or display type.
     * @param {string} key - The state key to update ('periodId' or 'displayType').
     * @param {any} value - The new value.
     */
    //-------------------------------------------------------------------------------------------------
    handleViewChange (key, value)
        {
        this.state[key] = value;
        
        // Save odds format preference when it changes
        if (key === 'oddsFormat')
            {
            this.storageService.saveOddsFormat (value);
            }
        
        if (this.apiService.isConnected ())
            {
            const command =
                {
                type:        'SET_VIEW',
                viewType:    this.state.currentViewType,
                displayType: key === 'displayType' ? value : this.state.selectedDisplayType,
                periodId:    key === 'periodId'    ? value : this.state.selectedPeriodId,
                oddsFormat:  key === 'oddsFormat'  ? value : this.state.selectedOddsFormat,
                };

            // Handle TODAY and TOMORROW as CUSTOM_DISPLAY with date offsets
            if (this.state.currentViewName === 'TODAY')
                {
                command.start_date_offset = 0;
                command.end_date_offset = 0;
                }
            else if (this.state.currentViewName === 'TOMORROW')
                {
                command.start_date_offset = 1;
                command.end_date_offset = 1;
                }
            else if (this.state.currentViewType === 'CUSTOM_DISPLAY')
                {
                // Only add id and leagues for regular custom displays (not TODAY/TOMORROW)
                if (this.state.currentViewId !== 'TODAY' && this.state.currentViewId !== 'TOMORROW')
                    {
                    command.id = parseInt (this.state.currentViewId.substring (1));
                    const customDisplay = this.leagueOrderModal.customDisplays.find (d => d.id === this.state.currentViewId);
                    if (customDisplay)
                        command.leagues = customDisplay.leagues;
                    }
                }
            else
                {
                // For SPORT and LEAGUE, add the id
                command.id = parseInt (this.state.currentViewId, 10);
                }

            console.log ('SET_VIEW command:', command);
            this.apiService.send (command);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles a selection from the MenuView (sport, league, or custom display).
     * @param {string} type - The type of view selected ('SPORT', 'LEAGUE', 'CUSTOM_DISPLAY').
     * @param {number|string} id - The ID of the selected item.
     * @param {string} name - The name of the selected item.
     */
    //-------------------------------------------------------------------------------------------------
    handleMenuSelection (type, id, name)
        {
        this.state.currentViewType  = type;
        this.state.currentViewId    = id;
        this.state.currentViewName  = name;
        this.state.lastSelectedName = name;

        this.storageService.saveLastSelectedView (type, id, name);
        this.menuView.updateSelectedViewLabel ();
        this.leagueOrderModal.updateButtonText ();

        if (this.apiService.isConnected ())
            {
            const command =
                {
                type:        'SET_VIEW',
                viewType:    type,
                displayType: this.state.selectedDisplayType,
                periodId:    this.state.selectedPeriodId,
                oddsFormat:  this.state.selectedOddsFormat,
                };

            // Handle TODAY and TOMORROW as CUSTOM_DISPLAY with date offsets
            if (name === 'TODAY')
                {
                command.start_date_offset = 0;
                command.end_date_offset = 0;
                }
            else if (name === 'TOMORROW')
                {
                command.start_date_offset = 1;
                command.end_date_offset = 1;
                }
            else if (type === 'CUSTOM_DISPLAY')
                {
                // Only add id and leagues for regular custom displays (not TODAY/TOMORROW)
                if (id !== 'TODAY' && id !== 'TOMORROW')
                    {
                    command.id = parseInt (id.substring (1));
                    const customDisplay = this.leagueOrderModal.customDisplays.find (d => d.id === id);
                    if (customDisplay)
                        command.leagues = customDisplay.leagues;
                    }
                }
            else
                {
                // For SPORT and LEAGUE, add the id
                command.id = parseInt (id, 10);
                }

            this.apiService.send (command);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles the end of a drag-and-drop operation, saving the new order.
     * @param {string} type - The type of item dragged ('sportsbook', 'group', 'event').
     */
    //-------------------------------------------------------------------------------------------------
    handleDragEnd (type)
        {
        // The DndManager now directly modifies the state and saves to storage.
        // We just need to redraw the table.
        this.redrawAll ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Updates the sportsbook mappings.
     * @param {Array} sportsbooks - The list of sportsbook objects.
     */
    //-------------------------------------------------------------------------------------------------
    updateSportsbookMappings (sportsbooks)
        {
        this.state.sportsbookIdToName = {};
        this.state.sportsbookNameToId = {};
        this.state.sportsbookIdToAbbr = {};
        sportsbooks.forEach (sb =>
            {
            if (sb.id && sb.name)
                {
                const id = sb.id.toString ();
                this.state.sportsbookIdToName[id] = sb.name;
                this.state.sportsbookNameToId[sb.name] = id;
                this.state.sportsbookIdToAbbr[id] = (sb.name.length < 10) ? sb.name : (sb.abbr || sb.name);
                }
            });
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Resets group and event order to their defaults.
     */
    //-------------------------------------------------------------------------------------------------
    resetOrder ()
        {
        this.storageService.remove ('groupOrder');
        this.storageService.remove ('eventOrder');
        this.state.groupOrder = [];
        this.state.eventOrder.clear ();
        this.redrawAll ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Redraws the entire table and re-initializes interactive components.
     */
    //-------------------------------------------------------------------------------------------------
    redrawAll ()
        {
        if (this.state.currentData)
            {
            this.tableView.redrawTableAndLines ();
            this.dndManager.initializeAll ();
            this.menuView.updateMenu();
            }
        }
    }
