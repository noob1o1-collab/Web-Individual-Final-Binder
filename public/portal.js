let localCsrfToken = "";
let currentUserContext = null;
let gamePollingIntervalId = null;
let clientGameSymbol = " ";
let isMyTurnToken = false;

function flashSystemMessage(msg, isSuccess = true) {
    const banner = document.getElementById('portalMessage');
    if (!banner) return;
    banner.innerText = msg;
    banner.style.background = isSuccess ? 'rgba(4, 211, 97, 0.2)' : 'rgba(247, 90, 90, 0.2)';
    banner.style.color = isSuccess ? '#04d361' : '#f75a5a';
    banner.style.border = `1px solid ${isSuccess ? '#04d361' : '#f75a5a'}`;
    banner.style.display = 'block';
    setTimeout(() => {
        banner.style.display = 'none';
    }, 4000);
}

function parseDateCountdown(targetDateString, labelingText) {
    if (!targetDateString) {
        return `<div class="countdown-ticker">${labelingText}: Not configured</div>`;
    }

    const current = new Date();
    const target = new Date(targetDateString);
    let nextAnniversary = new Date(current.getFullYear(), target.getMonth(), target.getDate());

    if (current > nextAnniversary) {
        nextAnniversary.setFullYear(current.getFullYear() + 1);
    }

    const differentialMs = nextAnniversary - current;
    const missingDays = Math.ceil(differentialMs / (1000 * 60 * 60 * 24));

    return `<div class="countdown-ticker">⏰ <strong>${missingDays} Days</strong> remaining until ${labelingText}!</div>`;
}

async function runDashboardLifecycleBootstrap() {
    try {
        const tokenResponse = await fetch('/api/csrf-token');
        const tokenData = await tokenResponse.json();
        localCsrfToken = tokenData.csrfToken;

        const authResponse = await fetch('/api/users/me');
        if (!authResponse.ok) {
            window.location.href = '/index.html';
            return;
        }

        const authData = await authResponse.json();
        currentUserContext = authData.user;
        const greeting = document.getElementById('userGreeting');
        if (greeting) {
            greeting.innerText = `User: ${currentUserContext.username}`;
        }

        await determineRelationshipSpaceParadigm();
    } catch (error) {
        console.error('Dashboard engine compilation error:', error);
    }
}

async function runDashboardLifecycleBootstrap() {
    try {
        const tokenResponse = await fetch('/api/csrf-token');
        const tokenData = await tokenResponse.json();
        localCsrfToken = tokenData.csrfToken;

        const authResponse = await fetch('/api/users/me');
        if (!authResponse.ok) {
            window.location.href = '/index.html';
            return;
        }

        const authData = await authResponse.json();
        currentUserContext = authData.user;
        const greeting = document.getElementById('userGreeting');
        if (greeting) {
            greeting.innerText = `User: ${currentUserContext.username}`;
        }

        await determineRelationshipSpaceParadigm();
    } catch (error) {
        console.error('Dashboard engine compilation error:', error);
    }
}

async function determineRelationshipSpaceParadigm() {
    try {
        const response = await fetch('/api/connections/status');
        const statusData = await response.json();

        if (statusData.connected === false) {
            const connectedView = document.getElementById('connectedView');
            const unconnectedView = document.getElementById('unconnectedView');
            if (connectedView) connectedView.style.display = 'none';
            if (unconnectedView) unconnectedView.style.display = 'grid';
            await loadPendingInvitationsList();
        } else {
            const connectedView = document.getElementById('connectedView');
            const unconnectedView = document.getElementById('unconnectedView');
            if (connectedView) connectedView.style.display = 'grid';
            if (unconnectedView) unconnectedView.style.display = 'none';

            const partner = statusData.partner;
            const partnerNameDisplay = document.getElementById('partnerNameDisplay');
            const spaceTypeDisplay = document.getElementById('spaceTypeDisplay');
            if (partnerNameDisplay) {
                partnerNameDisplay.innerHTML = `Linked Account: <span class="badge">${partner.username}</span>`;
            }
            if (spaceTypeDisplay) {
                spaceTypeDisplay.innerText = `Status: ${partner.relationshipType.toUpperCase()}`;
            }

            const countdownContainer = document.getElementById('countdownContainer');
            if (countdownContainer) {
                let countdownHTML = parseDateCountdown(partner.birthday, `${partner.username}'s Birthday Celebration`);
                if (partner.anniversaryDate) {
                    countdownHTML += parseDateCountdown(partner.anniversaryDate, 'Our Space Anniversary');
                }
                countdownContainer.innerHTML = countdownHTML;
            }

            await Promise.all([renderPersonalFeedList(), renderSharedFeedList()]);
        }
    } catch (err) {
        console.error('Failed compiling space distribution trees:', err);
    }
}

