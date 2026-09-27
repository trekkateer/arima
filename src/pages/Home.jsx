import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <h1>Arima</h1>
      <p>The thinking person's board game</p>
      <Link to="/play" className="play-btn">Play Now</Link>
      <Link to="/rules" className="rules-link">How to Play</Link>
    </div>
  );
}
