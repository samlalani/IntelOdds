/**
 * @class DragAndDropManager
 * A single class to initialize and control all drag-and-drop functionality
 * for reordering sportsbooks, groups, and events.
 */
export default class DragAndDropManager
    {
    constructor (dragEndCallback, state, storageService)
        {
        this.dragEndCallback = dragEndCallback;
        this.state = state;
        this.storageService = storageService;
        this.draggedElement = null;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Initializes all drag-and-drop event listeners.
     */
    //-------------------------------------------------------------------------------------------------
    initializeAll ()
        {
        this.initializeSportsbookDnd ();
        this.initializeGroupDnd ();
        this.initializeEventDnd ();
        }
    //-------------------------------------------------------------------------------------------------
    // --- Sportsbook D&D ---
    //-------------------------------------------------------------------------------------------------
    initializeSportsbookDnd ()
        {
        const headers = document.querySelectorAll ('th[data-sportsbook]');
        headers.forEach (header =>
            {
            header.setAttribute ('draggable', 'true');
            header.addEventListener ('dragstart', this.handleSportsbookDragStart.bind (this));
            header.addEventListener ('dragover', this.handleDragOver.bind (this));
            header.addEventListener ('drop', this.handleSportsbookDrop.bind (this));
            header.addEventListener ('dragend', this.handleDragEnd.bind (this));
            });
        }
    //-------------------------------------------------------------------------------------------------
    handleSportsbookDragStart (e)
        {
        this.draggedElement = e.target;
        e.dataTransfer.setData ('text/plain', e.target.dataset.sportsbook);
        e.target.classList.add ('dragging');
        }
    //-------------------------------------------------------------------------------------------------
    handleSportsbookDrop (e)
        {
        e.preventDefault ();
        const targetHeader = e.target.closest ('th[data-sportsbook]');
        if (!targetHeader || targetHeader === this.draggedElement) return;

        const draggedId = this.draggedElement.dataset.sportsbook;
        const targetId = targetHeader.dataset.sportsbook;

        const sourceIndex = this.state.sportsbookOrder.indexOf (draggedId);
        const targetIndex = this.state.sportsbookOrder.indexOf (targetId);

        if (sourceIndex > -1 && targetIndex > -1)
            {
            // Update the order array
            const [movedItem] = this.state.sportsbookOrder.splice (sourceIndex, 1);
            this.state.sportsbookOrder.splice (targetIndex, 0, movedItem);

            // Save and notify App to redraw
            this.storageService.saveSportsbookOrder(this.state.sportsbookOrder);
            this.dragEndCallback ('sportsbook');
            }
        }
    //-------------------------------------------------------------------------------------------------
    // --- Group D&D ---
    //-------------------------------------------------------------------------------------------------
    initializeGroupDnd ()
        {
        const headers = document.querySelectorAll ('h1[data-group]');
        headers.forEach (header =>
            {
            header.setAttribute ('draggable', 'true');
            header.addEventListener ('dragstart', this.handleGroupDragStart.bind (this));
            header.addEventListener ('dragover', this.handleDragOver.bind (this));
            header.addEventListener ('drop', this.handleGroupDrop.bind (this));
            header.addEventListener ('dragend', this.handleDragEnd.bind (this));
            });
        }
    //-------------------------------------------------------------------------------------------------
    handleGroupDragStart (e)
        {
        this.draggedElement = e.target;
        e.dataTransfer.setData ('text/plain', e.target.dataset.group);
        e.target.classList.add ('dragging');
        }
    //-------------------------------------------------------------------------------------------------
    handleGroupDrop (e)
        {
        e.preventDefault ();
        const targetHeader = e.target.closest ('h1[data-group]');
        if (!targetHeader || targetHeader === this.draggedElement) return;

        const draggedId = this.draggedElement.dataset.group;
        const targetId = targetHeader.dataset.group;

        const sourceIndex = this.state.groupOrder.indexOf (draggedId);
        const targetIndex = this.state.groupOrder.indexOf (targetId);
        
        if (sourceIndex > -1 && targetIndex > -1)
            {
            const [movedItem] = this.state.groupOrder.splice (sourceIndex, 1);
            this.state.groupOrder.splice (targetIndex, 0, movedItem);
            
            this.storageService.saveGroupOrder(this.state.groupOrder);
            this.dragEndCallback ('group');
            }
        }
    //-------------------------------------------------------------------------------------------------
    // --- Event D&D ---
    //-------------------------------------------------------------------------------------------------
    initializeEventDnd ()
        {
        const rows = document.querySelectorAll ('tr[data-event-id]');
        rows.forEach (row =>
            {
            const handle = row.querySelector ('.rotation-numbers');
            if (handle)
                {
                handle.setAttribute ('draggable', 'true');
                handle.addEventListener ('dragstart', this.handleEventDragStart.bind (this));
                }
            row.addEventListener ('dragover', this.handleDragOver.bind (this));
            row.addEventListener ('drop', this.handleEventDrop.bind (this));
            row.addEventListener ('dragend', this.handleDragEnd.bind (this));
            });
        }
    //-------------------------------------------------------------------------------------------------
    handleEventDragStart (e)
        {
        this.draggedElement = e.target.closest ('tr');
        e.dataTransfer.setData ('text/plain', JSON.stringify (this.draggedElement.dataset));
        this.draggedElement.classList.add ('dragging');
        }
    //-------------------------------------------------------------------------------------------------
    handleEventDrop (e)
        {
        e.preventDefault ();
        const targetRow = e.target.closest ('tr[data-event-id]');
        if (!targetRow || targetRow === this.draggedElement) return;
        
        const sourceData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetData = targetRow.dataset;

        if (sourceData.group === targetData.group) {
            const groupId = sourceData.group;
            const groupEventOrder = this.state.eventOrder.get(groupId) || [];

            const sourceId = sourceData.eventId;
            const targetId = targetData.eventId;

            const sourceIndex = groupEventOrder.indexOf(sourceId);
            const targetIndex = groupEventOrder.indexOf(targetId);
            
            if (sourceIndex > -1 && targetIndex > -1) {
                const [movedItem] = groupEventOrder.splice(sourceIndex, 1);
                groupEventOrder.splice(targetIndex, 0, movedItem);

                this.state.eventOrder.set(groupId, groupEventOrder);
                this.storageService.saveEventOrder(this.state.eventOrder);
                this.dragEndCallback('event');
            }
        }
    }
    //-------------------------------------------------------------------------------------------------
    // --- Generic Handlers ---
    //-------------------------------------------------------------------------------------------------
    handleDragOver (e)
        {
        e.preventDefault ();
        const target = e.target.closest ('[draggable="true"]');
        document.querySelectorAll ('.drag-over').forEach (el => el.classList.remove ('drag-over'));
        if (target && target !== this.draggedElement)
            {
            target.classList.add ('drag-over');
            }
        }
    //-------------------------------------------------------------------------------------------------
    handleDragEnd (e)
        {
        document.querySelectorAll ('.dragging').forEach (el => el.classList.remove ('dragging'));
        document.querySelectorAll ('.drag-over').forEach (el => el.classList.remove ('drag-over'));
        this.draggedElement = null;
        }
    }
