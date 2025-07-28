/**
 * @class PrintModal
 * Manages the "Print" modal, including column selection for export
 * and triggering the Excel export functionality.
 */
export default class PrintModal
    {
    constructor (app)
        {
        this.app = app;
        this.state = app.state;

        this.dom = {
            modal: document.getElementById ('print-modal'),
            openButton: document.getElementById ('print-button'),
            closeButton: document.getElementById ('close-print-modal'),
            exportButton: document.getElementById ('print-export-button'),
            cancelButton: document.getElementById ('cancel-print'),
            tbody: document.getElementById ('print-columns-tbody'),
            };
            
        this.printColumnsData = [];

        this.init();
        }
    //-------------------------------------------------------------------------------------------------
    init ()
        {
        this.bindEventListeners();
        }
    //-------------------------------------------------------------------------------------------------
    bindEventListeners ()
        {
        this.dom.openButton.addEventListener('click', () => this.open());
        this.dom.closeButton.addEventListener('click', () => this.close());
        this.dom.cancelButton.addEventListener('click', () => this.close());
        this.dom.exportButton.addEventListener('click', () => this.exportToExcel());
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
    populateTable()
        {
        const staticColumns =
            [
            { id: 'date', name: 'Date', enabled: true, type: 'static' },
            { id: 'time', name: 'Time', enabled: true, type: 'static' },
            { id: 'rotation', name: 'Rotation', enabled: true, type: 'static' },
            { id: 'team', name: 'Team', enabled: true, type: 'static' },
            ];
        
        const sportsbookColumns = this.state.sportsbookOrder.map(sbId => ({
            id: sbId,
            name: this.state.sportsbookIdToName[sbId] || sbId,
            enabled: false,
            type: 'sportsbook'
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        this.printColumnsData = [...staticColumns, ...sportsbookColumns];
        this.renderTable();
        }
    //-------------------------------------------------------------------------------------------------
    renderTable()
        {
        this.dom.tbody.innerHTML = '';
        this.printColumnsData.forEach(col =>
            {
            const row = document.createElement('tr');
            row.className = 'print-column-row';
            row.dataset.columnId = col.id;
            
            const enabledCell = document.createElement('td');
            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = col.enabled;
            toggle.onchange = () => { col.enabled = toggle.checked; };
            enabledCell.appendChild(toggle);
            
            const nameCell = document.createElement('td');
            nameCell.textContent = col.name;
            
            row.append(enabledCell, nameCell);
            this.dom.tbody.appendChild(row);
            });
        }
    //-------------------------------------------------------------------------------------------------
    exportToExcel ()
        {
        if (typeof XLSX === 'undefined')
            {
            alert ('Excel export library not loaded.');
            return;
            }

        const enabledColumns = this.printColumnsData.filter(col => col.enabled);
        if (enabledColumns.length === 0)
            {
            alert('Please select at least one column to export.');
            return;
            }

        const dataRows = [];
        const headers = enabledColumns.map(col => col.name);
        dataRows.push(headers);
        
        // Simplified data extraction logic
        this.state.currentData.forEach (group =>
            {
            dataRows.push([group.header]); // Group header
            group.events.forEach(event =>
                {
                const awayRow = {};
                const homeRow = {};
                
                enabledColumns.forEach(col =>
                    {
                    switch(col.id)
                        {
                        case 'date': awayRow[col.name] = event.date; homeRow[col.name] = event.date; break;
                        case 'time': awayRow[col.name] = event.time; homeRow[col.name] = event.time; break;
                        case 'rotation': awayRow[col.name] = event.rotation_number; homeRow[col.name] = parseInt(event.rotation_number) + 1; break;
                        case 'team': awayRow[col.name] = event.awayTeam; homeRow[col.name] = event.homeTeam; break;
                        default: // Sportsbook
                            // This logic needs to find the correct odds value from the DOM or state
                            awayRow[col.name] = '-';
                            homeRow[col.name] = '-';
                        }
                    });
                dataRows.push (Object.values(awayRow));
                dataRows.push (Object.values(homeRow));
                });
            });

        const worksheet = XLSX.utils.aoa_to_sheet (dataRows);
        const workbook  = XLSX.utils.book_new ();
        XLSX.utils.book_append_sheet (workbook, worksheet, 'Phoenix Odds Data');

        const timestamp = new Date ().toISOString ().replace (/[:.]/g, '-');
        XLSX.writeFile (workbook, `phoenix_odds_${timestamp}.xlsx`);
        
        this.close();
        }
    }
