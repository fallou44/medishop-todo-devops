import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

// Configuration API
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ═══════════════════════════════════════════════════════════════════
// COMPOSANT : Page d'authentification
// ═══════════════════════════════════════════════════════════════════
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(endpoint, form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur de connexion au serveur");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">✅</div>
          <h1 className="auth-title">MediShop Todo</h1>
          <p className="auth-subtitle">Gestion de tâches interne · Équipe MediShop</p>
        </div>
        {error && <div className="error-msg">⚠️ {error}</div>}
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input className="form-input" name="name" placeholder="Jean Dupont"
                value={form.name} onChange={handle} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" name="email" type="email" placeholder="jean@medishop.fr"
              value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input className="form-input" name="password" type="password" placeholder="••••••••"
              value={form.password} onChange={handle} required minLength={8} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Chargement..." : mode === "login" ? "🔐 Se connecter" : "🚀 Créer un compte"}
          </button>
        </form>
        <div className="auth-toggle">
          {mode === "login" ? (
            <>Pas encore de compte ?{" "}
              <button onClick={() => { setMode("register"); setError(""); }}>S'inscrire</button></>
          ) : (
            <>Déjà un compte ?{" "}
              <button onClick={() => { setMode("login"); setError(""); }}>Se connecter</button></>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSANT : Item de tâche
// ═══════════════════════════════════════════════════════════════════
function TodoItem({ todo, onToggle, onDelete }) {
  const priorityClass = { high: "badge-high", medium: "badge-medium", low: "badge-low" };
  const priorityLabel = { high: "🔴 Haute", medium: "🟡 Moyenne", low: "🟢 Basse" };

  return (
    <div className={`todo-item ${todo.completed ? "completed" : ""}`}>
      <div className={`todo-checkbox ${todo.completed ? "checked" : ""}`}
        onClick={() => onToggle(todo._id)} title="Marquer comme terminé">
        {todo.completed && "✓"}
      </div>
      <div className="todo-content">
        <div className={`todo-title ${todo.completed ? "done" : ""}`}>{todo.title}</div>
        {todo.description && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
            {todo.description}
          </div>
        )}
        <div className="todo-meta">
          <span className={`badge ${priorityClass[todo.priority]}`}>
            {priorityLabel[todo.priority]}
          </span>
          {todo.category && (
            <span className="badge" style={{ background: "rgba(79,70,229,0.2)", color: "#818cf8" }}>
              📁 {todo.category}
            </span>
          )}
          {todo.dueDate && (
            <span className="badge" style={{ background: "rgba(6,182,212,0.2)", color: "#67e8f9" }}>
              📅 {new Date(todo.dueDate).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      </div>
      <div className="todo-actions">
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(todo._id)} title="Supprimer">
          🗑️
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL : App
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [todos, setTodos]   = useState([]);
  const [filter, setFilter] = useState("all");
  const [form, setForm]     = useState({ title: "", description: "", priority: "medium", category: "", dueDate: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const fetchTodos = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const params = filter !== "all" ? { completed: filter === "done" } : {};
      const { data } = await api.get("/todos", { params });
      setTodos(data.todos || []);
    } catch (err) {
      if (err.response?.status === 401) logout();
    } finally { setLoading(false); }
  }, [user, filter]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null); setTodos([]);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setError("");
    try {
      const payload = { ...form };
      if (!payload.dueDate) delete payload.dueDate;
      const { data } = await api.post("/todos", payload);
      setTodos([data, ...todos]);
      setForm({ title: "", description: "", priority: "medium", category: "", dueDate: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'ajout");
    }
  };

  const toggleTodo = async (id) => {
    try {
      const { data } = await api.patch(`/todos/${id}/toggle`);
      setTodos(todos.map(t => t._id === id ? data : t));
    } catch (err) { console.error(err); }
  };

  const deleteTodo = async (id) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    try {
      await api.delete(`/todos/${id}`);
      setTodos(todos.filter(t => t._id !== id));
    } catch (err) { console.error(err); }
  };

  if (!user) return <AuthPage onLogin={(u) => setUser(u)} />;

  const total    = todos.length;
  const done     = todos.filter(t => t.completed).length;
  const pending  = total - done;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">✅</div>
          <div>
            <div className="header-title">MediShop Todo</div>
            <div className="header-subtitle">Bonjour, {user.name} 👋</div>
          </div>
        </div>
        <button className="btn-logout" onClick={logout}>🚪 Déconnexion</button>
      </header>

      {/* Main */}
      <main className="main">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total des tâches</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--warning)" }}>{pending}</div>
            <div className="stat-label">En attente</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--success)" }}>{done}</div>
            <div className="stat-label">Terminées</div>
          </div>
        </div>

        {/* Formulaire d'ajout */}
        <div className="card add-form">
          <h2 style={{ marginBottom: "1rem", fontSize: "1rem" }}>➕ Ajouter une tâche</h2>
          {error && <div className="error-msg">⚠️ {error}</div>}
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <input className="form-input" placeholder="Titre de la tâche *"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <textarea className="form-textarea" placeholder="Description (optionnel)"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <select className="form-select" value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="high">🔴 Priorité haute</option>
                  <option value="medium">🟡 Priorité moyenne</option>
                  <option value="low">🟢 Priorité basse</option>
                </select>
              </div>
              <div className="form-group">
                <input className="form-input" placeholder="Catégorie"
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Date d'échéance</label>
              <input className="form-input" type="date" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit">➕ Ajouter la tâche</button>
          </form>
        </div>

        {/* Filtres */}
        <div className="filters">
          {[["all","Toutes"], ["pending","En attente"], ["done","Terminées"]].map(([key, label]) => (
            <button key={key} className={`filter-btn ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>

        {/* Liste des tâches */}
        {loading ? (
          <div className="empty-state"><div className="empty-icon">⏳</div>Chargement...</div>
        ) : todos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p>Aucune tâche{filter !== "all" ? " dans cette catégorie" : ""}.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Ajoutez votre première tâche ci-dessus !</p>
          </div>
        ) : (
          <div className="todo-list">
            {todos.map(todo => (
              <TodoItem key={todo._id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
