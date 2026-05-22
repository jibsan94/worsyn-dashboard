import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Servicios from '../tenant/pages/Servicios'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgInfo {
  id: string; name: string; slug: string; alias: string | null; plan: string
  ministries: string[]; member_roles: string[]; icon: string | null; require_2fa_admins: boolean
}
type Screen       = 'loading' | 'not-found' | 'login' | 'app'
type TModule      = 'principal' | 'servicios' | 'miembros' | 'equipos' | 'partituras' | 'eventos' | 'ensayos' | 'calendario' | 'finanzas' | 'configuracion' | 'perfil'
type MiembrosTab   = 'dashboard' | 'miembros' | 'flujos' | 'formularios'
type ServiciosTab  = 'mi-planificacion' | 'servicios' | 'canciones' | 'media' | 'personas'
type MiembrosView = 'todas' | 'ministerio' | 'nuevos'
type OrgRole      = 'admin' | 'leader' | 'member'
type SettingsTab  = 'general' | 'ministerios' | 'roles' | 'admins' | 'integraciones' | 'facturacion'

interface Person {
  id: string; name: string; initials: string; color: string
  ministry: string; roles: string[]; phone: string; email: string
  status: 'active' | 'inactive'; joined: string
  prefix?: string; gender?: 'M' | 'F'; birthdate?: string; anniversary?: string
  orgRole: 'admin' | 'leader' | 'member'; avatar?: string
}

interface ApiMember {
  id: string; org_id: string; email: string; full_name: string | null
  phone: string | null; role: string; is_active: boolean
  joined_at: string; updated_at: string
  prefix: string | null; gender: string | null
  birthdate: string | null; anniversary: string | null
  ministry: string | null; org_roles: string[]; avatar: string | null
}

interface MemberForm {
  prefix: string; firstName: string; lastName: string
  email: string; phone: string; ministry: string
  gender: string; birthdate: string; anniversary: string
  roles: string[]; status: 'active' | 'inactive'
  orgRole: 'admin' | 'leader' | 'member'
}

const EMPTY_FORM: MemberForm = {
  prefix: '', firstName: '', lastName: '', email: '', phone: '',
  ministry: '', gender: '', birthdate: '', anniversary: '',
  roles: [], status: 'active', orgRole: 'member',
}

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  bg:      '#F8FAFC',
  surface: '#FFFFFF',
  border:  '#E2E8F0',
  soft:    '#F1F5F9',
  text:    '#0F172A',
  muted:   '#64748B',
  light:   '#94A3B8',
  primary: '#4F46E5',
  success: '#10B981',
  danger:  '#EF4444',
} as const

// ── Predefined roles ──────────────────────────────────────────────────────────

const PREDEFINED_ROLES = [
  'Predicador', 'Técnico de Sonido', 'Proyección', 'Secretaria', 'Tesorero',
  'Pastor o Anciano', 'Técnico de Audio/Visual', 'Líder de Adoración',
  'Guitarra Eléctrica', 'Guitarra Acústica', 'Bajo', 'Piano', 'Batería',
  'Vocalista', 'Profesor',
]

const DEFAULT_MINISTRIES = ['Alabanza', 'Audio/Visual', 'Pastoral', 'Jóvenes', 'Niños']

const AVATAR_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6d28d9']

// ── Country phone data ────────────────────────────────────────────────────────
function mkFlag(iso: string) {
  return [...iso].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}
interface Country { iso: string; name: string; dial: string; flag: string }
const COUNTRIES: Country[] = ([
  ['ES','España','+34'],['MX','México','+52'],['CO','Colombia','+57'],
  ['AR','Argentina','+54'],['PE','Perú','+51'],['VE','Venezuela','+58'],
  ['CL','Chile','+56'],['EC','Ecuador','+593'],['BO','Bolivia','+591'],
  ['CU','Cuba','+53'],['GT','Guatemala','+502'],['HN','Honduras','+504'],
  ['SV','El Salvador','+503'],['NI','Nicaragua','+505'],['CR','Costa Rica','+506'],
  ['PA','Panamá','+507'],['PY','Paraguay','+595'],['UY','Uruguay','+598'],
  ['DO','Rep. Dominicana','+1809'],['PR','Puerto Rico','+1787'],
  ['US','Estados Unidos','+1'],['CA','Canadá','+1'],['BR','Brasil','+55'],
  ['GB','Reino Unido','+44'],['FR','Francia','+33'],['DE','Alemania','+49'],
  ['IT','Italia','+39'],['PT','Portugal','+351'],['NL','Países Bajos','+31'],
  ['BE','Bélgica','+32'],['CH','Suiza','+41'],['AT','Austria','+43'],
  ['SE','Suecia','+46'],['NO','Noruega','+47'],['DK','Dinamarca','+45'],
  ['FI','Finlandia','+358'],['PL','Polonia','+48'],['RO','Rumanía','+40'],
  ['CZ','Rep. Checa','+420'],['HU','Hungría','+36'],['GR','Grecia','+30'],
  ['AU','Australia','+61'],['JP','Japón','+81'],['CN','China','+86'],
  ['IN','India','+91'],['RU','Rusia','+7'],['ZA','Sudáfrica','+27'],
  ['NG','Nigeria','+234'],['KE','Kenia','+254'],['EG','Egipto','+20'],
  ['MA','Marruecos','+212'],['IL','Israel','+972'],['TR','Turquía','+90'],
  ['SA','Arabia Saudita','+966'],['AE','Emiratos Árabes','+971'],
  ['KR','Corea del Sur','+82'],['PH','Filipinas','+63'],['ID','Indonesia','+62'],
] as [string,string,string][]).map(([iso,name,dial]) => ({ iso, name, dial, flag: mkFlag(iso) }))
const DEFAULT_COUNTRY = COUNTRIES[0]
function phoneParseCountry(phone: string): Country {
  if (!phone) return DEFAULT_COUNTRY
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  return sorted.find(c => phone.startsWith(c.dial)) ?? DEFAULT_COUNTRY
}
function phoneParseLocal(phone: string, country: Country): string {
  if (!phone) return ''
  if (phone.startsWith(country.dial)) return phone.slice(country.dial.length).trimStart()
  return phone
}

// ── Module config ─────────────────────────────────────────────────────────────

const MODULES: { id: TModule; label: string; color: string; icon: React.ReactNode }[] = [
  {
    id: 'principal', label: 'Principal', color: '#4F46E5',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>,
  },
  {
    id: 'servicios', label: 'Servicios', color: '#DC2626',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 4a1 1 0 10-2 0v3H6a1 1 0 000 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V6z" clipRule="evenodd"/></svg>,
  },
  {
    id: 'miembros', label: 'Miembros', color: '#2563EB',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>,
  },
  {
    id: 'equipos', label: 'Equipos', color: '#7C3AED',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z"/></svg>,
  },
  {
    id: 'partituras', label: 'Partituras', color: '#059669',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/></svg>,
  },
  {
    id: 'eventos', label: 'Eventos', color: '#D97706',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>,
  },
  {
    id: 'ensayos', label: 'Ensayos', color: '#0891B2',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/></svg>,
  },
  {
    id: 'calendario', label: 'Calendario', color: '#0284C7',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm-2 5h12v7H4V7zm2 2a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm6 0a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1zm-6 4a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm6 0a1 1 0 011-1h.01a1 1 0 110 2H13a1 1 0 01-1-1z" clipRule="evenodd"/></svg>,
  },
  {
    id: 'finanzas', label: 'Finanzas', color: '#065F46',
    icon: <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>,
  },
]

// ── Mock people ───────────────────────────────────────────────────────────────

