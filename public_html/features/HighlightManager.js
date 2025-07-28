/**
 * @class HighlightManager
 * Manages the logic for highlighting events (rows) and sportsbooks (columns).
 * It handles loading/saving highlight state and applying/removing the
 * corresponding CSS classes to the DOM.
 */
export default class HighlightManager
    {
    constructor (state, storageService)
        {
        this.state = state;
        this.storageService = storageService;
        this.highlightedEvents = new Map ();
        this.highlightedSportsbooks = new Map ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Loads highlighted events from storage.
     */
    //-------------------------------------------------------------------------------------------------
    loadHighlightedEvents ()
        {
        this.highlightedEvents = this.storageService.loadHighlightedEvents ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Loads highlighted sportsbooks from storage.
     */
    //-------------------------------------------------------------------------------------------------
    loadHighlightedSportsbooks ()
        {
        this.highlightedSportsbooks = this.storageService.loadHighlightedSportsbooks ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Applies all currently active highlights to the DOM.
     */
    //-------------------------------------------------------------------------------------------------
    applyAllHighlights ()
        {
        this.applyEventHighlights ();
        this.applySportsbookHighlights ();
        }
    //-------------------------------------------------------------------------------------------------
    // --- Event Highlighting ---
    /**
     * Toggles the highlight state for a given event.
     * @param {string} eventId - The ID of the event to toggle.
     */
    //-------------------------------------------------------------------------------------------------
    toggleEventHighlight (eventId)
        {
        if (this.highlightedEvents.has (eventId))
            {
            this.highlightedEvents.delete (eventId);
            }
        else
            {
            this.highlightedEvents.set (eventId, true);
            }
        this.storageService.saveHighlightedEvents (this.highlightedEvents);
        this.applyEventHighlights ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Applies the 'highlighted' class to all event rows that should be highlighted.
     */
    //-------------------------------------------------------------------------------------------------
    applyEventHighlights ()
        {
        document.querySelectorAll ('tr.highlighted').forEach (row => row.classList.remove ('highlighted'));
        this.highlightedEvents.forEach ((value, eventId) =>
            {
            const row = document.querySelector (`tr[data-event-id="${eventId}"]`);
            if (row)
                {
                row.classList.add ('highlighted');
                }
            });
        }
    //-------------------------------------------------------------------------------------------------
    // --- Sportsbook Highlighting ---
    /**
     * Highlights a sportsbook column based on a given type.
     * @param {string} sportsbookId - The ID of the sportsbook.
     * @param {string} type - The highlight type ('all-sports', 'this-sport', 'this-table').
     */
    //-------------------------------------------------------------------------------------------------
    highlightSportsbook (sportsbookId, type)
        {
        const highlightData = { type };
        if (type === 'this-sport')
            {
            highlightData.sportId = this.state.currentViewId;
            }
        // 'this-table' would require group context, which needs more complex state passing
        this.highlightedSportsbooks.set (sportsbookId, highlightData);
        this.storageService.saveHighlightedSportsbooks (this.highlightedSportsbooks);
        this.applySportsbookHighlights ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Removes any highlight from a specific sportsbook.
     * @param {string} sportsbookId - The ID of the sportsbook.
     */
    //-------------------------------------------------------------------------------------------------
    unhighlightSportsbook (sportsbookId)
        {
        this.highlightedSportsbooks.delete (sportsbookId);
        this.storageService.saveHighlightedSportsbooks (this.highlightedSportsbooks);
        this.applySportsbookHighlights ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Applies the 'sportsbook-highlighted' class to all cells that should be highlighted.
     */
    //-------------------------------------------------------------------------------------------------
    applySportsbookHighlights ()
        {
        document.querySelectorAll ('td.sportsbook-highlighted').forEach (cell => cell.classList.remove ('sportsbook-highlighted'));

        this.highlightedSportsbooks.forEach ((data, sportsbookId) =>
            {
            let shouldHighlight = false;
            if (data.type === 'all-sports')
                {
                shouldHighlight = true;
                }
            else if (data.type === 'this-sport' && data.sportId === this.state.currentViewId)
                {
                shouldHighlight = true;
                }

            if (shouldHighlight)
                {
                document.querySelectorAll (`td[data-sportsbook="${sportsbookId}"]`).forEach (cell =>
                    {
                    cell.classList.add ('sportsbook-highlighted');
                    });
                }
            });
        }
    }
//-------------------------------------------------------------------------------------------------
// Make this globally accessible for the inline onclick handler
//-------------------------------------------------------------------------------------------------
window.handleTeamNameClick = function (eventId)
    {
    // This is a bit of a hack. In a full component-based framework (like React),
    // we would pass the manager instance down. For now, we assume a single app instance.
    // This will need to be connected to the HighlightManager instance in the App class.
    console.log (`Highlighting event ${eventId}. This needs to be connected to the App's HighlightManager instance.`);
    };
