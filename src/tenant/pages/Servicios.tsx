// Worsyn V2 — 1:1 port of /mnt/Worsyn-handoff prototype.
// Renders: Sidebar + Topbar + 7 screens (MiPlanificacion, Servicios list, PlanDetail
// with 6 tabs, Canciones with arrangement drawer, CancionDetail with Letras/Presentación,
// Media, Personas with Miembros/Equipos tabs, PersonaDetail).
//
// Strict HARD-RULE compliance: match prototype exactly, no improvisation.
// Real `/api/v1/tenant/{slug}/...` endpoints wired where they exist; the prototype's
// mock data fills the rest until the matching backend lands.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import ServiciosLegacy, {
  BlockoutModal, TeamFormModal, TeamBulkEmailModal,
  AddPositionModal, AddLeaderModal, AddPersonsToPositionModal,
} from './ServiciosLegacy'
import type {
  ServicePerson, Team, EmailMessage, PersonTeam, Blockout, OrgMemberLite,
  ServiceType, TeamDetailPayload, TeamPositionInfo, TeamPerson, ServiceRole,
} from './ServiciosLegacy'
import { I } from '../components/IconsV2'
import '../styles/tenant.css'

type ServiciosTab = 'mi-planificacion' | 'servicios' | 'canciones' | 'media' | 'personas' | 'mensajes' | 'legacy'

function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, { credentials: 'include', ...init })
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED — port of /mnt/Worsyn-handoff/worsyn/project/src/data.jsx verbatim
// ─────────────────────────────────────────────────────────────────────────────
const D = {
  org: { name: 'Iglesia Central Madrid', slug: 'central-madrid', plan: 'Pro', members: 248 },
  user: { name: 'Lucía Hernández', role: 'Líder de Alabanza', initials: 'LH', email: 'lucia@central.es' },
  serviceTypes: [
    { id: 'st1', name: 'Servicio Dominical', tone: 'blue',   color: '#0A84FF', rec: 'Semanal · Domingos',     times: ['10:00 – 11:30', '12:30 – 14:00'], teams: 6, upcoming: 4, dot: 1,
      instances: [
        { id: 'sd1', date: '31 May', dow: 'Dom', time: '10:00', status: 'Publicado', teamConfirmed: 9, teamTotal: 13, leader: 'Lucía H.' },
        { id: 'sd2', date: '07 Jun', dow: 'Dom', time: '10:00', status: 'Borrador',  teamConfirmed: 4, teamTotal: 12, leader: 'Diego R.' },
        { id: 'sd3', date: '14 Jun', dow: 'Dom', time: '10:00', status: 'Sin equipo', teamConfirmed: 0, teamTotal: 0, leader: 'Por asignar' },
      ] },
    { id: 'st2', name: 'Culto de Oración',   tone: 'purple', color: '#AF52DE', rec: 'Semanal · Miércoles',   times: ['19:30 – 21:00'],                  teams: 2, upcoming: 4, dot: 3,
      instances: [
        { id: 'co1', date: '03 Jun', dow: 'Mié', time: '19:30', status: 'Publicado', teamConfirmed: 5, teamTotal: 6, leader: 'Marta S.' },
        { id: 'co2', date: '10 Jun', dow: 'Mié', time: '19:30', status: 'Publicado', teamConfirmed: 3, teamTotal: 6, leader: 'Marta S.' },
        { id: 'co3', date: '17 Jun', dow: 'Mié', time: '19:30', status: 'Borrador',  teamConfirmed: 2, teamTotal: 6, leader: 'Pendiente' },
      ] },
    { id: 'st3', name: 'Jóvenes',            tone: 'orange', color: '#FF9500', rec: 'Semanal · Viernes',     times: ['20:00 – 22:00'],                  teams: 3, upcoming: 4, dot: 5,
      instances: [
        { id: 'jv1', date: '05 Jun', dow: 'Vie', time: '20:00', status: 'Reclutando', teamConfirmed: 4, teamTotal: 9, leader: 'Diego R.' },
        { id: 'jv2', date: '12 Jun', dow: 'Vie', time: '20:00', status: 'Borrador',   teamConfirmed: 1, teamTotal: 9, leader: 'Diego R.' },
        { id: 'jv3', date: '19 Jun', dow: 'Vie', time: '20:00', status: 'Sin equipo', teamConfirmed: 0, teamTotal: 0, leader: 'Por asignar' },
      ] },
    { id: 'st4', name: 'Servicio Especial',  tone: 'pink',   color: '#FF2D55', rec: 'Sin repetición',         times: ['18:00 – 20:30'],                  teams: 4, upcoming: 1, dot: 0,
      instances: [
        { id: 'sp1', date: '21 Jun', dow: 'Sáb', time: '18:00', status: 'Reclutando', teamConfirmed: 7, teamTotal: 18, leader: 'Pastor Andrés', special: 'Noche de adoración' },
      ] },
  ],
  pendingRequests: [
    { id: 'req1', from: { name: 'Diego Ramírez', initials: 'DR', tone: 'orange', color: '#FF9500' },
      svc: 'Jóvenes', tone: 'orange', date: 'Vie 5 Jun · 20:00', role: 'Coros', team: 'Alabanza Joven',
      deadline: 'Confirma antes del miércoles 3',
      message: '¡Hola Lucía! ¿Estarás disponible para hacer coros el viernes? Estamos preparando un set energético — sería genial tenerte.',
      songs: ['Reckless Love (Esp)', 'Aleluya, gloria a Dios', 'Inunda este lugar', 'Yo te exalto'] },
    { id: 'req2', from: { name: 'Marta Soto', initials: 'MS', tone: 'purple', color: '#AF52DE' },
      svc: 'Culto de Oración', tone: 'purple', date: 'Mié 10 Jun · 19:30', role: 'Piano + voz', team: 'Música · Equipo B',
      deadline: 'Confirma antes del domingo 7',
      message: 'Necesitamos un piano que también pueda guiar coros suaves en el bloque de espontáneo. ¿Te animas?',
      songs: ['Inunda este lugar', 'Renuévame'] },
  ],
  upcoming: [
    { date: 'Domingo 31',  day: 'Mañana',     when: '10:00', svc: 'Servicio Dominical', role: 'Voz líder', team: 'Alabanza · Equipo A', status: 'Confirmado', color: '#0A84FF', tone: 'blue' },
    { date: 'Miércoles 3', day: 'En 4 días',  when: '19:30', svc: 'Culto de Oración',   role: 'Piano',     team: 'Música · Equipo B',   status: 'Pendiente',  color: '#AF52DE', tone: 'purple' },
    { date: 'Viernes 5',   day: 'En 6 días',  when: '20:00', svc: 'Jóvenes',            role: 'Coros',     team: 'Alabanza Joven',      status: 'Pendiente',  color: '#FF9500', tone: 'orange' },
    { date: 'Domingo 7',   day: 'En 1 semana',when: '10:00', svc: 'Servicio Dominical', role: 'Voz líder', team: 'Alabanza · Equipo A', status: 'Confirmado', color: '#0A84FF', tone: 'blue' },
  ],
  songs: [
    { id: 's1', title: 'Maravilloso es', author: 'Marcos Witt', key: 'D', bpm: 78,  tags: ['Adoración'],   ccli: '7102351', updated: 'hace 2 días', plays: 124,
      arrangements: [
        { id: 'a1-1', name: 'Original',           isOriginal: true,  by: 'Marcos Witt', key: 'D', bpm: 78, meter: '4/4', length: '4:38', sequence: 'I–V1–C–V2–C–P×2–C', files: ['Letra', 'Acordes', 'Multipista'], prt: { name: 'Maravilloso es — Original.prt', by: 'Marcos Witt', when: 'hace 1 mes', slides: 8 } },
        { id: 'a1-2', name: 'Versión dominical',  isOriginal: false, by: 'Lucía H.',    key: 'D', bpm: 74, meter: '4/4', length: '5:10', sequence: 'I–V1–C–V2–C–P', files: ['Letra', 'Acordes'], prt: { name: 'Maravilloso es — Dominical.prt', by: 'Lucía H.', when: 'hace 2 días', slides: 7 } },
        { id: 'a1-3', name: 'Acústico (Jóvenes)', isOriginal: false, by: 'Diego R.',    key: 'C', bpm: 72, meter: '4/4', length: '4:05', sequence: 'V1–C–P', files: ['Acordes'], prt: null },
      ],
      lyrics: [
        { section: 'Verso 1', lines: ['Maravilloso es tu nombre', 'Cantaremos por siempre', 'De tu gracia sin medida', 'Renacemos cada día'] },
        { section: 'Coro',    lines: ['Santo, santo, santo', 'Tú eres el cordero', 'Digno de toda gloria', 'Por la eternidad'] },
        { section: 'Verso 2', lines: ['Tu fidelidad no acaba', 'Cada mañana es nueva', 'En tus manos descansamos', 'Nuestra esperanza eres tú'] },
        { section: 'Puente',  lines: ['Inunda este lugar', 'Con tu presencia, Señor'] },
      ] },
    { id: 's2', title: 'Eres todopoderoso', author: 'Generación 12', key: 'G', bpm: 92, tags: ['Adoración'], ccli: '5483217', updated: 'hace 5 días', plays: 218,
      arrangements: [
        { id: 'a2-1', name: 'Original',                isOriginal: true,  by: 'Generación 12', key: 'G', bpm: 92, meter: '4/4', length: '6:12', sequence: 'I–V1–C–V2–C–P×2', files: ['Letra', 'Acordes', 'Multipista'] },
        { id: 'a2-2', name: 'Versión congregacional', isOriginal: false, by: 'Lucía H.',      key: 'A', bpm: 88, meter: '4/4', length: '5:30', sequence: 'V1–C–C–P', files: ['Letra', 'Acordes'] },
      ],
      lyrics: [{ section: 'Verso 1', lines: ['Hay momentos que las palabras', 'No alcanzan para expresar', 'Lo que has hecho en mi vida'] }, { section: 'Coro', lines: ['Eres todopoderoso', 'Grande y fuerte', 'Tú eres todopoderoso', 'Dios'] }] },
    { id: 's3', title: 'Reckless Love (Esp)', author: 'Bethel Music', key: 'C', bpm: 70, tags: ['Adoración'], ccli: '7089641', updated: 'hace 1 sem', plays: 91,
      arrangements: [{ id: 'a3-1', name: 'Original', isOriginal: true, by: 'Bethel Music', key: 'C', bpm: 70, meter: '4/4', length: '5:32', sequence: 'I–V1–C–V2–C–P', files: ['Letra', 'Acordes'] }],
      lyrics: [{ section: 'Verso 1', lines: ['Antes de decir una palabra', 'Antes de que yo existiera', 'Con cada aliento me cantas'] }, { section: 'Coro', lines: ['Oh, el abrumador, interminable', 'Incondicional amor de Dios'] }] },
    { id: 's4', title: 'Aleluya, gloria a Dios', author: 'Hillsong', key: 'A', bpm: 128, tags: ['Celebración'], ccli: '6019234', updated: 'hace 1 sem', plays: 164,
      arrangements: [
        { id: 'a4-1', name: 'Original',         isOriginal: true,  by: 'Hillsong', key: 'A', bpm: 128, meter: '4/4', length: '4:50', sequence: 'I–V1–C–V2–C–P–C', files: ['Letra', 'Acordes', 'Multipista'] },
        { id: 'a4-2', name: 'Tono jóvenes (B)', isOriginal: false, by: 'Diego R.', key: 'B', bpm: 132, meter: '4/4', length: '4:40', sequence: 'V1–C–P–C', files: ['Acordes'] },
      ],
      lyrics: [{ section: 'Coro', lines: ['Aleluya, gloria a Dios', 'Cristo vive, resucitó', 'Cantaré de tu amor'] }] },
    { id: 's5', title: 'Inunda este lugar', author: "Christine D'Clario", key: 'B', bpm: 64, tags: ['Espontáneo'], ccli: '7012458', updated: 'hace 2 sem', plays: 87,
      arrangements: [
        { id: 'a5-1', name: 'Original',        isOriginal: true,  by: "Christine D'Clario", key: 'B', bpm: 64, meter: '6/8', length: '7:20', sequence: 'I–C–P–libre', files: ['Letra', 'Acordes', 'Multipista'] },
        { id: 'a5-2', name: 'Espontáneo (C)',  isOriginal: false, by: 'Lucía H.',           key: 'C', bpm: 62, meter: '6/8', length: '8:00', sequence: 'C–libre', files: ['Acordes'] },
      ],
      lyrics: [{ section: 'Coro', lines: ['Inunda este lugar', 'Con tu presencia, Señor', 'Llénanos de tu poder'] }, { section: 'Puente', lines: ['No hay nadie como tú', 'No hay nadie como tú, Señor'] }] },
    { id: 's6', title: 'Renuévame', author: 'Marcos Witt', key: 'E', bpm: 76, tags: ['Adoración'], ccli: '4129877', updated: 'hace 3 sem', plays: 312,
      arrangements: [{ id: 'a6-1', name: 'Original', isOriginal: true, by: 'Marcos Witt', key: 'E', bpm: 76, meter: '4/4', length: '3:50', sequence: 'V1–C–V2–C', files: ['Letra', 'Acordes'] }],
      lyrics: [{ section: 'Verso', lines: ['Renuévame, Señor Jesús', 'Ya no quiero ser igual', 'Renuévame, Señor Jesús', 'Pon en mí tu corazón'] }] },
    { id: 's7', title: 'Yo te exalto', author: 'Miel San Marcos', key: 'F', bpm: 134, tags: ['Celebración'], ccli: '5731291', updated: 'hace 1 mes', plays: 145,
      arrangements: [{ id: 'a7-1', name: 'Original', isOriginal: true, by: 'Miel San Marcos', key: 'F', bpm: 134, meter: '4/4', length: '5:15', sequence: 'I–V1–C–P–C', files: ['Letra', 'Acordes', 'Multipista'] }],
      lyrics: [{ section: 'Coro', lines: ['Yo te exalto, mi Dios y Rey', 'Y bendeciré tu nombre', 'Eternamente y para siempre'] }] },
    { id: 's8', title: 'Cuán grande es Él', author: 'Tradicional', key: 'G', bpm: 70, tags: ['Himno'], ccli: '15348', updated: 'hace 1 mes', plays: 402,
      arrangements: [
        { id: 'a8-1', name: 'Himno (original)', isOriginal: true,  by: 'Tradicional', key: 'G', bpm: 70, meter: '3/4', length: '4:10', sequence: 'V1–C–V2–C', files: ['Letra', 'Partitura'] },
        { id: 'a8-2', name: 'Versión moderna',  isOriginal: false, by: 'Lucía H.',    key: 'A', bpm: 72, meter: '4/4', length: '5:00', sequence: 'V1–C–V2–C–P', files: ['Letra', 'Acordes', 'Multipista'] },
      ],
      lyrics: [{ section: 'Verso 1', lines: ['Señor mi Dios, al contemplar los cielos', 'El firmamento y las estrellas mil'] }, { section: 'Coro', lines: ['Mi corazón entona la canción', 'Cuán grande es Él, cuán grande es Él'] }] },
  ],
  media: [
    { id: 'm1', name: 'Bumper Dominical Q1.mp4', kind: 'video' as const, size: '124 MB', when: 'hace 3 días', tag: 'Bumper' },
    { id: 'm2', name: 'Anuncio Conferencia.png', kind: 'image' as const, size: '3.2 MB', when: 'hace 5 días', tag: 'Anuncios' },
    { id: 'm3', name: 'Fondo Adoración 1.jpg',    kind: 'image' as const, size: '4.8 MB', when: 'hace 1 sem',  tag: 'Fondos' },
    { id: 'm4', name: 'Sermón 23 — Audio.mp3',    kind: 'audio' as const, size: '38 MB',  when: 'hace 1 sem',  tag: 'Sermones' },
    { id: 'm5', name: 'Letra Cuán grande es Él.pptx', kind: 'doc' as const, size: '1.4 MB', when: 'hace 2 sem', tag: 'Letras' },
    { id: 'm6', name: 'Fondo Adoración 2.jpg',    kind: 'image' as const, size: '5.1 MB', when: 'hace 2 sem',  tag: 'Fondos' },
    { id: 'm7', name: 'Transición Logo.mov',      kind: 'video' as const, size: '62 MB',  when: 'hace 3 sem',  tag: 'Bumper' },
    { id: 'm8', name: 'Imagen Bienvenida.png',    kind: 'image' as const, size: '2.1 MB', when: 'hace 1 mes',  tag: 'Anuncios' },
  ],
  plan: {
    id: 'p1', title: 'Servicio Dominical · 31 Mayo',
    date: 'Domingo 31 de Mayo · 10:00 – 11:30',
    leader: 'Lucía Hernández',
    confirmados: 9, pendientes: 3, declinados: 1,
    items: [
      { id: 'i1', kind: 'section' as const, label: 'Pre-servicio', duration: 15 },
      { id: 'i2', kind: 'item'    as const, label: 'Música ambiente',     who: 'Equipo Sonido',  duration: 10 },
      { id: 'i3', kind: 'item'    as const, label: 'Bienvenida y oración', who: 'Pastor Andrés', duration: 5 },
      { id: 'i4', kind: 'section' as const, label: 'Bloque de adoración', duration: 28 },
      { id: 'i5', kind: 'song'    as const, label: 'Maravilloso es',     who: 'Lucía · D', duration: 6, songKey: 'D' },
      { id: 'i6', kind: 'song'    as const, label: 'Eres todopoderoso',  who: 'Lucía · G', duration: 7, songKey: 'G' },
      { id: 'i7', kind: 'song'    as const, label: 'Cuán grande es Él',  who: 'Diego · G', duration: 6, songKey: 'G' },
      { id: 'i8', kind: 'song'    as const, label: 'Inunda este lugar',  who: 'Lucía · B', duration: 9, songKey: 'B' },
      { id: 'i9', kind: 'section' as const, label: 'Palabra', duration: 35 },
      { id: 'i10', kind: 'item'   as const, label: 'Anuncios + ofrenda',  who: 'Pastor Andrés', duration: 8 },
      { id: 'i11', kind: 'item'   as const, label: 'Mensaje — Romanos 8', who: 'Pastor Andrés', duration: 27 },
      { id: 'i12', kind: 'section' as const, label: 'Cierre', duration: 7 },
      { id: 'i13', kind: 'song'   as const, label: 'Renuévame (respuesta)', who: 'Lucía · E', duration: 5, songKey: 'E' },
      { id: 'i14', kind: 'item'   as const, label: 'Bendición',           who: 'Pastor Andrés', duration: 2 },
    ],
    teams: [
      { name: 'Alabanza · Equipo A', color: 1, people: [
        { name: 'Lucía Hernández',  role: 'Voz líder',       status: 'confirmed' as const },
        { name: 'Diego Ramírez',    role: 'Voz / Guitarra',  status: 'confirmed' as const },
        { name: 'Marta Soto',       role: 'Coros',           status: 'pending'   as const },
        { name: 'Javier Núñez',     role: 'Piano',           status: 'confirmed' as const },
        { name: 'Sofía Bravo',      role: 'Bajo',            status: 'confirmed' as const },
        { name: 'Pablo Romero',     role: 'Batería',         status: 'pending'   as const },
      ]},
      { name: 'Producción', color: 4, people: [
        { name: 'Ana Vega',     role: 'Sonido',     status: 'confirmed' as const },
        { name: 'Hugo Marín',   role: 'Pantallas',  status: 'confirmed' as const },
        { name: 'Carla Pinto',  role: 'Luces',      status: 'declined'  as const },
        { name: 'Tomás López',  role: 'Cámara',     status: 'pending'   as const },
      ]},
      { name: 'Hospitalidad', color: 3, people: [
        { name: 'Elena Cano',   role: 'Recepción',  status: 'confirmed' as const },
        { name: 'Miguel Ruiz',  role: 'Recepción',  status: 'confirmed' as const },
        { name: 'Andrea Soler', role: 'Niños',      status: 'confirmed' as const },
      ]},
    ],
    songSet: [
      { id: 'ss1', n: 1, title: 'Maravilloso es',    author: 'Marcos Witt',        key: 'D', bpm: 78, dur: 6, arrangement: 'Versión dominical', seq: 'I–V–C×2–P', leadBy: 'Lucía', files: ['Acordes', 'Multitrack', 'Letra'] },
      { id: 'ss2', n: 2, title: 'Eres todopoderoso', author: 'Generación 12',      key: 'G', bpm: 92, dur: 7, arrangement: 'Estándar',          seq: 'V1–C–V2–C–P', leadBy: 'Lucía', files: ['Acordes', 'Letra'] },
      { id: 'ss3', n: 3, title: 'Cuán grande es Él', author: 'Tradicional',        key: 'G', bpm: 70, dur: 6, arrangement: 'Himno acústico',    seq: 'V1–C–V2–C', leadBy: 'Diego', files: ['Partitura', 'Letra'] },
      { id: 'ss4', n: 4, title: 'Inunda este lugar', author: "Christine D'Clario", key: 'B', bpm: 64, dur: 9, arrangement: 'Espontáneo',        seq: 'C–P–libre', leadBy: 'Lucía', files: ['Acordes', 'Multitrack', 'Audio ref.'] },
      { id: 'ss5', n: 5, title: 'Renuévame',         author: 'Marcos Witt',        key: 'E', bpm: 76, dur: 5, arrangement: 'Respuesta',         seq: 'C×2', leadBy: 'Lucía', files: ['Letra'] },
    ],
    attachments: [
      { id: 'pa1', name: 'Fondo Adoración 1.jpg',      kind: 'image' as const, size: '4.8 MB', for: 'Bloque de adoración', by: 'Hugo Marín' },
      { id: 'pa2', name: 'Letra — Maravilloso es.pptx', kind: 'doc'   as const, size: '1.2 MB', for: 'Maravilloso es',      by: 'Lucía H.' },
      { id: 'pa3', name: 'Bumper Dominical Q1.mp4',    kind: 'video' as const, size: '124 MB', for: 'Pre-servicio',         by: 'Ana Vega' },
      { id: 'pa4', name: 'Mensaje Romanos 8.key',      kind: 'doc'   as const, size: '8.6 MB', for: 'Mensaje — Romanos 8', by: 'Pastor Andrés' },
      { id: 'pa5', name: 'Pista Inunda este lugar.mp3', kind: 'audio' as const, size: '7.1 MB', for: 'Inunda este lugar',    by: 'Diego R.' },
      { id: 'pa6', name: 'Anuncio Conferencia.png',    kind: 'image' as const, size: '3.2 MB', for: 'Anuncios + ofrenda',   by: 'Hugo Marín' },
    ],
    notes: [
      { id: 'pn1', cat: 'Notas generales', who: 'todo el equipo',     body: 'Llegada 8:30 para soundcheck completo. Recordad traer auriculares in-ear cargados. Vestimenta: tonos neutros, evitar logos.' },
      { id: 'pn2', cat: 'Banda',           who: 'Equipo de música',   body: 'En “Inunda este lugar” dejamos espontáneo largo tras el coro — Lucía marca la salida. Pads en C todo el bloque.' },
      { id: 'pn3', cat: 'Producción',      who: 'Sonido y pantallas', body: 'Bajar luces a 40% durante el mensaje. Letra a pantalla solo en bloque de adoración, no en respuesta final.' },
      { id: 'pn4', cat: 'Pastor',          who: 'Pastor Andrés',      body: 'Mensaje sobre Romanos 8 — 27 min. Transición directa a “Renuévame” sin anuncios intermedios.' },
    ],
    history: [
      { id: 'h1', who: 'Lucía Hernández', c: 1, action: 'publicó el plan',           detail: 'Estado: Borrador → Publicado', when: 'Hoy · 09:12' },
      { id: 'h2', who: 'Diego Ramírez',   c: 7, action: 'añadió 2 canciones',         detail: 'Cuán grande es Él, Inunda este lugar', when: 'Ayer · 18:40' },
      { id: 'h3', who: 'Marta Soto',      c: 3, action: 'cambió su disponibilidad',   detail: 'Coros → Pendiente de confirmar', when: 'Ayer · 16:05' },
      { id: 'h4', who: 'Pastor Andrés',   c: 4, action: 'editó las notas del mensaje', detail: 'Sección “Palabra”', when: '28 May · 21:30' },
      { id: 'h5', who: 'Lucía Hernández', c: 1, action: 'reordenó el bloque de adoración', detail: '4 canciones movidas', when: '28 May · 11:18' },
      { id: 'h6', who: 'Hugo Marín',      c: 5, action: 'subió un archivo',           detail: 'Fondo Adoración 1.jpg', when: '27 May · 19:02' },
      { id: 'h7', who: 'Lucía Hernández', c: 1, action: 'creó el plan',               detail: 'A partir de plantilla “Dominical”', when: '26 May · 10:00' },
    ],
  },
  conversations: [
    { id: 'c1', kind: 'team', name: 'Alabanza · Equipo A', c: 1, members: 6, unread: 3, when: '10:24',
      preview: 'Diego: He subido el .prt de Inunda este lugar',
      msgs: [
        { who: 'Diego Ramírez', c: 7, t: '¿Confirmamos el ensayo del sábado a las 18:00?', when: 'Ayer 21:10' },
        { who: 'Marta Soto', c: 3, t: 'Por mí perfecto 🙌', when: 'Ayer 21:14' },
        { who: 'Javier Núñez', c: 5, t: 'Yo llego 18:30, vengo del trabajo', when: 'Ayer 21:20' },
        { who: 'Diego Ramírez', c: 7, t: 'He subido el .prt de Inunda este lugar al arreglo espontáneo, revisad la secuencia', when: '10:24' },
        { who: 'me', t: 'Genial, lo veo esta tarde y os digo', when: '10:26' },
      ] },
    { id: 'c2', kind: 'service', name: 'Servicio Dominical · 31 May', c: 4, members: 13, unread: 0, when: '09:40',
      preview: 'Lucía: Recordad llegar 8:30 para soundcheck',
      msgs: [
        { who: 'Pastor Andrés', c: 3, t: 'Equipo, el mensaje será sobre Romanos 8, transición directa a Renuévame', when: 'Vie 18:02' },
        { who: 'me', t: 'Recordad llegar 8:30 para soundcheck completo', when: '09:40' },
        { who: 'Ana Vega', c: 2, t: 'Sonido listo, in-ears cargados ✅', when: '09:48' },
      ] },
    { id: 'c3', kind: 'group', name: 'Líderes', c: 3, members: 8, unread: 1, when: 'Ayer',
      preview: 'Pastor Andrés: Reunión de líderes el martes',
      msgs: [
        { who: 'Pastor Andrés', c: 3, t: 'Reunión de líderes el martes a las 20:00 en sala 2', when: 'Ayer 17:30' },
        { who: 'Noelia Pardo', c: 4, t: 'Allí estaré', when: 'Ayer 17:45' },
      ] },
    { id: 'c4', kind: 'direct', name: 'Diego Ramírez', c: 7, members: 2, unread: 0, when: '08:15',
      preview: '¿Te paso la tonalidad en C?',
      msgs: [
        { who: 'Diego Ramírez', c: 7, t: '¿Te paso la tonalidad en C para Reckless Love?', when: '08:15' },
        { who: 'me', t: 'Sí porfa, y el multitrack si lo tienes', when: '08:18' },
      ] },
    { id: 'c5', kind: 'direct', name: 'Marta Soto', c: 3, members: 2, unread: 2, when: 'Ayer',
      preview: '¿Puedo hacer coros suaves en el espontáneo?',
      msgs: [
        { who: 'Marta Soto', c: 3, t: 'Hola Lucía 😊', when: 'Ayer 19:00' },
        { who: 'Marta Soto', c: 3, t: '¿Puedo hacer coros suaves en el espontáneo del domingo?', when: 'Ayer 19:01' },
      ] },
  ] as Array<{ id: string; kind: 'team' | 'service' | 'group' | 'direct'; name: string; c: number; members: number; unread: number; when: string; preview: string; msgs: Array<{ who: string; c?: number; t: string; when: string }> }>,
}

