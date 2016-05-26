var express = require('express');
var https = require('https');
var http = require('http');
var request = require('request');
var url = require('url');
//var oauth = require('./oauth.js');
//var rest = require('./rest.js');
var rest = require('restler');
var fs = require('fs');
var os = require('os');
var argv = require('minimist')(process.argv.slice(2));
var env = require('node-env-file');
var debug = argv.d || argv.debug || process.env.DEBUG || false;
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var Datauri = require('datauri');

var crypto = require('crypto');
var base64url = require('base64url');

//var memoryStore = require('memory-store');
//var sessionStore = memoryStore.createStore();

var MemoryStore = require('session-memory-store')(session);

var ioSession = require('socket.io-session');


var uuid = require('node-uuid');
var shortid = require('shortid');

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$#');

try {
    env(__dirname + '/.env');
} catch (e) {
    console.error('Exception: ', e);
}

var app = express();

var port = process.env.PORT || 3000;
var https_port = process.env.HTTPS_PORT || parseInt(port) + 1;

var cid = process.env.APPID || "YOUR-REMOTE-ACCESS-CONSUMER-KEY";
var csecr = process.env.APPSECRET || "YOUR-REMOTE-ACCESS-CONSUMER-SECRET";
var tokenUri = process.env.TOKEN_URI || "https://login.salesforce.com";
var authUri = process.env.AUTH_URI || "https://login.salesforce.com";
var redir = process.env.REDIRECT_URI || "https://localhost:" + https_port + "/token";


console.warn('cid: ', cid);
console.warn('csecr: ', csecr);
console.warn('tokenUri: ', tokenUri);
console.warn('authUri: ', authUri);
console.warn('redir: ', redir);


//app.set('view engine', 'jade');
app.set('view engine', 'ejs');

app.set('views', './views');

app.use(express.static(__dirname + '/public'));

var jsonParser = bodyParser.json();

app.use(cookieParser('waveiscool'));

var options = {};

var sessionMiddleware = session({
    store: new MemoryStore(options),
    secret: 'lcr',
    saveUninitialized: true,
    resave: true
});

app.use(sessionMiddleware);

app.use(bodyParser.urlencoded({ extended: false }));

app.use(jsonParser);


app.get('/login', function(req, res) {
    login(req, res, function(data, response) {
        if (response.statusCode === 200) {
            res.send({msg: 'Successful login'});
        } else {
            console.warn('Unable to login');
            res.send({error: 'Unable to login'});
        }
    });
});

var accounts = {
    'skipsauls@gmail.com': {
        id: '00XX000001234',
        password: 'test1234',
        info: {
            alias: 'Skip'
        }
    },
    'ssauls@salesforce.com': {
        id: '00XX000001999',
        password: 'test1234',
        info: {
            alias: 'SSauls'
        }
    }    
}

var users = {};

var rooms = {
    'Lobby': {
        name: 'Lobby',
        owner: 'SYSTEM',
        players: {},
        games: {}
    }
};

var gameScope = {
    public: 'public',       // Game may be joined by anyone
    room: 'room',           // Game may be joined by players in room
    private: 'private'      // Game may be joined by invitation only

};

var gameState = {
    ready: 'ready',         // Game is ready for players to join
    running: 'running',     // Game is in play, joining only if activeJoin is true
    paused: 'paused',       // Game is paused, joining only if activeJoin is true
    compete: 'complete'     // Game is over, joining is prohibited
};

/*
    game template
    
    {
        id: '1234567890',
        owner: 'john@doe.com',
        room: 'Lobby',
        name: 'New Game',
        players: {},
        scope: gameScope.public,
        state: gameState.ready,
        activeJoin: false
    }

*/
var games = {};

var players = {};

app.get('/', function(req, res) {
    res.render('pages/index', {title: 'Wave SDK POC', appId: process.env.APPID});
});

function generateId() {
    //return uuid.v4();
    return shortid.generate();
}

