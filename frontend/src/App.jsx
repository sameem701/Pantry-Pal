import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import MealPlanner from './services/MealPlanner';

function Navbar() {
  return (
    <nav style={{ padding: '12px 24px', background: '#2e7d32', display: 'flex', gap: '20px' }}>
      <NavLink to="/meal-plan" style={{ color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
        Meal Planner
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/meal-plan" element={<MealPlanner />} />
        <Route path="*" element={<Navigate to="/meal-plan" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
