// 1:1 port of /mnt/Worsyn/src/icons.jsx
import React from 'react'

interface P { size?: number; fill?: boolean }

const wrap = (children: React.ReactNode, size = 18, fill = false): React.ReactElement => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >{children}</svg>
)

export const I = {
  Wave: ({ size = 18 }: P) => (
    <svg width={size} height={size} viewBox="0 0 44 32">
      <rect x="0"    y="2"  width="7" height="28" rx="3.5" fill="currentColor"/>
      <rect x="10"   y="16" width="7" height="14" rx="3.5" fill="currentColor"/>
      <rect x="18.5" y="8"  width="7" height="22" rx="3.5" fill="currentColor"/>
      <rect x="27"   y="16" width="7" height="14" rx="3.5" fill="currentColor"/>
      <rect x="37"   y="2"  width="7" height="28" rx="3.5" fill="currentColor"/>
    </svg>
  ),
  Home:    (p: P = {}) => wrap(<path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>, p.size, p.fill),
  Cal:     (p: P = {}) => wrap(<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></>, p.size, p.fill),
  Music:   (p: P = {}) => wrap(<><path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></>, p.size, p.fill),
  Photo:   (p: P = {}) => wrap(<><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M3 17l5-5 5 4 3-3 5 5"/></>, p.size, p.fill),
  People:  (p: P = {}) => wrap(<><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.8"/><path d="M15 14c3 0 5.5 2 6 5"/></>, p.size, p.fill),
  Book:    (p: P = {}) => wrap(<><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3z"/><path d="M4 4v17"/></>, p.size, p.fill),
  Settings:(p: P = {}) => wrap(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>, p.size, p.fill),
  Search:  (p: P = {}) => wrap(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>, p.size, p.fill),
  Plus:    (p: P = {}) => wrap(<path d="M12 5v14M5 12h14"/>, p.size, p.fill),
  Check:   (p: P = {}) => wrap(<path d="M5 12l5 5L20 7"/>, p.size, p.fill),
  X:       (p: P = {}) => wrap(<path d="M6 6l12 12M18 6L6 18"/>, p.size, p.fill),
  Chev:    (p: P = {}) => wrap(<path d="M9 6l6 6-6 6"/>, p.size, p.fill),
  ChevDown:(p: P = {}) => wrap(<path d="M6 9l6 6 6-6"/>, p.size, p.fill),
  ChevLeft:(p: P = {}) => wrap(<path d="M15 6l-6 6 6 6"/>, p.size, p.fill),
  Bell:    (p: P = {}) => wrap(<><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1z"/><path d="M10 21a2 2 0 0 0 4 0"/></>, p.size, p.fill),
  Pin:     (p: P = {}) => wrap(<path d="M12 22v-7M8 3h8l-1 7h2l-3 5H10l-3-5h2z"/>, p.size, p.fill),
  Clock:   (p: P = {}) => wrap(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, p.size, p.fill),
  Play:    (p: P = {}) => wrap(<path d="M8 5v14l11-7z" fill="currentColor"/>, p.size, true),
  Pause:   (p: P = {}) => wrap(<><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor"/></>, p.size, true),
  Filter:  (p: P = {}) => wrap(<path d="M4 6h16M7 12h10M10 18h4"/>, p.size, p.fill),
  Sort:    (p: P = {}) => wrap(<path d="M3 6h13M3 12h9M3 18h5M17 8l4-4 4 4M21 4v16"/>, p.size, p.fill),
  Sun:     (p: P = {}) => wrap(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></>, p.size, p.fill),
  Moon:    (p: P = {}) => wrap(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>, p.size, p.fill),
  Mic:     (p: P = {}) => wrap(<><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>, p.size, p.fill),
  Drum:    (p: P = {}) => wrap(<><ellipse cx="12" cy="7" rx="9" ry="3"/><path d="M3 7v8c0 1.7 4 3 9 3s9-1.3 9-3V7"/><path d="M7 9l2 4M17 9l-2 4M12 10v4"/></>, p.size, p.fill),
  Guitar:  (p: P = {}) => wrap(<><circle cx="9" cy="15" r="6"/><path d="M13 11l9-9M15 9l2 2M11 13l2 2"/></>, p.size, p.fill),
  Folder:  (p: P = {}) => wrap(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>, p.size, p.fill),
  Doc:     (p: P = {}) => wrap(<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></>, p.size, p.fill),
  Heart:   (p: P = {}) => wrap(<path d="M20.8 6.4a5.4 5.4 0 0 0-8.8-1.6 5.4 5.4 0 0 0-8.8 6.5l8.8 9.7 8.8-9.7a5.4 5.4 0 0 0 0-4.9z"/>, p.size, p.fill),
  Star:    (p: P = {}) => wrap(<path d="M12 2.5l3 6.4 7 .9-5.2 4.8 1.4 7L12 18.2 5.8 21.6l1.4-7L2 9.8l7-.9z"/>, p.size, p.fill),
  Send:    (p: P = {}) => wrap(<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>, p.size, p.fill),
  Edit:    (p: P = {}) => wrap(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>, p.size, p.fill),
  Trash:   (p: P = {}) => wrap(<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>, p.size, p.fill),
  Eye:     (p: P = {}) => wrap(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>, p.size, p.fill),
  Sparkles:(p: P = {}) => wrap(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 4l.8 2.2L22 7l-2.2.8L19 10l-.8-2.2L16 7l2.2-.8zM5 16l.6 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5z"/>, p.size, p.fill),
  Sidebar: (p: P = {}) => wrap(<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></>, p.size, p.fill),
  Menu:    (p: P = {}) => wrap(<path d="M4 7h16M4 12h16M4 17h16"/>, p.size, p.fill),
  Arrow:   (p: P = {}) => wrap(<path d="M5 12h14M13 5l7 7-7 7"/>, p.size, p.fill),
  Dots:    (p: P = {}) => wrap(<><circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/></>, p.size, true),
  Dots2:   (p: P = {}) => wrap(<><circle cx="12" cy="6" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="18" r="1.4" fill="currentColor"/></>, p.size, true),
  Grip:    (p: P = {}) => wrap(<><circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/></>, p.size, true),
  Building:(p: P = {}) => wrap(<><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01"/></>, p.size, p.fill),
  Inbox:   (p: P = {}) => wrap(<><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></>, p.size, p.fill),
  Upload:  (p: P = {}) => wrap(<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>, p.size, p.fill),
  Down:    (p: P = {}) => wrap(<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>, p.size, p.fill),
  Mail:    (p: P = {}) => wrap(<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>, p.size, p.fill),
  Tag:     (p: P = {}) => wrap(<><path d="M20.6 13.4L13 21 3 11V3h8z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></>, p.size, p.fill),
  Lock:    (p: P = {}) => wrap(<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>, p.size, p.fill),
  User:    (p: P = {}) => wrap(<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>, p.size, p.fill),
  Logout:  (p: P = {}) => wrap(<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>, p.size, p.fill),
  Command: (p: P = {}) => wrap(<path d="M9 6a3 3 0 1 1-3 3h12a3 3 0 1 1-3-3v12a3 3 0 1 1 3-3H6a3 3 0 1 1 3 3z"/>, p.size, p.fill),
  Bolt:    (p: P = {}) => wrap(<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>, p.size, p.fill),
  Globe:   (p: P = {}) => wrap(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>, p.size, p.fill),
  List:    (p: P = {}) => wrap(<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>, p.size, p.fill),
  Grid:    (p: P = {}) => wrap(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>, p.size, p.fill),
  Power:   (p: P = {}) => wrap(<><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></>, p.size, p.fill),
  Print:   (p: P = {}) => wrap(<><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></>, p.size, p.fill),
}
export default I
