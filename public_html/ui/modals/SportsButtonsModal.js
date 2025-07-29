/**
 * @class SportsButtonsModal
 * Manages the "Edit Sports Buttons" modal for showing, hiding, and reordering
 * the main sport and custom display buttons.
 */
export default class SportsButtonsModal
    {
    constructor (app)
        {
        this.app = app;
        this.storageService = app.storageService;
        this.state = app.state;

        this.dom =
            {
            modal       : document.getElementById ('sports-buttons-modal'),
            openButton  : document.getElementById ('edit-sports-buttons-button'),
            closeButton : document.getElementById ('close-sports-modal'),
            saveButton  : document.getElementById ('save-sports-buttons'),
            cancelButton: document.getElementById ('cancel-sports-buttons'),
            tbody       : document.getElementById ('sports-buttons-tbody'),
            };
            
        this.sportsButtonsData = [];

        this.init();
        }
    //-------------------------------------------------------------------------------------------------
    init()
        {
        this.bindEventListeners();
        }
    //-------------------------------------------------------------------------------------------------
    bindEventListeners ()
        {
        this.dom.saveButton  .addEventListener ('click', () => this.save ());
        this.dom.cancelButton.addEventListener ('click', () => this.close ());
        this.dom.closeButton .addEventListener ('click', () => this.close ());
        
        // Initialize drag and drop for sports buttons
        this.initializeDragAndDrop();
        }
    //-------------------------------------------------------------------------------------------------
    initializeDragAndDrop ()
        {
        this.dom.tbody.addEventListener ('dragstart', this.handleDragStart.bind (this));
        this.dom.tbody.addEventListener ('dragover' , this.handleDragOver .bind (this));
        this.dom.tbody.addEventListener ('drop'     , this.handleDrop     .bind (this));
        this.dom.tbody.addEventListener ('dragend'  , this.handleDragEnd  .bind (this));
        }
    //-------------------------------------------------------------------------------------------------
    handleDragStart (e)
        {
        const row = e.target.closest ('tr');
        if (!row) return;
        
        e.dataTransfer.setData ('text/plain', row.dataset.itemKey);
        row.classList.add ('dragging');
        }
    //-------------------------------------------------------------------------------------------------
    handleDragOver (e)
        {
        e.preventDefault ();
        const row = e.target.closest ('tr');
        if (row && !row.classList.contains ('dragging'))
            {
            row.classList.add ('drag-over');
            }
        }
    //-------------------------------------------------------------------------------------------------
    handleDrop (e)
        {
        e.preventDefault ();
        const draggedRow = this.dom.tbody.querySelector ('.dragging');
        const targetRow = e.target.closest ('tr');
        
        if (!draggedRow || !targetRow || draggedRow === targetRow) return;
        
        const draggedKey = draggedRow.dataset.itemKey;
        const targetKey = targetRow.dataset.itemKey;
        
        // Find indices in the data array
        const draggedIndex = this.sportsButtonsData.findIndex (item => `${item.type}:${item.id}` === draggedKey);
        const targetIndex  = this.sportsButtonsData.findIndex (item => `${item.type}:${item.id}` === targetKey);
        
        if (draggedIndex > -1 && targetIndex > -1)
            {
            // Reorder the data array
            const [movedItem] = this.sportsButtonsData.splice (draggedIndex, 1);
            this.sportsButtonsData.splice (targetIndex, 0, movedItem);
            
            // Re-render the table
            this.renderTable ();
            }
        }
    //-------------------------------------------------------------------------------------------------
    handleDragEnd (e)
        {
        // Remove drag classes
        this.dom.tbody.querySelectorAll ('.dragging, .drag-over').forEach (el =>
            {
            el.classList.remove ('dragging', 'drag-over');
            });
        }
    //-------------------------------------------------------------------------------------------------
    open ()
        {
        this.populateTable();
        this.dom.modal.classList.remove ('hidden');
        }
    //-------------------------------------------------------------------------------------------------
    close ()
        {
        this.dom.modal.classList.add ('hidden');
        }
    //-------------------------------------------------------------------------------------------------
    save ()
        {
        // Build new order array from the current table order
        const newOrder = [];
        const visibility = {};
        const leagueButtons = [];
        
        this.sportsButtonsData.forEach (item =>
            {
            // Create type/id key for the item
            const itemKey = `${item.type}:${item.id}`;
            newOrder.push (itemKey);
            visibility[itemKey] = item.enabled;
            
            // Collect league buttons for storage
            if (item.type === 'LEAGUE')
                {
                leagueButtons.push ({
                    id: item.id,
                    name: item.name
                    });
                }
            });
        
        this.storageService.saveItemOrder (newOrder);
        this.storageService.saveItemsVisibility (visibility);
        this.storageService.saveLeagueButtons (leagueButtons);
        
        this.app.redrawAll ();
        this.close ();
        }
    //-------------------------------------------------------------------------------------------------
    populateTable ()
        {
        this.sportsButtonsData = [];
        const itemOrder       = this.storageService.loadItemOrder ();
        const itemsVisibility = this.storageService.loadItemsVisibility ();
        const customDisplays  = this.app.leagueOrderModal.customDisplays;

        // Combine sports and custom displays with proper type/id structure
        const allItems = [];
        
        // Add TODAY and TOMORROW as CUSTOM_DISPLAY items
        allItems.push ({ id: 'TODAY'   , name: 'TODAY'   , type: 'CUSTOM_DISPLAY' });
        allItems.push ({ id: 'TOMORROW', name: 'TOMORROW', type: 'CUSTOM_DISPLAY' });
        
        // Add sports (filter out old TODAY sport with ID 0)
        this.state.menuData.data.filter (sport => sport.id !== 0).forEach (sport =>
            {
            allItems.push ({ id: sport.id.toString (), name: sport.name, type: 'SPORT' });
            });
        
        // Add custom displays
        customDisplays.forEach (display =>
            {
            allItems.push ({ id: display.id, name: display.name, type: 'CUSTOM_DISPLAY' });
            });

        // Add league buttons from storage
        const leagueButtons = this.storageService.loadLeagueButtons () || [];
        leagueButtons.forEach (league =>
            {
            allItems.push ({ id: league.id.toString (), name: league.name, type: 'LEAGUE' });
            });
        
        const itemMap = new Map (allItems.map (item => [`${item.type}:${item.id}`, item]));

        // Build data array in the correct order
        const orderedItems = [];
        const processedKeys = new Set ();
        
        itemOrder.forEach (itemKey =>
            {
            if (itemMap.has (itemKey))
                {
                orderedItems.push (itemMap.get (itemKey));
                processedKeys.add (itemKey);
                }
            });

        allItems.forEach (item =>
            {
            const itemKey = `${item.type}:${item.id}`;
            if (!processedKeys.has (itemKey))
                orderedItems.push (item);
            });

        this.sportsButtonsData = orderedItems.map (item =>
            ({
            id: item.id,
            name: item.name,
            type: item.type,
            enabled: itemsVisibility[`${item.type}:${item.id}`] !== false, // default to true
            }));
        
        this.renderTable ();
        }
    //-------------------------------------------------------------------------------------------------
    getSportIcon (sportId)
        {
        const iconMap =
            {
            1: '🏈', // Football
            2: '🏀', // Basketball
            3: '⚾', // Baseball
            4: '🏒', // Hockey
            5: '⚽', // Soccer
            6: '🥊', // Fighting
            7: '⛳', // Golf
            8: '🎾', // Tennis
            9: '🏁', // Auto Racing
            };
        
        return iconMap[sportId] || '🏈'; // Default to football if sport ID not found
        }
    //-------------------------------------------------------------------------------------------------
    renderTable ()
        {
        this.dom.tbody.innerHTML = '';
        this.sportsButtonsData.forEach (item =>
            {
            const row = document.createElement ('tr');
            row.className = 'sports-button-row';
            row.draggable = true;
            row.dataset.itemKey = `${item.type}:${item.id}`;
            
            // Enabled checkbox
            const enabledCell = document.createElement ('td');
            const toggleSwitch = document.createElement ('label');
            toggleSwitch.className = 'toggle-switch';
            const checkbox = document.createElement ('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.enabled;
            checkbox.onchange = () => { item.enabled = checkbox.checked; };
            toggleSwitch.append (checkbox, Object.assign (document.createElement ('span'), {className: 'toggle-slider'}));
            enabledCell.appendChild (toggleSwitch);
            
            // Name with drag handle and appropriate icon
            const nameCell = document.createElement ('td');
            let icon = '';
            if (item.type === 'CUSTOM_DISPLAY')
                {
                // Don't show star for TODAY and TOMORROW since they are special
                if (item.id !== 'TODAY' && item.id !== 'TOMORROW')
                    icon = '⭐ ';
                }
            else if (item.type === 'SPORT')
                icon = this.getSportIcon (parseInt (item.id)) + ' ';
            else if (item.type === 'LEAGUE')
                icon = '🏆 ';
            
            nameCell.innerHTML = `<span class="drag-handle">⋮⋮</span> ${icon}${item.name}`;
            
            // Action button (Add League Buttons for SPORT, Delete for CUSTOM_DISPLAY, Remove for LEAGUE)
            const actionCell = document.createElement ('td');
            if (item.type === 'SPORT')
                {
                const addLeagueBtn = document.createElement ('button');
                addLeagueBtn.className = 'add-league-button';
                addLeagueBtn.textContent = 'Add League Buttons';
                addLeagueBtn.onclick = () => this.app.addLeagueButtonsModal.open (item.id);
                actionCell.appendChild (addLeagueBtn);
                }
            else if (item.type === 'CUSTOM_DISPLAY' && item.id !== 'TODAY' && item.id !== 'TOMORROW')
                {
                const deleteBtn = document.createElement ('button');
                deleteBtn.className = 'delete-button';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () =>
                    {
                    if (confirm (`Are you sure you want to delete "${item.name}"?`))
                        {
                        this.app.leagueOrderModal.customDisplays = this.app.leagueOrderModal.customDisplays.filter (d => d.id !== item.id);
                        this.app.leagueOrderModal.saveCustomDisplays ();
                        this.populateTable (); // Re-render this modal's table
                        }
                    };
                actionCell.appendChild (deleteBtn);
                }
            else if (item.type === 'LEAGUE')
                {
                const removeBtn = document.createElement ('button');
                removeBtn.className = 'remove-button';
                removeBtn.textContent = 'Remove';
                removeBtn.onclick = () =>
                    {
                    if (confirm (`Are you sure you want to remove "${item.name}"?`))
                        {
                        // Remove from sports buttons data
                        const index = this.sportsButtonsData.findIndex (dataItem => 
                            dataItem.type === 'LEAGUE' && dataItem.id === item.id);
                        if (index > -1)
                            {
                            this.sportsButtonsData.splice (index, 1);
                            this.renderTable (); // Re-render the table
                            }
                        }
                    };
                actionCell.appendChild (removeBtn);
                }
            
            row.appendChild (enabledCell);
            row.appendChild (nameCell);
            row.appendChild (actionCell);
            this.dom.tbody.appendChild (row);
            });
        }
    }
