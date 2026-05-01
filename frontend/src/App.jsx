import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Component, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import './App.css';

// ── pages ─────────────────────────────────────────────────────────────────────
import Login        from './services/Login';
import Register     from './services/Register';
import ForgotPassword from './services/ForgotPassword';
import Dashboard    from './services/Dashboard';
import Pantry       from './services/Pantry';
import Recipes      from './services/Recipes';
import RecipeDetail from './services/RecipeDetail';
import Profile      from './services/Profile';
import MealPlanner  from './services/MealPlanner';
import Favourites   from './services/Favourites';
import MyRecipes    from './services/MyRecipes';
import ShoppingList from './services/ShoppingList';

// lazy-loaded so they don't increase initial bundle size
const CookingSession = lazy(() => import('./services/CookingSession'));
const CreateRecipe   = lazy(() => import('./services/CreateRecipe'));

// ── error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="error-screen">
          <h2>Something went wrong</h2>
          <pre>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── sidebar ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard',     icon: '🏠', label: 'Dashboard'        },
  { to: '/pantry',        icon: '🥦', label: 'Pantry'           },
  { to: '/recipes',       icon: '🍳', label: 'Recipes'          },
  { to: '/favourites',    icon: '♥',  label: 'Favourites'       },
  { to: '/my-recipes',    icon: '📝', label: 'My Recipes'       },
  { to: '/meal-plan',     icon: '📅', label: 'Plan & Nutrition' },
  { to: '/shopping-list', icon: '🛒', label: 'Shopping List'    },
  { to: '/profile',       icon: '👤', label: 'Profile'          },
];

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() { logout(); navigate('/login'); }

  const initial = (user.email || 'U')[0].toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">🥗</span>
        <span className="sidebar-logo-text">PantryPal</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
          >
            <span className="sidebar-icon">{icon}</span>
            <span className="sidebar-label">{label}</span>
            <span className="sidebar-indicator" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initial}</div>
          <span className="sidebar-email">{user.email}</span>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>Sign Out</button>
      </div>
    </aside>
  );
}

// ── route helpers ─────────────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  const isAuth = Boolean(user);

  return (
    <div className={isAuth ? 'app-layout' : 'auth-layout'}>
      {isAuth && <Sidebar />}
      <main className={isAuth ? 'app-main' : undefined}>
        <Suspense fallback={<div className="page-loading">Loading…</div>}>
          <Routes>
            {/* public */}
            <Route path="/login"           element={isAuth ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/register"        element={isAuth ? <Navigate to="/dashboard" replace /> : <Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* protected */}
            <Route path="/dashboard"       element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/pantry"          element={<PrivateRoute><Pantry /></PrivateRoute>} />
            <Route path="/recipes"         element={<PrivateRoute><Recipes /></PrivateRoute>} />
            <Route path="/favourites"      element={<PrivateRoute><Favourites /></PrivateRoute>} />
            <Route path="/my-recipes"      element={<PrivateRoute><MyRecipes /></PrivateRoute>} />
            <Route path="/shopping-list"   element={<PrivateRoute><ShoppingList /></PrivateRoute>} />
            <Route path="/recipes/:id"     element={<PrivateRoute><RecipeDetail /></PrivateRoute>} />
            <Route path="/cook/:id"        element={<PrivateRoute><CookingSession /></PrivateRoute>} />
            <Route path="/create-recipe"   element={<PrivateRoute><CreateRecipe /></PrivateRoute>} />
            <Route path="/recipes/:id/edit" element={<PrivateRoute><CreateRecipe /></PrivateRoute>} />
            <Route path="/meal-plan"       element={<PrivateRoute><MealPlanner /></PrivateRoute>} />
            <Route path="/profile"         element={<PrivateRoute><Profile /></PrivateRoute>} />

            {/* default */}
            <Route path="*" element={<Navigate to={isAuth ? '/dashboard' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
