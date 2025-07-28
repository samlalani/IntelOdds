/**
 * @class ZoomControl
 * A self-contained class to handle the page's zoom functionality.
 */
export default class ZoomControl
    {
    constructor (storageService)
        {
        this.storageService = storageService;
        this.dom = {
            zoomInBtn: document.getElementById ('zoom-in'),
            zoomOutBtn: document.getElementById ('zoom-out'),
            zoomPercentage: document.getElementById ('zoom-percentage'),
            };

        this.MIN_ZOOM = 0.5;
        this.MAX_ZOOM = 2.0;
        this.ZOOM_STEP = 0.1;
        this.currentZoomFactor = 1.0;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Initializes zoom controls, loads saved level, and applies it.
     */
    //-------------------------------------------------------------------------------------------------
    init ()
        {
        this.currentZoomFactor = this.storageService.loadZoomLevel ();
        this.bindEventListeners ();
        this.updateZoomDisplay ();
        this.applyZoom ();
        this.updateZoomButtons ();
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Binds click listeners to the zoom buttons.
     */
    //-------------------------------------------------------------------------------------------------
    bindEventListeners ()
        {
        this.dom.zoomInBtn.addEventListener ('click', () => this.zoomIn ());
        this.dom.zoomOutBtn.addEventListener ('click', () => this.zoomOut ());
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Increases the zoom level.
     */
    //-------------------------------------------------------------------------------------------------
    zoomIn ()
        {
        if (this.currentZoomFactor < this.MAX_ZOOM)
            {
            this.currentZoomFactor = Math.min (this.MAX_ZOOM, this.currentZoomFactor + this.ZOOM_STEP);
            this.updateAndSave ();
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Decreases the zoom level.
     */
    //-------------------------------------------------------------------------------------------------
    zoomOut ()
        {
        if (this.currentZoomFactor > this.MIN_ZOOM)
            {
            this.currentZoomFactor = Math.max (this.MIN_ZOOM, this.currentZoomFactor - this.ZOOM_STEP);
            this.updateAndSave ();
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * A helper to update the UI, apply the zoom, and save the state.
     */
    //-------------------------------------------------------------------------------------------------
    updateAndSave ()
        {
        this.updateZoomDisplay ();
        this.applyZoom ();
        this.updateZoomButtons ();
        this.storageService.saveZoomLevel (this.currentZoomFactor);
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Updates the zoom percentage text in the UI.
     */
    //-------------------------------------------------------------------------------------------------
    updateZoomDisplay ()
        {
        this.dom.zoomPercentage.textContent = `${Math.round (this.currentZoomFactor * 100)}%`;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Applies the current zoom factor as a CSS variable to the root element.
     */
    //-------------------------------------------------------------------------------------------------
    applyZoom ()
        {
        document.documentElement.style.setProperty ('--zoom-factor', this.currentZoomFactor.toString ());
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Enables or disables the zoom buttons based on the current zoom level.
     */
    //-------------------------------------------------------------------------------------------------
    updateZoomButtons ()
        {
        this.dom.zoomInBtn.disabled = this.currentZoomFactor >= this.MAX_ZOOM;
        this.dom.zoomOutBtn.disabled = this.currentZoomFactor <= this.MIN_ZOOM;
        }
    }
