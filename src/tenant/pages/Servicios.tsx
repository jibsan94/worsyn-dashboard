// Worsyn V2 — 1:1 port of /mnt/Worsyn-handoff prototype.
// Renders: Sidebar + Topbar + 7 screens (MiPlanificacion, Servicios list, PlanDetail
// with 6 tabs, Canciones with arrangement drawer, CancionDetail with Letras/Presentación,
// Media, Personas with Miembros/Equipos tabs, PersonaDetail).
//
// Strict HARD-RULE compliance: match prototype exactly, no improvisation.
// Real `/api/v1/tenant/{slug}/...` endpoints wired where they exist; the prototype's
// mock data fills the rest until the matching backend lands.

import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ServiciosLegacy from './ServiciosLegacy'
import { I } from '../components/IconsV2'
import '../styles/tenant.css'

type ServiciosTab = 'mi-planificacion' | 'servicios' | 'canciones' | 'media' | 'personas' | 'legacy'

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
        { id: 'a1-1', name: 'Original',           isOriginal: true,  by: 'Marcos Witt', key: 'D', bpm: 78, meter: '4/4', length: '4:38', sequence: 'I–V1–C–V2–C–P×2–C', files: ['Letra', 'Acordes', 'Multipista'] },
        { id: 'a1-2', name: 'Versión dominical',  isOriginal: false, by: 'Lucía H.',    key: 'D', bpm: 74, meter: '4/4', length: '5:10', sequence: 'I–V1–C–V2–C–P', files: ['Letra', 'Acordes'] },
        { id: 'a1-3', name: 'Acústico (Jóvenes)', isOriginal: false, by: 'Diego R.',    key: 'C', bpm: 72, meter: '4/4', length: '4:05', sequence: 'V1–C–P', files: ['Acordes'] },
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
function Sidebar({ route, onNav, sb, onSbToggle, user, org }: {
  route: ServiciosTab; onNav: (id: ServiciosTab) => void
  sb: 'full' | 'icons' | 'hidden'; onSbToggle: () => void
  user: { name: string; role: string; initials: string }; org: { name: string }
}) {
  const links: { id: ServiciosTab; label: string; icon: (p: { size?: number }) => JSX.Element; ind?: string }[] = [
    { id: 'mi-planificacion', label: 'Mi planificación', icon: I.Home,  ind: '3' },
    { id: 'servicios',        label: 'Servicios',        icon: I.Cal,   ind: '4' },
    { id: 'canciones',        label: 'Canciones',        icon: I.Music, ind: '128' },
    { id: 'media',            label: 'Media',            icon: I.Photo },
    { id: 'personas',         label: 'Personas',         icon: I.People, ind: '248' },
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
function ServiciosList({ onOpenPlan }: { onOpenPlan: () => void }) {
  const statusTone: Record<string, { c: string; bg: string }> = {
    'Publicado':  { c: 'var(--success)', bg: 'var(--accent-2-tint)' },
    'Borrador':   { c: 'var(--text-3)',  bg: 'var(--surface-3)' },
    'Sin equipo': { c: 'var(--danger)',  bg: 'color-mix(in oklab, var(--danger) 14%, transparent)' },
    'Reclutando': { c: 'var(--warning)', bg: 'color-mix(in oklab, var(--warning) 14%, transparent)' },
  }
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
          <button className="btn btn-primary"><I.Plus size={14}/> Nuevo servicio</button>
        </div>
      </div>
      <div className="grid grid-12 rise rise-d2">
        {D.serviceTypes.map(st => (
          <article key={st.id} className="col-6 card" style={{ overflow: 'hidden' }}>
            <div className="svc-ribbon" style={{ background: `linear-gradient(135deg, ${st.color}, color-mix(in oklab, ${st.color} 70%, #000))` }}>
              <div className="svc-ribbon-deco"/>
              <div className="svc-ribbon-deco b"/>
              <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
                <div className="svc-ribbon-sub">{st.rec}</div>
                <div className="svc-ribbon-title">{st.name}</div>
              </div>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div className="display-serif" style={{ fontSize: 36, lineHeight: 1, color: '#fff' }}>{st.instances.length}</div>
                <div className="mono" style={{ fontSize: 9.5, letterSpacing: 0.16, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>próximos</div>
              </div>
            </div>
            <div className="row" style={{ gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--separator)', flexWrap: 'wrap' }}>
              {st.times.map(t => <span key={t} className="chip"><I.Clock size={11}/>{t}</span>)}
              <span style={{ flex: 1 }}/>
              <button className="btn btn-ghost btn-sm"><I.Settings size={12}/> Configurar tipo</button>
            </div>
            <div>
              {st.instances.map(inst => {
                const tn = statusTone[inst.status] || statusTone['Borrador']
                return (
                  <div key={inst.id} className="svc-instance" onClick={onOpenPlan}>
                    <div className="svc-instance-date" style={{ ['--tone' as any]: st.color }}>
                      <div className="m" style={{ color: st.color }}>{inst.dow}</div>
                      <div className="d">{inst.date.split(' ')[0]}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{(inst as any).special || st.name}</div>
                        <span style={{ height: 22, padding: '0 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: tn.bg, color: tn.c, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 5, height: 5, borderRadius: 99, background: 'currentColor' }}/>
                          {inst.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                        {inst.date} · {inst.time}
                        {inst.teamTotal > 0 && <> · {inst.teamConfirmed}/{inst.teamTotal} confirmados</>}
                        {inst.leader && inst.leader !== 'Por asignar' && <> · {inst.leader}</>}
                        {inst.leader === 'Por asignar' && <> · <span style={{ color: 'var(--danger)' }}>sin líder</span></>}
                      </div>
                      {inst.teamTotal > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', height: 4, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden', maxWidth: 220 }}>
                          <div style={{ width: `${(inst.teamConfirmed/inst.teamTotal)*100}%`, background: st.color }}/>
                        </div>
                      )}
                    </div>
                    <span className="list-chev"><I.Chev/></span>
                  </div>
                )
              })}
              <div className="row" style={{ padding: '10px 18px', borderTop: '1px solid var(--separator)', background: 'var(--surface-2)' }}>
                <button className="btn btn-ghost btn-sm"><I.Plus size={12}/> Nuevo {st.name.toLowerCase()}</button>
                <span style={{ flex: 1 }}/>
                <button className="btn btn-ghost btn-sm">Ver todos <I.Chev size={12}/></button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
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

function CancionDetail({ onBack }: { onBack: () => void }) {
  const s = D.songs[0]
  const [arr, setArr] = useState<(typeof s.arrangements)[number] | null>(s.arrangements[0] || null)
  const [mode, setMode] = useState<'chords' | 'lyrics' | 'sheet' | 'present'>('chords')
  const lyrics = s.lyrics || []
  return (
    <div className="content">
      <div className="page-head rise">
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}><I.ChevLeft size={13}/> Canciones</button>
            <span className="chip t-accent"><I.Star size={11}/> Favorita</span>
            <span className="chip t-mono">Adoración</span>
          </div>
          <h1 className="page-title">{s.title}</h1>
          <p className="page-sub">{s.author} · CCLI {s.ccli} · Última edición {s.updated}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Heart size={14}/></button>
          <button className="btn btn-secondary"><I.Edit size={14}/> Editar</button>
          <button className="btn btn-primary"><I.Plus size={14}/> Añadir a servicio</button>
        </div>
      </div>
      <div className="grid grid-12 rise rise-d1">
        <section className="col-8 card">
          <div style={{ padding: '28px 24px', background: 'linear-gradient(135deg, var(--accent-tint), transparent), var(--surface-2)', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ width: 92, height: 92, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--separator)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-2)' }}>
              <div className="display-serif" style={{ fontSize: 64, color: 'var(--accent)', lineHeight: 1 }}>{arr ? arr.key : s.key}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                <span className="pill-tone tone-blue"><span className="chip-dot"/>{arr ? arr.name : 'Original'}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{arr && arr.isOriginal ? 'Arreglo original' : arr ? 'por ' + arr.by : ''}</span>
              </div>
              <div className="row" style={{ gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.1, textTransform: 'uppercase' }}>Tono</div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <button className="btn btn-secondary btn-sm" style={{ minWidth: 28, padding: 0, height: 28, justifyContent: 'center' }}>−</button>
                    <div className="display-serif" style={{ fontSize: 30, minWidth: 30, textAlign: 'center', lineHeight: 1 }}>{arr ? arr.key : s.key}</div>
                    <button className="btn btn-secondary btn-sm" style={{ minWidth: 28, padding: 0, height: 28, justifyContent: 'center' }}>+</button>
                  </div>
                </div>
                <div><div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.1, textTransform: 'uppercase' }}>BPM</div><div className="display-serif" style={{ fontSize: 30, lineHeight: 1, marginTop: 4 }}>{arr ? arr.bpm : s.bpm}</div></div>
                <div><div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.1, textTransform: 'uppercase' }}>Duración</div><div className="display-serif" style={{ fontSize: 30, lineHeight: 1, marginTop: 4 }}>{arr ? arr.length : '4:38'}</div></div>
                <div><div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.1, textTransform: 'uppercase' }}>Compás</div><div className="display-serif" style={{ fontSize: 30, lineHeight: 1, marginTop: 4 }}>{arr ? arr.meter : '4/4'}</div></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <button className="btn btn-primary btn-lg" style={{ width: 56, height: 56, padding: 0, borderRadius: '50%', justifyContent: 'center' }}><I.Play size={20}/></button>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>1:24 / 4:38</div>
            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div className="row-between" style={{ marginBottom: 14 }}>
              <div className="row" style={{ gap: 8 }}>
                <div className="seg">
                  <button onClick={() => setMode('chords')}  className={'seg-btn' + (mode === 'chords' ? ' is-active' : '')}>Letra + Acordes</button>
                  <button onClick={() => setMode('lyrics')}  className={'seg-btn' + (mode === 'lyrics' ? ' is-active' : '')}>Solo letra</button>
                  <button onClick={() => setMode('sheet')}   className={'seg-btn' + (mode === 'sheet' ? ' is-active' : '')}>Partitura</button>
                  <button onClick={() => setMode('present')} className={'seg-btn' + (mode === 'present' ? ' is-active' : '')}>Presentación</button>
                </div>
              </div>
              {mode === 'present'
                ? <button className="btn btn-primary btn-sm"><I.Play size={13}/> Enviar a proyección</button>
                : <button className="btn btn-secondary btn-sm"><I.Eye size={13}/> Vista músico</button>}
            </div>
            {mode === 'present' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', marginBottom: 16, borderRadius: 12, background: 'var(--accent-tint)', border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <I.Sparkles size={15}/>
                  <div>Cada sección es una <b>diapositiva</b>. Este apartado se sincroniza con la <b>app de proyección de letras</b> de la iglesia — el operador solo avanza las diapositivas en vivo.</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {lyrics.map((sec, i) => (
                    <div key={i} className="lyric-slide">
                      <div className="lyric-slide-label">{sec.section}</div>
                      <div className="lyric-slide-num">{i + 1}/{lyrics.length}</div>
                      <div>{sec.lines.map((ln, j) => <div key={j} className="lyric-slide-line">{ln}</div>)}</div>
                    </div>
                  ))}
                  <button style={{ aspectRatio: '16 / 9', borderRadius: 'var(--radius-md)', border: '1px dashed var(--hairline)', background: 'transparent', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                    <I.Plus size={18}/> Añadir diapositiva
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 14, lineHeight: mode === 'lyrics' ? 1.8 : 2.1, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
{mode === 'lyrics'
? `Verso 1
Maravilloso es tu nombre
Cantaremos por siempre
De tu gracia sin medida
Renacemos cada día

Coro
Santo, santo, santo
Tú eres el cordero
Digno de toda gloria
Por la eternidad

Puente (x2)
Inunda este lugar
Con tu presencia, Señor`
: `[Verso 1]
   D                A
Maravilloso es tu nombre
   Bm              G
Cantaremos por siempre
   D              A
De tu gracia sin medida
   G              D
Renacemos cada día

[Coro]
G        D       A
Santo, santo, santo
G        D       A
Tu eres el cordero
G        D
Digno de toda gloria
   Bm    A    D
Por la eternidad

[Puente] (x2)
   Em              G
Inunda este lugar
   D               A
Con tu presencia, Señor`}
              </div>
            )}
          </div>
        </section>
        <aside className="col-4 stack" style={{ gap: 'var(--gap)' }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Versiones / Arreglos</div>
              <span className="chip t-mono">{s.arrangements.length}</span>
            </div>
            <div>
              {s.arrangements.map(a => (
                <div key={a.id} className="list-row" style={{ borderRadius: 0, cursor: 'pointer', background: arr && arr.id === a.id ? 'var(--accent-tint)' : 'transparent' }} onClick={() => setArr(a)}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: arr && arr.id === a.id ? 'var(--accent)' : 'var(--surface-3)', color: arr && arr.id === a.id ? 'var(--on-accent)' : 'var(--text-2)', fontWeight: 700, fontSize: 14 }}>{a.key}</div>
                  <div className="list-body">
                    <div className="row" style={{ gap: 6 }}>
                      <div className="list-title" style={{ fontSize: 13 }}>{a.name}</div>
                      {a.isOriginal && <span className="pill-tone tone-blue" style={{ height: 18, fontSize: 10 }}>Original</span>}
                    </div>
                    <div className="list-sub">{a.bpm} bpm · {a.meter} · {a.length}{!a.isOriginal && ' · ' + a.by}</div>
                  </div>
                  {arr && arr.id === a.id && <I.Check size={15}/>}
                </div>
              ))}
              <button className="list-row" style={{ width: '100%', textAlign: 'left' as const, borderRadius: 0, border: 0, color: 'var(--accent)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-tint)', display: 'grid', placeItems: 'center' }}><I.Plus size={15}/></div>
                <div className="list-body"><div className="list-title" style={{ fontSize: 13, color: 'var(--accent)' }}>Crear nueva versión</div></div>
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Recursos</div></div>
            <div>
              {[
                { Icon: I.Doc,   t: 'Letra.docx',         meta: '14 KB' },
                { Icon: I.Music, t: 'Mp3 original.mp3',   meta: '4:38 · 6.4 MB' },
                { Icon: I.Doc,   t: 'Acordes (PDF)',      meta: '2 páginas · 240 KB' },
                { Icon: I.Doc,   t: 'Multipista (.zip)',  meta: '8 pistas · 84 MB' },
              ].map((r, i) => (
                <div key={i} className="list-row" style={{ borderRadius: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', color: 'var(--text-2)' }}><r.Icon size={14}/></div>
                  <div className="list-body">
                    <div className="list-title" style={{ fontSize: 13 }}>{r.t}</div>
                    <div className="list-sub">{r.meta}</div>
                  </div>
                  <button className="icon-btn"><I.Down size={14}/></button>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Últimos servicios</div></div>
            <div>
              {[
                { d: '24 May 2026', s: 'Servicio Dominical', who: 'Lucía' },
                { d: '17 May 2026', s: 'Servicio Dominical', who: 'Diego' },
                { d: '10 May 2026', s: 'Jóvenes', who: 'Diego' },
                { d: '03 May 2026', s: 'Servicio Dominical', who: 'Lucía' },
              ].map((h, i) => (
                <div key={i} className="list-row" style={{ borderRadius: 0 }}>
                  <div className="list-body">
                    <div className="list-title" style={{ fontSize: 13 }}>{h.s}</div>
                    <div className="list-sub">{h.d} · {h.who}</div>
                  </div>
                  <span className="list-chev"><I.Chev/></span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MEDIA (port screens-b.jsx::Media)
// ═════════════════════════════════════════════════════════════════════════════
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

function Personas({ slug, onOpenPerson }: { slug: string; onOpenPerson: (p: UiPersona) => void }) {
  const [data, setData] = useState<UiPersona[]>([])
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
    })
  }, [slug])
  const [tab, setTab] = useState<'miembros' | 'equipos'>('miembros')
  const [search, setSearch] = useState('')
  const [fRole, setFRole] = useState('')
  const [fActive, setFActive] = useState('')
  const [fTeam, setFTeam] = useState('')
  const [view, setView] = useState<'list' | 'grid'>('list')

  const teams = useMemo(() => Array.from(new Set(data.map(p => p.team))), [data])
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

  const totalTeams = teams.length

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
            <FilterSelect value={fTeam}   onChange={setFTeam}   options={[{v:'',l:'Todos los equipos'}, ...teams.map(t => ({v:t,l:t}))]}/>
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
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onOpenPerson(p)}>
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
              <button key={p.id} onClick={() => onOpenPerson(p)} className="lift" style={{ background: 'var(--surface-2)', border: '1px solid var(--separator)', borderRadius: 14, padding: 16, textAlign: 'left' as const, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            {teams.map((tname, ti) => {
              const members = data.filter(p => p.team === tname)
              const activeCount = members.filter(p => p.active).length
              const leader = members.find(p => p.role === 'leader') || members.find(p => p.role === 'admin')
              const colors = ['#0A84FF','#AF52DE','#FF9500','#FF2D55','#5AC8FA','#34C759','#FFD60A']
              const color = colors[ti % colors.length]
              return (
                <div key={tname} className="card lift" style={{ padding: 18, cursor: 'pointer' }}>
                  <div className="row-between" style={{ marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '1F', color, display: 'grid', placeItems: 'center' }}><I.People size={18}/></div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.08, textTransform: 'uppercase' }}>{members.length} miembros</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>{tname}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{leader ? <>Líder · {leader.name}</> : 'Sin líder asignado'}</div>
                  <div className="av-stack" style={{ marginTop: 14 }}>
                    {members.slice(0,5).map(p => (
                      <div key={p.id} className="av av-sm" data-c={p.c} title={p.name}>{PersonaInitials(p.name)}</div>
                    ))}
                    {members.length > 5 && (
                      <div className="av av-sm" style={{ background: 'var(--surface-3)', color: 'var(--text-3)', border: '2px solid var(--surface)' }}>+{members.length - 5}</div>
                    )}
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--separator)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="chip t-success" style={{ height: 20, fontSize: 10.5 }}>
                      <span className="chip-dot" style={{ background: 'currentColor' }}/>{activeCount} activos
                    </span>
                    <span style={{ flex: 1 }}/>
                    <span className="list-chev"><I.Chev size={14}/></span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
      )}
    </div>
  )
}

function PersonaDetail({ persona, onBack }: { persona: UiPersona; onBack: () => void }) {
  const p = persona
  return (
    <div className="content route-enter">
      <div className="page-head rise">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}><I.ChevLeft size={13}/> Personas</button>
            <span className={'chip ' + (p.role === 'admin' ? 't-accent' : p.role === 'leader' ? 't-info' : 't-mono')}>{ROLE_LABEL[p.role]}</span>
            <span className={'chip ' + (p.active ? 't-success' : '')}>
              <span className="chip-dot" style={{ background: p.active ? 'currentColor' : 'var(--text-4)' }}/>
              {p.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <h1 className="page-title">{p.name.split(' ')[0]} <em>{p.name.split(' ').slice(1).join(' ')}</em></h1>
          <p className="page-sub mono" style={{ fontSize: 13 }}>{p.email}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><I.Send size={14}/> Mensaje</button>
          <button className="btn btn-secondary"><I.Edit size={14}/> Editar</button>
        </div>
      </div>
      <div className="grid grid-12 rise rise-d2">
        <section className="col-4 card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', gap: 14 }}>
          <div className="av" data-c={p.c} style={{ width: 84, height: 84, fontSize: 28, borderRadius: 22 }}>{PersonaInitials(p.name)}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{p.team}</div>
          </div>
          <div className="divider" style={{ width: '100%' }}/>
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center' }}>
            <div><div className="display-sans" style={{ fontSize: 22 }}>12</div><div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase' }}>Servicios</div></div>
            <div><div className="display-sans" style={{ fontSize: 22 }}>94<span style={{ color: 'var(--text-3)', fontSize: 14 }}>%</span></div><div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase' }}>Confirmados</div></div>
          </div>
        </section>
        <section className="col-8 card">
          <div className="card-head"><div className="card-title">Información</div></div>
          <div>
            {[
              { l: 'Email',           v: p.email, mono: true },
              { l: 'Teléfono',        v: p.phone, mono: true },
              { l: 'Equipo',          v: p.team },
              { l: 'Rol',             v: ROLE_LABEL[p.role] },
              { l: 'Última actividad', v: p.lastSeen },
              { l: 'Alta',            v: p.joined, mono: true },
            ].map((r, i) => (
              <div key={i} className="list-row" style={{ borderRadius: 0 }}>
                <div className="list-body" style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{r.l}</div>
                  <div className={r.mono ? 'mono' : ''} style={{ fontSize: 13.5 }}>{r.v}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
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

  const [selectedPerson, setSelectedPerson] = useState<UiPersona | null>(null)
  const [drill, setDrill] = useState<'plan' | 'song' | null>(null)
  useEffect(() => { setSelectedPerson(null); setDrill(null) }, [tab, resetSignal])

  if (tab === 'legacy') return <ServiciosLegacy tab="servicios" resetSignal={resetSignal}/>

  const org = { name: slug?.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, c => c.toUpperCase()) || 'Iglesia' }
  const labels: Record<Exclude<ServiciosTab, 'legacy'>, string> = {
    'mi-planificacion': 'Mi planificación',
    'servicios': 'Servicios',
    'canciones': 'Canciones',
    'media': 'Media',
    'personas': 'Personas',
  }
  const crumbs = ['Iglesia', labels[tab as Exclude<ServiciosTab, 'legacy'>]]
  if (tab === 'servicios' && drill === 'plan') crumbs.push('Servicio Dominical · 31 May')
  if (tab === 'canciones' && drill === 'song') crumbs.push('Maravilloso es')
  if (tab === 'personas' && selectedPerson) crumbs.push(selectedPerson.name)

  const nav = (id: ServiciosTab) => {
    setSelectedPerson(null); setDrill(null)
    window.location.assign(`/portal/${slug}/servicios/${id}`)
  }

  return (
    <div className="tenant-v2" data-theme={theme} data-style="clean"
      style={{ position: 'fixed', inset: 0, zIndex: 50, overflow: 'auto' }}>
      <div className="app" data-sb={sbMode}>
        <Sidebar route={tab} onNav={nav} sb={sbMode} onSbToggle={toggleSb} user={user} org={org}/>
        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar crumbs={crumbs} onSbToggle={toggleSb} onTheme={toggleTheme} theme={theme}/>
          {tab === 'mi-planificacion' && <MiPlanificacion userFirstName={user.firstName} onOpenPlan={() => { setDrill('plan'); window.location.assign(`/portal/${slug}/servicios/servicios`) }}/>}
          {tab === 'servicios' && (drill === 'plan' ? <PlanDetail onBack={() => setDrill(null)}/> : <ServiciosList onOpenPlan={() => setDrill('plan')}/>)}
          {tab === 'canciones' && (drill === 'song' ? <CancionDetail onBack={() => setDrill(null)}/> : <Canciones onOpenSong={() => setDrill('song')}/>)}
          {tab === 'media' && <Media/>}
          {tab === 'personas' && (selectedPerson ? <PersonaDetail persona={selectedPerson} onBack={() => setSelectedPerson(null)}/> : <Personas slug={slug!} onOpenPerson={setSelectedPerson}/>)}
        </main>
      </div>
    </div>
  )
}
