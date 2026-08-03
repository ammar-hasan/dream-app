import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';

async function start() {
  let shareError = false;
  try {
    const html = window.location.hash.startsWith('#dream-share=')
      ? await import('./ui/shareLink').then((module) => module.sharedAppHtml(window.location.hash))
      : null;
    if (html) {
      document.open();
      document.write(html);
      document.close();
      return;
    }
  } catch {
    shareError = true;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initialShareError={shareError} />
    </StrictMode>,
  );
}

void start();