function generateToken(size, expiresIn) {
    var r = crypto.randomBytes(size);
    var r = generateId();
    var d = Date.now() + (expiresIn || 0);
    var s = r + '.' + d;
    console.warn('s: ', s);
    var t = base64url(s);
    console.warn('t: ', t);
    return t;
}


function validateToken(token) {
    if (token === null || typeof token === 'undefined' || token === '') {
        return false;
    }
    var s = base64url.decode(token);
    var parts = s.split('.');
    var d = parts[1];
    console.warn('d: ', d);
    if (Date.now() >= (d + (1000 * 60 * 10))) {
        return false;
    }
    return true;
}

app.get('/lcr', function(req, res) {
    if (validateToken(req.session.token) === false) {
        var expiresIn = 1000 * 60 * 60 * 24 * 7; // 7 days
        req.session.token = generateToken(16, expiresIn);
    }
    res.cookie('lcr', req.session.token);
    res.render('pages/lcr', {title: 'LCR', appId: process.env.APPID});
});

function getPlayer(req) {
    try {
        var user = users[req.session.token];
        return players[user.playerId];
    } catch (e) {
        return null;
    }
}

function listRooms(req, obj, callback) {
    var player = getPlayer(req);
    var roomInfo = [];
    var room = null;
    var playerCount = 0;
    for (var roomName in rooms) {
        room = rooms[roomName];
        playerCount = 0;
        for (var p in room.players) {
            if (players[p] && players[p].connected === true) {
                playerCount++;
            }
        }
        gameCount = 0;
        for (var g in games) {
            if (games[g].room === roomName) {
                gameCount++;
            }
        }
        roomInfo.push({
            name: roomName,
            player_count: playerCount, //Object.keys(room.players).length,
            game_count: gameCount //Object.keys(room.games).length
        });
    }
    if (typeof callback === 'function') {
        callback(roomInfo, null);
    }
    return roomInfo;
}

function listPlayers(req, obj, callback) {
    var playerRoomMap = {};
    var player = null;
    var room = null;
    for (var r in rooms) {
        room = rooms[r];
        playerRoomMap[r] = { roomName: r, players: {} };
        for (var p in room.players) {
            player = players[p];
            console.warn('player: ', player);
            if (player && player.connected) {
                playerRoomMap[r].players[p] = { id: player.id, info: player.info };
            } else {
                console.warn('no player');
                room.players[p] = undefined;
                delete room.players[p];
            }
        }
    }

    if (typeof callback === 'function') {
        callback(playerRoomMap, null);
    }

}

function listGames(req, obj, callback) {
    var gameRoomMap = {};

    var game = null;
    var room = null;
    var count = 0;

    for (var r in rooms) {
        room = rooms[r];
        gameRoomMap[r] = { games: {} };
    }

    for (var g in games) {
        game = games[g];
        console.warn('game: ', game);
        count = 0;
        for (var p in game.players) {
            if (players[p] && players[p].connected === true) {
                count++;
            }
        }
        gameRoomMap[game.room].games[g] = { id: game.id, name: game.name, room: game.room, player_count: count };
    }

    if (typeof callback === 'function') {
        callback(gameRoomMap, null);
    }

    return;


    for (var r in rooms) {
        room = rooms[r];
        console.warn(')))))))) room: ', room);
        gameRoomMap[r] = { games: {} };
        for (var g in room.games) {
            game = games[g];
            console.warn('^^^^^^^^^^^^^^^^ game: ', game);
            if (game) {
                count = 0;
                for (var p in game.players) {
                    if (players[p] && players[p].connected === true) {
                        count++;
                    }
                }

                gameRoomMap[r].games[g] = { id: game.id, name: game.name, player_count: count };
            } else {
                console.warn('no  game');
                room.games[g] = undefined;
                delete room.games[g];
            }
        }
    }

    if (typeof callback === 'function') {
        callback(gameRoomMap, null);
    }

    return;

    var gameInfo = [];
    var game = null;
    var count = 0;
    for (var gameId in games) {
        game = games[gameId];
        count = 0;
        for (var p in game.players) {
            if (players[p] && players[p].connected === true) {
                count++;
            }
        }
        gameInfo.push({
            id: game.id,
            name: game.name,
            room: game.room,
            player_count: count //Object.keys(game.players).length
        });
    }
    if (typeof callback === 'function') {
        callback(gameInfo, null);
    }
    return gameInfo;
}

