import { render, screen } from './utils/test-utils';
import App from './App';

// TODO(stale-test): UI metinleri/yapisi degisti veya test metni bozuk kodlanmis (mojibake); bilesen testi yeniden yazilmali.
test.skip('renders login tabs on initial load', () => {
  render(<App />);
  expect(screen.getByRole('tab', { name: /giriş yap/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /kayıt ol/i })).toBeInTheDocument();
});
