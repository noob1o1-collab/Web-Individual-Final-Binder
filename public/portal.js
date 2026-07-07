let localCsrfToken = "";
let currentUserContext = null;
let activeConnectionId = null;
let acceptedConnections = [];
let currentConnectionDetail = null;
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
    const altList = document.getElementById('switchSpaceTab');
    if (!listElement && !altList) return;
    if (listElement) listElement.innerHTML = '';
    if (altList) altList.innerHTML = '';

    try {
        const res = await fetch('/api/connections/accepted');
        if (!res.ok) {
            listElement.innerHTML = '<div style="color:#f75a5a;">Unable to load spaces.</div>';
            return;
        }

        const data = await res.json();
        acceptedConnections = data.connections || [];

        if (!acceptedConnections.length) {
            if (listElement) listElement.innerText = 'no partner linked yet, check invite or search username of your loved one';
            if (altList) altList.innerText = 'no partner linked yet, check invite or search username of your loved one';
            return;
        }

        const html = acceptedConnections.map(connection => {
            return `
                <div class="connection-item" data-connection-id="${connection.cid}">
                    <div style="display:flex; flex-direction:column;">
                        <strong style="font-size:1rem;">${connection.partner_username}</strong>
                        <span style="font-size:0.85rem; color:#a8a8b3;">${connection.relationship_type}</span>
                    </div>
                </div>
            `;
        }).join('');

        if (listElement) listElement.innerHTML = html;
        if (altList) altList.innerHTML = html;

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

    await loadActiveConnectionProfile(connectionId);

    const body = document.body;
    const openDiaryBtn = document.getElementById('openDiaryModalBtn');
    const relType = connection && connection.relationship_type ? String(connection.relationship_type).toLowerCase() : '';
    if (relType === 'lover') {
        body.classList.add('theme-lover');
        if (openDiaryBtn) openDiaryBtn.innerText = 'Send Love Letter';
        const modalHeader = document.querySelector('#diaryModal h3');
        if (modalHeader) modalHeader.innerText = 'Send Love Letter';
        const modalSubmit = document.querySelector('#diaryModal button[type="submit"]');
        if (modalSubmit) modalSubmit.innerText = 'Send Love Letter';
    } else {
        body.classList.remove('theme-lover');
        if (openDiaryBtn) openDiaryBtn.innerText = 'Add Notes';
        const modalHeader = document.querySelector('#diaryModal h3');
        if (modalHeader) modalHeader.innerText = 'New Diary Log Entry';
        const modalSubmit = document.querySelector('#diaryModal button[type="submit"]');
        if (modalSubmit) modalSubmit.innerText = 'Publish Record';
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
    container.innerHTML = '';
    if (!activeConnectionId) {
        container.innerHTML = '<p style="color:#a8a8b3;">No gallery available.</p>';
        return;
    }
    try {
        const res = await fetch(`/api/photos/shared?connectionId=${activeConnectionId}`);
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            container.innerHTML = `<p style="color:#f75a5a;">${errBody.error || 'Failed to load gallery.'}</p>`;
            return;
        }
        const data = await res.json().catch(() => ({ photos: [] }));
        const photos = Array.isArray(data.photos) ? data.photos : [];
        if (photos.length === 0) {
            container.innerHTML = '<p style="color:#a8a8b3;">No images uploaded yet.</p>';
            return;
        }
        const images = photos.map(p => {
            const src = p.file_path && p.file_path.startsWith('/') ? p.file_path : `/${(p.file_path || '').replace(/^\//, '')}`;
            return `
                <div class="photo-card">
                    <img src="${src}" alt="photo-${p.pid}" />
                    <button class="photo-delete-btn" data-id="${p.pid}" aria-label="Delete photo">🗑️</button>
                </div>
            `;
        }).join('');
        container.innerHTML = images;
        container.querySelectorAll('.photo-delete-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.stopPropagation();
                const photoId = button.getAttribute('data-id');
                if (!photoId) return;
                if (!confirm('Are you sure you want to delete this photo?')) return;
                try {
                    const deleteRes = await fetch(`/api/photos/${photoId}`, {
                        method: 'DELETE',
                        headers: { 'X-CSRF-Token': localCsrfToken }
                    });
                    const result = await deleteRes.json();
                    if (deleteRes.ok) {
                        flashSystemMessage(result.message, true);
                        await renderSharedGallery();
                    } else {
                        flashSystemMessage(result.error || 'Unable to delete photo.', false);
                    }
                } catch (deleteErr) {
                    flashSystemMessage('Photo deletion failed.', false);
                }
            });
        });
    } catch (err) {
        container.innerHTML = '<p style="color:#a8a8b3;">No images uploaded yet.</p>';
    }
}