async function loadPendingInvitationsList() {
    const container = document.getElementById('pendingRequestsList');
    if (!container) return;

    try {
        const res = await fetch('/api/connections/pending');
        const data = await res.json();

        if (!data.pendingRequests || data.pendingRequests.length === 0) {
            container.innerText = 'No inbound connection requests currently awaiting review.';
            return;
        }

        container.innerHTML = data.pendingRequests.map(req => `
            <div class="request-item">
                <strong>From:</strong> ${req.sender_username} <br>
                <strong>Type:</strong> <span class="badge">${req.relationship_type}</span>
                <div class="request-actions">
                    <button class="btn btn-success" onclick="resolveRequestHook(${req.cid}, 'accept')">Accept</button>
                    <button class="btn btn-danger" onclick="resolveRequestHook(${req.cid}, 'decline')">Decline</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerText = 'Error extracting list records.';
    }
}

async function resolveRequestHook(connectionId, actionType) {
    try {
        const res = await fetch(`/api/connections/${actionType}/${connectionId}`, {
            method: 'POST',
            headers: { 'X-CSRF-Token': localCsrfToken }
        });
        const outcome = await res.json();

        if (res.ok) {
            flashSystemMessage(outcome.message, true);
            await determineRelationshipSpaceParadigm();
        } else {
            flashSystemMessage(outcome.error, false);
        }
    } catch (err) {
        flashSystemMessage('Network execution error resolving request block.', false);
    }
}

const connectForm = document.getElementById('connectForm');
if (connectForm) {
    connectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            targetUsername: document.getElementById('targetUsername').value.trim(),
            relationshipType: document.getElementById('relationshipType').value,
            anniversaryDate: document.getElementById('anniversaryDate').value || null
        };

        try {
            const res = await fetch('/api/connections/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localCsrfToken },
                body: JSON.stringify(payload)
            });
            const output = await res.json();

            if (res.ok) {
                flashSystemMessage(output.message, true);
                connectForm.reset();
            } else {
                flashSystemMessage(output.error, false);
            }
        } catch (err) {
            flashSystemMessage('Network failure establishing tracking request vector.', false);
        }
    });
}

async function renderPersonalFeedList() {
    const feed = document.getElementById('personalFeed');
    if (!feed) return;

    try {
        const res = await fetch('/api/diaries/personal');
        const data = await res.json();

        if (!res.ok) {
            feed.innerHTML = `<p style="color:#f75a5a; font-size:0.9rem;">⚠️ ${data.error || 'Failed to load private logs.'}</p>`;
            return;
        }

        if (!data.logs || data.logs.length === 0) {
            feed.innerHTML = '<p style="color:#a8a8b3; font-size:0.9rem;">Private archive is empty.</p>';
            return;
        }

        const escapeHtml = (str) => str.replace(/"/g, '&quot;');

        feed.innerHTML = data.logs.map(log => `
            <div class="diary-card" id="diary-card-${log.did}" data-title="${escapeHtml(log.title)}" data-description="${escapeHtml(log.description)}" data-shared="${log.is_shared}">
                <h3>${log.title}</h3>
                <p style="margin:0.5rem 0; font-size:0.95rem; line-height:1.4;">${log.description}</p>
                <small style="color:#a8a8b3;">Recorded: ${new Date(log.created_at).toLocaleDateString()}</small>
                <div style="margin-top: 0.75rem;">
                    <button class="btn btn-primary" style="padding: 0.3rem 0.7rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="prepareLogEditHook(${log.did})">✏️ Edit</button>
                    <button class="delete-btn" style="position: static;" onclick="triggerLogPurgeHook(${log.did})">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        feed.innerText = 'Error loading private logs.';
    }
}

async function renderSharedFeedList() {
    const feed = document.getElementById('sharedFeed');
    if (!feed) return;

    try {
        const res = await fetch('/api/diaries/shared');
        const data = await res.json();

        if (!res.ok) {
            feed.innerHTML = `<p style="color:#f75a5a; font-size:0.9rem;">⚠️ ${data.error || 'Failed to load shared logs.'}</p>`;
            return;
        }

        if (!data.logs || data.logs.length === 0) {
            feed.innerHTML = '<p style="color:#a8a8b3; font-size:0.9rem;">Collaborative shared ledger is empty.</p>';
            return;
        }

        const escapeHtml = (str) => str.replace(/"/g, '&quot;');

        feed.innerHTML = data.logs.map(log => `
            <div class="diary-card" id="diary-card-${log.did}" data-title="${escapeHtml(log.title)}" data-description="${escapeHtml(log.description)}" data-shared="${log.is_shared}">
                <h3>${log.title}</h3>
                <p style="margin:0.5rem 0; font-size:0.95rem; line-height:1.4;">${log.description}</p>
                <small style="color:#a8a8b3;">Author: <strong>${log.creator_username}</strong> | ${new Date(log.created_at).toLocaleDateString()}</small>
                <div style="margin-top: 0.75rem;">
                    <button class="btn btn-primary" style="padding: 0.3rem 0.7rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="prepareLogEditHook(${log.did})">✏️ Edit</button>
                    <button class="delete-btn" style="position: static;" onclick="triggerLogPurgeHook(${log.did})">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        feed.innerText = 'Error loading shared logs.';
    }
}

const diaryForm = document.getElementById('diaryForm');
if (diaryForm) {
    diaryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
   
        const targetEditId = document.getElementById('editDiaryId').value;
        const isSharedValue = targetEditId
            ? document.getElementById('editDiaryIsShared').value === 'true'
            : document.getElementById('diaryScope').value === 'true';

        const payload = {
            title: document.getElementById('diaryTitle').value.trim(),
            description: document.getElementById('diaryDescription').value.trim(),
            isShared: isSharedValue
        };

        const requestUrl = targetEditId ? `/api/diaries/edit/${targetEditId}` : '/api/diaries/add';
        const requestMethod = targetEditId ? 'PUT' : 'POST';

        try {
            const res = await fetch(requestUrl, {
                method: requestMethod,
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localCsrfToken },
                body: JSON.stringify(payload)
            });
            const output = await res.json();

            if (res.ok) {
                flashSystemMessage(output.message, true);
                clearDiaryFormWorkspaceState(); // Resets layout parameters cleanly
                await Promise.all([renderPersonalFeedList(), renderSharedFeedList()]);
            } else {
                flashSystemMessage(output.error, false);
            }
        } catch (err) {
            flashSystemMessage('Network runtime failure handling diary entry stream manipulation.', false);
        }
    });
}

async function triggerLogPurgeHook(diaryId) {
    if (!confirm('Are you certain you want to permanently delete this entry?')) return;

    try {
        const res = await fetch(`/api/diaries/delete/${diaryId}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': localCsrfToken }
        });
        const output = await res.json();

        if (res.ok) {
            flashSystemMessage(output.message, true);
            await Promise.all([renderPersonalFeedList(), renderSharedFeedList()]);
        } else {
            flashSystemMessage(output.error, false);
        }
    } catch (err) {
        flashSystemMessage('Network connection failure executing deletion.', false);
    }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/users/logout', {
                method: 'POST',
                headers: { 'X-CSRF-Token': localCsrfToken }
            });
            window.location.href = '/index.html';
        } catch (err) {
            console.error('Logout processing failure:', err);
        }
    });
}

