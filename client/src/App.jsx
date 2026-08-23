import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/login'
import Register from './pages/register'
import Lobby from './pages/lobby'
import Game from './pages/game'
import Home from './pages/home'
import PvcLobby from './pages/pvc/PvcLobby'
import PvcGame from './pages/pvc/PvcGame'
import ForgotPassword from './pages/forgotpassword'
import ResetPassword from './pages/resetpassword'
import History  from './pages/history'
import Analysis from './pages/analysis'
import Profile from './pages/profile'
import Friends from './pages/friends'
import ToastContainer from './components/ToastContainer'
import ChallengeNotifier from './components/ChallengeNotifier'

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <ChallengeNotifier />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game/:gameId" element={<Game />} />
        <Route path="/pvc" element={<PvcLobby />} />
        <Route path="/pvc/game/:gameId" element={<PvcGame />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/history"           element={<History />} />
        <Route path="/analysis/:gameId"  element={<Analysis />} />
        <Route path="/profile"           element={<Profile />} />
        <Route path="/friends"           element={<Friends />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App