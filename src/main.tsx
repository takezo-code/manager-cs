import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { startAutosave } from './store/autosave';
import { App } from './ui/App';

startAutosave();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
