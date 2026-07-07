import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import { ToastContainer } from './components/Toast';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
