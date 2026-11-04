import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Shows the page only to logged-in users with an allowed role.
// Everyone else is sent to the login page (or to their own home page).
const ProtectedRoute = ({ roles, children }) => {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
};

export default ProtectedRoute;
