import './app/app.css';
import bootstrapApp from './app/bootstrap';

const root = document.createElement('div');
root.id = 'app';
document.body.appendChild(root);

bootstrapApp(root);
