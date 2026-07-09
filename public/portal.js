let localCsrfToken = "";
let currentUserContext = null;
let activeConnectionId = null;
let acceptedConnections = [];
// game features removed

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
        return "";
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

        const homeUsernameEl = document.getElementById('homeUsername');
        if (homeUsernameEl) {
            homeUsernameEl.innerText = currentUserContext.username;
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
            const unconnectedView = document.getElementById('unconnectedView');
            const homeView = document.getElementById('homeView');
            const activeWorkspace = document.getElementById('activeWorkspace');
            
            if (unconnectedView) unconnectedView.style.display = 'block';
            if (homeView) homeView.style.display = 'block';
            if (activeWorkspace) activeWorkspace.style.display = 'none';
            
            const sidePanel = document.getElementById('switchSpaceTab') || document.getElementById('connectionList');
            if (sidePanel) {
                sidePanel.innerHTML = '<p style="color:#a8a8b3; font-size:0.9rem; padding:1rem;">no partner linked yet, check invite or search username of your loved one</p>';
            }
            
            await loadPendingInvitationsList();
        } else {
            if (document.getElementById('unconnectedView')) document.getElementById('unconnectedView').style.display = 'none';
            if (document.getElementById('homeView')) document.getElementById('homeView').style.display = 'block';
            if (document.getElementById('activeWorkspace')) document.getElementById('activeWorkspace').style.display = 'none';
            
            await loadAcceptedConnections();
        }
    } catch (err) {
        console.error('Failed compiling space distribution trees:', err);
    }
}

async function loadPendingInvitationsList() {
    const container = document.getElementById('pendingRequestsList');
    const badge = document.getElementById('notifBadge');
    if (!container) return;

    try {
        const res = await fetch('/api/connections/pending');
        const data = await res.json();
        const list = data.pendingRequests || [];
        list.sort((a, b) => {
            const da = new Date(a.created_at || 0).getTime();
            const db = new Date(b.created_at || 0).getTime();
            return db - da;
        });

        if (!list.length) {
            container.innerText = 'No invitations sent yet, Check later.';
            if (badge) { badge.style.display = 'none'; badge.innerText = '0'; }
            return;
        }

        if (badge) { badge.style.display = 'inline-block'; badge.innerText = String(list.length); }

        container.innerHTML = list.map(req => `
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
        if (badge) { badge.style.display = 'none'; badge.innerText = '0'; }
    }
}

async function loadAcceptedConnections() {
    const listElement = document.getElementById('connectionList');
    if (!listElement) return;

    try {
        const res = await fetch('/api/connections/accepted');
        if (!res.ok) {
            listElement.innerHTML = '<div style="color:#f75a5a;">Unable to load spaces.</div>';
            return;
        }

        const data = await res.json();
        acceptedConnections = data.connections || [];

        if (!acceptedConnections.length) {
            listElement.innerText = 'no partner linked yet, check invite or search username of your loved one';
            return;
        }

        listElement.innerHTML = acceptedConnections.map(connection => {
            return `
                <div class="connection-item" data-connection-id="${connection.cid}">
                    <div style="display:flex; flex-direction:column;">
                        <strong style="font-size:1rem;">${connection.partner_username}</strong>
                        <span style="font-size:0.85rem; color:#a8a8b3;">${connection.relationship_type}</span>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.connection-item').forEach(item => {
            item.addEventListener('click', async () => {
                const connectionId = item.getAttribute('data-connection-id');
                if (!connectionId) return;
                activeConnectionId = Number(connectionId);
                const rightPanel = document.getElementById('activeWorkspace');
                if (rightPanel) rightPanel.style.display = 'block';
                await selectWorkspaceConnection(Number(connectionId));
            });
        });

        if (acceptedConnections.length > 0 && !activeConnectionId) {
            await selectWorkspaceConnection(acceptedConnections[0].cid);
        }
    } catch (err) {
        listElement.innerHTML = '<div style="color:#f75a5a;">Failed loading spaces.</div>';
    }
}

