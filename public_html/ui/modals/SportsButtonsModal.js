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
        this.dom.openButton  .addEventListener ('click', () => this.open());
        this.dom.closeButton .addEventListener ('click', () => this.close());
        this.dom.cancelButton.addEventListener ('click', () => this.close());
        this.dom.saveButton  .addEventListener ('click', () => this.save());
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
        // Get order from DOM
        const newOrder = Array.from(this.dom.tbody.querySelectorAll('tr')).map(row => row.dataset.sportId);
        
        // Get visibility from data array
        const visibility = {};
        this.sportsButtonsData.forEach(item => {
            visibility[item.id] = item.enabled;
        });
        
        this.storageService.saveSportOrder(newOrder);
        this.storageService.saveSportsVisibility(visibility);
        
        this.app.redrawAll();
        this.close();
        }
    //-------------------------------------------------------------------------------------------------
    populateTable ()
        {
        this.sportsButtonsData = [];
        const sportOrder = this.storageService.loadSportOrder();
        const sportsVisibility = this.storageService.loadSportsVisibility();
        const customDisplays = this.app.leagueOrderModal.customDisplays;

        // Combine sports and custom displays
        const allItems =
            [
            ...this.state.menuData.data,
            ...customDisplays.map(d => ({...d, id: d.id.toString(), type: 'custom'}))
            ];
        
        const itemMap = new Map(allItems.map(item => [item.id.toString(), item]));

        // Build data array in the correct order
        const orderedItems = [];
        const processedIds = new Set();
        
        sportOrder.forEach (id =>
            {
            if (itemMap.has (id))
                {
                orderedItems.push(itemMap.get(id));
                processedIds.add(id);
                }
            });

        allItems.forEach (item =>
            {
            if (!processedIds.has(item.id.toString()))
                orderedItems.push(item);
            });

        this.sportsButtonsData = orderedItems.map (item =>
            ({
            id: item.id.toString(),
            name: (item.id === 0 ? 'TODAY' : item.name), // Use "TODAY" for ID 0
            type: item.type || 'sport',
            enabled: sportsVisibility[item.id] !== false, // default to true
            }));
        
        this.renderTable();
        }
    //-------------------------------------------------------------------------------------------------
    renderTable ()
        {
        this.dom.tbody.innerHTML = '';
        this.sportsButtonsData.forEach (item =>
            {
            const row = document.createElement('tr');
            row.className = 'sports-button-row';
            row.draggable = true;
            row.dataset.sportId = item.id;
            
            // Enabled checkbox
            const enabledCell = document.createElement('td');
            const toggleSwitch = document.createElement('label');
            toggleSwitch.className = 'toggle-switch';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.enabled;
            checkbox.onchange = () => { item.enabled = checkbox.checked; };
            toggleSwitch.append(checkbox, Object.assign(document.createElement('span'), {className: 'toggle-slider'}));
            enabledCell.appendChild(toggleSwitch);
            
            // Name with drag handle
            const nameCell = document.createElement('td');
            nameCell.innerHTML = `<span class="drag-handle">⋮⋮</span> ${item.type === 'custom' ? '⭐ ' : ''}${item.name}`;
            
            // Delete button for custom displays
            const deleteCell = document.createElement('td');
            if (item.type === 'custom')
                {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-button';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () =>
                    {
                    if (confirm(`Are you sure you want to delete "${item.name}"?`))
                        {
                        this.app.leagueOrderModal.customDisplays = this.app.leagueOrderModal.customDisplays.filter(d => d.id !== item.id);
                        this.app.leagueOrderModal.saveCustomDisplays();
                        this.populateTable(); // Re-render this modal's table
                        }
                    };
                deleteCell.appendChild(deleteBtn);
                }

            row.append(enabledCell, nameCell, deleteCell);
            this.dom.tbody.appendChild(row);
            });
        }
    }
