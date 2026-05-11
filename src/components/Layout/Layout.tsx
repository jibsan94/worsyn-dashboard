import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Navbar />
        <Outlet />
      </div>
    </div>
  )
}