var listFunctions = {
    'rooms': listRooms,
    'players': listPlayers,
    'games': listGames
}

function pushUpdateLists(types, req) {
    
    process.nextTick(function() {

    if (!types || types === '*') {
        types = [];
        for (var key in listFunctions) {
            types.push(key);
        }
    } else if (typeof types === 'string') {
        types = [types];
    }
    var type = null;
    for (var i = 0; i < types.length; i++) {
        type = types[i];
        var listFunction = listFunctions[type];
        if (typeof listFunction === 'function') {
            listFunction(req, null, function(list, err) {
                nsp.emit(type, list);
            });
        }
    }

    });

}

function pushUpdateGame(socket, req, gameId) {

    var pusher = socket || nsp;

    getGame(socket, req, gameId, function(game, err) {
        if (err) {
            pusher.emit('lcr_error', err);
        } else {
            pusher.emit('game', game);
        }
    });

}

app.post('/lcr/roll', function(req, res) {

    var roll = req.body;
    console.warn('roll: ', roll);

    res.send({});
});

app.post('/lcr/register', function(req, res) {

    var obj = req.body;
    console.warn('register ', obj);

    res.send({});
});

function login(socket, req, obj, useSession, callback) {
    console.warn('!!!!!!!!!!!! login: ', useSession);
    //console.warn('obj.sid: ', obj.sid);
    //console.warn('obj.username: ', obj.username);

    var account = null;

    obj = obj || {};

    if (useSession === true) {
        var player = null;
        var user = users[req.session.token];
        player = user ? players[user.playerId] : null;
        console.warn('-------------------------------> player: ', player);
        //var user = req.session.user;
        //console.warn('-------------------------------> user: ', user);
        if (player) {
            var account = accounts[player.username];
            if (account) {
                obj = {
                    username: player.username,
                    password: account.password
                };
                req.session.user = {
                    username: player.username,
                    token: req.session.token
                };
            }
        }
    }

    var account = accounts[obj.username];
    if (account) {
        if (account.password === obj.password) {
            var timestamp = Date.now();
            var player = {
                username: obj.username,
                info: account.info,
                id: account.id,
                token: req.session.token,
                joined: timestamp,
                connected: true,
                roomName: null
            };
            console.warn('player: ', player);
            users[req.session.token] = {playerId: player.id};
            players[player.id] = player;
            if (useSession === false) {
                req.session.user = {
                    username: obj.username,
                    token: req.session.token
                };
            }

            if (typeof callback === 'function') {
                callback({type: 'login_success', player: player}, null);
            }

            joinRoom(socket, req, null, function(room, err) {

            });

        } else {
            if (typeof callback === 'function') {
                callback(null, {error: 'invalid_password', msg: 'Invalid Password'});
            }
        }
    } else {
        if (typeof callback === 'function') {
            callback(null, {error: 'invalid_account', msg: 'Invalid Account'});
        }
    }
}

function logout(socket, req, obj, callback) {
    //if (req.session.token) {
    var user = users[req.session.token];
    var player = players[user.playerId];
    if (req.session.user) {
        users[req.session.token] = undefined;
        delete users[req.session.token];
        players[user.playerId] = undefined;
        delete players[user.playerId];
        req.session.user = undefined;
        delete req.session.user
        if (typeof callback === 'function') {
            callback({type: 'logout_success', msg: 'Logged Out'}, null);
        }
    } else {
        if (typeof callback === 'function') {
            callback(null, {error: 'not_logged_in', msg: 'Not Logged In'});
        }
    }
}


