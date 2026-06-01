// import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import Login from './pages/login'
// import Register from './pages/register'
// import { Chess } from 'chess.js'
// import { useState } from 'react'
// import Board from './components/board'

// function TestBoard() {
//   const [chess] = useState(new Chess())
//   const [lastMove, setLastMove] = useState(null)
//   const [playerColour, setPlayerColour] = useState("white") 
//   const [, forceUpdate] = useState(0)  

//   const handleMove = (from, to, promotion) => {
//     chess.move({ from, to, promotion })
//     setLastMove({ from, to })
//     forceUpdate(n => n + 1)
//   }

//   return (
//     <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
//       <Board
//         chess={chess}
//         playerColour="white"
//         onMove={handleMove}
//         lastMove={lastMove}
//         engineThinking={false}
//       />
//     </div>
//   )
// }

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Login />} />
//         <Route path="/register" element={<Register />} />
//         <Route path="/test" element={<TestBoard />} />
//       </Routes>
//     </BrowserRouter>
//   )
// }

// export default App
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/login'
import Register from './pages/register'
import Lobby from './pages/lobby'
import Game from './pages/game'
import Home from './pages/home'
import PvcLobby from './pages/pvc/PvcLobby'
import PvcGame from './pages/pvc/PvcGame'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game/:gameId" element={<Game />} />
        <Route path="/pvc" element={<PvcLobby />} />
        <Route path="/pvc/game/:gameId" element={<PvcGame />} />
      </Routes>
    </BrowserRouter>
  )
}
export default App