async function selectWorkspaceConnection(connectionId) {
    const homeView = document.getElementById('homeView');
    const activeWorkspace = document.getElementById('activeWorkspace');
    const activeHeader = document.getElementById('activeSpaceHeader');
    const activeSubheader = document.getElementById('activeSpaceSubheader');

    activeConnectionId = connectionId;
    if (homeView) homeView.style.display = 'none';
    if (activeWorkspace) activeWorkspace.style.display = 'block';

    document.querySelectorAll('.connection-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-connection-id') === String(connectionId));
    });

    const connection = acceptedConnections.find(conn => conn.cid === connectionId);
    if (activeHeader && connection) {
        activeHeader.innerText = `Active Workspace with: ${connection.partner_username}`;
    }
    if (activeSubheader && connection) {
        activeSubheader.innerText = `${connection.relationship_type} space is active for this session.`;
    }

    const body = document.body;
    const openDiaryBtn = document.getElementById('openDiaryModalBtn');
    if (connection && connection.relationship_type === 'lover') {
        body.classList.add('theme-lover');
        if (openDiaryBtn) openDiaryBtn.innerText = 'Send Love Letter';
    } else {
        body.classList.remove('theme-lover');
        if (openDiaryBtn) openDiaryBtn.innerText = 'Add Notes';
    }

    await Promise.all([
        renderPersonalFeedList(),
        renderSharedFeedList(),
        renderConnectionCounters(),
        renderSharedGallery()
    ]);
}

async function renderSharedGallery() {
    const container = document.getElementById('sharedGallery');
    if (!container) return;
    if (!activeConnectionId) {
        container.innerHTML = '<p style="color:#a8a8b3;">No gallery available.</p>';
        return;
    }
    try {
        const res = await fetch(`/api/photos/shared?connectionId=${activeConnectionId}`);
        const data = await res.json();
        if (!res.ok) {
            container.innerHTML = `<p style="color:#f75a5a;">${data.error || 'Failed to load gallery.'}</p>`;
            return;
        }
        if (!data.photos || data.photos.length === 0) {
            container.innerHTML = '<p style="color:#a8a8b3;">No images uploaded yet.</p>';
            return;
        }
        container.innerHTML = data.photos.map(p => `<img src="${p.file_path}" alt="photo-${p.pid}" />`).join('');
    } catch (err) {
        container.innerText = 'Error loading gallery.';
    }
}