const MOCK_PEOPLE: Person[] = [
  { id: '1',  name: 'María García Ruiz',     initials: 'MG', color: '#6366f1', ministry: 'Alabanza',       roles: ['Líder de Adoración', 'Vocalista'],           phone: '+34 612 345 678', email: 'maria@iglesia.com',   status: 'active',   joined: 'Ene 2022', gender: 'F', orgRole: 'leader' },
  { id: '2',  name: 'Carlos Pérez López',    initials: 'CP', color: '#0ea5e9', ministry: 'Técnica',         roles: ['Técnico de Sonido'],                          phone: '+34 622 456 789', email: 'carlos@iglesia.com',  status: 'active',   joined: 'Mar 2021', gender: 'M', orgRole: 'member' },
  { id: '3',  name: 'Ana Martínez Silva',    initials: 'AM', color: '#10b981', ministry: 'Alabanza',       roles: ['Vocalista'],                                   phone: '+34 633 567 890', email: 'ana@iglesia.com',     status: 'active',   joined: 'Jun 2023', gender: 'F', orgRole: 'member' },
  { id: '4',  name: 'Pedro Sánchez Vega',    initials: 'PS', color: '#f59e0b', ministry: 'Predicación',    roles: ['Predicador', 'Pastor o Anciano'],              phone: '+34 644 678 901', email: 'pedro@iglesia.com',   status: 'active',   joined: 'Sep 2020', gender: 'M', orgRole: 'admin' },
  { id: '5',  name: 'Laura Jiménez Torres',  initials: 'LJ', color: '#ef4444', ministry: 'Alabanza',       roles: ['Piano'],                                       phone: '+34 655 789 012', email: 'laura@iglesia.com',   status: 'inactive', joined: 'Dic 2022', gender: 'F', orgRole: 'member' },
  { id: '6',  name: 'Javier Moreno Díaz',    initials: 'JM', color: '#8b5cf6', ministry: 'Técnica',         roles: ['Proyección', 'Técnico de Audio/Visual'],       phone: '+34 666 890 123', email: 'javier@iglesia.com',  status: 'active',   joined: 'Feb 2023', gender: 'M', orgRole: 'member' },
  { id: '7',  name: 'Isabel Castro Fuentes', initials: 'IC', color: '#ec4899', ministry: 'Administración', roles: ['Secretaria', 'Tesorero'],                      phone: '+34 677 901 234', email: 'isabel@iglesia.com',  status: 'active',   joined: 'Ago 2021', gender: 'F', orgRole: 'leader' },
  { id: '8',  name: 'Roberto Navarro Gil',   initials: 'RN', color: '#14b8a6', ministry: 'Alabanza',       roles: ['Guitarra Eléctrica', 'Guitarra Acústica'],     phone: '+34 688 012 345', email: 'roberto@iglesia.com', status: 'active',   joined: 'May 2022', gender: 'M', orgRole: 'member' },
  { id: '9',  name: 'Sofía López Mendoza',   initials: 'SL', color: '#f97316', ministry: 'Niños',          roles: ['Profesor'],                                    phone: '+34 699 123 456', email: 'sofia@iglesia.com',   status: 'active',   joined: 'Oct 2023', gender: 'F', orgRole: 'member' },
  { id: '10', name: 'Diego Ruiz Herrera',    initials: 'DR', color: '#6d28d9', ministry: 'Alabanza',       roles: ['Bajo'],                                        phone: '+34 611 234 567', email: 'diego@iglesia.com',   status: 'inactive', joined: 'Jul 2021', gender: 'M', orgRole: 'member' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkInitials(first: string, last: string) {
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
}
function mkInitialsFromName(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}
function pickColor(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function formatJoined(isoDate: string) {
  try {
    return new Date(isoDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
  } catch { return '—' }
}

function apiToPerson(m: ApiMember, idx: number): Person {
  const name = m.full_name || m.email
  return {
    id: m.id,
    name,
    initials: mkInitialsFromName(name),
    color: pickColor(idx),
    ministry: m.ministry || 'Otro',
    roles: m.org_roles ?? [],
    phone: m.phone || '',
    email: m.email,
    status: m.is_active ? 'active' : 'inactive',
    joined: formatJoined(m.joined_at),
    prefix: m.prefix ?? undefined,
    gender: (m.gender as 'M' | 'F') ?? undefined,
    birthdate: m.birthdate ?? undefined,
    anniversary: m.anniversary ?? undefined,
    orgRole: (m.role as 'admin' | 'leader' | 'member') ?? 'member',
    avatar: m.avatar ?? undefined,
  }
}

function personToForm(p: Person): MemberForm {
  const parts = p.name.split(' ')
  const prefix = ['Sr.','Sra.','Rvdo.','Rvda.','Dr.','Dra.'].includes(parts[0]) ? parts[0] : ''
  const nameParts = prefix ? parts.slice(1) : parts
  return {
    prefix,
    firstName: nameParts[0] ?? '',
    lastName: nameParts.slice(1).join(' '),
    email: p.email,
    phone: p.phone,
    ministry: p.ministry,
    gender: p.gender ?? '',
    birthdate: p.birthdate ?? '',
    anniversary: p.anniversary ?? '',
    roles: [...p.roles],
    status: p.status,
    orgRole: (p.orgRole ?? 'member') as 'admin' | 'leader' | 'member',
  }
}

// ── Select wrapper component ──────────────────────────────────────────────────

function SelectField({ style, value, onChange, children }: {
  style?: React.CSSProperties
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <select
        style={{ ...s.formSelect, ...(style ?? {}) }}
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20" fill="currentColor" width={14} height={14}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.muted }}
      >
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
      </svg>
    </div>
  )
}

// ── Storage keys (scoped per slug) ───────────────────────────────────────────

function storageKey(slug: string, kind: 'token' | 'user') {
  return `tenant-${slug}-${kind}`
}

interface TenantSession {
  id: string; email: string; full_name: string | null
  role: string; org_id: string; org_name: string; org_slug: string; avatar?: string | null
  accessible_modules?: string[]; service_role?: string | null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TenantPortal() {
  const { slug, module: urlModule, tab: urlTab } = useParams<{ slug: string; module?: string; tab?: string }>()
  const navigate = useNavigate()

  const VALID_MODULES: TModule[] = ['principal','servicios','miembros','equipos','partituras','eventos','ensayos','calendario','finanzas','configuracion','perfil']
  const moduleFromUrl: TModule = (VALID_MODULES.includes(urlModule as TModule) ? urlModule as TModule : 'miembros')

  // ── Core state
  const [org, setOrg]             = useState<OrgInfo | null>(null)
  const [screen, setScreen]       = useState<Screen>('loading')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loginErr, setLoginErr]   = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [userName, setUserName]   = useState('')
  const [userRole, setUserRole]   = useState<OrgRole>('admin')
  const [userId, setUserId]       = useState<string | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [apiToken, setApiToken]   = useState<string | null>(null)
  const [accessibleModules, setAccessibleModules] = useState<TModule[] | null>(null)

  // ── Module & navigation (URL-driven — refresh keeps you on current module)
  const module: TModule = moduleFromUrl
  const setModule = (m: TModule) => navigate(`/portal/${slug}/${m}`)
  const [dropOpen, setDropOpen]         = useState(false)
  const [logoutOpen, setLogoutOpen]     = useState(false)
  const [switchOrgs, setSwitchOrgs]     = useState<Array<{slug: string; name: string; icon: string | null}>>([])
  const [switchToken, setSwitchToken]   = useState<string | null>(null)
  const [switchOpen, setSwitchOpen]     = useState(false)
  const [switchLoading, setSwitchLoading] = useState<string | null>(null)

  // Sub-tabs — also URL-driven via :tab segment
  const MIEMBROS_TABS: MiembrosTab[] = ['dashboard','miembros','flujos','formularios']
  const SERVICIOS_TABS: ServiciosTab[] = ['mi-planificacion','servicios','canciones','media','personas']
  const SETTINGS_TABS: SettingsTab[] = ['general','ministerios','roles','admins','integraciones','facturacion']
  const miembrosTab: MiembrosTab = (MIEMBROS_TABS.includes(urlTab as MiembrosTab) ? urlTab : 'miembros') as MiembrosTab
  const serviciosTab: ServiciosTab = (SERVICIOS_TABS.includes(urlTab as ServiciosTab) ? urlTab : 'servicios') as ServiciosTab
  const settingsTabFromUrl: SettingsTab = (SETTINGS_TABS.includes(urlTab as SettingsTab) ? urlTab : 'general') as SettingsTab
  const setMiembrosTab = (t: MiembrosTab) => navigate(`/portal/${slug}/miembros/${t}`)
  const setServiciosTab = (t: ServiciosTab) => navigate(`/portal/${slug}/servicios/${t}`)
  const setSettingsTabUrl = (t: SettingsTab) => navigate(`/portal/${slug}/configuracion/${t}`)
  const [miembrosView, setMiembrosView] = useState<MiembrosView>('todas')
  const [search, setSearch]             = useState('')
  const [hoveredTab, setHoveredTab]     = useState<MiembrosTab | null>(null)
  const [hoveredSvcTab, setHoveredSvcTab] = useState<ServiciosTab | null>(null)

  // ── Members data
  const [members, setMembers]                   = useState<Person[]>([])
  const [membersLoading, setMembersLoading]     = useState(false)
  const [selectedMember, setSelectedMember]     = useState<Person | null>(null)
  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null)
  const [addOpen, setAddOpen]                   = useState(false)
  const [form, setForm]                         = useState<MemberForm>(EMPTY_FORM)
  const [formErr, setFormErr]                   = useState<string | null>(null)

  // ── Edit / delete
  const [editTarget, setEditTarget]       = useState<Person | null>(null)
  const [editForm, setEditForm]           = useState<MemberForm>(EMPTY_FORM)
  const [editErr, setEditErr]             = useState<string | null>(null)
  const [isEditingMember, setIsEditingMember] = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState<Person | null>(null)

  // ── Member attachments
  interface Attachment { id: string; label: string; original_name: string; mime_type: string; size_bytes: number; uploaded_at: string }
  const [attachments, setAttachments]         = useState<Attachment[]>([])
  const [attLoading, setAttLoading]           = useState(false)
  const [attUploadOpen, setAttUploadOpen]     = useState(false)
  const [attUploadFile, setAttUploadFile]     = useState<File | null>(null)
  const [attUploadLabel, setAttUploadLabel]   = useState('')
  const [attUploading, setAttUploading]       = useState(false)
  const [attUploadErr, setAttUploadErr]       = useState<string | null>(null)
  const [attPreview, setAttPreview]           = useState<{ label: string; mime: string; data: string } | null>(null)
  const attFileRef = useRef<HTMLInputElement>(null)
  // Files queued in the "create member" modal — uploaded after member is created
  interface PendingFile { file: File; label: string }
  const [addPendingFiles, setAddPendingFiles] = useState<PendingFile[]>([])

  // ── Settings (URL-driven for module === 'configuracion')
  const settingsTab = settingsTabFromUrl
  const setSettingsTab = setSettingsTabUrl
  const [sName, setSName]                 = useState('')
  const [sAlias, setSAlias]               = useState('')
  const [sIcon, setSIcon]                 = useState<string | null>(null)
  const [sMins, setSMins]                 = useState<string[]>([])
  const [sRoles, setSRoles]               = useState<string[]>([])
  const [sRequire2FA, setSRequire2FA]     = useState(false)
  const [sNewItem, setSNewItem]           = useState('')
  const [sSaving, setSSaving]             = useState(false)
  const [sSaved, setSSaved]               = useState(false)
  const [sErr, setSErr]                   = useState<string | null>(null)

  // ── Profile (own account)
  const [pFirstName, setPFirstName]   = useState('')
  const [pLastName, setPLastName]     = useState('')
  const [pPrefix, setPPrefix]         = useState('')
  const [pEmail, setPEmail]           = useState('')
  const [pPhone, setPPhone]           = useState('')
  const [pGender, setPGender]         = useState('')
  const [pBirthdate, setPBirthdate]   = useState('')
  const [pAnniversary, setPAnniversary] = useState('')
  const [pAvatar, setPAvatar]         = useState<string | null>(null)
  const [pSaving, setPSaving]         = useState(false)
  const [pSaved, setPSaved]           = useState(false)
  const [pErr, setPErr]               = useState<string | null>(null)

  // ── Refs
  const dropRef     = useRef<HTMLDivElement>(null)
  const logoutRef   = useRef<HTMLDivElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)
  const profileAvatarRef = useRef<HTMLInputElement>(null)

  const canEdit = userRole === 'admin' || userRole === 'leader'

  function authHeaders(): Record<string, string> {
    return apiToken
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` }
      : { 'Content-Type': 'application/json' }
  }

  function fetchApi(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, { credentials: 'include', ...init })
  }

  // ── Effects
  useEffect(() => {
    if (!slug) { setScreen('not-found'); return }

    const storedToken = localStorage.getItem(storageKey(slug, 'token'))

    fetch(`/api/v1/organizations/slug/${slug}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(async (orgData) => {
        if (!orgData) { setScreen('not-found'); return }
        setOrg(orgData)

        // Try to validate session — uses Bearer if present, else httpOnly cookie
        const headers: Record<string, string> = {}
        if (storedToken) headers.Authorization = `Bearer ${storedToken}`
        const meRes = await fetch(`/api/v1/tenant/${slug}/auth/me`, {
          headers, credentials: 'include',
        })
        if (meRes.ok) {
          const session: TenantSession = await meRes.json()
          if (storedToken) setApiToken(storedToken)
          setUserId(session.id)
          setUserAvatar(session.avatar ?? null)
          setUserName(session.full_name?.split(' ')[0] ?? session.email.split('@')[0])
          setUserRole(session.role as OrgRole)
          setAccessibleModules((session.accessible_modules as TModule[] | undefined) ?? null)
          setScreen('app')
          fetchSwitchOptionsFor(slug, storedToken)
          return
        }

        // No valid session → redirect to unified login
        localStorage.removeItem(storageKey(slug, 'token'))
        localStorage.removeItem(storageKey(slug, 'user'))
        navigate('/portal', { replace: true })
      })
      .catch(() => setScreen('not-found'))
  }, [slug])

  useEffect(() => {
    if (!dropOpen) return
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [dropOpen])

  // Redirect if the user tries to access a module outside their accessible_modules.
  // Admins/leaders always get all modules from the server. Members-only-in-Services
  // get ['servicios','perfil'] — they land on servicios by default.
  useEffect(() => {
    if (!accessibleModules || accessibleModules.length === 0) return
    if (!accessibleModules.includes(module)) {
      navigate(`/portal/${slug}/${accessibleModules[0]}`, { replace: true })
    }
  }, [accessibleModules, module, slug, navigate])

  useEffect(() => {
    if (!logoutOpen) return
    const h = (e: MouseEvent) => { if (logoutRef.current && !logoutRef.current.contains(e.target as Node)) setLogoutOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [logoutOpen])

  useEffect(() => {
    if (screen !== 'app' || !slug) return
    setMembersLoading(true)
    const headers: Record<string, string> = apiToken ? { Authorization: `Bearer ${apiToken}` } : {}
    fetchApi(`/api/v1/tenant/${slug}/members`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: ApiMember[]) => setMembers(data.map((m, i) => apiToPerson(m, i))))
      .catch(() => {})
      .finally(() => setMembersLoading(false))
  }, [screen, slug, apiToken])

  // ── Handlers
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !slug) return
    setLoggingIn(true); setLoginErr(null)
    const res = await fetch(`/api/v1/tenant/${slug}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
      credentials: 'include',
    })
    if (!res.ok) {
      const detail = await res.json().then(d => d.detail).catch(() => 'Error')
      setLoginErr(detail)
      setLoggingIn(false)
      return
    }
    const data = await res.json()
    const session: TenantSession = data.member
    localStorage.setItem(storageKey(slug, 'token'), data.access_token)
    localStorage.setItem(storageKey(slug, 'user'), JSON.stringify(session))
    setApiToken(data.access_token)
    setUserId(session.id)
    setUserAvatar(session.avatar ?? null)
    setUserName(session.full_name?.split(' ')[0] ?? session.email.split('@')[0])
    setUserRole(session.role as OrgRole)
    setAccessibleModules((session.accessible_modules as TModule[] | undefined) ?? null)
    setLoggingIn(false)
    setScreen('app')
    fetchSwitchOptionsFor(slug, data.access_token)
  }

  async function handleLogout() {
    if (slug) {
      await fetch(`/api/v1/tenant/${slug}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {})
      localStorage.removeItem(storageKey(slug, 'token'))
      localStorage.removeItem(storageKey(slug, 'user'))
    }
    setApiToken(null)
    setUserName(''); setEmail(''); setPassword('')
    setLogoutOpen(false); setModule('miembros'); setMembers([])
    navigate('/portal', { replace: true })
  }

  async function fetchSwitchOptionsFor(orgSlug: string | undefined, tok: string | null) {
    if (!orgSlug) return
    const h: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}
    try {
      const res = await fetch(`/api/v1/tenant/${orgSlug}/auth/switch-options`, {
        headers: h, credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setSwitchOrgs(data.orgs ?? [])
        setSwitchToken(data.partial_token ?? null)
      }
    } catch {}
  }

  async function handleSwitchOrg(targetSlug: string, targetName: string) {
    if (!switchToken) return
    setLogoutOpen(false); setSwitchOpen(false)
    setSwitchLoading(targetName)
    try {
      const res = await fetch('/api/v1/tenant/auth/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partial_token: switchToken, slug: targetSlug }),
        credentials: 'include',
      })
      if (!res.ok) { setSwitchLoading(null); return }
      const data = await res.json()
      if (slug) {
        localStorage.removeItem(storageKey(slug, 'token'))
        localStorage.removeItem(storageKey(slug, 'user'))
      }
      localStorage.setItem(storageKey(targetSlug, 'token'), data.access_token)
      localStorage.setItem(storageKey(targetSlug, 'user'), JSON.stringify(data.member))
      setTimeout(() => {
        setSwitchLoading(null)
        navigate(`/portal/${targetSlug}`, { replace: true })
      }, 1200)
    } catch {
      setSwitchLoading(null)
    }
  }

  function switchModule(m: TModule) { setModule(m); setDropOpen(false) }

  function validateForm(f: MemberForm): string | null {
    if (!f.firstName.trim() || !f.lastName.trim()) return 'Nombre y apellido son obligatorios'
    if (!f.email.trim()) return 'El correo electrónico es obligatorio'
    if (!f.email.includes('@')) return 'Correo electrónico no válido'
    return null
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    const err = validateForm(form)
    if (err) { setFormErr(err); return }
    const fullName = [form.prefix, form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ')
    const payload = {
      email: form.email.trim(),
      full_name: fullName || null,
      phone: form.phone || null,
      role: form.orgRole,
      prefix: form.prefix || null,
      gender: form.gender || null,
      birthdate: form.birthdate || null,
      anniversary: form.anniversary || null,
      ministry: form.ministry || null,
      org_roles: form.roles,
      is_active: form.status === 'active',
    }
    const res = await fetchApi(`/api/v1/tenant/${slug}/members`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (res.status === 409) { setFormErr('Ya existe un miembro con ese correo'); return }
    if (!res.ok) { setFormErr('Error al guardar. Inténtalo de nuevo.'); return }
    const created: ApiMember = await res.json()
    setMembers(prev => [apiToPerson(created, 0), ...prev.map((p, i) => ({ ...p, color: pickColor(i + 1) }))])
    // Upload any queued attachments
    const h: Record<string, string> = apiToken ? { Authorization: `Bearer ${apiToken}` } : {}
    for (const pf of addPendingFiles) {
      const fd = new FormData()
      fd.append('file', pf.file)
      fd.append('label', pf.label)
      await fetchApi(`/api/v1/tenant/${slug}/members/${created.id}/attachments`, { method: 'POST', headers: h, body: fd })
    }
    setAddOpen(false); setForm(EMPTY_FORM); setFormErr(null); setAddPendingFiles([])
  }

  function openEdit(p: Person) {
    setEditTarget(p)
    setEditForm(personToForm(p))
    setEditErr(null)
  }

  async function saveEditMember() {
    if (!editTarget) return
    const err = validateForm(editForm)
    if (err) { setEditErr(err); return }
    const fullName = [editForm.prefix, editForm.firstName.trim(), editForm.lastName.trim()].filter(Boolean).join(' ')
    const payload = {
      email: editForm.email.trim(),
      full_name: fullName || null,
      phone: editForm.phone || null,
      role: editForm.orgRole,
      prefix: editForm.prefix || null,
      gender: editForm.gender || null,
      birthdate: editForm.birthdate || null,
      anniversary: editForm.anniversary || null,
      ministry: editForm.ministry || null,
      org_roles: editForm.roles,
      is_active: editForm.status === 'active',
    }
    const res = await fetchApi(`/api/v1/tenant/${slug}/members/${editTarget.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    if (res.status === 409) { setEditErr('Ese correo ya está en uso'); return }
    if (!res.ok) { setEditErr('Error al guardar. Inténtalo de nuevo.'); return }
    const updated: ApiMember = await res.json()
    const idx = members.findIndex(p => p.id === editTarget.id)
    const updatedPerson = { ...apiToPerson(updated, idx >= 0 ? idx : 0), color: editTarget.color }
    setMembers(prev => prev.map(p => p.id === editTarget.id ? updatedPerson : p))
    if (isEditingMember) {
      setSelectedMember(updatedPerson)
      setIsEditingMember(false)
    }
    setEditTarget(null); setEditErr(null)
  }

  async function handleEditMember(e: React.FormEvent) {
    e.preventDefault()
    await saveEditMember()
  }

  async function handleDeleteMember() {
    if (!deleteTarget) return
    const res = await fetchApi(`/api/v1/tenant/${slug}/members/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
    })
    if (!res.ok && res.status !== 204) return
    setMembers(prev => prev.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  // ── Attachment helpers
  function attAuthHeaders(): Record<string, string> {
    return apiToken ? { Authorization: `Bearer ${apiToken}` } : {}
  }

  async function fetchAttachments(memberId: string) {
    setAttachments([]); setAttLoading(true)
    try {
      const res = await fetchApi(`/api/v1/tenant/${slug}/members/${memberId}/attachments`, { headers: attAuthHeaders() })
      if (res.ok) setAttachments(await res.json())
    } finally { setAttLoading(false) }
  }

  async function uploadAttachment() {
    if (!attUploadFile || !selectedMember) return
    if (!attUploadLabel.trim()) { setAttUploadErr('La etiqueta es obligatoria'); return }
    setAttUploading(true); setAttUploadErr(null)
    try {
      const fd = new FormData()
      fd.append('file', attUploadFile)
      fd.append('label', attUploadLabel.trim())
      const res = await fetchApi(`/api/v1/tenant/${slug}/members/${selectedMember.id}/attachments`, {
        method: 'POST', headers: attAuthHeaders(), body: fd,
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.detail || 'Error'); }
      const created = await res.json()
      setAttachments(prev => [created, ...prev])
      setAttUploadOpen(false); setAttUploadFile(null); setAttUploadLabel('')
    } catch (e: any) { setAttUploadErr(e.message) }
    finally { setAttUploading(false) }
  }

  async function deleteAttachment(attId: string) {
    if (!selectedMember) return
    await fetchApi(`/api/v1/tenant/${slug}/members/${selectedMember.id}/attachments/${attId}`, {
      method: 'DELETE', headers: attAuthHeaders(),
    })
    setAttachments(prev => prev.filter(a => a.id !== attId))
  }

  async function previewAttachment(att: { id: string; label: string; mime_type: string }) {
    if (!selectedMember) return
    const res = await fetchApi(`/api/v1/tenant/${slug}/members/${selectedMember.id}/attachments/${att.id}/data`, {
      headers: attAuthHeaders(),
    })
    if (!res.ok) return
    const j = await res.json()
    setAttPreview({ label: j.label, mime: j.mime_type, data: j.file_data })
  }

  // Init settings state when entering configuracion
  useEffect(() => {
    if (module !== 'configuracion' || !org) return
    setSName(org.name)
    setSAlias(org.alias ?? '')
    setSIcon(org.icon)
    setSMins((org.ministries?.length) ? [...org.ministries] : [...DEFAULT_MINISTRIES])
    setSRoles((org.member_roles?.length) ? [...org.member_roles] : [...PREDEFINED_ROLES])
    setSRequire2FA(org.require_2fa_admins ?? false)
    setSNewItem(''); setSErr(null); setSSaved(false)
  }, [module])

  async function saveSettings(partial: Record<string, unknown>) {
    if (!slug) return
    setSSaving(true); setSErr(null)
    const res = await fetchApi(`/api/v1/tenant/${slug}/settings`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(partial),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setSErr(d.detail ?? 'Error al guardar. Inténtalo de nuevo.')
      setSSaving(false); return
    }
    const updated: OrgInfo = await res.json()
    setOrg(updated)
    setSSaved(true); setSSaving(false)
    setTimeout(() => setSSaved(false), 3000)
  }

  function handleIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 300 * 1024) { setSErr('Imagen demasiado grande (máx. 300 KB)'); return }
    const reader = new FileReader()
    reader.onload = ev => setSIcon(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function toggleRole(role: string, f: MemberForm, setF: React.Dispatch<React.SetStateAction<MemberForm>>) {
    setF(prev => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role],
    }))
  }

  // Profile init — load own member data when entering profile view
  useEffect(() => {
    if (module !== 'perfil' || !slug || !userId || !apiToken) return
    fetchApi(`/api/v1/tenant/${slug}/members/${userId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    }).then(r => r.ok ? r.json() : null).then((m: ApiMember | null) => {
      if (!m) return
      const nameParts = (m.full_name || '').split(' ')
      const prefixes = ['Sr.','Sra.','Rvdo.','Rvda.','Dr.','Dra.']
      const prefix = prefixes.includes(nameParts[0]) ? nameParts[0] : ''
      const rest = prefix ? nameParts.slice(1) : nameParts
      setPPrefix(prefix)
      setPFirstName(rest[0] ?? '')
      setPLastName(rest.slice(1).join(' '))
      setPEmail(m.email)
      setPPhone(m.phone ?? '')
      setPGender(m.gender ?? '')
      setPBirthdate(m.birthdate ?? '')
      setPAnniversary(m.anniversary ?? '')
      setPAvatar(m.avatar ?? null)
    }).catch(() => {})
  }, [module, slug, userId, apiToken])

  async function handleProfileAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { setPErr('La imagen no puede superar 3 MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setPAvatar(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function saveProfile() {
    if (!slug || !apiToken) return
    if (!pFirstName.trim()) { setPErr('El nombre es obligatorio'); return }
    setPSaving(true); setPErr(null); setPSaved(false)
    const fullName = [pPrefix, pFirstName.trim(), pLastName.trim()].filter(Boolean).join(' ')
    const payload: Record<string, unknown> = {
      full_name: fullName || null,
      phone: pPhone || null,
      prefix: pPrefix || null,
      gender: pGender || null,
      birthdate: pBirthdate || null,
      anniversary: pAnniversary || null,
      email: pEmail.trim() || null,
      avatar: pAvatar,
    }
    const res = await fetchApi(`/api/v1/tenant/${slug}/auth/profile`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    setPSaving(false)
    if (res.status === 409) { setPErr('Ese correo ya está en uso'); return }
    if (res.status === 400) { const d = await res.json(); setPErr(d.detail ?? 'Error'); return }
    if (!res.ok) { setPErr('Error al guardar. Inténtalo de nuevo.'); return }
    const updated: ApiMember = await res.json()
    setUserAvatar(updated.avatar ?? null)
    setUserName(pFirstName.trim())
    setPSaved(true)
    setTimeout(() => setPSaved(false), 3000)
  }

  const currentMod = MODULES.find(m => m.id === module)

  // ── Loading screen
  if (screen === 'loading') return (
    <div style={s.fullPage}><div style={s.spinner} /></div>
  )

  // ── Not found
  if (screen === 'not-found' || !org) return (
    <div style={s.fullPage}>
      <div style={s.loginCard}>
        <div style={s.wLogo}>
          <svg viewBox="0 0 44 32" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 20 }}>
            <rect x="0"    y="2"  width="7" height="28" rx="3.5" fill="white"/>
            <rect x="10"   y="16" width="7" height="14" rx="3.5" fill="white"/>
            <rect x="18.5" y="8"  width="7" height="22" rx="3.5" fill="white"/>
            <rect x="27"   y="16" width="7" height="14" rx="3.5" fill="white"/>
            <rect x="37"   y="2"  width="7" height="28" rx="3.5" fill="white"/>
          </svg>
        </div>
        <h2 style={s.loginTitle}>Portal no encontrado</h2>
        <p style={s.loginSub}>La organización <code style={s.code}>{slug}</code> no existe o no está activa.</p>
      </div>
    </div>
  )

  // ── Login screen removed — unauthenticated users redirect to /portal (see useEffect)
  if (screen === 'login') return null

  // ── App shell ──────────────────────────────────────────────────────────────

  const effectiveMinistries = (org?.ministries?.length ?? 0) > 0 ? org!.ministries : DEFAULT_MINISTRIES
  const effectiveRoles      = (org?.member_roles?.length ?? 0) > 0 ? org!.member_roles : PREDEFINED_ROLES
  const allMinistries = [...new Set(members.map(p => p.ministry))].sort()

  const filteredMembers = members.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) ||
           p.ministry.toLowerCase().includes(q) || p.roles.some(r => r.toLowerCase().includes(q))
    const matchMinistry = !selectedMinistry || p.ministry === selectedMinistry
    return matchSearch && matchMinistry
  })

  const displayMembers = miembrosView === 'nuevos'
    ? [...filteredMembers].sort((a, b) => b.joined.localeCompare(a.joined)).slice(0, 5)
    : miembrosView === 'ministerio'
      ? [...filteredMembers].sort((a, b) => a.ministry.localeCompare(b.ministry))
      : filteredMembers

  const tableHeaders = ['Miembro', 'Ministerio', 'Roles', 'Contacto', 'Ingresó', 'Estado', ...(canEdit ? [''] : [])]

  return (
    <div style={s.appWrap}>

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header style={s.topBar}>

        {/* Left: module switcher */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }} ref={dropRef}>
          <button style={s.modBtn} onClick={() => setDropOpen(o => !o)}>
            <span style={{ ...s.modIcon, background: currentMod?.color ?? '#64748B' }}>
              {currentMod?.icon ?? <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>}
            </span>
            <span style={s.modLabel}>{currentMod?.label ?? 'Configuración'}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}
              style={{ color: C.muted, marginLeft: 2, flexShrink: 0, transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
            </svg>
          </button>

          {dropOpen && (
            <div style={s.dropdown}>
              <div style={s.dropSection}>
                {MODULES.filter(m => !accessibleModules || accessibleModules.includes(m.id)).map(m => (
                  <button key={m.id} style={{ ...s.dropItem, ...(m.id === module ? s.dropItemActive : {}) }}
                    onClick={() => switchModule(m.id)}
                    onMouseEnter={e => { if (m.id !== module) e.currentTarget.style.background = C.soft }}
                    onMouseLeave={e => { if (m.id !== module) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ ...s.dropIcon, background: m.color }}>{m.icon}</span>
                    <span style={s.dropLabel}>{m.label}</span>
                    {m.id === module && (
                      <svg viewBox="0 0 20 20" fill={C.primary} width={14} height={14} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div style={s.dropDivider} />
              <div style={s.dropSection}>
                <button style={{ ...s.dropItem, ...(module === 'configuracion' ? s.dropItemActive : {}) }}
                  onClick={() => { switchModule('configuracion') }}
                  onMouseEnter={e => { if (module !== 'configuracion') e.currentTarget.style.background = C.soft }}
                  onMouseLeave={e => { if (module !== 'configuracion') e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ ...s.dropIcon, background: '#64748B' }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                    </svg>
                  </span>
                  <span style={s.dropLabel}>Opciones de la cuenta</span>
                  {module === 'configuracion' && (
                    <svg viewBox="0 0 20 20" fill={C.primary} width={14} height={14} style={{ marginLeft: 'auto' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center: sub-navigation tabs */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {module === 'miembros' && (
            <nav style={s.tabNav}>
              {(['dashboard', 'miembros', 'flujos', 'formularios'] as MiembrosTab[]).map(tab => {
                const isActive  = miembrosTab === tab
                const isHovered = hoveredTab === tab
                return (
                  <button key={tab}
                    style={{
                      ...s.tabBtn,
                      ...(isActive ? s.tabBtnActive : {}),
                      ...(isHovered && !isActive ? { background: C.soft, color: C.text } : {}),
                    }}
                    onClick={() => { setMiembrosTab(tab); if (tab === 'miembros') { setSelectedMember(null); setIsEditingMember(false); setEditTarget(null); setEditErr(null); } }}
                    onMouseEnter={() => setHoveredTab(tab)}
                    onMouseLeave={() => setHoveredTab(null)}>
                    {tab === 'dashboard' ? 'Dashboard' : tab === 'miembros' ? 'Miembros' : tab === 'flujos' ? 'Flujos' : 'Formularios'}
                  </button>
                )
              })}
            </nav>
          )}
          {module === 'servicios' && (
            <nav style={s.tabNav}>
              {(['mi-planificacion', 'servicios', 'canciones', 'media', 'personas'] as ServiciosTab[]).map(tab => {
                const labels: Record<ServiciosTab, string> = {
                  'mi-planificacion': 'Mi Planificación', 'servicios': 'Servicios',
                  'canciones': 'Canciones', 'media': 'Media', 'personas': 'Personas',
                }
                const isActive  = serviciosTab === tab
                const isHovered = hoveredSvcTab === tab
                return (
                  <button key={tab}
                    style={{
                      ...s.tabBtn,
                      ...(isActive ? s.tabBtnActive : {}),
                      ...(isHovered && !isActive ? { background: C.soft, color: C.text } : {}),
                    }}
                    onClick={() => setServiciosTab(tab)}
                    onMouseEnter={() => setHoveredSvcTab(tab)}
                    onMouseLeave={() => setHoveredSvcTab(null)}>
                    {labels[tab]}
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        {/* Right: org name + user logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={s.orgName}>{org.name}</span>
          <div style={{ position: 'relative' }} ref={logoutRef}>
            <button style={s.topUser} onClick={() => setLogoutOpen(o => !o)}>
              <div style={s.userAvatar}>
                {userAvatar
                  ? <img src={userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  : userName.slice(0, 2).toUpperCase()
                }
              </div>
              <span style={s.userName}>{userName}</span>
              <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14} style={{ color: C.light }}>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
              </svg>
            </button>
            {logoutOpen && (
              <div style={s.logoutDrop}>
                <div style={s.logoutInfo}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{userName}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{email}</div>
                  <div style={{ fontSize: 10, color: C.light, marginTop: 3, textTransform: 'capitalize' }}>{userRole}</div>
                </div>
                {switchOrgs.length > 0 && (
                  <>
                    <div style={{ height: 1, background: C.border }} />
                    <button style={{ ...s.logoutBtn, color: C.text }}
                      onClick={() => {
                        setLogoutOpen(false)
                        if (switchOrgs.length === 1) {
                          handleSwitchOrg(switchOrgs[0].slug, switchOrgs[0].name)
                        } else {
                          setSwitchOpen(true)
                        }
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.soft}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
                        <path d="M8 5a1 1 0 000 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z"/>
                      </svg>
                      Cambiar de cuenta
                    </button>
                  </>
                )}
                <div style={{ height: 1, background: C.border }} />
                <button style={{ ...s.logoutBtn, color: C.text }}
                  onClick={() => { setLogoutOpen(false); switchModule('perfil') }}
                  onMouseEnter={e => e.currentTarget.style.background = C.soft}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                  Mi perfil
                </button>
                <div style={{ height: 1, background: C.border }} />
                <button style={s.logoutBtn} onClick={handleLogout}
                  onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={s.contentWrap}>

        {/* ── Miembros — Dashboard ──────────────────────────────────────────── */}
        {module === 'miembros' && miembrosTab === 'dashboard' && (
          <main style={{ ...s.main, gap: 20 }}>
            <div>
              <h1 style={s.mainTitle}>Dashboard</h1>
              <p style={s.mainSub}>{org.name}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Total miembros', value: members.length, color: C.primary, bg: '#EEF2FF' },
                { label: 'Activos',        value: members.filter(m => m.status === 'active').length,   color: '#059669', bg: '#ECFDF5' },
                { label: 'Inactivos',      value: members.filter(m => m.status === 'inactive').length, color: '#94A3B8', bg: '#F1F5F9' },
                { label: 'Ministerios',    value: allMinistries.length, color: '#D97706', bg: '#FFFBEB' },
              ].map(stat => (
                <div key={stat.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{stat.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Por ministerio</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allMinistries.map(min => {
                  const count = members.filter(m => m.ministry === min).length
                  const pct   = Math.round((count / members.length) * 100)
                  return (
                    <div key={min} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 100, fontSize: 12, color: C.muted, flexShrink: 0 }}>{min}</div>
                      <div style={{ flex: 1, height: 6, background: C.soft, borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: C.primary, borderRadius: 99 }} />
                      </div>
                      <div style={{ width: 28, fontSize: 12, fontWeight: 600, color: C.muted, textAlign: 'right' }}>{count}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.text }}>Incorporaciones recientes</div>
              {members.slice(0, 5).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${C.soft}` }}>
                  <div style={{ ...s.avatar, background: p.color }}>{p.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.light }}>{p.ministry}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.light }}>{p.joined}</div>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* ── Miembros — Lista ──────────────────────────────────────────────── */}
        {module === 'miembros' && miembrosTab === 'miembros' && !selectedMember && (
          <>
            <aside style={s.sidebar}>
              <div style={s.sidebarHead}>
                <span style={{ ...s.sidebarModIcon, background: '#2563EB' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width={13} height={13}><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                </span>
                <span style={s.sidebarHeadText}>Miembros</span>
              </div>
              <nav style={s.sidebarNav}>
                <p style={s.sidebarSection}>Filtrar</p>
                {([
                  { id: 'todas',      label: 'Todos los miembros', count: members.length },
                  { id: 'ministerio', label: 'Por ministerio',     count: allMinistries.length },
                  { id: 'nuevos',     label: 'Nuevos',             count: Math.min(5, members.length) },
                ] as { id: MiembrosView; label: string; count: number }[]).map(item => {
                  const isActive = miembrosView === item.id && !selectedMinistry
                  return (
                    <button key={item.id}
                      style={{ ...s.sidebarItem, ...(isActive ? s.sidebarItemActive : {}) }}
                      onClick={() => { setMiembrosView(item.id); setSelectedMinistry(null) }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.soft }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                      <span style={s.sidebarBadge}>{item.count}</span>
                    </button>
                  )
                })}
                <p style={{ ...s.sidebarSection, marginTop: 20 }}>Ministerios</p>
                {allMinistries.map(m => {
                  const isActive = selectedMinistry === m
                  return (
                    <button key={m}
                      style={{ ...s.sidebarItem, ...(isActive ? s.sidebarItemActive : {}) }}
                      onClick={() => { setSelectedMinistry(isActive ? null : m); setMiembrosView('todas') }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.soft }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                      <span style={{ flex: 1, textAlign: 'left' }}>{m}</span>
                      <span style={s.sidebarBadge}>{members.filter(p => p.ministry === m).length}</span>
                    </button>
                  )
                })}
              </nav>
            </aside>

            <main style={s.main}>
              <div style={s.mainHead}>
                <div>
                  <h1 style={s.mainTitle}>
                    {selectedMinistry ? selectedMinistry
                      : miembrosView === 'nuevos' ? 'Nuevos miembros'
                      : miembrosView === 'ministerio' ? 'Por ministerio'
                      : 'Todos los miembros'}
                  </h1>
                  <p style={s.mainSub}>{displayMembers.length} miembro{displayMembers.length !== 1 ? 's' : ''}</p>
                </div>
                {canEdit && (
                  <button style={s.btnPrimary} onClick={() => setAddOpen(true)}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                    Agregar miembro
                  </button>
                )}
              </div>

              <div style={s.searchWrap}>
                <svg viewBox="0 0 20 20" fill="currentColor" width={15} height={15} style={{ color: C.light, flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                <input style={s.searchInput} placeholder="Buscar por nombre, email, ministerio o rol…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {membersLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: C.light, fontSize: 13 }}>Cargando miembros…</div>
              )}

              {!membersLoading && <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {tableHeaders.map((h, i) => (
                        <th key={i} style={{ ...s.th, ...(i === tableHeaders.length - 1 && canEdit ? { width: 80 } : {}) }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayMembers.map(p => (
                      <tr key={p.id}
                        style={s.tr}
                        onClick={() => { setSelectedMember(p); fetchAttachments(p.id) }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.soft }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ ...s.avatar, background: p.color }}>{p.initials}</div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{p.name}</span>
                                {p.orgRole !== 'member' && (
                                  <span style={{ ...s.orgRoleTag, ...(p.orgRole === 'admin' ? s.orgRoleAdmin : s.orgRoleLeader) }}>
                                    {p.orgRole === 'admin' ? 'Admin' : 'Líder'}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: C.light }}>{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={s.td}><span style={s.ministryTag}>{p.ministry}</span></td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {p.roles.length === 0
                              ? <span style={{ fontSize: 12, color: C.light }}>—</span>
                              : p.roles.map(r => <span key={r} style={s.roleTag}>{r}</span>)}
                          </div>
                        </td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{p.phone}</td>
                        <td style={{ ...s.td, color: C.light, fontSize: 12 }}>{p.joined}</td>
                        <td style={s.td}>
                          <span style={{ ...s.statusTag, ...(p.status === 'active' ? s.statusActive : s.statusInactive) }}>
                            {p.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        {canEdit && (
                          <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button style={s.iconBtn} title="Editar" onClick={() => openEdit(p)}
                                onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                                </svg>
                              </button>
                              <button style={{ ...s.iconBtn, color: C.danger }} title="Eliminar" onClick={() => setDeleteTarget(p)}
                                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {displayMembers.length === 0 && (
                  <div style={s.empty}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={C.light} strokeWidth={1.5} width={40} height={40}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
                    </svg>
                    <p style={{ color: C.light, fontSize: 14, marginTop: 12 }}>Sin resultados</p>
                  </div>
                )}
              </div>}
            </main>
          </>
        )}

        {/* ── Miembros — Flujos ─────────────────────────────────────────────── */}
        {module === 'miembros' && miembrosTab === 'flujos' && (
          <main style={{ ...s.main, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
            <div style={s.placeholder}>
              <div style={{ ...s.placeholderIcon, background: '#7C3AED' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width={26} height={26}>
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/>
                </svg>
              </div>
              <h2 style={s.placeholderTitle}>Flujos</h2>
              <p style={s.placeholderSub}>Automatiza el seguimiento de nuevos miembros, visitas y procesos de incorporación.</p>
              <span style={s.comingBadge}>Próximamente</span>
            </div>
          </main>
        )}

        {/* ── Miembros — Formularios ────────────────────────────────────────── */}
        {module === 'miembros' && miembrosTab === 'formularios' && (
          <main style={{ ...s.main, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
            <div style={s.placeholder}>
              <div style={{ ...s.placeholderIcon, background: '#0891B2' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width={26} height={26}>
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                </svg>
              </div>
              <h2 style={s.placeholderTitle}>Formularios</h2>
              <p style={s.placeholderSub}>Crea formularios personalizados para registro de visitas, solicitudes y seguimiento de miembros.</p>
              <span style={s.comingBadge}>Próximamente</span>
            </div>
          </main>
        )}

        {/* ── Servicios (módulo independiente en src/tenant/pages/Servicios.tsx) ── */}
        {module === 'servicios' && <Servicios tab={serviciosTab} />}

        {/* ── Other modules ─────────────────────────────────────────────────── */}
        {module !== 'miembros' && module !== 'servicios' && module !== 'configuracion' && module !== 'perfil' && (
          <main style={{ ...s.main, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
            <div style={s.placeholder}>
              <div style={{ ...s.placeholderIcon, background: currentMod?.color ?? C.muted }}>
                {currentMod?.icon}
              </div>
              <h2 style={s.placeholderTitle}>{currentMod?.label}</h2>
              <p style={s.placeholderSub}>Este módulo estará disponible próximamente.<br/>Estamos construyendo algo increíble para tu iglesia.</p>
              <span style={s.comingBadge}>Próximamente</span>
            </div>
          </main>
        )}

        {/* ── Mi perfil ─────────────────────────────────────────────────────── */}
        {module === 'perfil' && (
          <main style={{ ...s.main, gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={s.mainTitle}>Mi perfil</h1>
                <p style={s.mainSub}>Gestiona tu información personal</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={s.btnGhost} onClick={() => switchModule('miembros')}>Volver</button>
                <button style={s.btnPrimary} onClick={saveProfile} disabled={pSaving}>
                  {pSaving ? 'Guardando…' : pSaved ? '✓ Guardado' : 'Guardar cambios'}
                </button>
              </div>
            </div>

            {pErr && <div style={s.formErr}>{pErr}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

              {/* Avatar card */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                <div style={{ width: 90, height: 90, borderRadius: 24, background: C.primary, color: '#fff', fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {pAvatar
                    ? <img src={pAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : userName.slice(0, 2).toUpperCase()
                  }
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{userName}</div>
                  <div style={{ fontSize: 12, color: C.light, marginTop: 2 }}>{pEmail}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4, textTransform: 'capitalize' }}>{userRole}</div>
                </div>
                <input ref={profileAvatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfileAvatarUpload} />
                <button style={{ ...s.btnGhost, width: '100%', justifyContent: 'center' }} onClick={() => profileAvatarRef.current?.click()}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width={13} height={13}><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/></svg>
                  Cambiar foto
                </button>
                {pAvatar && (
                  <button style={{ ...s.btnGhost, width: '100%', justifyContent: 'center', color: C.danger, borderColor: 'rgba(239,68,68,.3)', fontSize: 12 }}
                    onClick={() => setPAvatar(null)}>
                    Eliminar foto
                  </button>
                )}
                <p style={{ fontSize: 11, color: C.light, margin: 0 }}>Máx. 3 MB · JPG, PNG, WebP</p>
              </div>

              {/* Info form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'visible' }}>
                  <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${C.border}`, borderRadius: '14px 14px 0 0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>CUENTA</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Información personal</div>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: '0 0 110px' }}>
                        <label style={s.formLabel}>Prefijo</label>
                        <SelectField value={pPrefix} onChange={e => setPPrefix(e.target.value)}>
                          <option value="">—</option>
                          {['Sr.','Sra.','Rvdo.','Rvda.','Dr.','Dra.'].map(p => <option key={p} value={p}>{p}</option>)}
                        </SelectField>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={s.formLabel}>Nombre *</label>
                        <input style={s.formInput} value={pFirstName} onChange={e => setPFirstName(e.target.value)} placeholder="Nombre" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={s.formLabel}>Apellido</label>
                        <input style={s.formInput} value={pLastName} onChange={e => setPLastName(e.target.value)} placeholder="Apellido" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={s.formLabel}>Correo electrónico</label>
                        <input style={s.formInput} type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} placeholder="tu@correo.com" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={s.formLabel}>Teléfono</label>
                        <PhoneInput value={pPhone} onChange={setPPhone} inputStyle={s.formInput} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={s.formLabel}>Género</label>
                        <SelectField value={pGender} onChange={e => setPGender(e.target.value)}>
                          <option value="">—</option>
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                        </SelectField>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={s.formLabel}>Fecha de nacimiento</label>
                        <input style={s.formInput} type="date" value={pBirthdate} onChange={e => setPBirthdate(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={s.formLabel}>Aniversario de boda</label>
                        <input style={s.formInput} type="date" value={pAnniversary} onChange={e => setPAnniversary(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ── Perfil del miembro (vista completa) ──────────────────────────── */}
        {module === 'miembros' && miembrosTab === 'miembros' && selectedMember && (
          <main style={{ ...s.main, gap: 20 }}>

            {/* Breadcrumb */}
            <div>
              <button style={s.backBtn} onClick={() => { setSelectedMember(null); setIsEditingMember(false); setEditTarget(null); setEditErr(null) }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width={13} height={13}>
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                MIEMBROS
              </button>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={s.mainTitle}>{selectedMember.name}</h1>
                <p style={s.mainSub}>{selectedMember.email}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {!isEditingMember && selectedMember.orgRole !== 'member' && (
                  <span style={{ ...s.orgRoleTag, ...(selectedMember.orgRole === 'admin' ? s.orgRoleAdmin : s.orgRoleLeader) }}>
                    {selectedMember.orgRole === 'admin' ? 'Admin org' : 'Líder'}
                  </span>
                )}
                {!isEditingMember && (
                  <span style={{ ...s.statusTag, ...(selectedMember.status === 'active' ? s.statusActive : s.statusInactive) }}>
                    {selectedMember.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                )}
                {canEdit && !isEditingMember && (
                  <>
                    <button style={s.btnGhost} onClick={() => { openEdit(selectedMember); setIsEditingMember(true) }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                      Editar
                    </button>
                    <button style={{ ...s.btnGhost, color: C.danger, borderColor: 'rgba(239,68,68,.3)' }}
                      onClick={() => { setDeleteTarget(selectedMember); setSelectedMember(null) }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      Eliminar
                    </button>
                  </>
                )}
                {isEditingMember && (
                  <>
                    <button style={s.btnGhost} onClick={() => { setIsEditingMember(false); setEditTarget(null); setEditErr(null) }}>
                      Cancelar
                    </button>
                    <button style={s.btnPrimary} onClick={() => saveEditMember()}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Guardar cambios
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Body: two-column */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>

              {/* Left: avatar card */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <div style={{ width: 84, height: 84, borderRadius: 22, background: selectedMember.color, color: '#fff', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {selectedMember.avatar
                    ? <img src={selectedMember.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : selectedMember.initials
                  }
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{selectedMember.name}</div>
                  <div style={{ fontSize: 12, color: C.light, marginTop: 3 }}>{selectedMember.email}</div>
                </div>
                {selectedMember.orgRole !== 'member' ? (
                  <span style={{ ...s.orgRoleTag, ...(selectedMember.orgRole === 'admin' ? s.orgRoleAdmin : s.orgRoleLeader) }}>
                    {selectedMember.orgRole === 'admin' ? 'Admin org' : 'Líder'}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: C.muted }}>Miembro</span>
                )}
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Org: <strong style={{ color: C.text }}>{org?.name}</strong></div>
              </div>

              {/* Right: info cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {editErr && isEditingMember && (
                  <div style={s.formErr}>{editErr}</div>
                )}

                {/* Información del miembro */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'visible' }}>
                  <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${C.border}`, borderRadius: '14px 14px 0 0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>PERFIL</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Información del miembro</div>
                  </div>
                  {isEditingMember ? (
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: '0 0 110px' }}>
                          <label style={s.formLabel}>Prefijo</label>
                          <SelectField value={editForm.prefix} onChange={e => setEditForm(f => ({ ...f, prefix: e.target.value }))}>
                            <option value="">—</option>
                            {['Sr.', 'Sra.', 'Rvdo.', 'Rvda.', 'Dr.', 'Dra.'].map(p => <option key={p} value={p}>{p}</option>)}
                          </SelectField>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Nombre *</label>
                          <input style={s.formInput} value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Nombre" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Apellido *</label>
                          <input style={s.formInput} value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Apellido" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Correo electrónico *</label>
                          <input style={s.formInput} type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Teléfono</label>
                          <PhoneInput value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} inputStyle={s.formInput} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Ministerio</label>
                          <SelectField value={editForm.ministry} onChange={e => setEditForm(f => ({ ...f, ministry: e.target.value }))}>
                            <option value="">Seleccionar…</option>
                            {effectiveMinistries.map(m => <option key={m} value={m}>{m}</option>)}
                          </SelectField>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Rol en la org.</label>
                          <SelectField value={editForm.orgRole} onChange={e => setEditForm(f => ({ ...f, orgRole: e.target.value as 'admin' | 'leader' | 'member' }))}>
                            <option value="member">Miembro</option>
                            <option value="leader">Líder</option>
                            <option value="admin">Admin</option>
                          </SelectField>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Estado</label>
                          <SelectField value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                          </SelectField>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Género</label>
                          <SelectField value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                            <option value="">—</option>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                          </SelectField>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Fecha de nacimiento</label>
                          <input style={s.formInput} type="date" value={editForm.birthdate} onChange={e => setEditForm(f => ({ ...f, birthdate: e.target.value }))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.formLabel}>Aniversario de boda</label>
                          <input style={s.formInput} type="date" value={editForm.anniversary} onChange={e => setEditForm(f => ({ ...f, anniversary: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {[
                        { label: 'Prefijo',         value: selectedMember.prefix || '—' },
                        { label: 'Nombre completo', value: selectedMember.name },
                        { label: 'Email',           value: selectedMember.email },
                        { label: 'Teléfono',        value: selectedMember.phone || '—' },
                        { label: 'Ministerio',      value: selectedMember.ministry || '—' },
                        { label: 'Alta',            value: selectedMember.joined },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${C.soft}` }}>
                          <div style={{ width: 200, fontSize: 13, color: C.muted, flexShrink: 0 }}>{row.label}</div>
                          <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{row.value}</div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${C.soft}` }}>
                        <div style={{ width: 200, fontSize: 13, color: C.muted, flexShrink: 0 }}>Rol</div>
                        <div style={{ flex: 1 }}>
                          {selectedMember.orgRole === 'member'
                            ? <span style={{ fontSize: 13, color: C.muted }}>Miembro</span>
                            : <span style={{ ...s.orgRoleTag, ...(selectedMember.orgRole === 'admin' ? s.orgRoleAdmin : s.orgRoleLeader) }}>
                                {selectedMember.orgRole === 'admin' ? 'Admin org' : 'Líder'}
                              </span>
                          }
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${C.soft}` }}>
                        <div style={{ width: 200, fontSize: 13, color: C.muted, flexShrink: 0 }}>Género</div>
                        <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>
                          {selectedMember.gender ? (selectedMember.gender === 'M' ? 'Masculino' : 'Femenino') : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${C.soft}` }}>
                        <div style={{ width: 200, fontSize: 13, color: C.muted, flexShrink: 0 }}>Fecha de nacimiento</div>
                        <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{selectedMember.birthdate || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${C.soft}` }}>
                        <div style={{ width: 200, fontSize: 13, color: C.muted, flexShrink: 0 }}>Aniversario de boda</div>
                        <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{selectedMember.anniversary || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 20px' }}>
                        <div style={{ width: 200, fontSize: 13, color: C.muted, flexShrink: 0 }}>Estado</div>
                        <div style={{ flex: 1 }}>
                          <span style={{ ...s.statusTag, ...(selectedMember.status === 'active' ? s.statusActive : s.statusInactive) }}>
                            {selectedMember.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Roles en el ministerio */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 15, fontWeight: 700, color: C.text }}>Roles en el ministerio</div>
                  {isEditingMember ? (
                    <div style={{ padding: '14px 20px' }}>
                      <div style={s.rolesGrid}>
                        {effectiveRoles.map(role => (
                          <button key={role} type="button"
                            style={{ ...s.roleChip, ...(editForm.roles.includes(role) ? s.roleChipActive : {}) }}
                            onClick={() => toggleRole(role, editForm, setEditForm)}>
                            {editForm.roles.includes(role) && (
                              <svg viewBox="0 0 20 20" fill="currentColor" width={11} height={11} style={{ flexShrink: 0 }}>
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                            )}
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedMember.roles.length > 0
                        ? selectedMember.roles.map(r => <span key={r} style={s.roleTag}>{r}</span>)
                        : <span style={{ fontSize: 13, color: C.light }}>Sin roles asignados</span>
                      }
                    </div>
                  )}
                </div>

                {/* Documentos adjuntos */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Documentos adjuntos</div>
                    {canEdit && (
                      <button style={s.btnPrimary} onClick={() => { setAttUploadOpen(true); setAttUploadErr(null); setAttUploadFile(null); setAttUploadLabel('') }}>
                        + Subir documento
                      </button>
                    )}
                  </div>
                  <div style={{ padding: attLoading || attachments.length === 0 ? '24px 20px' : 0 }}>
                    {attLoading ? (
                      <p style={{ fontSize: 13, color: C.light, margin: 0 }}>Cargando…</p>
                    ) : attachments.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={C.light} strokeWidth="1.5" width={32} height={32}><path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <p style={{ fontSize: 13, color: C.light, margin: 0 }}>Sin documentos adjuntos</p>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Nombre', 'Archivo', 'Tamaño', 'Subido', ''].map(h => (
                              <th key={h} style={{ fontSize: 11, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '8px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {attachments.map(att => (
                            <AttachmentRow
                              key={att.id}
                              att={att}
                              canEdit={canEdit}
                              slug={slug!}
                              memberId={selectedMember.id}
                              authHeaders={attAuthHeaders}
                              onPreview={() => previewAttachment(att)}
                              onDelete={() => deleteAttachment(att.id)}
                              onRenamed={(id, label) => setAttachments(prev => prev.map(a => a.id === id ? { ...a, label } : a))}
                              fetchApi={fetchApi}
                            />
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </main>
        )}

        {/* ── Upload attachment modal */}
        {attUploadOpen && selectedMember && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
            onClick={e => e.target === e.currentTarget && setAttUploadOpen(false)}>
            <div style={{ background: C.surface, borderRadius: 14, padding: '28px 28px 24px', width: 420, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 8px 40px rgba(0,0,0,.18)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>Subir documento</h3>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', flexDirection: 'column', gap: 6 }}>
                Etiqueta / nombre del documento
                <input
                  style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, color: C.text, outline: 'none' }}
                  value={attUploadLabel}
                  onChange={e => setAttUploadLabel(e.target.value)}
                  placeholder="p. ej. Certificado manipulación alimentos"
                  autoFocus
                />
              </label>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Archivo</div>
                <div
                  style={{ border: `2px dashed ${attUploadFile ? C.primary : C.border}`, borderRadius: 10, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: attUploadFile ? '#EEF2FF' : C.soft }}
                  onClick={() => attFileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setAttUploadFile(f) }}>
                  <input ref={attFileRef} type="file" style={{ display: 'none' }} onChange={e => setAttUploadFile(e.target.files?.[0] ?? null)} />
                  {attUploadFile
                    ? <><div style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>{attUploadFile.name}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{(attUploadFile.size / 1024).toFixed(0)} KB</div></>
                    : <><div style={{ fontSize: 13, color: C.muted }}>Arrastra un archivo o haz clic para seleccionar</div><div style={{ fontSize: 11, color: C.light, marginTop: 4 }}>PDF, imágenes, documentos — máx. 10 MB</div></>
                  }
                </div>
              </div>
              {attUploadErr && <p style={{ fontSize: 12, color: C.danger, margin: 0 }}>{attUploadErr}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button style={s.btnGhost} onClick={() => setAttUploadOpen(false)}>Cancelar</button>
                <button style={s.btnPrimary} disabled={attUploading || !attUploadFile} onClick={uploadAttachment}>
                  {attUploading ? 'Subiendo…' : 'Subir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Document preview modal */}
        {attPreview && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}
            onClick={e => e.target === e.currentTarget && setAttPreview(null)}>
            <div style={{ background: C.surface, borderRadius: 14, width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 16px 60px rgba(0,0,0,.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{attPreview.label}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.muted, lineHeight: 1 }} onClick={() => setAttPreview(null)}>✕</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B', minHeight: 400 }}>
                {attPreview.mime.startsWith('image/') ? (
                  <img src={`data:${attPreview.mime};base64,${attPreview.data}`} alt={attPreview.label} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
                ) : attPreview.mime === 'application/pdf' ? (
                  <iframe
                    src={`data:application/pdf;base64,${attPreview.data}`}
                    style={{ width: '100%', height: '75vh', border: 'none' }}
                    title={attPreview.label}
                  />
                ) : (
                  <div style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', padding: 40 }}>
                    Vista previa no disponible para este tipo de archivo.<br />
                    <span style={{ fontSize: 12, opacity: .7 }}>{attPreview.mime}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Configuración ─────────────────────────────────────────────────── */}
        {module === 'configuracion' && (
          <>
            {/* Settings sidebar */}
            <aside style={s.sidebar}>
              <div style={s.sidebarHead}>
                <span style={{ ...s.sidebarModIcon, background: '#64748B' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width={13} height={13}><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
                </span>
                <span style={s.sidebarHeadText}>Configuración</span>
              </div>
              <nav style={s.sidebarNav}>
                <p style={s.sidebarSection}>Cuenta</p>
                {([
                  { id: 'general',      label: 'General' },
                  { id: 'ministerios',  label: 'Ministerios' },
                  { id: 'roles',        label: 'Roles' },
                ] as { id: SettingsTab; label: string }[]).map(item => (
                  <button key={item.id}
                    style={{ ...s.sidebarItem, ...(settingsTab === item.id ? s.sidebarItemActive : {}) }}
                    onClick={() => { setSettingsTab(item.id); setSNewItem('') }}
                    onMouseEnter={e => { if (settingsTab !== item.id) e.currentTarget.style.background = C.soft }}
                    onMouseLeave={e => { if (settingsTab !== item.id) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  </button>
                ))}
                <p style={{ ...s.sidebarSection, marginTop: 20 }}>Acceso</p>
                {([{ id: 'admins', label: 'Administradores' }] as { id: SettingsTab; label: string }[]).map(item => (
                  <button key={item.id}
                    style={{ ...s.sidebarItem, ...(settingsTab === item.id ? s.sidebarItemActive : {}) }}
                    onClick={() => { setSettingsTab(item.id); setSNewItem('') }}
                    onMouseEnter={e => { if (settingsTab !== item.id) e.currentTarget.style.background = C.soft }}
                    onMouseLeave={e => { if (settingsTab !== item.id) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  </button>
                ))}
                <p style={{ ...s.sidebarSection, marginTop: 20 }}>Plataforma</p>
                {([
                  { id: 'integraciones', label: 'Integraciones' },
                  { id: 'facturacion',   label: 'Facturación' },
                ] as { id: SettingsTab; label: string }[]).map(item => (
                  <button key={item.id}
                    style={{ ...s.sidebarItem, ...(settingsTab === item.id ? s.sidebarItemActive : {}) }}
                    onClick={() => { setSettingsTab(item.id); setSNewItem('') }}
                    onMouseEnter={e => { if (settingsTab !== item.id) e.currentTarget.style.background = C.soft }}
                    onMouseLeave={e => { if (settingsTab !== item.id) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* Settings main content */}
            <main style={{ ...s.main, gap: 20, maxWidth: 720 }}>

              {/* ── General ───────────────────────────────────────────────── */}
              {settingsTab === 'general' && (
                <>
                  <div>
                    <h1 style={s.mainTitle}>General</h1>
                    <p style={s.mainSub}>Identidad y datos de tu organización</p>
                  </div>

                  {/* Icon */}
                  <div style={s.settingsCard}>
                    <div style={s.settingsCardTitle}>Icono de la organización</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 18, background: sIcon ? 'transparent' : C.primary, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${C.border}` }}>
                        {sIcon
                          ? <img src={sIcon} alt="icono" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ color: '#fff', fontSize: 26, fontWeight: 700 }}>{org?.name?.[0]?.toUpperCase()}</span>
                        }
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input ref={iconInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconUpload} />
                        <button style={s.btnGhost} onClick={() => iconInputRef.current?.click()}>Cambiar icono</button>
                        {sIcon && <button style={{ ...s.btnGhost, color: C.danger, borderColor: 'rgba(239,68,68,.3)' }} onClick={() => setSIcon(null)}>Eliminar</button>}
                      </div>
                    </div>
                    <div style={{ padding: '0 20px 16px', fontSize: 12, color: C.light }}>PNG, JPG o GIF · máx. 300 KB</div>
                  </div>

                  {/* Name + alias */}
                  <div style={s.settingsCard}>
                    <div style={s.settingsCardTitle}>Datos de la organización</div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={s.formLabel}>Nombre de la organización</label>
                        <input style={s.formInput} value={sName} onChange={e => setSName(e.target.value)} placeholder="Mi Iglesia" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={s.formLabel}>Alias / URL</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: C.surface }}>
                          <span style={{ padding: '8px 10px', fontSize: 13, color: C.light, background: C.soft, flexShrink: 0, borderRight: `1px solid ${C.border}` }}>worsyn.app/</span>
                          <input style={{ ...s.formInput, border: 'none', borderRadius: 0, flex: 1 }} value={sAlias} onChange={e => setSAlias(e.target.value)} placeholder="mi-iglesia" />
                        </div>
                        <span style={{ fontSize: 11, color: C.light }}>Solo letras minúsculas, números y guiones</span>
                      </div>
                    </div>
                  </div>

                  {sErr && <div style={s.formErr}>{sErr}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {canEdit && (
                      <button style={{ ...s.btnPrimary, ...(sSaving ? { opacity: 0.65, cursor: 'not-allowed' } : {}) }}
                        disabled={sSaving}
                        onClick={() => saveSettings({ name: sName.trim(), alias: sAlias.trim() || null, icon: sIcon })}>
                        {sSaving ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    )}
                    {sSaved && <span style={{ fontSize: 13, color: C.success, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Guardado
                    </span>}
                  </div>
                </>
              )}

              {/* ── Ministerios ───────────────────────────────────────────── */}
              {settingsTab === 'ministerios' && (
                <>
                  <div>
                    <h1 style={s.mainTitle}>Ministerios</h1>
                    <p style={s.mainSub}>Personaliza los ministerios disponibles en tu organización</p>
                  </div>
                  <div style={s.settingsCard}>
                    <div style={s.settingsCardTitle}>Ministerios activos · {sMins.length}</div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {sMins.map(m => (
                        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '5px 10px 5px 12px', fontSize: 13, color: C.primary, fontWeight: 500 }}>
                          {m}
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818CF8', lineHeight: 1, padding: '0 2px', borderRadius: 4 }}
                            onClick={() => setSMins(prev => prev.filter(x => x !== m))}
                            title="Eliminar">
                            <svg viewBox="0 0 20 20" fill="currentColor" width={12} height={12}><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
                      <input style={{ ...s.formInput, flex: 1 }} value={sNewItem} onChange={e => setSNewItem(e.target.value)}
                        placeholder="Nuevo ministerio…"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && sNewItem.trim() && !sMins.includes(sNewItem.trim())) {
                            setSMins(prev => [...prev, sNewItem.trim()]); setSNewItem('')
                          }
                        }} />
                      <button style={s.btnPrimary} onClick={() => {
                        const v = sNewItem.trim()
                        if (v && !sMins.includes(v)) { setSMins(prev => [...prev, v]); setSNewItem('') }
                      }}>Agregar</button>
                    </div>
                  </div>
                  {sErr && <div style={s.formErr}>{sErr}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {canEdit && (
                      <button style={{ ...s.btnPrimary, ...(sSaving ? { opacity: 0.65, cursor: 'not-allowed' } : {}) }}
                        disabled={sSaving}
                        onClick={() => saveSettings({ ministries: sMins })}>
                        {sSaving ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    )}
                    {sSaved && <span style={{ fontSize: 13, color: C.success, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Guardado
                    </span>}
                  </div>
                </>
              )}

              {/* ── Roles ─────────────────────────────────────────────────── */}
              {settingsTab === 'roles' && (
                <>
                  <div>
                    <h1 style={s.mainTitle}>Roles</h1>
                    <p style={s.mainSub}>Roles que pueden desempeñar los miembros (músico, técnico, etc.)</p>
                  </div>
                  <div style={s.settingsCard}>
                    <div style={s.settingsCardTitle}>Roles activos · {sRoles.length}</div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {sRoles.map(r => (
                        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.soft, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px 5px 12px', fontSize: 13, color: C.muted, fontWeight: 500 }}>
                          {r}
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.light, lineHeight: 1, padding: '0 2px', borderRadius: 4 }}
                            onClick={() => setSRoles(prev => prev.filter(x => x !== r))}
                            title="Eliminar">
                            <svg viewBox="0 0 20 20" fill="currentColor" width={12} height={12}><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
                      <input style={{ ...s.formInput, flex: 1 }} value={sNewItem} onChange={e => setSNewItem(e.target.value)}
                        placeholder="Nuevo rol…"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && sNewItem.trim() && !sRoles.includes(sNewItem.trim())) {
                            setSRoles(prev => [...prev, sNewItem.trim()]); setSNewItem('')
                          }
                        }} />
                      <button style={s.btnPrimary} onClick={() => {
                        const v = sNewItem.trim()
                        if (v && !sRoles.includes(v)) { setSRoles(prev => [...prev, v]); setSNewItem('') }
                      }}>Agregar</button>
                    </div>
                  </div>
                  {sErr && <div style={s.formErr}>{sErr}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {canEdit && (
                      <button style={{ ...s.btnPrimary, ...(sSaving ? { opacity: 0.65, cursor: 'not-allowed' } : {}) }}
                        disabled={sSaving}
                        onClick={() => saveSettings({ member_roles: sRoles })}>
                        {sSaving ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    )}
                    {sSaved && <span style={{ fontSize: 13, color: C.success, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Guardado
                    </span>}
                  </div>
                </>
              )}

              {/* ── Administradores ───────────────────────────────────────── */}
              {settingsTab === 'admins' && (
                <>
                  <div>
                    <h1 style={s.mainTitle}>Administradores</h1>
                    <p style={s.mainSub}>Gestiona el acceso de administradores y la seguridad</p>
                  </div>

                  {/* 2FA toggle */}
                  <div style={s.settingsCard}>
                    <div style={s.settingsCardTitle}>Autenticación de dos factores</div>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Requerir 2FA para administradores</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Los admins deberán activar 2FA para acceder al portal</div>
                      </div>
                      <button
                        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: canEdit ? 'pointer' : 'default', background: sRequire2FA ? C.primary : C.border, position: 'relative', transition: 'background 200ms', flexShrink: 0 }}
                        onClick={() => canEdit && setSRequire2FA(v => !v)}>
                        <span style={{ position: 'absolute', top: 3, left: sRequire2FA ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                      </button>
                    </div>
                    {sErr && <div style={{ ...s.formErr, margin: '0 20px 16px' }}>{sErr}</div>}
                    {canEdit && (
                      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button style={{ ...s.btnPrimary, ...(sSaving ? { opacity: 0.65 } : {}) }} disabled={sSaving}
                          onClick={() => saveSettings({ require_2fa_admins: sRequire2FA })}>
                          {sSaving ? 'Guardando…' : 'Guardar'}
                        </button>
                        {sSaved && <span style={{ fontSize: 13, color: C.success }}>✓ Guardado</span>}
                      </div>
                    )}
                  </div>

                  {/* Admin list */}
                  <div style={s.settingsCard}>
                    <div style={s.settingsCardTitle}>Administradores y líderes · {members.filter(m => m.orgRole !== 'member').length}</div>
                    {members.filter(m => m.orgRole !== 'member').length === 0 ? (
                      <div style={{ padding: '24px 20px', fontSize: 13, color: C.light, textAlign: 'center' }}>No hay administradores ni líderes</div>
                    ) : (
                      members.filter(m => m.orgRole !== 'member').map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: `1px solid ${C.soft}` }}>
                          <div style={{ ...s.avatar, background: m.color }}>{m.initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: C.light }}>{m.email}</div>
                          </div>
                          <span style={{ ...s.orgRoleTag, ...(m.orgRole === 'admin' ? s.orgRoleAdmin : s.orgRoleLeader) }}>
                            {m.orgRole === 'admin' ? 'Admin org' : 'Líder'}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: '#F1F5F9', color: '#94A3B8', borderRadius: 999, padding: '2px 9px' }}>2FA: No activado</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ── Integraciones ─────────────────────────────────────────── */}
              {settingsTab === 'integraciones' && (
                <>
                  <div>
                    <h1 style={s.mainTitle}>Integraciones</h1>
                    <p style={s.mainSub}>Conecta tu organización con otras plataformas</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                    {[
                      { name: 'Planning Center', desc: 'Sincroniza personas, servicios y grupos', icon: '📋', color: '#3B82F6' },
                      { name: 'WhatsApp Business', desc: 'Envía notificaciones y recordatorios', icon: '💬', color: '#25D366' },
                      { name: 'Google Calendar', desc: 'Sincroniza eventos y ensayos', icon: '📅', color: '#EA4335' },
                      { name: 'Slack', desc: 'Notificaciones en tiempo real al equipo', icon: '⚡', color: '#4A154B' },
                      { name: 'Stripe', desc: 'Gestión de pagos y donaciones', icon: '💳', color: '#635BFF' },
                      { name: 'Mailchimp', desc: 'Email marketing para comunicaciones', icon: '✉', color: '#FFE01B' },
                    ].map(int => (
                      <div key={int.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: int.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{int.icon}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{int.name}</div>
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{int.desc}</div>
                        <span style={s.comingBadge}>Próximamente</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Facturación ───────────────────────────────────────────── */}
              {settingsTab === 'facturacion' && (
                <>
                  <div>
                    <h1 style={s.mainTitle}>Facturación</h1>
                    <p style={s.mainSub}>Plan, suscripción y métodos de pago</p>
                  </div>
                  {/* Current plan */}
                  <div style={s.settingsCard}>
                    <div style={s.settingsCardTitle}>Plan actual</div>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{org?.plan ?? 'Free'}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                          {org?.plan === 'free' ? 'Hasta 50 miembros · funciones básicas' :
                           org?.plan === 'pro'  ? 'Miembros ilimitados · todas las funciones' :
                           'Múltiples organizaciones · soporte prioritario'}
                        </div>
                      </div>
                      <button style={{ ...s.btnGhost, pointerEvents: 'none', opacity: 0.6 }}>Cambiar plan</button>
                    </div>
                  </div>
                  {/* Payment methods */}
                  <div style={s.settingsCard}>
                    <div style={s.settingsCardTitle}>Métodos de pago</div>
                    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: C.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={C.light} strokeWidth={1.5} width={24} height={24}>
                          <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                        </svg>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Sin métodos de pago</div>
                      <div style={{ fontSize: 13, color: C.muted }}>Agrega una tarjeta o cuenta bancaria para gestionar tu suscripción</div>
                      <button style={{ ...s.btnPrimary, opacity: 0.6, pointerEvents: 'none', marginTop: 4 }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                        Agregar método de pago
                      </button>
                      <span style={s.comingBadge}>Próximamente</span>
                    </div>
                  </div>
                </>
              )}

            </main>
          </>
        )}
      </div>

      {/* ── Add member modal ─────────────────────────────────────────────────── */}
      {addOpen && (
        <MemberModal
          title="Agregar miembro"
          form={form}
          setForm={setForm}
          err={formErr}
          onSubmit={handleAddMember}
          onCancel={() => { setAddOpen(false); setForm(EMPTY_FORM); setFormErr(null); setAddPendingFiles([]) }}
          submitLabel="Guardar miembro"
          onToggleRole={role => toggleRole(role, form, setForm)}
          ministries={effectiveMinistries}
          predefinedRoles={effectiveRoles}
          pendingFiles={addPendingFiles}
          setPendingFiles={setAddPendingFiles}
        />
      )}

      {/* ── Edit member modal ────────────────────────────────────────────────── */}
      {editTarget && !isEditingMember && (
        <MemberModal
          title="Editar miembro"
          form={editForm}
          setForm={setEditForm}
          err={editErr}
          onSubmit={handleEditMember}
          onCancel={() => { setEditTarget(null); setEditErr(null) }}
          submitLabel="Guardar cambios"
          onToggleRole={role => toggleRole(role, editForm, setEditForm)}
          ministries={effectiveMinistries}
          predefinedRoles={effectiveRoles}
        />
      )}

      {/* ── Switch account loading overlay ──────────────────────────────────── */}
      {switchLoading && (
        <div style={{ ...s.overlay, zIndex: 600, flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,.15)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 500, textAlign: 'center' }}>
            Cambiando a <strong>{switchLoading}</strong>…
          </div>
        </div>
      )}

      {/* ── Switch account org picker ────────────────────────────────────────── */}
      {switchOpen && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setSwitchOpen(false) }}>
          <div style={{ ...s.modal, maxWidth: 380 }}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Cambiar de cuenta</span>
              <button style={s.modalClose} onClick={() => setSwitchOpen(false)}>
                <svg viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: C.muted }}>Elige la organización a la que quieres cambiar.</p>
              {switchOrgs.map(o => {
                const color = AVATAR_COLORS[o.name.charCodeAt(0) % AVATAR_COLORS.length]
                return (
                  <button key={o.slug}
                    onClick={() => handleSwitchOrg(o.slug, o.name)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', background: C.surface, width: '100%', transition: 'border-color 120ms, background 120ms', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.soft; e.currentTarget.style.borderColor = C.primary }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border }}>
                    {o.icon
                      ? <img src={o.icon} alt={o.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 40, borderRadius: 10, background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                          {o.name.slice(0, 2).toUpperCase()}
                        </div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{o.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{o.slug}</div>
                    </div>
                    <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14} style={{ color: C.light, flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div style={{ ...s.modal, maxWidth: 420 }}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Eliminar miembro</span>
              <button style={s.modalClose} onClick={() => setDeleteTarget(null)}>
                <svg viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: '24px 22px' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 20 20" fill={C.danger} width={20} height={20}>
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>
                    ¿Eliminar a {deleteTarget.name}?
                  </p>
                  <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                    Esta acción no se puede deshacer. El miembro y todos sus datos serán eliminados permanentemente.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button style={s.btnGhost} onClick={() => setDeleteTarget(null)}>Cancelar</button>
                <button style={{ ...s.btnPrimary, background: C.danger }} onClick={handleDeleteMember}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Drawer row ────────────────────────────────────────────────────────────────

function DrawerRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0' }}>
      <span style={{ fontSize: 13, flexShrink: 0, width: 20, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#0F172A', marginTop: 1, wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  )
}

// ── Phone input with country selector ─────────────────────────────────────────

function PhoneInput({ value, onChange, inputStyle, labelStyle }: {
  value: string
  onChange: (full: string) => void
  inputStyle?: React.CSSProperties
  labelStyle?: React.CSSProperties
}) {
  const initCountry = phoneParseCountry(value)
  const [country, setCountry] = useState<Country>(initCountry)
  const [local, setLocal] = useState(phoneParseLocal(value, initCountry))
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const c = phoneParseCountry(value)
    setCountry(c)
    setLocal(phoneParseLocal(value, c))
  }, [value])

  React.useEffect(() => {
    if (!open) return
    function onClickOut(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [open])

  function selectCountry(c: Country) {
    setCountry(c)
    setSearch('')
    setOpen(false)
    onChange(local.trim() ? `${c.dial} ${local.trim()}` : '')
  }

  function handleLocalChange(v: string) {
    setLocal(v)
    onChange(v.trim() ? `${country.dial} ${v.trim()}` : '')
  }

  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.iso.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES

  const baseInput: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #E2E8F0',
    fontSize: 13, outline: 'none', background: '#F8FAFC', color: '#0F172A', boxSizing: 'border-box',
    ...inputStyle,
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
      {/* Country selector */}
      <div style={{ position: 'relative', flexShrink: 0 }} ref={dropRef}>
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setSearch('') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '7px 8px',
            border: '1px solid #E2E8F0', borderRadius: 6, background: '#F8FAFC',
            cursor: 'pointer', fontSize: 13, color: '#0F172A', whiteSpace: 'nowrap',
            height: 34,
          }}
        >
          <span style={{ fontSize: 16 }}>{country.flag}</span>
          <span style={{ color: '#64748B', fontSize: 12 }}>{country.dial}</span>
          <svg viewBox="0 0 20 20" fill="currentColor" width={10} height={10} style={{ color: '#94A3B8' }}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 9999, marginTop: 2,
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 240, overflow: 'hidden',
          }}>
            <div style={{ padding: '6px 8px', borderBottom: '1px solid #F1F5F9' }}>
              <input
                autoFocus
                type="text"
                placeholder="Buscar país o código…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...baseInput, padding: '5px 8px', fontSize: 12 }}
              />
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {filtered.length === 0
                ? <div style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8' }}>Sin resultados</div>
                : filtered.map(c => (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => selectCountry(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '7px 12px', border: 'none', background: c.iso === country.iso ? '#EEF2FF' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', fontSize: 13,
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{c.flag}</span>
                    <span style={{ flex: 1, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <span style={{ color: '#94A3B8', fontSize: 11, flexShrink: 0 }}>{c.dial}</span>
                  </button>
                ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Local number */}
      <div style={{ flex: 1 }}>
        <input
          type="tel"
          value={local}
          onChange={e => handleLocalChange(e.target.value)}
          placeholder="600 000 000"
          style={baseInput}
        />
      </div>
    </div>
  )
}

// ── Member modal (shared add/edit) ────────────────────────────────────────────

// ── Attachment row with inline rename ────────────────────────────────────────

function AttachmentRow({ att, canEdit, slug, memberId, authHeaders, onPreview, onDelete, onRenamed, fetchApi }: {
  att: { id: string; label: string; original_name: string; mime_type: string; size_bytes: number; uploaded_at: string }
  canEdit: boolean
  slug: string
  memberId: string
  authHeaders: () => Record<string, string>
  onPreview: () => void
  onDelete: () => void
  onRenamed: (id: string, label: string) => void
  fetchApi: (url: string, init?: RequestInit) => Promise<Response>
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft]     = React.useState(att.label)
  const [saving, setSaving]   = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function startEdit() { setDraft(att.label); setEditing(true); setTimeout(() => inputRef.current?.select(), 30) }

  async function saveLabel() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === att.label) { setEditing(false); return }
    setSaving(true)
    const res = await fetchApi(`/api/v1/tenant/${slug}/members/${memberId}/attachments/${att.id}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: trimmed }),
    })
    if (res.ok) onRenamed(att.id, trimmed)
    setSaving(false); setEditing(false)
  }

  const tdBase: React.CSSProperties = { padding: '10px 16px', borderBottom: `1px solid ${C.soft}` }
  return (
    <tr>
      <td style={{ ...tdBase, minWidth: 160 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setEditing(false) }}
              style={{ border: `1.5px solid ${C.primary}`, borderRadius: 6, padding: '3px 7px', fontSize: 13, outline: 'none', flex: 1, minWidth: 0 }}
              disabled={saving}
            />
            <button onClick={saveLabel} disabled={saving}
              style={{ background: C.primary, border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
              {saving ? '…' : '✓'}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', padding: '3px 7px', fontSize: 12, color: C.muted }}>
              ✕
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{att.label}</span>
        )}
      </td>
      <td style={{ ...tdBase, fontSize: 12, color: C.muted, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.original_name}</td>
      <td style={{ ...tdBase, fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>{(att.size_bytes / 1024).toFixed(0)} KB</td>
      <td style={{ ...tdBase, fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>{new Date(att.uploaded_at).toLocaleDateString('es-ES')}</td>
      <td style={tdBase}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button style={{ fontSize: 12, padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', cursor: 'pointer', color: C.primary, fontWeight: 600 }}
            onClick={onPreview}>Vista previa</button>
          {canEdit && (<>
            <button style={{ fontSize: 12, padding: '5px 12px', border: `1.5px solid ${C.primary}`, borderRadius: 6, background: C.primary, cursor: 'pointer', color: '#fff', fontWeight: 600 }}
              onClick={startEdit}>Renombrar</button>
            <button style={{ fontSize: 12, padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', cursor: 'pointer', color: C.muted }}
              onClick={async () => {
                const res = await fetchApi(`/api/v1/tenant/${slug}/members/${memberId}/attachments/${att.id}/data`, { headers: authHeaders() })
                if (!res.ok) return
                const j = await res.json()
                const a = document.createElement('a')
                a.href = `data:${j.mime_type};base64,${j.file_data}`
                a.download = j.original_name
                a.click()
              }}>Descargar</button>
            <button style={{ fontSize: 12, padding: '5px 12px', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, background: 'none', cursor: 'pointer', color: C.danger }}
              onClick={onDelete}>Eliminar</button>
          </>)}
        </div>
      </td>
    </tr>
  )
}

function MemberModal({ title, form, setForm, err, onSubmit, onCancel, submitLabel, onToggleRole, ministries, predefinedRoles, pendingFiles, setPendingFiles }: {
  title: string
  form: MemberForm
  setForm: React.Dispatch<React.SetStateAction<MemberForm>>
  err: string | null
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitLabel: string
  onToggleRole: (role: string) => void
  ministries: string[]
  predefinedRoles: string[]
  pendingFiles?: { file: File; label: string }[]
  setPendingFiles?: React.Dispatch<React.SetStateAction<{ file: File; label: string }[]>>
}) {
  const [pendingLabel, setPendingLabel] = React.useState('')
  const [pendingErr, setPendingErr]     = React.useState<string | null>(null)
  const pendingFileRef = React.useRef<HTMLInputElement>(null)

  function handleFilePick(file: File | null) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setPendingErr('Máximo 10 MB'); return }
    const label = pendingLabel.trim() || file.name.replace(/\.[^.]+$/, '')
    setPendingFiles?.(prev => [...prev, { file, label }])
    setPendingLabel(''); setPendingErr(null)
    if (pendingFileRef.current) pendingFileRef.current.value = ''
  }

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={s.modal}>
        <div style={s.modalHead}>
          <span style={s.modalTitle}>{title}</span>
          <button style={s.modalClose} onClick={onCancel}>
            <svg viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} style={s.modalBody}>
          {err && <div style={s.formErr}>{err}</div>}

          {/* Personal info */}
          <div style={s.formSection}>
            <div style={s.formSectionTitle}>Información personal</div>
            <div style={s.formRow}>
              <div style={{ ...s.formField, flex: '0 0 110px' }}>
                <label style={s.formLabel}>Prefijo</label>
                <SelectField value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))}>
                  <option value="">—</option>
                  {['Sr.', 'Sra.', 'Rvdo.', 'Rvda.', 'Dr.', 'Dra.'].map(p => <option key={p} value={p}>{p}</option>)}
                </SelectField>
              </div>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Nombre *</label>
                <input style={s.formInput} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Nombre" />
              </div>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Apellido *</label>
                <input style={s.formInput} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Apellido" />
              </div>
            </div>
            <div style={s.formRow}>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Género</label>
                <SelectField value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">—</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </SelectField>
              </div>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Fecha de nacimiento</label>
                <input style={s.formInput} type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} />
              </div>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Aniversario</label>
                <input style={s.formInput} type="date" value={form.anniversary} onChange={e => setForm(f => ({ ...f, anniversary: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={s.formSection}>
            <div style={s.formSectionTitle}>Contacto</div>
            <div style={s.formRow}>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Correo electrónico *</label>
                <input style={s.formInput} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
              </div>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Teléfono</label>
                <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} inputStyle={s.formInput} />
              </div>
            </div>
          </div>

          {/* Church info */}
          <div style={s.formSection}>
            <div style={s.formSectionTitle}>Información en la iglesia</div>
            <div style={s.formRow}>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Ministerio</label>
                <SelectField value={form.ministry} onChange={e => setForm(f => ({ ...f, ministry: e.target.value }))}>
                  <option value="">Seleccionar…</option>
                  {ministries.map(m => <option key={m} value={m}>{m}</option>)}
                </SelectField>
              </div>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Rol en la organización</label>
                <SelectField value={form.orgRole} onChange={e => setForm(f => ({ ...f, orgRole: e.target.value as 'admin' | 'leader' | 'member' }))}>
                  <option value="member">Miembro</option>
                  <option value="leader">Líder</option>
                  <option value="admin">Admin</option>
                </SelectField>
              </div>
              <div style={{ ...s.formField, flex: 1 }}>
                <label style={s.formLabel}>Estado</label>
                <SelectField value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </SelectField>
              </div>
            </div>
          </div>

          {/* Roles */}
          <div style={s.formSection}>
            <div style={s.formSectionTitle}>Roles</div>
            <div style={s.rolesGrid}>
              {predefinedRoles.map(role => (
                <button key={role} type="button"
                  style={{ ...s.roleChip, ...(form.roles.includes(role) ? s.roleChipActive : {}) }}
                  onClick={() => onToggleRole(role)}>
                  {form.roles.includes(role) && (
                    <svg viewBox="0 0 20 20" fill="currentColor" width={11} height={11} style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Documentos adjuntos (solo al crear) */}
          {setPendingFiles && (
            <div style={s.formSection}>
              <div style={s.formSectionTitle}>Documentos adjuntos</div>

              {/* Queue list */}
              {(pendingFiles ?? []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {(pendingFiles ?? []).map((pf, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '6px 10px' }}>
                      <svg viewBox="0 0 16 16" fill="#4F46E5" width={13} height={13}><path fillRule="evenodd" d="M4 1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6.414A1 1 0 0012.707 6L9 2.293A1 1 0 008.586 2H4zm4 1.414L11.586 6H8V2.414zM5 9a1 1 0 000 2h6a1 1 0 100-2H5z" clipRule="evenodd"/></svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#3730A3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pf.label}</span>
                      <span style={{ fontSize: 11, color: '#6366F1' }}>{(pf.file.size / 1024).toFixed(0)} KB</span>
                      <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818CF8', fontSize: 14, lineHeight: 1, padding: 2 }}
                        onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add file row — auto-queues on file pick */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  style={{ ...s.formInput, fontSize: 13 }}
                  placeholder="Nombre del documento (opcional — si lo dejas vacío se usa el nombre del archivo)"
                  value={pendingLabel}
                  onChange={e => setPendingLabel(e.target.value)}
                />
                <div
                  style={{ border: `2px dashed ${C.border}`, borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: C.bg }}
                  onClick={() => pendingFileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFilePick(e.dataTransfer.files[0] ?? null) }}>
                  <input ref={pendingFileRef} type="file" style={{ display: 'none' }} onChange={e => handleFilePick(e.target.files?.[0] ?? null)} />
                  <svg viewBox="0 0 16 16" fill={C.light} width={14} height={14}><path fillRule="evenodd" d="M4 1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6.414A1 1 0 0012.707 6L9 2.293A1 1 0 008.586 2H4zm4 1.414L11.586 6H8V2.414z" clipRule="evenodd"/></svg>
                  <span style={{ fontSize: 13, color: C.muted }}>
                    Arrastra o haz clic para añadir un documento — PDF, imágenes, docs (máx. 10 MB)
                  </span>
                </div>
              </div>
              {pendingErr && <p style={{ fontSize: 12, color: C.danger, margin: 0 }}>{pendingErr}</p>}
              <p style={{ fontSize: 11, color: C.light, margin: 0 }}>Los documentos se subirán al guardar el miembro.</p>
            </div>
          )}

          <div style={s.modalFoot}>
            <button type="button" style={s.btnGhost} onClick={onCancel}>Cancelar</button>
            <button type="submit" style={s.btnPrimary}>{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  // Full-page
  fullPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', fontFamily: "'Inter', system-ui, sans-serif" },
  spinner:  { width: 32, height: 32, border: '3px solid rgba(255,255,255,.1)', borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  // Login
  loginCard:  { background: '#1e293b', borderRadius: 18, padding: '44px 40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontFamily: "'Inter', system-ui, sans-serif" },
  wLogo:      { width: 54, height: 54, borderRadius: 15, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, flexShrink: 0 },
  eyebrow:    { fontSize: 10, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0, fontWeight: 700 },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: '6px 0 2px', textAlign: 'center' },
  loginSub:   { fontSize: 13, color: '#64748b', margin: '0 0 8px', textAlign: 'center' },
  code:       { background: '#0f172a', padding: '1px 6px', borderRadius: 4, fontSize: 12, color: '#94a3b8' },
  loginError: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.28)', borderRadius: 8, color: '#fca5a5', fontSize: 13, padding: '8px 14px', width: '100%', boxSizing: 'border-box', textAlign: 'center', marginTop: 4 },
  field:      { display: 'flex', flexDirection: 'column', gap: 5, width: '100%' },
  label:      { fontSize: 12, color: '#94a3b8', fontWeight: 500 },
  input:      { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  loginBtn:   { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4 },
  powered:    { fontSize: 11, color: '#334155', marginTop: 22 },

  // App shell
  appWrap: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" },

  // Top bar
  topBar:   { height: 52, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 0', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 },
  modBtn:   { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'background 140ms' },
  modIcon:  { width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
  modLabel: { fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' },
  orgName:  { fontSize: 13, fontWeight: 500, color: C.muted, whiteSpace: 'nowrap' },

  // Sub-nav tabs
  tabNav:       { display: 'flex', alignItems: 'center', gap: 2 },
  tabBtn:       { padding: '6px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.muted, borderRadius: 7, transition: 'all 120ms' },
  tabBtnActive: { background: '#EEF2FF', color: C.primary, fontWeight: 600 },

  // Dropdown
  dropdown:       { position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 240, zIndex: 200, overflow: 'hidden' },
  dropSection:    { padding: '6px 6px' },
  dropDivider:    { height: 1, background: C.border, margin: '0 6px' },
  dropItem:       { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, transition: 'background 120ms', fontSize: 13, color: C.text },
  dropItemActive: { background: '#EEF2FF' },
  dropIcon:       { width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
  dropLabel:      { flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500 },

  // User / logout
  topUser:    { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 6px', borderRadius: 8 },
  logoutDrop: { position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.10)', minWidth: 200, zIndex: 300, overflow: 'hidden' },
  logoutInfo: { padding: '12px 14px 10px' },
  logoutBtn:  { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.danger, transition: 'background 120ms' },
  userAvatar: { width: 30, height: 30, borderRadius: 8, background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 },
  userName:   { fontSize: 13, fontWeight: 500, color: C.text },

  // Content
  contentWrap: { flex: 1, display: 'flex', overflow: 'hidden' },

  // Sidebar
  sidebar:          { width: 210, background: C.surface, borderRight: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  sidebarHead:      { display: 'flex', alignItems: 'center', gap: 9, padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` },
  sidebarModIcon:   { width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
  sidebarHeadText:  { fontSize: 14, fontWeight: 700, color: C.text },
  sidebarNav:       { padding: '10px 8px', flex: 1 },
  sidebarSection:   { fontSize: 10, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: '8px 0 4px' },
  sidebarItem:      { display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 7, fontSize: 13, color: C.muted, transition: 'background 120ms' },
  sidebarItemActive: { background: '#EEF2FF', color: C.primary, fontWeight: 600 },
  sidebarBadge:     { fontSize: 11, fontWeight: 600, color: C.light, background: C.soft, borderRadius: 999, padding: '1px 7px' },

  // Main content
  main:      { flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 },
  mainHead:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  mainTitle: { fontSize: 20, fontWeight: 700, color: C.text, margin: 0 },
  mainSub:   { fontSize: 13, color: C.light, margin: '3px 0 0' },

  backBtn:    { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', padding: '0 0 2px', textTransform: 'uppercase' } as React.CSSProperties,
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGhost:   { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },

  // Icon action buttons in table
  iconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 7, color: C.muted, transition: 'background 120ms', flexShrink: 0 },

  // Search
  searchWrap:  { display: 'flex', alignItems: 'center', gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '0 12px', height: 38 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: 13, color: C.text, background: 'transparent' },

  // Table
  tableWrap:       { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' },
  table:           { width: '100%', borderCollapse: 'collapse' },
  th:              { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`, background: C.soft, whiteSpace: 'nowrap' },
  tr:              { transition: 'background 100ms', cursor: 'pointer' },
  td:              { padding: '11px 14px', borderBottom: `1px solid #F1F5F9`, verticalAlign: 'middle' },
  avatar:          { width: 34, height: 34, borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ministryTag:     { display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#EEF2FF', color: '#4F46E5' },
  orgRoleTag:      { display: 'inline-block', padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' },
  orgRoleAdmin:    { background: '#FEF3C7', color: '#92400E' },
  orgRoleLeader:   { background: '#E0E7FF', color: '#3730A3' },
  roleTag:         { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: C.soft, color: C.muted, whiteSpace: 'nowrap' },
  statusTag:       { display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600 },
  statusActive:    { background: '#ECFDF5', color: '#059669' },
  statusInactive:  { background: '#F1F5F9', color: '#94A3B8' },
  empty:           { padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' },

  // Placeholder
  placeholder:      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 40, textAlign: 'center', maxWidth: 360 },
  placeholderIcon:  { width: 64, height: 64, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' },
  placeholderTitle: { fontSize: 22, fontWeight: 700, color: C.text, margin: 0 },
  placeholderSub:   { fontSize: 14, color: C.muted, lineHeight: 1.6, margin: 0 },
  comingBadge:      { fontSize: 11, fontWeight: 700, background: '#EEF2FF', color: C.primary, borderRadius: 999, padding: '4px 14px', letterSpacing: '0.06em', textTransform: 'uppercase' },

  // Detail drawer
  drawer:           { width: 300, background: '#FFFFFF', borderLeft: `1px solid #E2E8F0`, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'hidden' },
  drawerHead:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid #E2E8F0`, flexShrink: 0 },
  drawerBody:       { flex: 1, overflowY: 'auto', padding: '0 16px' },
  drawerSection:    { padding: '14px 0', borderBottom: `1px solid #F1F5F9`, display: 'flex', flexDirection: 'column', gap: 8 },
  drawerSectionTitle: { fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' } as React.CSSProperties,
  drawerFoot:       { padding: '12px 16px', borderTop: `1px solid #E2E8F0`, display: 'flex', gap: 8, flexShrink: 0 },

  // Modal
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 24 },
  modal:      { background: C.surface, borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.25)' },
  modalHead:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: C.text },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: C.light, padding: 4, borderRadius: 6, display: 'flex' },
  modalBody:  { overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 },
  modalFoot:  { display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 },

  // Form
  formSection:      { display: 'flex', flexDirection: 'column', gap: 12 },
  formSectionTitle: { fontSize: 11, fontWeight: 700, color: C.light, textTransform: 'uppercase', letterSpacing: '0.08em' },
  formRow:   { display: 'flex', gap: 12 },
  formField: { display: 'flex', flexDirection: 'column', gap: 5 },
  formLabel: { fontSize: 12, fontWeight: 500, color: C.muted },
  formInput: { border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none', background: C.surface, width: '100%', boxSizing: 'border-box' },
  formSelect: { border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: C.text, outline: 'none', background: C.surface, width: '100%', boxSizing: 'border-box', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' } as React.CSSProperties,
  formErr:   { background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, color: C.danger, fontSize: 13, padding: '8px 14px' },

  // Settings cards
  settingsCard:      { background: '#FFFFFF', border: `1px solid #E2E8F0`, borderRadius: 14, overflow: 'hidden' },
  settingsCardTitle: { padding: '14px 20px', borderBottom: `1px solid #E2E8F0`, fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' } as React.CSSProperties,

  // Role chips
  rolesGrid:      { display: 'flex', flexWrap: 'wrap', gap: 8 },
  roleChip:       { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.soft, fontSize: 12, fontWeight: 500, color: C.muted, cursor: 'pointer', transition: 'all 120ms' },
  roleChipActive: { background: '#EEF2FF', border: `1px solid #C7D2FE`, color: C.primary, fontWeight: 600 },
}
