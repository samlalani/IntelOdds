/**
 * @class StorageService
 * A dedicated module for all localStorage interactions. This centralizes
 * storage logic, making it easy to manage, debug, and potentially replace
 * with a different storage mechanism in the future.
 */
export default class StorageService
    {
    constructor ()
        {
        }
    //-------------------------------------------------------------------------------------------------
    // --- Generic Methods ---
    /**
     * Retrieves and parses a JSON item from localStorage.
     * @param {string} key The key of the item to retrieve.
     * @returns {any | null} The parsed object, or null if not found or error.
     */
    //-------------------------------------------------------------------------------------------------
    get (key)
        {
        try
            {
            const item = localStorage.getItem (key);
            return item ? JSON.parse (item) : null;
            }
        catch (e)
            {
            console.error (`Error getting item ${key} from localStorage`, e);
            return null;
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Stringifies and saves an item to localStorage.
     * @param {string} key The key to save the item under.
     * @param {any} value The value to save.
     */
    //-------------------------------------------------------------------------------------------------
    set (key, value)
        {
        try
            {
            localStorage.setItem (key, JSON.stringify (value));
            }
        catch (e)
            {
            console.error (`Error setting item ${key} in localStorage`, e);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Removes an item from localStorage.
     * @param {string} key The key of the item to remove.
     */
    //-------------------------------------------------------------------------------------------------
    remove (key)
        {
        localStorage.removeItem (key);
        }
    //-------------------------------------------------------------------------------------------------
    // --- Specific Application Data Methods ---
    //-------------------------------------------------------------------------------------------------
    loadSettings ()
        {
        return {
            username: localStorage.getItem ('username') || '',
            password: localStorage.getItem ('password') || '',
            columnHeadersOnTop: localStorage.getItem ('columnHeadersOnTop') === 'true',
        };
        }
    //-------------------------------------------------------------------------------------------------
    saveSettings ({ username, password, columnHeadersOnTop })
        {
        if (username !== undefined) localStorage.setItem ('username', username);
        if (password !== undefined) localStorage.setItem ('password', password);
        if (columnHeadersOnTop !== undefined) localStorage.setItem ('columnHeadersOnTop', columnHeadersOnTop);
        }
    //-------------------------------------------------------------------------------------------------
    loadSportsbookOrder ()
        {
        return this.get ('sportsbookOrder') || [];
        }
    //-------------------------------------------------------------------------------------------------
    saveSportsbookOrder (order)
        {
        this.set ('sportsbookOrder', order);
        }
    //-------------------------------------------------------------------------------------------------
    loadGroupOrder ()
        {
        return this.get ('groupOrder') || [];
        }
    //-------------------------------------------------------------------------------------------------
    saveGroupOrder (order)
        {
        this.set ('groupOrder', order);
        }
    //-------------------------------------------------------------------------------------------------
    loadEventOrder ()
        {
        const stored = this.get ('eventOrder');
        return stored ? new Map (stored) : new Map ();
        }
    //-------------------------------------------------------------------------------------------------
    saveEventOrder (orderMap)
        {
        this.set ('eventOrder', Array.from (orderMap.entries ()));
        }
    //-------------------------------------------------------------------------------------------------
    loadHighlightedEvents ()
        {
        const stored = this.get ('highlightedEvents');
        return stored ? new Map (Object.entries (stored)) : new Map ();
        }
    //-------------------------------------------------------------------------------------------------
    saveHighlightedEvents (eventsMap)
        {
        this.set ('highlightedEvents', Object.fromEntries (eventsMap));
        }
    //-------------------------------------------------------------------------------------------------
    loadHighlightedSportsbooks ()
        {
        const stored = this.get ('highlightedSportsbooks');
        return stored ? new Map (Object.entries (stored)) : new Map ();
        }
    //-------------------------------------------------------------------------------------------------
    saveHighlightedSportsbooks (sportsbooksMap)
        {
        this.set ('highlightedSportsbooks', Object.fromEntries (sportsbooksMap));
        }
    //-------------------------------------------------------------------------------------------------
    loadCustomDisplays ()
        {
        return this.get ('customDisplays') || [];
        }
    //-------------------------------------------------------------------------------------------------
    saveCustomDisplays (displays)
        {
        this.set ('customDisplays', displays);
        }
    //-------------------------------------------------------------------------------------------------
    loadNextCustomId ()
        {
        return this.get ('nextCustomId') || 1;
        }
    //-------------------------------------------------------------------------------------------------
    saveNextCustomId (id)
        {
        this.set ('nextCustomId', id);
        }
    //-------------------------------------------------------------------------------------------------
    loadZoomLevel ()
        {
        const level = localStorage.getItem ('zoomLevel');
        return level ? parseFloat (level) : 1.0;
        }
    //-------------------------------------------------------------------------------------------------
    saveZoomLevel (level)
        {
        localStorage.setItem ('zoomLevel', level.toString ());
        }
    //-------------------------------------------------------------------------------------------------
    loadLastSelectedView ()
        {
        return {
            type: localStorage.getItem ('lastViewType'),
            id: localStorage.getItem ('lastViewId'),
            name: localStorage.getItem ('lastViewName')
        };
        }
    //-------------------------------------------------------------------------------------------------
    saveLastSelectedView (type, id, name)
        {
        localStorage.setItem ('lastViewType', type);
        localStorage.setItem ('lastViewId', id);
        localStorage.setItem ('lastViewName', name);
        }
    //-------------------------------------------------------------------------------------------------
    loadOddsFormat ()
        {
        return this.get ('oddsFormat');
        }
    //-------------------------------------------------------------------------------------------------
    saveOddsFormat (format)
        {
        this.set ('oddsFormat', format);
        }
    //-------------------------------------------------------------------------------------------------
    loadSportOrder ()
        {
        return this.get('sportOrder') || [];
        }
    //-------------------------------------------------------------------------------------------------
    saveSportOrder (order)
        {
        this.set('sportOrder', order);
        }
    //-------------------------------------------------------------------------------------------------
    loadSportsVisibility ()
        {
        return this.get('sportsVisibility') || {};
        }
    //-------------------------------------------------------------------------------------------------
    saveSportsVisibility (visibility)
        {
        this.set('sportsVisibility', visibility);
        }
    //-------------------------------------------------------------------------------------------------
    // New methods for type/id structure
    loadItemOrder ()
        {
        return this.get ('itemOrder') || [];
        }
    //-------------------------------------------------------------------------------------------------
    saveItemOrder (order)
        {
        this.set ('itemOrder', order);
        }
    //-------------------------------------------------------------------------------------------------
    loadItemsVisibility ()
        {
        return this.get ('itemsVisibility') || {};
        }
    //-------------------------------------------------------------------------------------------------
    saveItemsVisibility (visibility)
        {
        this.set ('itemsVisibility', visibility);
        }
    //-------------------------------------------------------------------------------------------------
    loadLeagueButtons ()
        {
        return this.get ('leagueButtons') || [];
        }
    //-------------------------------------------------------------------------------------------------
    saveLeagueButtons (leagueButtons)
        {
        this.set ('leagueButtons', leagueButtons);
        }
    //-------------------------------------------------------------------------------------------------
    // Migration methods to convert old format to new format
    migrateSportOrderToItemOrder ()
        {
        const oldSportOrder = this.get ('sportOrder');
        const oldSportsVisibility = this.get ('sportsVisibility');
        
        if (oldSportOrder && oldSportOrder.length > 0)
            {
            // Convert old sport IDs to new type:id format
            const newItemOrder = oldSportOrder.map (sportId =>
                {
                if (sportId === 0)
                    {
                    return 'CUSTOM_DISPLAY:TODAY'; // Convert old TODAY sport to new format
                    }
                else
                    {
                    return `SPORT:${sportId}`;
                    }
                });
            
            // Convert old visibility to new format
            const newItemsVisibility = {};
            if (oldSportsVisibility)
                {
                Object.keys (oldSportsVisibility).forEach (sportId =>
                    {
                    if (sportId === '0')
                        {
                        newItemsVisibility['CUSTOM_DISPLAY:TODAY'] = oldSportsVisibility[sportId];
                        }
                    else
                        {
                        newItemsVisibility[`SPORT:${sportId}`] = oldSportsVisibility[sportId];
                        }
                    });
                }
            
            // Save new format and remove old format
            this.set ('itemOrder', newItemOrder);
            this.set ('itemsVisibility', newItemsVisibility);
            this.remove ('sportOrder');
            this.remove ('sportsVisibility');
            
            console.log ('Migrated sport order and visibility to new type:id format');
            }
        }
    //-------------------------------------------------------------------------------------------------
    loadLeagueOrder ()
        {
        const raw = localStorage.getItem('leagueOrder');
        return this.parseCustomLeagueOrder(raw);
        }
    //-------------------------------------------------------------------------------------------------
    saveLeagueOrder (orderObj)
        {
        const serialized = this.serializeCustomLeagueOrder(orderObj);
        localStorage.setItem('leagueOrder', serialized);
        }
    //-------------------------------------------------------------------------------------------------
    // EXACT CHANGE: Replaced the faulty JSON.parse logic with the original, robust manual parser.
    parseCustomLeagueOrder (str)
        {
        const result = {};
        if (!str || str.length < 5)
            return result;

        str = str.trim();
        if (str.startsWith('[') && str.endsWith(']'))
            str = str.slice(1, -1);

        const sportBlocks = [];
        let braceCount = 0;
        let startIndex = -1;

        for (let i = 0; i < str.length; i++)
            {
            if (str[i] === '{')
                {
                if (braceCount === 0)
                    startIndex = i;
                braceCount++;
                }
            else if (str[i] === '}')
                {
                braceCount--;
                if (braceCount === 0 && startIndex !== -1)
                    {
                    sportBlocks.push(str.substring(startIndex, i + 1));
                    startIndex = -1;
                    }
                }
            }

        sportBlocks.forEach (block =>
            {
            const match = block.match(/\{(\d+),\[(.*?)\]\}/);
            if (match)
                {
                const sportId = parseInt(match[1], 10);
                const leagueDataStr = match[2];

                if (leagueDataStr.includes('{id:'))
                    {
                    const leagueObjects = leagueDataStr.match(/\{id:(\d+),enabled:(true|false)\}/g) || [];
                    result [sportId] = leagueObjects.map (objStr =>
                        {
                        const objMatch = objStr.match(/\{id:(\d+),enabled:(true|false)\}/);
                        return {
                            id: parseInt(objMatch[1], 10),
                            enabled: objMatch[2] === 'true'
                            };
                        });
                    }
                else if (leagueDataStr.trim() !== '')
                    {
                    const leagueIds = leagueDataStr.split(',').map(x => parseInt(x, 10)).filter(x => !isNaN(x));
                    result[sportId] = leagueIds.map(id => ({ id: id, enabled: true }));
                    }
                else
                    {
                    result[sportId] = [];
                    }
                }
            });
        return result;
        }
    //-------------------------------------------------------------------------------------------------
    serializeCustomLeagueOrder (obj)
        {
        const parts = [];
        for (const sportId in obj)
            {
            if (Array.isArray (obj[sportId]))
                {
                const leagueDataStr = obj[sportId].map (league =>
                    `{id:${league.id},enabled:${league.enabled}}`
                ).join (',');
                parts.push (`{${sportId},[${leagueDataStr}]}`);
                }
            }
        return `[${parts.join (',')}]`;
        }
    }
