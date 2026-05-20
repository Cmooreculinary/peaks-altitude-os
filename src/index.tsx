import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// ─── Global Error Handler ───
app.onError((err, c) => {
  const status = (err as any).status || 500
  const message = status === 500 ? 'Something went wrong' : err.message
  console.error(`[API Error] ${status}: ${err.message}`)
  return c.json({ error: message, status }, status)
})

// ─── Security Headers ───
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('X-XSS-Protection', '1; mode=block')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()')
  c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  c.res.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none';")
})

app.use('/api/*', cors())

// ─── Rate Limiting (in-memory sliding window) ───
const rateLimits = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW = 60000
const RATE_LIMIT_MAX = 100

app.use('/api/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  const now = Date.now()
  const entry = rateLimits.get(ip)
  
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimits.set(ip, { count: 1, windowStart: now })
  } else {
    entry.count++
    if (entry.count > RATE_LIMIT_MAX) {
      return c.json({ error: 'Too many requests. Please try again later.' }, 429)
    }
  }
  
  if (rateLimits.size > 10000) {
    for (const [key, val] of rateLimits) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW * 2) rateLimits.delete(key)
    }
  }
  
  await next()
  c.res.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
  c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - (rateLimits.get(ip)?.count || 0))))
})

// ─── CSRF Protection ───
const csrfTokens = new Map<string, number>()

app.get('/api/csrf-token', (c) => {
  const token = generateToken()
  csrfTokens.set(token, Date.now() + 3600000)
  if (csrfTokens.size > 5000) {
    const now = Date.now()
    for (const [t, exp] of csrfTokens) { if (exp < now) csrfTokens.delete(t) }
  }
  return c.json({ token })
})

app.use('/api/*', async (c, next) => {
  const method = c.req.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next()
  
  const path = new URL(c.req.url).pathname
  if (path.startsWith('/api/auth/') || path === '/api/csrf-token') return next()
  
  const csrfToken = c.req.header('X-CSRF-Token')
  if (csrfToken && csrfTokens.has(csrfToken)) {
    const expiry = csrfTokens.get(csrfToken)!
    if (Date.now() < expiry) return next()
    csrfTokens.delete(csrfToken)
  }
  
  const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.header('Cookie')?.match(/rt-session=([^;]+)/)?.[1]
  if (sessionToken && store.sessions.find(s => s.token === sessionToken && s.expiresAt > Date.now())) return next()
  
  return c.json({ error: 'Invalid or missing CSRF token' }, 403)
})

// ─── Utilities ───
function escapeHtml(str: string): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

function safeMember(m: any): any {
  if (!m) return null
  return { id: m.id, name: m.name, initials: m.initials, color: m.color, status: m.status, email: m.email }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

function generateToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const arr = new Uint8Array(6)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 6; i++) code += chars[arr[i] % chars.length]
  return code
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Validators ───
const V = {
  email: (v: any) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254,
  password: (v: any) => typeof v === 'string' && v.length >= 6 && v.length <= 128,
  name: (v: any) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 100,
  text: (v: any) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 10000,
  subject: (v: any) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 500,
  color: (v: any) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v),
  date: (v: any) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
  time: (v: any) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v),
  id: (v: any) => typeof v === 'string' && v.length > 0 && v.length <= 100,
  phone: (v: any) => !v || (typeof v === 'string' && /^\+?[\d\s\-()]{7,20}$/.test(v)),
  inviteCode: (v: any) => typeof v === 'string' && /^[A-Z0-9]{4,20}$/.test(v),
}