async function renderConnectionCounters() {
    const countdownContainer = document.getElementById('countdownContainer');
    if (!countdownContainer) return;

    if (!activeConnectionId) {
        countdownContainer.innerHTML = '';
        return;
    }

    const connection = currentConnectionDetail && currentConnectionDetail.cid === activeConnectionId
        ? currentConnectionDetail
        : await fetchConnectionDetail(activeConnectionId);
    if (!connection) {
        countdownContainer.innerHTML = '<div style="color:#f75a5a;">Connection details unavailable.</div>';
        return;
    }

    const today = new Date();
    const tMonth = today.getMonth();
    const tDate = today.getDate();

    const welcomeCard = document.getElementById('welcomeCard');
    let countdownHTML = '';

    if (currentUserContext && currentUserContext.birthday) {
        const ub = new Date(currentUserContext.birthday);
        if (ub.getMonth() === tMonth && ub.getDate() === tDate) {
            if (welcomeCard) welcomeCard.innerHTML = `<h2>🎉 Happy Birthday ${currentUserContext.username}! 🎂✨</h2>`;
        }
    }

    if (connection.partner_birthday) {
        const pb = new Date(connection.partner_birthday);
        if (pb.getMonth() === tMonth && pb.getDate() === tDate) {
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

async function fetchConnectionDetail(connectionId) {
    try {
        const res = await fetch(`/api/connections/detail?connectionId=${connectionId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.connection || null;
    } catch (err) {
        return null;
    }
}

async function loadActiveConnectionProfile(connectionId) {
    currentConnectionDetail = null;
    const partnerNameEl = document.getElementById('partnerNameDisplay');
    const spaceTypeEl = document.getElementById('spaceTypeDisplay');
    const linkButton = document.getElementById('linkAccountBtn');

    if (!connectionId || !partnerNameEl || !spaceTypeEl) return;

    const connection = await fetchConnectionDetail(connectionId);
    currentConnectionDetail = connection ? { ...connection, cid: connectionId } : null;

    if (!currentConnectionDetail) {
        partnerNameEl.innerText = 'Linked Account: --';
        spaceTypeEl.innerText = 'Status: --';
        if (linkButton) linkButton.style.display = 'none';
        return;
    }

    const hasPartnerUsername = Boolean(currentConnectionDetail.partner_username);
    partnerNameEl.innerText = `Linked Account: ${hasPartnerUsername ? currentConnectionDetail.partner_username : 'not linked yet'}`;
    spaceTypeEl.innerText = `Status: ${hasPartnerUsername ? 'Active' : 'Requires account link'}`;

    if (linkButton) {
        linkButton.style.display = hasPartnerUsername ? 'none' : 'inline-flex';
        linkButton.onclick = () => {
            const modal = document.getElementById('linkAccountModal');
            if (modal) modal.style.display = 'flex';
        };
    }
}

const relationshipTypeSelect = document.getElementById('relationshipType');
const anniversaryContainer = document.getElementById('anniversaryContainer');

function updateAnniversaryFieldVisibility() {
    if (!relationshipTypeSelect || !anniversaryContainer) return;
    const isLover = relationshipTypeSelect.value === 'lover';
    anniversaryContainer.style.display = isLover ? 'block' : 'none';
}

if (relationshipTypeSelect) {
    relationshipTypeSelect.addEventListener('change', updateAnniversaryFieldVisibility);
}

updateAnniversaryFieldVisibility();

const connectForm = document.getElementById('connectForm');
const sidebarConnectForm = document.getElementById('sidebarConnectForm');

async function submitConnectionRequest(targetUsername, relationshipType, anniversaryDate) {
    const payload = {
        targetUsername: targetUsername.trim(),
        relationshipType,
        anniversaryDate: anniversaryDate || null
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
            return true;
        }

        flashSystemMessage(output.error, false);
        return false;
    } catch (err) {
        flashSystemMessage('Network failure establishing tracking request vector.', false);
        return false;
    }
}

if (connectForm) {
    connectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const success = await submitConnectionRequest(
            document.getElementById('targetUsername').value,
            relationshipTypeSelect ? relationshipTypeSelect.value : 'friend',
            document.getElementById('anniversaryDate').value
        );
        if (success) connectForm.reset();
    });
}

const sidebarRelationshipTypeSelect = document.getElementById('sidebarRelationshipType');
const sidebarAnniversaryContainer = document.getElementById('sidebarAnniversaryContainer');

function updateSidebarAnniversaryFieldVisibility() {
    if (!sidebarRelationshipTypeSelect || !sidebarAnniversaryContainer) return;
    const isLover = sidebarRelationshipTypeSelect.value === 'lover';
    sidebarAnniversaryContainer.style.display = isLover ? 'block' : 'none';
}

if (sidebarRelationshipTypeSelect) {
    sidebarRelationshipTypeSelect.addEventListener('change', updateSidebarAnniversaryFieldVisibility);
}

updateSidebarAnniversaryFieldVisibility();

if (sidebarConnectForm) {
    sidebarConnectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const success = await submitConnectionRequest(
            document.getElementById('sidebarTargetUsername').value,
            sidebarRelationshipTypeSelect ? sidebarRelationshipTypeSelect.value : 'friend',
            document.getElementById('sidebarAnniversaryDate').value
        );
        if (success) sidebarConnectForm.reset();
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

    const diaryModal = document.getElementById('diaryModal');
    if (diaryModal) diaryModal.style.display = 'flex';

    const headerTitle = document.querySelector('#diaryModal h3');
    if (headerTitle) {
        headerTitle.innerText = document.body.classList.contains('theme-lover') ? '✏️ Edit Love Letter' : '✏️ Edit Diary Entry';
    }
    
    const submitBtn = document.querySelector('#diaryModal button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerText = 'Update Record';
        submitBtn.className = 'btn btn-primary';
    }
    
    if (!document.getElementById('cancelEditBtn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelEditBtn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-danger';
        cancelBtn.style.marginTop = '0.5rem';
        cancelBtn.style.width = '100%';
        cancelBtn.innerText = 'Cancel Edit';
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
    
    const headerTitle = document.querySelector('#diaryModal h3');
    if (headerTitle) headerTitle.innerText = 'New Diary Log Entry';
    
    const submitBtn = document.querySelector('#diaryModal button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerText = 'Publish Record';
        submitBtn.className = 'btn btn-success';
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
    const settingsModal = document.getElementById('settingsModal');
    const usernameModal = document.getElementById('usernameModal');
    const datesModal = document.getElementById('datesModal');
    const openDiary = document.getElementById('openDiaryModalBtn');
    const closeDiary = document.getElementById('closeDiaryModalBtn');
    const openPhoto = document.getElementById('openPhotoModalBtn');
    const closePhoto = document.getElementById('closePhotoModalBtn');
    const settingsToggle = document.getElementById('settingsToggleBtn');
    const closeSettings = document.getElementById('closeSettingsModalBtn');
    const openUsernameBtn = document.getElementById('openChangeUsernameBtn');
    const openDatesBtn = document.getElementById('openChangeDatesBtn');
    const closeUsername = document.getElementById('closeUsernameModalBtn');
    const closeDates = document.getElementById('closeDatesModalBtn');
    const logoutSettingsBtn = document.getElementById('logoutSettingsBtn');

    if (openDiary && diaryModal) openDiary.addEventListener('click', () => {
        clearDiaryFormWorkspaceState();
        const headerTitle = document.querySelector('#diaryModal h3');
        if (headerTitle) {
            headerTitle.innerText = document.body.classList.contains('theme-lover') ? 'Send Love Letter' : 'New Diary Log Entry';
        }
        const submitBtn = document.querySelector('#diaryModal button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerText = 'Publish Record';
            submitBtn.className = 'btn btn-success';
        }
        diaryModal.style.display = 'flex';
    });
    if (closeDiary && diaryModal) closeDiary.addEventListener('click', () => { diaryModal.style.display = 'none'; });
    const linkAccountBtn = document.getElementById('linkAccountBtn');
    const linkAccountModal = document.getElementById('linkAccountModal');
    const closeLinkAccount = document.getElementById('closeLinkAccountModalBtn');

    if (openPhoto && photoModal) openPhoto.addEventListener('click', () => { photoModal.style.display = 'flex'; });
    if (closePhoto && photoModal) closePhoto.addEventListener('click', () => { photoModal.style.display = 'none'; });
    if (linkAccountBtn && linkAccountModal) linkAccountBtn.addEventListener('click', () => { linkAccountModal.style.display = 'flex'; });
    if (closeLinkAccount && linkAccountModal) closeLinkAccount.addEventListener('click', () => { linkAccountModal.style.display = 'none'; });
    if (settingsToggle && settingsModal) settingsToggle.addEventListener('click', async () => {
        populateSettingsModal();
        settingsModal.style.display = 'flex';
    });
    if (closeSettings && settingsModal) closeSettings.addEventListener('click', () => { settingsModal.style.display = 'none'; });
    if (openUsernameBtn && usernameModal) openUsernameBtn.addEventListener('click', () => {
        usernameModal.style.display = 'flex';
    });
    if (openDatesBtn && datesModal) openDatesBtn.addEventListener('click', async () => {
        await populateDatesModal();
        datesModal.style.display = 'flex';
    });
    if (closeUsername && usernameModal) closeUsername.addEventListener('click', () => { usernameModal.style.display = 'none'; });
    if (closeDates && datesModal) closeDates.addEventListener('click', () => { datesModal.style.display = 'none'; });
    if (logoutSettingsBtn) logoutSettingsBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/users/logout', {
                method: 'POST',
                headers: { 'X-CSRF-Token': localCsrfToken }
            });
        } catch (err) {
            console.error('Logout failed:', err);
        }
        window.location.href = '/index.html';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (diaryModal) diaryModal.style.display = 'none';
            if (photoModal) photoModal.style.display = 'none';
            if (settingsModal) settingsModal.style.display = 'none';
            if (usernameModal) usernameModal.style.display = 'none';
            if (datesModal) datesModal.style.display = 'none';
            if (linkAccountModal) linkAccountModal.style.display = 'none';
        }
    });
}

setupModalHandlers();

async function populateSettingsModal() {
    if (!currentUserContext) return;
    const birthdayInput = document.getElementById('profileBirthdayInput');
    const anniversaryInput = document.getElementById('profileAnniversaryInput');
    const usernameInput = document.getElementById('newUsernameInput');
    if (birthdayInput) birthdayInput.value = currentUserContext.birthday || '';
    if (usernameInput) usernameInput.value = currentUserContext.username || '';
    if (anniversaryInput && activeConnectionId) {
        const detailRes = await fetch(`/api/connections/detail?connectionId=${activeConnectionId}`);
        if (detailRes.ok) {
            const detailData = await detailRes.json();
            anniversaryInput.value = detailData.connection?.anniversary_date || '';
        }
    }
}

async function populateDatesModal() {
    await populateSettingsModal();
}

const usernameForm = document.getElementById('usernameForm');
if (usernameForm) {
    usernameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('newUsernameInput').value.trim();
        if (!newUsername) {
            flashSystemMessage('Please enter a new username.', false);
            return;
        }
        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localCsrfToken },
                body: JSON.stringify({ username: newUsername })
            });
            const outcome = await res.json();
            if (res.ok) {
                currentUserContext = outcome.user;
                flashSystemMessage(outcome.message, true);
                document.getElementById('userGreeting').innerText = `User: ${currentUserContext.username}`;
                const homeUsernameEl = document.getElementById('homeUsername');
                if (homeUsernameEl) homeUsernameEl.innerText = currentUserContext.username;
                document.getElementById('usernameModal').style.display = 'none';
            } else {
                flashSystemMessage(outcome.error, false);
            }
        } catch (err) {
            flashSystemMessage('Failed updating username.', false);
        }
    });
}

const datesForm = document.getElementById('datesForm');
if (datesForm) {
    datesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const birthdayValue = document.getElementById('profileBirthdayInput').value || null;
        const anniversaryValue = document.getElementById('profileAnniversaryInput').value || null;
        try {
            const userRes = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localCsrfToken },
                body: JSON.stringify({ birthday: birthdayValue })
            });
            const userOutcome = await userRes.json();
            if (!userRes.ok) {
                flashSystemMessage(userOutcome.error || 'Failed updating birthday.', false);
                return;
            }
            currentUserContext = userOutcome.user;
            let connectionOutcome = null;
            if (anniversaryValue && activeConnectionId) {
                const connRes = await fetch('/api/connections/update-dates', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localCsrfToken },
                    body: JSON.stringify({ anniversaryDate: anniversaryValue })
                });
                connectionOutcome = await connRes.json();
                if (!connRes.ok) {
                    flashSystemMessage(connectionOutcome.error || 'Failed updating anniversary.', false);
                    return;
                }
            }
            flashSystemMessage('Date settings saved successfully.', true);
            document.getElementById('datesModal').style.display = 'none';
            await renderConnectionCounters();
        } catch (err) {
            flashSystemMessage('Failed saving date settings.', false);
        }
    });
}

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

const linkAccountForm = document.getElementById('linkAccountForm');
if (linkAccountForm) {
    linkAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!activeConnectionId) {
            flashSystemMessage('Select a connection first.', false);
            return;
        }

        const identifier = document.getElementById('linkAccountInput').value.trim();
        if (!identifier) {
            flashSystemMessage('Enter an email or username to link.', false);
            return;
        }

        try {
            const res = await fetch('/api/connections/link-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localCsrfToken },
                body: JSON.stringify({ connectionId: activeConnectionId, emailOrUsername: identifier })
            });
            const result = await res.json();
            if (res.ok) {
                flashSystemMessage(result.message, true);
                document.getElementById('linkAccountModal').style.display = 'none';
                document.getElementById('linkAccountInput').value = '';
                await loadActiveConnectionProfile(activeConnectionId);
                await renderConnectionCounters();
                await renderSharedGallery();
            } else {
                flashSystemMessage(result.error || 'Account linking failed.', false);
            }
        } catch (err) {
            flashSystemMessage('Network failure while linking account.', false);
        }
    });
}
