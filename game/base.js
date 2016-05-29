var session = require('express-session');

var crypto = require('crypto');
var base64url = require('base64url');

var locallydb = require('locallydb');

var db = new locallydb('./db');

var accountsCollection = db.collection('accounts');

var MemoryStore = require('session-memory-store')(session);

var ioSession = require('socket.io-session');

var uuid = require('node-uuid');
var shortid = require('shortid');

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$#');

var exports = module.exports = {};

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

// Bootstrap a couple of accounts
var acct = accountsCollection.where({username: 'skipsauls@gmail.com'});

if (!acct || acct.items.length <= 0) {
    accountsCollection.insert({
        username: 'skipsauls@gmail.com',
        id: generateId(),
        password: 'test1234',
        info: {
            alias: 'Skip'
        }
    });
}

var acct = accountsCollection.where({username: 'ssauls@salesforce.com'});

if (!acct || acct.items.length <= 0) {
    accountsCollection.insert({
        username: 'ssauls@salesforce.com',
        id: generateId(),
        password: 'test1234',
        info: {
            alias: 'SSauls'
        }
    });
}


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
            pusher.emit('game_error', err);
        } else {
            pusher.emit('game', game);
        }
    });

}

// REMOVE
/*
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
*/

function getAccount(username) {
    console.warn('getAccount: ', username);
    try {
        var accts = accountsCollection.where({username: username});
        console.warn('acct: ', acct);
        return accts.items[0];
    } catch (e) {
        return null;
    }
}

function createAccount(socket, req, obj, callback) {
    if (getAccount(obj.username)) {
        if (typeof callback === 'function') {
            callback(null, {error: 'username_exits', msg: 'That username exists, please try another.'});
        }
    } else {
        accountsCollection.insert({
            id: generateId(),
            username: obj.username,
            password: obj.password,
            info: {
                alias: obj.alias || 'Player_' + accountsCollection.items.length
            }
        });
        if (typeof callback === 'function') {
            callback({type: 'account_created', msg: 'Account created'}, null);
        }
    }
}


