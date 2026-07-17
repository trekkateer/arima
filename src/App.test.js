import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('renders the home page at the root route', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /arima/i })).toBeInTheDocument();
  expect(screen.getByText(/thinking person's board game/i)).toBeInTheDocument();
});

test('navigating to /play from the home page starts a new game in setup phase', () => {
  render(<App />);
  userEvent.click(screen.getByRole('link', { name: /play now/i }));
  expect(screen.getByText(/setup: gold/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /randomize/i })).toBeInTheDocument();
});