// ─── In-memory data store ───
const store = {
  users: [] as any[],
  sessions: [] as any[],
  members: [
    { id: 'user-1', name: 'You', initials: 'YO', color: '#007AFF', status: 'online', email: 'you@roundtable.app', passwordHash: '', salt: '' },
    { id: 'user-2', name: 'Sarah Chen', initials: 'SC', color: '#FF9500', status: 'online', email: 'sarah@email.com', passwordHash: '', salt: '' },
    { id: 'user-3', name: 'Mike Rivera', initials: 'MR', color: '#34C759', status: 'away', email: 'mike@email.com', passwordHash: '', salt: '' },
    { id: 'user-4', name: 'Emma Wilson', initials: 'EW', color: '#AF52DE', status: 'online', email: 'emma@email.com', passwordHash: '', salt: '' },
    { id: 'user-5', name: 'James Park', initials: 'JP', color: '#FF3B30', status: 'offline', email: 'james@email.com', passwordHash: '', salt: '' },
  ],
  tables: [
    {
      id: 'table-1', name: 'Family Circle', members: ['user-1', 'user-2', 'user-3'],
      items: [
        { id: 'item-1', type: 'photo', name: 'Vacation.jpg', sharedBy: 'user-2', timestamp: Date.now() - 3600000 },
        { id: 'item-2', type: 'document', name: 'Budget 2026.xlsx', sharedBy: 'user-1', timestamp: Date.now() - 7200000 },
        { id: 'item-3', type: 'audio', name: 'Voice Note.m4a', sharedBy: 'user-3', timestamp: Date.now() - 1800000 },
      ],
      color: '#007AFF', active: true, activeMembers: ['user-1', 'user-2'], lastActivity: Date.now() - 120000,
      createdBy: 'user-1'
    },
    {
      id: 'table-2', name: 'Project Alpha', members: ['user-1', 'user-4', 'user-5'],
      items: [
        { id: 'item-4', type: 'video', name: 'Demo.mp4', sharedBy: 'user-4', timestamp: Date.now() - 900000 },
        { id: 'item-5', type: 'document', name: 'Proposal.docx', sharedBy: 'user-1', timestamp: Date.now() - 5400000 },
      ],
      color: '#34C759', active: false, activeMembers: [] as string[], lastActivity: Date.now() - 86400000,
      createdBy: 'user-1'
    },
    {
      id: 'table-3', name: 'Faith Group', members: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
      items: [
        { id: 'item-6', type: 'document', name: 'Study Notes.pdf', sharedBy: 'user-2', timestamp: Date.now() - 600000 },
        { id: 'item-7', type: 'photo', name: 'Group Photo.png', sharedBy: 'user-3', timestamp: Date.now() - 2400000 },
        { id: 'item-8', type: 'link', name: 'Sermon Video', sharedBy: 'user-5', timestamp: Date.now() - 4800000 },
        { id: 'item-9', type: 'audio', name: 'Hymn.mp3', sharedBy: 'user-4', timestamp: Date.now() - 3000000 },
      ],
      color: '#AF52DE', active: true, activeMembers: ['user-1', 'user-3', 'user-4'], lastActivity: Date.now() - 30000,
      createdBy: 'user-2'
    },
  ],
  messages: [
    { id: 'msg-1', from: 'user-2', to: 'user-1', text: 'Hey! Did you see the vacation photos?', timestamp: Date.now() - 120000, type: 'text', read: false },
    { id: 'msg-2', from: 'user-1', to: 'user-2', text: 'Yes! They look amazing', timestamp: Date.now() - 60000, type: 'text', read: true },
    { id: 'msg-3', from: 'user-4', to: 'user-1', text: 'Can we review the proposal today?', timestamp: Date.now() - 300000, type: 'text', read: false },
    { id: 'msg-4', from: 'user-3', to: 'user-1', text: 'Meeting moved to 3pm', timestamp: Date.now() - 600000, type: 'text', read: true },
  ],
  events: [
    { id: 'ev-1', title: 'Family Dinner', date: '2026-04-21', time: '18:00', table: 'table-1', color: '#007AFF', sharedBy: 'user-2' },
    { id: 'ev-2', title: 'Sprint Review', date: '2026-04-22', time: '10:00', table: 'table-2', color: '#34C759', sharedBy: 'user-4' },
    { id: 'ev-3', title: 'Bible Study', date: '2026-04-23', time: '19:00', table: 'table-3', color: '#AF52DE', sharedBy: 'user-2' },
    { id: 'ev-4', title: 'Project Deadline', date: '2026-04-25', time: '17:00', table: 'table-2', color: '#34C759', sharedBy: 'user-1' },
    { id: 'ev-5', title: 'Game Night', date: '2026-04-26', time: '20:00', table: 'table-1', color: '#007AFF', sharedBy: 'user-3' },
    { id: 'ev-6', title: 'Worship Service', date: '2026-04-27', time: '09:00', table: 'table-3', color: '#AF52DE', sharedBy: 'user-5' },
    { id: 'ev-7', title: 'Team Standup', date: '2026-04-21', time: '09:30', table: 'table-2', color: '#34C759', sharedBy: 'user-1' },
    { id: 'ev-8', title: 'Lunch w/ Sarah', date: '2026-04-21', time: '12:00', table: 'table-1', color: '#007AFF', sharedBy: 'user-1' },
  ],
  notifications: [
    { id: 'n-1', type: 'walkie', from: 'user-2', message: 'Sarah wants to talk', timestamp: Date.now() - 30000, read: false },
    { id: 'n-2', type: 'share', from: 'user-4', message: 'Emma shared Demo.mp4', timestamp: Date.now() - 90000, read: false },
    { id: 'n-3', type: 'event', from: 'user-3', message: 'Mike added Game Night', timestamp: Date.now() - 180000, read: true },
  ],
  emails: [
    { id: 'email-1', from: 'user-2', to: 'user-1', subject: 'Vacation Planning', body: 'Hey! I found some great deals for the family trip. Check out the attached links when you get a chance. The resort in Maui looks perfect for the kids!', timestamp: Date.now() - 1800000, read: false, starred: true, folder: 'inbox' },
    { id: 'email-2', from: 'user-4', to: 'user-1', subject: 'Sprint Review Agenda', body: 'Here is the agenda for tomorrow\'s sprint review:\n1. Demo walkthrough\n2. Proposal review\n3. Timeline discussion\n4. Next sprint planning', timestamp: Date.now() - 3600000, read: false, starred: false, folder: 'inbox' },
    { id: 'email-3', from: 'user-5', to: 'user-1', subject: 'Sunday Sermon Notes', body: 'Hi everyone, I\'ve attached the notes from last Sunday\'s sermon on Philippians 4:6-7. Feel free to share with the group.', timestamp: Date.now() - 7200000, read: true, starred: false, folder: 'inbox' },
    { id: 'email-4', from: 'user-1', to: 'user-2', subject: 'Re: Vacation Planning', body: 'Love the Maui idea! Let me check with the family and get back to you.', timestamp: Date.now() - 900000, read: true, starred: false, folder: 'sent' },
    { id: 'email-5', from: 'user-3', to: 'user-1', subject: 'Game Night This Saturday', body: 'Hey! Are we still on for game night? I can bring Catan and some snacks.', timestamp: Date.now() - 10800000, read: true, starred: true, folder: 'inbox' },
    { id: 'email-6', from: 'user-1', to: 'user-4', subject: 'Proposal Draft v2', body: 'Attached is the updated proposal with revised timeline and budget figures.', timestamp: Date.now() - 5400000, read: true, starred: false, folder: 'sent' },
  ],
  texts: [
    { id: 'sms-1', from: 'user-2', to: 'user-1', text: 'Running 5 min late!', timestamp: Date.now() - 300000, read: false },
    { id: 'sms-2', from: 'user-1', to: 'user-2', text: 'No worries, see you soon', timestamp: Date.now() - 240000, read: true },
    { id: 'sms-3', from: 'user-3', to: 'user-1', text: 'Can you grab milk on the way home?', timestamp: Date.now() - 180000, read: false },
    { id: 'sms-4', from: 'user-4', to: 'user-1', text: 'Great work on the presentation today!', timestamp: Date.now() - 600000, read: true },
    { id: 'sms-5', from: 'user-1', to: 'user-3', text: 'Sure, 2% or whole?', timestamp: Date.now() - 120000, read: true },
    { id: 'sms-6', from: 'user-3', to: 'user-1', text: 'Whole please. And eggs if they have them', timestamp: Date.now() - 60000, read: false },
    { id: 'sms-7', from: 'user-5', to: 'user-1', text: 'Are you coming to worship Sunday?', timestamp: Date.now() - 900000, read: true },
  ],
  invites: [
    { id: 'inv-1', tableId: 'table-1', code: 'FAMILY2026', createdBy: 'user-1', createdAt: Date.now() - 86400000, uses: 2, maxUses: 10, expiresAt: Date.now() + 604800000 },
    { id: 'inv-2', tableId: 'table-3', code: 'FAITH4ALL', createdBy: 'user-2', createdAt: Date.now() - 172800000, uses: 4, maxUses: 50, expiresAt: Date.now() + 2592000000 },
  ],
  contacts: [
    { id: 'contact-1', name: 'Mom', phone: '+1 (555) 123-4567', email: 'mom@email.com', isMember: false },
    { id: 'contact-2', name: 'Dad', phone: '+1 (555) 234-5678', email: 'dad@email.com', isMember: false },
    { id: 'contact-3', name: 'Sarah Chen', phone: '+1 (555) 345-6789', email: 'sarah@email.com', isMember: true, memberId: 'user-2' },
    { id: 'contact-4', name: 'Mike Rivera', phone: '+1 (555) 456-7890', email: 'mike@email.com', isMember: true, memberId: 'user-3' },
    { id: 'contact-5', name: 'Emma Wilson', phone: '+1 (555) 567-8901', email: 'emma@email.com', isMember: true, memberId: 'user-4' },
    { id: 'contact-6', name: 'James Park', phone: '+1 (555) 678-9012', email: 'james@email.com', isMember: true, memberId: 'user-5' },
    { id: 'contact-7', name: 'Pastor David', phone: '+1 (555) 789-0123', email: 'pastor.david@church.org', isMember: false },
    { id: 'contact-8', name: 'Coach Thompson', phone: '+1 (555) 890-1234', email: 'coach.t@school.edu', isMember: false },
    { id: 'contact-9', name: 'Aunt Lisa', phone: '+1 (555) 901-2345', email: 'lisa.m@email.com', isMember: false },
    { id: 'contact-10', name: 'Dr. Patel', phone: '+1 (555) 012-3456', email: 'dr.patel@clinic.com', isMember: false },
  ],
  referrals: {
    'user-1': { invited: 5, joined: 3, badge: 'Connector' },
    'user-2': { invited: 8, joined: 6, badge: 'Ambassador' },
    'user-4': { invited: 3, joined: 2, badge: 'Starter' },
  } as Record<string, any>,
}

