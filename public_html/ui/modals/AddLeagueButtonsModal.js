/**
 * @class AddLeagueButtonsModal
 * Manages the "Add League Buttons" modal for adding league buttons to the sports menu.
 */
export default class AddLeagueButtonsModal
    {
    constructor (app)
        {
        this.app = app;
        this.storageService = app.storageService;
        this.state = app.state;

        this.dom =
            {
            modal       : document.getElementById ('add-league-buttons-modal'),
            closeButton : document.getElementById ('close-add-league-modal'),
            saveButton  : document.getElementById ('save-add-league-buttons'),
            cancelButton: document.getElementById ('cancel-add-league-buttons'),
            tbody       : document.getElementById ('add-league-buttons-tbody'),
            };
            
        this.leaguesData = [];
        this.currentSportId = null;

        this.init ();
        }
    //-------------------------------------------------------------------------------------------------
    init ()
        {
        this.bindEventListeners ();
        }
    //-------------------------------------------------------------------------------------------------
    bindEventListeners ()
        {
        this.dom.saveButton  .addEventListener ('click', () => this.save ());
        this.dom.cancelButton.addEventListener ('click', () => this.close ());
        this.dom.closeButton .addEventListener ('click', () => this.close ());
        }
    //-------------------------------------------------------------------------------------------------
    open (sportId)
        {
        this.currentSportId = sportId;
        this.populateTable ();
        this.dom.modal.classList.remove ('hidden');
        }
    //-------------------------------------------------------------------------------------------------
    close ()
        {
        this.dom.modal.classList.add ('hidden');
        this.leaguesData = [];
        this.currentSportId = null;
        }
    //-------------------------------------------------------------------------------------------------
    save ()
        {
        const enabledLeagues = this.leaguesData.filter (league => league.enabled);
        
        if (enabledLeagues.length === 0)
            {
            alert ('Please select at least one league to add.');
            return;
            }

        // Add the enabled leagues to the sports buttons data
        enabledLeagues.forEach (league =>
            {
            const leagueName = league.customName || league.name;
            const newItem =
                {
                id: league.id,
                name: leagueName,
                type: 'LEAGUE',
                enabled: true
                };
            
            // Add to the sports buttons data
            this.app.sportsButtonsModal.sportsButtonsData.push (newItem);
            });

        // Close this modal
        this.close ();
        
        // Refresh the sports buttons modal
        this.app.sportsButtonsModal.renderTable ();
        }
    //-------------------------------------------------------------------------------------------------
    populateTable ()
        {
        if (!this.state.leaguesData || !this.currentSportId)
            return;

        // Get all leagues for the current sport
        const sportLeagues = this.state.leaguesData.data.filter (league => 
            league.sport_id === parseInt (this.currentSportId));

        // Get existing league buttons to avoid duplicates
        const existingLeagueIds = new Set (
            this.app.sportsButtonsModal.sportsButtonsData
                .filter (item => item.type === 'LEAGUE')
                .map (item => item.id)
            );

        // Filter out leagues that are already added as buttons
        const availableLeagues = sportLeagues.filter (league => 
            !existingLeagueIds.has (league.id.toString ()));

        this.leaguesData = availableLeagues.map (league =>
            ({
            id: league.id,
            name: league.name,
            customName: '',
            enabled: false
            }));

        this.renderTable ();
        }
    //-------------------------------------------------------------------------------------------------
    renderTable ()
        {
        this.dom.tbody.innerHTML = '';
        this.leaguesData.forEach (league =>
            {
            const row = document.createElement ('tr');
            row.className = 'league-button-row';
            
            // Enabled checkbox
            const enabledCell = document.createElement ('td');
            const toggleSwitch = document.createElement ('label');
            toggleSwitch.className = 'toggle-switch';
            const checkbox = document.createElement ('input');
            checkbox.type = 'checkbox';
            checkbox.checked = league.enabled;
            checkbox.onchange = () => { league.enabled = checkbox.checked; };
            toggleSwitch.append (checkbox, Object.assign (document.createElement ('span'), {className: 'toggle-slider'}));
            enabledCell.appendChild (toggleSwitch);
            
            // League name
            const nameCell = document.createElement ('td');
            nameCell.textContent = league.name;
            
            // Custom name input
            const customNameCell = document.createElement ('td');
            const nameInput = document.createElement ('input');
            nameInput.type = 'text';
            nameInput.className = 'custom-name-input';
            nameInput.placeholder = league.name;
            nameInput.value = league.customName;
            nameInput.onchange = (e) => { league.customName = e.target.value; };
            customNameCell.appendChild (nameInput);
            
            row.appendChild (enabledCell);
            row.appendChild (nameCell);
            row.appendChild (customNameCell);
            this.dom.tbody.appendChild (row);
            });
        }
    }