console.log('platform: ', os.platform());
console.log('arch: ', os.arch());
console.log('hostname: ', os.hostname());


// Create an HTTP service
var server = http.createServer(app).listen(port);
console.log("Server listening for HTTP connections on port ", port);

// Create an HTTPS service if the certs are present
var secureServer = null;
try {
    var options = {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('key-cert.pem')
    };
    secureServer = https.createServer(options, app).listen(https_port);    
    console.log("Server listening for HTTPS connections on port ", https_port);
} catch (e) {
    console.error("Security certs not found, HTTPS not available");
}

function createRoom(socket, req, roomName, callback) {
    console.warn('createRoom: ', roomName);
    var user = users[req.session.token];
    var player = players[user.playerId];
    console.warn('player: ', player);
    console.warn('rooms: ', rooms);
    var room = rooms[roomName];
    console.warn('room: ', room);
    if (room) {
        callback(null, {error: 'room_exists', msg: 'A room of that name exists'});
    } else {
        room = {
            id: generateId(),
            name: roomName,
            owner: player.username,
            players: {},
            games: {}
        };
        //room.players[player.id] = true;
        rooms[roomName] = room;
        pushUpdateLists(null, req);
        if (typeof callback === 'function') {
            callback(room, null);
        }
    }
}

function destroyRoom(socket, req, roomName, callback) {
    console.warn('destroyRoom: ', roomName);
    var user = users[req.session.token];
    var player = players[user.playerId];
    console.warn('player: ', player);
    console.warn('rooms: ', rooms);
    var room = rooms[roomName];
    console.warn('room: ', room);
    if (!room) {
        callback(null, {error: 'room_does_not_exist', msg: 'A room of that name does not exist.'});
    } else {
        if (room.owner !== player.username) {
            callback(null, {error: 'not_room_owner', msg: 'Room cannot be destroyed as user is not the owner.'});
        } else {
            nsp.to(roomName).emit('closed_room', roomName);
            rooms[roomName] = undefined;
            delete rooms[roomName];
            pushUpdateLists(null, req);
            if (typeof callback === 'function') {
                callback(roomName, null);
            }
        }
    }
}

function joinRoom(socket, req, roomName, callback) {
    roomName = roomName || 'Lobby';
    var room = rooms[roomName];
    if (!room) {
        callback(null, {error: 'room_does_not_exist', msg: 'A room of that name does not exist'});
    } else {
        var user = users[req.session.token];
        var player = players[user.playerId];
        socket.join(roomName, function() {
            socket.leave(player.roomName, function() {
                try {
                    delete rooms[player.roomName].players[player.id];
                } catch (e) {}
                nsp.to(roomName).emit('player_left_room', {roomName: roomName, player: { id: player.id, info: player.info}});

                player.roomName = roomName;
                room.players[player.id] = player.info;
                nsp.to(roomName).emit('player_joined_room', {roomName: roomName, player: { id: player.id, info: player.info}});
                pushUpdateLists(null, req);

                if (typeof callback === 'function') {
                    callback(room, null);
                }

            });
        });
    }
}

function leaveRoom(socket, req, roomName, callback) {
    var room = rooms[roomName];
    if (!room) {
        callback(null, {error: 'room_does_not_exist', msg: 'A room of that name does not exist'});
    } else {
        var user = users[req.session.token];
        var player = players[user.playerId];
        socket.leave(roomName, function() {
            nsp.to(roomName).emit('player_left_room', {roomName: roomName, player: { id: player.id, info: player.info}});            
            delete room.players[player.id];
            pushUpdateLists(null, req);            
            if (typeof callback === 'function') {
                callback(room, null);
            }
        });
    }
}

