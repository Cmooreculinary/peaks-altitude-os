/* ═══════════════════════════════════════════════════════
   ROUND TABLE — Main Application v2.0
   macOS-Inspired Collaboration Platform
   Communications Hub · Email · Texts · Dark Mode
   Invite System · Contacts · Referrals
   ═══════════════════════════════════════════════════════ */

// ─── State ───
const State = {
  currentView: 'portal',
  currentTable: null,
  currentChat: null,
  walkieOpen: false,
  walkieTalking: false,
  walkieTarget: null,
  videoCallActive: false,
  videoCallTarget: null,
  modalOpen: null,
  members: [],
  tables: [],
  messages: [],
  events: [],
  notifications: [],
  currentUser: null,
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  darkMode: localStorage.getItem('rt-dark-mode') === 'true',
  commsTab: 'email',
  emails: [],
  emailFolder: 'inbox',
  emailReading: null,
  emailComposing: false,
  texts: [],
  currentTextChat: null,
  invites: [],
  contacts: [],
  contactSearch: '',
  referrals: null,
  leaderboard: [],
  // Onboarding
  onboardingStep: 0,
  onboardingComplete: localStorage.getItem('rt-onboarded') === 'true',
  onboardingName: '',
  onboardingColor: '#007AFF',
  onboardingTableName: '',
  onboardingInvited: [],
};

// ─── API ───
let csrfToken = null;
const API = {
  async get(url) { const r = await fetch(url); if (!r.ok) throw new Error(`GET ${url} failed: ${r.status}`); return r.json(); },
  async post(url, data, _retry = false) {
    if (!csrfToken) await API.refreshCsrf();
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(data),
    });
    if (r.status === 403 && !_retry) { await API.refreshCsrf(); return API.post(url, data, true); }
    return r.json();
  },
  async put(url, data, _retry = false) {
    if (!csrfToken) await API.refreshCsrf();
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(data),
    });
    if (r.status === 403 && !_retry) { await API.refreshCsrf(); return API.put(url, data, true); }
    return r.json();
  },
  async refreshCsrf() {
    const r = await fetch('/api/csrf-token');
    const data = await r.json();
    csrfToken = data.token;
  },
};

