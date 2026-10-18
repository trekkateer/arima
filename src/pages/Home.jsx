// React Components
import { Link } from 'react-router-dom';

// CSS
import './Home.css';
import '../Common.css';

// FontAwesome icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareFromSquare } from '@fortawesome/free-solid-svg-icons';

export default function Home() {
  return (
    <div className="home">
      <h1>Arima</h1>
      <p>The thinking person's board game</p>
      <Link to="/pass-and-play" className="play-btn">Pass and Play</Link>
      <Link to="/online?side=gold" className="play-btn">Play Online as Gold</Link>
      <Link to="/online?side=silver" className="play-btn">Play Online as Silver</Link>

      {/* Link to the rules page */}
      <Link className="play-rules-link" to="/rules">
        Pieces &amp; Rules <FontAwesomeIcon icon={faShareFromSquare} />
      </Link>
    </div>
  );
}
