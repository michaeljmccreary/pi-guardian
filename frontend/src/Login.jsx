import { useState } from "react";

const IconLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-sky-400"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

// Login component with username/password fields and submit button.
// On submit, it calls /api/login and passes the token to parent on success, or shows error message on failure
export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token);
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error");
    }
  };

  // The login form is centered on the screen
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <IconLogo />
          <h1 className="text-2xl font-bold text-white mt-3">Pi-Guardian</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Enter password"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