// ─── Initialize ───
async function init() {
  // Apply dark mode immediately
  if (State.darkMode) document.body.classList.add('dark-mode');

  try {
    const [me, members, tables, messages, events, notifications, emails, texts, invites, contacts, referrals, leaderboard] = await Promise.all([
      API.get('/api/me'),
      API.get('/api/members'),
      API.get('/api/tables'),
      API.get('/api/messages'),
      API.get('/api/events'),
      API.get('/api/notifications'),
      API.get('/api/emails'),
      API.get('/api/texts'),
      API.get('/api/invites'),
      API.get('/api/contacts'),
      API.get('/api/referrals'),
      API.get('/api/referrals/leaderboard'),
    ]);
    State.currentUser = me;
    State.members = members || [];
    State.tables = tables || [];
    State.messages = messages || [];
    State.events = events || [];
    State.notifications = notifications || [];
    State.emails = emails || [];
    State.texts = texts || [];
    State.invites = invites || [];
    State.contacts = contacts || [];
    State.referrals = referrals || { invited: 0, joined: 0, badge: 'Newcomer' };
    State.leaderboard = leaderboard || [];
    render();
  } catch (err) {
    console.error('Init error:', err);
    document.getElementById('app').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px;color:var(--text-secondary,#86868B)">
        <i class="fas fa-exclamation-triangle" style="font-size:36px;color:#FF9500"></i>
        <p style="font-size:14px;font-weight:500">Failed to load. Please refresh.</p>
        <button onclick="location.reload()" style="padding:8px 20px;background:#007AFF;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit">Retry</button>
      </div>
    `;
  }
}

// ─── Render ───
function render() {
  const app = document.getElementById('app');
  
  // Show onboarding if not completed
  if (!State.onboardingComplete) {
    app.innerHTML = renderOnboarding();
    return;
  }
  
  app.innerHTML = `
    ${renderTitleBar()}
    <div class="main-layout">
      ${renderSidebar()}
      <div class="content-area">
        ${renderContentHeader()}
        <div class="content-body">
          ${renderContent()}
        </div>
      </div>
    </div>
    ${renderDock()}
    ${renderWalkiePanel()}
    ${renderPingNotification()}
    ${renderModal()}
    ${renderVideoCall()}
  `;
  attachEvents();
}

// ═══════════════════════════════════════════════════════
// ONBOARDING WIZARD (5-Step)
// ═══════════════════════════════════════════════════════
function renderOnboarding() {
  const steps = [
    { title: 'Welcome to Round Table', subtitle: 'Your private collaboration space for family, faith, and teams.' },
    { title: 'Who are you?', subtitle: 'Set up your profile so others can recognize you.' },
    { title: 'Pick your color', subtitle: 'Choose a color that represents you at the table.' },
    { title: 'Create your first table', subtitle: 'A table is a shared space for your group.' },
    { title: 'Invite someone', subtitle: 'Round Table is better together. Invite a friend or family member.' },
  ];
  const step = steps[State.onboardingStep];
  const progress = ((State.onboardingStep + 1) / steps.length) * 100;
  const colors = ['#007AFF','#34C759','#FF9500','#AF52DE','#FF3B30','#FF2D55','#5AC8FA','#FFCC00'];
  const initials = State.onboardingName.trim()
    ? State.onboardingName.trim().split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()
    : '';
  
  return `
    <div class="onboarding-container">
      <div class="onboarding-card">
        <div class="onboarding-progress">
          <div class="onboarding-progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="onboarding-steps-dots">
          ${steps.map((_, i) => `<div class="onboarding-dot ${i === State.onboardingStep ? 'active' : ''} ${i < State.onboardingStep ? 'done' : ''}"></div>`).join('')}
        </div>
        
        <div class="onboarding-body">
          ${State.onboardingStep === 0 ? `
            <div class="onboarding-hero">
              <div class="onboarding-logo">
                <i class="fas fa-circle-nodes"></i>
              </div>
              <h1>${step.title}</h1>
              <p>${step.subtitle}</p>
              <div class="onboarding-features">
                <div class="onboarding-feature"><i class="fas fa-users"></i><span>Private group spaces</span></div>
                <div class="onboarding-feature"><i class="fas fa-share-alt"></i><span>Share files, photos & more</span></div>
                <div class="onboarding-feature"><i class="fas fa-walkie-talkie"></i><span>Instant walkie-talkie</span></div>
                <div class="onboarding-feature"><i class="fas fa-calendar"></i><span>Shared calendar</span></div>
                <div class="onboarding-feature"><i class="fas fa-envelope"></i><span>Built-in messaging</span></div>
                <div class="onboarding-feature"><i class="fas fa-shield-halved"></i><span>Private & secure</span></div>
              </div>
            </div>
          ` : State.onboardingStep === 1 ? `
            <div class="onboarding-form">
              <div class="onboarding-avatar-preview" id="obAvatar" style="background:${State.onboardingColor}">
                ${initials || '<i class="fas fa-user"></i>'}
              </div>
              <h2>${step.title}</h2>
              <p>${step.subtitle}</p>
              <input type="text" class="onboarding-input" id="obName" placeholder="Your full name" value="${State.onboardingName}" oninput="updateNamePreview(this.value)">
            </div>
          ` : State.onboardingStep === 2 ? `
            <div class="onboarding-form">
              <div class="onboarding-avatar-preview" id="obAvatar" style="background:${State.onboardingColor}">
                ${initials || 'YO'}
              </div>
              <h2>${step.title}</h2>
              <p>${step.subtitle}</p>
              <div class="onboarding-colors">
                ${colors.map(c => `
                  <button class="onboarding-color-btn ${State.onboardingColor === c ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="selectOnboardColor('${c}')"></button>
                `).join('')}
              </div>
            </div>
          ` : State.onboardingStep === 3 ? `
            <div class="onboarding-form">
              <div class="onboarding-table-preview" id="obTablePreview" style="border-color:${State.onboardingColor}">
                <i class="fas fa-circle-nodes" style="color:${State.onboardingColor}"></i>
              </div>
              <h2>${step.title}</h2>
              <p>${step.subtitle}</p>
              <input type="text" class="onboarding-input" id="obTable" placeholder="e.g. Family Circle, Project Team, Study Group" value="${State.onboardingTableName}" oninput="State.onboardingTableName=this.value">
              <div class="onboarding-suggestions">
                ${['Family Circle','Faith Group','Work Team','Friend Group','Study Group'].map(s => `
                  <button class="onboarding-suggestion" onclick="pickTableSuggestion('${s}')">${s}</button>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="onboarding-form">
              <div class="onboarding-invite-icon">
                <i class="fas fa-paper-plane"></i>
              </div>
              <h2>${step.title}</h2>
              <p>${step.subtitle}</p>
              <input type="email" class="onboarding-input" id="obInviteEmail" placeholder="friend@email.com" onkeypress="if(event.key==='Enter')addOnboardInvite()">
              <button class="onboarding-add-btn" onclick="addOnboardInvite()"><i class="fas fa-plus"></i> Add</button>
              <div class="onboarding-invited-list" id="obInvitedList">
                ${State.onboardingInvited.map((email, i) => `
                  <div class="onboarding-invited-item">
                    <i class="fas fa-check-circle" style="color:var(--mac-green)"></i>
                    <span>${email}</span>
                    <button onclick="removeOnboardInvite(${i})" style="background:none;border:none;color:var(--mac-red);cursor:pointer;font-size:12px"><i class="fas fa-times"></i></button>
                  </div>
                `).join('')}
              </div>
              <p class="onboarding-skip-hint">You can also skip this and invite people later.</p>
            </div>
          `}
        </div>
        
        <div class="onboarding-footer">
          ${State.onboardingStep > 0 ? `
            <button class="onboarding-btn secondary" onclick="onboardBack()">
              <i class="fas fa-arrow-left"></i> Back
            </button>
          ` : `<button style="background:none;border:none;color:#86868B;font-size:12px;cursor:pointer;font-family:inherit;padding:8px" onclick="skipOnboarding()">Skip Tour</button>`}
          <button class="onboarding-btn primary" onclick="onboardNext()">
            ${State.onboardingStep === steps.length - 1 ? '<i class="fas fa-rocket"></i> Get Started' : 'Continue <i class="fas fa-arrow-right"></i>'}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Onboarding helpers (NO full re-render) ───
function updateNamePreview(value) {
  State.onboardingName = value;
  const avatar = document.getElementById('obAvatar');
  if (avatar) {
    const initials = value.trim() ? value.trim().split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() : '<i class="fas fa-user"></i>';
    avatar.innerHTML = initials;
  }
}

function selectOnboardColor(color) {
  State.onboardingColor = color;
  // Update avatar background
  const avatar = document.getElementById('obAvatar');
  if (avatar) avatar.style.background = color;
  // Update selected state on buttons via data attribute
  document.querySelectorAll('.onboarding-color-btn').forEach(btn => {
    const btnColor = btn.getAttribute('data-color') || '';
    btn.classList.toggle('selected', btnColor === color);
  });
}

function pickTableSuggestion(name) {
  State.onboardingTableName = name;
  const input = document.getElementById('obTable');
  if (input) input.value = name;
}

function removeOnboardInvite(index) {
  State.onboardingInvited.splice(index, 1);
  renderOnboardInviteList();
}

function renderOnboardInviteList() {
  const list = document.getElementById('obInvitedList');
  if (list) {
    list.innerHTML = State.onboardingInvited.map((email, i) => `
      <div class="onboarding-invited-item">
        <i class="fas fa-check-circle" style="color:var(--mac-green)"></i>
        <span>${email}</span>
        <button onclick="removeOnboardInvite(${i})" style="background:none;border:none;color:var(--mac-red);cursor:pointer;font-size:12px"><i class="fas fa-times"></i></button>
      </div>
    `).join('');
  }
}

function onboardBack() {
  // Save input values before navigating
  if (State.onboardingStep === 1) {
    const el = document.getElementById('obName');
    if (el) State.onboardingName = el.value;
  }
  if (State.onboardingStep === 3) {
    const el = document.getElementById('obTable');
    if (el) State.onboardingTableName = el.value;
  }
  State.onboardingStep--;
  render();
}

function onboardNext() {
  // Save input values
  if (State.onboardingStep === 1) {
    const el = document.getElementById('obName');
    if (el) State.onboardingName = el.value;
  }
  if (State.onboardingStep === 3) {
    const el = document.getElementById('obTable');
    if (el) State.onboardingTableName = el.value;
  }
  
  // Validate current step
  if (State.onboardingStep === 1 && !State.onboardingName.trim()) {
    const input = document.getElementById('obName');
    if (input) { input.focus(); input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 500); }
    return;
  }
  
  if (State.onboardingStep === 4) {
    completeOnboarding();
    return;
  }
  
  State.onboardingStep++;
  render();
  // Focus inputs after render
  setTimeout(() => {
    if (State.onboardingStep === 1) document.getElementById('obName')?.focus();
    if (State.onboardingStep === 3) document.getElementById('obTable')?.focus();
    if (State.onboardingStep === 4) document.getElementById('obInviteEmail')?.focus();
  }, 100);
}

function addOnboardInvite() {
  const input = document.getElementById('obInviteEmail');
  const email = input?.value?.trim();
  if (email && email.includes('@') && !State.onboardingInvited.includes(email)) {
    State.onboardingInvited.push(email);
    input.value = '';
    renderOnboardInviteList();
    input.focus();
  }
}

function skipOnboarding() {
  localStorage.setItem('rt-onboarded', 'true');
  State.onboardingComplete = true;
  render();
}

async function completeOnboarding() {
  // Save onboarding state
  localStorage.setItem('rt-onboarded', 'true');
  State.onboardingComplete = true;
  
  // Update user profile with chosen name/color
  if (State.onboardingName) {
    await API.put('/api/me', { name: State.onboardingName, color: State.onboardingColor }).catch(() => {});
    if (State.currentUser) {
      State.currentUser.name = State.onboardingName;
      State.currentUser.color = State.onboardingColor;
      State.currentUser.initials = State.onboardingName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }
  }
  
  // Create first table if name provided
  if (State.onboardingTableName.trim()) {
    const t = await API.post('/api/tables', { name: State.onboardingTableName, color: State.onboardingColor, members: ['user-1'] }).catch(() => null);
    if (t) { t.memberDetails = [State.currentUser]; State.tables.push(t); }
  }
  
  // Invite contacts (simulate)
  for (const email of State.onboardingInvited) {
    await API.post('/api/contacts', { name: email.split('@')[0], email }).catch(() => {});
  }
  
  render();
}

// ─── Title Bar ───
function renderTitleBar() {
  const dm = State.darkMode;
  return `
    <div class="title-bar">
      <div class="traffic-lights">
        <div class="traffic-light tl-close"></div>
        <div class="traffic-light tl-minimize"></div>
        <div class="traffic-light tl-maximize"></div>
      </div>
      <h1>Round Table</h1>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="mac-btn-icon theme-toggle" onclick="toggleDarkMode()" title="${dm ? 'Light Mode' : 'Dark Mode'}">
          <i class="fas ${dm ? 'fa-sun' : 'fa-moon'}"></i>
        </button>
        <button class="mac-btn-icon" onclick="showNotifications()" title="Notifications" style="position:relative">
          <i class="fas fa-bell"></i>
          ${State.notifications.filter(n=>!n.read).length > 0 ? `<span style="position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:var(--mac-red);border:2px solid var(--titlebar-bg)"></span>` : ''}
        </button>
        <button class="mac-btn-icon" onclick="navigate('portal')" title="Portal">
          <i class="fas fa-th-large"></i>
        </button>
      </div>
    </div>
  `;
}

// ─── Sidebar ───
function renderSidebar() {
  const unreadMsgs = State.messages.filter(m => m.from !== 'user-1' && !m.read).length;
  const unreadEmails = State.emails.filter(e => e.folder === 'inbox' && !e.read).length;
  const unreadTexts = State.texts.filter(t => t.from !== 'user-1' && !t.read).length;
  const totalUnread = unreadMsgs + unreadEmails + unreadTexts;
  return `
    <div class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        <div class="sidebar-item ${State.currentView==='portal'?'active':''}" onclick="navigate('portal')">
          <i class="fas fa-home"></i> My Portal
          ${totalUnread > 0 ? `<span class="badge">${totalUnread}</span>` : ''}
        </div>
        <div class="sidebar-item ${State.currentView==='calendar'?'active':''}" onclick="navigate('calendar')">
          <i class="fas fa-calendar"></i> Calendar
        </div>
        <div class="sidebar-item ${State.currentView==='messages'?'active':''}" onclick="navigate('messages')">
          <i class="fas fa-envelope"></i> Messages
          ${unreadMsgs > 0 ? `<span class="badge">${unreadMsgs}</span>` : ''}
        </div>
        <div class="sidebar-item ${State.currentView==='apps'?'active':''}" onclick="navigate('apps')">
          <i class="fas fa-th"></i> Apps
        </div>
        <div class="sidebar-item ${State.currentView==='contacts'?'active':''}" onclick="navigate('contacts')">
          <i class="fas fa-address-book"></i> Contacts
        </div>
      </div>

      <div class="sidebar-section">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 8px;margin-bottom:4px;">
          <span class="sidebar-label" style="padding:0;margin:0">Round Tables</span>
          <button class="mac-btn-icon" onclick="openModal('newTable')" style="width:20px;height:20px;font-size:11px">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>

      <div class="sidebar-tables">
        ${State.tables.map(t => {
          const isLive = t.active;
          const liveClass = isLive ? 'live' : 'dormant';
          const onlineCount = isLive ? (t.activeMembers?.length || 0) : 0;
          return `
          <div class="sidebar-table-item ${liveClass} ${State.currentView==='table'&&State.currentTable===t.id?'active':''}" onclick="navigateTable('${t.id}')">
            <div class="table-dot ${liveClass}" style="background:${isLive ? 'var(--mac-green)' : t.color}"></div>
            <span style="flex:1;font-size:13px">${t.name}</span>
            ${isLive ? `<span style="font-size:9px;color:var(--mac-green);font-weight:600;margin-right:4px">${onlineCount} on</span>` : ''}
            <span class="member-count">${t.members.length}</span>
          </div>
        `}).join('')}
      </div>

      <div class="sidebar-profile" onclick="navigate('portal')">
        <div class="profile-avatar" style="background:${State.currentUser?.color || '#007AFF'}">
          ${State.currentUser?.initials || 'YO'}
        </div>
        <div class="profile-info">
          <div class="profile-name">${State.currentUser?.name || 'You'}</div>
          <div class="profile-status"><span class="status-dot"></span>Online</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Content Header ───
function renderContentHeader() {
  const titles = {
    portal: 'My Portal',
    calendar: 'Shared Calendar',
    messages: 'Messages',
    apps: 'App Launcher',
    contacts: 'Contacts',
    table: State.tables.find(t => t.id === State.currentTable)?.name || 'Round Table',
    notifications: 'Notifications',
  };
  const t = State.currentView === 'table' ? State.tables.find(t => t.id === State.currentTable) : null;
  const tLive = t?.active;
  return `
    <div class="content-header">
      <h2>${titles[State.currentView] || 'Round Table'}</h2>
      ${State.currentView === 'table' && t ? `
        <span class="header-live-indicator ${tLive ? 'live' : 'dormant'}">
          <span class="indicator-dot"></span>
          ${tLive ? `Live · ${t.activeMembers?.length || 0} active` : 'Dormant'}
        </span>
      ` : ''}
      <div style="flex:1"></div>
      ${State.currentView === 'table' && t ? `
        <div style="display:flex;gap:4px;align-items:center;margin-right:12px;">
          ${t.memberDetails?.map(m => `
            <div style="width:28px;height:28px;border-radius:50%;background:${m?.color};display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:600;border:2px solid var(--card-bg);margin-left:-6px;box-shadow:0 1px 3px rgba(0,0,0,0.15)" title="${m?.name}">${m?.initials}</div>
          `).join('') || ''}
        </div>
        <button class="mac-btn mac-btn-secondary" style="margin-right:6px" onclick="openModal('invite')">
          <i class="fas fa-share-alt"></i> Invite
        </button>
        <button class="mac-btn mac-btn-primary" onclick="openModal('shareItem')">
          <i class="fas fa-plus"></i> Share Item
        </button>
      ` : ''}
      ${State.currentView === 'calendar' ? `
        <button class="mac-btn mac-btn-primary" onclick="openModal('newEvent')">
          <i class="fas fa-plus"></i> New Event
        </button>
      ` : ''}
    </div>
  `;
}

// ─── Content Router ───
function renderContent() {
  switch (State.currentView) {
    case 'portal': return renderPortal();
    case 'calendar': return renderCalendar();
    case 'messages': return renderMessages();
    case 'apps': return renderApps();
    case 'contacts': return renderContacts();
    case 'table': return renderTable();
    case 'notifications': return renderNotificationsPage();
    default: return renderPortal();
  }
}

// ═══════════════════════════════════════════════════════
// PORTAL VIEW — COMMUNICATIONS HUB
// ═══════════════════════════════════════════════════════
function renderPortal() {
  const recentItems = State.tables.flatMap(t => t.items.map(i => ({...i, tableName: t.name, tableColor: t.color}))).sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);
  const todayEvents = State.events.filter(e => e.date === new Date().toISOString().split('T')[0]);
  const unreadEmails = State.emails.filter(e => e.folder === 'inbox' && !e.read).length;
  const unreadTexts = State.texts.filter(t => t.from !== 'user-1' && !t.read).length;
  const unreadChats = State.messages.filter(m => m.from !== 'user-1' && !m.read).length;

  return `
    <div class="animate-fade">
      <!-- ═══ COMMUNICATIONS HUB ═══ -->
      <div class="comms-hub">
        <div class="comms-tabs">
          <button class="comms-tab ${State.commsTab==='email'?'active':''}" onclick="switchCommsTab('email')">
            <i class="fas fa-envelope"></i> Email
            ${unreadEmails > 0 ? `<span class="comms-badge">${unreadEmails}</span>` : ''}
          </button>
          <button class="comms-tab ${State.commsTab==='texts'?'active':''}" onclick="switchCommsTab('texts')">
            <i class="fas fa-comment-sms"></i> Texts
            ${unreadTexts > 0 ? `<span class="comms-badge">${unreadTexts}</span>` : ''}
          </button>
          <button class="comms-tab ${State.commsTab==='chat'?'active':''}" onclick="switchCommsTab('chat')">
            <i class="fas fa-comments"></i> Chat
            ${unreadChats > 0 ? `<span class="comms-badge">${unreadChats}</span>` : ''}
          </button>
          <button class="comms-tab ${State.commsTab==='walkie'?'active':''}" onclick="switchCommsTab('walkie')">
            <i class="fas fa-walkie-talkie"></i> Walkie
          </button>
        </div>
        <div class="comms-body">
          ${renderCommsContent()}
        </div>
      </div>

      <!-- ═══ DASHBOARD WIDGETS ═══ -->
      <div class="portal-grid" style="margin-top:16px">
        <!-- Today's Schedule -->
        <div class="portal-widget">
          <div class="widget-header">
            <i class="fas fa-calendar-day" style="color:var(--mac-accent)"></i>
            <h3>Today</h3>
            <span style="font-size:11px;color:var(--text-secondary)">${new Date().toLocaleDateString('en-US', {weekday:'long', month:'short', day:'numeric'})}</span>
          </div>
          <div class="widget-body">
            ${todayEvents.length > 0 ? todayEvents.map(e => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light)">
                <div style="width:4px;height:28px;border-radius:2px;background:${e.color}"></div>
                <div style="flex:1">
                  <div style="font-size:12px;font-weight:500">${e.title}</div>
                  <div style="font-size:10px;color:var(--text-secondary)">${e.time} · ${e.tableName || ''}</div>
                </div>
              </div>
            `).join('') : '<p style="font-size:12px;color:var(--text-secondary);text-align:center;padding:12px 0">No events today</p>'}
          </div>
        </div>

        <!-- Recent Shared Items -->
        <div class="portal-widget">
          <div class="widget-header">
            <i class="fas fa-clock-rotate-left" style="color:var(--mac-orange)"></i>
            <h3>Recent on Tables</h3>
          </div>
          <div class="widget-body">
            ${recentItems.map(item => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);cursor:pointer" class="hover-highlight">
                <div style="width:32px;height:32px;border-radius:8px;background:${getItemColor(item.type)};display:flex;align-items:center;justify-content:center;font-size:12px;color:white">
                  <i class="${getItemIcon(item.type)}"></i>
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name}</div>
                  <div style="font-size:10px;color:var(--text-secondary)">${item.tableName} · ${timeAgo(item.timestamp)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- My Tables Overview -->
        <div class="portal-widget">
          <div class="widget-header">
            <i class="fas fa-users" style="color:var(--mac-purple)"></i>
            <h3>My Tables</h3>
          </div>
          <div class="widget-body">
            ${State.tables.map(t => {
              const isLive = t.active;
              const liveClass = isLive ? 'live' : 'dormant';
              const activeMemberDetails = (t.activeMembers || []).map(mid => State.members.find(m => m.id === mid)).filter(Boolean);
              return `
              <div class="portal-table-row ${liveClass}" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-light);cursor:pointer" onclick="navigateTable('${t.id}')">
                <div class="portal-table-icon ${liveClass}" style="width:36px;height:36px;border-radius:10px;background:${t.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <i class="fas fa-circle-nodes" style="color:white;font-size:14px"></i>
                </div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-size:12px;font-weight:500">${t.name}</span>
                    <span class="live-badge ${liveClass}"><span class="badge-dot"></span>${isLive ? 'Live' : 'Idle'}</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-secondary)">
                    ${t.members.length} members · ${t.items.length} items${isLive ? ` · <span style="color:var(--mac-green);font-weight:500">${activeMemberDetails.length} active now</span>` : ` · ${timeAgo(t.lastActivity || 0)}`}
                  </div>
                  ${isLive && activeMemberDetails.length > 0 ? `
                    <div class="active-members-row">
                      ${activeMemberDetails.slice(0,5).map(m => `<div class="active-member-pip" style="background:${m.color}" title="${m.name}">${m.initials}</div>`).join('')}
                    </div>
                  ` : ''}
                </div>
                <i class="fas fa-chevron-right" style="font-size:10px;color:var(--text-secondary)"></i>
              </div>
            `}).join('')}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="portal-widget">
          <div class="widget-header">
            <i class="fas fa-bolt" style="color:var(--mac-yellow)"></i>
            <h3>Quick Actions</h3>
          </div>
          <div class="widget-body" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button class="mac-btn mac-btn-secondary" style="justify-content:center;padding:10px" onclick="openModal('newTable')">
              <i class="fas fa-plus-circle"></i> New Table
            </button>
            <button class="mac-btn mac-btn-secondary" style="justify-content:center;padding:10px" onclick="openModal('newEvent')">
              <i class="fas fa-calendar-plus"></i> New Event
            </button>
            <button class="mac-btn mac-btn-secondary" style="justify-content:center;padding:10px" onclick="openModal('invite')">
              <i class="fas fa-share-alt"></i> Invite
            </button>
            <button class="mac-btn mac-btn-secondary" style="justify-content:center;padding:10px" onclick="navigate('contacts')">
              <i class="fas fa-address-book"></i> Contacts
            </button>
            <button class="mac-btn mac-btn-secondary" style="justify-content:center;padding:10px" onclick="toggleWalkie()">
              <i class="fas fa-walkie-talkie"></i> Walkie Talkie
            </button>
            <button class="mac-btn mac-btn-secondary" style="justify-content:center;padding:10px" onclick="navigate('apps')">
              <i class="fas fa-th"></i> Apps
            </button>
          </div>
        </div>

        <!-- Invite & Referrals -->
        <div class="portal-widget">
          <div class="widget-header">
            <i class="fas fa-trophy" style="color:var(--mac-yellow)"></i>
            <h3>Invites & Referrals</h3>
          </div>
          <div class="widget-body">
            ${State.referrals ? `
              <div style="display:flex;align-items:center;gap:16px;padding:8px 0;border-bottom:1px solid var(--border-light)">
                <div style="text-align:center">
                  <div style="font-size:24px;font-weight:700;color:var(--mac-accent)">${State.referrals.invited}</div>
                  <div style="font-size:9px;color:var(--text-secondary);text-transform:uppercase">Invited</div>
                </div>
                <div style="text-align:center">
                  <div style="font-size:24px;font-weight:700;color:var(--mac-green)">${State.referrals.joined}</div>
                  <div style="font-size:9px;color:var(--text-secondary);text-transform:uppercase">Joined</div>
                </div>
                <div style="flex:1;text-align:right">
                  <div class="referral-badge">${State.referrals.badge || 'Newcomer'}</div>
                  <div style="font-size:9px;color:var(--text-secondary);margin-top:2px">${getReferralProgress(State.referrals.joined)}</div>
                </div>
              </div>
            ` : ''}
            <div style="padding-top:8px">
              <div style="font-size:10px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Top Inviters</div>
              ${State.leaderboard.slice(0,3).map((entry, i) => `
                <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
                  <span style="font-size:12px;font-weight:700;color:${i===0?'var(--mac-yellow)':i===1?'var(--mac-gray)':'var(--mac-orange)'};width:16px">${i+1}</span>
                  <div style="width:24px;height:24px;border-radius:50%;background:${entry.member?.color};display:flex;align-items:center;justify-content:center;font-size:8px;color:white;font-weight:600">${entry.member?.initials}</div>
                  <span style="font-size:11px;flex:1">${entry.member?.name}</span>
                  <span style="font-size:10px;color:var(--mac-green);font-weight:600">${entry.joined} joined</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="portal-widget">
          <div class="widget-header">
            <i class="fas fa-bell" style="color:var(--mac-red)"></i>
            <h3>Notifications</h3>
          </div>
          <div class="widget-body">
            ${State.notifications.slice(0,4).map(n => {
              const from = State.members.find(m => m.id === n.from);
              const icon = n.type === 'walkie' ? 'fa-walkie-talkie' : n.type === 'share' ? 'fa-share' : 'fa-calendar';
              return `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);opacity:${n.read?'0.6':'1'}">
                  <div style="width:28px;height:28px;border-radius:50%;background:${from?.color || '#8E8E93'};display:flex;align-items:center;justify-content:center;font-size:10px;color:white">
                    <i class="fas ${icon}"></i>
                  </div>
                  <div style="flex:1">
                    <div style="font-size:11px;${n.read?'':'font-weight:500'}">${n.message}</div>
                    <div style="font-size:9px;color:var(--text-secondary)">${timeAgo(n.timestamp)}</div>
                  </div>
                  ${!n.read ? '<div style="width:6px;height:6px;border-radius:50%;background:var(--mac-accent)"></div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// COMMUNICATIONS HUB CONTENT
// ═══════════════════════════════════════════════════════
function renderCommsContent() {
  switch (State.commsTab) {
    case 'email': return renderCommsEmail();
    case 'texts': return renderCommsTexts();
    case 'chat': return renderCommsChat();
    case 'walkie': return renderCommsWalkie();
    default: return renderCommsEmail();
  }
}

// ─── Email Tab ───
function renderCommsEmail() {
  if (State.emailComposing) return renderEmailCompose();
  if (State.emailReading) return renderEmailRead();

  const folderEmails = State.emailFolder === 'starred'
    ? State.emails.filter(e => e.starred)
    : State.emails.filter(e => e.folder === State.emailFolder);

  return `
    <div class="comms-email">
      <div class="email-toolbar">
        <div class="email-folders">
          <button class="email-folder-btn ${State.emailFolder==='inbox'?'active':''}" onclick="switchEmailFolder('inbox')">
            Inbox <span class="email-count">${State.emails.filter(e=>e.folder==='inbox'&&!e.read).length}</span>
          </button>
          <button class="email-folder-btn ${State.emailFolder==='sent'?'active':''}" onclick="switchEmailFolder('sent')">Sent</button>
          <button class="email-folder-btn ${State.emailFolder==='starred'?'active':''}" onclick="switchEmailFolder('starred')">
            <i class="fas fa-star" style="font-size:10px"></i> Starred
          </button>
        </div>
        <button class="mac-btn mac-btn-primary" style="font-size:11px;padding:4px 12px" onclick="State.emailComposing=true;render()">
          <i class="fas fa-pen"></i> Compose
        </button>
      </div>
      <div class="email-list">
        ${folderEmails.length > 0 ? folderEmails.map(email => {
          const person = State.members.find(m => m.id === (email.folder === 'sent' ? email.to : email.from));
          return `
            <div class="email-row ${!email.read ? 'unread' : ''}" onclick="readEmail('${email.id}')">
              <div class="email-avatar" style="background:${person?.color || '#8E8E93'}">${person?.initials || '?'}</div>
              <div class="email-content">
                <div class="email-top">
                  <span class="email-sender">${email.folder === 'sent' ? 'To: ' : ''}${person?.name || 'Unknown'}</span>
                  <span class="email-time">${timeAgo(email.timestamp)}</span>
                </div>
                <div class="email-subject">${email.subject}</div>
                <div class="email-preview">${email.body.substring(0, 80)}...</div>
              </div>
              <button class="email-star ${email.starred ? 'starred' : ''}" onclick="event.stopPropagation();toggleStar('${email.id}')">
                <i class="fas fa-star"></i>
              </button>
            </div>
          `;
        }).join('') : '<div class="email-empty"><i class="fas fa-inbox"></i><p>No emails here</p></div>'}
      </div>
    </div>
  `;
}

function renderEmailRead() {
  const email = State.emails.find(e => e.id === State.emailReading);
  if (!email) return '';
  const person = State.members.find(m => m.id === (email.folder === 'sent' ? email.to : email.from));
  return `
    <div class="email-read">
      <div class="email-read-toolbar">
        <button class="mac-btn mac-btn-secondary" style="font-size:11px" onclick="State.emailReading=null;render()">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <div style="flex:1"></div>
        <button class="mac-btn mac-btn-secondary" style="font-size:11px" onclick="replyToEmail('${email.id}')">
          <i class="fas fa-reply"></i> Reply
        </button>
        <button class="email-star ${email.starred?'starred':''}" onclick="toggleStar('${email.id}')">
          <i class="fas fa-star"></i>
        </button>
      </div>
      <div class="email-read-header">
        <div class="email-avatar" style="background:${person?.color};width:40px;height:40px;font-size:14px">${person?.initials}</div>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:600">${email.subject}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${email.folder === 'sent' ? 'To' : 'From'}: ${person?.name} · ${new Date(email.timestamp).toLocaleString()}</div>
        </div>
      </div>
      <div class="email-read-body">${email.body.replace(/\n/g, '<br>')}</div>
    </div>
  `;
}

function renderEmailCompose() {
  return `
    <div class="email-compose">
      <div class="email-read-toolbar">
        <button class="mac-btn mac-btn-secondary" style="font-size:11px" onclick="State.emailComposing=false;render()">
          <i class="fas fa-arrow-left"></i> Cancel
        </button>
        <span style="font-size:13px;font-weight:600;flex:1;text-align:center">New Email</span>
        <button class="mac-btn mac-btn-primary" style="font-size:11px" onclick="sendEmail()">
          <i class="fas fa-paper-plane"></i> Send
        </button>
      </div>
      <div class="compose-fields">
        <div class="compose-field">
          <label>To</label>
          <select id="emailTo" class="compose-input">
            ${State.members.filter(m=>m.id!=='user-1').map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
          </select>
        </div>
        <div class="compose-field">
          <label>Subject</label>
          <input type="text" id="emailSubject" class="compose-input" placeholder="Subject...">
        </div>
        <textarea id="emailBody" class="compose-textarea" placeholder="Write your email..."></textarea>
      </div>
    </div>
  `;
}

// ─── Texts Tab ───
function renderCommsTexts() {
  const otherMembers = State.members.filter(m => m.id !== 'user-1');
  const textMember = State.currentTextChat ? State.members.find(m => m.id === State.currentTextChat) : null;
  const chatTexts = State.currentTextChat ? State.texts.filter(t =>
    (t.from === 'user-1' && t.to === State.currentTextChat) ||
    (t.from === State.currentTextChat && t.to === 'user-1')
  ).sort((a,b) => a.timestamp - b.timestamp) : [];

  return `
    <div class="comms-texts">
      <div class="texts-sidebar">
        ${otherMembers.map(m => {
          const lastText = State.texts.filter(t =>
            (t.from === m.id && t.to === 'user-1') || (t.from === 'user-1' && t.to === m.id)
          ).sort((a,b) => b.timestamp - a.timestamp)[0];
          const unread = State.texts.some(t => t.from === m.id && t.to === 'user-1' && !t.read);
          return `
            <div class="text-thread ${State.currentTextChat===m.id?'active':''} ${unread?'unread':''}" onclick="openTextChat('${m.id}')">
              <div class="thread-avatar" style="background:${m.color}">${m.initials}</div>
              <div class="thread-info">
                <div class="thread-name">${m.name}</div>
                <div class="thread-preview">${lastText?.text || 'No texts yet'}</div>
              </div>
              ${unread ? '<div class="unread-dot"></div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div class="texts-chat">
        ${textMember ? `
          <div class="text-chat-header">
            <div style="width:28px;height:28px;border-radius:50%;background:${textMember.color};display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:600">${textMember.initials}</div>
            <span style="font-size:13px;font-weight:600">${textMember.name}</span>
            <span class="sms-label">SMS</span>
          </div>
          <div class="text-chat-messages" id="textMessages">
            ${chatTexts.map(t => `
              <div class="text-bubble ${t.from==='user-1'?'sent':'received'}">
                ${t.text}
                <div style="font-size:8px;opacity:0.5;margin-top:2px">${new Date(t.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            `).join('')}
          </div>
          <div class="text-input-area">
            <input type="text" class="text-input" id="textInput" placeholder="Text ${textMember.name}..." onkeypress="if(event.key==='Enter')sendText()">
            <button class="text-send-btn" onclick="sendText()"><i class="fas fa-arrow-up"></i></button>
          </div>
        ` : `
          <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-secondary)">
            <i class="fas fa-comment-sms" style="font-size:36px;opacity:0.2"></i>
            <p style="font-size:13px">Select a conversation</p>
          </div>
        `}
      </div>
    </div>
  `;
}

// ─── Chat Tab (in comms hub) ───
function renderCommsChat() {
  const unreadMsgs = State.messages.filter(m => m.from !== 'user-1' && !m.read);
  const otherMembers = State.members.filter(m => m.id !== 'user-1');
  return `
    <div class="comms-chat-preview">
      ${unreadMsgs.length > 0 ? `
        <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px">Unread Messages</div>
        ${unreadMsgs.slice(0,4).map(m => {
          const from = State.members.find(mb => mb.id === m.from);
          return `
            <div class="comms-chat-row" onclick="navigate('messages');setTimeout(()=>openChat('${m.from}'),100)">
              <div style="width:32px;height:32px;border-radius:50%;background:${from?.color};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600">${from?.initials}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600">${from?.name}</div>
                <div style="font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.text}</div>
              </div>
              <span style="font-size:10px;color:var(--text-secondary)">${timeAgo(m.timestamp)}</span>
            </div>
          `;
        }).join('')}
      ` : '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:12px"><i class="fas fa-check-circle" style="font-size:20px;opacity:0.3;display:block;margin-bottom:6px"></i>All caught up!</div>'}
      <div style="margin-top:12px;text-align:center">
        <button class="mac-btn mac-btn-secondary" onclick="navigate('messages')">
          <i class="fas fa-comments"></i> Open Messages
        </button>
      </div>
    </div>
  `;
}

// ─── Walkie Tab (in comms hub) ───
function renderCommsWalkie() {
  const onlineMembers = State.members.filter(m => m.id !== 'user-1' && m.status !== 'offline');
  return `
    <div class="comms-walkie-preview">
      <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px">Online Now</div>
      ${onlineMembers.map(m => `
        <div class="comms-walkie-row" onclick="startWalkieWith('${m.id}')">
          <div style="width:32px;height:32px;border-radius:50%;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600">${m.initials}</div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:500">${m.name}</div>
            <div style="font-size:10px;color:${m.status==='online'?'var(--mac-green)':'var(--mac-orange)'}">${m.status}</div>
          </div>
          <button class="mac-btn mac-btn-primary" style="font-size:10px;padding:4px 10px" onclick="event.stopPropagation();startWalkieWith('${m.id}')">
            <i class="fas fa-walkie-talkie"></i> Talk
          </button>
        </div>
      `).join('')}
      ${onlineMembers.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:12px">No one online right now</div>' : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// CONTACTS VIEW
// ═══════════════════════════════════════════════════════
function renderContacts() {
  const filtered = State.contacts.filter(c =>
    c.name.toLowerCase().includes(State.contactSearch.toLowerCase())
  );
  const members = filtered.filter(c => c.isMember);
  const nonMembers = filtered.filter(c => !c.isMember);

  return `
    <div class="animate-fade" style="max-width:700px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="flex:1;display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--input-bg);border-radius:8px;border:1px solid var(--border-color)">
          <i class="fas fa-search" style="font-size:12px;color:var(--text-secondary)"></i>
          <input type="text" placeholder="Search contacts..." value="${State.contactSearch}" style="border:none;background:none;font-size:13px;outline:none;width:100%;font-family:inherit;color:var(--text-primary)" oninput="filterContacts(this.value)">
        </div>
        <button class="mac-btn mac-btn-primary" onclick="openModal('addContact')">
          <i class="fas fa-plus"></i> Add Contact
        </button>
      </div>

      ${members.length > 0 ? `
        <div class="mac-card" style="margin-bottom:16px">
          <div class="mac-card-header">
            <h3><i class="fas fa-check-circle" style="color:var(--mac-green);margin-right:6px"></i>On Round Table (${members.length})</h3>
          </div>
          <div class="mac-card-body" style="padding:0">
            ${members.map(c => renderContactRow(c)).join('')}
          </div>
        </div>
      ` : ''}

      <div class="mac-card">
        <div class="mac-card-header">
          <h3><i class="fas fa-user-plus" style="color:var(--mac-accent);margin-right:6px"></i>Not Yet on Round Table (${nonMembers.length})</h3>
        </div>
        <div class="mac-card-body" style="padding:0">
          ${nonMembers.length > 0 ? nonMembers.map(c => renderContactRow(c)).join('') : '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px">No contacts to invite</div>'}
        </div>
      </div>
    </div>
  `;
}

function renderContactRow(c) {
  const color = c.isMember ? (State.members.find(m => m.id === c.memberId)?.color || '#8E8E93') : '#8E8E93';
  const initials = c.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border-light)">
      <div style="width:36px;height:36px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:600">${initials}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px">
          ${c.name}
          ${c.isMember ? '<i class="fas fa-check-circle" style="color:var(--mac-green);font-size:10px"></i>' : ''}
        </div>
        <div style="font-size:11px;color:var(--text-secondary)">${c.phone || ''} ${c.phone && c.email ? '·' : ''} ${c.email || ''}</div>
      </div>
      ${c.isMember ? `
        <button class="mac-btn mac-btn-secondary" style="font-size:10px;padding:4px 10px" onclick="navigate('messages');setTimeout(()=>openChat('${c.memberId}'),100)">
          <i class="fas fa-comment"></i> Chat
        </button>
      ` : `
        <button class="mac-btn mac-btn-primary" style="font-size:10px;padding:4px 10px" onclick="inviteContact('${c.id}')">
          <i class="fas fa-paper-plane"></i> Invite
        </button>
      `}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// ROUND TABLE VISUALIZATION (unchanged core, updated classes)
// ═══════════════════════════════════════════════════════
function renderTable() {
  const table = State.tables.find(t => t.id === State.currentTable);
  if (!table) return '<p>Table not found</p>';
  const memberCount = table.members.length;
  const tableSize = Math.max(180, 120 + memberCount * 40);
  const itemCount = table.items.length;
  const isLive = table.active;
  const liveClass = isLive ? 'live' : 'dormant';
  const activeMemberDetails = (table.activeMembers || []).map(mid => State.members.find(m => m.id === mid)).filter(Boolean);

  return `
    <div class="table-scene ${liveClass} animate-scale">
      <div class="table-status-banner ${liveClass}">
        <span class="status-pulse"></span>
        ${isLive ? `<span>Live now · ${activeMemberDetails.length} member${activeMemberDetails.length !== 1 ? 's' : ''} active</span>` : `<span>Dormant · Last active ${timeAgo(table.lastActivity || 0)}</span>`}
      </div>
      <div class="table-container" style="width:${tableSize + 160}px;height:${tableSize + 160}px;position:relative">
        <div class="table-glow-ring ${liveClass}" style="width:${tableSize + 24}px;height:${tableSize + 24}px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)"></div>
        <div class="round-table ${liveClass}" style="width:${tableSize}px;height:${tableSize}px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:6">
            <div style="text-align:center">
              ${isLive ? `<div style="font-size:10px;color:rgba(52,199,89,0.8);font-weight:600;letter-spacing:1px;margin-bottom:2px">● LIVE</div>` : ''}
              <div style="font-size:11px;color:rgba(255,255,255,${isLive ? '0.7' : '0.35'});font-weight:500;letter-spacing:1px;text-transform:uppercase">${table.name}</div>
              <div style="font-size:9px;color:rgba(255,255,255,${isLive ? '0.45' : '0.2'});margin-top:2px">${itemCount} items shared</div>
            </div>
          </div>
          ${renderTableItems(table.items, tableSize)}
        </div>
        ${renderMemberSeats(table, tableSize)}
      </div>
      <div style="width:100%;max-width:600px;margin-top:24px">
        <div class="mac-card">
          <div class="mac-card-header">
            <h3><i class="fas fa-layer-group" style="margin-right:6px;color:${table.color}"></i>Shared Items</h3>
            <button class="mac-btn mac-btn-primary" onclick="openModal('shareItem')"><i class="fas fa-plus"></i> Add</button>
          </div>
          <div class="mac-card-body" style="padding:0">
            ${table.items.length > 0 ? table.items.sort((a,b)=>b.timestamp-a.timestamp).map(item => {
              const sharer = State.members.find(m => m.id === item.sharedBy);
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border-light);cursor:pointer;transition:background 0.15s" class="hover-highlight">
                  <div style="width:36px;height:36px;border-radius:8px;background:${getItemColor(item.type)};display:flex;align-items:center;justify-content:center;font-size:14px;color:white">
                    <i class="${getItemIcon(item.type)}"></i>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:500">${item.name}</div>
                    <div style="font-size:11px;color:var(--text-secondary)">Shared by ${sharer?.name || 'Unknown'} · ${timeAgo(item.timestamp)}</div>
                  </div>
                  <button class="mac-btn-icon" title="Open"><i class="fas fa-external-link-alt"></i></button>
                  <button class="mac-btn-icon" title="Edit"><i class="fas fa-pen"></i></button>
                </div>
              `;
            }).join('') : '<p style="text-align:center;padding:24px;font-size:13px;color:var(--text-secondary)">No items yet. Share something to the table!</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTableItems(items, tableSize) {
  const radius = tableSize * 0.28;
  const cx = tableSize / 2, cy = tableSize / 2;
  return items.map((item, i) => {
    const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + radius * Math.cos(angle) - 18;
    const y = cy + radius * Math.sin(angle) - 22;
    return `
      <div class="table-item animate-scale delay-${i % 5 + 1}" style="left:${x}px;top:${y}px" title="${item.name}">
        <div class="table-item-icon" style="background:${getItemColor(item.type)}"><i class="${getItemIcon(item.type)}"></i></div>
        <div class="table-item-label">${item.name}</div>
      </div>
    `;
  }).join('');
}

function renderMemberSeats(table, tableSize) {
  const members = table.memberDetails || [];
  const seatRadius = tableSize / 2 + 50;
  const cx = tableSize / 2 + 80, cy = tableSize / 2 + 80;
  const activeIds = table.activeMembers || [];
  const isLive = table.active;
  return members.map((m, i) => {
    if (!m) return '';
    const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + seatRadius * Math.cos(angle) - 22;
    const y = cy + seatRadius * Math.sin(angle) - 30;
    const statusColor = m.status === 'online' ? '#34C759' : m.status === 'away' ? '#FF9500' : '#8E8E93';
    const isMemberActive = isLive && activeIds.includes(m.id);
    return `
      <div class="member-seat ${isMemberActive ? 'is-active' : ''} animate-fade delay-${i % 5 + 1}" style="left:${x}px;top:${y}px" onclick="memberAction('${m.id}')">
        <div class="seat-avatar" style="background:${m.color}">
          ${m.initials}
          <div class="seat-status" style="background:${statusColor}"></div>
          ${isMemberActive ? '<div class="member-active-ring"></div>' : ''}
        </div>
        <div class="seat-name">${m.name}${isMemberActive ? ' <span style="color:var(--mac-green);font-size:9px">●</span>' : ''}</div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// CALENDAR VIEW
// ═══════════════════════════════════════════════════════
function renderCalendar() {
  const month = State.calendarMonth, year = State.calendarYear;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  let cells = '';
  for (let i = firstDay - 1; i >= 0; i--) {
    cells += `<div class="calendar-cell other-month"><span class="calendar-day">${daysInPrev - i}</span></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const dayEvents = State.events.filter(e => e.date === dateStr);
    cells += `
      <div class="calendar-cell ${isToday ? 'today' : ''}" onclick="calendarDayClick('${dateStr}')">
        <span class="calendar-day">${d}</span>
        ${dayEvents.slice(0, 3).map(e => `<div class="calendar-event" style="background:${e.color}" title="${e.title} at ${e.time}">${e.time?.slice(0,5)} ${e.title}</div>`).join('')}
        ${dayEvents.length > 3 ? `<div style="font-size:9px;color:var(--text-secondary);padding:1px 4px">+${dayEvents.length-3} more</div>` : ''}
      </div>
    `;
  }
  const totalCells = firstDay + daysInMonth;
  const remaining = 7 - (totalCells % 7);
  if (remaining < 7) for (let d = 1; d <= remaining; d++) cells += `<div class="calendar-cell other-month"><span class="calendar-day">${d}</span></div>`;

  const tableFilters = State.tables.map(t => `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;background:${t.color}15;color:${t.color};border:1px solid ${t.color}40;cursor:pointer">${t.name}</span>`).join('');

  return `
    <div class="animate-fade">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="mac-btn-icon" onclick="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
          <h3 style="font-size:18px;font-weight:600;min-width:160px;text-align:center">${monthNames[month]} ${year}</h3>
          <button class="mac-btn-icon" onclick="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
          <button class="mac-btn mac-btn-secondary" onclick="goToday()" style="font-size:11px">Today</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${tableFilters}</div>
      </div>
      <div class="calendar-grid">
        <div class="calendar-header-cell">Sun</div><div class="calendar-header-cell">Mon</div><div class="calendar-header-cell">Tue</div><div class="calendar-header-cell">Wed</div><div class="calendar-header-cell">Thu</div><div class="calendar-header-cell">Fri</div><div class="calendar-header-cell">Sat</div>
        ${cells}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// MESSAGES VIEW
// ═══════════════════════════════════════════════════════
function renderMessages() {
  const otherMembers = State.members.filter(m => m.id !== 'user-1');
  const chatMember = State.currentChat ? State.members.find(m => m.id === State.currentChat) : null;
  const chatMessages = State.currentChat ? State.messages.filter(m =>
    (m.from === 'user-1' && m.to === State.currentChat) || (m.from === State.currentChat && m.to === 'user-1')
  ).sort((a,b) => a.timestamp - b.timestamp) : [];

  return `
    <div style="display:flex;height:calc(100vh - 152px);margin:-20px;background:var(--card-bg);border-radius:12px;overflow:hidden;box-shadow:var(--shadow-sm)" class="animate-fade">
      <div style="width:260px;border-right:1px solid var(--border-color);display:flex;flex-direction:column">
        <div style="padding:12px;border-bottom:1px solid var(--border-color)">
          <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--input-bg);border-radius:8px">
            <i class="fas fa-search" style="font-size:11px;color:var(--text-secondary)"></i>
            <input type="text" placeholder="Search messages..." style="border:none;background:none;font-size:12px;outline:none;width:100%;font-family:inherit;color:var(--text-primary)">
          </div>
        </div>
        <div style="flex:1;overflow-y:auto">
          ${otherMembers.map(m => {
            const lastMsg = State.messages.filter(msg => (msg.from === m.id && msg.to === 'user-1') || (msg.from === 'user-1' && msg.to === m.id)).sort((a,b) => b.timestamp - a.timestamp)[0];
            const unread = State.messages.some(msg => msg.from === m.id && msg.to === 'user-1' && !msg.read);
            return `
              <div class="message-thread ${State.currentChat === m.id ? 'active' : ''} ${unread ? 'unread' : ''}" onclick="openChat('${m.id}')">
                <div class="thread-avatar" style="background:${m.color}">${m.initials}</div>
                <div class="thread-info">
                  <div class="thread-name">${m.name}</div>
                  <div class="thread-preview">${lastMsg?.text || 'No messages yet'}</div>
                </div>
                ${lastMsg ? `<span class="thread-time">${timeAgo(lastMsg.timestamp)}</span>` : ''}
                ${unread ? '<div class="unread-dot"></div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="chat-area">
        ${chatMember ? `
          <div class="chat-header">
            <div style="width:32px;height:32px;border-radius:50%;background:${chatMember.color};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600">${chatMember.initials}</div>
            <div><div style="font-size:13px;font-weight:600">${chatMember.name}</div><div style="font-size:10px;color:var(--text-secondary)">${chatMember.status}</div></div>
            <div style="flex:1"></div>
            <button class="mac-btn-icon" onclick="startWalkieWith('${chatMember.id}')" title="Walkie Talkie"><i class="fas fa-walkie-talkie"></i></button>
            <button class="mac-btn-icon" onclick="startVideoCall('${chatMember.id}')" title="Video Call"><i class="fas fa-video"></i></button>
          </div>
          <div class="chat-messages" id="chatMessages">
            ${chatMessages.map(msg => `
              <div class="chat-bubble ${msg.from === 'user-1' ? 'sent' : 'received'}">
                ${msg.text}
                <div style="font-size:9px;opacity:0.6;margin-top:2px;text-align:${msg.from==='user-1'?'right':'left'}">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            `).join('')}
          </div>
          <div class="chat-input-area">
            <button class="mac-btn-icon" title="Attach"><i class="fas fa-paperclip"></i></button>
            <input type="text" class="chat-input" id="chatInput" placeholder="Message ${chatMember.name}..." onkeypress="if(event.key==='Enter')sendMessage()">
            <button class="mac-btn-icon" style="color:var(--mac-accent)" onclick="sendMessage()" title="Send"><i class="fas fa-paper-plane"></i></button>
          </div>
        ` : `
          <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-secondary)">
            <i class="fas fa-comments" style="font-size:48px;opacity:0.2"></i>
            <p style="font-size:14px">Select a conversation</p>
          </div>
        `}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// APPS VIEW
// ═══════════════════════════════════════════════════════
function renderApps() {
  const apps = [
    { name: 'Photos', icon: 'fa-image', color: 'linear-gradient(135deg,#FF2D55,#FF6482)', url: '#' },
    { name: 'Pages', icon: 'fa-file-alt', color: 'linear-gradient(135deg,#FF9500,#FFAA33)', url: '#' },
    { name: 'Numbers', icon: 'fa-table', color: 'linear-gradient(135deg,#34C759,#5AD97A)', url: '#' },
    { name: 'Keynote', icon: 'fa-presentation-screen', color: 'linear-gradient(135deg,#007AFF,#3395FF)', url: '#' },
    { name: 'Google Docs', icon: 'fa-file-lines', color: 'linear-gradient(135deg,#4285F4,#6FA3F7)', url: 'https://docs.google.com' },
    { name: 'Google Sheets', icon: 'fa-grid', color: 'linear-gradient(135deg,#0F9D58,#3AB878)', url: 'https://sheets.google.com' },
    { name: 'Google Slides', icon: 'fa-display', color: 'linear-gradient(135deg,#F4B400,#F7C733)', url: 'https://slides.google.com' },
    { name: 'Google Drive', icon: 'fa-cloud', color: 'linear-gradient(135deg,#4285F4,#34A853)', url: 'https://drive.google.com' },
    { name: 'Google Meet', icon: 'fa-video', color: 'linear-gradient(135deg,#00832D,#34A853)', url: 'https://meet.google.com' },
    { name: 'Google Calendar', icon: 'fa-calendar', color: 'linear-gradient(135deg,#4285F4,#6FA3F7)', url: 'https://calendar.google.com' },
    { name: 'Gmail', icon: 'fa-envelope', color: 'linear-gradient(135deg,#EA4335,#EF6C60)', url: 'https://mail.google.com' },
    { name: 'iCloud', icon: 'fa-cloud', color: 'linear-gradient(135deg,#3693F5,#5AABF7)', url: 'https://www.icloud.com' },
    { name: 'Notes', icon: 'fa-sticky-note', color: 'linear-gradient(135deg,#FFCC00,#FFD633)', url: '#' },
    { name: 'Reminders', icon: 'fa-list-check', color: 'linear-gradient(135deg,#007AFF,#3395FF)', url: '#' },
    { name: 'FaceTime', icon: 'fa-video', color: 'linear-gradient(135deg,#34C759,#5AD97A)', url: '#' },
    { name: 'Files', icon: 'fa-folder', color: 'linear-gradient(135deg,#007AFF,#3395FF)', url: '#' },
    { name: 'Music', icon: 'fa-music', color: 'linear-gradient(135deg,#FC3C44,#FF6B6B)', url: '#' },
    { name: 'Finder', icon: 'fa-face-smile', color: 'linear-gradient(135deg,#4FC3F7,#29B6F6)', url: '#' },
    { name: 'Word', icon: 'fa-file-word', color: 'linear-gradient(135deg,#2B579A,#4180C7)', url: 'https://office.live.com/start/Word.aspx' },
    { name: 'Excel', icon: 'fa-file-excel', color: 'linear-gradient(135deg,#217346,#33A06F)', url: 'https://office.live.com/start/Excel.aspx' },
    { name: 'PowerPoint', icon: 'fa-file-powerpoint', color: 'linear-gradient(135deg,#D24726,#E06B50)', url: 'https://office.live.com/start/PowerPoint.aspx' },
    { name: 'OneDrive', icon: 'fa-cloud', color: 'linear-gradient(135deg,#0078D4,#2B96ED)', url: 'https://onedrive.live.com' },
    { name: 'Teams', icon: 'fa-users', color: 'linear-gradient(135deg,#6264A7,#8183C5)', url: 'https://teams.microsoft.com' },
    { name: 'Outlook', icon: 'fa-envelope', color: 'linear-gradient(135deg,#0078D4,#2B96ED)', url: 'https://outlook.live.com' },
  ];
  return `
    <div class="animate-fade">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="mac-btn mac-btn-primary" style="font-size:11px" data-filter="all" onclick="filterApps(this,'all')">All</button>
        <button class="mac-btn mac-btn-secondary" style="font-size:11px" data-filter="apple" onclick="filterApps(this,'apple')"><i class="fab fa-apple"></i> Apple</button>
        <button class="mac-btn mac-btn-secondary" style="font-size:11px" data-filter="google" onclick="filterApps(this,'google')"><i class="fab fa-google"></i> Google</button>
        <button class="mac-btn mac-btn-secondary" style="font-size:11px" data-filter="microsoft" onclick="filterApps(this,'microsoft')"><i class="fab fa-microsoft"></i> Microsoft</button>
      </div>
      <div class="app-grid">
        ${apps.map(a => `
          <div class="app-icon" onclick="window.open('${a.url}','_blank')">
            <div class="app-icon-img" style="background:${a.color}"><i class="fas ${a.icon}"></i></div>
            <div class="app-icon-label">${a.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// DOCK
// ═══════════════════════════════════════════════════════
function renderDock() {
  const unread = State.messages.filter(m => m.from !== 'user-1' && !m.read).length;
  const notifCount = State.notifications.filter(n => !n.read).length;
  return `
    <div class="mac-dock">
      <div class="dock-item ${State.currentView==='portal'?'active':''}" onclick="navigate('portal')" style="background:linear-gradient(135deg,#007AFF,#5AC8FA);border-radius:12px;color:white">
        <i class="fas fa-home"></i><div class="dock-tooltip">Portal</div>
      </div>
      <div class="dock-item ${State.currentView==='table'?'active':''}" onclick="navigateTable(State.tables[0]?.id)" style="background:linear-gradient(135deg,#8B6914,#6B4F0A);border-radius:12px;color:white">
        <i class="fas fa-circle-nodes"></i><div class="dock-tooltip">Round Table</div>
      </div>
      <div class="dock-item ${State.currentView==='calendar'?'active':''}" onclick="navigate('calendar')" style="background:linear-gradient(135deg,#FF3B30,#FF6482);border-radius:12px;color:white">
        <i class="fas fa-calendar"></i><div class="dock-tooltip">Calendar</div>
      </div>
      <div class="dock-item ${State.currentView==='messages'?'active':''}" onclick="navigate('messages')" style="background:linear-gradient(135deg,#34C759,#5AD97A);border-radius:12px;color:white;position:relative">
        <i class="fas fa-envelope"></i>
        ${unread > 0 ? `<div class="dock-badge">${unread}</div>` : ''}
        <div class="dock-tooltip">Messages</div>
      </div>
      <div class="dock-separator"></div>
      <div class="dock-item" onclick="toggleWalkie()" style="background:linear-gradient(135deg,#FF9500,#FFAA33);border-radius:12px;color:white">
        <i class="fas fa-walkie-talkie"></i><div class="dock-tooltip">Walkie Talkie</div>
      </div>
      <div class="dock-item ${State.currentView==='contacts'?'active':''}" onclick="navigate('contacts')" style="background:linear-gradient(135deg,#5AC8FA,#007AFF);border-radius:12px;color:white">
        <i class="fas fa-address-book"></i><div class="dock-tooltip">Contacts</div>
      </div>
      <div class="dock-item" onclick="navigate('apps')" style="background:linear-gradient(135deg,#AF52DE,#C77EEB);border-radius:12px;color:white">
        <i class="fas fa-th"></i><div class="dock-tooltip">Apps</div>
      </div>
      <div class="dock-item" onclick="showNotifications()" style="background:linear-gradient(135deg,#FF2D55,#FF6482);border-radius:12px;color:white;position:relative">
        <i class="fas fa-bell"></i>
        ${notifCount > 0 ? `<div class="dock-badge">${notifCount}</div>` : ''}
        <div class="dock-tooltip">Notifications</div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// WALKIE TALKIE PANEL
// ═══════════════════════════════════════════════════════
function renderWalkiePanel() {
  const onlineMembers = State.members.filter(m => m.id !== 'user-1' && m.status !== 'offline');
  const target = State.walkieTarget ? State.members.find(m => m.id === State.walkieTarget) : null;
  return `
    <div class="walkie-panel ${State.walkieOpen ? 'active' : ''}">
      <div class="walkie-header">
        <h3><i class="fas fa-walkie-talkie"></i> Walkie Talkie</h3>
        <button class="mac-btn-icon" onclick="toggleWalkie()" style="color:white;margin-left:auto"><i class="fas fa-times"></i></button>
      </div>
      <div class="walkie-body">
        ${!target ? `
          <p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">Choose someone to talk to:</p>
          ${onlineMembers.map(m => `
            <div class="walkie-member" onclick="selectWalkieTarget('${m.id}')">
              <div style="width:32px;height:32px;border-radius:50%;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600">${m.initials}</div>
              <div style="flex:1"><div style="font-size:12px;font-weight:500">${m.name}</div><div style="font-size:10px;color:${m.status==='online'?'var(--mac-green)':'var(--mac-orange)'}">${m.status}</div></div>
            </div>
          `).join('')}
        ` : `
          <div style="text-align:center;padding:8px 0">
            <div style="width:56px;height:56px;border-radius:50%;background:${target.color};display:flex;align-items:center;justify-content:center;font-size:18px;color:white;font-weight:600;margin:0 auto 8px">${target.initials}</div>
            <div style="font-size:14px;font-weight:600">${target.name}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:12px">${State.walkieTalking ? 'Talking...' : 'Hold to talk'}</div>
            <button class="walkie-btn talk ${State.walkieTalking ? 'active' : ''}" onmousedown="startTalking()" onmouseup="stopTalking()" ontouchstart="startTalking()" ontouchend="stopTalking()">
              <i class="fas fa-microphone"></i>
            </button>
            <div style="display:flex;justify-content:center;gap:12px;margin-top:8px">
              <button class="walkie-btn video" onclick="startVideoCall('${target.id}')" title="Video Call"><i class="fas fa-video"></i></button>
              <button style="width:36px;height:36px;border-radius:50%;border:none;background:var(--input-bg);cursor:pointer;font-size:14px;color:var(--text-secondary)" onclick="pingUser('${target.id}')" title="Ping"><i class="fas fa-bell"></i></button>
            </div>
            <button style="margin-top:12px;font-size:11px;color:var(--mac-accent);background:none;border:none;cursor:pointer" onclick="State.walkieTarget=null;render()">← Choose someone else</button>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderPingNotification() { return `<div class="ping-notification" id="pingNotif"></div>`; }

// ═══════════════════════════════════════════════════════
// VIDEO CALL OVERLAY
// ═══════════════════════════════════════════════════════
function renderVideoCall() {
  const target = State.videoCallTarget ? State.members.find(m => m.id === State.videoCallTarget) : null;
  return `
    <div class="video-call-overlay ${State.videoCallActive ? 'active' : ''}">
      ${target ? `
        <div class="video-call-avatar" style="background:${target.color}">${target.initials}</div>
        <div class="video-call-name">${target.name}</div>
        <div class="video-call-status">Connecting...</div>
        <div class="video-call-controls">
          <button class="call-control-btn mute" onclick="toggleMute()"><i class="fas fa-microphone"></i></button>
          <button class="call-control-btn hangup" onclick="endVideoCall()"><i class="fas fa-phone-slash"></i></button>
          <button class="call-control-btn video-toggle"><i class="fas fa-video"></i></button>
        </div>
      ` : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════
function renderModal() {
  if (!State.modalOpen) return '<div class="modal-overlay"></div>';
  let content = '';

  if (State.modalOpen === 'newTable') {
    content = `
      <div class="modal-header"><h3>Create New Round Table</h3><button class="mac-btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Table Name</label><input type="text" class="form-input" id="newTableName" placeholder="e.g. Family, Project Team, Study Group..."></div>
        <div class="form-group"><label class="form-label">Color</label>
          <div class="color-options">${['#007AFF','#34C759','#FF9500','#AF52DE','#FF3B30','#FF2D55','#FFCC00','#5AC8FA'].map((c,i) => `<div class="color-option ${i===0?'selected':''}" style="background:${c}" data-color="${c}" onclick="selectColor(this)"></div>`).join('')}</div>
        </div>
        <div class="form-group"><label class="form-label">Add Members</label>
          <div class="member-chips">${State.members.filter(m=>m.id!=='user-1').map(m => `<div class="member-chip" data-member="${m.id}" onclick="toggleMemberChip(this)"><span class="member-chip-dot" style="background:${m.color}"></span>${m.name}</div>`).join('')}</div>
        </div>
      </div>
      <div class="modal-footer"><button class="mac-btn mac-btn-secondary" onclick="closeModal()">Cancel</button><button class="mac-btn mac-btn-primary" onclick="createTable()">Create Table</button></div>
    `;
  } else if (State.modalOpen === 'shareItem') {
    content = `
      <div class="modal-header"><h3>Share to Table</h3><button class="mac-btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="drop-zone" id="dropZone" onclick="document.getElementById('filePickerHidden').click()" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="event.preventDefault();this.classList.remove('dragover');handleFileDrop(event)">
          <i class="fas fa-cloud-arrow-up"></i><p>Drag & drop files here, or click to browse</p><p style="font-size:11px;margin-top:4px">Photos, Videos, Documents, Audio</p>
        </div>
        <input type="file" id="filePickerHidden" style="display:none" onchange="handleFileSelect(this)" multiple>
        <div style="margin-top:14px;text-align:center;color:var(--text-secondary);font-size:12px">— or share a quick item —</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px">
          ${[{type:'photo',icon:'fa-image',label:'Photo',color:'#FF2D55'},{type:'document',icon:'fa-file-alt',label:'Document',color:'#007AFF'},{type:'video',icon:'fa-video',label:'Video',color:'#AF52DE'},{type:'audio',icon:'fa-music',label:'Audio',color:'#FF9500'},{type:'link',icon:'fa-link',label:'Link',color:'#34C759'},{type:'note',icon:'fa-sticky-note',label:'Note',color:'#FFCC00'},{type:'spreadsheet',icon:'fa-table',label:'Sheet',color:'#34C759'},{type:'presentation',icon:'fa-display',label:'Slides',color:'#FF3B30'}].map(t => `
            <button class="mac-btn mac-btn-secondary" style="flex-direction:column;padding:12px 4px;gap:4px;font-size:10px" onclick="quickShareItem('${t.type}','${t.label}')"><i class="fas ${t.icon}" style="font-size:18px;color:${t.color}"></i>${t.label}</button>
          `).join('')}
        </div>
      </div>
    `;
  } else if (State.modalOpen === 'newEvent') {
    content = `
      <div class="modal-header"><h3>New Calendar Event</h3><button class="mac-btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Event Title</label><input type="text" class="form-input" id="eventTitle" placeholder="What's happening?"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="eventDate" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label class="form-label">Time</label><input type="time" class="form-input" id="eventTime" value="12:00"></div>
        </div>
        <div class="form-group"><label class="form-label">Share with Table</label><select class="form-select" id="eventTable">${State.tables.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
      </div>
      <div class="modal-footer"><button class="mac-btn mac-btn-secondary" onclick="closeModal()">Cancel</button><button class="mac-btn mac-btn-primary" onclick="createEvent()">Create Event</button></div>
    `;
  } else if (State.modalOpen === 'invite') {
    content = `
      <div class="modal-header"><h3>Invite to Round Table</h3><button class="mac-btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Select Table</label>
          <select class="form-select" id="inviteTable">${State.tables.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
        </div>
        ${State.invites.length > 0 ? `
          <div style="margin-top:16px">
            <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px">Active Invite Links</div>
            ${State.invites.map(inv => `
              <div class="invite-link-row">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600;font-family:monospace;color:var(--mac-accent)">${inv.code}</div>
                  <div style="font-size:10px;color:var(--text-secondary)">${inv.table?.name} · ${inv.uses}/${inv.maxUses} used · expires ${new Date(inv.expiresAt).toLocaleDateString()}</div>
                </div>
                <button class="mac-btn mac-btn-secondary" style="font-size:10px;padding:4px 8px" onclick="copyInvite('${inv.code}')"><i class="fas fa-copy"></i> Copy</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div style="margin-top:16px;text-align:center">
          <button class="mac-btn mac-btn-primary" onclick="createInvite()"><i class="fas fa-plus"></i> Generate New Invite Link</button>
        </div>
      </div>
    `;
  } else if (State.modalOpen === 'addContact') {
    content = `
      <div class="modal-header"><h3>Add Contact</h3><button class="mac-btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="contactName" placeholder="Full name"></div>
        <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="form-input" id="contactPhone" placeholder="+1 (555) 123-4567"></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="contactEmail" placeholder="email@example.com"></div>
      </div>
      <div class="modal-footer"><button class="mac-btn mac-btn-secondary" onclick="closeModal()">Cancel</button><button class="mac-btn mac-btn-primary" onclick="addContact()">Add Contact</button></div>
    `;
  } else if (State.modalOpen === 'quickShare') {
    content = `
      <div class="modal-header"><h3>Share ${State._quickShareLabel || 'Item'}</h3><button class="mac-btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">${State._quickShareLabel || 'Item'} Name</label><input type="text" class="form-input" id="quickShareName" placeholder="My ${State._quickShareLabel || 'Item'}" value="My ${State._quickShareLabel || 'Item'}" onkeypress="if(event.key==='Enter')confirmQuickShare()"></div>
      </div>
      <div class="modal-footer"><button class="mac-btn mac-btn-secondary" onclick="closeModal()">Cancel</button><button class="mac-btn mac-btn-primary" onclick="confirmQuickShare()"><i class="fas fa-share"></i> Share</button></div>
    `;
  } else if (State.modalOpen === 'notifications') {
    content = `
      <div class="modal-header"><h3>Notifications</h3><button class="mac-btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body" style="max-height:400px;overflow-y:auto">
        ${State.notifications.length > 0 ? State.notifications.map(n => {
          const from = State.members.find(m => m.id === n.from);
          const icon = n.type === 'walkie' ? 'fa-walkie-talkie' : n.type === 'share' ? 'fa-share' : 'fa-calendar';
          return `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-light);opacity:${n.read?'0.5':'1'}">
              <div style="width:36px;height:36px;border-radius:50%;background:${from?.color || '#8E8E93'};display:flex;align-items:center;justify-content:center;font-size:13px;color:white"><i class="fas ${icon}"></i></div>
              <div style="flex:1"><div style="font-size:13px;${n.read?'':'font-weight:500'}">${n.message}</div><div style="font-size:10px;color:var(--text-secondary)">${timeAgo(n.timestamp)}</div></div>
              ${!n.read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--mac-accent)"></div>' : ''}
            </div>
          `;
        }).join('') : '<p style="text-align:center;color:var(--text-secondary);padding:20px">No notifications</p>'}
      </div>
    `;
  }

  return `<div class="modal-overlay ${State.modalOpen ? 'active' : ''}" onclick="if(event.target===this)closeModal()"><div class="modal-content">${content}</div></div>`;
}

// ═══════════════════════════════════════════════════════
// NOTIFICATIONS PAGE
// ═══════════════════════════════════════════════════════
function renderNotificationsPage() {
  return `
    <div class="animate-fade" style="max-width:600px;margin:0 auto">
      <div class="mac-card">
        <div class="mac-card-header"><h3>All Notifications</h3><button class="mac-btn mac-btn-secondary" onclick="clearNotifications()" style="font-size:11px">Clear All</button></div>
        <div class="mac-card-body" style="padding:0">
          ${State.notifications.map(n => {
            const from = State.members.find(m => m.id === n.from);
            const icon = n.type === 'walkie' ? 'fa-walkie-talkie' : n.type === 'share' ? 'fa-share' : 'fa-calendar';
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border-light);opacity:${n.read?'0.5':'1'}">
                <div style="width:36px;height:36px;border-radius:50%;background:${from?.color || '#8E8E93'};display:flex;align-items:center;justify-content:center;font-size:13px;color:white"><i class="fas ${icon}"></i></div>
                <div style="flex:1"><div style="font-size:13px;${n.read?'':'font-weight:500'}">${n.message}</div><div style="font-size:10px;color:var(--text-secondary)">${timeAgo(n.timestamp)}</div></div>
                ${n.type === 'walkie' && !n.read ? `<button class="mac-btn mac-btn-primary" style="font-size:10px;padding:4px 10px" onclick="answerWalkie('${n.from}')"><i class="fas fa-phone"></i> Answer</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// ACTIONS / EVENT HANDLERS
// ═══════════════════════════════════════════════════════

// Dark Mode
function toggleDarkMode() {
  State.darkMode = !State.darkMode;
  localStorage.setItem('rt-dark-mode', State.darkMode);
  document.body.classList.toggle('dark-mode', State.darkMode);
  render();
}

// Navigation
function navigate(view) {
  State.currentView = view;
  if (view !== 'table') State.currentTable = null;
  if (view !== 'messages') State.currentChat = null;
  render();
}
function navigateTable(id) { State.currentView = 'table'; State.currentTable = id; render(); }

// Communications Hub
function switchCommsTab(tab) { State.commsTab = tab; render(); }
function switchEmailFolder(folder) { State.emailFolder = folder; State.emailReading = null; render(); }

// Email
async function readEmail(id) {
  State.emailReading = id;
  await API.post(`/api/emails/${id}/read`);
  const email = State.emails.find(e => e.id === id);
  if (email) email.read = true;
  render();
}

async function toggleStar(id) {
  const result = await API.post(`/api/emails/${id}/star`);
  const email = State.emails.find(e => e.id === id);
  if (email) email.starred = result.starred;
  render();
}

function replyToEmail(id) {
  const email = State.emails.find(e => e.id === id);
  State.emailComposing = true;
  State.emailReading = null;
  render();
  setTimeout(() => {
    const toEl = document.getElementById('emailTo');
    const subEl = document.getElementById('emailSubject');
    if (toEl && email) toEl.value = email.from === 'user-1' ? email.to : email.from;
    if (subEl && email) subEl.value = `Re: ${email.subject}`;
  }, 50);
}

async function sendEmail() {
  const to = document.getElementById('emailTo')?.value;
  const subject = document.getElementById('emailSubject')?.value;
  const body = document.getElementById('emailBody')?.value;
  if (!to || !subject || !body) return;
  const email = await API.post('/api/emails', { to, subject, body });
  email.fromMember = State.currentUser;
  email.toMember = State.members.find(m => m.id === to);
  State.emails.push(email);
  State.emailComposing = false;
  render();
}

// Texts
function openTextChat(memberId) {
  State.currentTextChat = memberId;
  State.texts.forEach(t => { if (t.from === memberId && t.to === 'user-1') t.read = true; });
  render();
  setTimeout(() => { const el = document.getElementById('textMessages'); if (el) el.scrollTop = el.scrollHeight; }, 50);
}

async function sendText() {
  const input = document.getElementById('textInput');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim(); input.value = '';
  const t = await API.post('/api/texts', { to: State.currentTextChat, text });
  State.texts.push(t);
  render();
  setTimeout(() => { const el = document.getElementById('textMessages'); if (el) el.scrollTop = el.scrollHeight; }, 50);
}

// Chat / Messages
function openChat(memberId) {
  State.currentChat = memberId;
  State.messages.forEach(m => { if (m.from === memberId && m.to === 'user-1') m.read = true; });
  render();
  setTimeout(() => { const el = document.getElementById('chatMessages'); if (el) el.scrollTop = el.scrollHeight; }, 50);
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim(); input.value = '';
  const msg = await API.post('/api/messages', { to: State.currentChat, text, type: 'text' });
  State.messages.push({ ...msg, fromMember: State.currentUser, toMember: State.members.find(m => m.id === msg.to) });
  render();
  setTimeout(() => { const el = document.getElementById('chatMessages'); if (el) el.scrollTop = el.scrollHeight; }, 50);
}

// Modals
function openModal(type) { State.modalOpen = type; render(); }
function closeModal() { State.modalOpen = null; render(); }
function showNotifications() { State.currentView = 'notifications'; State.notifications.forEach(n => n.read = true); render(); }
function clearNotifications() { State.notifications = []; render(); }

// Calendar
function changeMonth(delta) {
  State.calendarMonth += delta;
  if (State.calendarMonth > 11) { State.calendarMonth = 0; State.calendarYear++; }
  if (State.calendarMonth < 0) { State.calendarMonth = 11; State.calendarYear--; }
  render();
}
function goToday() { const t = new Date(); State.calendarMonth = t.getMonth(); State.calendarYear = t.getFullYear(); render(); }
function calendarDayClick(date) { State.modalOpen = 'newEvent'; render(); setTimeout(() => { const el = document.getElementById('eventDate'); if (el) el.value = date; }, 50); }
async function createEvent() {
  const title = document.getElementById('eventTitle')?.value;
  const date = document.getElementById('eventDate')?.value;
  const time = document.getElementById('eventTime')?.value;
  const table = document.getElementById('eventTable')?.value;
  if (!title || !date) return;
  const ev = await API.post('/api/events', { title, date, time, table });
  State.events.push({ ...ev, tableName: State.tables.find(t => t.id === ev.table)?.name });
  closeModal();
}

// Tables
function selectColor(el) { document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected')); el.classList.add('selected'); }
function toggleMemberChip(el) { el.classList.toggle('selected'); }
async function createTable() {
  const name = document.getElementById('newTableName')?.value;
  if (!name) return;
  const color = document.querySelector('.color-option.selected')?.dataset.color || '#007AFF';
  const selectedMembers = Array.from(document.querySelectorAll('.member-chip.selected')).map(c => c.dataset.member);
  selectedMembers.unshift('user-1');
  const t = await API.post('/api/tables', { name, color, members: selectedMembers });
  t.memberDetails = t.members.map(mid => State.members.find(m => m.id === mid));
  State.tables.push(t);
  closeModal();
  navigateTable(t.id);
}

// Share items
async function quickShareItem(type, label) {
  if (!State.currentTable) { showCopyToast('Select a table first'); return; }
  // Show inline name input instead of blocking prompt()
  State.modalOpen = 'quickShare';
  State._quickShareType = type;
  State._quickShareLabel = label;
  render();
  setTimeout(() => document.getElementById('quickShareName')?.focus(), 100);
}

async function confirmQuickShare() {
  const nameEl = document.getElementById('quickShareName');
  const name = nameEl?.value?.trim();
  if (!name) { nameEl?.focus(); return; }
  const item = await API.post(`/api/tables/${State.currentTable}/items`, { type: State._quickShareType, name });
  const table = State.tables.find(t => t.id === State.currentTable);
  if (table && item?.id) table.items.push(item);
  closeModal(); render();
  showCopyToast(`${State._quickShareLabel} shared to table`);
}
function handleFileDrop(event) { if (event.dataTransfer?.files?.length > 0) handleFiles(event.dataTransfer.files); }
function handleFileSelect(input) { if (input.files.length > 0) handleFiles(input.files); }
async function handleFiles(files) {
  for (const file of files) {
    let type = 'document';
    if (file.type.startsWith('image/')) type = 'photo';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    if (State.currentTable) {
      const item = await API.post(`/api/tables/${State.currentTable}/items`, { type, name: file.name, sharedBy: 'user-1' });
      const table = State.tables.find(t => t.id === State.currentTable);
      if (table) table.items.push(item);
    }
  }
  closeModal(); render();
}

// Invites
async function createInvite() {
  const tableId = document.getElementById('inviteTable')?.value;
  if (!tableId) return;
  const invite = await API.post('/api/invites', { tableId });
  invite.table = State.tables.find(t => t.id === invite.tableId);
  State.invites.push(invite);
  render();
}
function copyInvite(code) {
  const baseUrl = window.location.origin;
  const link = `${baseUrl}/join/${code}`;
  navigator.clipboard?.writeText(link);
  showCopyToast(`Invite link copied!`);
}

function showCopyToast(msg) {
  let toast = document.getElementById('copyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copyToast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:#1D1D1F;color:white;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;opacity:0;transition:all 0.3s ease;z-index:9999;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(20px)'; }, 2500);
}

// Contacts
// Contacts - debounced search
let _contactSearchTimer = null;
function filterContacts(value) {
  State.contactSearch = value;
  clearTimeout(_contactSearchTimer);
  _contactSearchTimer = setTimeout(() => render(), 200);
}

async function addContact() {
  const name = document.getElementById('contactName')?.value;
  const phone = document.getElementById('contactPhone')?.value;
  const email = document.getElementById('contactEmail')?.value;
  if (!name) return;
  const contact = await API.post('/api/contacts', { name, phone, email });
  State.contacts.push(contact);
  closeModal();
}
async function inviteContact(contactId) {
  const contact = State.contacts.find(c => c.id === contactId);
  await API.post(`/api/contacts/${contactId}/invite`);
  showCopyToast(`Invite sent to ${contact?.name}`);
}

// Walkie Talkie
function toggleWalkie() { State.walkieOpen = !State.walkieOpen; if (!State.walkieOpen) { State.walkieTalking = false; State.walkieTarget = null; } render(); }
function selectWalkieTarget(id) { State.walkieTarget = id; render(); }
function startWalkieWith(id) { State.walkieOpen = true; State.walkieTarget = id; render(); }
function startTalking() { State.walkieTalking = true; render(); playBeep(); }
function stopTalking() { State.walkieTalking = false; render(); }
async function pingUser(userId) { await API.post('/api/walkie/ping', { to: userId }); const member = State.members.find(m => m.id === userId); showPingNotification(member, 'Ping sent!'); }

function showPingNotification(member, subtitle) {
  const el = document.getElementById('pingNotif');
  if (!el) return;
  el.innerHTML = `
    <div class="ping-avatar" style="background:${member?.color || '#8E8E93'}">${member?.initials || '?'}</div>
    <div class="ping-content"><div class="ping-title">${member?.name || 'Unknown'}</div><div class="ping-subtitle">${subtitle}</div></div>
    <div class="ping-actions">
      <button class="ping-action-btn" style="background:var(--mac-green)" onclick="answerWalkie('${member?.id}')"><i class="fas fa-phone"></i></button>
      <button class="ping-action-btn" style="background:var(--mac-red)" onclick="dismissPing()"><i class="fas fa-times"></i></button>
    </div>
  `;
  el.classList.add('show'); playBeep();
  setTimeout(() => el.classList.remove('show'), 5000);
}
function dismissPing() { document.getElementById('pingNotif')?.classList.remove('show'); }
function answerWalkie(userId) { dismissPing(); startWalkieWith(userId); }

// Video Call
function startVideoCall(userId) { State.videoCallActive = true; State.videoCallTarget = userId; render(); }
function endVideoCall() { State.videoCallActive = false; State.videoCallTarget = null; render(); }
function toggleMute() {}
function memberAction(memberId) { if (memberId === 'user-1') return; State.walkieOpen = true; State.walkieTarget = memberId; render(); }
function filterApps(btn, filter) { document.querySelectorAll('[data-filter]').forEach(b => { b.classList.remove('mac-btn-primary'); b.classList.add('mac-btn-secondary'); }); btn.classList.remove('mac-btn-secondary'); btn.classList.add('mac-btn-primary'); }

// ─── Utilities ───
function getItemIcon(type) {
  const icons = { photo:'fa-image', document:'fa-file-alt', video:'fa-video', audio:'fa-music', link:'fa-link', note:'fa-sticky-note', spreadsheet:'fa-table', presentation:'fa-display' };
  return 'fas ' + (icons[type] || 'fa-file');
}
function getItemColor(type) {
  const colors = { photo:'#FF2D55', document:'#007AFF', video:'#AF52DE', audio:'#FF9500', link:'#34C759', note:'#FFCC00', spreadsheet:'#34C759', presentation:'#FF3B30' };
  return colors[type] || '#8E8E93';
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}
function getReferralProgress(joined) {
  if (joined >= 8) return 'Ambassador status!';
  if (joined >= 4) return `${8 - joined} more to Ambassador`;
  if (joined >= 1) return `${4 - joined} more to Connector`;
  return 'Invite someone to start!';
}
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'sine'; gain.gain.value = 0.15;
    osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2); osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => {
      const osc2 = ctx.createOscillator(), gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.frequency.value = 1100; osc2.type = 'sine'; gain2.gain.value = 0.15;
      osc2.start(); gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2); osc2.stop(ctx.currentTime + 0.2);
    }, 150);
  } catch(e) {}
}
function attachEvents() {
  document.onkeydown = (e) => {
    if (e.key === 'Escape') {
      if (State.videoCallActive) endVideoCall();
      else if (State.modalOpen) closeModal();
      else if (State.walkieOpen) toggleWalkie();
    }
  };
}

// Simulate incoming ping after 8 seconds
setTimeout(() => { const sarah = State.members.find(m => m.id === 'user-2'); if (sarah) showPingNotification(sarah, 'Wants to talk on Walkie Talkie'); }, 8000);

// ─── Boot ───
init();
