const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const responsesRouter = require('./routes/responses');
const { startScheduler, setBroadcast, pingHttpbin } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', responsesRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(message) {
  const json = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(json);
  });
}

setBroadcast(broadcast);

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
});

if (require.main === module) {
  pingHttpbin().catch(err => console.error('Initial ping failed:', err.message));
  startScheduler();
  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = { app, server, wss };