function prepareLogEditHook(diaryId) {
    const card = document.getElementById(`diary-card-${diaryId}`);
    if (!card) return;

    const title = card.getAttribute('data-title');
    const description = card.getAttribute('data-description');
    const isShared = card.getAttribute('data-shared');

    document.getElementById('editDiaryId').value = diaryId;
    document.getElementById('editDiaryIsShared').value = isShared;
    document.getElementById('diaryTitle').value = title;
    document.getElementById('diaryDescription').value = description;
    document.getElementById('diaryScope').value = isShared;

    const diaryScopeGroup = document.getElementById('diaryScope').closest('.form-group');
    if (diaryScopeGroup) {
        diaryScopeGroup.style.display = 'none';
    }
    document.getElementById('diaryScope').disabled = true;

    const headerTitle = document.querySelector('#diaryForm').previousElementSibling;
    if (headerTitle) headerTitle.innerText = "✏️ Edit Diary Log Entry";
    
    const submitBtn = document.querySelector('#diaryForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerText = "Save Modifications Vector";
        submitBtn.className = "btn btn-primary";
    }
    
    if (!document.getElementById('cancelEditBtn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelEditBtn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-danger';
        cancelBtn.style.marginTop = '0.5rem';
        cancelBtn.style.width = '100%';
        cancelBtn.innerText = '🚫 Cancel Form Modification';
        cancelBtn.onclick = clearDiaryFormWorkspaceState;
        document.getElementById('diaryForm').appendChild(cancelBtn);
    }
    
    document.getElementById('diaryTitle').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('diaryTitle').focus();
}

function clearDiaryFormWorkspaceState() {
    document.getElementById('editDiaryId').value = '';
    document.getElementById('editDiaryIsShared').value = '';
    document.getElementById('diaryForm').reset();
    
    const headerTitle = document.querySelector('#diaryForm').previousElementSibling;
    if (headerTitle) headerTitle.innerText = "New Diary Log Entry";
    
    const submitBtn = document.querySelector('#diaryForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerText = "Publish Record";
        submitBtn.className = "btn btn-success";
    }

    const diaryScopeGroup = document.getElementById('diaryScope').closest('.form-group');
    if (diaryScopeGroup) {
        diaryScopeGroup.style.display = 'block';
    }
    document.getElementById('diaryScope').disabled = false;
    
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.remove();
}

async function syncGameStateRoutine() {
    try {
        const res = await fetch('/api/games/state');
        if (!res.ok) return;

        const data = await res.json();
        const { game, playerSymbol, currentUserId } = data;

        clientGameSymbol = playerSymbol;
        const userSymbolDisplay = document.getElementById('userSymbolDisplay');
        if (userSymbolDisplay) {
            userSymbolDisplay.innerText = playerSymbol;
        }

        const cells = document.querySelectorAll('.game-cell');
        if (!cells.length) return;

        const boardState = game.board.split('');
        boardState.forEach((symbol, index) => {
            const cell = cells[index];
            if (!cell) return;
            cell.innerText = symbol !== ' ' ? symbol : '';
            cell.setAttribute('data-symbol', symbol);
            if (symbol !== ' ') {
                cell.classList.add('taken');
            } else {
                cell.classList.remove('taken');
            }
        });

        const turnIndicator = document.getElementById('gameTurnIndicator');
        if (!turnIndicator) return;

        if (game.status === 'won') {
            if (game.winner_id === currentUserId) {
                turnIndicator.innerText = '🏆 Victory Achieved!';
                turnIndicator.style.background = 'rgba(4, 211, 97, 0.2)';
                turnIndicator.style.color = '#04d361';
            } else {
                turnIndicator.innerText = '🚨 Defeat Recorded.';
                turnIndicator.style.background = 'rgba(247, 90, 90, 0.2)';
                turnIndicator.style.color = '#f75a5a';
            }
            isMyTurnToken = false;
        } else if (game.status === 'draw') {
            turnIndicator.innerText = '🤝 Matrix Stagnated (Draw)';
            turnIndicator.style.background = '#323238';
            turnIndicator.style.color = '#a8a8b3';
            isMyTurnToken = false;
        } else if (game.turn_user_id === currentUserId) {
            turnIndicator.innerText = '⚡ Your Strategic Turn';
            turnIndicator.style.background = '#04d361';
            turnIndicator.style.color = '#121214';
            isMyTurnToken = true;
        } else {
            turnIndicator.innerText = '⏳ Partner Calculating Move...';
            turnIndicator.style.background = '#29292e';
            turnIndicator.style.color = '#a8a8b3';
            isMyTurnToken = false;
        }
    } catch (err) {
        console.error('Game sync routine telemetry failure:', err);
    }
}

async function executeCellClickMove(cellIndex) {
    if (!isMyTurnToken) {
        flashSystemMessage('Negative payload. Wait for your active tactical sync turn.', false);
        return;
    }

    try {
        const res = await fetch('/api/games/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localCsrfToken },
            body: JSON.stringify({ cellIndex })
        });
        const output = await res.json();

        if (res.ok) {
            await syncGameStateRoutine();
        } else {
            flashSystemMessage(output.error, false);
        }
    } catch (err) {
        flashSystemMessage('Network connection breakdown passing game turn coordinates.', false);
    }
}