// ─── Auth Helpers ───
function getSession(c: any): any | null {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.header('Cookie')?.match(/rt-session=([^;]+)/)?.[1]
  if (!token) return null
  const session = store.sessions.find(s => s.token === token && s.expiresAt > Date.now())
  return session || null
}

function getCurrentUser(c: any): any {
  const session = getSession(c)
  if (session) {
    return store.members.find(m => m.id === session.userId) || store.members[0]
  }
  return store.members[0]
}

// ─── Auth Routes ───
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, name } = body

    if (!V.email(email)) return c.json({ error: 'Invalid email address' }, 400)
    if (!V.password(password)) return c.json({ error: 'Password must be 6-128 characters' }, 400)
    if (!V.name(name)) return c.json({ error: 'Name is required (1-100 characters)' }, 400)

    const existing = store.members.find(m => m.email === email)
    if (existing && existing.passwordHash) return c.json({ error: 'Account already exists' }, 409)

    const salt = generateSalt()
    const passwordHash = await hashPassword(password, salt)
    const sanitizedName = escapeHtml(name.trim())
    const initials = sanitizedName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
    const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#FF2D55', '#5AC8FA']
    const color = colors[Math.floor(Math.random() * colors.length)]

    const userId = generateId('user')
    const user = { id: userId, name: sanitizedName, initials, color, status: 'online', email, passwordHash, salt }
    store.members.push(user)

    const token = generateToken()
    store.sessions.push({ token, userId, expiresAt: Date.now() + 30 * 86400000 })

    const setCookie = `rt-session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 86400}`
    return c.json({
      user: { id: userId, name: user.name, initials, color, email, status: 'online' },
      token
    }, 201, { 'Set-Cookie': setCookie })
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password } = body

    if (!V.email(email)) return c.json({ error: 'Invalid email' }, 400)
    if (!V.password(password)) return c.json({ error: 'Invalid password' }, 400)

    const user = store.members.find(m => m.email === email)
    if (!user || !user.passwordHash) return c.json({ error: 'Invalid email or password' }, 401)

    const hash = await hashPassword(password, user.salt)
    if (hash !== user.passwordHash) return c.json({ error: 'Invalid email or password' }, 401)

    const token = generateToken()
    store.sessions.push({ token, userId: user.id, expiresAt: Date.now() + 30 * 86400000 })

    const setCookie = `rt-session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 86400}`
    return c.json({
      user: { id: user.id, name: user.name, initials: user.initials, color: user.color, email: user.email, status: user.status },
      token
    }, 200, { 'Set-Cookie': setCookie })
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.post('/api/auth/logout', (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.header('Cookie')?.match(/rt-session=([^;]+)/)?.[1]
  if (token) {
    store.sessions = store.sessions.filter(s => s.token !== token)
  }
  return c.json({ success: true }, 200, { 'Set-Cookie': 'rt-session=; Path=/; Max-Age=0' })
})