const MEDIA_COLORS: Record<string, [string, string]> = {
  image: ['#5E5CE6', '#BF5AF2'],
  video: ['#0A84FF', '#5E5CE6'],
  audio: ['#FF9F0A', '#FF453A'],
  doc:   ['#30D158', '#34C8E8'],
}
const MEDIA_ICON_KEY: Record<string, keyof typeof I> = { image: 'Photo', video: 'Play', audio: 'Music', doc: 'Doc' }

const STATUS_META: Record<'confirmed' | 'pending' | 'declined', { label: string; tone: string; bg: string; Icon: (p: { size?: number }) => JSX.Element }> = {
  confirmed: { label: 'Confirmado', tone: 'var(--success)', bg: 'var(--accent-2-tint)', Icon: I.Check },
  pending:   { label: 'Pendiente',  tone: 'var(--warning)', bg: 'color-mix(in oklab, var(--warning) 14%, transparent)', Icon: I.Clock },
  declined:  { label: 'No puede',   tone: 'var(--danger)',  bg: 'color-mix(in oklab, var(--danger) 14%, transparent)',  Icon: I.X },
}

const MEDIA_META: Record<string, { tone: string; Icon: (p: { size?: number }) => JSX.Element; label: string }> = {
  image: { tone: '#34C759', Icon: I.Photo, label: 'Imagen' },
  video: { tone: '#FF2D55', Icon: I.Play, label: 'Vídeo' },
  audio: { tone: '#AF52DE', Icon: I.Music, label: 'Audio' },
  doc:   { tone: '#0A84FF', Icon: I.Doc, label: 'Documento' },
}

function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('')
}

function buildCal(year: number, month: number) {
  const first = new Date(year, month, 1)
  const start = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const cells: { d: number; other?: boolean; today?: boolean; evt?: boolean; selected?: boolean }[] = []
  for (let i = 0; i < start; i++) cells.push({ d: prevDays - start + 1 + i, other: true })
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, month, d).getDay()
    const evt = wd === 0 || (wd === 3 && d >= 4) || d === 22
    cells.push({ d, today: d === 26, evt, selected: d === 31 })
  }
  while (cells.length % 7) cells.push({ d: cells.length - days - start + 1, other: true })
  return cells
}

// ═════════════════════════════════════════════════════════════════════════════
// SHELL — Sidebar + Topbar (port of shell.jsx)
// ═════════════════════════════════════════════════════════════════════════════
interface SidebarCounts { planificacion?: number; servicios?: number; canciones?: number; personas?: number; mensajes?: number }
function Sidebar({ route, onNav, sb, onSbToggle, user, org, counts }: {
  route: ServiciosTab; onNav: (id: ServiciosTab) => void
  sb: 'full' | 'icons' | 'hidden'; onSbToggle: () => void
  user: { name: string; role: string; initials: string }; org: { name: string }
  counts: SidebarCounts
}) {
  const fmt = (n?: number) => (typeof n === 'number' ? String(n) : undefined)
  const links: { id: ServiciosTab; label: string; icon: (p: { size?: number }) => JSX.Element; ind?: string }[] = [
    { id: 'mi-planificacion', label: 'Mi planificación', icon: I.Home,  ind: fmt(counts.planificacion) },
    { id: 'servicios',        label: 'Servicios',        icon: I.Cal,   ind: fmt(counts.servicios) },
    { id: 'canciones',        label: 'Canciones',        icon: I.Music, ind: fmt(counts.canciones) },
    { id: 'media',            label: 'Media',            icon: I.Photo },
    { id: 'personas',         label: 'Personas',         icon: I.People, ind: fmt(counts.personas) },
    { id: 'mensajes',         label: 'Mensajes',         icon: I.Mail,  ind: fmt(counts.mensajes) },
  ]
  const secondary: { id: ServiciosTab; label: string; icon: (p: { size?: number }) => JSX.Element; ind?: string }[] = [
    { id: 'legacy', label: 'Vista antigua', icon: I.Eye },
  ]
  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-logo"><I.Wave size={16}/></div>
        <div style={{ minWidth: 0, lineHeight: 1.15 }}>
          <div className="sb-name"><b>Worsyn</b></div>
          <div className="sb-tag">{org.name.split(' ').slice(0,2).join(' ')}</div>
        </div>
        <button className="sb-toggle" onClick={onSbToggle} title="Plegar/expandir">
          <I.Sidebar size={15}/>
        </button>
      </div>
      <div className="sb-section">
        <div className="sb-section-label">Iglesia</div>
        {links.map(l => (
          <button key={l.id} className={'sb-link' + (route === l.id ? ' is-active' : '')} onClick={() => onNav(l.id)} title={l.label}>
            <l.icon/>
            <span className="sb-link-text">{l.label}</span>
            {l.ind && <span className="ind mono">{l.ind}</span>}
          </button>
        ))}
      </div>
      <div className="sb-section">
        <div className="sb-section-label">Trabajo</div>
        {secondary.map(l => (
          <button key={l.id} className={'sb-link' + (route === l.id ? ' is-active' : '')} onClick={() => onNav(l.id)} title={l.label}>
            <l.icon/>
            <span className="sb-link-text">{l.label}</span>
            {l.ind && <span className="ind mono">{l.ind}</span>}
          </button>
        ))}
      </div>
      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-avatar">{user.initials}</div>
          <div className="sb-user-text">
            <div className="sb-user-name">{user.name}</div>
            <div className="sb-user-role">{user.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ crumbs, onSbToggle, onTheme, theme }: {
  crumbs: string[]; onSbToggle: () => void; onTheme: () => void; theme: 'light' | 'dark'
}) {
  return (
    <div className="tb">
      <button className="icon-btn" onClick={onSbToggle} title="Menú"><I.Menu/></button>
      <nav className="tb-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep"><I.Chev size={11}/></span>}
            <span className={i === crumbs.length - 1 ? 'cur' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </nav>
      <button className="tb-search">
        <I.Search/>
        <span>Buscar canciones, personas, servicios…</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="tb-actions">
        <button className="icon-btn" onClick={onTheme} title="Tema">{theme === 'dark' ? <I.Sun/> : <I.Moon/>}</button>
        <button className="icon-btn" title="Notificaciones"><I.Bell/></button>
        <button className="icon-btn" title="Nuevo"><I.Plus/></button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MI PLANIFICACIÓN (port screens-a.jsx)
// ═════════════════════════════════════════════════════════════════════════════
type PendingRequest = (typeof D.pendingRequests)[number]

function DrawerStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--separator)' }}>
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: 0.14, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, letterSpacing: '-0.005em' }}>{value}</div>
    </div>
  )
}

function RequestDetail({ req, onClose, onRespond }: {
  req: PendingRequest; onClose: () => void; onRespond: (r: PendingRequest, accept: boolean) => void
}) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <aside className="drawer">
        <div className="drawer-head" style={{ background: `linear-gradient(135deg, ${req.from.color}24, transparent 60%), var(--surface)` }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className={'pill-tone tone-' + req.tone}><span className="chip-dot"/>{req.svc}</span>
            <button className="icon-btn" onClick={onClose}><I.X size={14}/></button>
          </div>
          <div className="row" style={{ gap: 14 }}>
            <div className="av av-lg" data-c={req.from.tone === 'yellow' ? 7 : req.from.tone === 'violet' ? 3 : 5} style={{ width: 48, height: 48, fontSize: 15 }}>
              {req.from.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Solicitud de</div>
              <div className="display-serif" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 2 }}>{req.from.name}</div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <div className="stack" style={{ gap: 18 }}>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <DrawerStat label="Fecha" value={req.date}/>
              <DrawerStat label="Rol"   value={req.role}/>
              <DrawerStat label="Equipo" value={req.team}/>
            </div>
            <div style={{ padding: 16, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--separator)', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55 }}>
              <span style={{ color: req.from.color, marginRight: 6, fontFamily: 'Geist, sans-serif', fontSize: 28, lineHeight: 0, verticalAlign: '-10px' }}>“</span>
              {req.message}
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 0.14, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginBottom: 10 }}>Repertorio previsto</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {req.songs.map((s, i) => (
                  <div key={i} className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--separator)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-tint)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                      <I.Music size={13}/>
                    </div>
                    <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{s}</div>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>#{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: 'color-mix(in oklab, var(--warning) 8%, var(--surface))', border: '1px solid color-mix(in oklab, var(--warning) 30%, transparent)', fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <I.Clock size={16}/>
              <div><b>{req.deadline}.</b> Si no respondes a tiempo, tu líder buscará a otra persona.</div>
            </div>
          </div>
        </div>
        <div className="drawer-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-secondary" onClick={() => onRespond(req, false)}><I.X size={14}/> Rechazar</button>
          <button className="btn btn-primary bounce-on-hover" onClick={() => onRespond(req, true)}><I.Check size={14}/> Aceptar invitación</button>
        </div>
      </aside>
    </>
  )
}