async function renderConnectionCounters() {
    const countdownContainer = document.getElementById('countdownContainer');
    if (!countdownContainer) return;

    if (!activeConnectionId) {
        countdownContainer.innerHTML = '';
        return;
    }

    const res = await fetch(`/api/connections/detail?connectionId=${activeConnectionId}`);
    if (!res.ok) {
        countdownContainer.innerHTML = '<div style="color:#f75a5a;">Unable to load connection counters.</div>';
        return;
    }

    const data = await res.json();
    const connection = data.connection;
    if (!connection) {
        countdownContainer.innerHTML = '<div style="color:#f75a5a;">Connection details unavailable.</div>';
        return;
    }

    const today = new Date();
    const tMonth = today.getMonth();
    const tDate = today.getDate();

    const welcomeCard = document.getElementById('welcomeCard');
    let countdownHTML = '';

    if (connection.partner_birthday) {
        const pb = new Date(connection.partner_birthday);
        if (pb.getMonth() === tMonth && pb.getDate() === tDate) {
            if (welcomeCard) welcomeCard.innerHTML = `<h2>🎉 Happy Birthday ${connection.partner_username}! 🎂✨</h2>`;
            countdownHTML += `<div class="countdown-ticker">🎉 Today is ${connection.partner_username}'s Birthday! 🎂</div>`;
        } else {
            countdownHTML += parseDateCountdown(connection.partner_birthday, `${connection.partner_username}'s Birthday Celebration`);
        }
    }

    if (connection.anniversary_date) {
        const ad = new Date(connection.anniversary_date);
        if (ad.getMonth() === tMonth && ad.getDate() === tDate) {
            if (welcomeCard && currentUserContext) welcomeCard.innerHTML = `<h2>💖 Happy Anniversary ${currentUserContext.username}! 💑✨</h2>`;
            countdownHTML += `<div class="countdown-ticker">💖 Today is your Space Anniversary! 💑</div>`;
        } else {
            countdownHTML += parseDateCountdown(connection.anniversary_date, 'Our Space Anniversary');
        }
    }

    if (!connection.partner_birthday && !connection.anniversary_date) {
        countdownHTML = '';
    }

    if (countdownContainer) countdownContainer.innerHTML = countdownHTML;
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
            await loadPendingInvitationsList();
            await determineRelationshipSpaceParadigm();
        } else {
            flashSystemMessage(outcome.error, false);
        }
    } catch (err) {
        flashSystemMessage('Network failure.', false);
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
        const url = activeConnectionId ? `/api/diaries/personal?connectionId=${activeConnectionId}` : '/api/diaries/personal';
        const res = await fetch(url);
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
        const url = activeConnectionId ? `/api/diaries/shared?connectionId=${activeConnectionId}` : '/api/diaries/shared';
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
            feed.innerHTML = `<p style="color:#f75a5a; font-size:0.9rem;">⚠️ ${data.error || 'Failed to load shared logs.'}</p>`;
            return;
        }

        if (!data.logs || data.logs.length === 0) {
            feed.innerHTML = '<p style="color:#a8a8b3; font-size:0.9rem;">Shared diary is empty.</p>';
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
        const url = activeConnectionId ? `${requestUrl}?connectionId=${activeConnectionId}` : requestUrl;

        try {
            const res = await fetch(url, {
                method: requestMethod,
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localCsrfToken },
                body: JSON.stringify(payload)
            });
            const output = await res.json();

            if (res.ok) {
                flashSystemMessage(output.message, true);
                clearDiaryFormWorkspaceState();
                const diaryModal = document.getElementById('diaryModal');
                if (diaryModal) diaryModal.style.display = 'none';
                await Promise.all([renderPersonalFeedList(), renderSharedFeedList(), renderSharedGallery()]);
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

runDashboardLifecycleBootstrap();

function setupNotificationHandlers() {
    const btn = document.getElementById('notifButton');
    const dropdown = document.getElementById('notifDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';
        if (isOpen) {
            dropdown.style.display = 'none';
        } else {
            await loadPendingInvitationsList();
            dropdown.style.display = 'block';
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });
}

setupNotificationHandlers();

function setupModalHandlers() {
    const diaryModal = document.getElementById('diaryModal');
    const photoModal = document.getElementById('photoModal');
    const openDiary = document.getElementById('openDiaryModalBtn');
    const closeDiary = document.getElementById('closeDiaryModalBtn');
    const openPhoto = document.getElementById('openPhotoModalBtn');
    const closePhoto = document.getElementById('closePhotoModalBtn');

    if (openDiary && diaryModal) openDiary.addEventListener('click', () => { diaryModal.style.display = 'flex'; });
    if (closeDiary && diaryModal) closeDiary.addEventListener('click', () => { diaryModal.style.display = 'none'; });
    if (openPhoto && photoModal) openPhoto.addEventListener('click', () => { photoModal.style.display = 'flex'; });
    if (closePhoto && photoModal) closePhoto.addEventListener('click', () => { photoModal.style.display = 'none'; });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (diaryModal) diaryModal.style.display = 'none';
            if (photoModal) photoModal.style.display = 'none';
        }
    });
}

setupModalHandlers();

const photoForm = document.getElementById('photoForm');
if (photoForm) {
    photoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeConnectionId) { flashSystemMessage('Select a connection first.', false); return; }
        const input = document.getElementById('photoFileInput');
        if (!input || !input.files || input.files.length === 0) { flashSystemMessage('Select a photo to upload.', false); return; }
        const fd = new FormData();
        fd.append('photo', input.files[0]);
        try {
            const res = await fetch(`/api/photos/upload?connectionId=${activeConnectionId}`, {
                method: 'POST',
                headers: { 'X-CSRF-Token': localCsrfToken },
                body: fd
            });
            const out = await res.json();
            if (res.ok) {
                flashSystemMessage(out.message, true);
                const photoModal = document.getElementById('photoModal');
                if (photoModal) photoModal.style.display = 'none';
                document.getElementById('photoFileInput').value = '';
                await renderSharedGallery();
            } else {
                flashSystemMessage(out.error, false);
            }
        } catch (err) {
            flashSystemMessage('Upload failed.', false);
        }
    });
}