function createGame(socket, req, gameDef, callback) {
    console.warn('createGame: ', gameDef);

    var user = users[req.session.token];
    var player = players[user.playerId];
    console.warn('player: ', player);

    var game = games[gameDef.gameId];    

    var roomName = gameDef.roomName || 'Lobby';
    var room = rooms[roomName];

    if (room === null || typeof room === 'undefined') {
        callback(null, {error: 'room_does_not_exist', msg: 'Room does not exist.'});
    } else {

        if (game === null || typeof game === 'undefined') {
            game = {
                id: generateId(),
                owner: player.username,
                name: gameDef.gameName || 'New Game',
                room: gameDef.roomName || 'Lobby',
                players: {},
                scope: gameScope[gameDef.scope] || gameScope.public,
                state: gameState.ready,
                activeJoin: false
            };

            game.players[player.id] = player.info;

            games[game.id] = game;

            console.warn('created game:', game);

            pushUpdateLists(null, req);

            if (typeof callback === 'function') {
                callback(game, null);
            }
        } else {
            // Shouldn't get here unless the client is re-using a game ID
            if (typeof callback === 'function') {
                callback(null, {error: 'game_exists', msg: 'A game with that ID already exists.'});
            }
        }
    }
}

function destroyGame(socket, req, gameId, callback) {
    console.warn('destroyGame: ', gameId);

    var user = users[req.session.token];
    var player = players[user.playerId];
    console.warn('111 player: ', player);

    var game = games[gameId];    

    console.warn('222 game: ', game);

    var roomName = game.room;
    var room = rooms[roomName];

    console.warn('333 room: ', room);

    if (game === null || typeof game === 'undefined') {
        socket.emit('lcr_error', {error: 'game_does_not_exist', msg: 'The game does not exist.'});
    } else if (game.owner !== player.username) {
        socket.emit('lcr_error', {error: 'user_is_not_game_owner', msg: 'The user is not the owner of the game.'});
    } else {
        games[game.id] = undefined;
        delete games[game.id];

        nsp.to(roomName).emit('destroyed_game', {id: gameId});

        pushUpdateLists(null, req);
        //pushUpdateGame(null, req, gameId);
    } 
}

function joinGame(socket, req, gameId, callback) {

    console.warn('joinGame: ', gameId);

    var user = users[req.session.token];
    var player = players[user.playerId];
    console.warn('player: ', player);

    var game = games[gameId];

    if (game === null || typeof game === 'undefined') {
        if (typeof callback === 'function') {
            callback(null, {error: 'game_does_not_exist', msg: 'The game does not exist.'});
        }
    } else if (game.state === 'complete') {
        if (typeof callback === 'function') {
            callback(null, {error: 'game_complete_no_join', msg: 'This gane is complete and may not be joined.'});
        }
    } else if ((game.state === 'running' || game.state === 'paused') && game.activeJoin === false) {
        if (typeof callback === 'function') {
            callback(null, {error: 'game_not_active_join', msg: 'This game may not be joined after it is started.'});
        }
    } else {
        game.players[player.id] = player.info;

        nsp.to(game.room).emit('player_joined_game', {roomName: game.room, gameId: game.id,  gameName: game.name, player: { id: player.id, alias: player.info.alias}});            

        pushUpdateLists(null, req);
        pushUpdateGame(null, req, gameId);

        if (typeof callback === 'function') {
            callback(game, null);
        }
    }
}

function leaveGame(socket, req, gameId, callback) {

    console.warn('leaveGame: ', gameId);

    var user = users[req.session.token];
    var player = players[user.playerId];
    console.warn('player: ', player);

    var game = games[gameId];

    if (game === null || typeof game === 'undefined') {
        if (typeof callback === 'function') {
            callback(null, {error: 'game_does_not_exist', msg: 'That game does not exist.'});
        }
    } else {
        game.players[player.id] = undefined;
        delete game.players[player.id];

        nsp.to(game.room).emit('player_left_game', {roomName: game.room, gameId: game.id, gameName: game.name, player: { id: player.id, alias: player.info.alias}});

        pushUpdateLists(null, req);
        pushUpdateGame(null, req, gameId);

        if (typeof callback === 'function') {
            callback(game, null);
        }
    }
}

