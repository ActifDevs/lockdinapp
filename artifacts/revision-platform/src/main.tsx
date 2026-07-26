import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

document.body.classList.add('app-grain');

createRoot(document.getElementById('root')!).render(<App />);
