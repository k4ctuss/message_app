/* Pour info, ce point de départ est une adaptation de celui qui vous obtiendriez
en faisant npm create backend
issu du dépôt
<https://github.com/ChoqueCastroLD/create-backend/tree/master/src/template/js>
*/

// Load Enviroment Variables to process.env (if not present take variables defined in .env file)
require('mandatoryenv').load(['PORT'])
const {initWebSocket} = require('./websocket/websocket');
const { PORT } = process.env

// Instantiate an Express Application
const app = require('./app')
const server = require('http').Server(app);

const io = require('socket.io')(server, {
  cors: {
    origin: '*'
  }
});

initWebSocket(io);

// Open Server on selected Port
server.listen(
  PORT,
  () => console.info('Server listening on port ', PORT)
)