function MiPlanificacion({ userFirstName, onOpenPlan }: { userFirstName: string; onOpenPlan: () => void }) {
  const cal = buildCal(2026, 4)
  const [requests, setRequests] = useState<PendingRequest[]>([...D.pendingRequests])
  const [detailReq, setDetailReq] = useState<PendingRequest | null>(null)
  const [toast, setToast] = useState<{ accepted: boolean; name: string; svc: string } | null>(null)
  const respond = (req: PendingRequest, accept: boolean) => {
    setRequests(rs => rs.filter(r => r.id !== req.id))
    setDetailReq(null)
    setToast({ accepted: accept, name: req.from.name, svc: req.svc })
    setTimeout(() => setToast(null), 3200)
  }
  return (
    <div className="content">
      <div className="page-head rise">
        <div>
          <span className="eyebrow">Mi planificación</span>
          <h1 className="page-title">Buenos días, <em>{userFirstName}</em>.</h1>
          <p className="page-sub">
            Tienes <b style={{ color: 'var(--text)' }}>3 servicios</b> esta semana
            {requests.length > 0 && <> y <b style={{ color: 'var(--accent)' }}>{requests.length} solicitudes</b> esperando tu respuesta</>}.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Cal size={14}/> Mes completo</button>
          <button className="btn btn-primary"><I.Plus size={14}/> Nuevo servicio</button>
        </div>
      </div>

      {requests.length > 0 && (
        <section className="rise rise-d2" style={{ marginBottom: 'var(--gap)' }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="row" style={{ gap: 8 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: 0.14, textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>Solicitudes pendientes</span>
                <span className="pill-tone tone-coral">{requests.length}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Tu equipo necesita saber si cuentan contigo. Responde rápido para que puedan organizarse.</div>
            </div>
            <button className="btn btn-ghost btn-sm">Ver todas <I.Chev size={12}/></button>
          </div>
          <div className="grid grid-12" style={{ gap: 'var(--gap)' }}>
            {requests.map(req => (
              <article key={req.id} className={'col-6 req-card tone-' + req.tone}>
                <div className="req-card-deco"/>
                <div className="row" style={{ gap: 12, position: 'relative', zIndex: 2 }}>
                  <div className="av av-lg" data-c={req.from.tone === 'yellow' ? 7 : req.from.tone === 'violet' ? 3 : 5}>{req.from.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.005em' }}>{req.from.name}</div>
                      <span className={'pill-tone tone-' + req.tone}><span className="chip-dot"/>{req.svc}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Te invita como <b style={{ color: 'var(--text-2)' }}>{req.role}</b> · {req.team}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--separator)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, position: 'relative', zIndex: 2 }}>
                  <span style={{ color: 'var(--text-4)', marginRight: 6, fontFamily: 'Geist, sans-serif', fontSize: 22, lineHeight: 0, verticalAlign: '-8px' }}>“</span>
                  {req.message}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 14, position: 'relative', zIndex: 2, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                  <span className="row" style={{ gap: 4 }}><I.Cal size={12}/> {req.date}</span>
                  <span style={{ color: 'var(--text-4)' }}>·</span>
                  <span className="row" style={{ gap: 4, color: 'var(--warning)' }}><I.Clock size={12}/> {req.deadline}</span>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 14, position: 'relative', zIndex: 2 }}>
                  <button className="btn btn-primary" onClick={() => respond(req, true)}><I.Check size={14}/> Aceptar</button>
                  <button className="btn btn-secondary" onClick={() => respond(req, false)}><I.X size={14}/> Rechazar</button>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setDetailReq(req)}>Ver detalle <I.Chev size={12}/></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-12">
        <section className="col-8 card rise rise-d3">
          <div className="card-head">
            <div>
              <div className="card-title">Próximos servicios <span className="pill-tone tone-coral" style={{ marginLeft: 8 }}>Míos</span></div>
              <div className="card-sub">Servicios donde ya estás confirmada o asignada</div>
            </div>
            <div className="seg">
              <button className="seg-btn is-active">Míos</button>
              <button className="seg-btn">Equipo</button>
              <button className="seg-btn">Todos</button>
            </div>
          </div>
          <div>
            {D.upcoming.map((u, i) => (
              <div key={i} className="list-row" style={{ borderRadius: 0 }} onClick={onOpenPlan}>
                <div className="list-leading" style={{ width: 60, height: 64, borderRadius: 12, background: u.color + '14', border: `1.5px solid ${u.color}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div className="mono" style={{ fontSize: 9, color: u.color, letterSpacing: 0.14, textTransform: 'uppercase', fontWeight: 700 }}>{u.date.split(' ')[0].slice(0,3)}</div>
                  <div className="display-serif" style={{ fontSize: 26, lineHeight: 1, marginTop: 2 }}>{u.date.split(' ')[1]}</div>
                </div>
                <div className="list-body">
                  <div className="row" style={{ gap: 8 }}>
                    <div className="list-title">{u.svc}</div>
                    <span className={'pill-tone tone-' + u.tone}><span className="chip-dot"/>{u.role}</span>
                  </div>
                  <div className="list-sub">{u.day} · {u.when} · {u.team}</div>
                </div>
                <div className="list-trail">
                  <span className={'chip ' + (u.status === 'Confirmado' ? 't-success' : 't-warn')}>
                    {u.status === 'Confirmado' ? <I.Check size={11}/> : <I.Clock size={11}/>} {u.status}
                  </span>
                  <span className="list-chev"><I.Chev/></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="col-4 stack" style={{ gap: 'var(--gap)' }}>
          <div className="card rise rise-d3">
            <div className="card-head">
              <div className="card-title">Mayo 2026</div>
              <div className="row" style={{ gap: 4 }}>
                <button className="icon-btn"><I.ChevLeft size={14}/></button>
                <button className="icon-btn"><I.Chev size={14}/></button>
              </div>
            </div>
            <div className="mini-cal">
              <div className="mini-cal-grid">
                {'L M X J V S D'.split(' ').map(d => <div key={d} className="mini-cal-dow">{d}</div>)}
                {cal.map((c, i) => (
                  <div key={i} className={`mini-cal-day${c.other ? ' is-other' : ''}${c.today ? ' is-today' : ''}${c.evt ? ' has-evt' : ''}${c.selected ? ' is-selected' : ''}`}>{c.d}</div>
                ))}
              </div>
            </div>
            <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="pill-tone tone-coral"><span className="chip-dot"/>Dominical</span>
              <span className="pill-tone tone-violet"><span className="chip-dot"/>Oración</span>
              <span className="pill-tone tone-yellow"><span className="chip-dot"/>Jóvenes</span>
            </div>
          </div>

          <div className="card rise rise-d4">
            <div className="card-head"><div className="card-title">Acciones rápidas</div></div>
            <div style={{ padding: 8 }}>
              {[
                { Icon: I.Plus,  t: 'Crear servicio',           sub: 'Plan, equipos y canciones',     tone: 'coral'  },
                { Icon: I.Music, t: 'Añadir canción',           sub: 'A la biblioteca de la iglesia', tone: 'teal'   },
                { Icon: I.Send,  t: 'Solicitar disponibilidad', sub: 'Pregunta a tu equipo',          tone: 'yellow' },
                { Icon: I.Doc,   t: 'Plantilla de servicio',    sub: 'Reutiliza una existente',       tone: 'violet' },
              ].map((a, idx) => (
                <button key={idx} className={'list-row tone-' + a.tone} style={{ width: '100%', textAlign: 'left', borderRadius: 10, border: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--tone-tint)', display: 'grid', placeItems: 'center', color: 'var(--tone)' }}><a.Icon size={16}/></div>
                  <div className="list-body">
                    <div className="list-title" style={{ fontWeight: 500 }}>{a.t}</div>
                    <div className="list-sub">{a.sub}</div>
                  </div>
                  <span className="list-chev"><I.Chev/></span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="col-12 card rise rise-d4">
          <div className="card-head">
            <div className="card-title">Actividad reciente</div>
            <button className="btn btn-ghost btn-sm">Ver todo</button>
          </div>
          <div>
            {[
              { Icon: I.Music, who: 'Diego Ramírez',  what: 'añadió 2 canciones al plan del 31 May',   when: 'hace 12 min', c: 7 },
              { Icon: I.Check, who: 'Marta Soto',     what: 'confirmó asistencia al Culto de Oración', when: 'hace 1 h',   c: 3 },
              { Icon: I.Edit,  who: 'Pastor Andrés',  what: 'editó las notas del mensaje · Romanos 8', when: 'hace 3 h',   c: 4 },
              { Icon: I.People,who: 'Lucía Hernández',what: 'invitó a 3 personas al equipo Alabanza',  when: 'ayer',       c: 1 },
            ].map((a, i) => (
              <div key={i} className="list-row" style={{ borderRadius: 0 }}>
                <div className="av av-sm" data-c={a.c}>{a.who.split(' ').map(w => w[0]).slice(0,2).join('')}</div>
                <div className="list-body">
                  <div className="list-title" style={{ fontWeight: 500 }}>{a.who} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{a.what}</span></div>
                  <div className="list-sub">{a.when}</div>
                </div>
                <a.Icon size={14}/>
              </div>
            ))}
          </div>
        </section>
      </div>

      {detailReq && <RequestDetail req={detailReq} onClose={() => setDetailReq(null)} onRespond={respond}/>}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 18px 12px 14px', borderRadius: 999,
          background: toast.accepted ? 'var(--accent-2-tint)' : 'var(--surface)',
          border: '1px solid ' + (toast.accepted ? 'var(--accent-2)' : 'var(--hairline)'),
          color: 'var(--text)', boxShadow: 'var(--shadow-3)',
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10, zIndex: 400,
          animation: 'rise-in 320ms cubic-bezier(.2,.7,.2,1) both',
        }}>
          <div className="check-pop" style={{ width: 24, height: 24, borderRadius: 999, background: toast.accepted ? 'var(--accent-2)' : 'var(--text-4)', color: '#fff', display: 'grid', placeItems: 'center' }}>
            {toast.accepted ? <I.Check size={13}/> : <I.X size={13}/>}
          </div>
          {toast.accepted ? <>¡Genial! {toast.name} sabrá que cuentas con tú en {toast.svc}.</> : <>{toast.svc}: avisamos a quien te invitó.</>}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SERVICIOS list (port screens-a.jsx::Servicios)
// ═════════════════════════════════════════════════════════════════════════════
const STATUS_LABEL: Record<string, { l: string; c: string; bg: string }> = {
  draft:     { l: 'Borrador',  c: 'var(--text-3)', bg: 'var(--surface-3)' },
  published: { l: 'Publicado', c: 'var(--success)', bg: 'var(--accent-2-tint)' },
  completed: { l: 'Completado',c: 'var(--text-3)', bg: 'var(--surface-3)' },
}
const RECUR_LABEL: Record<string, string> = {
  weekly: 'Semanal', biweekly: 'Cada 2 semanas', monthly: 'Mensual',
  weekdays: 'Días laborables', daily: 'Diario', random: 'Aleatorio', none: 'Sin repetición',
}
const DOW_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const DOW_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatPlanDate(iso: string | null) {
  if (!iso) return { dow: '—', day: '—', month: '', time: '—', full: '—' }
  const d = new Date(iso)
  const dowIdx = (d.getDay() + 6) % 7  // JS: Sun=0 → make Monday=0
  return {
    dow: DOW_SHORT[dowIdx],
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTH_ABBR[d.getMonth()],
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    full: `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`,
  }
}

function recurrenceSubtitle(t: ServiceType): string {
  const lbl = RECUR_LABEL[t.recurrence] || 'Semanal'
  if (t.times && t.times.length > 0) {
    const wdays = Array.from(new Set(t.times.map(x => x.weekday).filter((w): w is number => typeof w === 'number'))).sort()
    if (wdays.length > 0 && (t.recurrence === 'weekly' || t.recurrence === 'biweekly' || t.recurrence === 'monthly')) {
      const days = wdays.map(w => DOW_FULL[w]).join(' / ')
      return `${lbl} · ${days}`
    }
  }
  return lbl
}

function ServiceTypeCard({ type, plans, onOpenPlan, onNewPlan, onConfigure }: {
  type: ServiceType
  plans: { id: string; title: string; status: string; scheduled_at: string | null; service_type_id: string | null }[]
  onOpenPlan: (planId: string) => void
  onNewPlan: () => void
  onConfigure: () => void
}) {
  const color = type.color || '#0A84FF'
  const upcoming = plans
    .filter(p => p.scheduled_at && new Date(p.scheduled_at) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''))
  const shown = upcoming.slice(0, 5)

  return (
    <article className="col-6 card" style={{ overflow: 'hidden' }}>
      <div className="svc-ribbon" style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 70%, #000))` }}>
        <div className="svc-ribbon-deco"/>
        <div className="svc-ribbon-deco b"/>
        <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
          <div className="svc-ribbon-sub">{recurrenceSubtitle(type)}</div>
          <div className="svc-ribbon-title">{type.name}</div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div className="display-serif" style={{ fontSize: 36, lineHeight: 1, color: '#fff' }}>{upcoming.length}</div>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: 0.16, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>próximos</div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--separator)', flexWrap: 'wrap' }}>
        {type.times.length === 0
          ? <span className="chip" style={{ color: 'var(--text-3)' }}><I.Clock size={11}/> Sin horarios</span>
          : type.times.map(t => <span key={t.id} className="chip"><I.Clock size={11}/>{t.start_time} – {t.end_time}</span>)}
        <span style={{ flex: 1 }}/>
        <button className="btn btn-ghost btn-sm" onClick={onConfigure}><I.Settings size={12}/> Configuración</button>
      </div>

      <div>
        {shown.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-3)' }}>
            Sin servicios programados aún. Pulsa <b style={{ color: 'var(--text-2)' }}>+ Nuevo {type.name.toLowerCase()}</b> para crear el primero.
          </div>
        ) : shown.map(p => {
          const d = formatPlanDate(p.scheduled_at)
          const st = STATUS_LABEL[p.status] || STATUS_LABEL.draft
          return (
            <div key={p.id} className="svc-instance" onClick={() => onOpenPlan(p.id)}>
              <div className="svc-instance-date" style={{ ['--tone' as any]: color }}>
                <div className="m" style={{ color }}>{d.dow}</div>
                <div className="d">{d.day}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</div>
                  <span style={{ height: 22, padding: '0 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: st.bg, color: st.c, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: 'currentColor' }}/>
                    {st.l}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                  {d.full} · {d.time}
                </div>
              </div>
              <span className="list-chev"><I.Chev/></span>
            </div>
          )
        })}
        <div className="row" style={{ padding: '10px 18px', borderTop: '1px solid var(--separator)', background: 'var(--surface-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={onNewPlan}><I.Plus size={12}/> Nuevo {type.name.toLowerCase()}</button>
          <span style={{ flex: 1 }}/>
          {upcoming.length > shown.length && (
            <button className="btn btn-ghost btn-sm">Ver todos ({upcoming.length}) <I.Chev size={12}/></button>
          )}
        </div>
      </div>
    </article>
  )
}

function ServiciosList({ slug, teams, onOpenPlan, onOpenTypeConfig, onChanged }: {
  slug: string; teams: Team[]; onOpenPlan: () => void;
  onOpenTypeConfig: (t: ServiceType) => void;
  onChanged: () => void;
}) {
  const [newOpen, setNewOpen] = useState(false)
  const [types, setTypes] = useState<ServiceType[]>([])
  const [plans, setPlans] = useState<{ id: string; title: string; status: string; scheduled_at: string | null; service_type_id: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [addPlanFor, setAddPlanFor] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, pRes] = await Promise.all([
        api(`/api/v1/tenant/${slug}/services/types`),
        api(`/api/v1/tenant/${slug}/services/plans`),
      ])
      setTypes(tRes.ok ? await tRes.json() : [])
      setPlans(pRes.ok ? await pRes.json() : [])
    } finally { setLoading(false) }
    onChanged()
  }, [slug, onChanged])
  useEffect(() => { reload() }, [reload])

  function plansFor(typeId: string) { return plans.filter(p => p.service_type_id === typeId) }

  return (
    <div className="content">
      <div className="page-head rise">
        <div>
          <span className="eyebrow">Servicios</span>
          <h1 className="page-title">Servicios <em>programados</em></h1>
          <p className="page-sub">Cada tipo de servicio agrupa sus próximas ocurrencias. Abre cualquiera para editar plan, equipos y canciones.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Filter size={14}/> Filtrar</button>
          <button className="btn btn-secondary"><I.Settings size={14}/> Gestionar tipos</button>
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}><I.Plus size={14}/> Nuevo servicio</button>
        </div>
      </div>

      {newOpen && (
        <NewServiceModal slug={slug} teams={teams}
          onClose={() => setNewOpen(false)}
          onCreated={() => reload()}/>
      )}
      {addPlanFor && (
        <AddPlanModalV2 slug={slug} typeId={addPlanFor}
          typeName={types.find(t => t.id === addPlanFor)?.name || 'Servicio'}
          onClose={() => setAddPlanFor(null)}
          onCreated={() => { setAddPlanFor(null); reload() }}/>
      )}

      {loading && types.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>Cargando…</div>
      ) : types.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', fontSize: 13.5, color: 'var(--text-3)' }}>
          Aún no hay tipos de servicio. Pulsa <b style={{ color: 'var(--text-2)' }}>+ Nuevo servicio</b> para crear el primero.
        </div>
      ) : (
        <div className="grid grid-12 rise rise-d2">
          {types.map(t => (
            <ServiceTypeCard key={t.id} type={t} plans={plansFor(t.id)}
              onOpenPlan={() => onOpenPlan()}
              onNewPlan={() => setAddPlanFor(t.id)}
              onConfigure={() => onOpenTypeConfig(t)}/>
          ))}
        </div>
      )}
    </div>
  )
}

function ServiceTypeConfigView({ slug, type, teams, onBack, onChanged, onDeleted }: {
  slug: string; type: ServiceType; teams: Team[];
  onBack: () => void;
  onChanged: (t: ServiceType) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(type.name)
  const [colorHex, setColorHex] = useState<string>(type.color || '#0A84FF')
  const [recurrence, setRecurrence] = useState<Recurrence>(type.recurrence as Recurrence)
  const [description, setDescription] = useState<string>(type.description || '')
  const [times, setTimes] = useState<ServiceTimeIn[]>(
    type.times.map(t => ({ starts_on: t.starts_on, start_time: t.start_time, end_time: t.end_time }))
  )
  const [teamIds, setTeamIds] = useState<string[]>(type.team_ids || [])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const colorMatch = SERVICE_COLORS.find(c => c.hex.toLowerCase() === colorHex.toLowerCase())
  const dirty = JSON.stringify({
    name: type.name, color: type.color, recurrence: type.recurrence, description: type.description || '',
    times: type.times.map(t => ({ s: t.starts_on, a: t.start_time, b: t.end_time })),
    teamIds: (type.team_ids || []).join(','),
  }) !== JSON.stringify({
    name, color: colorHex, recurrence, description,
    times: times.map(t => ({ s: t.starts_on, a: t.start_time, b: t.end_time })),
    teamIds: teamIds.join(','),
  })

  async function save() {
    if (!name.trim()) { setErr('Nombre requerido'); return }
    if (times.length === 0) { setErr('Añade al menos un horario'); return }
    for (const t of times) {
      if (!t.starts_on || !t.start_time || !t.end_time) { setErr('Completa todos los horarios'); return }
      if (t.end_time <= t.start_time) { setErr('La hora de fin debe ser posterior a la de inicio'); return }
    }
    setSaving(true); setErr('')
    try {
      const r = await api(`/api/v1/tenant/${slug}/services/types/${type.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), color: colorHex, recurrence,
          description: description || null,
          times, team_ids: teamIds,
        }),
      })
      if (r.ok) onChanged(await r.json())
      else { const j = await r.json().catch(() => ({})); setErr((j as any).detail || 'Error') }
    } finally { setSaving(false) }
  }

  async function del() {
    if (!confirm(`¿Eliminar el tipo de servicio "${type.name}"?\n\nSe perderán todos sus planes asociados. Esta acción es irreversible.`)) return
    const r = await api(`/api/v1/tenant/${slug}/services/types/${type.id}`, { method: 'DELETE' })
    if (r.ok) onDeleted()
    else { const j = await r.json().catch(() => ({})); alert((j as any).detail || 'Error') }
  }

  function updTime(i: number, patch: Partial<ServiceTimeIn>) {
    setTimes(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }
  function addTime() {
    const last = times[times.length - 1]
    setTimes(prev => [...prev, { starts_on: last?.starts_on || nextSundayISO(), start_time: '08:00', end_time: '09:00' }])
  }
  function rmTime(i: number) {
    setTimes(prev => prev.filter((_, idx) => idx !== i))
  }
  function toggleTeam(id: string) {
    setTeamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="content route-enter">
      <div className="page-head rise" style={{ alignItems: 'flex-start' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 10, paddingLeft: 0 }}>
            <I.ChevLeft size={13}/> SERVICIOS
          </button>
          <div className="row" style={{ gap: 12 }}>
            <span style={{ width: 18, height: 18, borderRadius: 6, background: colorHex, flexShrink: 0 }}/>
            <h1 className="page-title" style={{ fontSize: 28 }}>{type.name}</h1>
          </div>
          <p className="page-sub" style={{ marginTop: 8 }}>Configuración del tipo de servicio. Cambia nombre, color, recurrencia, horarios y equipos.</p>
        </div>
      </div>

      <div className="rise rise-d2">
        <div className="grid grid-12" style={{ gap: 'var(--gap)' }}>
          <div className="col-6">
            <CfgCard icon={I.Settings} title="Detalles">
              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Nombre</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', height: 40 }}/>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Recurrencia</label>
                <select value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence)} style={{
                  width: '100%', height: 40, padding: '0 36px 0 14px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--hairline)',
                  fontSize: 13.5, cursor: 'pointer', appearance: 'none', fontFamily: 'inherit',
                  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                }}>
                  {RECUR_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Descripción</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="input" style={{ width: '100%', minHeight: 70, padding: 12, resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="Opcional: rol del servicio"/>
              </div>
            </CfgCard>
          </div>

          <div className="col-6">
            <CfgCard icon={I.Sun} title="Color del banner">
              <div className="svc-ribbon" style={{
                borderRadius: 'var(--radius-md)', marginBottom: 16, minHeight: 80,
                background: `linear-gradient(135deg, ${colorHex}, color-mix(in oklab, ${colorHex} 70%, #000))`,
              }}>
                <div className="svc-ribbon-deco"/>
                <div className="svc-ribbon-deco b"/>
                <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
                  <div className="svc-ribbon-sub">{RECUR_LABEL[recurrence] || 'Semanal'}</div>
                  <div className="svc-ribbon-title">{name || 'Sin nombre'}</div>
                </div>
              </div>
              <div className="swatch-grid">
                {SERVICE_COLORS.map(c => (
                  <button key={c.id} className={'swatch' + (colorMatch?.id === c.id ? ' is-active' : '')}
                    onClick={() => setColorHex(c.hex)} title={c.name}
                    style={{ background: c.hex, color: c.hex }}/>
                ))}
              </div>
            </CfgCard>
          </div>

          <div className="col-12">
            <CfgCard icon={I.Clock} title="Horarios">
              <div className="stack" style={{ gap: 10 }}>
                {times.map((t, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 110px) auto minmax(0, 110px) auto',
                    alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: 'var(--surface-2)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)',
                  }}>
                    <input type="date" className="input" value={t.starts_on}
                      onChange={e => updTime(i, { starts_on: e.target.value })} style={{ minWidth: 0, height: 36, width: '100%' }}/>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>de</span>
                    <input type="time" className="input" value={t.start_time}
                      onChange={e => updTime(i, { start_time: e.target.value })} style={{ minWidth: 0, height: 36, width: '100%' }}/>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>a</span>
                    <input type="time" className="input" value={t.end_time}
                      onChange={e => updTime(i, { end_time: e.target.value })} style={{ minWidth: 0, height: 36, width: '100%' }}/>
                    {times.length > 1
                      ? <button className="icon-btn" onClick={() => rmTime(i)} title="Quitar"><I.X size={14}/></button>
                      : <span style={{ width: 28 }}/>}
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={addTime} style={{ marginTop: 12 }}>
                <I.Plus size={12}/> Añadir otro horario
              </button>
            </CfgCard>
          </div>

          <div className="col-12">
            <CfgCard icon={I.People} title="Equipos participantes">
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.5 }}>
                Selecciona los equipos que participarán en este tipo de servicio.
              </div>
              {teams.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'italic' }}>Sin equipos creados.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {teams.map(t => {
                    const checked = teamIds.includes(t.id)
                    return (
                      <button key={t.id} onClick={() => toggleTeam(t.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                        border: '1.5px solid ' + (checked ? 'var(--accent)' : 'var(--separator)'),
                        borderRadius: 'var(--radius-md)',
                        background: checked ? 'var(--accent-tint)' : 'var(--surface)',
                        cursor: 'pointer', textAlign: 'left', transition: 'border-color 140ms, background 140ms',
                      }}>
                        <span style={{ width: 12, height: 12, borderRadius: 4, background: t.color || 'var(--accent)', flexShrink: 0 }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{t.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{t.member_count} miembro{t.member_count === 1 ? '' : 's'}</div>
                        </div>
                        {checked && <I.Check size={14} {...{ style: { color: 'var(--accent)' } } as any}/>}
                      </button>
                    )
                  })}
                </div>
              )}
            </CfgCard>
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in oklab, var(--danger) 12%, transparent)', color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
            {err}
          </div>
        )}

        <div className="row-between" style={{ marginTop: 'var(--gap)' }}>
          <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' }} onClick={del}>
            <I.Trash size={14}/> Eliminar tipo de servicio
          </button>
          <div className="row" style={{ gap: 10 }}>
            {dirty && <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>Cambios sin guardar</span>}
            <button className="btn btn-primary" disabled={!dirty || saving} onClick={save}>
              <I.Check size={14}/> {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddPlanModalV2({ slug, typeId, typeName, onClose, onCreated }: {
  slug: string; typeId: string; typeName: string; onClose: () => void; onCreated: () => void;
}) {
  const [next, setNext] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api(`/api/v1/tenant/${slug}/services/types/${typeId}/next-default`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.scheduled_at) setNext(j.scheduled_at) })
      .catch(() => {})
  }, [slug, typeId])

  async function create() {
    setBusy(true); setErr('')
    try {
      const r = await api(`/api/v1/tenant/${slug}/services/plans`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_type_id: typeId }),
      })
      if (r.ok) onCreated()
      else { const j = await r.json().catch(() => ({})); setErr((j as any).detail || 'Error') }
    } finally { setBusy(false) }
  }

  return (
    <ModalShell width={460} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title">Nuevo {typeName.toLowerCase()}</div>
        <button className="icon-btn" onClick={onClose}><I.X size={16}/></button>
      </div>
      <div className="modal-body">
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 14px', lineHeight: 1.55 }}>
          Se creará un nuevo plan basado en este tipo de servicio. La fecha se rellena automáticamente con la próxima ocurrencia.
        </p>
        <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)' }}>
          <div className="field-label" style={{ marginBottom: 4 }}>Fecha y hora</div>
          <div className="mono" style={{ fontSize: 13.5, color: next ? 'var(--text)' : 'var(--text-3)' }}>
            {next ? new Date(next).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : 'Calculando…'}
          </div>
        </div>
        {err && <div style={{ marginTop: 14, color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <span style={{ flex: 1 }}/>
        <button className="btn btn-primary" onClick={create} disabled={busy}><I.Check size={14}/> {busy ? 'Creando…' : 'Crear plan'}</button>
      </div>
    </ModalShell>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PLAN-TABS (port plan-tabs.jsx)
// ═════════════════════════════════════════════════════════════════════════════
function PlanEquipos() {
  const p = D.plan
  const allPeople = p.teams.flatMap(t => t.people)
  const counts = {
    confirmed: allPeople.filter(x => x.status === 'confirmed').length,
    pending:   allPeople.filter(x => x.status === 'pending').length,
    declined:  allPeople.filter(x => x.status === 'declined').length,
    total:     allPeople.length,
  }
  return (
    <div className="grid grid-12 rise rise-d2">
      <section className="col-12 card" style={{ padding: '16px 20px' }}>
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="row" style={{ gap: 22 }}>
            {([
              { k: 'confirmed' as const, n: counts.confirmed },
              { k: 'pending'   as const, n: counts.pending },
              { k: 'declined'  as const, n: counts.declined },
            ]).map(({ k, n }) => {
              const m = STATUS_META[k]
              return (
                <div key={k} className="row" style={{ gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: m.bg, color: m.tone, display: 'grid', placeItems: 'center' }}><m.Icon size={15}/></div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{n}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{m.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ display: 'flex', height: 8, width: 200, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-3)' }}>
              <div style={{ width: `${counts.confirmed / counts.total * 100}%`, background: 'var(--success)' }}/>
              <div style={{ width: `${counts.pending   / counts.total * 100}%`, background: 'var(--warning)' }}/>
              <div style={{ width: `${counts.declined  / counts.total * 100}%`, background: 'var(--danger)' }}/>
            </div>
            <button className="btn btn-secondary btn-sm"><I.Send size={13}/> Pedir confirmación</button>
          </div>
        </div>
      </section>
      {p.teams.map((team, ti) => {
        const confirmed = team.people.filter(x => x.status === 'confirmed').length
        return (
          <section key={ti} className="col-4 card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-head">
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: ['#0A84FF','#0A84FF','#34C759','#AF52DE','#FF9500','#FF2D55'][team.color] || '#0A84FF' }}/>
                <div>
                  <div className="card-title">{team.name}</div>
                  <div className="card-sub">{confirmed}/{team.people.length} confirmados</div>
                </div>
              </div>
              <button className="icon-btn" title="Añadir posición"><I.Plus size={15}/></button>
            </div>
            <div style={{ flex: 1 }}>
              {team.people.map((person, pi) => {
                const m = STATUS_META[person.status]
                return (
                  <div key={pi} className="list-row" style={{ borderRadius: 0 }}>
                    <div className="av av-sm" data-c={team.color}>{initialsOf(person.name)}</div>
                    <div className="list-body">
                      <div className="list-title" style={{ fontSize: 13 }}>{person.name}</div>
                      <div className="list-sub" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text-3)' }}>{person.role}</span>
                      </div>
                    </div>
                    <span style={{ height: 22, padding: '0 9px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, background: m.bg, color: m.tone }}>
                      <m.Icon size={10}/> {m.label}
                    </span>
                  </div>
                )
              })}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ margin: 10, justifyContent: 'center' }}><I.Plus size={13}/> Añadir persona</button>
          </section>
        )
      })}
    </div>
  )
}

function PlanCanciones() {
  const set = D.plan.songSet
  const totalMin = set.reduce((s, x) => s + x.dur, 0)
  return (
    <div className="grid grid-12 rise rise-d2">
      <section className="col-8 card">
        <div className="card-head">
          <div>
            <div className="card-title">Set de canciones</div>
            <div className="card-sub">{set.length} canciones · {totalMin} min de música</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-ghost btn-sm"><I.Doc size={13}/> Exportar PDF</button>
            <button className="btn btn-secondary btn-sm"><I.Plus size={13}/> Añadir canción</button>
          </div>
        </div>
        <div>
          {set.map(song => (
            <div key={song.id} className="list-row" style={{ borderRadius: 0, paddingLeft: 12, alignItems: 'flex-start' }}>
              <div className="list-leading" style={{ color: 'var(--text-4)', cursor: 'grab', paddingTop: 4 }}><I.Grip size={14}/></div>
              <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'var(--accent-tint)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontFamily: "'Geist Mono', monospace", fontSize: 13, fontWeight: 700 }}>{song.n}</div>
              <div className="list-body">
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <div className="list-title">{song.title}</div>
                  <span className="chip" style={{ height: 20, fontSize: 11, fontFamily: "'Geist Mono', monospace", color: 'var(--accent)', background: 'var(--accent-tint)' }}>{song.key}</span>
                  <span className="chip" style={{ height: 20, fontSize: 11 }}>{song.bpm} BPM</span>
                </div>
                <div className="list-sub">{song.author} · {song.arrangement} · dirige {song.leadBy}</div>
                <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {song.files.map(f => (
                    <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 9px', borderRadius: 7, fontSize: 11, fontWeight: 500, background: 'var(--surface-2)', border: '1px solid var(--separator)', color: 'var(--text-2)' }}>
                      <I.Doc size={11}/> {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="list-trail" style={{ alignItems: 'flex-start' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{song.dur} min</span>
                <button className="icon-btn"><I.Dots size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="col-4 stack" style={{ gap: 'var(--gap)' }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Flujo de tonalidades</div></div>
          <div style={{ padding: 16 }}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {set.map((song, i) => (
                <React.Fragment key={song.id}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontFamily: "'Geist Mono', monospace", fontWeight: 700, fontSize: 15, background: 'var(--accent-tint)', color: 'var(--accent)' }}>{song.key}</span>
                  {i < set.length - 1 && <I.Chev size={12}/>}
                </React.Fragment>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.5 }}>
              Transición suave D→G→G→B→E. La subida a B en “Inunda este lugar” marca el clímax del bloque.
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Ensayo</div></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-secondary" style={{ justifyContent: 'center' }}><I.Play size={12}/> Reproducir set completo</button>
            <button className="btn btn-ghost" style={{ justifyContent: 'center' }}><I.Send size={13}/> Enviar set al equipo</button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function PlanMedia() {
  const files = D.plan.attachments
  return (
    <div className="rise rise-d2">
      <section className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Archivos del servicio</div>
            <div className="card-sub">{files.length} archivos vinculados a elementos del plan</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-ghost btn-sm"><I.Doc size={13}/> Biblioteca</button>
            <button className="btn btn-secondary btn-sm"><I.Plus size={13}/> Subir archivo</button>
          </div>
        </div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {files.map(f => {
            const m = MEDIA_META[f.kind] || MEDIA_META.doc
            return (
              <div key={f.id} className="lift" style={{ border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface)', cursor: 'pointer' }}>
                <div style={{ height: 96, display: 'grid', placeItems: 'center', background: m.tone + '14', color: m.tone, position: 'relative' }}>
                  <m.Icon size={26}/>
                  <span style={{ position: 'absolute', top: 8, left: 8, fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 700, color: m.tone, background: 'var(--surface)', padding: '2px 7px', borderRadius: 6 }}>{m.label}</span>
                </div>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Para: {f.for}</div>
                  <div className="row-between" style={{ marginTop: 8 }}>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)' }}>{f.size}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-4)' }}>{f.by}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

const NOTE_TONES = ['coral', 'teal', 'violet', 'pink', 'blue']
function PlanNotas() {
  const notes = D.plan.notes
  return (
    <div className="grid grid-12 rise rise-d2">
      <section className="col-8 stack" style={{ gap: 'var(--gap)' }}>
        {notes.map(note => (
          <article key={note.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="row-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--separator)', background: 'var(--surface-2)' }}>
              <div className="row" style={{ gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-tint)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}><I.Edit size={14}/></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{note.cat}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Visible para {note.who}</div>
                </div>
              </div>
              <button className="icon-btn"><I.Dots size={14}/></button>
            </div>
            <div style={{ padding: '14px 18px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)' }}>{note.body}</div>
          </article>
        ))}
        <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}><I.Plus size={14}/> Nueva nota</button>
      </section>
      <aside className="col-4">
        <div className="card">
          <div className="card-head"><div className="card-title">Categorías</div></div>
          <div style={{ padding: 8 }}>
            {notes.map((note, i) => (
              <div key={note.id} className="list-row" style={{ borderRadius: 10, cursor: 'pointer' }}>
                <span className={'pill-tone tone-' + NOTE_TONES[i % NOTE_TONES.length]} style={{ width: 8, height: 8, padding: 0, borderRadius: 99 }}/>
                <div className="list-body">
                  <div className="list-title" style={{ fontSize: 13, fontWeight: 500 }}>{note.cat}</div>
                  <div className="list-sub">{note.who}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>Cada nota se entrega solo al equipo indicado cuando publicas o notificas el servicio.</div>
          </div>
        </div>
      </aside>
    </div>
  )
}

function PlanHistorial() {
  const history = D.plan.history
  return (
    <div className="grid grid-12 rise rise-d2">
      <section className="col-8 card">
        <div className="card-head">
          <div>
            <div className="card-title">Historial de cambios</div>
            <div className="card-sub">Todo lo que ha ocurrido en este plan</div>
          </div>
          <button className="btn btn-ghost btn-sm"><I.Eye size={13}/> Comparar versiones</button>
        </div>
        <div style={{ padding: '8px 20px 20px' }}>
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            <div style={{ position: 'absolute', left: 13, top: 12, bottom: 12, width: 2, background: 'var(--separator)' }}/>
            {history.map((h, i) => (
              <div key={h.id} style={{ position: 'relative', paddingTop: 14, paddingBottom: 14 }}>
                <div style={{ position: 'absolute', left: -28, top: 12, width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--surface)', border: '2px solid var(--separator)', zIndex: 2 }}>
                  <div className="av av-sm" data-c={h.c} style={{ width: 24, height: 24, fontSize: 9, boxShadow: 'none', border: 0 }}>{initialsOf(h.who)}</div>
                </div>
                <div style={{ borderBottom: i < history.length - 1 ? '1px solid var(--separator)' : 0, paddingBottom: 14 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text)' }}>
                    <b style={{ fontWeight: 600 }}>{h.who}</b>{' '}<span style={{ color: 'var(--text-2)' }}>{h.action}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{h.detail}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 4, letterSpacing: 0.04 }}>{h.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <aside className="col-4 stack" style={{ gap: 'var(--gap)' }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Resumen</div></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { l: 'Creado',         v: '26 May · 10:00', by: 'Lucía Hernández' },
              { l: 'Publicado',      v: 'Hoy · 09:12',    by: 'Lucía Hernández' },
              { l: 'Última edición', v: 'Hoy · 09:12',    by: 'Lucía Hernández' },
            ].map(r => (
              <div key={r.l} className="row-between">
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{r.l}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.v}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{r.by}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Versiones guardadas</div></div>
          <div>
            {['v3 · Publicada (actual)', 'v2 · Borrador final', 'v1 · Plantilla inicial'].map((v, i) => (
              <div key={v} className="list-row" style={{ borderRadius: 0, cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? 'var(--accent-tint)' : 'var(--surface-3)', color: i === 0 ? 'var(--accent)' : 'var(--text-3)', display: 'grid', placeItems: 'center' }}><I.Doc size={13}/></div>
                <div className="list-body"><div className="list-title" style={{ fontSize: 13, fontWeight: 500 }}>{v}</div></div>
                {i !== 0 && <button className="btn btn-ghost btn-sm">Restaurar</button>}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

// PlanDetail (Orden + tabs)
function PlanDetail({ onBack }: { onBack: () => void }) {
  const p = D.plan
  const total = p.items.reduce((s, x) => s + x.duration, 0)
  const [tab, setTab] = useState<'orden' | 'equipos' | 'canciones' | 'media' | 'notas' | 'historial'>('orden')
  return (
    <div className="content">
      <div className="page-head rise">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}><I.ChevLeft size={13}/> Servicios</button>
            <span className="pill-tone tone-teal"><span className="chip-dot"/>Publicado</span>
            <span className="chip">{p.confirmados + p.pendientes + p.declinados} personas</span>
          </div>
          <h1 className="page-title">{p.title.split('·')[0]} <em>·</em> <span>{p.title.split('·')[1]}</span></h1>
          <p className="page-sub">{p.date} · Líder: <b style={{ color: 'var(--text)' }}>{p.leader}</b></p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Send size={14}/> Notificar equipo</button>
          <button className="btn btn-secondary"><I.Eye size={14}/> Vista pública</button>
          <button className="btn btn-primary"><I.Play size={12}/> Modo en vivo</button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 'var(--gap)', borderBottom: '1px solid var(--separator)', gap: 0, overflowX: 'auto' }}>
        {([
          { id: 'orden' as const,     l: 'Orden de servicio' },
          { id: 'equipos' as const,   l: 'Equipos · ' + p.teams.reduce((s, t) => s + t.people.length, 0) },
          { id: 'canciones' as const, l: 'Canciones · ' + p.songSet.length },
          { id: 'media' as const,     l: 'Media · ' + p.attachments.length },
          { id: 'notas' as const,     l: 'Notas · ' + p.notes.length },
          { id: 'historial' as const, l: 'Historial' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 14px', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap',
            color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
            borderBottom: '2px solid ' + (tab === t.id ? 'var(--accent)' : 'transparent'),
            marginBottom: -1, letterSpacing: '-0.005em',
          }}>{t.l}</button>
        ))}
      </div>
      {tab === 'equipos'   && <PlanEquipos/>}
      {tab === 'canciones' && <PlanCanciones/>}
      {tab === 'media'     && <PlanMedia/>}
      {tab === 'notas'     && <PlanNotas/>}
      {tab === 'historial' && <PlanHistorial/>}
      {tab === 'orden' && (
        <div className="grid grid-12 rise rise-d2">
          <section className="col-8 card">
            <div className="card-head">
              <div>
                <div className="card-title">Orden de servicio</div>
                <div className="card-sub">{p.items.length} elementos · {Math.floor(total/60)}h {total%60}min totales</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-ghost btn-sm"><I.Doc size={13}/> Plantilla</button>
                <button className="btn btn-secondary btn-sm"><I.Plus size={13}/> Añadir</button>
              </div>
            </div>
            <div>
              {p.items.map((it, idx) => {
                if (it.kind === 'section') {
                  return (
                    <div key={it.id} style={{ padding: '14px 16px 8px', borderTop: idx > 0 ? '1px solid var(--separator)' : 0, background: 'var(--surface-2)' }}>
                      <div className="row-between">
                        <div className="mono" style={{ fontSize: 10, letterSpacing: 0.16, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600 }}>{it.label}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{it.duration} min</div>
                      </div>
                    </div>
                  )
                }
                const isSong = it.kind === 'song'
                return (
                  <div key={it.id} className="list-row" style={{ borderRadius: 0, paddingLeft: 12 }}>
                    <div className="list-leading" style={{ color: 'var(--text-4)', cursor: 'grab' }}><I.Grip size={14}/></div>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: isSong ? 'var(--accent-tint)' : 'var(--surface-3)', color: isSong ? 'var(--accent)' : 'var(--text-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {isSong ? <I.Music size={14}/> : <I.Doc size={14}/>}
                    </div>
                    <div className="list-body">
                      <div className="row" style={{ gap: 8 }}>
                        <div className="list-title">{it.label}</div>
                        {isSong && <span className="chip t-mono mono">{(it as any).songKey}</span>}
                      </div>
                      <div className="list-sub">{(it as any).who}</div>
                    </div>
                    <div className="list-trail">
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{it.duration} min</span>
                      <button className="icon-btn"><I.Dots size={14}/></button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--separator)', background: 'var(--surface-2)' }}>
              <div className="row-between">
                <button className="btn btn-ghost btn-sm"><I.Plus size={13}/> Añadir elemento</button>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>Total · {Math.floor(total/60)}h {total%60}min</div>
              </div>
            </div>
          </section>
          <aside className="col-4 stack" style={{ gap: 'var(--gap)' }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Confirmaciones</div>
                <button className="btn btn-ghost btn-sm">Pedir</button>
              </div>
              <div style={{ padding: 16 }}>
                <div className="row" style={{ gap: 14, marginBottom: 12 }}>
                  <div><div className="display-serif" style={{ fontSize: 32, lineHeight: 1, color: 'var(--success)' }}>{p.confirmados}</div><div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Confirmados</div></div>
                  <div><div className="display-serif" style={{ fontSize: 32, lineHeight: 1, color: 'var(--warning)' }}>{p.pendientes}</div><div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Pendientes</div></div>
                  <div><div className="display-serif" style={{ fontSize: 32, lineHeight: 1, color: 'var(--danger)' }}>{p.declinados}</div><div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>No puede</div></div>
                </div>
                <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-3)' }}>
                  <div style={{ width: `${p.confirmados/13*100}%`, background: 'var(--success)' }}/>
                  <div style={{ width: `${p.pendientes/13*100}%`, background: 'var(--warning)' }}/>
                  <div style={{ width: `${p.declinados/13*100}%`, background: 'var(--danger)' }}/>
                </div>
              </div>
            </div>
            {p.teams.map((team, ti) => (
              <div key={ti} className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">{team.name}</div>
                    <div className="card-sub">{team.people.length} miembros</div>
                  </div>
                  <button className="icon-btn"><I.Plus size={14}/></button>
                </div>
                <div>
                  {team.people.map((person, pi) => (
                    <div key={pi} className="list-row" style={{ borderRadius: 0 }}>
                      <div className="av av-sm" data-c={team.color}>{initialsOf(person.name)}</div>
                      <div className="list-body">
                        <div className="list-title" style={{ fontSize: 13 }}>{person.name}</div>
                        <div className="list-sub">{person.role}</div>
                      </div>
                      {person.status === 'confirmed' && <span className="chip t-success" style={{ height: 18, fontSize: 10 }}><I.Check size={9}/></span>}
                      {person.status === 'pending'   && <span className="chip t-warn"    style={{ height: 18, fontSize: 10 }}><I.Clock size={9}/></span>}
                      {person.status === 'declined'  && <span className="chip t-danger"  style={{ height: 18, fontSize: 10 }}><I.X size={9}/></span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// CANCIONES + CANCION DETAIL (port screens-b.jsx)
// ═════════════════════════════════════════════════════════════════════════════
function Canciones({ onOpenSong }: { onOpenSong: () => void }) {
  const [view, setView] = useState<'list' | 'grid' | 'setlist'>('list')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }))
  return (
    <div className="content">
      <div className="page-head rise">
        <div>
          <span className="eyebrow">Biblioteca</span>
          <h1 className="page-title">Tu repertorio, en <em>orden</em></h1>
          <p className="page-sub">128 canciones disponibles. Filtra por tono, BPM o etiqueta. Reusa, transpone y arrastra a cualquier servicio.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Down size={14}/> Importar CCLI</button>
          <button className="btn btn-primary"><I.Plus size={14}/> Nueva canción</button>
        </div>
      </div>
      <div className="card rise rise-d1" style={{ marginBottom: 'var(--gap)' }}>
        <div style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <I.Search size={14}/>
            <input className="input" placeholder="Buscar canciones, autores, CCLI…" style={{ paddingLeft: 36 }}/>
          </div>
          <div className="seg">
            <button onClick={() => setView('list')}    className={'seg-btn' + (view === 'list' ? ' is-active' : '')}>Lista</button>
            <button onClick={() => setView('grid')}    className={'seg-btn' + (view === 'grid' ? ' is-active' : '')}>Tarjetas</button>
            <button onClick={() => setView('setlist')} className={'seg-btn' + (view === 'setlist' ? ' is-active' : '')}>Setlists</button>
          </div>
          <button className="btn btn-secondary btn-sm"><I.Filter size={13}/> Tono</button>
          <button className="btn btn-secondary btn-sm"><I.Filter size={13}/> BPM</button>
          <button className="btn btn-secondary btn-sm"><I.Tag size={13}/> Etiquetas</button>
          <button className="btn btn-secondary btn-sm"><I.Sort size={13}/> Más usadas</button>
        </div>
      </div>
      {view === 'grid' ? (
        <div className="grid grid-12 rise rise-d2">
          {D.songs.map(s => (
            <article key={s.id} className="col-3 card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={onOpenSong}>
              <div style={{ height: 100, background: 'linear-gradient(135deg, var(--accent-tint), var(--surface-3))', position: 'relative', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'flex-end', padding: 14 }}>
                <div className="display-serif" style={{ fontSize: 56, color: 'var(--accent)', lineHeight: 0.9 }}>{s.key}</div>
                <div className="mono" style={{ marginLeft: 'auto', alignSelf: 'flex-start', fontSize: 11, color: 'var(--text-3)' }}>{s.bpm} bpm</div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{s.author}</div>
                <div className="row" style={{ gap: 6, marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>
                  <I.Play size={11}/>
                  <span className="mono">{s.plays} usos</span>
                  <span style={{ marginLeft: 'auto' }} className="chip t-mono">{s.tags[0]}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card rise rise-d2">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>Canción</th><th>Autor</th><th>Tono</th><th>BPM</th>
                <th>Versiones</th><th>Usos</th><th>Actualizada</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {D.songs.map(s => {
                const arrs = s.arrangements || []
                const isOpen = !!expanded[s.id]
                return (
                  <React.Fragment key={s.id}>
                    <tr style={{ cursor: 'pointer' }} className={isOpen ? 'is-expanded' : ''}>
                      <td onClick={(e) => { e.stopPropagation(); toggle(s.id) }}>
                        <button className="icon-btn" style={{ width: 28, height: 28 }} title={isOpen ? 'Ocultar versiones' : 'Ver versiones'}>
                          <I.Chev size={13} {...({} as any)}/>
                        </button>
                      </td>
                      <td onClick={onOpenSong}>
                        <div style={{ fontWeight: 600 }}>{s.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)' }} className="mono">CCLI {s.ccli}</div>
                      </td>
                      <td style={{ color: 'var(--text-2)' }} onClick={onOpenSong}>{s.author}</td>
                      <td onClick={onOpenSong}><span className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{s.key}</span></td>
                      <td className="num" onClick={onOpenSong}>{s.bpm}</td>
                      <td onClick={(e) => { e.stopPropagation(); toggle(s.id) }}>
                        <span className="chip t-mono" style={{ gap: 5 }}><I.Music size={11}/> {arrs.length} {arrs.length === 1 ? 'versión' : 'versiones'}</span>
                      </td>
                      <td className="num" onClick={onOpenSong}>{s.plays}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }} onClick={onOpenSong}>{s.updated}</td>
                      <td><button className="icon-btn"><I.Dots size={14}/></button></td>
                    </tr>
                    {isOpen && (
                      <tr className="arr-drawer-row">
                        <td colSpan={9} style={{ padding: 0, background: 'var(--surface-2)' }}>
                          <div className="arr-drawer">
                            {arrs.map(a => (
                              <div key={a.id} className="arr-row" onClick={onOpenSong}>
                                <div className="arr-rail"/>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</span>
                                    {a.isOriginal
                                      ? <span className="pill-tone tone-blue"><span className="chip-dot"/>Original</span>
                                      : <span className="pill-tone tone-purple"><span className="chip-dot"/>por {a.by}</span>}
                                  </div>
                                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{a.sequence}</div>
                                </div>
                                <div className="row" style={{ gap: 14, flexShrink: 0 }}>
                                  <span className="arr-stat"><b style={{ color: 'var(--accent)' }}>{a.key}</b> tono</span>
                                  <span className="arr-stat"><b>{a.bpm}</b> bpm</span>
                                  <span className="arr-stat"><b>{a.meter}</b></span>
                                  <span className="arr-stat"><b>{a.length}</b></span>
                                </div>
                                <div className="row" style={{ gap: 5, flexShrink: 0 }}>
                                  {a.files.map(f => (
                                    <span key={f} className="arr-file" title={f}><I.Doc size={12}/></span>
                                  ))}
                                </div>
                                <span className="list-chev" style={{ flexShrink: 0 }}><I.Chev size={14}/></span>
                              </div>
                            ))}
                            <button className="arr-add" onClick={e => e.stopPropagation()}>
                              <I.Plus size={13}/> Crear nueva versión / arreglo
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function gatherPrts(song: any) {
  return (song.arrangements || [])
    .filter((a: any) => a.prt)
    .map((a: any) => ({ ...a.prt, arrId: a.id, arrName: a.name, songKey: a.key }))
}

function PrtViewer({ song, arr }: { song: any; arr: any }) {
  const [mode, setMode] = useState<'chords' | 'lyrics' | 'present'>('chords')
  const lyrics = song.lyrics || []
  const prt = arr.prt
  if (!prt) {
    return (
      <div className="card">
        <div className="card-head"><div className="card-title">Letra del arreglo</div></div>
        <div style={{ padding: 24 }}>
          <div className="dropzone">
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--accent-tint)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <I.Upload size={20}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Este arreglo aún no tiene fichero <span className="mono">.prt</span></div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5, maxWidth: 420, margin: '6px auto 0' }}>
              Genera la letra desde la app de letras de Worsyn y súbela aquí, o arrastra un <span className="mono">.prt</span> existente.
              Cada arreglo puede tener su propia versión.
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }}><I.Plus size={13}/> Subir fichero .prt</button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="card">
      <div className="card-head" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <div className="prt-badge"><span style={{ position: 'absolute', bottom: 4 }}>PRT</span><I.Doc size={15} {...{ style: { opacity: 0.35, position: 'absolute', top: 5 } } as any}/></div>
          <div>
            <div className="card-title">{prt.name}</div>
            <div className="card-sub">Generado desde la app de letras · {prt.by} · {prt.when} · {prt.slides} diapositivas</div>
          </div>
        </div>
        <div className="seg">
          <button onClick={() => setMode('chords')}  className={'seg-btn' + (mode === 'chords' ? ' is-active' : '')}>Letra + Acordes</button>
          <button onClick={() => setMode('lyrics')}  className={'seg-btn' + (mode === 'lyrics' ? ' is-active' : '')}>Solo letra</button>
          <button onClick={() => setMode('present')} className={'seg-btn' + (mode === 'present' ? ' is-active' : '')}>Presentación</button>
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        {mode === 'present' ? (
          <div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', marginBottom: 16, borderRadius: 12,
              background: 'var(--accent-tint)', border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
              fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5,
            }}>
              <I.Sparkles size={15} {...{ style: { color: 'var(--accent)', flexShrink: 0, marginTop: 1 } } as any}/>
              <div>Vista por diapositivas del fichero <b className="mono">{prt.name}</b>. Cada sección es una diapositiva y se sincroniza con la app de proyección — el operador solo avanza en vivo.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {lyrics.map((sec: any, i: number) => (
                <div key={i} className="lyric-slide">
                  <div className="lyric-slide-label">{sec.section}</div>
                  <div className="lyric-slide-num">{i + 1}/{lyrics.length}</div>
                  <div>{sec.lines.map((ln: string, j: number) => <div key={j} className="lyric-slide-line">{ln}</div>)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <pre style={{ fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 14, lineHeight: mode === 'lyrics' ? 1.8 : 2.1, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>
            {mode === 'lyrics' ? lyrics.map((sec: any) => sec.section + '\n' + sec.lines.join('\n')).join('\n\n') : `[Verso 1]\n   ${arr.key}                A\nMaravilloso es tu nombre\n   Bm              G\nCantaremos por siempre\n\n[Coro]\nG        ${arr.key}       A\nSanto, santo, santo\n\n[Puente] (x2)\n   Em              G\nInunda este lugar`}
          </pre>
        )}
      </div>
    </div>
  )
}

function ArrangementView({ song, arr }: { song: any; arr: any }) {
  const fileMeta: Record<string, { tone: string; meta: string }> = {
    'Letra':      { tone: '#0A84FF', meta: 'Documento' },
    'Acordes':    { tone: '#FF9500', meta: 'PDF · acordes' },
    'Multipista': { tone: '#AF52DE', meta: 'ZIP · pistas' },
    'Partitura':  { tone: '#34C759', meta: 'PDF · partitura' },
  }
  return (
    <div className="grid grid-12">
      <section className="col-8 stack" style={{ gap: 'var(--gap)' }}>
        <div className="card" style={{
          padding: '24px 24px',
          background: 'linear-gradient(135deg, var(--accent-tint), transparent 60%), var(--surface)',
          display: 'flex', alignItems: 'center', gap: 22,
        }}>
          <div style={{
            width: 84, height: 84, borderRadius: 18, background: 'var(--surface)',
            border: '1px solid var(--separator)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-2)', flexShrink: 0,
          }}>
            <div className="display-serif" style={{ fontSize: 58, color: 'var(--accent)', lineHeight: 1 }}>{arr.key}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {arr.isOriginal
                ? <span className="pill-tone tone-blue"><span className="chip-dot"/>Arreglo original</span>
                : <span className="pill-tone tone-violet"><span className="chip-dot"/>por {arr.by}</span>}
              <span className="chip mono">{arr.sequence}</span>
            </div>
            <div className="row" style={{ gap: 24, flexWrap: 'wrap' }}>
              {[['Tono', arr.key], ['BPM', arr.bpm], ['Duración', arr.length], ['Compás', arr.meter]].map(([l, v]) => (
                <div key={l}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.1, textTransform: 'uppercase' }}>{l}</div>
                  <div className="display-serif" style={{ fontSize: 28, lineHeight: 1, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: 52, height: 52, padding: 0, borderRadius: '50%', justifyContent: 'center', flexShrink: 0 }}>
            <I.Play size={20}/>
          </button>
        </div>
        <PrtViewer song={song} arr={arr}/>
      </section>
      <aside className="col-4 stack" style={{ gap: 'var(--gap)' }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Archivos del arreglo</div>
            <button className="icon-btn" title="Añadir"><I.Plus size={14}/></button>
          </div>
          <div>
            {arr.prt && (
              <div className="list-row" style={{ borderRadius: 0 }}>
                <div className="prt-badge" style={{ width: 30, height: 30, borderRadius: 8 }}><span style={{ fontSize: 7 }}>PRT</span></div>
                <div className="list-body">
                  <div className="list-title" style={{ fontSize: 13 }}>{arr.prt.name}</div>
                  <div className="list-sub">Letra · {arr.prt.slides} diapositivas</div>
                </div>
                <button className="icon-btn"><I.Down size={14}/></button>
              </div>
            )}
            {arr.files.map((f: string) => {
              const m = fileMeta[f] || { tone: '#0A84FF', meta: 'Archivo' }
              return (
                <div key={f} className="list-row" style={{ borderRadius: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: m.tone + '1F', color: m.tone, display: 'grid', placeItems: 'center' }}>
                    <I.Doc size={14}/>
                  </div>
                  <div className="list-body">
                    <div className="list-title" style={{ fontSize: 13 }}>{f}</div>
                    <div className="list-sub">{m.meta}</div>
                  </div>
                  <button className="icon-btn"><I.Down size={14}/></button>
                </div>
              )
            })}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--separator)' }}>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}><I.Upload size={13}/> Subir archivo a este arreglo</button>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Detalles</div></div>
          <div>
            {[['Secuencia', arr.sequence], ['Autor del arreglo', arr.by], ['Tipo', arr.isOriginal ? 'Original' : 'Adaptación']].map(([l, v]) => (
              <div key={l as string} className="list-row" style={{ borderRadius: 0 }}>
                <div className="list-body"><div style={{ fontSize: 13, color: 'var(--text-3)' }}>{l}</div></div>
                <span style={{ fontSize: 13, fontWeight: 600 }} className={l === 'Secuencia' ? 'mono' : ''}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

function GeneralView({ song, onOpenArr }: { song: any; onOpenArr: (id: string) => void }) {
  const prts = gatherPrts(song)
  const otherFiles = [
    { i: I.Music, t: 'Mp3 original.mp3', meta: '4:38 · 6.4 MB', tone: '#AF52DE' },
    { i: I.Doc,   t: 'Acordes maestro.pdf', meta: '2 páginas · 240 KB', tone: '#FF9500' },
    { i: I.Music, t: 'Multipista.zip', meta: '8 pistas · 84 MB', tone: '#0A84FF' },
  ]
  return (
    <div className="grid grid-12">
      <section className="col-8 stack" style={{ gap: 'var(--gap)' }}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Ficheros de letra <span className="mono" style={{ color: 'var(--accent)' }}>.prt</span></div>
              <div className="card-sub">{prts.length} {prts.length === 1 ? 'fichero' : 'ficheros'} · generados desde la app de letras</div>
            </div>
            <button className="btn btn-secondary btn-sm"><I.Plus size={13}/> Añadir</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="dropzone" style={{ marginBottom: prts.length ? 16 : 0 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--accent-tint)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 10px' }}>
                <I.Upload size={18}/>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Arrastra y suelta o <span style={{ color: 'var(--accent)' }}>haz clic</span> para subir un <span className="mono">.prt</span></div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5, lineHeight: 1.5 }}>
                Puedes subir varias versiones de la misma canción. Cada arreglo puede enlazar su propio fichero.
              </div>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {prts.map((p: any) => (
                <div key={p.arrId} className="prt-row" onClick={() => onOpenArr(p.arrId)}>
                  <div className="prt-badge"><span>PRT</span></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      Arreglo <b style={{ color: 'var(--text-2)' }}>{p.arrName}</b> · {p.slides} diapositivas · {p.when}
                    </div>
                  </div>
                  <span className="chip mono">{p.songKey}</span>
                  <span className="list-chev"><I.Chev size={14}/></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Otros archivos</div>
            <button className="btn btn-secondary btn-sm"><I.Upload size={13}/> Subir</button>
          </div>
          <div>
            {otherFiles.map((f, i) => (
              <div key={i} className="list-row" style={{ borderRadius: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: f.tone + '1F', color: f.tone, display: 'grid', placeItems: 'center' }}>
                  <f.i size={15}/>
                </div>
                <div className="list-body">
                  <div className="list-title" style={{ fontSize: 13 }}>{f.t}</div>
                  <div className="list-sub">{f.meta}</div>
                </div>
                <button className="icon-btn"><I.Down size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="col-4 stack" style={{ gap: 'var(--gap)' }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Etiquetas</div>
            <button className="btn btn-secondary btn-sm"><I.Plus size={12}/> Añadir</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Estilo</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {(song.tags || ['Adoración']).map((t: string) => (
                <span key={t} className="chip" style={{ height: 26, background: 'var(--accent-tint)', color: 'var(--accent)' }}>{t} <I.X size={11}/></span>
              ))}
              <span className="chip" style={{ height: 26 }}>Lento</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Programación</div>
            <span className="chip mono">3 más recientes</span>
          </div>
          <div>
            {[
              { d: '24 May 2026', s: 'Servicio Dominical', who: 'Lucía', arr: 'Versión dominical' },
              { d: '17 May 2026', s: 'Servicio Dominical', who: 'Diego', arr: 'Original' },
              { d: '10 May 2026', s: 'Jóvenes', who: 'Diego', arr: 'Acústico (Jóvenes)' },
            ].map((h, i) => (
              <div key={i} className="list-row" style={{ borderRadius: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-3)', color: 'var(--text-2)', display: 'grid', placeItems: 'center' }}>
                  <I.Cal size={14}/>
                </div>
                <div className="list-body">
                  <div className="list-title" style={{ fontSize: 13 }}>{h.s}</div>
                  <div className="list-sub">{h.d} · {h.who} · {h.arr}</div>
                </div>
                <span className="list-chev"><I.Chev size={14}/></span>
              </div>
            ))}
            <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, borderTop: '1px solid var(--separator)' }}>
              Esta canción se ha programado <b style={{ color: 'var(--text-2)' }}>12 veces</b> en los últimos 6 meses.
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

function CancionDetail({ onBack }: { onBack: () => void }) {
  const song = D.songs[0]
  const arrs = song.arrangements || []
  const [sel, setSel] = useState<string>('general')
  const activeArr = arrs.find((a: any) => a.id === sel)
  return (
    <div className="content route-enter">
      <div className="page-head rise">
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}><I.ChevLeft size={13}/> Canciones</button>
            <span className="chip mono">CCLI {song.ccli}</span>
          </div>
          <h1 className="page-title">{song.title}</h1>
          <p className="page-sub">{song.author} · {arrs.length} arreglos · última edición {song.updated}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Heart size={14}/></button>
          <button className="btn btn-secondary"><I.Edit size={14}/> Editar</button>
          <button className="btn btn-primary"><I.Plus size={14}/> Añadir a servicio</button>
        </div>
      </div>

      <div className="grid grid-12 rise rise-d1">
        <aside className="col-3">
          <div className="card" style={{ padding: 8, position: 'sticky', top: 'calc(56px + var(--gap))' }}>
            <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: 0.12, textTransform: 'uppercase', color: 'var(--text-4)' }}>Canción</div>
            <button className="list-row" style={{ width: '100%', textAlign: 'left', borderRadius: 10, border: 0, background: sel === 'general' ? 'var(--accent-tint)' : 'transparent', cursor: 'pointer' }} onClick={() => setSel('general')}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: sel === 'general' ? 'var(--accent)' : 'var(--surface-3)', color: sel === 'general' ? 'var(--on-accent)' : 'var(--text-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <I.Folder size={15}/>
              </div>
              <div className="list-body">
                <div className="list-title" style={{ fontSize: 13.5, color: sel === 'general' ? 'var(--accent)' : 'var(--text)' }}>Todos los arreglos</div>
                <div className="list-sub">Letras, archivos y etiquetas</div>
              </div>
            </button>

            <div style={{ padding: '14px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: 0.12, textTransform: 'uppercase', color: 'var(--text-4)' }}>Arreglos</div>
            {arrs.map((a: any) => {
              const on = sel === a.id
              return (
                <button key={a.id} className="list-row" style={{ width: '100%', textAlign: 'left', borderRadius: 10, border: 0, background: on ? 'var(--accent-tint)' : 'transparent', cursor: 'pointer' }} onClick={() => setSel(a.id)}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: on ? 'var(--accent)' : 'var(--surface-3)', color: on ? 'var(--on-accent)' : 'var(--text-2)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{a.key}</div>
                  <div className="list-body">
                    <div className="row" style={{ gap: 6 }}>
                      <div className="list-title" style={{ fontSize: 13, color: on ? 'var(--accent)' : 'var(--text)' }}>{a.name}</div>
                      {a.isOriginal && <span className="pill-tone tone-blue" style={{ height: 16, fontSize: 9 }}>Orig.</span>}
                    </div>
                    <div className="list-sub">{a.bpm} bpm · {a.prt ? '.prt ✓' : 'sin .prt'}</div>
                  </div>
                </button>
              )
            })}
            <button className="arr-add" style={{ margin: '6px 0 2px', width: '100%', justifyContent: 'center' }}>
              <I.Plus size={13}/> Añadir arreglo
            </button>
          </div>
        </aside>

        <div className="col-9">
          {sel === 'general'
            ? <GeneralView song={song} onOpenArr={(id: string) => setSel(id)}/>
            : activeArr && <ArrangementView song={song} arr={activeArr}/>}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MEDIA (port screens-b.jsx::Media)
// ═════════════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════════
// MENSAJES (port mensajes.jsx) — multi-chat workspace
// ═════════════════════════════════════════════════════════════════════════════
const CONV_KINDS: { id: 'team' | 'service' | 'group' | 'direct'; label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { id: 'team',    label: 'Equipos',     icon: I.People },
  { id: 'service', label: 'Servicios',   icon: I.Cal },
  { id: 'group',   label: 'Grupos',      icon: I.Grid },
  { id: 'direct',  label: 'Directos',    icon: I.User },
]
function initialsMsg(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function ConvAvatar({ conv, size = 42 }: { conv: any; size?: number }) {
  const isGroup = conv.kind !== 'direct'
  const k = CONV_KINDS.find(x => x.id === conv.kind)
  const Icon = k?.icon || I.User
  if (isGroup) {
    return (
      <div className="av" data-c={conv.c} style={{ width: size, height: size, borderRadius: 13, flexShrink: 0 }}>
        <Icon size={Math.round(size * 0.42)}/>
      </div>
    )
  }
  return <div className="av" data-c={conv.c} style={{ width: size, height: size, fontSize: Math.round(size * 0.34), flexShrink: 0 }}>{initialsMsg(conv.name)}</div>
}

function Mensajes() {
  const convs = D.conversations
  const [activeId, setActiveId] = useState(convs[0].id)
  const [filter, setFilter] = useState<'all' | 'team' | 'service' | 'group' | 'direct'>('all')
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Array<{ who: 'me'; t: string; when: string }>>>({})
  const [input, setInput] = useState('')
  const threadRef = useRef<HTMLDivElement | null>(null)
  const active = convs.find(c => c.id === activeId)!
  const liveMsgs = [...(active.msgs || []), ...((drafts[activeId]) || [])]

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [activeId, drafts])

  const send = () => {
    const text = input.trim()
    if (!text) return
    setDrafts(d => ({ ...d, [activeId]: [...(d[activeId] || []), { who: 'me', t: text, when: 'Ahora' }] }))
    setInput('')
  }
  const visible = convs.filter(c => {
    if (filter !== 'all' && c.kind !== filter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const grouped = CONV_KINDS.map(k => ({ ...k, items: visible.filter(c => c.kind === k.id) })).filter(g => g.items.length)
  const totalUnread = convs.reduce((s, c) => s + c.unread, 0)

  return (
    <div className="content" style={{ padding: 0, maxWidth: 'none' }}>
      <div className="row-between" style={{ padding: '20px 28px 16px', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="eyebrow">Mensajes</span>
          <h1 className="page-title" style={{ fontSize: 26 }}>Conversaciones
            {totalUnread > 0 && <span className="pill-tone tone-coral" style={{ marginLeft: 10, verticalAlign: 'middle' }}>{totalUnread} sin leer</span>}
          </h1>
        </div>
        <button className="btn btn-primary"><I.Edit size={14}/> Nuevo mensaje</button>
      </div>

      <div className="chat-wrap">
        <div className="chat-list">
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--separator)' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <I.Search size={14} {...{ style: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' } } as any}/>
              <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversación…" style={{ width: '100%', paddingLeft: 34, height: 34, fontSize: 13 }}/>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button className={'chip ' + (filter === 'all' ? 't-accent' : 't-mono')} style={{ cursor: 'pointer', height: 26 }} onClick={() => setFilter('all')}>Todos</button>
              {CONV_KINDS.map(k => (
                <button key={k.id} className={'chip ' + (filter === k.id ? 't-accent' : 't-mono')} style={{ cursor: 'pointer', height: 26 }} onClick={() => setFilter(k.id)}>
                  <k.icon size={11}/> {k.label}
                </button>
              ))}
            </div>
          </div>
          <div className="chat-list-scroll">
            {grouped.map(g => (
              <div key={g.id}>
                <div className="chat-cat-label">{g.label}</div>
                {g.items.map(c => (
                  <button key={c.id} className={'chat-conv' + (c.id === activeId ? ' is-active' : '')} onClick={() => setActiveId(c.id)}>
                    <ConvAvatar conv={c}/>
                    <div className="chat-conv-body">
                      <div className="row-between" style={{ gap: 8 }}>
                        <span className="chat-conv-name">{c.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>{c.when}</span>
                      </div>
                      <div className="row-between" style={{ gap: 8 }}>
                        <span className="chat-conv-prev">{c.preview}</span>
                        {c.unread > 0 && (
                          <span style={{
                            minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, flexShrink: 0,
                            background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 10.5, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Geist Mono', monospace",
                          }}>{c.unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {grouped.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>Sin conversaciones.</div>
            )}
          </div>
        </div>

        <div className="chat-main">
          <div className="row-between" style={{ padding: '12px 20px', borderBottom: '1px solid var(--separator)', background: 'var(--surface)' }}>
            <div className="row" style={{ gap: 12 }}>
              <ConvAvatar conv={active} size={38}/>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{active.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{active.kind === 'direct' ? 'Mensaje directo' : `${active.members} miembros`}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 4 }}>
              <button className="icon-btn" title="Buscar"><I.Search size={15}/></button>
              {active.kind !== 'direct' && <button className="icon-btn" title="Miembros"><I.People size={15}/></button>}
              <button className="icon-btn" title="Más"><I.Dots size={15}/></button>
            </div>
          </div>

          <div className="chat-thread" ref={threadRef}>
            <div style={{ alignSelf: 'center', fontSize: 11, color: 'var(--text-4)', background: 'var(--surface-2)', padding: '4px 12px', borderRadius: 999, marginBottom: 4 }}>
              {active.kind === 'service' ? 'Chat del servicio · 31 May' : active.kind === 'direct' ? 'Conversación privada' : 'Grupo de equipo'}
            </div>
            {liveMsgs.map((m, i) => {
              const mine = m.who === 'me'
              const prev = liveMsgs[i - 1]
              const showName = !mine && active.kind !== 'direct' && (!prev || prev.who !== m.who)
              return (
                <div key={i}>
                  {showName && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', margin: '10px 0 -4px 52px' }}>{m.who}</div>}
                  <div className={'bubble-row' + (mine ? ' mine' : '')}>
                    {!mine
                      ? <div className="av av-sm" data-c={(m as any).c || active.c} style={{ alignSelf: 'flex-end' }}>{initialsMsg(m.who)}</div>
                      : <div style={{ width: 22 }}/>}
                    <div>
                      <div className="bubble">{m.t}</div>
                      <div className="bubble-meta" style={{ textAlign: mine ? 'right' : 'left' }}>{m.when}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="chat-composer">
            <button className="icon-btn" title="Adjuntar"><I.Plus size={18}/></button>
            <textarea className="chat-input" rows={1} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={`Escribe a ${active.name}…`}/>
            <button className="btn btn-primary" style={{ height: 42, width: 42, padding: 0, justifyContent: 'center', borderRadius: 13 }} onClick={send}>
              <I.Send size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Media() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const folders = [
    { name: 'Bumpers',    count: 12, c: 1 },
    { name: 'Anuncios',   count: 28, c: 4 },
    { name: 'Fondos',     count: 64, c: 3 },
    { name: 'Sermones',   count: 41, c: 2 },
    { name: 'Letras',     count: 156, c: 6 },
    { name: 'Logos marca', count: 8, c: 7 },
  ]
  return (
    <div className="content">
      <div className="page-head rise">
        <div>
          <span className="eyebrow">Media</span>
          <h1 className="page-title">Tu <em>biblioteca</em> visual</h1>
          <p className="page-sub">Fotos, vídeos, audio y documentos compartidos por toda la iglesia. Arrastra y suelta para subir.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Folder size={14}/> Nueva carpeta</button>
          <button className="btn btn-primary"><I.Upload size={14}/> Subir archivos</button>
        </div>
      </div>
      <div className="row rise rise-d1" style={{ gap: 8, marginBottom: 'var(--gap)' }}>
        <div className="seg">
          <button className="seg-btn is-active">Todo</button>
          <button className="seg-btn">Imágenes</button>
          <button className="seg-btn">Vídeo</button>
          <button className="seg-btn">Audio</button>
          <button className="seg-btn">Documentos</button>
        </div>
        <div style={{ flex: 1 }}/>
        <button className="btn btn-secondary btn-sm"><I.Sort size={13}/> Más recientes</button>
        <div className="seg">
          <button onClick={() => setView('grid')} className={'seg-btn' + (view === 'grid' ? ' is-active' : '')}><I.Photo size={13}/></button>
          <button onClick={() => setView('list')} className={'seg-btn' + (view === 'list' ? ' is-active' : '')}><I.Menu size={13}/></button>
        </div>
      </div>
      <div className="grid grid-12 rise rise-d2" style={{ marginBottom: 'var(--gap)' }}>
        {folders.map(f => (
          <article key={f.name} className="col-4 card" style={{ overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="av av-lg" data-c={f.c} style={{ borderRadius: 10 }}><I.Folder size={16}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }} className="mono">{f.count} archivos</div>
              </div>
              <span className="list-chev"><I.Chev/></span>
            </div>
          </article>
        ))}
      </div>
      {view === 'grid' ? (
        <div className="grid grid-12 rise rise-d3">
          {D.media.map(m => {
            const [c1, c2] = MEDIA_COLORS[m.kind]
            const Ic = I[MEDIA_ICON_KEY[m.kind]] as (p: { size?: number }) => JSX.Element
            return (
              <article key={m.id} className="col-3 card" style={{ overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ aspectRatio: '4 / 3', background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'grid', placeItems: 'center', position: 'relative' }}>
                  <Ic size={28}/>
                  <span className="chip" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.18)', color: '#fff', border: 0, backdropFilter: 'blur(10px)' }}>{m.tag}</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <div className="row-between" style={{ marginTop: 4 }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.size}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.when}</div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="card rise rise-d3">
          {D.media.map(m => {
            const [c1, c2] = MEDIA_COLORS[m.kind]
            const Ic = I[MEDIA_ICON_KEY[m.kind]] as (p: { size?: number }) => JSX.Element
            return (
              <div key={m.id} className="list-row" style={{ borderRadius: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 9, background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'grid', placeItems: 'center', color: '#fff' }}><Ic size={16}/></div>
                <div className="list-body">
                  <div className="list-title">{m.name}</div>
                  <div className="list-sub">{m.tag} · {m.size} · {m.when}</div>
                </div>
                <div className="list-trail">
                  <button className="icon-btn"><I.Down size={14}/></button>
                  <button className="icon-btn"><I.Dots size={14}/></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PERSONAS (port screens-c.jsx) — wired to /services/people
// ═════════════════════════════════════════════════════════════════════════════
interface ApiPerson { id: string; member_id: string; full_name: string | null; email: string; service_role: string; is_active?: boolean; welcomed_at: string | null }
interface UiPersona { id: string; name: string; email: string; role: 'admin'|'leader'|'member'; active: boolean; joined: string; team: string; phone: string; c: number; lastSeen: string }
const ROLE_LABEL: Record<UiPersona['role'], string> = { admin: 'Admin', leader: 'Líder', member: 'Miembro' }
function PersonaInitials(name: string) { return name.split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase() }

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      height: 32, padding: '0 8px', borderRadius: 8,
      background: 'var(--surface-3)', color: 'var(--text-2)',
      border: '1px solid var(--separator)', fontSize: 12.5,
      cursor: 'pointer', appearance: 'none', paddingRight: 24,
      backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27><polyline points=%276 9 12 15 18 9%27/></svg>")',
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
    }}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}

function Personas({ slug, allTeams, onOpenPerson, onOpenTeam }: {
  slug: string
  allTeams: any[]
  onOpenPerson: (raw: any) => void
  onOpenTeam: (team: any) => void
}) {
  const [data, setData] = useState<UiPersona[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  useEffect(() => {
    api(`/api/v1/tenant/${slug}/services/people`).then(r => r.ok ? r.json() : []).then((ppl: ApiPerson[]) => {
      const mapped: UiPersona[] = (ppl || []).map((p, i) => {
        const role = p.service_role === 'administrator' ? 'admin' : (p.service_role === 'editor' || p.service_role === 'coordinator') ? 'leader' : 'member'
        return {
          id: p.id, name: p.full_name || p.email, email: p.email,
          role, active: p.is_active !== false,
          joined: '—', team: ROLE_LABEL[role], phone: '—',
          c: (i % 7) + 1, lastSeen: p.welcomed_at ? 'Activo' : 'Pendiente',
        }
      })
      setData(mapped)
      setRawData(ppl as any[])
    })
  }, [slug])
  const openRaw = (uiId: string) => {
    const raw = rawData.find(r => r.id === uiId)
    if (raw) onOpenPerson(raw)
  }
  const [tab, setTab] = useState<'miembros' | 'equipos'>('miembros')
  const [search, setSearch] = useState('')
  const [fRole, setFRole] = useState('')
  const [fActive, setFActive] = useState('')
  const [fTeam, setFTeam] = useState('')
  const [view, setView] = useState<'list' | 'grid'>('list')

  const teamFilterOpts = useMemo(() => Array.from(new Set(data.map(p => p.team))), [data])
  const filtered = data.filter(p => {
    if (fRole && p.role !== fRole) return false
    if (fTeam && p.team !== fTeam) return false
    if (fActive === 'active' && !p.active) return false
    if (fActive === 'inactive' && p.active) return false
    if (search) {
      const s = search.toLowerCase()
      if (!p.name.toLowerCase().includes(s) && !p.email.toLowerCase().includes(s)) return false
    }
    return true
  })

  const totalTeams = allTeams.length

  return (
    <div className="content route-enter">
      <div className="page-head rise">
        <div>
          <span className="eyebrow">Directorio</span>
          <h1 className="page-title">Las <em>personas</em> que hacen iglesia.</h1>
          <p className="page-sub">
            <b style={{ color: 'var(--text)' }}>{data.length} miembros</b> en {totalTeams} equipos.
            Gestiona roles, accesos y disponibilidad desde un único lugar.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Send size={14}/> Invitar</button>
          <button className="btn btn-primary"><I.Plus size={14}/> {tab === 'equipos' ? 'Nuevo equipo' : 'Añadir persona'}</button>
        </div>
      </div>

      <div className="rise rise-d1" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--separator)', marginBottom: 'var(--gap)' }}>
        {([
          { id: 'miembros' as const, l: 'Miembros', n: data.length,   i: I.People },
          { id: 'equipos'  as const, l: 'Equipos',  n: totalTeams,    i: I.Grid },
        ]).map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 18px', fontSize: 14, fontWeight: 600,
            letterSpacing: '-0.01em',
            color: tab === tb.id ? 'var(--text)' : 'var(--text-3)',
            borderBottom: '2px solid ' + (tab === tb.id ? 'var(--accent)' : 'transparent'),
            marginBottom: -1,
          }}>
            <tb.i size={15}/> {tb.l}
            <span style={{
              minWidth: 22, height: 20, padding: '0 7px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: tab === tb.id ? 'var(--accent-tint)' : 'var(--surface-3)',
              color: tab === tb.id ? 'var(--accent)' : 'var(--text-3)',
              fontFamily: "'Geist Mono', monospace",
            }}>{tb.n}</span>
          </button>
        ))}
      </div>

      {tab === 'miembros' && (
      <section className="card rise rise-d2">
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title">Todos los miembros</div>
            <div className="card-sub">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}{filtered.length !== data.length ? ` de ${data.length}` : ''}</div>
          </div>
          <div className="row" style={{ gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <I.Search size={13}/>
              <input className="input" placeholder="Buscar por nombre o email…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 30, width: 240, height: 32, fontSize: 13 }}/>
            </div>
            <FilterSelect value={fTeam}   onChange={setFTeam}   options={[{v:'',l:'Todos los equipos'}, ...teamFilterOpts.map(t => ({v:t,l:t}))]}/>
            <FilterSelect value={fRole}   onChange={setFRole}   options={[{v:'',l:'Todos los roles'},{v:'admin',l:'Admin'},{v:'leader',l:'Líder'},{v:'member',l:'Miembro'}]}/>
            <FilterSelect value={fActive} onChange={setFActive} options={[{v:'',l:'Cualquier estado'},{v:'active',l:'Activos'},{v:'inactive',l:'Inactivos'}]}/>
            <div className="seg">
              <button className={'seg-btn' + (view==='list'?' is-active':'')} onClick={() => setView('list')} title="Lista"><I.List size={12}/></button>
              <button className={'seg-btn' + (view==='grid'?' is-active':'')} onClick={() => setView('grid')} title="Tarjetas"><I.Grid size={12}/></button>
            </div>
            {(search || fRole || fTeam || fActive) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFRole(''); setFTeam(''); setFActive('') }}>Limpiar</button>
            )}
          </div>
        </div>
        {view === 'list' ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 50 }}></th>
                  <th>Nombre / Email</th>
                  <th>Equipo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Última actividad</th>
                  <th>Alta</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                    <I.Search size={20}/>
                    Ningún miembro coincide con los filtros.
                  </td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openRaw(p.id)}>
                    <td><div className="av" data-c={p.c}>{PersonaInitials(p.name)}</div></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{p.email}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.team}</td>
                    <td><span className={'chip ' + (p.role === 'admin' ? 't-accent' : p.role === 'leader' ? 't-info' : 't-mono')}>{ROLE_LABEL[p.role]}</span></td>
                    <td>
                      <span className={'chip ' + (p.active ? 't-success' : '')}>
                        <span className="chip-dot" style={{ background: p.active ? 'currentColor' : 'var(--text-4)' }}/>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{p.lastSeen}</td>
                    <td className="num">{p.joined}</td>
                    <td onClick={e => e.stopPropagation()}><button className="icon-btn"><I.Dots size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => openRaw(p.id)} className="lift" style={{ background: 'var(--surface-2)', border: '1px solid var(--separator)', borderRadius: 14, padding: 16, textAlign: 'left' as const, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="row-between">
                  <div className="av av-lg" data-c={p.c}>{PersonaInitials(p.name)}</div>
                  <span className={'chip ' + (p.active ? 't-success' : '')} style={{ height: 20, fontSize: 10 }}>{p.active ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{p.email}</div>
                </div>
                <div className="row" style={{ gap: 6, marginTop: 'auto', paddingTop: 4 }}>
                  <span className={'chip ' + (p.role === 'admin' ? 't-accent' : p.role === 'leader' ? 't-info' : 't-mono')} style={{ height: 20, fontSize: 10.5 }}>{ROLE_LABEL[p.role]}</span>
                  <span className="chip" style={{ height: 20, fontSize: 10.5 }}>{p.team}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
      )}

      {tab === 'equipos' && (
      <div className="grid grid-12 rise rise-d2">
        <section className="col-12">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <div>
              <span className="eyebrow">Equipos</span>
              <div className="display-sans" style={{ fontSize: 22, letterSpacing: '-0.025em', marginTop: 2 }}>Distribución por equipo</div>
            </div>
            <button className="btn btn-secondary btn-sm"><I.Plus size={12}/> Nuevo equipo</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--gap)' }}>
            {allTeams.map((team: any, ti: number) => {
              const colors = ['#0A84FF','#AF52DE','#FF9500','#FF2D55','#5AC8FA','#34C759','#FFD60A']
              const color = team.color || colors[ti % colors.length]
              const memberCount = team.member_count ?? 0
              return (
                <div key={team.id} className="card lift" style={{ padding: 18, cursor: 'pointer' }} onClick={() => onOpenTeam(team)}>
                  <div className="row-between" style={{ marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '1F', color, display: 'grid', placeItems: 'center' }}><I.People size={18}/></div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.08, textTransform: 'uppercase' }}>{memberCount} miembros</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>{team.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                    {team.leaders && team.leaders.length > 0
                      ? <>Líder · {team.leaders[0].full_name || team.leaders[0].email}</>
                      : 'Sin líder asignado'}
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--separator)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {team.is_rehearsal && <span className="chip" style={{ height: 20, fontSize: 10 }}>Ensayo</span>}
                    {team.is_secure && <span className="chip" style={{ height: 20, fontSize: 10 }}>Seguro</span>}
                    {team.is_split && <span className="chip" style={{ height: 20, fontSize: 10 }}>Dividido</span>}
                    <span style={{ flex: 1 }}/>
                    <span className="list-chev"><I.Chev size={14}/></span>
                  </div>
                </div>
              )
            })}
            {allTeams.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center' as const, color: 'var(--text-3)', fontSize: 13 }}>
                No hay equipos creados aún.
              </div>
            )}
          </div>
        </section>
      </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// V2 PersonaDetail — Programación · Comunicación · Detalles
// ─────────────────────────────────────────────────────────────
function SectionHead({ title, info, right }: { title: string; info?: boolean; right?: React.ReactNode }) {
  return (
    <div className="row-between" style={{ marginBottom: 12 }}>
      <div className="row" style={{ gap: 6 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h2>
        {info && (
          <span style={{
            width: 14, height: 14, borderRadius: 99, border: '1.5px solid var(--text-4)',
            color: 'var(--text-4)', fontSize: 9, display: 'grid', placeItems: 'center', fontWeight: 700,
          }}>i</span>
        )}
      </div>
      {right}
    </div>
  )
}

interface PersonaP {
  name: string; email: string; role: 'admin' | 'leader' | 'member';
  active: boolean; c: number; lastSeen: string; joined: string;
}
function adaptPerson(raw: any): PersonaP {
  const sr = raw?.service_role || ''
  const role: PersonaP['role'] = sr === 'administrator' ? 'admin' : (sr === 'editor' || sr === 'coordinator') ? 'leader' : 'member'
  const fullName = raw?.full_name || (raw?.email ? String(raw.email).split('@')[0] : 'Sin nombre')
  const id = String(raw?.id || raw?.member_id || '')
  const hash = id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
  return {
    name: fullName,
    email: raw?.email || '',
    role,
    active: raw?.is_active !== false,
    c: (hash % 8) + 1,
    lastSeen: raw?.last_seen_at ? new Date(raw.last_seen_at).toLocaleDateString('es-ES') : '—',
    joined: raw?.welcomed_at ? new Date(raw.welcomed_at).toLocaleDateString('es-ES') : '—',
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// V2 portal modals — Modal · EmailModalV2 · TemplatesModalV2 · NewServiceModal
// All portal to document.body; styled via .tenant-v2 .modal-*
// ═════════════════════════════════════════════════════════════════════════════

const EMAIL_VARIABLES: { token: string; label: string }[] = [
  { token: '{{ to.first_name }}',     label: 'Nombre de pila' },
  { token: '{{ to.last_name }}',      label: 'Apellido' },
  { token: '{{ to.email }}',          label: 'Email' },
  { token: '{{ organization.name }}', label: 'Nombre de la iglesia' },
  { token: '{{ service.name }}',      label: 'Tipo de servicio' },
  { token: '{{ plan.date }}',         label: 'Fecha del plan' },
  { token: '{{ sender.name }}',       label: 'Quien envía' },
]
type TplKind = 'general' | 'schedule' | 'signup' | 'welcome' | 'team_welcome'
const TPL_CATS: { id: TplKind; l: string }[] = [
  { id: 'general',      l: 'General' },
  { id: 'schedule',     l: 'Programación' },
  { id: 'signup',       l: 'Hojas de inscripción' },
  { id: 'welcome',      l: 'Bienvenida' },
  { id: 'team_welcome', l: 'Bienvenida a equipo' },
]
const TPL_DESC: Record<string, string> = {
  general:      'Plantillas de uso general — se envían manualmente desde cualquier ficha.',
  schedule:     'Se envían al solicitar disponibilidad o publicar un plan de servicio.',
  signup:       'Se envían cuando se abre una hoja de inscripción del equipo.',
  welcome:      'Bienvenida al portal — se envía al añadir una persona nueva.',
  team_welcome: 'Bienvenida a un equipo concreto — se envía al añadir a una posición.',
}

function ModalShell({ width = 560, onClose, children }: { width?: number; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const node = (
    <div className="tenant-v2">
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>
  )
  return createPortal(node, document.body)
}

function VariableMenuV2({ onInsert }: { onInsert: (token: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(o => !o)}>
        <span className="mono" style={{ fontSize: 13 }}>{'{}'}</span> Variable
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 11,
            width: 240, background: 'var(--surface)', border: '1px solid var(--separator)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-3)', overflow: 'hidden', padding: 6,
          }}>
            {EMAIL_VARIABLES.map(v => (
              <button key={v.token} className="list-row" style={{ width: '100%', textAlign: 'left', borderRadius: 8, border: 0, padding: '8px 10px', background: 'transparent', cursor: 'pointer' }}
                onClick={() => { onInsert(v.token); setOpen(false) }}>
                <div className="list-body">
                  <div className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{v.token}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{v.label}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface ApiTpl { id: string; kind: string; name: string; subject: string; body: string; is_default: boolean }

function EmailModalV2({ slug, recipient, contextTeamId, autoApplyKind, onClose, onSent }: {
  slug: string;
  recipient: ServicePerson;
  contextTeamId?: string;
  autoApplyKind?: TplKind | 'password_reset';
  onClose: () => void;
  onSent: () => void;
}) {
  const [tpls, setTpls] = useState<ApiTpl[]>([])
  const [tplId, setTplId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [showTpl, setShowTpl] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  const reloadTpls = useCallback(async () => {
    const r = await api(`/api/v1/tenant/${slug}/email/templates`)
    setTpls(r.ok ? await r.json() : [])
  }, [slug])
  useEffect(() => { reloadTpls() }, [reloadTpls])

  // Auto-apply default template of kind on first load
  useEffect(() => {
    if (!autoApplyKind || tpls.length === 0 || tplId) return
    const cand = tpls.find(t => t.kind === autoApplyKind && t.is_default) || tpls.find(t => t.kind === autoApplyKind)
    if (cand) applyTpl(cand.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApplyKind, tpls])

  function applyTpl(id: string) {
    setTplId(id)
    if (!id) { setSubject(''); setBody(''); return }
    const t = tpls.find(x => x.id === id)
    if (t) { setSubject(t.subject); setBody(t.body) }
  }

  async function doPreview() {
    setErr('')
    const r = await api(`/api/v1/tenant/${slug}/email/messages/preview`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_member_id: recipient.member_id,
        template_id: tplId || undefined,
        subject, body,
        ...(contextTeamId ? { team_id: contextTeamId } : {}),
      }),
    })
    if (r.ok) setPreview(await r.json())
    else { const j = await r.json().catch(() => ({})); setErr((j as any).detail || 'Error en vista previa') }
  }

  async function send() {
    setErr(''); setBusy(true)
    try {
      const r = await api(`/api/v1/tenant/${slug}/email/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_member_ids: [recipient.member_id],
          template_id: tplId || undefined,
          subject, body,
          ...(contextTeamId ? { team_id: contextTeamId } : {}),
        }),
      })
      if (r.ok) { setSent(true); setTimeout(() => { onSent(); onClose() }, 1100) }
      else { const j = await r.json().catch(() => ({})); setErr((j as any).detail || 'Error al enviar') }
    } finally { setBusy(false) }
  }

  if (showTpl) {
    return <TemplatesModalV2 slug={slug} onBack={() => setShowTpl(false)} onClose={onClose}
      onPick={(id) => { applyTpl(id); setShowTpl(false) }}
      onChanged={reloadTpls}/>
  }
  if (preview) {
    return (
      <ModalShell width={680} onClose={() => setPreview(null)}>
        <div className="modal-head">
          <div className="modal-title">Vista previa</div>
          <button className="icon-btn" onClick={() => setPreview(null)}><I.X size={16}/></button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 12 }}><b style={{ fontSize: 13 }}>Asunto:</b> <span style={{ fontSize: 13 }}>{preview.subject}</span></div>
          <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: preview.body }}/>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setPreview(null)}>Volver</button>
          <span style={{ flex: 1 }}/>
          <button className="btn btn-primary" disabled={busy} onClick={send}><I.Send size={14}/> Enviar 1</button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell width={760} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title">Enviar correo</div>
        <button className="icon-btn" onClick={onClose}><I.X size={16}/></button>
      </div>
      <div className="modal-body">
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <select value={tplId} onChange={e => applyTpl(e.target.value)} style={{
              width: '100%', height: 40, padding: '0 36px 0 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--hairline)',
              fontSize: 13.5, cursor: 'pointer', appearance: 'none', fontFamily: 'inherit',
              backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
            }}>
              <option value="">— Sin plantilla (empezar en blanco) —</option>
              {TPL_CATS.map(c => {
                const list = tpls.filter(t => t.kind === c.id)
                if (list.length === 0) return null
                return (
                  <optgroup key={c.id} label={c.l}>
                    {list.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                )
              })}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowTpl(true)}>Editar plantillas ›</button>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 16, background: 'var(--surface-2)', border: '1px solid var(--separator)' }}>
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>Para: {recipient.full_name || recipient.email}</span>{' '}
          <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>&lt;{recipient.email}&gt;</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="row-between" style={{ marginBottom: 7 }}>
            <span className="field-label" style={{ margin: 0 }}>Asunto</span>
            <VariableMenuV2 onInsert={t => setSubject(s => (s ? s + ' ' : '') + t)}/>
          </div>
          <input className="input" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="p. ej. ¡Bienvenido(a) a {{ organization.name }}!" style={{ width: '100%', height: 40 }}/>
        </div>

        <div>
          <div className="row-between" style={{ marginBottom: 7 }}>
            <span className="field-label" style={{ margin: 0 }}>Cuerpo</span>
          </div>
          <div className="rt-toolbar">
            <button className="rt-btn" tabIndex={-1}><b>B</b></button>
            <button className="rt-btn" tabIndex={-1}><i>I</i></button>
            <button className="rt-btn" tabIndex={-1}><u>U</u></button>
            <span className="rt-sep"/>
            <button className="rt-btn" tabIndex={-1}>•≡</button>
            <button className="rt-btn" tabIndex={-1}>1.</button>
            <span className="rt-sep"/>
            <button className="rt-btn" tabIndex={-1}>⇤</button>
            <button className="rt-btn" tabIndex={-1}>⇥</button>
            <span className="rt-sep"/>
            <button className="rt-btn" tabIndex={-1}>🔗</button>
            <button className="rt-btn" tabIndex={-1}>Tx</button>
            <span style={{ flex: 1 }}/>
            <VariableMenuV2 onInsert={t => setBody(b => (b ? b + ' ' : '') + t)}/>
          </div>
          <textarea className="rt-area" value={body} onChange={e => setBody(e.target.value)} placeholder="Hola {{ to.first_name }}, …"/>
        </div>

        {err && (
          <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in oklab, var(--danger) 12%, transparent)', color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
            {err}
          </div>
        )}
        {sent && (
          <div className="row" style={{ gap: 8, marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--accent-2-tint)', color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>
            <I.Check size={14}/> Correo enviado a {recipient.full_name || recipient.email}.
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <span style={{ flex: 1 }}/>
        <button className="btn btn-secondary" onClick={doPreview} disabled={busy}><I.Eye size={14}/> Vista previa</button>
        <button className="btn btn-primary" onClick={send} disabled={busy || !subject.trim() || !body.trim()}><I.Send size={14}/> Enviar 1</button>
      </div>
    </ModalShell>
  )
}

function TemplatesModalV2({ slug, onBack, onClose, onPick, onChanged }: {
  slug: string;
  onBack: () => void;
  onClose: () => void;
  onPick?: (id: string) => void;
  onChanged: () => void;
}) {
  const [cat, setCat] = useState<TplKind>('welcome')
  const [tpls, setTpls] = useState<ApiTpl[]>([])
  const [editing, setEditing] = useState<ApiTpl | null>(null)

  const reload = useCallback(async () => {
    const r = await api(`/api/v1/tenant/${slug}/email/templates`)
    setTpls(r.ok ? await r.json() : [])
  }, [slug])
  useEffect(() => { reload() }, [reload])

  const list = tpls.filter(t => t.kind === cat)

  async function del(t: ApiTpl) {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return
    const r = await api(`/api/v1/tenant/${slug}/email/templates/${t.id}`, { method: 'DELETE' })
    if (r.ok) { reload(); onChanged() }
  }

  if (editing) {
    return <TemplateEditorV2 slug={slug} initial={editing.id === '__new__' ? null : editing} kind={cat}
      onSaved={() => { setEditing(null); reload(); onChanged() }}
      onClose={() => setEditing(null)}/>
  }

  return (
    <ModalShell width={620} onClose={onClose}>
      <div className="modal-head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
        <div className="row-between">
          <button className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, letterSpacing: 0.06, textTransform: 'uppercase', fontSize: 11, color: 'var(--text-3)' }} onClick={onBack}>
            <I.ChevLeft size={12}/> Enviar correo
          </button>
          <button className="icon-btn" onClick={onClose}><I.X size={16}/></button>
        </div>
        <div className="modal-title">Plantillas de email</div>
      </div>
      <div className="modal-body">
        <div className="seg" style={{ width: '100%', marginBottom: 16 }}>
          {TPL_CATS.map(c => (
            <button key={c.id} className={'seg-btn' + (cat === c.id ? ' is-active' : '')} style={{ flex: 1 }} onClick={() => setCat(c.id)}>{c.l}</button>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>{TPL_DESC[cat]}</p>
        <div className="stack" style={{ gap: 10 }}>
          {list.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-3)', border: '1.5px dashed var(--hairline)', borderRadius: 'var(--radius-md)' }}>
              Aún no hay plantillas en esta categoría.
            </div>
          )}
          {list.map(t => (
            <div key={t.id} className="row" style={{ gap: 12, padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)', background: 'var(--surface)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{t.name}</span>
                  {t.is_default && <span className="pill-tone tone-blue" style={{ height: 18, fontSize: 10 }}>por defecto</span>}
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.body}</div>
              </div>
              <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                {onPick && <button className="btn btn-secondary btn-sm" onClick={() => onPick(t.id)}>Usar</button>}
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(t)}>Editar</button>
                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' }} onClick={() => del(t)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onBack}>Cerrar</button>
        <span style={{ flex: 1 }}/>
        <button className="btn btn-primary" onClick={() => setEditing({ id: '__new__', kind: cat, name: '', subject: '', body: '', is_default: false })}>
          <I.Plus size={14}/> Nueva plantilla {TPL_CATS.find(c => c.id === cat)?.l}
        </button>
      </div>
    </ModalShell>
  )
}

function TemplateEditorV2({ slug, initial, kind, onSaved, onClose }: {
  slug: string; initial: ApiTpl | null; kind: string;
  onSaved: () => void; onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || '')
  const [subject, setSubject] = useState(initial?.subject || '')
  const [body, setBody] = useState(initial?.body || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function save() {
    if (!name.trim()) { setErr('Nombre requerido'); return }
    setBusy(true); setErr('')
    try {
      const url = initial
        ? `/api/v1/tenant/${slug}/email/templates/${initial.id}`
        : `/api/v1/tenant/${slug}/email/templates`
      const r = await api(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name, subject, body }),
      })
      if (r.ok) onSaved()
      else { const j = await r.json().catch(() => ({})); setErr((j as any).detail || 'Error') }
    } finally { setBusy(false) }
  }
  return (
    <ModalShell width={640} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title">{initial ? 'Editar plantilla' : 'Nueva plantilla'}</div>
        <button className="icon-btn" onClick={onClose}><I.X size={16}/></button>
      </div>
      <div className="modal-body">
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Nombre</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', height: 40 }}/>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="row-between" style={{ marginBottom: 7 }}>
            <span className="field-label" style={{ margin: 0 }}>Asunto</span>
            <VariableMenuV2 onInsert={t => setSubject(s => (s ? s + ' ' : '') + t)}/>
          </div>
          <input className="input" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', height: 40 }}/>
        </div>
        <div>
          <div className="row-between" style={{ marginBottom: 7 }}>
            <span className="field-label" style={{ margin: 0 }}>Cuerpo</span>
            <VariableMenuV2 onInsert={t => setBody(b => (b ? b + ' ' : '') + t)}/>
          </div>
          <textarea className="rt-area" value={body} onChange={e => setBody(e.target.value)} style={{ borderRadius: 'var(--radius-sm)' }}/>
        </div>
        {err && <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <span style={{ flex: 1 }}/>
        <button className="btn btn-primary" disabled={busy} onClick={save}><I.Check size={14}/> Guardar</button>
      </div>
    </ModalShell>
  )
}

const SERVICE_COLORS: { id: string; name: string; hex: string }[] = [
  { id: 'blue',   name: 'Azul',     hex: '#0A84FF' },
  { id: 'green',  name: 'Verde',    hex: '#34C759' },
  { id: 'orange', name: 'Naranja',  hex: '#FF9500' },
  { id: 'purple', name: 'Morado',   hex: '#AF52DE' },
  { id: 'red',    name: 'Rojo',     hex: '#FF3B30' },
  { id: 'pink',   name: 'Rosa',     hex: '#FF2D55' },
  { id: 'teal',   name: 'Turquesa', hex: '#30C9C9' },
  { id: 'indigo', name: 'Índigo',   hex: '#5E5CE6' },
]

type Recurrence = 'none' | 'random' | 'daily' | 'weekly' | 'weekdays' | 'biweekly' | 'monthly'
const RECUR_OPTIONS: { v: Recurrence; label: string; hint: string }[] = [
  { v: 'weekly',   label: 'Semanal',         hint: 'Cada semana en el mismo día' },
  { v: 'biweekly', label: 'Cada 2 semanas',  hint: 'Quincenal' },
  { v: 'monthly',  label: 'Mensual',         hint: 'Una vez al mes' },
  { v: 'weekdays', label: 'Días laborables', hint: 'Lunes a viernes' },
  { v: 'daily',    label: 'Diario',          hint: 'Todos los días' },
  { v: 'random',   label: 'Aleatorio',       hint: 'Fecha única, sin repetición' },
  { v: 'none',     label: 'Sin repetición',  hint: 'Un solo servicio' },
]
function nextSundayISO(): string {
  const d = new Date()
  const dow = d.getDay()
  const days = dow === 0 ? 7 : 7 - dow
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
interface ServiceTimeIn { starts_on: string; start_time: string; end_time: string }

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: done || active ? 1 : 0.55 }}>
      <span style={{
        width: 24, height: 24, borderRadius: 99, display: 'grid', placeItems: 'center',
        fontSize: 12, fontWeight: 700,
        background: active ? 'var(--accent)' : done ? 'var(--success)' : 'var(--surface-3)',
        color: active || done ? '#fff' : 'var(--text-3)',
      }}>{done ? <I.Check size={12}/> : n}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--text)' : 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

function NewServiceModal({ slug, teams, onClose, onCreated }: {
  slug: string; teams: Team[]; onClose: () => void; onCreated: (st: ServiceType) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('weekly')
  const [colorId, setColorId] = useState('blue')
  const [times, setTimes] = useState<ServiceTimeIn[]>([{ starts_on: nextSundayISO(), start_time: '11:00', end_time: '12:30' }])
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const sel = SERVICE_COLORS.find(c => c.id === colorId) || SERVICE_COLORS[0]

  function next() {
    setErr('')
    if (step === 1) {
      if (!name.trim()) { setErr('Indica un nombre'); return }
      setStep(2)
    } else if (step === 2) {
      if (times.length === 0) { setErr('Añade al menos un horario'); return }
      for (const t of times) {
        if (!t.starts_on || !t.start_time || !t.end_time) { setErr('Completa todos los horarios'); return }
        if (t.end_time <= t.start_time) { setErr('La hora de fin debe ser posterior a la de inicio'); return }
      }
      setStep(3)
    }
  }
  function back() { setErr(''); if (step > 1) setStep((step - 1) as 1 | 2) }

  async function submit() {
    setBusy(true); setErr('')
    try {
      const r = await api(`/api/v1/tenant/${slug}/services/types`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color: sel.hex,
          recurrence,
          times,
          team_ids: teamIds,
        }),
      })
      if (r.ok) { onCreated(await r.json()); onClose() }
      else { const j = await r.json().catch(() => ({})); setErr((j as any).detail || 'Error al crear'); setBusy(false) }
    } catch (e: any) { setErr(e?.message || 'Error'); setBusy(false) }
  }

  function updateTime(i: number, patch: Partial<ServiceTimeIn>) {
    setTimes(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }
  function addTime() {
    const last = times[times.length - 1]
    setTimes(prev => [...prev, { starts_on: last?.starts_on || nextSundayISO(), start_time: '08:00', end_time: '09:00' }])
  }
  function removeTime(i: number) {
    setTimes(prev => prev.filter((_, idx) => idx !== i))
  }
  function toggleTeam(id: string) {
    setTeamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const recurLabel = RECUR_OPTIONS.find(o => o.v === recurrence)?.label || 'Semanal'

  return (
    <ModalShell width={680} onClose={onClose}>
      <div className="modal-head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
        <div className="row-between">
          <div className="modal-title">Nuevo servicio</div>
          <button className="icon-btn" onClick={onClose}><I.X size={16}/></button>
        </div>
        <div className="row" style={{ alignItems: 'center', gap: 14 }}>
          <StepDot n={1} label="Detalles" active={step === 1} done={step > 1}/>
          <span style={{ flex: 1, height: 1, background: 'var(--separator)' }}/>
          <StepDot n={2} label="Horarios" active={step === 2} done={step > 2}/>
          <span style={{ flex: 1, height: 1, background: 'var(--separator)' }}/>
          <StepDot n={3} label="Equipos" active={step === 3} done={false}/>
        </div>
      </div>

      <div className="modal-body">
        {/* Live banner preview (always visible) */}
        <div className="svc-ribbon" style={{
          borderRadius: 'var(--radius-md)', marginBottom: 20, minHeight: 92,
          background: `linear-gradient(135deg, ${sel.hex}, color-mix(in oklab, ${sel.hex} 70%, #000))`,
        }}>
          <div className="svc-ribbon-deco"/>
          <div className="svc-ribbon-deco b"/>
          <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
            <div className="svc-ribbon-sub">{recurLabel}</div>
            <div className="svc-ribbon-title">{name || 'Nombre del servicio'}</div>
          </div>
        </div>

        {step === 1 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Nombre del servicio</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="p. ej. Servicio Dominical" style={{ width: '100%', height: 40 }} autoFocus/>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="field-label">¿Cuándo ocurre?</label>
              <select value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence)} style={{
                width: '100%', height: 40, padding: '0 36px 0 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--hairline)',
                fontSize: 13.5, cursor: 'pointer', appearance: 'none', fontFamily: 'inherit',
                backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
              }}>
                {RECUR_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{RECUR_OPTIONS.find(o => o.v === recurrence)?.hint}</div>
            </div>
            <div>
              <label className="field-label">Color del banner</label>
              <div className="swatch-grid">
                {SERVICE_COLORS.map(c => (
                  <button key={c.id} className={'swatch' + (colorId === c.id ? ' is-active' : '')}
                    onClick={() => setColorId(c.id)} title={c.name}
                    style={{ background: c.hex, color: c.hex }}/>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
                Seleccionado: <b style={{ color: 'var(--text-2)' }}>{sel.name}</b> — el fondo del banner usará este color en toda la app.
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 14px', lineHeight: 1.55 }}>
              Selecciona el día y la franja horaria. Por defecto comenzamos el <b style={{ color: 'var(--text-2)' }}>próximo domingo</b>.
              Puedes añadir varios horarios para el mismo día o para días distintos.
            </p>
            <div className="stack" style={{ gap: 10 }}>
              {times.map((t, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 90px) auto minmax(0, 90px) auto',
                  alignItems: 'center', gap: 8,
                  padding: '10px 12px', background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)',
                }}>
                  <input type="date" className="input" value={t.starts_on}
                    onChange={e => updateTime(i, { starts_on: e.target.value })}
                    style={{ minWidth: 0, height: 36, width: '100%' }}/>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>de</span>
                  <input type="time" className="input" value={t.start_time}
                    onChange={e => updateTime(i, { start_time: e.target.value })}
                    style={{ minWidth: 0, height: 36, width: '100%' }}/>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>a</span>
                  <input type="time" className="input" value={t.end_time}
                    onChange={e => updateTime(i, { end_time: e.target.value })}
                    style={{ minWidth: 0, height: 36, width: '100%' }}/>
                  {times.length > 1
                    ? <button className="icon-btn" onClick={() => removeTime(i)} title="Quitar"><I.X size={14}/></button>
                    : <span style={{ width: 28 }}/>}
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addTime} style={{ marginTop: 12 }}>
              <I.Plus size={12}/> Añadir otro horario
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--text-4)', margin: '14px 0 0', fontStyle: 'italic' }}>
              * Si tu iglesia tiene dos servicios el mismo día (p. ej. 9 h y 11 h), añade ambos.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 14px', lineHeight: 1.55 }}>
              Selecciona los equipos que participarán en este servicio. Puedes crearlos en <b style={{ color: 'var(--text-2)' }}>Personas → Equipos</b>.
            </p>
            {teams.length === 0 ? (
              <div className="dropzone" style={{ cursor: 'default' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  No has creado equipos todavía.<br/>
                  Puedes crearlos más tarde en la pestaña Personas.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {teams.map(t => {
                  const checked = teamIds.includes(t.id)
                  return (
                    <button key={t.id} onClick={() => toggleTeam(t.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      border: '1.5px solid ' + (checked ? 'var(--accent)' : 'var(--separator)'),
                      borderRadius: 'var(--radius-md)',
                      background: checked ? 'var(--accent-tint)' : 'var(--surface)',
                      cursor: 'pointer', textAlign: 'left', transition: 'border-color 140ms, background 140ms',
                    }}>
                      <span style={{ width: 12, height: 12, borderRadius: 4, background: t.color || 'var(--accent)', flexShrink: 0 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{t.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{t.member_count} miembro{t.member_count === 1 ? '' : 's'}</div>
                      </div>
                      {checked && <I.Check size={14} {...{ style: { color: 'var(--accent)' } } as any}/>}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {err && (
          <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in oklab, var(--danger) 12%, transparent)', color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
            {err}
          </div>
        )}
      </div>

      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={step === 1 ? onClose : back}>
          {step === 1 ? 'Cancelar' : <><I.ChevLeft size={12}/> Atrás</>}
        </button>
        <span style={{ flex: 1 }}/>
        {step < 3
          ? <button className="btn btn-primary" onClick={next}>Siguiente <I.Chev size={12}/></button>
          : <button className="btn btn-primary" onClick={submit} disabled={busy}><I.Check size={14}/> {busy ? 'Creando…' : 'Crear servicio'}</button>}
      </div>
    </ModalShell>
  )
}

const SERVICE_ROLE_LABEL_FULL: Record<ServiceRole, string> = {
  administrator: 'Administrador',
  editor: 'Editor',
  coordinator: 'Coordinador',
  viewer: 'Visualizador',
  scheduled_viewer: 'Visualizador programado',
}

function PersonaDetail({ slug, person, allTeams, onBack, onChanged }: {
  slug: string; person: ServicePerson; allTeams: Team[]; onBack: () => void; onChanged: (p: ServicePerson) => void;
}) {
  const p = adaptPerson(person)
  const [tab, setTab] = useState<'programacion' | 'comunicacion' | 'detalles'>('programacion')
  const [rolePickerOpen, setRolePickerOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function patchPerson(patch: Record<string, any>) {
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    if (r.ok) { onChanged(await r.json()); return true }
    const j = await r.json().catch(() => ({} as any))
    alert(j.detail || 'Error')
    return false
  }
  async function changeServiceRole(newRole: ServiceRole) {
    setBusy(true); try { await patchPerson({ service_role: newRole }) }
    finally { setBusy(false); setRolePickerOpen(false) }
  }
  async function toggleActive() {
    const next = !(person.is_active !== false)
    const verb = next ? 'habilitar' : 'deshabilitar'
    if (!confirm(`¿Seguro que quieres ${verb} a ${person.full_name || person.email}?`)) return
    setBusy(true); try { await patchPerson({ is_active: next }) }
    finally { setBusy(false); setActionsOpen(false) }
  }
  async function deletePerson() {
    if (!confirm(`¿Eliminar a ${person.full_name || person.email}? Esta acción es irreversible.`)) return
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}`, { method: 'DELETE' })
    if (r.ok) onBack()
    else { const j = await r.json().catch(() => ({} as any)); alert(j.detail || 'Error') }
  }

  return (
    <div className="content route-enter">
      <div className="page-head rise" style={{ alignItems: 'flex-start' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 10, paddingLeft: 0 }}>
            <I.ChevLeft size={13}/> PERSONAS
          </button>
          <div className="row" style={{ gap: 16 }}>
            <div className="av" data-c={p.c} style={{ width: 60, height: 60, fontSize: 22, borderRadius: 18 }}>
              {PersonaInitials(p.name)}
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: 28 }}>{p.name}</h1>
              <p className="page-sub mono" style={{ fontSize: 13, marginTop: 2 }}>{p.email}</p>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          {!p.active && (
            <span className="chip" style={{ height: 30, color: 'var(--danger)', background: 'color-mix(in oklab, var(--danger) 12%, transparent)', fontWeight: 700, letterSpacing: 0.04 }}>
              DESHABILITADO
            </span>
          )}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" disabled={busy} onClick={() => { setRolePickerOpen(o => !o); setActionsOpen(false) }}>
              <I.People size={14}/> {SERVICE_ROLE_LABEL_FULL[person.service_role] || 'Rol'} <I.ChevDown size={12}/>
            </button>
            {rolePickerOpen && (
              <div className="dropdown-menu" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30, background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 10, boxShadow: 'var(--shadow-2)', padding: 6, minWidth: 220 }}>
                {(Object.keys(SERVICE_ROLE_LABEL_FULL) as ServiceRole[]).map(r => (
                  <button key={r} onClick={() => changeServiceRole(r)} style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                    background: r === person.service_role ? 'var(--accent-tint)' : 'transparent',
                    color: r === person.service_role ? 'var(--accent)' : 'var(--text)',
                    border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  }}>{SERVICE_ROLE_LABEL_FULL[r]}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" disabled={busy} onClick={() => { setActionsOpen(o => !o); setRolePickerOpen(false) }}>
              <I.Dots2 size={14}/> Acciones <I.ChevDown size={12}/>
            </button>
            {actionsOpen && (
              <div className="dropdown-menu" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30, background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 10, boxShadow: 'var(--shadow-2)', padding: 6, minWidth: 240 }}>
                <button onClick={toggleActive} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 9 }}>
                  {p.active ? <I.Power size={13}/> : <I.Check size={13}/>}
                  {p.active ? 'Deshabilitar miembro' : 'Habilitar miembro'}
                </button>
                <button onClick={() => { setActionsOpen(false); deletePerson() }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <I.Trash size={13}/> Eliminar persona
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row rise rise-d1" style={{ borderBottom: '1px solid var(--separator)', gap: 0, marginBottom: 'var(--gap)' }}>
        {([
          { id: 'programacion', l: 'Programación' },
          { id: 'comunicacion', l: 'Comunicación' },
          { id: 'detalles',     l: 'Detalles' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 16px', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
            background: 'transparent', border: 0, cursor: 'pointer',
            color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
            borderBottom: '2px solid ' + (tab === t.id ? 'var(--accent)' : 'transparent'),
            marginBottom: -1,
          }}>{t.l}</button>
        ))}
      </div>

      {tab === 'programacion' && <PersonaProgramacion slug={slug} person={person} allTeams={allTeams}/>}
      {tab === 'comunicacion' && <PersonaComunicacion slug={slug} person={person} p={p}/>}
      {tab === 'detalles'     && <PersonaDetalles p={p}/>}
    </div>
  )
}

function PersonaProgramacion({ slug, person, allTeams }: { slug: string; person: ServicePerson; allTeams: Team[] }) {
  type RangePreset = 'upcoming' | '1m' | '3m' | '6m' | '12m'
  const RANGE_LABELS: Record<RangePreset, string> = {
    upcoming: 'Próximos', '1m': 'Último mes', '3m': 'Últimos 3 meses', '6m': 'Últimos 6 meses', '12m': 'Últimos 12 meses',
  }
  const [range, setRange] = useState<RangePreset>('upcoming')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [summary, setSummary] = useState({ confirmed: 0, pending: 0, declined: 0, total: 0 })
  const [blockouts, setBlockouts] = useState<Blockout[]>([])
  const [blockoutOpen, setBlockoutOpen] = useState(false)
  const [editBlockout, setEditBlockout] = useState<Blockout | null>(null)
  const [personTeams, setPersonTeams] = useState<PersonTeam[]>([])

  const reloadAssignments = useCallback(async () => {
    const today = new Date()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const qs = new URLSearchParams()
    if (range === 'upcoming') qs.set('range_from', iso(today))
    else {
      const m = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : 12
      const past = new Date(today); past.setMonth(past.getMonth() - m)
      qs.set('range_from', iso(past)); qs.set('range_to', iso(today))
    }
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/assignments?${qs}`)
    if (r.ok) { const j = await r.json(); setSummary(j.summary || { confirmed: 0, pending: 0, declined: 0, total: 0 }) }
  }, [slug, person.id, range])
  const reloadBlockouts = useCallback(async () => {
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/blockouts`)
    setBlockouts(r.ok ? await r.json() : [])
  }, [slug, person.id])
  const reloadPersonTeams = useCallback(async () => {
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/teams`)
    setPersonTeams(r.ok ? await r.json() : [])
  }, [slug, person.id])
  useEffect(() => { reloadAssignments() }, [reloadAssignments])
  useEffect(() => { reloadBlockouts() }, [reloadBlockouts])
  useEffect(() => { reloadPersonTeams() }, [reloadPersonTeams])

  async function removeBlockout(b: Blockout) {
    if (!confirm('¿Eliminar este bloqueo?')) return
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/blockouts/${b.id}`, { method: 'DELETE' })
    if (r.ok) setBlockouts(prev => prev.filter(x => x.id !== b.id))
  }
  async function removeTeam(pt: PersonTeam) {
    if (!confirm(`¿Quitar a ${person.full_name || person.email} del equipo ${pt.team_name}?`)) return
    const r = await api(`/api/v1/tenant/${slug}/teams/${pt.team_id}/members/${person.member_id}`, { method: 'DELETE' })
    if (r.ok) setPersonTeams(prev => prev.filter(x => x.membership_id !== pt.membership_id))
  }

  const total = summary.total

  return (
    <div className="grid grid-12 rise rise-d2">
      <div className="col-7 stack" style={{ gap: 'var(--gap)' }}>
        <section>
          <SectionHead title="Resumen de programación" info />
          <div className="card">
            <div style={{ padding: 14, borderBottom: '1px solid var(--separator)', position: 'relative' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setRangeOpen(o => !o)}>{RANGE_LABELS[range]} <I.ChevDown size={12}/></button>
              {rangeOpen && (
                <div className="dropdown-menu" style={{ position: 'absolute', top: 'calc(100% - 4px)', left: 14, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 10, boxShadow: 'var(--shadow-2)', padding: 6, minWidth: 200 }}>
                  {(Object.keys(RANGE_LABELS) as RangePreset[]).map(rk => (
                    <button key={rk} onClick={() => { setRange(rk); setRangeOpen(false) }} style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                      background: rk === range ? 'var(--accent-tint)' : 'transparent',
                      color: rk === range ? 'var(--accent)' : 'var(--text)',
                      border: 0, cursor: 'pointer', fontSize: 13,
                    }}>{RANGE_LABELS[rk]}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 28 }}>
              <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                <svg viewBox="0 0 132 132" width="132" height="132">
                  <circle cx="66" cy="66" r="56" fill="none" stroke="var(--surface-3)" strokeWidth="14"/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="display-sans" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1 }}>{total}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.1, fontWeight: 600 }}>Total</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { l: 'Confirmados',  c: 'var(--success)', n: summary.confirmed },
                  { l: 'Sin responder', c: 'var(--warning)', n: summary.pending },
                  { l: 'Rechazados',   c: 'var(--danger)',  n: summary.declined },
                ].map(r => (
                  <div key={r.l} className="row-between">
                    <div className="row" style={{ gap: 9 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 99, background: r.c }} />
                      <span style={{ fontSize: 12.5, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.06, fontWeight: 600 }}>{r.l}</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: r.c }}>{r.n}</span>
                  </div>
                ))}
              </div>
            </div>
            {total === 0 && (
              <div style={{ padding: '20px 24px', borderTop: '1px solid var(--separator)', textAlign: 'center', fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
                No hay planes en este rango. Responder a solicitudes ayuda al líder de equipo a cuadrar los servicios.
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionHead title="Calendario" info right={<button className="btn btn-secondary btn-sm" onClick={() => { setEditBlockout(null); setBlockoutOpen(true) }}><I.Plus size={12}/> Añadir bloqueo</button>} />
          <div className="card">
            <div style={{ padding: 14, borderBottom: '1px solid var(--separator)', fontSize: 13, fontWeight: 600 }}>Próximos bloqueos</div>
            {blockouts.length === 0 ? (
              <div style={{ padding: '28px 24px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
                No hay bloqueos. Pulsa <b style={{ color: 'var(--text-2)' }}>+ Añadir bloqueo</b> para registrar un periodo de indisponibilidad.
              </div>
            ) : blockouts.map(b => (
              <div key={b.id} className="list-row" style={{ borderRadius: 0 }}>
                <div className="list-body">
                  <div className="list-title" style={{ fontSize: 13.5 }}>{b.reason || 'Sin título'}</div>
                  <div className="list-sub mono" style={{ fontSize: 12 }}>{b.start_date}{b.end_date && b.end_date !== b.start_date ? ` → ${b.end_date}` : ''}</div>
                </div>
                <button className="icon-btn" onClick={() => { setEditBlockout(b); setBlockoutOpen(true) }}><I.Edit size={13}/></button>
                <button className="icon-btn" onClick={() => removeBlockout(b)}><I.Trash size={13}/></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="col-5 stack" style={{ gap: 'var(--gap)' }}>
        <section>
          <SectionHead title="Preferencias" info />
          <div className="card">
            <div className="row" style={{ gap: 12, padding: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-2-tint)', color: 'var(--success)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <I.Cal size={17}/>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>
                {person.scheduling?.max_per_month
                  ? `Máximo ${person.scheduling.max_per_month} planes al mes`
                  : 'Prográmame todas las veces que quieras'}
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHead title="Equipos" info right={<TeamAdderInline slug={slug} person={person} allTeams={allTeams} excludeIds={personTeams.map(pt => pt.team_id)} onAdded={() => reloadPersonTeams()}/>} />
          <div className="card">
            {personTeams.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: 'var(--text-3)' }}>Aún no pertenece a ningún equipo.</div>
            ) : personTeams.map(pt => (
              <div key={pt.membership_id} className="list-row" style={{ borderRadius: 0 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: pt.team_color || 'var(--accent-4)', flexShrink: 0 }} />
                <div className="list-body"><div className="list-title" style={{ fontSize: 13.5 }}>{pt.team_name}</div></div>
                <button className="icon-btn" onClick={() => removeTeam(pt)}><I.X size={13}/></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {blockoutOpen && (
        <BlockoutModal slug={slug} smId={person.id} initial={editBlockout ?? undefined}
          onSaved={() => { reloadBlockouts(); setBlockoutOpen(false); setEditBlockout(null) }}
          onClose={() => { setBlockoutOpen(false); setEditBlockout(null) }}/>
      )}
    </div>
  )
}

function TeamAdderInline({ slug, person, allTeams, excludeIds, onAdded }: {
  slug: string; person: ServicePerson; allTeams: Team[]; excludeIds: string[]; onAdded: () => void;
}) {
  const [open, setOpen] = useState(false)
  const [pickedTeamId, setPickedTeamId] = useState('')
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([])
  const [pickedPosIds, setPickedPosIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const avail = allTeams.filter(t => !excludeIds.includes(t.id))

  useEffect(() => {
    setPickedPosIds([])
    setPositions([])
    if (!pickedTeamId) return
    let cancel = false
    api(`/api/v1/tenant/${slug}/teams/${pickedTeamId}/detail`).then(r => r.ok ? r.json() : null).then((d: any) => {
      if (cancel || !d) return
      setPositions((d.positions || []).map((p: any) => ({ id: p.id, name: p.name })))
    })
    return () => { cancel = true }
  }, [slug, pickedTeamId])

  async function submit() {
    if (!pickedTeamId) return
    setBusy(true)
    try {
      const r1 = await api(`/api/v1/tenant/${slug}/teams/${pickedTeamId}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: person.member_id }),
      })
      if (!r1.ok && r1.status !== 409) {
        const j = await r1.json().catch(() => ({} as any)); alert(j.detail || 'Error añadiendo al equipo'); return
      }
      for (const posId of pickedPosIds) {
        await api(`/api/v1/tenant/${slug}/teams/${pickedTeamId}/positions/${posId}/members`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_ids: [person.member_id] }),
        })
      }
      onAdded()
      setOpen(false); setPickedTeamId(''); setPickedPosIds([])
    } finally { setBusy(false) }
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" disabled={avail.length === 0} onClick={() => setOpen(true)}><I.Plus size={12}/> Añadir</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 480, maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Añadir a un equipo</h3>
            <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Equipo</label>
            <select value={pickedTeamId} onChange={e => setPickedTeamId(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--separator)', marginTop: 6, marginBottom: 14, background: 'var(--surface-2)', color: 'var(--text)' }}>
              <option value="">Selecciona…</option>
              {avail.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {positions.length > 0 && (
              <>
                <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Posiciones (opcional)</label>
                <div style={{ marginTop: 6, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {positions.map(p => {
                    const on = pickedPosIds.includes(p.id)
                    return (
                      <button key={p.id} onClick={() => setPickedPosIds(prev => on ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                        className={'chip' + (on ? ' is-on' : '')} style={{ cursor: 'pointer', background: on ? 'var(--accent-tint)' : 'var(--surface-3)', color: on ? 'var(--accent)' : 'var(--text-2)', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--separator)') }}>{p.name}</button>
                    )
                  })}
                </div>
              </>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={busy || !pickedTeamId} onClick={submit}>{busy ? 'Añadiendo…' : 'Añadir'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PersonaComunicacion({ slug, person, p }: { slug: string; person: ServicePerson; p: PersonaP }) {
  const [box, setBox] = useState<'recibidos' | 'enviados'>('recibidos')
  const [msgs, setMsgs] = useState<EmailMessage[]>([])
  const [composeOpen, setComposeOpen] = useState<{ kind?: 'password_reset' } | null>(null)

  const reloadMsgs = useCallback(async () => {
    const r = await api(`/api/v1/tenant/${slug}/services/people/${person.id}/messages`)
    setMsgs(r.ok ? await r.json() : [])
  }, [slug, person.id])
  useEffect(() => { reloadMsgs() }, [reloadMsgs])
  async function deleteMsg(m: EmailMessage) {
    if (!confirm('¿Eliminar este mensaje de Worsyn?')) return
    const r = await api(`/api/v1/tenant/${slug}/email/messages/${m.id}`, { method: 'DELETE' })
    if (r.ok) setMsgs(prev => prev.filter(x => x.id !== m.id))
  }

  const filtered = msgs.filter(m => (box === 'recibidos' ? m.direction === 'received' : m.direction === 'sent'))

  return (
    <div className="grid grid-12 rise rise-d2">
      <div className="col-7 stack" style={{ gap: 'var(--gap)' }}>
        <section>
          <SectionHead title="Mensajes" right={<button className="btn btn-primary btn-sm" onClick={() => setComposeOpen({})}><I.Plus size={12}/> Nuevo</button>} />
          <div className="card">
            <div className="row" style={{ padding: '8px 8px 0', gap: 0, borderBottom: '1px solid var(--separator)' }}>
              {(['recibidos','enviados'] as const).map(id => (
                <button key={id} onClick={() => setBox(id)} style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  background: 'transparent', border: 0, cursor: 'pointer',
                  color: box === id ? 'var(--text)' : 'var(--text-3)',
                  borderBottom: '2px solid ' + (box === id ? 'var(--accent)' : 'transparent'),
                  marginBottom: -1,
                }}>{id === 'recibidos' ? 'Recibidos' : 'Enviados'}</button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-3)' }}>
                {box === 'recibidos' ? 'No hay mensajes recibidos.' : 'No hay mensajes enviados.'}
              </div>
            ) : filtered.map(m => (
              <div key={m.id} className="list-row" style={{ borderRadius: 0, alignItems: 'flex-start' }}>
                <div className="list-body">
                  <div className="list-title" style={{ fontSize: 13.5, fontWeight: 600 }}>{m.subject || '(sin asunto)'}</div>
                  <div className="list-sub" style={{ marginTop: 3 }}>
                    De: {m.counterparty_name || m.sender_email || '—'} <span className="pill-tone tone-violet" style={{ marginLeft: 4 }}>{m.direction === 'received' ? 'Recibido' : 'Enviado'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{m.sent_at ? new Date(m.sent_at).toLocaleDateString('es-ES') : ''}</span>
                  <button className="icon-btn" onClick={() => deleteMsg(m)}><I.Trash size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHead title="Contraseña" info />
          <div className="card">
            <div style={{ padding: 18 }}>
              <button className="btn btn-primary" onClick={() => setComposeOpen({ kind: 'password_reset' })}><I.Send size={14}/> Enviar email de restablecimiento</button>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.5 }}>
                La persona recibirá un correo con un enlace para elegir una nueva contraseña. <b style={{ color: 'var(--text-2)' }}>Caduca en 10 minutos</b> — si lo necesita después, reenvíalo desde aquí.
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="col-5 stack" style={{ gap: 'var(--gap)' }}>
        <section>
          <SectionHead title="Notificaciones" info />
          <div className="card">
            <div style={{ padding: 16 }}>
              <div className="row" style={{ gap: 12, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-2-tint)', color: 'var(--success)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <I.Bell size={16}/>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>App preferida</div>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }}>Servicios (este módulo) <I.ChevDown size={13}/></button>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
                Cuando la app móvil esté disponible, las notificaciones push llegarán al app elegido. Por defecto es <b style={{ color: 'var(--text-2)' }}>Servicios</b>.
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHead title="Firma" info right={<button className="btn btn-ghost btn-sm">Editar</button>} />
          <div className="card">
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 13.5, color: 'var(--text-3)', fontStyle: 'italic' }}>Sin firma de texto.</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 10, lineHeight: 1.5 }}>
                Se adjuntará automáticamente al final de los correos enviados desde el portal (cuando SMTP esté activo).
              </div>
            </div>
          </div>
        </section>
      </div>

      {composeOpen && (
        <EmailModalV2 slug={slug} recipient={person}
          autoApplyKind={composeOpen.kind}
          onClose={() => setComposeOpen(null)}
          onSent={() => { reloadMsgs(); setTimeout(reloadMsgs, 2000) }}/>
      )}
    </div>
  )
}

function PersonaDetalles({ p }: { p: PersonaP }) {
  return (
    <div className="grid grid-12 rise rise-d2">
      <div className="col-4">
        <SectionHead title="Etiquetas" info right={<button className="btn btn-ghost btn-sm"><I.Plus size={12}/> Añadir</button>} />
        <div className="card"><div style={{ padding: 18, fontSize: 13, color: 'var(--text-3)' }}>Sin etiquetas todavía.</div></div>
      </div>

      <div className="col-4 stack" style={{ gap: 'var(--gap)' }}>
        <div>
          <SectionHead title="Notas" info />
          <div className="card">
            <textarea placeholder="Aún no hay notas." style={{
              width: '100%', minHeight: 96, border: 0, background: 'transparent', resize: 'vertical',
              padding: 16, fontSize: 13.5, color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
            }} />
          </div>
        </div>
        <div>
          <SectionHead title="Archivos" right={<button className="btn btn-ghost btn-sm"><I.Plus size={12}/> Añadir</button>} />
          <div className="card">
            <div style={{ margin: 14, padding: '28px 16px', border: '1.5px dashed var(--hairline)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              Arrastra y suelta o <span style={{ color: 'var(--accent)', fontWeight: 600 }}>haz clic aquí</span> para añadir tu primer archivo.
            </div>
          </div>
        </div>
      </div>

      <div className="col-4 stack" style={{ gap: 'var(--gap)' }}>
        <div>
          <SectionHead title="Carpeta actual" info />
          <div className="card">
            <div style={{ padding: 14 }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-3)' }}><I.Search size={13}/> Buscar carpeta…</button>
            </div>
          </div>
        </div>
        <div>
          <SectionHead title="Actividad" />
          <div className="card">
            {[['Último acceso', p.active ? p.lastSeen : '—'], ['Creado', p.joined]].map(([l, v]) => (
              <div key={l} className="list-row" style={{ borderRadius: 0 }}>
                <div className="list-body"><div style={{ fontSize: 13, color: 'var(--text-2)' }}>{l}</div></div>
                <span className="mono" style={{ fontSize: 12.5, color: v === '—' ? 'var(--text-4)' : 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// V2 EquipoDetail — Miembros · Configuración · Automatizaciones
// ─────────────────────────────────────────────────────────────
function teamInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function EquipoDetail({ slug, team, allTeams, orgMembers, types, currentMemberId, onBack, onOpenPerson, onTeamChanged, onTeamDeleted, onPeopleInvalidate }: {
  slug: string; team: Team; allTeams: Team[]; orgMembers: OrgMemberLite[]; types: ServiceType[];
  currentMemberId: string | null;
  onBack: () => void; onOpenPerson: (memberId: string) => void;
  onTeamChanged: (t: Team) => void; onTeamDeleted: () => void; onPeopleInvalidate: () => void;
}) {
  const [tab, setTab] = useState<'miembros' | 'config' | 'auto'>('miembros')
  const [detail, setDetail] = useState<TeamDetailPayload | null>(null)
  const [editNameOpen, setEditNameOpen] = useState(false)

  const reloadDetail = useCallback(async () => {
    const r = await api(`/api/v1/tenant/${slug}/teams/${team.id}/detail`)
    if (r.ok) setDetail(await r.json())
  }, [slug, team.id])
  useEffect(() => { reloadDetail() }, [reloadDetail])

  const teamTypeLabel = team.is_split ? 'Dividido' : team.is_secure ? 'Seguro' : 'Ensayo'
  const stIds = detail?.team?.service_type_ids || team.service_type_ids || []
  const stTags = stIds.map(id => types.find(t => t.id === id)?.name).filter(Boolean) as string[]
  const tags: string[] = [teamTypeLabel, ...stTags]

  return (
    <div className="content route-enter">
      <div className="page-head rise" style={{ alignItems: 'flex-start' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 10, paddingLeft: 0 }}>
            <I.ChevLeft size={13}/> EQUIPOS
          </button>
          <div className="row" style={{ gap: 12 }}>
            <span style={{ width: 18, height: 18, borderRadius: 6, background: team.color || '#AF52DE', flexShrink: 0 }} />
            <h1 className="page-title" style={{ fontSize: 28 }}>{team.name}</h1>
          </div>
          <div className="row" style={{ gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
            {tags.map((tg, i) => (
              <span key={i + tg} className={i === 0 ? 'pill-tone tone-violet' : 'chip'} style={{ height: 24 }}>{tg}</span>
            ))}
          </div>
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 4 }} onClick={() => setEditNameOpen(true)}><I.Edit size={13}/> Editar nombre</button>
      </div>

      <div className="row rise rise-d1" style={{ borderBottom: '1px solid var(--separator)', gap: 0, marginBottom: 'var(--gap)' }}>
        {([
          { id: 'miembros', l: 'Miembros' },
          { id: 'config',   l: 'Configuración' },
          { id: 'auto',     l: 'Automatizaciones' },
        ] as const).map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            padding: '12px 16px', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
            background: 'transparent', border: 0, cursor: 'pointer',
            color: tab === tb.id ? 'var(--text)' : 'var(--text-3)',
            borderBottom: '2px solid ' + (tab === tb.id ? 'var(--accent)' : 'transparent'),
            marginBottom: -1,
          }}>{tb.l}</button>
        ))}
      </div>

      {tab === 'miembros' && <EquipoMiembros slug={slug} team={team} detail={detail}
        orgMembers={orgMembers} currentMemberId={currentMemberId}
        onOpenPerson={onOpenPerson}
        onChanged={() => { reloadDetail(); onPeopleInvalidate() }}/>}
      {tab === 'config' && <EquipoConfig slug={slug} team={team} allTeams={allTeams} types={types} detail={detail}
        onChanged={() => { reloadDetail(); onTeamChanged({ ...team }) }}
        onDeleted={onTeamDeleted}/>}
      {tab === 'auto' && (
        <div className="rise rise-d2 card" style={{ borderStyle: 'dashed', padding: '52px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>
            Próximamente — automatizaciones del equipo (recordatorios, asignaciones automáticas, etc.).
          </div>
        </div>
      )}

      {editNameOpen && (
        <TeamFormModal slug={slug} initial={team} orgMembers={orgMembers} types={types} currentMemberId={currentMemberId}
          onSaved={(t: Team) => { onTeamChanged(t); setEditNameOpen(false) }}
          onClose={() => setEditNameOpen(false)}/>
      )}
    </div>
  )
}

function NavItem({ label, n, active, onClick }: { label: string; n: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 12px', borderRadius: 10, cursor: 'pointer', border: 0,
      background: active ? 'var(--accent-tint)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-2)',
      fontSize: 13.5, fontWeight: active ? 600 : 500, textAlign: 'left',
    }}>
      <span>{label}</span>
      <span style={{
        minWidth: 22, height: 20, padding: '0 7px', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, fontFamily: "'Geist Mono', monospace",
        background: active ? 'var(--accent)' : 'var(--surface-3)',
        color: active ? 'var(--on-accent)' : 'var(--text-3)',
      }}>{n}</span>
    </button>
  )
}

function EquipoMiembros({ slug, team, detail, orgMembers, currentMemberId, onOpenPerson, onChanged }: {
  slug: string; team: Team; detail: TeamDetailPayload | null;
  orgMembers: OrgMemberLite[]; currentMemberId: string | null;
  onOpenPerson: (memberId: string) => void; onChanged: () => void;
}) {
  const [view, setView] = useState<string>('all')
  const [addPosOpen, setAddPosOpen] = useState(false)
  const [addLeaderOpen, setAddLeaderOpen] = useState(false)
  const [addToPos, setAddToPos] = useState<TeamPositionInfo | null>(null)
  const [bulkEmail, setBulkEmail] = useState<TeamPerson[] | null>(null)

  if (!detail) {
    return <div className="card" style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>Cargando…</div>
  }

  const allMembers: TeamPerson[] = detail.all_members || []
  const leaders: TeamPerson[] = detail.leaders || []
  const positions: TeamPositionInfo[] = detail.positions || []
  const activeRows: TeamPerson[] = view === 'all'
    ? allMembers
    : view === 'leaders'
      ? leaders
      : (positions.find(p => p.id === view)?.members || []) as TeamPerson[]

  async function removeFromPosition(posId: string, memberId: string) {
    if (!confirm('¿Quitar esta persona de la posición?')) return
    const r = await api(`/api/v1/tenant/${slug}/teams/${team.id}/positions/${posId}/members/${memberId}`, { method: 'DELETE' })
    if (r.ok) onChanged()
  }
  async function removeLeader(memberId: string) {
    if (!confirm('¿Quitar a este líder?')) return
    const r = await api(`/api/v1/tenant/${slug}/teams/${team.id}/leaders/${memberId}`, { method: 'DELETE' })
    if (r.ok) onChanged()
  }
  async function removePosition(posId: string) {
    if (!confirm('¿Eliminar esta posición y todos sus miembros?')) return
    const r = await api(`/api/v1/tenant/${slug}/teams/${team.id}/positions/${posId}`, { method: 'DELETE' })
    if (r.ok) { onChanged(); setView('all') }
  }
  function printPDF() {
    const title = view === 'leaders' ? 'Líderes del equipo' : view === 'all' ? 'Todos los miembros del equipo' : (positions.find(p => p.id === view)?.name || 'Miembros') + ' · miembros'
    const html = `<html><head><title>${title} — ${team.name}</title><style>body{font-family:Geist,system-ui,sans-serif;padding:32px;color:#111}h1{font-size:22px;margin:0 0 6px}h2{font-size:14px;color:#666;margin:0 0 24px;font-weight:400}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #eee}th{font-weight:600;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.08em}</style></head><body><h1>${team.name}</h1><h2>${title}</h2><table><thead><tr><th>Nombre</th><th>Apellido</th><th>Email</th></tr></thead><tbody>${activeRows.map(m => { const fn = m.full_name || m.email; const [f, ...r] = fn.split(' '); return `<tr><td>${f}</td><td>${r.join(' ')}</td><td>${m.email}</td></tr>` }).join('')}</tbody></table></body></html>`
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 250)
  }

  const isLeadersView = view === 'leaders'
  const isPositionView = !!positions.find(p => p.id === view)
  const currentPos = positions.find(p => p.id === view) || null

  return (
    <div className="grid grid-12 rise rise-d2">
      <aside className="col-3">
        <div className="card" style={{ padding: 8 }}>
          <NavItem label="Todos los miembros" n={allMembers.length} active={view === 'all'} onClick={() => setView('all')} />
          <NavItem label="Líderes" n={leaders.length} active={view === 'leaders'} onClick={() => setView('leaders')} />
          <div style={{ padding: '12px 12px 6px', fontSize: 10, fontWeight: 700, letterSpacing: 0.12, textTransform: 'uppercase', color: 'var(--text-4)' }}>Posiciones</div>
          {positions.map(pos => (
            <NavItem key={pos.id} label={pos.name} n={(pos.members || []).length} active={view === pos.id} onClick={() => setView(pos.id)} />
          ))}
          <button onClick={() => setAddPosOpen(true)} style={{
            width: '100%', margin: '6px 0 0', padding: '10px 12px',
            border: '1.5px dashed var(--hairline)', borderRadius: 10, background: 'transparent',
            color: 'var(--text-3)', fontSize: 12.5, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
          }}>+ Añadir posición</button>
        </div>
      </aside>

      <section className="col-9 card">
        <div className="card-head">
          <div className="card-title">
            {isLeadersView ? 'Líderes del equipo' : view === 'all' ? 'Todos los miembros del equipo' : `${currentPos?.name} · miembros`}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn" title="Enviar correo" onClick={() => setBulkEmail(activeRows)} disabled={activeRows.length === 0}><I.Send size={14}/></button>
            <button className="icon-btn" title="Imprimir / PDF" onClick={printPDF} disabled={activeRows.length === 0}><I.Doc size={14}/></button>
            {isLeadersView && <button className="icon-btn" title="Añadir líder" onClick={() => setAddLeaderOpen(true)}><I.Plus size={14}/></button>}
            {isPositionView && currentPos && <button className="icon-btn" title="Añadir miembro" onClick={() => setAddToPos(currentPos)}><I.Plus size={14}/></button>}
            {isPositionView && currentPos && <button className="icon-btn" title="Eliminar posición" onClick={() => removePosition(currentPos.id)}><I.Trash size={14}/></button>}
          </div>
        </div>
        {activeRows.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
            {isLeadersView ? 'Este equipo aún no tiene líderes.' : isPositionView ? 'Esta posición aún no tiene miembros.' : 'Este equipo aún no tiene miembros.'}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Email</th>
                <th>Preferencias</th>
                <th style={{ width: 56, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((m, idx) => {
                const fn = m.full_name || m.email
                const [first, ...rest] = String(fn).split(' ')
                const c = ((String(m.member_id || idx).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)) % 8) + 1
                const canDelete = isLeadersView ? (leaders.length > 1 && m.member_id !== currentMemberId) : isPositionView
                return (
                  <tr key={m.member_id + idx} style={{ cursor: 'pointer' }} onClick={() => onOpenPerson(m.member_id)}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div className="av av-sm" data-c={c}>{teamInitials(fn)}</div>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{first}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{rest.join(' ')}</td>
                    <td className="mono" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{m.email}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12.5 }}>{m.preferences?.max_per_month ? `Máx. ${m.preferences.max_per_month}/mes` : 'Sin límite'}</td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      {canDelete && (
                        <button className="icon-btn" title="Quitar"
                          onClick={() => isLeadersView ? removeLeader(m.member_id) : currentPos && removeFromPosition(currentPos.id, m.member_id)}>
                          <I.X size={13}/>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {addPosOpen && (
        <AddPositionModal slug={slug} teamId={team.id}
          existingNames={positions.map(p => p.name)}
          onCreated={() => { setAddPosOpen(false); onChanged() }}
          onClose={() => setAddPosOpen(false)}/>
      )}
      {addLeaderOpen && (
        <AddLeaderModal slug={slug} teamId={team.id} orgMembers={orgMembers}
          excludedIds={new Set(leaders.map(l => l.member_id))}
          onAdded={() => { setAddLeaderOpen(false); onChanged() }}
          onClose={() => setAddLeaderOpen(false)}/>
      )}
      {addToPos && (
        <AddPersonsToPositionModal slug={slug} teamId={team.id} position={addToPos}
          orgMembers={orgMembers}
          serviceMemberIds={new Set(allMembers.map(m => m.member_id))}
          excludedIds={new Set((addToPos.members || []).map((m: any) => m.member_id))}
          onDone={() => { setAddToPos(null); onChanged() }}
          onClose={() => setAddToPos(null)}/>
      )}
      {bulkEmail && (
        <TeamBulkEmailModal slug={slug} recipients={bulkEmail} teamId={team.id}
          onClose={() => setBulkEmail(null)} onSent={() => setBulkEmail(null)}/>
      )}
    </div>
  )
}

function CfgCard({ icon: Icon, title, children }: { icon: (p: any) => JSX.Element; title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <Icon size={15} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.1, textTransform: 'uppercase', color: 'var(--text-3)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function CfgRow({ title, sub, right, last }: { title: string; sub: string; right: React.ReactNode; last?: boolean }) {
  return (
    <div className="row-between" style={{ padding: '12px 0', borderBottom: last ? 0 : '1px solid var(--separator)', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  )
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <div style={{
      width: 40, height: 23, borderRadius: 999, padding: 2, cursor: 'pointer',
      background: on ? 'var(--accent)' : 'var(--surface-3)', transition: 'background 200ms',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
    }}>
      <div style={{ width: 19, height: 19, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
    </div>
  )
}

function RadioCard({ icon: Icon, title, sub, checked }: { icon?: (p: any) => JSX.Element; title: string; sub: string; checked?: boolean }) {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: 14, borderRadius: 12, cursor: 'pointer',
      border: '1.5px solid ' + (checked ? 'var(--accent)' : 'var(--separator)'),
      background: checked ? 'var(--accent-tint)' : 'var(--surface)',
      transition: 'border-color 160ms, background 160ms',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: Icon ? 5 : 999, flexShrink: 0, marginTop: 1,
        border: '2px solid ' + (checked ? 'var(--accent)' : 'var(--hairline)'),
        background: checked ? 'var(--accent)' : 'transparent',
        display: 'grid', placeItems: 'center',
      }}>
        {checked && (Icon
          ? <I.Check size={11} {...{ style: { color: '#fff' } } as any}/>
          : <span style={{ width: 7, height: 7, borderRadius: 99, background: '#fff' }} />)}
      </div>
      <div>
        <div className="row" style={{ gap: 7 }}>
          {Icon && <Icon size={14} style={{ color: 'var(--text-2)' }} />}
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.45 }}>{sub}</div>
      </div>
    </div>
  )
}

type TeamType = 'rehearsal' | 'secure' | 'split'
type DefStatus = 'C' | 'U'
type RepliesTo = 'all_leaders' | 'all_admins' | 'team_leader'
type LastDateRule = 'service_type' | 'any' | 'team' | 'position'
type ViewerAccess = 'plan_full' | 'plan_basic' | 'none'
type RescheduleKind = 'manual' | 'no_reschedule' | 'volunteer' | 'auto_schedule' | 'signup_sheet'

function EquipoConfig({ slug, team, allTeams, types, detail, onChanged, onDeleted }: {
  slug: string; team: Team; allTeams: Team[]; types: ServiceType[]; detail: TeamDetailPayload | null;
  onChanged: () => void; onDeleted: () => void;
}) {
  const teamType: TeamType = team.is_split ? 'split' : team.is_secure ? 'secure' : 'rehearsal'
  const [type, setType] = useState<TeamType>(teamType)
  const [defStatus, setDefStatus] = useState<DefStatus>(team.default_status === 'C' ? 'C' : 'U')
  const [notify, setNotify] = useState<boolean>(team.notify_on_prepare !== false)
  const [repliesTo, setRepliesTo] = useState<RepliesTo>((team.replies_to as RepliesTo) || 'all_leaders')
  const [gapAlerts, setGapAlerts] = useState<boolean>(!!team.gap_alerts_enabled)
  const [lastDateRule, setLastDateRule] = useState<LastDateRule>((team.last_scheduled_date_rule as LastDateRule) || 'service_type')
  const [viewerAccess, setViewerAccess] = useState<ViewerAccess>((team.scheduled_viewer_access as ViewerAccess) || 'plan_full')
  const [signupAuto, setSignupAuto] = useState<boolean>(!!team.signup_sheets_auto_enable)
  const [reschedule, setReschedule] = useState<RescheduleKind>((team.reschedule_on_decline as RescheduleKind) || 'manual')
  const [typeIds, setTypeIds] = useState<string[]>(detail?.team?.service_type_ids || team.service_type_ids || [])
  const [relatedIds, setRelatedIds] = useState<string[]>(detail?.team?.related_team_ids || team.related_team_ids || [])
  const [saving, setSaving] = useState(false)
  const [pickTypeOpen, setPickTypeOpen] = useState(false)
  const [pickRelatedOpen, setPickRelatedOpen] = useState(false)
  const [defStatusOpen, setDefStatusOpen] = useState(false)
  const [repliesOpen, setRepliesOpen] = useState(false)
  const [lastDateOpen, setLastDateOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)

  useEffect(() => {
    if (!detail?.team) return
    setTypeIds(detail.team.service_type_ids || [])
    setRelatedIds(detail.team.related_team_ids || [])
  }, [detail])

  const initial = {
    type: teamType, defStatus: team.default_status === 'C' ? 'C' : 'U', notify: team.notify_on_prepare !== false,
    repliesTo: team.replies_to || 'all_leaders', gapAlerts: !!team.gap_alerts_enabled,
    lastDateRule: team.last_scheduled_date_rule || 'service_type', viewerAccess: team.scheduled_viewer_access || 'plan_full',
    signupAuto: !!team.signup_sheets_auto_enable, reschedule: team.reschedule_on_decline || 'manual',
    typeIds: (detail?.team?.service_type_ids || team.service_type_ids || []).join(','),
    relatedIds: (detail?.team?.related_team_ids || team.related_team_ids || []).join(','),
  }
  const cur = { type, defStatus, notify, repliesTo, gapAlerts, lastDateRule, viewerAccess, signupAuto, reschedule, typeIds: typeIds.join(','), relatedIds: relatedIds.join(',') }
  const dirty = JSON.stringify(initial) !== JSON.stringify(cur)

  async function save() {
    if (typeIds.length === 0) { alert('Selecciona al menos un tipo de servicio.'); return }
    setSaving(true)
    try {
      const body = {
        is_rehearsal: type === 'rehearsal', is_secure: type === 'secure', is_split: type === 'split',
        default_status: defStatus, notify_on_prepare: notify, replies_to: repliesTo,
        gap_alerts_enabled: gapAlerts, last_scheduled_date_rule: lastDateRule,
        scheduled_viewer_access: viewerAccess, signup_sheets_auto_enable: signupAuto,
        reschedule_on_decline: reschedule, service_type_ids: typeIds, related_team_ids: relatedIds,
      }
      const r = await api(`/api/v1/tenant/${slug}/teams/${team.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (r.ok) onChanged()
      else { const j = await r.json().catch(() => ({} as any)); alert(j.detail || 'Error') }
    } finally { setSaving(false) }
  }

  async function del() {
    if (!confirm(`¿Eliminar el equipo "${team.name}"? Esta acción es irreversible.`)) return
    const r = await api(`/api/v1/tenant/${slug}/teams/${team.id}`, { method: 'DELETE' })
    if (r.ok) onDeleted()
    else { const j = await r.json().catch(() => ({} as any)); alert(j.detail || 'Error') }
  }

  const DEF_STATUS_LABEL: Record<DefStatus, string> = { C: 'Confirmado', U: 'No confirmado' }
  const REPLIES_LABEL: Record<RepliesTo, string> = { all_leaders: 'Todos los líderes', all_admins: 'Todos los admin', team_leader: 'Solo líder del equipo' }
  const LAST_DATE_LABEL: Record<LastDateRule, string> = { service_type: 'Tipo de servicio', any: 'Cualquier sitio', team: 'Este equipo', position: 'Esta posición' }
  const VIEWER_LABEL: Record<ViewerAccess, string> = { plan_full: 'Plan completo', plan_basic: 'Plan básico', none: 'Sin acceso' }

  return (
    <div className="rise rise-d2">
      <div className="grid grid-12" style={{ gap: 'var(--gap)' }}>
        <div className="col-6">
          <CfgCard icon={I.Settings} title="Tipo de equipo">
            <div className="stack" style={{ gap: 10 }}>
              <div onClick={() => setType('rehearsal')}><RadioCard icon={I.Music} title="Equipo de ensayo" sub="Acceso a canciones, partituras y archivos de media del servicio." checked={type === 'rehearsal'} /></div>
              <div onClick={() => setType('secure')}><RadioCard icon={I.Lock} title="Equipo seguro" sub="Sólo personas con verificación de antecedentes podrán ser asignadas." checked={type === 'secure'} /></div>
              <div onClick={() => setType('split')}><RadioCard icon={I.People} title="Equipo dividido" sub="Permite distintas personas por franja cuando hay varios servicios el mismo día." checked={type === 'split'} /></div>
            </div>
          </CfgCard>
        </div>
        <div className="col-6">
          <CfgCard icon={I.Cal} title="Valores predeterminados de programación">
            <CfgRow title="Estado predeterminado" sub="Al crear un nuevo plan" right={
              <DropdownPicker open={defStatusOpen} setOpen={setDefStatusOpen} label={DEF_STATUS_LABEL[defStatus]}
                options={[['C', 'Confirmado'], ['U', 'No confirmado']]} onPick={v => setDefStatus(v as DefStatus)} value={defStatus}/>
            } />
            <CfgRow title="Notificar al preparar plan" sub="Enviar alerta cuando el plan esté listo" right={<div onClick={() => setNotify(n => !n)}><Toggle on={notify}/></div>} />
            <CfgRow title="Respuestas van a" sub="Destinatarios de las respuestas" right={
              <DropdownPicker open={repliesOpen} setOpen={setRepliesOpen} label={REPLIES_LABEL[repliesTo]}
                options={Object.entries(REPLIES_LABEL)} onPick={v => setRepliesTo(v as RepliesTo)} value={repliesTo}/>
            } last />
          </CfgCard>
        </div>
        <div className="col-6">
          <CfgCard icon={I.Bell} title="Alertas de huecos en programación">
            <CfgRow title="Activar alertas de huecos" sub="Avisar al líder y a la persona cuando no se confirme antes de la fecha límite" right={<div onClick={() => setGapAlerts(g => !g)}><Toggle on={gapAlerts}/></div>} last />
          </CfgCard>
        </div>
        <div className="col-6">
          <CfgCard icon={I.Filter} title="Opciones">
            <CfgRow title="Última fecha programada" sub="Cómo se registra la fecha de servicio" right={
              <DropdownPicker open={lastDateOpen} setOpen={setLastDateOpen} label={LAST_DATE_LABEL[lastDateRule]}
                options={Object.entries(LAST_DATE_LABEL)} onPick={v => setLastDateRule(v as LastDateRule)} value={lastDateRule}/>
            } />
            <CfgRow title="Acceso de espectadores" sub="Qué ve un miembro como espectador" right={
              <DropdownPicker open={viewerOpen} setOpen={setViewerOpen} label={VIEWER_LABEL[viewerAccess]}
                options={Object.entries(VIEWER_LABEL)} onPick={v => setViewerAccess(v as ViewerAccess)} value={viewerAccess}/>
            } />
            <CfgRow title="Hojas de inscripción auto." sub="Activar para nuevos planes" right={<div onClick={() => setSignupAuto(s => !s)}><Toggle on={signupAuto}/></div>} last />
          </CfgCard>
        </div>
        <div className="col-6">
          <CfgCard icon={I.Folder} title="Tipos de servicio">
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.45 }}>
              En qué tipos de servicio participa este equipo. <b style={{ color: 'var(--text-2)' }}>Mínimo 1 requerido.</b>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {typeIds.map(id => {
                const t = types.find(x => x.id === id)
                return <span key={id} className="pill-tone tone-blue" style={{ cursor: 'pointer' }} onClick={() => setTypeIds(prev => prev.filter(x => x !== id))}>{t?.name || '—'} <I.X size={11}/></span>
              })}
            </div>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPickTypeOpen(o => !o)}><I.Plus size={12}/> Añadir tipo</button>
              {pickTypeOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30, background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 10, boxShadow: 'var(--shadow-2)', padding: 6, minWidth: 240, maxHeight: 280, overflow: 'auto' }}>
                  {types.filter(t => !typeIds.includes(t.id)).length === 0
                    ? <div style={{ padding: 12, fontSize: 12, color: 'var(--text-3)' }}>No quedan tipos disponibles.</div>
                    : types.filter(t => !typeIds.includes(t.id)).map(t => (
                      <button key={t.id} onClick={() => { setTypeIds(prev => [...prev, t.id]); setPickTypeOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13 }}>{t.name}</button>
                    ))}
                </div>
              )}
            </div>
          </CfgCard>
        </div>
        <div className="col-6">
          <CfgCard icon={I.People} title="Equipos relacionados">
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.45 }}>
              Cuando los miembros usen el filtro <b style={{ color: 'var(--text-2)' }}>Mis equipos</b>, también se incluirán estos equipos.
            </div>
            {relatedIds.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'italic', marginBottom: 12 }}>Sin equipos relacionados</div>
              : <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {relatedIds.map(id => {
                    const t = allTeams.find(x => x.id === id)
                    return <span key={id} className="pill-tone tone-violet" style={{ cursor: 'pointer' }} onClick={() => setRelatedIds(prev => prev.filter(x => x !== id))}>{t?.name || '—'} <I.X size={11}/></span>
                  })}
                </div>
            }
            <div style={{ position: 'relative' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPickRelatedOpen(o => !o)}><I.Plus size={12}/> Añadir equipo</button>
              {pickRelatedOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30, background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 10, boxShadow: 'var(--shadow-2)', padding: 6, minWidth: 240, maxHeight: 280, overflow: 'auto' }}>
                  {allTeams.filter(t => t.id !== team.id && !relatedIds.includes(t.id)).length === 0
                    ? <div style={{ padding: 12, fontSize: 12, color: 'var(--text-3)' }}>No quedan equipos disponibles.</div>
                    : allTeams.filter(t => t.id !== team.id && !relatedIds.includes(t.id)).map(t => (
                      <button key={t.id} onClick={() => { setRelatedIds(prev => [...prev, t.id]); setPickRelatedOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13 }}>{t.name}</button>
                    ))}
                </div>
              )}
            </div>
          </CfgCard>
        </div>
        <div className="col-12">
          <CfgCard icon={I.Sort} title="Reagendado de rechazos">
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
              Cuando alguien rechaza una solicitud, ¿cómo debería ser reagendado?
            </div>
            <div className="grid grid-12" style={{ gap: 12 }}>
              <div className="col-6" onClick={() => setReschedule('no_reschedule')}><RadioCard title="No reagendar" sub="Los rechazos no generan ninguna acción" checked={reschedule === 'no_reschedule'} /></div>
              <div className="col-6" onClick={() => setReschedule('manual')}><RadioCard title="Reagendar manualmente" sub="Se crea una posición necesaria para asignar" checked={reschedule === 'manual'} /></div>
              <div className="col-6" onClick={() => setReschedule('volunteer')}><RadioCard title="Reemplazo voluntario" sub="La persona programada elige su sustituto" checked={reschedule === 'volunteer'} /></div>
              <div className="col-6" onClick={() => setReschedule('auto_schedule')}><RadioCard title="Auto-agenda" sub="El siguiente candidato recibe solicitud automática" checked={reschedule === 'auto_schedule'} /></div>
              <div className="col-6" onClick={() => setReschedule('signup_sheet')}><RadioCard title="Hoja de inscripción" sub="La posición abre en la hoja del equipo" checked={reschedule === 'signup_sheet'} /></div>
            </div>
          </CfgCard>
        </div>
      </div>

      <div className="row-between" style={{ marginTop: 'var(--gap)' }}>
        <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' }} onClick={del}>
          <I.Trash size={14}/> Eliminar equipo
        </button>
        <div className="row" style={{ gap: 10 }}>
          {dirty && <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>Cambios sin guardar</span>}
          <button className="btn btn-primary" disabled={!dirty || saving} onClick={save}><I.Check size={14}/> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  )
}

function DropdownPicker({ open, setOpen, label, options, onPick, value }: {
  open: boolean; setOpen: (o: boolean) => void; label: string;
  options: [string, string][]; onPick: (v: string) => void; value: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(!open)}>{label} <I.ChevDown size={11}/></button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30, background: 'var(--surface)', border: '1px solid var(--separator)', borderRadius: 10, boxShadow: 'var(--shadow-2)', padding: 6, minWidth: 200 }}>
          {options.map(([v, l]) => (
            <button key={v} onClick={() => { onPick(v); setOpen(false) }} style={{
              width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
              background: v === value ? 'var(--accent-tint)' : 'transparent',
              color: v === value ? 'var(--accent)' : 'var(--text)',
              border: 0, cursor: 'pointer', fontSize: 13,
            }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT
// ═════════════════════════════════════════════════════════════════════════════
function useSidebarMode(): ['full' | 'icons' | 'hidden', () => void] {
  const [m, setM] = useState<'full'|'icons'|'hidden'>(() => {
    if (typeof window === 'undefined') return 'full'
    const v = window.localStorage.getItem('worsyn-tenant-sidebar')
    return (v === 'icons' || v === 'hidden' || v === 'full') ? v as any : 'full'
  })
  const cycle = () => {
    const n = m === 'full' ? 'icons' : m === 'icons' ? 'hidden' : 'full'
    setM(n)
    try { window.localStorage.setItem('worsyn-tenant-sidebar', n) } catch {}
  }
  return [m, cycle]
}

function useTheme(): ['light' | 'dark', () => void] {
  const [t, setT] = useState<'light'|'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const v = window.localStorage.getItem('worsyn-tenant-theme')
    return v === 'dark' ? 'dark' : 'light'
  })
  const toggle = () => {
    const n = t === 'dark' ? 'light' : 'dark'
    setT(n)
    try { window.localStorage.setItem('worsyn-tenant-theme', n) } catch {}
  }
  return [t, toggle]
}

export default function Servicios({ tab, resetSignal }: { tab: ServiciosTab; resetSignal?: number }) {
  const { slug } = useParams<{ slug: string }>()
  const [sbMode, toggleSb] = useSidebarMode()
  const [theme, toggleTheme] = useTheme()

  const [user, setUser] = useState({ name: 'Tu nombre', role: 'Miembro', initials: '—', firstName: 'allí' })
  useEffect(() => {
    if (!slug) return
    api(`/api/v1/tenant/${slug}/auth/me`).then(r => r.ok ? r.json() : null).then(me => {
      if (!me) return
      const n = (me.full_name as string) || (me.email as string) || 'Tu nombre'
      const parts = n.split(' ').filter(Boolean)
      setUser({
        name: n,
        role: me.org_role === 'admin' ? 'Administrador' : me.org_role === 'leader' ? 'Líder' : 'Miembro',
        initials: parts.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase(),
        firstName: parts[0] || 'allí',
      })
    })
  }, [slug])

  const [selectedPerson, setSelectedPerson] = useState<any | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null)
  const [drill, setDrill] = useState<'plan' | 'song' | null>(null)
  const [typeConfig, setTypeConfig] = useState<ServiceType | null>(null)
  useEffect(() => { setSelectedPerson(null); setSelectedTeam(null); setDrill(null); setTypeConfig(null) }, [tab, resetSignal])

  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMemberLite[]>([])
  const [allTypes, setAllTypes] = useState<ServiceType[]>([])
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [songsCount, setSongsCount] = useState<number>(0)
  const [planificacionCount, setPlanificacionCount] = useState<number>(0)
  const reloadSharedData = React.useCallback(() => {
    if (!slug) return
    api(`/api/v1/tenant/${slug}/teams`).then(r => r.ok ? r.json() : []).then(setAllTeams).catch(() => {})
    api(`/api/v1/tenant/${slug}/members`).then(r => r.ok ? r.json() : []).then(setOrgMembers).catch(() => {})
    api(`/api/v1/tenant/${slug}/services/types`).then(r => r.ok ? r.json() : []).then(setAllTypes).catch(() => {})
    api(`/api/v1/tenant/${slug}/songs`).then(r => r.ok ? r.json() : []).then((x: any[]) => setSongsCount((x || []).length)).catch(() => {})
    api(`/api/v1/tenant/${slug}/auth/me`).then(r => r.ok ? r.json() : null).then(me => {
      setCurrentMemberId(me?.id || null)
      if (me?.id) {
        const today = new Date().toISOString().slice(0, 10)
        api(`/api/v1/tenant/${slug}/services/people/${me.id}/assignments?range_from=${today}`)
          .then(r => r.ok ? r.json() : null)
          .then(j => setPlanificacionCount(j?.summary?.total ?? 0))
          .catch(() => {})
      }
    }).catch(() => {})
  }, [slug])
  useEffect(() => { reloadSharedData() }, [reloadSharedData])
  const sidebarCounts: SidebarCounts = {
    planificacion: planificacionCount,
    servicios: allTypes.length,
    canciones: songsCount,
    personas: orgMembers.length,
  }

  if (tab === 'legacy') return <ServiciosLegacy tab="servicios" resetSignal={resetSignal}/>

  const org = { name: slug?.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, c => c.toUpperCase()) || 'Iglesia' }
  const labels: Record<Exclude<ServiciosTab, 'legacy'>, string> = {
    'mi-planificacion': 'Mi planificación',
    'servicios': 'Servicios',
    'canciones': 'Canciones',
    'media': 'Media',
    'personas': 'Personas',
    'mensajes': 'Mensajes',
  }
  const crumbs = ['Iglesia', labels[tab as Exclude<ServiciosTab, 'legacy'>]]
  if (tab === 'servicios' && drill === 'plan') crumbs.push('Servicio Dominical · 31 May')
  if (tab === 'servicios' && typeConfig) crumbs.push(typeConfig.name + ' · Configuración')
  if (tab === 'canciones' && drill === 'song') crumbs.push('Maravilloso es')
  if (tab === 'personas' && selectedPerson) crumbs.push(selectedPerson.full_name || selectedPerson.email)
  if (tab === 'personas' && selectedTeam) crumbs.push(selectedTeam.name)

  const nav = (id: ServiciosTab) => {
    setSelectedPerson(null); setSelectedTeam(null); setDrill(null)
    window.location.assign(`/portal/${slug}/servicios/${id}`)
  }

  return (
    <div className="tenant-v2" data-theme={theme} data-style="clean"
      style={{ position: 'fixed', inset: 0, zIndex: 50, overflow: 'auto' }}>
      <div className="app" data-sb={sbMode}>
        <Sidebar route={tab} onNav={nav} sb={sbMode} onSbToggle={toggleSb} user={user} org={org} counts={sidebarCounts}/>
        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar crumbs={crumbs} onSbToggle={toggleSb} onTheme={toggleTheme} theme={theme}/>
          {tab === 'mi-planificacion' && <MiPlanificacion userFirstName={user.firstName} onOpenPlan={() => { setDrill('plan'); window.location.assign(`/portal/${slug}/servicios/servicios`) }}/>}
          {tab === 'servicios' && (
            drill === 'plan'
              ? <PlanDetail onBack={() => setDrill(null)}/>
              : typeConfig
                ? <ServiceTypeConfigView slug={slug!} type={typeConfig} teams={allTeams}
                    onBack={() => setTypeConfig(null)}
                    onChanged={(t: ServiceType) => { setTypeConfig(t); reloadSharedData() }}
                    onDeleted={() => { setTypeConfig(null); reloadSharedData() }}/>
                : <ServiciosList slug={slug!} teams={allTeams}
                    onOpenPlan={() => setDrill('plan')}
                    onOpenTypeConfig={t => setTypeConfig(t)}
                    onChanged={reloadSharedData}/>
          )}
          {tab === 'canciones' && (drill === 'song' ? <CancionDetail onBack={() => setDrill(null)}/> : <Canciones onOpenSong={() => setDrill('song')}/>)}
          {tab === 'media' && <Media/>}
          {tab === 'mensajes' && <Mensajes/>}
          {tab === 'personas' && (
            selectedPerson
              ? <PersonaDetail slug={slug!} person={selectedPerson} allTeams={allTeams}
                  onBack={() => setSelectedPerson(null)}
                  onChanged={(p: ServicePerson) => setSelectedPerson(p)}/>
              : selectedTeam
                ? <EquipoDetail slug={slug!} team={selectedTeam} allTeams={allTeams}
                    orgMembers={orgMembers} types={allTypes} currentMemberId={currentMemberId}
                    onBack={() => setSelectedTeam(null)}
                    onTeamChanged={(t: Team) => { setSelectedTeam(t); reloadSharedData() }}
                    onTeamDeleted={() => { setSelectedTeam(null); reloadSharedData() }}
                    onPeopleInvalidate={reloadSharedData}
                    onOpenPerson={(memberId: string) => {
                      api(`/api/v1/tenant/${slug}/services/people`).then(r => r.ok ? r.json() : []).then((ppl: any[]) => {
                        const p = ppl.find(x => x.member_id === memberId || x.id === memberId)
                        if (p) { setSelectedTeam(null); setSelectedPerson(p) }
                      })
                    }} />
                : <Personas slug={slug!} allTeams={allTeams}
                    onOpenPerson={setSelectedPerson}
                    onOpenTeam={setSelectedTeam}/>
          )}
        </main>
      </div>
    </div>
  )
}
