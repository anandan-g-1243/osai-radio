import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AdminApp } from './AdminApp';
import { ListenerApp } from './ListenerApp';
import './styles.css';

// Route: /admin → Admin panel, /?listener=true → Listener view, else → original app
const path = window.location.pathname;
const isAdmin = path === '/admin' || path === '/admin/';
const isListener = new URLSearchParams(window.location.search).get('listener') === 'true';

let Root: React.ComponentType;
if (isAdmin) {
  Root = AdminApp;
} else if (isListener) {
  Root = ListenerApp;
} else {
  Root = App;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);