function login(socket, req, obj, useSession, callback) {
    var account = null;

    obj = obj || {};

    if (useSession === true) {
        var player = null;
        var user = users[req.session.token];
        player = user ? players[user.playerId] : null;
        if (player) {
            var account = getAccount(player.username); //accounts[player.username];
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

    var account = getAccount(obj.username); // accounts[obj.username];
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
    //var player = players[user.playerId];
    if (req.session.user) {
        try {
            users[req.session.token] = undefined;
            delete users[req.session.token];
            players[user.playerId] = undefined;
            delete players[user.playerId];
            req.session.user = undefined;
            delete req.session.user
            if (typeof callback === 'function') {
                callback({type: 'logout_success', msg: 'Logged Out'}, null);
            }
        } catch (e) {
            if (typeof callback === 'function') {
                callback(null, {error: 'not_logged_in', msg: 'Not Logged In'});
            }
        }
    } else {
        if (typeof callback === 'function') {
            callback(null, {error: 'not_logged_in', msg: 'Not Logged In'});
        }
    }
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

function loadGameModule(app, socket, req, gameDef, callback) {

	try {
		var path = '../games/' + gameDef.type.toLowerCase() + '.js';
		var gameModule = require(path);
		gameModule.init(app, gameDef);
		if (typeof callback === 'function') {
			callback(gameModule, null);
		}
	} catch (e) {
		console.warn('Exception loading game module: ' + e);
		if (typeof callback === 'function') {
			callback(null, {error: 'game_load_module_error', msg: 'Error loading game module.'});
		}
	}

}

function createGame(app, socket, req, gameDef, callback) {
    console.warn('createGame: ', gameDef);

    var user = users[req.session.token];
    var player = players[user.playerId];
    console.warn('player: ', player);

    var game = games[gameDef.gameId];    

    var roomName = gameDef.room || 'Lobby';
    var room = rooms[roomName];

    if (room === null || typeof room === 'undefined') {
        callback(null, {error: 'room_does_not_exist', msg: 'Room does not exist.'});
    } else {

        if (game === null || typeof game === 'undefined') {

        	loadGameModule(app, socket, req, gameDef, function(module, err) {

        		if (err) {
		            if (typeof callback === 'function') {
        				callback(null, err);
        			}
        		} else {
		            game = {
		                id: generateId(),
		                owner: player.username,
		                name: gameDef.name || 'New Game',
		                room: gameDef.room || 'Lobby',
		                type: gameDef.type,
		                players: {},
		                scope: gameScope[gameDef.scope] || gameScope.public,
		                state: gameState.ready,
		                activeJoin: false,
		                module: module
		            };

		            game.players[player.id] = player.info;

		            games[game.id] = game;

			        game.module.update(socket, req, nsp, game, 'create', function(res, err) {
			        	console.warn('^^^^^^^^^^ module.update returned: ', res, err);
			        });

		            console.warn('created game:', game);

		            pushUpdateLists(null, req);

		            if (typeof callback === 'function') {
		                callback(game, null);
		            }
        		}
        	});

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
        socket.emit('game_error', {error: 'game_does_not_exist', msg: 'The game does not exist.'});
    } else if (game.owner !== player.username) {
        socket.emit('game_error', {error: 'user_is_not_game_owner', msg: 'The user is not the owner of the game.'});
    } else {

        game.module.update(socket, req, nsp, game, 'destroy', function(res, err) {
        	console.warn('^^^^^^^^^^ module.update returned: ', res, err);
        });

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

        game.module.update(socket, req, nsp, game, 'join', function(res, err) {
        	console.warn('^^^^^^^^^^ module.update returned: ', res, err);
        });

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

        game.module.update(socket, req, nsp, game, 'leave', function(res, err) {
        	console.warn('^^^^^^^^^^ module.update returned: ', res, err);
        });

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
        socket.emit('game_error', {error: 'game_does_not_exist', msg: 'The game does not exist.'});
    } else if (game.owner !== player.username) {
        socket.emit('game_error', {error: 'user_is_not_game_owner', msg: 'The user is not the owner of the game.'});
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
            socket.emit('game_error', {error: 'invalid_game_state', msg: 'The game state is invalid.'});
        } else if (newState === game.state) {
            socket.emit('game_error', {error: 'game_state_unchanged', msg: 'The game is already in that state, no change.'});            
        } else {
            game.state = newState;

            game.module.update(socket, req, nsp, game, 'state', function(res, err) {
            	console.warn('^^^^^^^^^^ module.update returned: ', res, err);
            });

            nsp.to(game.room).emit('game_state_changed', {type: game.type, id: game.id,  name: game.name, state: game.state});

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
                nsp.to(room).emit('game_message', msg);
            }
        }
    }
}

var nsp = null;

function init(app, server) {

	var options = {};


	var sessionMiddleware = session({
	    store: new MemoryStore(options),
	    secret: 'game',
	    saveUninitialized: true,
	    resave: true
	});

	app.use(sessionMiddleware);

	app.get('/game', function(req, res) {
	    if (validateToken(req.session.token) === false) {
	        var expiresIn = 1000 * 60 * 60 * 24 * 7; // 7 days
	        req.session.token = generateToken(16, expiresIn);
	    }
	    res.cookie('game', req.session.token);
	    res.render('pages/game', {title: 'Game', appId: process.env.APPID});
	});


	var io = require("socket.io")(server);

	io.use(function(socket, next) {
	    sessionMiddleware(socket.request, {}, next);
	});

	nsp = io.of('/game');

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

	    if (validateToken(req.session.token) === false) {
	        var expiresIn = 1000 * 60 * 60 * 24 * 7; // 7 days
	        req.session.token = generateToken(16, expiresIn);
	        token = req.session.token;
	    } else {
	        console.warn('CALLING login');
	        login(socket, req, null, true, function(ret, err) {
	            console.warn('>>>>>>>>>>>>>> returned: ', ret, err);
	            if (err) {
	                socket.emit('game_error', err);
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

	    socket.emit('test', 'Welcome to the Game!');

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

	    socket.on('signup', function(obj) {
	        console.warn('signup: ', obj);
	        createAccount(socket, req, obj, function(ret, err) {
	            console.warn('returned: ', ret, err);
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('signup_success', ret);
	            }
	            //pushUpdateLists(null, req);
	        });
	    });

	    socket.on('login', function(obj) {
	        console.warn('login: ', obj);
	        login(socket, req, obj, false, function(ret, err) {
	            console.warn('returned: ', ret, err);
	            if (err) {
	                socket.emit('game_error', err);
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
	                socket.emit('game_error', err);
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
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('created_room', room);
	            }
	        });
	    });

	    socket.on('destroy_room', function(roomName) {
	        console.warn('destroy_room: ', roomName);
	        destroyRoom(socket, req, roomName, function(roomName, err) {
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('destroyed_room', roomName);
	            }
	        });
	    });

	    socket.on('join_room', function(roomName) {
	        console.warn('join_room: ', roomName);
	        joinRoom(socket, req, roomName, function(room, err) {
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('joined_room', room);
	            }
	        });
	    });

	    socket.on('leave_room', function(roomName) {
	        console.warn('leave_room: ', roomName);
	        leaveRoom(socket, req, roomName, function(room, err) {
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('left_room', room);
	            }
	        });
	    });

	    socket.on('list_rooms', function(obj) {
	        console.warn('list_rooms: ', obj);
	        listRooms(req, obj, function(rooms, err) {
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('rooms', rooms);
	            }
	        })
	    });

	    socket.on('create_game', function(gameDef) {
	        createGame(app, socket, req, gameDef, function(game, err) {
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('created_game', game);
	            }
	        });
	    });

	    socket.on('destroy_game', function(gameId) {
	        destroyGame(socket, req, gameId, function(game, err) {
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('destroyed_game', game);
	            }
	        });
	    });

	    socket.on('join_game', function(gameId) {
	        joinGame(socket, req, gameId, function(game, err) {
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('joined_game', game);
	            }
	        });
	    });	    

	    socket.on('leave_game', function(gameId) {
	        console.warn('leave_game: ', gameId);
	        leaveGame(socket, req, gameId, function(msg, err) {
	            if (err) {
	                socket.emit('game_error', err);
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
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('players', players);
	            }
	        })
	    });

	    socket.on('list_games', function(obj) {
	        console.warn('list_games: ', obj);
	        listGames(req, obj, function(games, err) {
	            if (err) {
	                socket.emit('game_error', err);
	            } else {
	                socket.emit('games', games);
	            }
	        })
	    });

	});

}

exports.init = init;


