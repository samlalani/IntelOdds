/**
 * @class TableView
 * Manages the rendering and updating of the main odds table in the DOM.
 * It handles full redraws, as well as partial, performant updates for
 * scores and odds.
 */
export default class TableView
    {
    constructor (state, highlightManager, storageService, leagueOrderModal)
        {
        this.state = state;
        this.highlightManager = highlightManager;
        this.storageService = storageService;
        this.leagueOrderModal = leagueOrderModal; // Store the reference
        this.dom =
            {
            tableTarget: document.getElementById ('odds-table-target'),
            columnHeadersCheckbox: document.getElementById ('column-headers-checkbox'),
            };

        this.oddsTimers  = new Map (); // Store timers for odds value highlighting
        this.scoreTimers = new Map(); // Store timers for score value highlighting

        // Time constants for highlighting
        this.TWO_MINUTES  =  2 * 60 * 1000;
        this.FIVE_MINUTES =  5 * 60 * 1000;
        this.TEN_MINUTES  = 10 * 60 * 1000;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Clears the table content.
     */
    //-------------------------------------------------------------------------------------------------
    clear ()
        {
        this.dom.tableTarget.innerHTML = '';
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Redraws the entire table structure and then updates it with the latest lines data.
     */
    //-------------------------------------------------------------------------------------------------
    redrawTableAndLines ()
        {
        this.generateOddsTable ();
        if (this.state.fullLinesRawData && this.state.fullLinesRawData.length > 0)
            {
            this.updateOddsFromLinesRaw (this.state.fullLinesRawData);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Generates the full HTML for the odds table and inserts it into the DOM.
     */
    //-------------------------------------------------------------------------------------------------
    generateOddsTable ()
        {
        try
            {
            const groups = this.state.currentData;
            if (!groups || groups.length === 0)
                {
                this.dom.tableTarget.innerHTML = "<p class='text-center text-gray-500'>No game data available.</p>";
                return;
                }

            // EXACT CHANGE: Replaced simple sort with the complex, original sorting logic.
            let sortedGroups;
            const leagueOrderObj = this.storageService.loadLeagueOrder();

            if (this.state.currentViewType === 'SPORT' || this.state.currentViewType === 'CUSTOM_DISPLAY')
                {
                let sportLeagueOrder = [];
                if (this.state.currentViewType === 'SPORT')
                    {
                    sportLeagueOrder = leagueOrderObj[this.state.currentViewId] || [];
                    }
                else // CUSTOM_DISPLAY
                    {
                    // EXACT CHANGE: Use this.leagueOrderModal instead of this.app.leagueOrderModal
                    const customDisplay = this.leagueOrderModal.customDisplays.find (d => d.id === this.state.currentViewId);
                    if (customDisplay && customDisplay.leagues)
                        sportLeagueOrder = customDisplay.leagues.map(id => ({ id, enabled: true }));
                    }
                
                const isToday = this.state.currentViewId == 0;
                const orderByDate = document.getElementById ('order-by-date-checkbox')?.checked ?? true;

                if (isToday || !orderByDate)
                    {
                    const orderedGroups = [];
                    sportLeagueOrder.forEach (leagueData =>
                        {
                        const leagueId = leagueData.id;
                        const enabled = leagueData.enabled;
                        if (!enabled) return;

                        const matchingGroups = groups.filter (group => group.league_id === leagueId);
                        if (matchingGroups.length > 0)
                            orderedGroups.push (...matchingGroups);
                        });
                    
                    const remainingGroups = groups.filter(group => !orderedGroups.includes(group));
                    sortedGroups = [...orderedGroups, ...remainingGroups];
                    }
                else // Sort by date first, then league order
                    {
                    sortedGroups = [...groups].sort((a, b) =>
                        {
                        const dateA = a['group-date'] || a['category-date'] || '';
                        const dateB = b['group-date'] || b['category-date'] || '';
                        const dateComparison = dateA.localeCompare(dateB);
                        if (dateComparison !== 0) return dateComparison;

                        const leagueAIndex = sportLeagueOrder.findIndex(l => l.id === a.league_id);
                        const leagueBIndex = sportLeagueOrder.findIndex(l => l.id === b.league_id);

                        if (leagueAIndex !== -1 && leagueBIndex !== -1) return leagueAIndex - leagueBIndex;
                        if (leagueAIndex !== -1) return -1;
                        if (leagueBIndex !== -1) return 1;
                        return a.league_id - b.league_id;
                        });
                    }
                }
            else // Default group sorting
                {
                sortedGroups = [...groups].sort ((a, b) =>
                    {
                    const indexA = this.state.groupOrder.indexOf (a.category_id);
                    const indexB = this.state.groupOrder.indexOf (b.category_id);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                    });
                }

            let fullHtml = '';
            const columnHeadersOnTop = this.dom.columnHeadersCheckbox.checked;

            if (columnHeadersOnTop)
                {
                fullHtml += this.generateHeaderRow (true);
                fullHtml += '<div class="sticky-spacer"></div>';
                }

            sortedGroups.forEach (group =>
                {
                fullHtml += `<h1 class="text-2xl font-bold text-gray-800 cursor-move" data-group="${group.category_id}">${group.header}</h1>`;
                fullHtml += '<div class="table-container">';
                let tableHtml = '<table>';

                if (!columnHeadersOnTop)
                    tableHtml += this.generateHeaderRow (false);

                tableHtml += '<tbody class="bg-white divide-y divide-gray-200">';

                // Sort events within the group
                const groupEventOrder = this.state.eventOrder.get (group.category_id) || [];
                const sortedEvents = [...group.events].sort ((a, b) =>
                    {
                    const indexA = groupEventOrder.indexOf (a.event_id);
                    const indexB = groupEventOrder.indexOf (b.event_id);
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                    });

                sortedEvents.forEach (game =>
                    {
                    let scoreData = this.state.scoresByEventId[game.event_id];
                    if (scoreData)
                        {
                        game.awayScore = scoreData.awayScore;
                        game.homeScore = scoreData.homeScore;
                        game.status1 = scoreData.status1;
                        game.status2 = scoreData.status2;
                        game.away_addendum = scoreData.away_addendum;
                        game.home_addendum = scoreData.home_addendum;
                        }
                    tableHtml += this.generateEventRow (game, group);
                    });

                tableHtml += '</tbody></table>';
                fullHtml += tableHtml;
                fullHtml += '</div>';
                });

            this.dom.tableTarget.innerHTML = fullHtml;
            this.dom.tableTarget.classList.toggle ('sticky-columns-on-top', columnHeadersOnTop);

            this.highlightManager.applyAllHighlights ();
            }
        catch (e)
            {
            console.error ("Error generating table:", e);
            this.dom.tableTarget.innerHTML = `<p class="text-red-500 text-center">Error processing game data: ${e.message}</p>`;
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Generates the HTML for the table header row (thead).
     * @param {boolean} isSticky - If true, wraps the header in a sticky container.
     * @returns {string} The HTML string for the header.
     */
    //-------------------------------------------------------------------------------------------------
    generateHeaderRow (isSticky)
        {
        let headerHtml = '';
        const baseHeaders = ["Time", "ROT", "Matchup", "SCORES"];
        const headers = [...baseHeaders, ...this.state.sportsbookOrder];

        let headerRowContent = '<tr>';
        headers.forEach (headerText =>
            {
            const isSportsbook = !baseHeaders.includes (headerText);
            const className = `px-1 py-1 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isSportsbook ? 'cursor-move' : ''}`;
            const dataAttr = isSportsbook ? `data-sportsbook="${headerText}"` : '';
            const displayText = this.state.sportsbookIdToAbbr[headerText] || headerText;
            headerRowContent += `<th scope="col" class="${className}" ${dataAttr}>${displayText}</th>`;
            });
        headerRowContent += '</tr>';

        if (isSticky)
            headerHtml = `<div class="table-container sticky-header"><table><thead class="bg-gray-100">${headerRowContent}</thead></table></div>`;
        else
            headerHtml = `<thead class="bg-gray-100">${headerRowContent}</thead>`;

        return headerHtml;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Generates the HTML for a single event row (tr).
     * @param {object} game - The event data object.
     * @param {object} group - The group data object the event belongs to.
     * @returns {string} The HTML string for the event row.
     */
    //-------------------------------------------------------------------------------------------------
    generateEventRow (game, group)
        {
        const isCancelledOrPostponed = (game.status0 === 'Cancelled' || game.status0 === 'Postponed' || game.status2 === 'Cancelled' || game.status2 === 'Postponed');
        const isFinal  = (game.status2 === 'Final');
        const isActive = !isCancelledOrPostponed
                      && !isFinal
                      && (   (game.awayScore && String (game.awayScore).trim() !== '')
                          || (game.homeScore && String (game.homeScore).trim() !== '')
                          || (game.status0   && String (game.status0)  .trim() !== '')
                          || (game.status1   && String (game.status1)  .trim() !== '')
                          || (game.status2   && String (game.status2)  .trim() !== '')
                          );
        let rowClass = '';
        if (isCancelledOrPostponed || isFinal)
            rowClass = 'score-final';
        else if (isActive)
            rowClass = 'score-active';

        // Use the new helper method to determine the winner
        const { awayWinner, homeWinner } = this._determineWinner (game);

        let rowHtml = `<tr class="${rowClass}" data-rotation="${game.rotation_number}" data-date="${game.date}" data-group="${group.category_id}" data-event-id="${game.event_id}">`;

        // Time Column
        rowHtml += `<td class="px-1 py-1 text-sm text-gray-700 time-column">
            <div class="time-display">
                <div class="time-row">${game.time}</div>
                <div class="time-icons">
                    <span class="time-icon injury-icon red-cross" onclick="handleInjuryClick('${game.event_id}')" title="Injuries"></span>
                    <span class="time-icon weather-icon" onclick="handleWeatherClick('${game.event_id}')" title="Weather">☁️</span>
                    <span class="time-icon tv-icon" onclick="handleTVClick('${game.event_id}')" title="TV">📺</span>
                    <span class="time-icon location-icon" onclick="handleLocationClick('${game.event_id}')" title="Location">📍</span>
                </div>
            </div>
        </td>`;

        // ROT Column
        rowHtml += `<td class="px-1 py-1 text-sm text-gray-700">
            <div class="rotation-numbers">
                <span>${game.rotation_number}</span>
                <span>${parseInt (game.rotation_number) + 1}</span>
            </div>
        </td>`;

        // EXACT CHANGE: Added winner class logic to team names.
        rowHtml += `<td class="px-1 py-1 text-sm text-gray-900 matchup-cell" onclick="handleTeamNameClick('${game.event_id}', '${game.date || ''}')" style="cursor: pointer;">
            <div>
                <span class="team-name font-medium">${
                        game.awayPitcher
                        ? `<div class="team-info-container">
                            <div class="team-abbr${awayWinner ? ' winner' : ''}">${game.awayAbbr}</div>
                            <div class="pitcher-name">${game.awayPitcher}${game.awayPitcherLeftHanded === "1" ? ' (L)' : ""}</div>
                           </div>`
                        : (game.awayTeam ? `<span class="${awayWinner ? ' winner' : ''}">${game.awayTeam}</span>` : "&nbsp;")
                        }</span>
                <span class="team-name">${
                        game.homePitcher
                        ? `<div class="team-info-container">
                            <div class="team-abbr${homeWinner ? ' winner' : ''}">${game.homeAbbr}</div>
                            <div class="pitcher-name">${game.homePitcher}${game.homePitcherLeftHanded === "1" ? ' (L)' : ""}</div>
                           </div>`
                        : (game.homeTeam ? `<span class="${homeWinner ? ' winner' : ''}">${game.homeTeam}</span>` : "&nbsp;")
                        }</span>
            </div>
        </td>`;

        let scoreHtml = '';
        if (isCancelledOrPostponed)
            {
            scoreHtml = `<td class="score-cell" colspan="1" style="text-align:center;vertical-align:middle;"><div style="display:flex;align-items:center;justify-content:center;height:100%;font-weight:bold;">${game.status0 || '&nbsp;'}</div></td>`;
            }
        else if (group.sport_id === 8) // Tennis
            {
            let awaySets = (game.away_addendum || '').split(',');
            let homeSets = (game.home_addendum || '').split(',');
            scoreHtml = '<td class="score-cell">' +
                '<div class="tennis-sets-container">';
            for (let i = 0; i < 5; i++)
                {
                let away_val = awaySets[i] ? awaySets[i].trim() : '';
                let home_val = homeSets[i] ? homeSets[i].trim() : '';
                scoreHtml += `<div class="tennis-set" id="${game.event_id}-0-${i+1}">${this.formatTennisScore(away_val, home_val) || "&nbsp;"}</div>`;
                }
            scoreHtml += '</div><div class="tennis-sets-container">';
            for (let i = 0; i < 5; i++)
                {
                let away_val = awaySets[i] ? awaySets[i].trim() : '';
                let home_val = homeSets[i] ? homeSets[i].trim() : '';
                scoreHtml += `<div class="tennis-set" id="${game.event_id}-1-${i+1}">${this.formatTennisScore(home_val, away_val) || "&nbsp;"}</div>`;
                }
            scoreHtml += '</div></td>';
            }
        else
            {
            const awayScore = game.awayScore === "null" ? "&nbsp;" : game.awayScore;
            const homeScore = game.homeScore === "null" ? "&nbsp;" : game.homeScore;
            const hasWinner = ((awayScore === 'Winner' || (awayScore && awayScore.includes('WIN')) || game.status1 === 'Winner') || (homeScore === 'Winner' || (homeScore && homeScore.includes('WIN')) || game.status2 === 'Winner'));
            if (hasWinner)
                {
                const awayWinnerText = (awayScore === 'Winner' || (typeof awayScore === 'string' && awayScore.includes('WIN')) || game.status1 === 'Winner');
                const homeWinnerText = (homeScore === 'Winner' || (typeof homeScore === 'string' && homeScore.includes('WIN')) || game.status2 === 'Winner');
                scoreHtml = `<td class="score-cell">
                    <div class="score-container">
                        <div class="scores-column" style="width: 100%;">
                            <div class="score-value${awayWinnerText ? ' winner-text' : ''}" id="${game.event_id}-1">${awayWinnerText ? 'Winner' : '&nbsp;'}</div>
                            <div class="score-value${homeWinnerText ? ' winner-text' : ''}" id="${game.event_id}-2">${homeWinnerText ? 'Winner' : '&nbsp;'}</div>
                        </div>
                    </div>
                </td>`;
                }
            else
                {
                // EXACT CHANGE: Added strong tags for winning scores.
                const awayScoreDisplay = awayWinner ? `<strong>${game.awayScore}</strong>` : game.awayScore;
                const homeScoreDisplay = homeWinner ? `<strong>${game.homeScore}</strong>` : game.homeScore;
                scoreHtml = `<td class="score-cell">
                    <div class="score-container">
                        <div class="scores-column">
                            <div class="score-value" id="${game.event_id}-1">${awayScoreDisplay || "&nbsp;"}</div>
                            <div class="score-value" id="${game.event_id}-2">${homeScoreDisplay || "&nbsp;"}</div>
                        </div>
                        <div class="status-column">
                            <div class="score-value" id="${game.event_id}-3">${game.status1 || "&nbsp;"}</div>
                            <div class="score-value" id="${game.event_id}-4">${game.status2 || "&nbsp;"}</div>
                        </div>
                    </div>
                </td>`;
                }
            }
        rowHtml += scoreHtml;

        // Odds Columns
        this.state.sportsbookOrder.forEach (sbId =>
            {
            const awayId = `${game.event_id}-0-${sbId}-${this.state.selectedPeriodId}-${this.state.selectedDisplayType}`;
            const homeId = `${game.event_id}-1-${sbId}-${this.state.selectedPeriodId}-${this.state.selectedDisplayType}`;
            rowHtml += `<td class="px-1 py-1 text-sm text-gray-600 odds-cell" data-sportsbook="${sbId}">
                <div class="sportsbook-container">
                    <span class="odds-value" id="${awayId}">-</span>
                    <span class="odds-value" id="${homeId}">-</span>
                </div>
            </td>`;
            });

        rowHtml += '</tr>';
        return rowHtml;
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Updates odds values in the table from a raw data feed.
     * @param {Array} linesRawData - An array of line data objects.
     */
    //-------------------------------------------------------------------------------------------------
    updateOddsFromLinesRaw (linesRawData)
        {
        if (!Array.isArray (linesRawData) || linesRawData.length === 0) return;

        const processChunk = (index) =>
            {
            const chunkSize = 200;
            const endIndex = Math.min (index + chunkSize, linesRawData.length);

            for (let i = index; i < endIndex; i++)
                {
                const line = linesRawData[i];
                if (line && line.id)
                    {
                    const el = document.getElementById (line.id);
                    if (el)
                        {
                        const displayValue = (line.value !== undefined && String(line.value).trim().length > 0) ? line.value : '-';
                        el.textContent = displayValue;
//if (line.id === '7219402-1-26-0-0')
//    console.log ('debug');
                        // EXACT CHANGE: Only apply highlight if the value is not a placeholder dash.
                        if (displayValue !== '-')
                            this.setupHighlightTimer (el, line.seconds || 0, this.oddsTimers);
                        else
                            {
                            // If it IS a dash, explicitly remove any existing highlight classes.
                            el.classList.remove('odds-recent', 'odds-medium', 'odds-old');
                            }
                        }
                    }
                }

            if (endIndex < linesRawData.length)
                setTimeout (() => processChunk (endIndex), 0);
            };

        processChunk (0);
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Applies a full list of scores from a data feed to the UI.
     * @param {object} scoresData - The scores data object.
     */
    //-------------------------------------------------------------------------------------------------
    updateScoresData (scoresData)
        {
        try
            {
            if (scoresData.data && Array.isArray (scoresData.data))
                {
                const now = Date.now();
                scoresData.data.forEach (scoreObj =>
                    {
                    const eventId = scoreObj.event_id;
                    if (!eventId) return;

                    // Find and update the event in the central state
                    let foundEvent = null;
                    for (const group of this.state.currentData || [])
                        {
                        if (!group.events) continue;
                        foundEvent = group.events.find(e => e.event_id === eventId);
                        if (foundEvent)
                            {
                            // Update the in-memory data model
                            Object.assign (foundEvent,
                                {
                                awayScore    : scoreObj.away_score,
                                homeScore    : scoreObj.home_score,
                                status0      : scoreObj.status0,
                                status1      : scoreObj.status1,
                                status2      : scoreObj.status2,
                                away_addendum: scoreObj.away_addendum,
                                home_addendum: scoreObj.home_addendum
                                });
                            break;
                            }
                        }
                    
                    // Update the UI
                    this.updateScoreInUI (eventId, scoreObj, now);
                    });
                }
            }
        catch (e)
            {
            console.error ("Error updating scores data:", e);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Applies incremental line changes from a data feed to the UI.
     * @param {object} linesData - The lines data object with a 'changes' array.
     */
    //-------------------------------------------------------------------------------------------------
    applyLinesChanges (linesData)
        {
        try
            {
            if (linesData.data && Array.isArray(linesData.data))
                {
                linesData.data.forEach(line =>
                    {
                    if (line && line.id)
                        {
                        const el = document.getElementById(line.id);
                        if (el)
                            {
                            const displayValue = (line.value !== undefined && String(line.value).trim().length > 0) ? line.value : '-';
                            el.textContent = displayValue;

                            if (displayValue !== '-')
                                this.setupHighlightTimer (el, line.seconds || 0, this.oddsTimers);
                            else
                                el.classList.remove ('odds-recent', 'odds-medium', 'odds-old');
                            }
                        }
                    });
                }
            }
        catch (e)
            {
            console.error("Error applying lines changes:", e);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Applies score changes from a data feed to the UI.
     * @param {object} scoresData - The scores data object.
     */
    //-------------------------------------------------------------------------------------------------
    applyScoresChanges(scoresData)
        {
        try
            {
            if (scoresData.changes && Array.isArray(scoresData.changes))
                {
                const now = Date.now();
                scoresData.changes.forEach(change =>
                    {
                    const eventId = change.event_id;
                    const scoreObj = change.data;
                    if (!eventId || !scoreObj) return;

                    this.updateScoreInUI(eventId, scoreObj, now);
                    });
                }
            }
        catch (e)
            {
            console.error("Error applying scores changes:", e);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Updates a single score display in the UI.
     * @param {string} eventId - The ID of the event.
     * @param {object} scoreObj - The score data object.
     * @param {number} now - The current timestamp.
     */
    //-------------------------------------------------------------------------------------------------
    updateScoreInUI (eventId, scoreObj, now)
        {
        try
            {
            // Find the primary element to determine if it's a regular or tennis score
            let primaryCell = document.getElementById(`${eventId}-1`) || document.getElementById(`${eventId}-0-1`);
            if (!primaryCell) return;

            const row = primaryCell.closest('tr');
            const scoreCell = primaryCell.closest('td.score-cell');
            if (!row || !scoreCell) return;

            const isCancelledOrPostponed = (scoreObj.status0 === 'Cancelled' || scoreObj.status0 === 'Postponed' || scoreObj.status2 === 'Cancelled' || scoreObj.status2 === 'Postponed');
            
            if (isCancelledOrPostponed)
                {
                scoreCell.classList.add ('cancelled-or-postponed');
                scoreCell.innerHTML = `<div>${scoreObj.status0 || scoreObj.status2 || '&nbsp;'}</div>`;
                row.classList.remove ('score-active');
                row.classList.add ('score-final');
                return;
                }
            
            // If it was previously cancelled, we need to restore the score container structure
            if (scoreCell.classList.contains ('cancelled-or-postponed'))
                {
                scoreCell.classList.remove ('cancelled-or-postponed');
                // This would require rebuilding based on sport type (regular vs tennis),
                // for simplicity, we trigger a full redraw in this edge case.
                this.redrawTableAndLines ();
                return;
                }
//if (eventId === 7218024)
//    console.log ('debug');
            // EXACT CHANGE: Added winner determination and styling for live updates.
            const { awayWinner, homeWinner } = this._determineWinner (scoreObj);
            const awayScore = scoreObj.awayScore || scoreObj.away_score;
            const homeScore = scoreObj.homeScore || scoreObj.home_score;
            const hasWinnerText = (awayScore === 'Winner' || (typeof awayScore === 'string' && awayScore.includes('WIN')) || homeScore === 'Winner' || (typeof homeScore === 'string' && homeScore.includes('WIN')));

            // EXACT CHANGE: Added the special handling for text-based winners to the live update function.
            if (hasWinnerText)
                {
                const awayWinnerText = (awayScore === 'Winner' || (typeof awayScore === 'string' && awayScore.includes('WIN')) || scoreObj.status1 === 'Winner');
                const homeWinnerText = (homeScore === 'Winner' || (typeof homeScore === 'string' && homeScore.includes('WIN')) || scoreObj.status2 === 'Winner');
                scoreCell.innerHTML = `<div class="score-container">
                    <div class="scores-column" style="width: 100%;">
                        <div class="score-value${awayWinnerText ? ' winner-text' : ''}" id="${eventId}-1">${awayWinnerText ? 'Winner' : '&nbsp;'}</div>
                        <div class="score-value${homeWinnerText ? ' winner-text' : ''}" id="${eventId}-2">${homeWinnerText ? 'Winner' : '&nbsp;'}</div>
                    </div>
                </div>`;
                }
            // Handle Tennis Scores
            else if (document.getElementById(`${eventId}-0-1`))
                {
                let awaySets = (scoreObj.away_addendum || '').split(',');
                let homeSets = (scoreObj.home_addendum || '').split(',');
                for (let i = 0; i < 5; i++)
                    {
                    this.updateScoreDiv (document.getElementById(`${eventId}-0-${i+1}`), this.formatTennisScore(awaySets[i] ? awaySets[i].trim() : '', homeSets[i] ? homeSets[i].trim() : ''), scoreObj.status0_timestamp, now);
                    this.updateScoreDiv (document.getElementById(`${eventId}-1-${i+1}`), this.formatTennisScore(homeSets[i] ? homeSets[i].trim() : '', awaySets[i] ? awaySets[i].trim() : ''), scoreObj.status0_timestamp, now);
                    }
                }
            // Handle Regular Scores
            else
                {
                const awayScoreDisplay = awayWinner ? `<strong>${scoreObj.away_score}</strong>` : scoreObj.away_score;
                const homeScoreDisplay = homeWinner ? `<strong>${scoreObj.home_score}</strong>` : scoreObj.home_score;

                this.updateScoreDiv (document.getElementById(`${eventId}-1`), awayScoreDisplay, scoreObj.away_score_timestamp, now);
                this.updateScoreDiv (document.getElementById(`${eventId}-2`), homeScoreDisplay, scoreObj.home_score_timestamp, now);
                this.updateScoreDiv (document.getElementById(`${eventId}-3`), scoreObj.status1, scoreObj.status1_timestamp, now);
                this.updateScoreDiv (document.getElementById(`${eventId}-4`), scoreObj.status2, scoreObj.status2_timestamp, now);
                }

            // Consolidated winner name highlighting
            const awayPlayerName = row.querySelector('.team-name:first-child');
            const homePlayerName = row.querySelector('.team-name:last-child');
            if (awayPlayerName)
                awayPlayerName.classList.toggle ('winner', awayWinner);
            if (homePlayerName)
                homePlayerName.classList.toggle ('winner', homeWinner);

            // Update row styling
            const isFinal = (scoreObj.status2 === 'Final');
            const isActive = !isFinal && ((scoreObj.away_score && String(scoreObj.away_score).trim() !== '') || (scoreObj.home_score && String(scoreObj.home_score).trim() !== '') || (scoreObj.status1 && String(scoreObj.status1).trim() !== ''));
            row.classList.remove ('score-active', 'score-final');
            if (isFinal)
                row.classList.add ('score-final');
            else if (isActive)
                row.classList.add ('score-active');
            }
        catch (e)
            {
            console.error("Error in updateScoreInUI:", e);
            }
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Updates a single score div element with a new value and sets up highlight timers.
     */
    //-------------------------------------------------------------------------------------------------
    updateScoreDiv (element, value, timestamp, now)
        {
        if (!element)
            return;
        element.innerHTML = value || '&nbsp;';
        if (timestamp)
            this.setupHighlightTimer (element, parseInt (timestamp, 10), this.scoreTimers);
        }
    //-------------------------------------------------------------------------------------------------
    /**
     * Sets up timers to change the background color of an element over time.
     * @param {HTMLElement} cell - The DOM element to highlight.
     * @param {number} ageInMs - The age of the data in milliseconds.
     * @param {Map} timerMap - The map to store timers in (oddsTimers or scoreTimers).
     */
    //-------------------------------------------------------------------------------------------------
    setupHighlightTimer (cell, age, timerMap)
        {
        const timerId = cell.id;
        if (!timerId)
            return;

        const currentTime = Date.now ();
        const ageInMs     = currentTime - (age * 1000);

        const addTimer = (secondsLevel, ageInMs, style) =>
            {
            cell.classList.add (style);
            const delay = secondsLevel - ageInMs;
            const timer = setTimeout (() =>
                {
                this.setupHighlightTimer (cell, age, timerMap);
                }, delay);
            // Store the timer
            if (timerMap.has (timerId))
                timerMap.get (timerId).push (timer);
            else
                timerMap.set (timerId, [timer]);
            };

        cell.classList.remove ('odds-recent', 'odds-medium', 'odds-old');

        if (ageInMs < this.TWO_MINUTES)
            addTimer (this.TWO_MINUTES, ageInMs, 'odds-recent');

        else if (ageInMs < this.FIVE_MINUTES)
            addTimer (this.FIVE_MINUTES, ageInMs, 'odds-medium');

        else if (ageInMs < this.TEN_MINUTES)
            addTimer (this.TEN_MINUTES, ageInMs, 'odds-old');

        else
            this.clearOddsTimers (timerId);
        }
    //-------------------------------------------------------------------------------------------------
    _determineWinner (game)
        {
        let awayWinner = false;
        let homeWinner = false;

        const awayScore = game.awayScore || game.away_score;
        const homeScore = game.homeScore || game.home_score;

        // Check for explicit "Winner" or "WIN" text first, as this is definitive.
        if (awayScore === 'Winner' || (typeof awayScore === 'string' && awayScore.includes('WIN')) || game.status1 === 'Winner')
            awayWinner = true;

        if (homeScore === 'Winner' || (typeof homeScore === 'string' && homeScore.includes('WIN')) || game.status2 === 'Winner')
            homeWinner = true;

        if (awayWinner || homeWinner)
            return { awayWinner, homeWinner };

        if (game.status2 === 'Final')
            {
            const awayScoreNum = parseInt (game.awayScore || game.away_score, 10);
            const homeScoreNum = parseInt (game.homeScore || game.home_score, 10);

            if (!isNaN (awayScoreNum) && !isNaN (homeScoreNum))
                {
                if (awayScoreNum > homeScoreNum)
                    awayWinner = true;
                if (homeScoreNum > awayScoreNum)
                    homeWinner = true;
                }

            if (!awayWinner && !homeWinner && game.away_addendum && game.home_addendum)
                {
                const awaySets = (game.away_addendum || '').split(',');
                const homeSets = (game.home_addendum || '').split(',');

                for (let i = awaySets.length - 1; i >= 0; i--)
                    {
                    const awaySetScore = parseInt (awaySets [i], 10);
                    const homeSetScore = parseInt (homeSets [i], 10);

                    if (awaySets [i] === 'Winner')
                        {
                        awayWinner = true;
                        break;
                        }
                    if (homeSets [i] === 'Winner')
                        {
                        homeWinner = true;
                        break;
                        }
                    if (!isNaN (awaySetScore) && !isNaN (homeSetScore))
                        {
                        if (awaySetScore > homeSetScore)
                            {
                            awayWinner = true;
                            break;
                            }
                        else if (homeSetScore > awaySetScore)
                            {
                            homeWinner = true;
                            break;
                            }
                        }
                    }
                }
            }
        
        // Also handle tennis addendum winner text
        if (game.away_addendum && game.away_addendum.includes ('Winner'))
            awayWinner = true;
        if (game.home_addendum && game.home_addendum.includes ('Winner'))
            homeWinner = true;

        return { awayWinner, homeWinner };
        }
    //-------------------------------------------------------------------------------------------------
    formatTennisScore (score, other_score)
        {
        if (!score || score.trim() === '')
            return '';

        // First handle tie-break formatting (e.g., "6(7)" becomes "6<sup>7</sup>")
        let formatted = score.replace(/(\d+)\((\d+)\)/g, '$1<sup>$2</sup>');
        let s1 = parseInt (score.charAt (0), 10);
        let s2 = parseInt (other_score.charAt (0), 10);
        if (s1 === 7 || (s1 === 6 && s1 - s2 >= 2))
            formatted = `<strong>${formatted}</strong>`;

        // If 'x' is present, prepend the tennis-ball with a wrapper for left positioning
        if (/x/i.test(formatted))
            formatted = '<span class="tennis-ball-left"><span class="tennis-ball"></span></span>' + formatted.replace(/x/gi, '');
        return formatted;
        }
//---------------------------------------------------------------------------------------------
// Function to clear existing timers for an odds value
//---------------------------------------------------------------------------------------------
    clearOddsTimers (timerId)
        {
        if (this.oddsTimers.has (timerId))
            {
            this.oddsTimers.get (timerId).forEach (timer => clearTimeout (timer));
            this.oddsTimers.delete (timerId);
            }
        }
    }
//-------------------------------------------------------------------------------------------------
// Globally accessible functions for inline onclick handlers
//-------------------------------------------------------------------------------------------------
window.handleInjuryClick = function (eventId)
    {
    console.log ('Injuries for ' + eventId);
    };
//-------------------------------------------------------------------------------------------------
window.handleWeatherClick = function (eventId)
    {
    console.log ('Weather for ' + eventId);
    };
//-------------------------------------------------------------------------------------------------
window.handleTVClick = function (eventId)
    {
    console.log ('TV for ' + eventId);
    };
//-------------------------------------------------------------------------------------------------
window.handleLocationClick = function (eventId)
    {
    console.log ('Location for ' + eventId);
    };
