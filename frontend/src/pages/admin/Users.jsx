import { useEffect, useState } from "react";
import { api } from "../../api";
import { relativeTime } from "../../utils/time";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Pill from "../../components/Pill";
import { Table, THead, Th, TR, Td } from "../../components/Table";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [me, setMe] = useState(null);

  async function load() {
    try {
      const data = await api("/users");
      setUsers(data || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api("/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  async function deleteUser(u) {
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    setDeletingId(u.id);
    setError("");
    try {
      await api(`/users/${u.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function setRole(u, makeAdmin) {
    const verb = makeAdmin ? "promote to admin" : "demote to regular user";
    if (!confirm(`Are you sure you want to ${verb} "${u.username}"?`)) return;
    setRoleId(u.id);
    setError("");
    try {
      await api(`/users/${u.id}/role`, {
        method: "PATCH",
        body: { is_admin: makeAdmin },
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRoleId(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    if (username.trim().length < 3) {
      setFormError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/users", {
        method: "POST",
        body: { username: username.trim(), password, is_admin: isAdmin },
      });
      setSuccess(`User "${username.trim()}" created.`);
      setUsername("");
      setPassword("");
      setIsAdmin(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>

      <Card className="bg-slate-900/40 max-w-xl">
        <h2 className="text-lg font-semibold mb-3">Create user</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs uppercase text-slate-400 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              className="w-full text-sm px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-slate-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full text-sm px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-slate-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Minimum 8 characters.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="accent-blue-500"
            />
            Admin
          </label>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}
          {success && <p className="text-emerald-400 text-sm">{success}</p>}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Creating…" : "Create user"}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Existing users</h2>
        {error && <p className="text-red-400 text-sm mb-2">Error: {error}</p>}
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-slate-400">No users found.</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Username</Th>
                <Th className="w-32">Role</Th>
                <Th className="w-40">Created</Th>
                <Th className="w-40">Last login</Th>
                <Th className="w-44 text-right">Actions</Th>
              </tr>
            </THead>
            <tbody>
              {users.map((u) => (
                <TR key={u.id}>
                  <Td className="font-mono">{u.username}</Td>
                  <Td>
                    {u.is_admin ? (
                      <Pill tone="purple">Admin</Pill>
                    ) : (
                      <Pill>User</Pill>
                    )}
                  </Td>
                  <Td className="text-slate-400" title={u.created_at}>
                    {relativeTime(u.created_at)}
                  </Td>
                  <Td className="text-slate-400" title={u.last_login}>
                    {u.last_login ? relativeTime(u.last_login) : "—"}
                  </Td>
                  <Td className="text-right">
                    {me && me.id === u.id ? (
                      <span className="text-xs text-slate-600">you</span>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setRole(u, !u.is_admin)}
                          disabled={roleId === u.id}
                          title={
                            u.is_admin
                              ? "Demote to regular user"
                              : "Promote to admin"
                          }
                        >
                          {roleId === u.id
                            ? "…"
                            : u.is_admin
                              ? "Demote"
                              : "Promote"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteUser(u)}
                          disabled={deletingId === u.id}
                        >
                          {deletingId === u.id ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    )}
                  </Td>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