function getGame(socket, req, gameId, callback) {
    var game = games[gameId];
    if (!game) {
        if (typeof callback === 'function') {
            callback(null, {error: 'game_does_not_exist', msg: 'The game does not exist.'});
        }
    } else {
        if (typeof callback === 'function') {
            callback(game, null);
        }
    }
}

function changeGameState(socket, req, gameId, state, callback) {
    console.warn('leaveGame: ', gameId);

    var user = users[req.session.token];
    var player = players[user.playerId];
    console.warn('player: ', player);

    var game = games[gameId];

    if (game === null || typeof game === 'undefined') {
        socket.emit('lcr_error', {error: 'game_does_not_exist', msg: 'The game does not exist.'});
    } else if (game.owner !== player.username) {
        socket.emit('lcr_error', {error: 'user_is_not_game_owner', msg: 'The user is not the owner of the game.'});
    } else {
        var newState = null;
        if (state === 'start' || state === 'restart') {
            newState = 'running';
        } else if (state === 'pause') {
            newState = 'paused';
        } else if (state === 'end') {
            newState = 'complete';
        }

        if (newState === null) {
            socket.emit('lcr_error', {error: 'invalid_game_state', msg: 'The game state is invalid.'});
        } else if (newState === game.state) {
            socket.emit('lcr_error', {error: 'game_state_unchanged', msg: 'The game is already in that state, no change.'});            
        } else {
            game.state = newState;

            nsp.to(game.room).emit('game_state_changed', {id: game.id,  name: game.name, state: game.state});

            pushUpdateLists(null, req);
            pushUpdateGame(null, req, gameId);
        }
    }
}

// Allows player to broadcast to all rooms they are currently in
function broadcast(socket, msg) {
    console.warn('broadcast: ', msg);
    if (socket) {
        for (var room in socket.rooms) {
            console.warn('room: ', room);
            // Only allow broadcast to known rooms
            if (rooms[room]) {
                nsp.to(room).emit('lcr_message', msg);
            }
        }
    }
}

var io = require("socket.io")(secureServer);

io.use(function(socket, next) {
    sessionMiddleware(socket.request, {}, next);
});

var nsp = io.of('/lcr');

