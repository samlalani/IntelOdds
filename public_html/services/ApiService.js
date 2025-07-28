/**
 * @class ApiService
 * Manages all WebSocket communication with the backend server.
 * This includes connecting, disconnecting, sending messages, and handling
 * incoming data by dispatching events to the main App controller.
 */
export default class ApiService
    {
    //-------------------------------------------------------------------------------------------------
    /**
     * @param {Function} eventHandler - A callback function in the main App controller to handle dispatched events.
     */
    //-------------------------------------------------------------------------------------------------
    constructor (eventHandler)
        {
        this.wsUrl = "ws://localhost:60001";
        this.socket = null;
        this.clientKeepAliveInterval = null;
        this.eventHandler = eventHandler; // The App's handler function

        // DOM elements for status updates
        this.connectionStatusDiv = document.getElementById ('connection-status');
        this.generalErrorDiv = document.getElementById ('general-error');
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Checks if the WebSocket is currently connected.
     * @returns {boolean}
     */
    //-------------------------------------------------------------------------------------------------
    isConnected ()
        {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Establishes a WebSocket connection and authenticates the user.
     * @param {string} username - The user's username.
     * @param {string} password - The user's password.
     */
    //-------------------------------------------------------------------------------------------------
    connect (username, password)
        {
        if (!username || !password)
            {
            this.showStatus ("Username and password are required.", true);
            return;
            }

        this.clearStatus ();
        this.showStatus ("Connecting to server...");

        this.socket = new WebSocket (this.wsUrl);

        this.socket.onopen = () =>
            {
            this.showStatus ("Connected. Sending credentials...");
            this.socket.send (username + '\n');
            this.socket.send (password + '\n');

            this.startKeepAlive ();
            this.eventHandler ('open');
            };

        this.socket.onmessage = (event) => this.handleMessage (event);
        this.socket.onerror = (event) => this.handleError (event);
        this.socket.onclose = (event) => this.handleClose (event);
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Closes the WebSocket connection gracefully.
     */
    //-------------------------------------------------------------------------------------------------
    disconnect ()
        {
        if (this.isConnected ())
            {
            this.showStatus ("Sending EXIT to server...");
            this.send ("EXIT");
            this.socket.close ();
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Sends a message to the WebSocket server.
     * @param {object|string} command - The command to send. If an object, it's stringified.
     */
    //-------------------------------------------------------------------------------------------------
    send (command)
        {
        if (this.isConnected ())
            {
            const message = typeof command === 'object' ? JSON.stringify (command) : command;
            this.socket.send (message + '\n');
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles incoming WebSocket messages, parses them, and dispatches them.
     * @param {MessageEvent} event - The WebSocket message event.
     */
    //-------------------------------------------------------------------------------------------------
    handleMessage (event)
        {
        if (event.data.trim () === "*")
            {
            // console.log ("Keep-alive received");
            return;
            }

        try
            {
            const data = JSON.parse (event.data);
            // The 'type' property is crucial for identifying the message content.
            if (data.type)
                {
                this.eventHandler (data.type, data);
                this.showStatus (`${data.type} data received.`);
                }
            else
                {
                // Handle legacy format or unknown messages
                console.warn ("Unknown message format received:", data);
                }
            }
        catch (e)
            {
            console.error ("Error processing message:", event.data, e);
            this.showStatus ("Error processing message: " + e.message, true);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles WebSocket connection errors.
     * @param {Event} event - The WebSocket error event.
     */
    //-------------------------------------------------------------------------------------------------
    handleError (event)
        {
        console.error ("WebSocket error observed:", event);
        this.showStatus ("Connection error. Check console for details.", true);
        this.eventHandler ('error');
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Handles the closing of the WebSocket connection.
     * @param {CloseEvent} event - The WebSocket close event.
     */
    //-------------------------------------------------------------------------------------------------
    handleClose (event)
        {
        this.showStatus (`Disconnected: ${event.reason || 'Connection closed'} (Code: ${event.code})`, !event.wasClean);
        this.stopKeepAlive ();
        this.eventHandler ('close');
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Starts the periodic keep-alive message to the server.
     */
    //-------------------------------------------------------------------------------------------------
    startKeepAlive ()
        {
        this.stopKeepAlive (); // Ensure no multiple intervals are running
        this.clientKeepAliveInterval = setInterval (() =>
            {
            if (this.isConnected ())
                {
                this.socket.send ("*\n");
                }
            }, 30000);
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Stops the keep-alive interval.
     */
    //-------------------------------------------------------------------------------------------------
    stopKeepAlive ()
        {
        if (this.clientKeepAliveInterval)
            {
            clearInterval (this.clientKeepAliveInterval);
            this.clientKeepAliveInterval = null;
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Displays a status or error message in the UI.
     * @param {string} message - The message to display.
     * @param {boolean} [isError=false] - True if the message is an error.
     */
    //-------------------------------------------------------------------------------------------------
    showStatus (message, isError = false)
        {
        const targetDiv = isError ? this.generalErrorDiv : this.connectionStatusDiv;
        const otherDiv = isError ? this.connectionStatusDiv : this.generalErrorDiv;

        targetDiv.textContent = message;
        targetDiv.classList.remove ('hidden');
        otherDiv.classList.add ('hidden');
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Clears any visible status or error messages.
     */
    //-------------------------------------------------------------------------------------------------
    clearStatus ()
        {
        this.connectionStatusDiv.classList.add ('hidden');
        this.generalErrorDiv.classList.add ('hidden');
        this.connectionStatusDiv.textContent = '';
        this.generalErrorDiv.textContent = '';
        }
    }
