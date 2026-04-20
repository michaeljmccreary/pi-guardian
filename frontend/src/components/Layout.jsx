import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const linkCls = ({ isActive }) =>
    `block px-3 py-2 rounded ${isActive ? "bg-emerald-600/20 text-emerald-300" : "hover:bg-slate-800"}`;
  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr] bg-slate-900 text-slate-100">
      <aside className="border-r border-slate-800 p-4 space-y-1">
        <h2 className="text-lg font-semibold mb-4">Pi‑Guardian</h2>
        <NavLink to="/" className={linkCls} end>
          Dashboard
        </NavLink>
        <NavLink to="/devices" className={linkCls}>
          Devices
        </NavLink>
        <NavLink to="/traffic" className={linkCls}>
          Traffic
        </NavLink>
        <NavLink to="/compliance" className={linkCls}>
          Compliance
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/admin/users" className={linkCls}>
            Users
          </NavLink>
        )}
      </aside>
      <main className="flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-slate-800">
          <span className="text-slate-400 text-sm">
            Signed in as <b>{user?.username}</b>
          </span>
          <button
            onClick={logout}
            className="text-sm px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
          >
            Log out
          </button>
        </header>
        <section className="p-6 flex-1">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
