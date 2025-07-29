/**
 * @class LeagueOrderModal
 * Manages the "Order Leagues" and custom display creation/editing modal.
 */
export default class LeagueOrderModal
    {
    constructor (app)
        {
        this.app = app; // Reference to the main App instance
        this.state = app.state;
        this.storageService = app.storageService;

        this.dom = {
            modal:                       document.getElementById ('league-order-modal'),
            closeButton:                 document.getElementById ('close-modal'),
            saveButton:                  document.getElementById ('save-league-order'),
            cancelButton:                document.getElementById ('cancel-league-order'),
            deleteButton:                document.getElementById ('delete-custom-display'),
            title:                       document.querySelector  ('#league-order-modal .modal-header h3'),
            tbody:                       document.getElementById ('league-order-tbody'),
            customDisplayContainer:      document.getElementById ('custom-display-input-container'),
            customDisplayNameInput:      document.getElementById ('custom-display-name-input'),
            addCustomDisplayButton:      document.getElementById ('add-custom-display-button'),
            orderLeaguesButton:          document.getElementById ('order-leagues-button'),
            currentScheduleOnlyCheckbox: document.getElementById ('current-schedule-only-checkbox'),
            enableAllButton:             document.getElementById ('enable-all-button'),
            disableAllButton:            document.getElementById ('disable-all-button'),
            };

        // Debug DOM element references
        console.log('LeagueOrderModal constructor - DOM elements:');
        console.log('modal:', this.dom.modal);
        console.log('orderLeaguesButton:', this.dom.orderLeaguesButton);
        console.log('tbody:', this.dom.tbody);
        console.log('title:', this.dom.title);

        this.customDisplays  = [];
        this.nextCustomId    = 1;
        this.isEditing       = false;
        this.leagueOrderData = [];

        this.init();
        }
    //-------------------------------------------------------------------------------------------------
    init ()
        {
        this.loadCustomDisplays();
        this.bindEventListeners();
        }
    //-------------------------------------------------------------------------------------------------
    bindEventListeners ()
        {
        console.log('LeagueOrderModal.bindEventListeners() called');
        console.log('orderLeaguesButton element:', this.dom.orderLeaguesButton);
        
        if (this.dom.orderLeaguesButton)
            {
            this.dom.orderLeaguesButton.addEventListener ('click', () =>
                {
                console.log('Order Leagues button clicked');
                this.open();
                });
            }
        else
            console.error ('orderLeaguesButton element not found!');
        
        if (this.dom.addCustomDisplayButton)
            this.dom.addCustomDisplayButton.addEventListener('click', () => this.openForCreate());
        
        if (this.dom.closeButton)
            this.dom.closeButton.addEventListener('click', () => this.close());
        
        if (this.dom.cancelButton)
            this.dom.cancelButton.addEventListener('click', () => this.close());
        
        if (this.dom.saveButton)
            this.dom.saveButton.addEventListener('click', () => this.save());
        
        if (this.dom.deleteButton)
            this.dom.deleteButton.addEventListener('click', () => this.delete());

        // EXACT CHANGE: Added event listeners for the Enable/Disable All buttons.
        if (this.dom.enableAllButton)
            {
            this.dom.enableAllButton.addEventListener ('click', () => 
                {
                this.dom.tbody.querySelectorAll ('input[type="checkbox"]').forEach (checkbox => 
                    {
                    checkbox.checked = true;
                    });
                this.updateLeagueOrderDataFromUI ();
                });
            }
        
        if (this.dom.disableAllButton)
            {
            this.dom.disableAllButton.addEventListener ('click', () => 
                {
                this.dom.tbody.querySelectorAll ('input[type="checkbox"]').forEach (checkbox => 
                    {
                    checkbox.checked = false;
                    });
                this.updateLeagueOrderDataFromUI ();
                });
            }
        
        // Add event listener for "Only in current schedule" checkbox
        if (this.dom.currentScheduleOnlyCheckbox)
            {
            this.dom.currentScheduleOnlyCheckbox.addEventListener ('change', () =>
                {
                console.log ('Current schedule only checkbox changed:', this.dom.currentScheduleOnlyCheckbox.checked);
                if (this.isEditing)
                    {
                    this.populateTableForEditing(); // Re-populate with filtered data for editing
                    }
                else
                    {
                    this.populateTable(); // Re-populate with filtered data for regular view
                    }
                });
            }
        
        // Initialize drag-and-drop for league reordering
        this.initializeLeagueDragAndDrop();
        }
    //-------------------------------------------------------------------------------------------------
    loadCustomDisplays()
        {
        this.customDisplays = this.storageService.loadCustomDisplays ();
        this.nextCustomId   = this.storageService.loadNextCustomId ();
        }
    //-------------------------------------------------------------------------------------------------
    saveCustomDisplays()
        {
        this.storageService.saveCustomDisplays (this.customDisplays);
        this.storageService.saveNextCustomId   (this.nextCustomId);
        }
    //-------------------------------------------------------------------------------------------------
    open()
        {
        console.log('LeagueOrderModal.open() called');
        
        // Always refresh the state reference to ensure we have the latest data
        this.state = this.app.state;
        
        console.log('Current state when opening modal:');
        console.log('- currentViewType:', this.state.currentViewType);
        console.log('- currentViewId:', this.state.currentViewId, 'Type:', typeof this.state.currentViewId);
        console.log('- currentViewName:', this.state.currentViewName);
        console.log('- menuData available:', !!this.state.menuData);
        
        // If we're viewing a league, we need to find its parent sport
        if (this.state.currentViewType === 'LEAGUE')
            {
            console.log('Currently viewing a league, will search for parent sport');
            }
        
        this.isEditing = false;
        
        // Set appropriate title based on what we're viewing
        if (this.state.currentViewType === 'LEAGUE')
            {
            this.dom.title.textContent = `Order Leagues for ${this.state.currentViewName}`;
            }
        else if (this.state.currentViewType === 'CUSTOM_DISPLAY')
            {
            this.dom.title.textContent = `Order Leagues for ${this.state.currentViewName}`;
            }
        else
            {
            this.dom.title.textContent = 'Order Leagues';
            }
            
        this.dom.customDisplayContainer.classList.add('hidden');
        this.dom.deleteButton.classList.add('hidden');
        this.populateTable();
        this.dom.modal.classList.remove('hidden');
        console.log('Modal should now be visible');
        }
    //-------------------------------------------------------------------------------------------------
    openForCreate()
        {
        this.isEditing = true;
        this.dom.title.textContent = 'Add Custom Display';
        this.dom.customDisplayContainer.classList.remove('hidden');
        this.dom.customDisplayNameInput.value = '';
        this.dom.deleteButton.classList.add('hidden');
        this.populateTableForEditing();
        this.dom.modal.classList.remove('hidden');
        }
    //-------------------------------------------------------------------------------------------------
    openForEdit(display)
        {
        this.isEditing = true;
        this.state.currentViewId = display.id; // Important for saving
        this.dom.title.textContent = `Edit Custom Display: ${display.name}`;
        this.dom.customDisplayContainer.classList.remove('hidden');
        this.dom.customDisplayNameInput.value = display.name;
        this.dom.deleteButton.classList.remove('hidden');
        this.populateTableForEditing(display);
        this.dom.modal.classList.remove('hidden');
        }
    //-------------------------------------------------------------------------------------------------
    close ()
        {
        this.dom.modal.classList.add ('hidden');
        }
    //-------------------------------------------------------------------------------------------------
    save ()
        {
        if (this.isEditing)
            {
            const name = this.dom.customDisplayNameInput.value.trim();
            if (!name)
                {
                alert('Please enter a name for the custom display.');
                return;
                }
            
            const existingDisplay = this.customDisplays.find(d => d.id === this.state.currentViewId);

            if (existingDisplay)
                { // Editing existing
                existingDisplay.name = name;
                existingDisplay.leagues = this.getLeagueOrderFromTable();
                }
            else
                { // Creating new
                const newDisplay =
                    {
                    id: `C${this.nextCustomId++}`,
                    name: name,
                    leagues: this.getLeagueOrderFromTable()
                    };
                this.customDisplays.push(newDisplay);
                }
            this.saveCustomDisplays();
            }
        else
            {
            // Save regular league order
            const leagueOrderObj = this.storageService.loadLeagueOrder();
            const sportId = this.state.currentViewId; // Assumes this is set correctly
            leagueOrderObj[sportId] = this.getLeagueOrderFromTable(true); // Get full objects for saving
            this.storageService.saveLeagueOrder(leagueOrderObj);
            }

        this.app.redrawAll();
        this.close();
        }
    //-------------------------------------------------------------------------------------------------
    delete ()
        {
        if (!this.isEditing || !this.state.currentViewId)
            return;
        
        if (confirm ('Are you sure you want to delete this custom display?'))
            {
            this.customDisplays = this.customDisplays.filter(d => d.id !== this.state.currentViewId);
            this.saveCustomDisplays();
            this.app.handleMenuSelection('SPORT', 0, 'TODAY'); // Go to default view
            this.close();
            }
        }
    //-------------------------------------------------------------------------------------------------
    populateTable ()
        {
        console.log ('populateTable called');
        
        // Always refresh the state reference to ensure we have the latest data
        this.state = this.app.state;
        
        console.log ('menuData:', this.state.menuData);
        console.log ('currentViewId:', this.state.currentViewId);
        
        if (!this.state.sportsData || !this.state.leaguesData || !this.state.sportsData.data || !this.state.leaguesData.data) 
            {
            console.log('No sportsData or leaguesData available');
            alert('Sports and leagues data is not available yet. Please wait for the connection to be established and try again.');
            return;
            }
        
        this.leagueOrderData = [];
        console.log ('Available sports in sportsData:', this.state.sportsData.data.map (s => ({ 
            id: s.id, 
            idType: typeof s.id, 
            name: s.name
        })));
        
        console.log ('Available leagues in leaguesData:', this.state.leaguesData.data.map (l => ({ 
            id: l.id, 
            name: l.name, 
            sport_id: l.sport_id,
            main_league_id: l.main_league_id
        })));
        console.log ('Looking for sport with ID:', this.state.currentViewId, 'Type:', typeof this.state.currentViewId);
        
        // Check if "Only in current schedule" is enabled
        const onlyCurrentSchedule = this.dom.currentScheduleOnlyCheckbox && this.dom.currentScheduleOnlyCheckbox.checked;
        console.log ('Only current schedule:', onlyCurrentSchedule);
        
        // Use the state to determine what to display
        let currentSport = null;
        
        if (this.state.currentViewType === 'LEAGUE')
            {
            // We're viewing a specific league, find it and show its subleagues
            console.log ('Viewing league:', this.state.currentViewName, 'ID:', this.state.currentViewId);
            
            // Find the league in leaguesData
            const foundLeague = this.state.leaguesData.data.find (league => 
                league.id == this.state.currentViewId ||
                league.id === this.state.currentViewId ||
                league.id == parseInt (this.state.currentViewId, 10) ||
                league.id === this.state.currentViewId.toString ()
            );
            
            if (foundLeague)
                {
                console.log ('Found league:', foundLeague);
                console.log ('League structure:', {
                    id: foundLeague.id,
                    name: foundLeague.name,
                    sport_id: foundLeague.sport_id,
                    main_league_id: foundLeague.main_league_id
                });
                
                // Find all subleagues for this league (leagues where main_league_id equals this league's id)
                let subleagues = this.state.leaguesData.data.filter (league => 
                    league.main_league_id === foundLeague.id
                );
                
                // If "Only in current schedule" is checked, filter subleagues to only those in menuData
                if (onlyCurrentSchedule && this.state.menuData && this.state.menuData.data)
                    {
                    const currentScheduleLeagueIds = new Set();
                    this.state.menuData.data.forEach (sport =>
                        {
                        if (sport.submenu && sport.submenu.length > 0)
                            {
                            sport.submenu.forEach (league =>
                                {
                                currentScheduleLeagueIds.add (league.id);
                                });
                            }
                        });
                    
                    subleagues = subleagues.filter (league => currentScheduleLeagueIds.has (league.id));
                    console.log ('Filtered subleagues to current schedule:', subleagues.map (s => s.name));
                    }
                
                console.log ('Found subleagues:', subleagues.map (s => s.name));
                
                // For leagues, we need to find the parent sport to get the sport name
                const parentSport = this.state.sportsData.data.find (sport => sport.id === foundLeague.sport_id);
                const sportName = parentSport ? parentSport.name : foundLeague.name;
                
                currentSport = {
                    id: foundLeague.id,
                    name: foundLeague.name,
                    sportName: sportName,
                    sportId: foundLeague.sport_id,
                    subleagues: subleagues
                };
                }
            }
        else if (this.state.currentViewType === 'CUSTOM_DISPLAY')
            {
            // We're viewing a custom display - show all leagues for editing
            console.log ('Viewing custom display:', this.state.currentViewName, 'ID:', this.state.currentViewId);
            
            // For custom displays, we want to show all available leagues
            const allLeagues = [];
            this.state.sportsData.data.forEach (sport =>
                {
                if (sport.id === 0)
                    return; // Skip TODAY
                    
                const sportLeagues = this.state.leaguesData.data.filter (league => 
                    league.sport_id === sport.id
                );
                sportLeagues.forEach (league =>
                    {
                    allLeagues.push ({
                        leagueId:   league.id,
                        leagueName: league.name,
                        sportName:  sport.name,
                        sportId:    sport.id,
                        enabled:    true
                    });
                    });
                });
            
            this.leagueOrderData = allLeagues;
            console.log ('Custom display - all leagues:', allLeagues.map (l => l.leagueName));
            
            // Apply saved order for custom display
            const savedOrderObj = this.storageService.loadLeagueOrder();
            const savedOrder = savedOrderObj[this.state.currentViewId] || [];
            if (savedOrder.length > 0)
                {
                const orderedData = [];
                const processedIds = new Set();
                savedOrder.forEach (savedItem =>
                    {
                    const item = this.leagueOrderData.find (d => d.leagueId === savedItem.id);
                    if (item)
                        {
                        item.enabled = savedItem.enabled;
                        orderedData.push (item);
                        processedIds.add (item.leagueId);
                        }
                    });
                this.leagueOrderData.forEach (item =>
                    {
                    if (!processedIds.has (item.leagueId))
                        orderedData.push (item);
                    });
                this.leagueOrderData = orderedData;
                }
            
            this.renderTable();
            return; // Early return for custom display view
            }
        else if (this.state.currentViewId === 0 || this.state.currentViewName === 'TODAY')
            {
            // We're viewing "TODAY" - show all leagues from all sports
            console.log ('Viewing TODAY - showing all leagues');
            
            if (onlyCurrentSchedule && this.state.menuData && this.state.menuData.data)
                {
                // Only show leagues that are in the current schedule
                const allLeagues = [];
                this.state.menuData.data.forEach (sport =>
                    {
                    if (sport.submenu && sport.submenu.length > 0)
                        {
                        sport.submenu.forEach (league =>
                            {
                            allLeagues.push ({
                                leagueId:   league.id,
                                leagueName: league.name,
                                sportName:  sport.name,
                                sportId:    sport.id,
                                enabled:    true
                            });
                            });
                        }
                    });
                this.leagueOrderData = allLeagues;
                console.log ('TODAY with current schedule only - leagues:', allLeagues.map (l => l.leagueName));
                }
            else
                {
                // Show all leagues from all sports
                const allLeagues = [];
                this.state.sportsData.data.forEach (sport =>
                    {
                    const sportLeagues = this.state.leaguesData.data.filter (league => 
                        league.sport_id === sport.id
                    );
                    sportLeagues.forEach (league =>
                        {
                        allLeagues.push ({
                            leagueId:   league.id,
                            leagueName: league.name,
                            sportName:  sport.name,
                            sportId:    sport.id,
                            enabled:    true
                        });
                        });
                    });
                this.leagueOrderData = allLeagues;
                console.log ('TODAY with all leagues - leagues:', allLeagues.map (l => l.leagueName));
                }
            
            // Apply saved order for TODAY
            const savedOrderObj = this.storageService.loadLeagueOrder();
            const savedOrder = savedOrderObj[0] || []; // Use ID 0 for TODAY
            if (savedOrder.length > 0)
                {
                const orderedData = [];
                const processedIds = new Set();
                savedOrder.forEach (savedItem =>
                    {
                    const item = this.leagueOrderData.find (d => d.leagueId === savedItem.id);
                    if (item)
                        {
                        item.enabled = savedItem.enabled;
                        orderedData.push (item);
                        processedIds.add (item.leagueId);
                        }
                    });
                this.leagueOrderData.forEach (item =>
                    {
                    if (!processedIds.has (item.leagueId))
                        orderedData.push (item);
                    });
                this.leagueOrderData = orderedData;
                }
            
            this.renderTable();
            return; // Early return for TODAY view
            }
        else
            {
            // We're viewing a sport, find it directly
            console.log ('Viewing sport:', this.state.currentViewName, 'ID:', this.state.currentViewId);
            currentSport = this.state.sportsData.data.find (s => 
                s.id == this.state.currentViewId ||
                s.id === this.state.currentViewId ||
                s.id == parseInt (this.state.currentViewId, 10) ||
                s.id === this.state.currentViewId.toString ()
            );
            }
        console.log ('currentSport:', currentSport);
        
        if (!currentSport)
            {
            console.log ('No currentSport found - this should not happen');
            return;
            }
        
        // Build the league order data based on what we found
        if (this.state.currentViewType === 'LEAGUE')
            {
            // We're viewing a specific league, show the league and its subleagues
            console.log ('Building data for specific league:', currentSport.name);
            this.leagueOrderData = [];
            
            // Add the main league itself
            this.leagueOrderData.push ({
                leagueId:   currentSport.id,
                leagueName: currentSport.name,
                sportName:  currentSport.name,
                sportId:    currentSport.id,
                enabled:    true, // Default to enabled
            });
            
            // Add subleagues if they exist
            if (currentSport.subleagues && currentSport.subleagues.length > 0)
                {
                console.log ('Adding subleagues:', currentSport.subleagues.map (s => s.name));
                currentSport.subleagues.forEach (subleague =>
                    {
                    this.leagueOrderData.push ({
                        leagueId:   subleague.id,
                        leagueName: subleague.name,
                        sportName:  currentSport.sportName,
                        sportId:    currentSport.sportId,
                        enabled:    true, // Default to enabled
                    });
                    });
                }
            }
        else
            {
            // We're viewing a sport, show all leagues for that sport
            console.log ('Building data for sport:', currentSport.name);
            
            // Get all leagues for this sport from leaguesData
            let sportLeagues = this.state.leaguesData.data.filter (league => 
                league.sport_id === currentSport.id
            );
            
            // If "Only in current schedule" is checked, filter to only leagues in menuData
            if (onlyCurrentSchedule && this.state.menuData && this.state.menuData.data)
                {
                const currentScheduleLeagueIds = new Set();
                this.state.menuData.data.forEach (sport =>
                    {
                    if (sport.submenu && sport.submenu.length > 0)
                        {
                        sport.submenu.forEach (league =>
                            {
                            currentScheduleLeagueIds.add (league.id);
                            });
                        }
                    });
                
                sportLeagues = sportLeagues.filter (league => currentScheduleLeagueIds.has (league.id));
                console.log ('Filtered sport leagues to current schedule:', sportLeagues.map (l => l.name));
                }
            
            console.log ('Found leagues for sport:', sportLeagues.map (l => l.name));
            
            this.leagueOrderData = sportLeagues.map (league =>
                ({
                leagueId:   league.id,
                leagueName: league.name,
                sportName:  currentSport.name,
                sportId:    currentSport.id,
                enabled:    true, // Default to enabled
                }));
            }

        // Apply saved order
        const savedOrderObj = this.storageService.loadLeagueOrder();
        // Use the current view ID for saved order (could be sport ID or league ID)
        const savedOrder = savedOrderObj[this.state.currentViewId] || [];
        if (savedOrder.length > 0)
            {
            const orderedData = [];
            const processedIds = new Set();
            savedOrder.forEach (savedItem =>
                {
                const item = this.leagueOrderData.find (d => d.leagueId === savedItem.id);
                if (item)
                    {
                    item.enabled = savedItem.enabled;
                    orderedData.push (item);
                    processedIds.add (item.leagueId);
                    }
                });
            this.leagueOrderData.forEach (item =>
                {
                if (!processedIds.has (item.leagueId))
                    orderedData.push (item);
                });
            this.leagueOrderData = orderedData;
            }

        this.renderTable();
        }
    //-------------------------------------------------------------------------------------------------
    populateTableForEditing (display = null)
        {
        // Always refresh the state reference to ensure we have the latest data
        this.state = this.app.state;
        
        if (!this.state.sportsData || !this.state.leaguesData || !this.state.sportsData.data || !this.state.leaguesData.data)
            return;

        // Check if "Only in current schedule" is enabled
        const onlyCurrentSchedule = this.dom.currentScheduleOnlyCheckbox && this.dom.currentScheduleOnlyCheckbox.checked;
        console.log ('populateTableForEditing - Only current schedule:', onlyCurrentSchedule);

        this.leagueOrderData = [];
        
        if (onlyCurrentSchedule && this.state.menuData && this.state.menuData.data)
            {
            // Use menuData for current schedule only
            this.state.menuData.data.forEach (sport =>
                {
                if (sport.id === 0)
                    return; // Skip TODAY

                if (sport.submenu && sport.submenu.length > 0)
                    {
                    sport.submenu.forEach (league =>
                        {
                        this.leagueOrderData.push
                            ({
                            leagueId:   league.id,
                            leagueName: league.name,
                            sportName:  sport.name,
                            sportId:    sport.id,
                            enabled:    display
                                        ? display.leagues.includes (league.id)
                                        : false,
                            });
                        });
                    }
                });
            }
        else
            {
            // Use all leagues from all sports
            this.state.sportsData.data.forEach (sport =>
                {
                if (sport.id === 0)
                    return; // Skip TODAY

                const sportLeagues = this.state.leaguesData.data.filter (league => 
                    league.sport_id === sport.id
                );
                
                sportLeagues.forEach (league =>
                    {
                    this.leagueOrderData.push
                        ({
                        leagueId:   league.id,
                        leagueName: league.name,
                        sportName:  sport.name,
                        sportId:    sport.id,
                        enabled:    display
                                    ? display.leagues.includes (league.id)
                                    : false,
                        });
                    });
                });
            }

        // If editing, sort selected leagues to the top in their saved order
        if (display && display.leagues)
            {
            const orderedData = [];
            const processedIds = new Set();
            display.leagues.forEach (leagueId =>
                {
                const item = this.leagueOrderData.find (d => d.leagueId === leagueId);
                if (item)
                    {
                    orderedData.push (item);
                    processedIds.add (leagueId);
                    }
                });
            this.leagueOrderData.forEach (item =>
                {
                if (!processedIds.has (item.leagueId))
                    orderedData.push (item);
                });
            this.leagueOrderData = orderedData;
            }

        this.renderTable();
        }
    //-------------------------------------------------------------------------------------------------
    getLeagueOrderFromTable (getObjects = false)
        {
        const rows = this.dom.tbody.querySelectorAll ('tr');
        const order = Array.from (rows).map (row =>
            {
            const leagueId = parseInt (row.dataset.leagueId, 10);
            const enabled = row.querySelector ('input[type="checkbox"]').checked;
            if (getObjects)
                return { id: leagueId, enabled: enabled };
            return leagueId;
            });
        
        // If not getting objects, filter for only enabled leagues
        if (!getObjects)
            {
            return Array.from (rows)
                .filter (row => row.querySelector ('input[type="checkbox"]').checked)
                .map (row => parseInt (row.dataset.leagueId, 10));
            }

        return order;
        }
    //-------------------------------------------------------------------------------------------------
    // EXACT CHANGE: Added this new helper method to sync the UI state with the internal data.
    //-------------------------------------------------------------------------------------------------
    updateLeagueOrderDataFromUI ()
        {
        const rows = this.dom.tbody.querySelectorAll ('tr');
        rows.forEach (row =>
            {
            const leagueId = parseInt (row.dataset.leagueId, 10);
            const isChecked = row.querySelector ('input[type="checkbox"]').checked;
            const dataItem = this.leagueOrderData.find (item => item.leagueId === leagueId);
            if (dataItem)
                dataItem.enabled = isChecked;
            });
        }
    //-------------------------------------------------------------------------------------------------
    renderTable ()
        {
        console.log ('renderTable called');
        console.log ('leagueOrderData:', this.leagueOrderData);
        console.log ('tbody element:', this.dom.tbody);
        
        this.dom.tbody.innerHTML = '';
        this.leagueOrderData.forEach (item =>
            {
            const row = document.createElement ('tr');
            row.dataset.leagueId = item.leagueId;
            row.setAttribute ('draggable', 'true');

            // Enabled checkbox
            const enabledCell = document.createElement ('td');
            const toggleSwitch = document.createElement ('label');
            toggleSwitch.className = 'toggle-switch';
            const checkbox = document.createElement ('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.enabled;
            checkbox.addEventListener ('change', () =>
                {
                // Update the internal state when a single checkbox is toggled
                this.updateLeagueOrderDataFromUI();
                });
            toggleSwitch.append (checkbox, Object.assign (document.createElement ('span'), {className: 'toggle-slider'}));
            enabledCell.appendChild (toggleSwitch);

            // Sport Name
            const sportCell = document.createElement ('td');
            sportCell.textContent = item.sportName;

            // League Name
            const leagueCell = document.createElement ('td');
            leagueCell.innerHTML = `<span class="drag-handle">⋮⋮</span> ${item.leagueName}`;
            
            // Subleague (placeholder)
            const subleagueCell = document.createElement ('td');
            subleagueCell.textContent = ''; // Logic for subleagues can be added here if needed

            row.append (enabledCell, sportCell, leagueCell, subleagueCell);
            this.dom.tbody.appendChild (row);
            });
        }
    //-------------------------------------------------------------------------------------------------
    updateButtonText ()
        {
        if (this.state.currentViewType === 'CUSTOM_DISPLAY')
            this.dom.orderLeaguesButton.textContent = `Edit ${this.state.currentViewName}`;
        else
            this.dom.orderLeaguesButton.textContent = 'Order Leagues';
        }
    
    //-------------------------------------------------------------------------------------------------
    /**
     * Initializes drag-and-drop functionality for league reordering in the modal.
     */
    //-------------------------------------------------------------------------------------------------
    initializeLeagueDragAndDrop ()
        {
        if (!this.dom.tbody) return;
        
        this.dom.tbody.addEventListener ('dragstart', this.handleLeagueDragStart.bind (this));
        this.dom.tbody.addEventListener ('dragover', this.handleLeagueDragOver.bind (this));
        this.dom.tbody.addEventListener ('drop', this.handleLeagueDrop.bind (this));
        this.dom.tbody.addEventListener ('dragend', this.handleLeagueDragEnd.bind (this));
        }
    
    //-------------------------------------------------------------------------------------------------
    handleLeagueDragStart (e)
        {
        const row = e.target.closest ('tr');
        if (!row || !row.dataset.leagueId) return;
        
        this.draggedRow = row;
        e.dataTransfer.setData ('text/plain', row.dataset.leagueId);
        row.classList.add ('dragging');
        }
    
    //-------------------------------------------------------------------------------------------------
    handleLeagueDragOver (e)
        {
        e.preventDefault ();
        e.dataTransfer.dropEffect = 'move';
        
        // Remove drag-over class from all rows
        this.dom.tbody.querySelectorAll ('tr').forEach (row => row.classList.remove ('drag-over'));
        
        // Add drag-over class to the target row
        const targetRow = e.target.closest ('tr');
        if (targetRow && targetRow.dataset.leagueId && targetRow !== this.draggedRow)
            {
            targetRow.classList.add ('drag-over');
            }
        }
    
    //-------------------------------------------------------------------------------------------------
    handleLeagueDrop (e)
        {
        e.preventDefault ();
        
        // Remove drag-over class from all rows
        this.dom.tbody.querySelectorAll ('tr').forEach (row => row.classList.remove ('drag-over'));
        
        const targetRow = e.target.closest ('tr');
        if (!targetRow || !targetRow.dataset.leagueId || targetRow === this.draggedRow) return;

        const draggedId = parseInt (this.draggedRow.dataset.leagueId, 10);
        const targetId = parseInt (targetRow.dataset.leagueId, 10);

        // Find the indices in the leagueOrderData array
        const draggedIndex = this.leagueOrderData.findIndex (item => item.leagueId === draggedId);
        const targetIndex = this.leagueOrderData.findIndex (item => item.leagueId === targetId);

        if (draggedIndex > -1 && targetIndex > -1)
            {
            // Move the item in the array
            const [movedItem] = this.leagueOrderData.splice (draggedIndex, 1);
            this.leagueOrderData.splice (targetIndex, 0, movedItem);

            // Re-render the table to reflect the new order
            this.renderTable ();
            }
        }
    
    //-------------------------------------------------------------------------------------------------
    handleLeagueDragEnd (e)
        {
        // Remove drag-over class from all rows
        this.dom.tbody.querySelectorAll ('tr').forEach (row => row.classList.remove ('drag-over'));
        
        if (this.draggedRow)
            {
            this.draggedRow.classList.remove ('dragging');
            this.draggedRow = null;
            }
        }
    }
