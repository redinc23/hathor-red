import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import Login from './components/Login';
import Register from './components/Register';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import ListeningRoom from './components/ListeningRoom';
import DiscoverFeed from './pages/DiscoverFeed';
import ImmersivePlayer from './pages/ImmersivePlayer';
import PlaylistDetail from './pages/PlaylistDetail';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return !isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <PlayerProvider>
          <div className="App">
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rooms"
                element={
                  <PrivateRoute>
                    <Rooms />
                  </PrivateRoute>
                }
              />
              <Route
                path="/room/:id"
                element={
                  <PrivateRoute>
                    <ListeningRoom />
                  </PrivateRoute>
                }
              />
              <Route path="/playlists" element={<PrivateRoute><Home /></PrivateRoute>} />
              {/* New React Pages */}
              <Route path="/discover" element={<PrivateRoute><DiscoverFeed /></PrivateRoute>} />
              <Route path="/player/:id" element={<PrivateRoute><ImmersivePlayer /></PrivateRoute>} />
              <Route path="/playlist/:id" element={<PrivateRoute><PlaylistDetail /></PrivateRoute>} />
            </Routes>
          </div>
        </PlayerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