// ─── User Routes ───
app.get('/api/me', (c) => {
  const user = getCurrentUser(c)
  return c.json({ id: user.id, name: user.name, initials: user.initials, color: user.color, status: user.status, email: user.email })
})

app.put('/api/me', async (c) => {
  try {
    const user = getCurrentUser(c)
    const body = await c.req.json()
    if (body.name && V.name(body.name)) {
      user.name = escapeHtml(body.name.trim())
      user.initials = body.name.trim().split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
    }
    if (body.color && V.color(body.color)) user.color = body.color
    if (body.status && ['online', 'away', 'dnd', 'offline'].includes(body.status)) user.status = body.status
    if (body.email && V.email(body.email)) user.email = body.email
    return c.json({ id: user.id, name: user.name, initials: user.initials, color: user.color, status: user.status, email: user.email })
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.get('/api/members', (c) => {
  return c.json(store.members.map(m => safeMember(m)))
})

// ─── Table Routes ───
app.get('/api/tables', (c) => {
  const tables = store.tables.map(t => ({
    ...t,
    memberDetails: t.members.map(mid => safeMember(store.members.find(m => m.id === mid))).filter(Boolean)
  }))
  return c.json(tables)
})

app.get('/api/tables/:id', (c) => {
  const table = store.tables.find(t => t.id === c.req.param('id'))
  if (!table) return c.json({ error: 'Not found' }, 404)
  return c.json({
    ...table,
    memberDetails: table.members.map(mid => safeMember(store.members.find(m => m.id === mid))).filter(Boolean)
  })
})

app.post('/api/tables', async (c) => {
  try {
    const body = await c.req.json()
    if (!V.name(body.name)) return c.json({ error: 'Table name required (1-100 chars)' }, 400)
    const user = getCurrentUser(c)
    const newTable = {
      id: generateId('table'), name: escapeHtml(body.name.trim()),
      members: body.members || [user.id], items: [] as any[],
      color: V.color(body.color) ? body.color : '#007AFF',
      active: false, activeMembers: [] as string[], lastActivity: Date.now(),
      createdBy: user.id
    }
    store.tables.push(newTable)
    return c.json({ ...newTable, memberDetails: newTable.members.map(mid => safeMember(store.members.find(m => m.id === mid))).filter(Boolean) }, 201)
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.put('/api/tables/:id', async (c) => {
  try {
    const table = store.tables.find(t => t.id === c.req.param('id'))
    if (!table) return c.json({ error: 'Not found' }, 404)
    const body = await c.req.json()
    if (body.name && V.name(body.name)) table.name = escapeHtml(body.name.trim())
    if (body.color && V.color(body.color)) table.color = body.color
    if (typeof body.active === 'boolean') table.active = body.active
    return c.json({ ...table, memberDetails: table.members.map(mid => safeMember(store.members.find(m => m.id === mid))).filter(Boolean) })
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.delete('/api/tables/:id', (c) => {
  const idx = store.tables.findIndex(t => t.id === c.req.param('id'))
  if (idx === -1) return c.json({ error: 'Not found' }, 404)
  const user = getCurrentUser(c)
  if (store.tables[idx].createdBy !== user.id) return c.json({ error: 'Only the table creator can delete it' }, 403)
  store.tables.splice(idx, 1)
  // Clean up related invites
  store.invites = store.invites.filter(inv => inv.tableId !== c.req.param('id'))
  return c.json({ success: true })
})

app.post('/api/tables/:id/items', async (c) => {
  try {
    const table = store.tables.find(t => t.id === c.req.param('id'))
    if (!table) return c.json({ error: 'Not found' }, 404)
    const body = await c.req.json()
    const user = getCurrentUser(c)
    const validTypes = ['photo', 'document', 'video', 'audio', 'link', 'note', 'spreadsheet', 'presentation']
    const newItem = {
      id: generateId('item'),
      type: validTypes.includes(body.type) ? body.type : 'document',
      name: escapeHtml((body.name || 'Untitled').substring(0, 200)),
      sharedBy: user.id,
      timestamp: Date.now()
    }
    table.items.push(newItem)
    table.lastActivity = Date.now()
    return c.json(newItem, 201)
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.delete('/api/tables/:id/items/:itemId', (c) => {
  const table = store.tables.find(t => t.id === c.req.param('id'))
  if (!table) return c.json({ error: 'Table not found' }, 404)
  const idx = table.items.findIndex(i => i.id === c.req.param('itemId'))
  if (idx === -1) return c.json({ error: 'Item not found' }, 404)
  table.items.splice(idx, 1)
  return c.json({ success: true })
})

// ─── Message Routes ───
app.get('/api/messages', (c) => {
  const withUser = c.req.query('with')
  const user = getCurrentUser(c)
  let msgs = store.messages
  if (withUser) {
    msgs = msgs.filter(m => (m.from === user.id && m.to === withUser) || (m.from === withUser && m.to === user.id))
  }
  return c.json(msgs.map(m => ({
    ...m,
    fromMember: safeMember(store.members.find(mb => mb.id === m.from)),
    toMember: safeMember(store.members.find(mb => mb.id === m.to)),
  })))
})

app.post('/api/messages', async (c) => {
  try {
    const body = await c.req.json()
    if (!V.text(body.text)) return c.json({ error: 'Message text required' }, 400)
    if (!V.id(body.to)) return c.json({ error: 'Recipient required' }, 400)
    const user = getCurrentUser(c)
    const msg = { id: generateId('msg'), from: user.id, to: body.to, text: escapeHtml(body.text.trim()), timestamp: Date.now(), type: 'text', read: false }
    store.messages.push(msg)
    return c.json(msg, 201)
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// ─── Event Routes ───
app.get('/api/events', (c) => {
  return c.json(store.events.map(e => ({ ...e, tableName: store.tables.find(t => t.id === e.table)?.name, sharedByMember: safeMember(store.members.find(m => m.id === e.sharedBy)) })))
})

app.post('/api/events', async (c) => {
  try {
    const body = await c.req.json()
    if (!V.name(body.title)) return c.json({ error: 'Event title required' }, 400)
    if (!V.date(body.date)) return c.json({ error: 'Valid date required (YYYY-MM-DD)' }, 400)
    const user = getCurrentUser(c)
    const ev = {
      id: generateId('ev'), title: escapeHtml(body.title.trim()), date: body.date,
      time: V.time(body.time) ? body.time : '12:00', table: body.table || '',
      color: store.tables.find(t => t.id === body.table)?.color || '#007AFF', sharedBy: user.id
    }
    store.events.push(ev)
    return c.json(ev, 201)
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.delete('/api/events/:id', (c) => {
  const idx = store.events.findIndex(e => e.id === c.req.param('id'))
  if (idx === -1) return c.json({ error: 'Not found' }, 404)
  store.events.splice(idx, 1)
  return c.json({ success: true })
})

// ─── Notification Routes ───
app.get('/api/notifications', (c) => {
  return c.json(store.notifications.map(n => ({ ...n, fromMember: safeMember(store.members.find(m => m.id === n.from)) })))
})

app.post('/api/notifications/read-all', (c) => {
  store.notifications.forEach(n => n.read = true)
  return c.json({ success: true })
})

app.post('/api/walkie/ping', async (c) => {
  try {
    const body = await c.req.json()
    if (!V.id(body.to)) return c.json({ error: 'Recipient required' }, 400)
    const user = getCurrentUser(c)
    const target = store.members.find(m => m.id === body.to)
    if (!target) return c.json({ error: 'User not found' }, 404)
    const notification = { id: generateId('n'), type: 'walkie', from: user.id, message: `${user.name} pinged ${target.name}`, timestamp: Date.now(), read: false }
    store.notifications.unshift(notification)
    return c.json({ status: 'sent', to: body.to })
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// ─── Email Routes ───
app.get('/api/emails', (c) => {
  const folder = c.req.query('folder') || 'inbox'
  let emails = store.emails
  if (folder === 'starred') emails = emails.filter(e => e.starred)
  else if (folder !== 'all') emails = emails.filter(e => e.folder === folder)
  return c.json(emails.map(e => ({
    ...e, fromMember: safeMember(store.members.find(m => m.id === e.from)), toMember: safeMember(store.members.find(m => m.id === e.to)),
  })).sort((a, b) => b.timestamp - a.timestamp))
})

app.post('/api/emails', async (c) => {
  try {
    const body = await c.req.json()
    if (!V.id(body.to)) return c.json({ error: 'Recipient required' }, 400)
    if (!V.subject(body.subject)) return c.json({ error: 'Subject required (1-500 chars)' }, 400)
    if (!V.text(body.body)) return c.json({ error: 'Email body required' }, 400)
    const user = getCurrentUser(c)
    const email = { id: generateId('email'), from: user.id, to: body.to, subject: escapeHtml(body.subject.trim()), body: escapeHtml(body.body.trim()), timestamp: Date.now(), read: true, starred: false, folder: 'sent' }
    store.emails.push(email)
    // Also create inbox copy for recipient
    store.emails.push({ ...email, id: generateId('email'), folder: 'inbox', read: false })
    return c.json(email, 201)
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.post('/api/emails/:id/read', (c) => {
  const email = store.emails.find(e => e.id === c.req.param('id'))
  if (!email) return c.json({ error: 'Not found' }, 404)
  email.read = true
  return c.json({ success: true })
})

app.post('/api/emails/:id/star', (c) => {
  const email = store.emails.find(e => e.id === c.req.param('id'))
  if (!email) return c.json({ error: 'Not found' }, 404)
  email.starred = !email.starred
  return c.json({ success: true, starred: email.starred })
})

// ─── Text/SMS Routes ───
app.get('/api/texts', (c) => {
  const withUser = c.req.query('with')
  const user = getCurrentUser(c)
  let texts = store.texts
  if (withUser) texts = texts.filter(t => (t.from === user.id && t.to === withUser) || (t.from === withUser && t.to === user.id))
  return c.json(texts.map(t => ({ ...t, fromMember: safeMember(store.members.find(m => m.id === t.from)), toMember: safeMember(store.members.find(m => m.id === t.to)) })).sort((a, b) => a.timestamp - b.timestamp))
})

app.post('/api/texts', async (c) => {
  try {
    const body = await c.req.json()
    if (!V.text(body.text)) return c.json({ error: 'Text message required' }, 400)
    if (!V.id(body.to)) return c.json({ error: 'Recipient required' }, 400)
    const user = getCurrentUser(c)
    const text = { id: generateId('sms'), from: user.id, to: body.to, text: escapeHtml(body.text.trim()), timestamp: Date.now(), read: true }
    store.texts.push(text)
    return c.json(text, 201)
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// ─── Invite Routes ───
app.get('/api/invites', (c) => {
  return c.json(store.invites.map(inv => ({
    ...inv,
    table: store.tables.find(t => t.id === inv.tableId) ? { id: inv.tableId, name: store.tables.find(t => t.id === inv.tableId)!.name, color: store.tables.find(t => t.id === inv.tableId)!.color, members: store.tables.find(t => t.id === inv.tableId)!.members.length } : null,
    creator: safeMember(store.members.find(m => m.id === inv.createdBy))
  })))
})

app.post('/api/invites', async (c) => {
  try {
    const body = await c.req.json()
    if (!V.id(body.tableId)) return c.json({ error: 'Table ID required' }, 400)
    if (!store.tables.find(t => t.id === body.tableId)) return c.json({ error: 'Table not found' }, 404)
    const user = getCurrentUser(c)
    const code = (body.code && V.inviteCode(body.code)) ? body.code : generateInviteCode()
    if (store.invites.find(i => i.code === code)) return c.json({ error: 'Code already in use' }, 409)
    const maxUses = Math.min(Math.max(parseInt(body.maxUses) || 50, 1), 500)
    const expiryDays = Math.min(Math.max(parseInt(body.expiryDays) || 30, 1), 90)
    const invite = { id: generateId('inv'), tableId: body.tableId, code, createdBy: user.id, createdAt: Date.now(), uses: 0, maxUses, expiresAt: Date.now() + expiryDays * 86400000 }
    store.invites.push(invite)
    return c.json(invite, 201)
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.post('/api/invites/join', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.code || !V.inviteCode(body.code)) return c.json({ error: 'Valid invite code required' }, 400)
    const invite = store.invites.find(i => i.code === body.code.toUpperCase())
    if (!invite) return c.json({ error: 'Invalid invite code' }, 404)
    if (invite.uses >= invite.maxUses) return c.json({ error: 'Invite link has reached max uses' }, 410)
    if (Date.now() > invite.expiresAt) return c.json({ error: 'Invite link has expired' }, 410)
    invite.uses++
    const table = store.tables.find(t => t.id === invite.tableId)
    const user = getCurrentUser(c)
    if (table && !table.members.includes(user.id)) {
      table.members.push(user.id)
    }
    const inviter = invite.createdBy
    if (store.referrals[inviter]) store.referrals[inviter].joined++
    else store.referrals[inviter] = { invited: 1, joined: 1, badge: 'Starter' }
    const ref = store.referrals[inviter]
    if (ref.joined >= 8) ref.badge = 'Ambassador'
    else if (ref.joined >= 4) ref.badge = 'Connector'
    else if (ref.joined >= 1) ref.badge = 'Starter'

    return c.json({ success: true, table: table?.name, code: invite.code, tableId: invite.tableId })
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.delete('/api/invites/:id', (c) => {
  const idx = store.invites.findIndex(i => i.id === c.req.param('id'))
  if (idx === -1) return c.json({ error: 'Not found' }, 404)
  store.invites.splice(idx, 1)
  return c.json({ success: true })
})

// ─── Contact Routes ───
app.get('/api/contacts', (c) => c.json(store.contacts))

app.post('/api/contacts', async (c) => {
  try {
    const body = await c.req.json()
    if (!V.name(body.name)) return c.json({ error: 'Contact name required' }, 400)
    const contact = {
      id: generateId('contact'),
      name: escapeHtml(body.name.trim()),
      phone: body.phone ? escapeHtml(body.phone) : '',
      email: body.email ? escapeHtml(body.email) : '',
      isMember: false
    }
    store.contacts.push(contact)
    return c.json(contact, 201)
  } catch (e) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

app.delete('/api/contacts/:id', (c) => {
  const idx = store.contacts.findIndex(ct => ct.id === c.req.param('id'))
  if (idx === -1) return c.json({ error: 'Not found' }, 404)
  store.contacts.splice(idx, 1)
  return c.json({ success: true })
})

app.post('/api/contacts/:id/invite', async (c) => {
  const contact = store.contacts.find(ct => ct.id === c.req.param('id'))
  if (!contact) return c.json({ error: 'Contact not found' }, 404)
  const user = getCurrentUser(c)
  if (store.referrals[user.id]) store.referrals[user.id].invited++
  else store.referrals[user.id] = { invited: 1, joined: 0, badge: 'Newcomer' }
  return c.json({ success: true, invited: contact.name, via: contact.phone || contact.email })
})

// ─── Referral Routes ───
app.get('/api/referrals', (c) => {
  const user = getCurrentUser(c)
  return c.json(store.referrals[user.id] || { invited: 0, joined: 0, badge: 'Newcomer' })
})

app.get('/api/referrals/leaderboard', (c) => {
  const board = Object.entries(store.referrals).map(([uid, data]) => ({
    member: safeMember(store.members.find(m => m.id === uid)), ...data
  })).sort((a, b) => b.joined - a.joined)
  return c.json(board)
})

// ─── Favicon ───
app.get('/favicon.ico', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#007AFF"/><circle cx="16" cy="16" r="8" fill="none" stroke="white" stroke-width="2"/><circle cx="16" cy="8" r="2.5" fill="white"/><circle cx="22.9" cy="20" r="2.5" fill="white"/><circle cx="9.1" cy="20" r="2.5" fill="white"/></svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } })
})

// ─── Invite Join Landing Page ───
app.get('/join/:code', (c) => {
  const code = c.req.param('code').toUpperCase()
  const invite = store.invites.find(i => i.code === code)
  const table = invite ? store.tables.find(t => t.id === invite.tableId) : null
  const expired = invite ? (invite.uses >= invite.maxUses || Date.now() > invite.expiresAt) : false
  const creator = invite ? store.members.find(m => m.id === invite.createdBy) : null

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join Round Table${table ? ' - ' + escapeHtml(table.name) : ''}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; }
    .join-card { background: white; border-radius: 24px; box-shadow: 0 30px 80px rgba(0,0,0,0.25); padding: 40px; max-width: 420px; width: 100%; text-align: center; }
    .table-icon { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; color: white; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .join-btn { display: block; width: 100%; padding: 14px; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .join-btn:active { transform: scale(0.97); }
    .join-btn-primary { background: #007AFF; color: white; }
    .join-btn-primary:hover { background: #0071E3; }
    .join-btn-secondary { background: #F2F2F7; color: #1D1D1F; margin-top: 10px; }
    .join-btn-secondary:hover { background: #E5E5EA; }
    .input { width: 100%; padding: 12px 16px; border: 2px solid #E5E5EA; border-radius: 12px; font-size: 14px; font-family: inherit; outline: none; margin-bottom: 12px; box-sizing: border-box; transition: border-color 0.2s; }
    .input:focus { border-color: #007AFF; box-shadow: 0 0 0 3px rgba(0,122,255,0.15); }
    .error { color: #FF3B30; font-size: 12px; margin-bottom: 12px; display: none; padding: 8px; background: rgba(255,59,48,0.06); border-radius: 8px; }
    .success { display: none; }
    .members-preview { display: flex; justify-content: center; margin: 16px 0; }
    .member-pip { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: 600; border: 2px solid white; margin-left: -8px; }
    .member-pip:first-child { margin-left: 0; }
    .loading { display: none; align-items: center; justify-content: center; gap: 8px; padding: 14px; color: #86868B; }
    .loading.active { display: flex; }
    .spinner { width: 16px; height: 16px; border: 2px solid #E5E5EA; border-top-color: #007AFF; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="join-card">
    ${!invite ? `
      <div style="font-size:48px;margin-bottom:16px;opacity:0.3"><i class="fas fa-circle-xmark"></i></div>
      <h1 style="font-size:20px;font-weight:600;margin-bottom:8px">Invalid Invite</h1>
      <p style="color:#86868B;font-size:14px;margin-bottom:24px">This invite link is not valid. Please check the link and try again.</p>
      <a href="/" class="join-btn join-btn-secondary" style="text-decoration:none;text-align:center">Go to Round Table</a>
    ` : expired ? `
      <div style="font-size:48px;margin-bottom:16px;color:#FF9500"><i class="fas fa-clock"></i></div>
      <h1 style="font-size:20px;font-weight:600;margin-bottom:8px">Invite Expired</h1>
      <p style="color:#86868B;font-size:14px;margin-bottom:24px">This invite link has expired or reached its maximum uses. Ask the person who invited you for a new link.</p>
      <a href="/" class="join-btn join-btn-secondary" style="text-decoration:none;text-align:center">Go to Round Table</a>
    ` : `
      <div class="table-icon" style="background:${table?.color || '#007AFF'}">
        <i class="fas fa-circle-nodes"></i>
      </div>
      <h1 style="font-size:22px;font-weight:600;margin-bottom:4px">Join ${escapeHtml(table?.name || 'Round Table')}</h1>
      <p style="color:#86868B;font-size:14px;margin-bottom:4px">Invited by ${escapeHtml(creator?.name || 'a member')}</p>
      <p style="color:#86868B;font-size:12px;margin-bottom:16px">${table?.members.length || 0} members &middot; ${table?.items.length || 0} shared items</p>

      <div class="members-preview">
        ${(table?.members || []).slice(0, 5).map(mid => {
          const m = store.members.find(mb => mb.id === mid)
          return m ? `<div class="member-pip" style="background:${m.color}">${m.initials}</div>` : ''
        }).join('')}
        ${(table?.members.length || 0) > 5 ? `<div class="member-pip" style="background:#8E8E93">+${(table?.members.length || 0) - 5}</div>` : ''}
      </div>

      <div id="joinForm">
        <input type="text" class="input" id="joinName" placeholder="Your name" autocomplete="name">
        <input type="email" class="input" id="joinEmail" placeholder="Email address" autocomplete="email">
        <input type="password" class="input" id="joinPassword" placeholder="Create password (6+ chars)" autocomplete="new-password">
        <div class="error" id="joinError"></div>
        <div class="loading" id="joinLoading"><div class="spinner"></div><span>Creating account...</span></div>
        <button class="join-btn join-btn-primary" id="joinBtn" onclick="joinTable()">
          <i class="fas fa-chair"></i> Join Table
        </button>
        <button class="join-btn join-btn-secondary" onclick="loginInstead()">
          Already have an account? Log in
        </button>
      </div>

      <div id="loginForm" style="display:none">
        <input type="email" class="input" id="loginEmail" placeholder="Email address" autocomplete="email">
        <input type="password" class="input" id="loginPassword" placeholder="Password" autocomplete="current-password">
        <div class="error" id="loginError"></div>
        <div class="loading" id="loginLoading"><div class="spinner"></div><span>Logging in...</span></div>
        <button class="join-btn join-btn-primary" id="loginBtn" onclick="loginAndJoin()">
          <i class="fas fa-right-to-bracket"></i> Log In & Join
        </button>
        <button class="join-btn join-btn-secondary" onclick="registerInstead()">
          Need an account? Sign up
        </button>
      </div>

      <div class="success" id="successMsg">
        <div style="font-size:48px;color:#34C759;margin-bottom:16px"><i class="fas fa-check-circle"></i></div>
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px">You're in!</h2>
        <p style="color:#86868B;font-size:14px;margin-bottom:20px">Welcome to ${escapeHtml(table?.name || 'the table')}.</p>
        <a href="/" class="join-btn join-btn-primary" style="text-decoration:none;text-align:center">Open Round Table</a>
      </div>
    `}
  </div>
  <script>
    const CODE = '${code}';
    function showError(id, msg) { const el = document.getElementById(id); if(el){el.textContent = msg; el.style.display = 'block';} }
    function hideError(id) { const el = document.getElementById(id); if(el) el.style.display = 'none'; }
    function setLoading(id, btnId, loading) {
      const l = document.getElementById(id); const b = document.getElementById(btnId);
      if(l) l.classList.toggle('active', loading);
      if(b) { b.disabled = loading; b.style.opacity = loading ? '0.6' : '1'; }
    }

    async function joinTable() {
      hideError('joinError');
      const name = document.getElementById('joinName')?.value?.trim();
      const email = document.getElementById('joinEmail')?.value?.trim();
      const password = document.getElementById('joinPassword')?.value;
      if (!name || !email || !password || password.length < 6) { showError('joinError', 'All fields required. Password must be 6+ characters.'); return; }
      setLoading('joinLoading','joinBtn',true);
      try {
        const reg = await fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name, email, password}) });
        const regData = await reg.json();
        if (!reg.ok) { showError('joinError', regData.error || 'Registration failed'); setLoading('joinLoading','joinBtn',false); return; }
        const join = await fetch('/api/invites/join', { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization':'Bearer '+regData.token}, body: JSON.stringify({code: CODE}) });
        const joinData = await join.json();
        if (!join.ok) { showError('joinError', joinData.error || 'Join failed'); setLoading('joinLoading','joinBtn',false); return; }
        document.getElementById('joinForm').style.display = 'none';
        document.getElementById('successMsg').style.display = 'block';
      } catch(e) { showError('joinError', 'Something went wrong. Try again.'); setLoading('joinLoading','joinBtn',false); }
    }

    async function loginAndJoin() {
      hideError('loginError');
      const email = document.getElementById('loginEmail')?.value?.trim();
      const password = document.getElementById('loginPassword')?.value;
      if (!email || !password) { showError('loginError', 'All fields required.'); return; }
      setLoading('loginLoading','loginBtn',true);
      try {
        const login = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password}) });
        const loginData = await login.json();
        if (!login.ok) { showError('loginError', loginData.error || 'Login failed'); setLoading('loginLoading','loginBtn',false); return; }
        const join = await fetch('/api/invites/join', { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization':'Bearer '+loginData.token}, body: JSON.stringify({code: CODE}) });
        const joinData = await join.json();
        if (!join.ok) { showError('loginError', joinData.error || 'Join failed'); setLoading('loginLoading','loginBtn',false); return; }
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('successMsg').style.display = 'block';
      } catch(e) { showError('loginError', 'Something went wrong. Try again.'); setLoading('loginLoading','loginBtn',false); }
    }

    function loginInstead() { document.getElementById('joinForm').style.display='none'; document.getElementById('loginForm').style.display='block'; }
    function registerInstead() { document.getElementById('loginForm').style.display='none'; document.getElementById('joinForm').style.display='block'; }
    
    // Enter key support
    document.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        if (document.getElementById('joinForm')?.style.display !== 'none') joinTable();
        else if (document.getElementById('loginForm')?.style.display !== 'none') loginAndJoin();
      }
    });
  </script>
</body>
</html>`)
})

// ─── Main HTML Page ───
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Round Table</title>
  <meta name="description" content="Round Table - Where your people gather. A macOS-styled unified collaboration platform.">
  <meta name="theme-color" content="#007AFF">
  <link rel="icon" type="image/svg+xml" href="/favicon.ico">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <link href="/static/style.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { 'sf': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'] },
          colors: { 'mac': { 'bg': '#F5F5F7', 'sidebar': '#E8E8ED', 'card': '#FFFFFF', 'accent': '#007AFF', 'green': '#34C759', 'orange': '#FF9500', 'red': '#FF3B30', 'purple': '#AF52DE', 'pink': '#FF2D55', 'yellow': '#FFCC00', 'gray': '#8E8E93', 'border': '#D1D1D6', 'text': '#1D1D1F', 'text2': '#86868B' } }
        }
      }
    }
  </script>
</head>
<body class="font-sf bg-mac-bg text-mac-text overflow-hidden select-none">
  <div id="app">
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px;color:#86868B">
      <div style="width:48px;height:48px;border:3px solid #E5E5EA;border-top-color:#007AFF;border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <span style="font-size:13px">Loading Round Table...</span>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  </div>
  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