nsp.on('connection', function(socket){

    var req = socket.request;
    var session = req.session;
    var token = req.session.token;

    console.warn('req.session: ', session);
    console.warn('token: ', token);
    console.warn('req.session.user: ', session.user);
    console.warn('req.session.bar ', session.bar);
    console.warn('socket.playerId: ', socket.playerId);
    console.warn('socket.playerName: ', socket.playerName);

    console.warn('11111111111');
    if (validateToken(req.session.token) === false) {
        var expiresIn = 1000 * 60 * 60 * 24 * 7; // 7 days
        req.session.token = generateToken(16, expiresIn);
        token = req.session.token;
    } else {
        console.warn('CALLING login');
        login(socket, req, null, true, function(ret, err) {
            console.warn('>>>>>>>>>>>>>> returned: ', ret, err);
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.playerId = ret.player.id;
                socket.playerName = ret.player.username;               
                ret.player.socketId = socket.id;
                var user = users[req.session.token];
                var player = players[user.playerId];
                console.warn('player: ', player);
                players[user.playerId].connected = true;
                socket.emit(ret.type, ret.player);
            }
            pushUpdateLists(null, req);
        });

    }

    //console.log('-----------------> session.token: ' + session.token);

    socket.emit('test', 'Welcome from LCR!');

    pushUpdateLists(null, req);

    socket.on('connect', function() {
        console.warn('socket connect');
    });

    socket.on('disconnect', function() {
        console.warn(socket.playerName + ' (' + socket.playerId + ') has disconnected from ' + socket.id);

        var user = users[req.session.token];
        if (user) {

            var player = players[user.playerId];
            console.warn('player: ', player);
            if (player) {
                player.connected = false;
                leaveRoom(socket, req, player.roomName, function(room, err) {
                    pushUpdateLists(null, req);
                });
            }
        }
    });

    socket.on('test', function(msg) {
        console.warn('socket test: ', msg);
        broadcast(socket, msg);
    });

    socket.on('test_update', function(msg) {
        console.warn('socket test_update: ', msg);
        pushUpdateLists(null, req);
    });

    socket.on('login', function(obj) {
        console.warn('login: ', obj);
        login(socket, req, obj, false, function(ret, err) {
            console.warn('returned: ', ret, err);
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.playerId = ret.player.id;
                socket.playerName = ret.player.username;
                ret.player.socketId = socket.id;
                socket.emit(ret.type, ret.player);
            }
            pushUpdateLists(null, req);
        });
    });

    socket.on('logout', function(obj) {
        console.warn('logout: ', obj);
        logout(socket, req, obj, function(ret, err) {
            console.warn('logout returned: ', ret, err);
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit(ret.type, ret);
            }
            pushUpdateLists(null, req);
        });
    });

    socket.on('create_room', function(roomName) {
        console.warn('create_room: ', roomName);
        createRoom(socket, req, roomName, function(room, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('created_room', room);
            }
        });
    });

    socket.on('destroy_room', function(roomName) {
        console.warn('destroy_room: ', roomName);
        destroyRoom(socket, req, roomName, function(roomName, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('destroyed_room', roomName);
            }
        });
    });

    socket.on('join_room', function(roomName) {
        console.warn('join_room: ', roomName);
        joinRoom(socket, req, roomName, function(room, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('joined_room', room);
            }
        });
    });

    socket.on('leave_room', function(roomName) {
        console.warn('leave_room: ', roomName);
        leaveRoom(socket, req, roomName, function(room, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('left_room', room);
            }
        });
    });

    socket.on('list_rooms', function(obj) {
        console.warn('list_rooms: ', obj);
        listRooms(req, obj, function(rooms, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('rooms', rooms);
            }
        })
    });

    socket.on('create_game', function(gameDef) {
        createGame(socket, req, gameDef, function(game, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('created_game', game);
            }
        });
    });

    socket.on('destroy_game', function(gameId) {
        destroyGame(socket, req, gameId, function(game, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('destroyed_game', game);
            }
        });
    });

    socket.on('join_game', function(gameId) {
        joinGame(socket, req, gameId, function(game, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('joined_game', game);
            }
        });
    });

    socket.on('leave_game', function(gameId) {
        console.warn('leave_game: ', gameId);
        leaveGame(socket, req, gameId, function(msg, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('left_game', msg);
            }
        });
    });

    socket.on('start_game', function(gameId) {
        console.warn('start_game: ', gameId);
        changeGameState(socket, req, gameId, 'start');
    });

    socket.on('end_game', function(gameId) {
        console.warn('end_game: ', gameId);
        changeGameState(socket, req, gameId, 'end');
    });

    socket.on('pause_game', function(gameId) {
        console.warn('pause_game: ', gameId);
        changeGameState(socket, req, gameId, 'pause');
    });

    socket.on('restart_game', function(gameId) {
        console.warn('restart_game: ', gameId);
        changeGameState(socket, req, gameId, 'restart');
    });

    socket.on('get_game', function(gameId) {
        console.warn('get_game: ', gameId);
        pushUpdateGame(socket, req, gameId);
    });

    socket.on('list_players', function(obj) {
        console.warn('list_players: ', obj);
        listPlayers(req, obj, function(players, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('players', players);
            }
        })
    });

    socket.on('list_games', function(obj) {
        console.warn('list_games: ', obj);
        listGames(req, obj, function(games, err) {
            if (err) {
                socket.emit('lcr_error', err);
            } else {
                socket.emit('games', games);
            }
        })
    });

});
