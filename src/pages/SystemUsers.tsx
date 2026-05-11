import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface AdminUser {
  id: string
  username: string
  email: string
  full_name: string | null
  role: 'user' | 'admin' | 'owner'
  is_active: boolean
  must_change_password: boolean
  created_at: string
  last_login_at: string | null
}

const ROLE_TAG: Record<string, string> = {
  owner: 't-danger',
  admin: 't-warning',
  user: 't-info',
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  user: 'Usuario',
}

export default function SystemUsers() {
  const { token } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setUsers(data); setLoading(false) })
      .catch(() => { setError('No se pudo cargar la lista de usuarios.'); setLoading(false) })
  }, [token])

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Gestión</span>
          <h1 className="hero-title"><span className="accent">Usuarios del Sistema</span></h1>
          <p className="hero-sub">Operadores de la plataforma Worsyn con acceso al panel de administración.</p>
        </div>
      </section>

      <div className="grid">
        <section className="col-12 card">
          <div className="card-head">
            <div className="card-title-wrap">
              <span className="eyebrow">admin_users</span>
              <h2 className="card-title">Usuarios del panel</h2>
            </div>
            <span className="tag t-ok">Activo</span>
          </div>

          {loading && (
            <p style={{ color: 'var(--t-muted)', fontSize: 14, margin: 0 }}>Cargando…</p>
          )}

          {error && (
            <p style={{ color: 'var(--accent)', fontSize: 14, margin: 0 }}>{error}</p>
          )}

          {!loading && !error && (
            <div className="table-wrap" style={{ overflowX: 'auto', marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Usuario', 'Email', 'Nombre', 'Rol', 'Estado', 'Último acceso'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--t-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--t-base)' }}>
                        {u.username}
                        {u.must_change_password && (
                          <span className="tag t-warning" style={{ marginLeft: 6, fontSize: 10 }}>Cred. pendiente</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--t-muted)' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--t-muted)' }}>{u.full_name ?? '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`tag ${ROLE_TAG[u.role] ?? 't-info'}`}>{ROLE_LABEL[u.role] ?? u.role}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`tag ${u.is_active ? 't-ok' : 't-danger'}`}>{u.is_active ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--t-muted)', whiteSpace: 'nowrap' }}>
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '16px 12px', color: 'var(--t-muted)', textAlign: 'center' }}>
                        Sin usuarios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ color: 'var(--t-muted)', fontSize: 12, marginTop: 16, marginBottom: 0 }}>
            Esta tabla muestra únicamente los usuarios del panel Worsyn (<code>admin_users</code>).
            Los miembros de las organizaciones cliente se gestionan desde la sección Organizaciones.
          </p>
        </section>
      </div>
    </main>
  )
}