async function executeGameResetSequence() {
    if (!confirm('Are you certain you want to clear the active board state?')) return;

    try {
        const res = await fetch('/api/games/reset', {
            method: 'POST',
            headers: { 'X-CSRF-Token': localCsrfToken }
        });
        if (res.ok) {
            flashSystemMessage('Game board configuration re-initialized.', true);
            await syncGameStateRoutine();
        }
    } catch (err) {
        flashSystemMessage('Failed executing reset matrix command routing.', false);
    }
}

function initializeGameClickListeners() {
    const board = document.getElementById('gameBoard');
    const resetBtn = document.getElementById('resetGameBtn');

    if (!board || !resetBtn) return;

    board.onclick = (e) => {
        const cell = e.target.closest('.game-cell');
        if (!cell) return;
        const cellIndex = parseInt(cell.getAttribute('data-index'));
        executeCellClickMove(cellIndex);
    };

    resetBtn.onclick = executeGameResetSequence;
}

function startGamePolling() {
    if (gamePollingIntervalId) clearInterval(gamePollingIntervalId);
    syncGameStateRoutine();
    gamePollingIntervalId = setInterval(syncGameStateRoutine, 3000);
}

function initializeGameLoop() {
    initializeGameClickListeners();
    startGamePolling();
}

runDashboardLifecycleBootstrap();
initializeGameLoop();
