import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import Rules from './pages/Rules';
import Toast from './components/Toast/Toast';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/rules" element={<Rules />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}

export default App;