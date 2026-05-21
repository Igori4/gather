import http from 'http';
import { app } from './app';

const PORT = process.env.AUTH_APP_PORT ?? 4001;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`[auth-app] running on http://localhost:${PORT}`);
});
