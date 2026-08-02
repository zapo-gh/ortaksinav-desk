import { render, screen } from './utils/test-utils';
import App from './App';

test('renders login tabs on initial load', () => {
  render(<App />);
  expect(screen.getByRole('tab', { name: /giriş yap/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /kayıt ol/i })).toBeInTheDocument();
});
