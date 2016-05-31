var diceMap = ["L", "X", "C", "X", "R", "X"];

/*
var player = {
chips: ['C', 'C', 'C']
};
*/

var _player = null;

var _selectedRoom = 'Lobby';
var _selectedGame = null;
var _playerRoomMap = null;
var _gameRoomMap = null;
var _rooms = null;
var _gameModules = {};
var _games = {};


// Join the game namespace
var socket = io('/game');

socket.on('connect', function() {
    console.warn('socket connect');
});

socket.on('test', function(data) {
    console.warn('socket test: ', data);
});

socket.on('disconnect', function() {
    console.warn('socket disconnect');
});

socket.on('login_success', function(obj) {
    console.warn('socket login_success: ', obj);
    _player = obj;
    //socket.emit('refresh');
    _selectedRoom = 'Lobby';
    showRooms();
    showPlayersInSelectedRoom();
    showGamesInSelectedRoom();
});

socket.on('logout_success', function(data) {
    console.warn('socket logout_success: ', data);
    _player = null;
});

socket.on('game_message', function(msg) {
    console.warn('game_message: ', msg);
});

socket.on('game_error', function(err) {
    console.warn('game_error: ', err);
});


function test() {
    console.warn('test');
    socket.emit('test', {
        foo: 1234
    });
}

function testUpdate() {
    console.warn('testUpdate');
    socket.emit('test_update', {});
}

function login(idx) {
    idx = typeof idx === 'undefined' ? '' : idx;
    var creds = {
        username: document.getElementById('username' + idx).value,
        password: document.getElementById('password' + idx).value

    };
    socket.emit('login', creds);
}

function logout() {
    socket.emit('logout', {});
}

// LCR Specific, older code, update and remove
function roll() {
    var chips = player.chips;
    var dice = [];
    var count = chips.length <= 3 ? chips.length : 3;
    for (var i = 0; i < count; i++) {
        die = parseInt(Math.random() * 1000000) % 3;
        dice[i] = this.diceMap[die];
    }
    console.warn("dice: ", dice);

    var roll = {
        player_id: '1234567890',
        token: '000AX0099BCQ570443',
        dice: dice
    };

    var obj = {
        method: 'POST',
        path: '/lcr/roll',
        data: roll
    };
    request(obj,
        function(res) {
            console.warn('res: ', res);
        },
        function(err) {
            console.warn('err: ', err);
        }
    );
}

function getRooms() {
    socket.emit('list_rooms', {});
}

function selectRoom(target) {
    var idx = target.selectedIndex;
    var roomName = target.options[idx].dataset.roomName;
    console.warn('selectRoom: ', roomName);
    _selectedRoom = roomName;
    //socket.emit('join_room', roomName);
    showPlayersInSelectedRoom();
    showGamesInSelectedRoom();

}

function enterRoom(roomName) {
    console.warn('enterRoom: ', roomName);
    _selectedRoom = roomName;
    socket.emit('join_room', roomName);
}

function showRooms() {
    if (!_rooms) {
        return;
    } else {
        var rooms = _rooms;

        var list = document.getElementById('rooms');
        list.innerHTML = null;
        var item = null;
        var label = null;
        var details = null;
        var fill = null;
        var totalLength = 40;
        for (var i = 0; i < rooms.length; i++) {
            room = rooms[i];
            console.warn('room: ', room);
            item = document.createElement('li');
            label = document.createElement('span');
            label.innerHTML = room.name;
            label.classList.add('label');
            item.appendChild(label);

            details = document.createElement('span');
            details.innerHTML = '(' + room.player_count + ' / ' + room.game_count + ')';
            details.classList.add('details');
            item.appendChild(details);

            //item.innerHTML = room.name + fill + details;

            item.dataset.roomId = room.id;
            item.dataset.roomName = room.name;

            item.onclick = function(evt) {
                var target = evt.target;
                var roomId = null;
                var roomName = null;

                while (target.parentElement !== null) {
                    if (target.dataset && target.dataset.roomId) {
                        roomId = target.dataset.roomId;
                        roomName = target.dataset.roomName;
                        break;
                    }
                    target = target.parentElement;
                }

                console.warn('roomName: ', roomName);

                if (roomName) {
                    enterRoom(roomName);
                }
            }


            if (_player && room.name === _player.roomName) {
                item.classList.add('selected');
            }

            list.appendChild(item);
        }

    }

}

socket.on('rooms', function(rooms) {
    console.warn('rooms: ', rooms);
    _rooms = rooms;
    showRooms();

});

function getGames() {
    socket.emit('list_games', {});
}

function getPlayers() {
    socket.emit('list_players', {});
}

function showPlayersInSelectedRoom() {
    if (!_playerRoomMap) {
        return;
    }

    var playerRoomMap = _playerRoomMap;

    var list = document.getElementById('players');
    list.innerHTML = null;
    var item = null;
    var room = null;
    var plyr = null;
    for (var roomName in playerRoomMap) {
        if (roomName === _selectedRoom) {
            //if (_player && _player.roomName === roomName) {
            room = playerRoomMap[roomName];
            for (var p in room.players) {
                plyr = room.players[p];
                item = document.createElement('li');
                item.innerHTML = plyr.info ? plyr.info.alias || 'N/A' : 'N/A';
                item.dataset.playerId = plyr.id;
                list.appendChild(item);
            }
        }
    }
}

socket.on('players', function(playerRoomMap) {
    _playerRoomMap = playerRoomMap;
    showPlayersInSelectedRoom();

});

function selectGame(evt) {
    var target = evt.target;
    console.warn('selectGame: ', target, target.value);
    var gameId = null;
    var gameName = null;
    var gameRoom = null;
    while (target.parentElement !== null) {
        if (target.dataset && target.dataset.gameId) {
            gameId = target.dataset.gameId;
            gameName = target.dataset.gameName;
            gameRoom = target.dataset.gameRoom;
            break;
        }
        target = target.parentElement;
    }
    console.warn('gameRoom: ', gameRoom);
    console.warn('gameId: ', gameId);
    console.warn('_selectedRoom: ', _selectedRoom);
    console.warn('_selectedGame: ', _selectedGame);

    var gamesList = document.getElementById('games');
    var items = gamesList.getElementsByTagName('li');
    var item = null;
    for (var i = 0; i < items.length; i++) {
        item = items[i];
        console.warn('item: ', item);
        if (item.dataset.gameRoom === gameRoom && item.dataset.gameName === gameName && item.dataset.gameId === gameId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    }

    if (gameId) {
        try {
            var game = _gameRoomMap[gameRoom].games[gameId];
            console.warn('game: ', game);

            _selectedGame = game;

            // Set the currently selected game id
            var list = document.getElementById('game_details');
            list.dataset.gameId = game.id;

            socket.emit('get_game', gameId);
/*
            loadGameBoard(game, function(board, err) {
                console.warn('loadGameBoard returned: ', board, err);
                if (board && !err) {
                    console.warn('---------------------------------------------> emitting board_ready');
                    socket.emit('board_ready', game.id);
                }
            });
*/
        } catch (e) {}
    }
}

function getGames() {
    socket.emit('list_games', {});
}

function showGamesInSelectedRoom() {
    if (!_gameRoomMap) {
        return;
    }

    var gameRoomMap = _gameRoomMap;

    var list = document.getElementById('games');
    list.innerHTML = null;
    var item = null;
    var room = null;
    var game = null;
    for (var roomName in gameRoomMap) {
        console.warn('roomName: ', roomName);
        if (roomName === _selectedRoom) {
            //if (_player && _player.roomName === roomName) {
            room = gameRoomMap[roomName];
            for (var g in room.games) {
                game = room.games[g];
                item = document.createElement('li');
                item.innerHTML = game.name;
                item.dataset.gameId = game.id;
                item.dataset.gameRoom = game.room;
                item.dataset.gameName = game.name;
                item.onclick = selectGame;
                list.appendChild(item);

                console.warn('game.name: ', game.name, _selectedGame);
                if (game.name === _selectedGame) {
                    item.classList.add('selected');
                }                
            }
        }
    }
}


socket.on('games', function(gameRoomMap) {
    _gameRoomMap = gameRoomMap;
    showGamesInSelectedRoom();
});

function signup(evt) {
    var body = document.getElementById('signup');
    showDialog('Signup', body, false, function(obj, err) {
        console.warn('dialog returned: ', obj, err);
        socket.emit('signup', obj);
    });
}

socket.on('signup_success', function(obj) {
    console.warn('signed up: ', obj);
});


function createRoom(evt) {
    var body = document.getElementById('new_room');
    showDialog('New Room', body, false, function(obj, err) {
        console.warn('dialog returned: ', obj, err);
        socket.emit('create_room', obj.name);
    });
}

socket.on('created_room', function(room) {
    console.warn('created room: ', room);
});

function destroyRoom() {
    socket.emit('destroy_room', _selectedRoom);
}

socket.on('destroyed_room', function(roomName) {
    console.warn('destroyed room: ', roomName);
});

// Fired to all clients when a room is closed or destroyed
socket.on('closed_room', function(roomName) {
    console.warn('closed room: ', roomName);
});

socket.on('player_joined_room', function(obj) {
    console.warn('player joined room: ', obj);
    _player.roomName = obj.roomName;
});

socket.on('player_left_room', function(obj) {
    console.warn('player left room: ', obj);
});

function joinRoom(roomName) {
    socket.emit('join_room', roomName);

}

socket.on('joined_room', function(room) {
    console.warn('joined room: ', room);
});

function leaveRoom(roomName) {
    socket.emit('leave_room', roomName);
}

socket.on('left_room', function(room) {
    console.warn('left room: ', room);
});

function createGame(evt) {
    var body = document.getElementById('new_game');
    showDialog('New Game', body, false, function(obj, err) {
        console.warn('dialog returned: ', obj, err);
        socket.emit('create_game', {
            room: _selectedRoom,
            name: obj.name,
            type: obj.type
        });
    });
}

socket.on('created_game', function(game) {
    console.warn('created game: ', game);
});

socket.on('destroyed_game', function(game) {
    console.warn('destroyed_game: ', game);
    var list = document.getElementById('game_details');
    if (game.id === list.dataset.gameId) {
        list.innerHTML = '';
        list.dataset.gameId !== null;
    }

    list = document.getElementById('game_players');
    if (game.id === list.dataset.gameId) {
        list.innerHTML = '';
        list.dataset.gameId !== null;
    }

});

var _currentGame = null;

function emit(type, obj, callback) {
    console.warn('base emit: ', type, obj);

    socket.emit(type, obj);

}

function foo() {
    console.warn('\n\nfoo');
}

socket.on('game', function(game) {
    console.warn('game: ', game);
    
    _currentGame = game;
    _games[game.id] = game;

    loadGameBoard(game, function(board, err) {
        console.warn('loadGameBoard returned: ', board, err);
        if (board && !err) {
            console.warn('---------------------------------------------> emitting board_ready');
            socket.emit('board_ready', game.id);
        }
    });

    var list = document.getElementById('game_details');
    list.dataset.gameId !== game.id;
    list.innerHTML = '';

    if (game === null || typeof game === 'undefined') {
        return;
    }

    var item = null;
    var label = null;
    var span = null;
    for (var key in game) {
        val = game[key];
        if (typeof val === 'function') {

        } else if (typeof val === 'object') {

        } else {
            item = document.createElement('li');
            label = document.createElement('label');
            label.innerHTML = key + ':';
            item.appendChild(label);
            span = document.createElement('span');
            span.innerHTML = val;
            item.appendChild(span);
            list.appendChild(item);
        }
    }

    list = document.getElementById('game_players');
    list.dataset.gameId = game.id;
    list.innerHTML = '';
    var player = null;
    for (var id in game.players) {
        player = game.players[id];
        item = document.createElement('li');
        label = document.createElement('label');
        label.innerHTML = player.alias;
        item.appendChild(label);
        span = document.createElement('span');
        span.innerHTML = ' (' + id + ')';
        item.appendChild(span);
        list.appendChild(item);
    }

});

function joinGame(evt) {
    var list = document.getElementById('game_details');
    var gameId = list.dataset.gameId;
    console.warn('joinGame: ', gameId);
    socket.emit('join_game', gameId);
}


function leaveGame(evt) {
    var list = document.getElementById('game_details');
    var gameId = list.dataset.gameId;
    console.warn('leaveGame: ', gameId);
    socket.emit('leave_game', gameId);
}

function startGame(evt) {
    var list = document.getElementById('game_details');
    var gameId = list.dataset.gameId;
    socket.emit('start_game', gameId);
}

function endGame(evt) {
    var list = document.getElementById('game_details');
    var gameId = list.dataset.gameId;
    socket.emit('end_game', gameId);
}

function pauseGame(evt) {
    var list = document.getElementById('game_details');
    var gameId = list.dataset.gameId;
    socket.emit('pause_game', gameId);
}

function restartGame(evt) {
    var list = document.getElementById('game_details');
    var gameId = list.dataset.gameId;
    socket.emit('restart_game', gameId);
}

socket.on('game_state_changed', function(obj) {
    console.warn('game_state_changed', obj);
    if (obj.state === 'ready') {
        //loadGameBoard(obj);
    }
});

function registerGameModule(type, obj) {
    console.warn('\n\n ---------> registerGameModule: ', type, obj);
    _gameModules[type] = obj;
    socket.emit('board_ready', _currentGame.id);
}

socket.on('game_update', function(obj) {
    console.warn('game_update', obj);
    try {
        var game = _games[obj.id];
        console.warn('game:  ', game);
        var gameType = game.type.toLowerCase();
        var module = _gameModules[gameType];
        console.warn('module: ', module);
        module['update'](obj);
    } catch (e) {
        console.warn('Game update exception: ', e);
    }
});

function destroyGame(evt) {
    var list = document.getElementById('game_details');
    var gameId = list.dataset.gameId;
    socket.emit('destroy_game', gameId);
}

function getGameBoard(obj) {
    //var boards = document.getElementById('game_boards');
    var game = _games[obj.id];
    var board = document.getElementById(game.type + '_' + game.id);
    return board;
}

function loadGameBoard(game, callback) {
    game = game || _currentGame;
    console.warn('loadGameBoard: ', game);

    var boards = document.getElementById('game_boards');
    console.warn('boards: ', boards);
    var board = document.getElementById(game.type + '_' + game.id);

    console.warn('board: ', board);

    if (board) {
        board.classList.remove('hidden');
        if (typeof callback === 'function') {
            callback(null, null);
        }
    } else {

        var gameType = game.type.toLowerCase();

        var obj = {
            accept: 'text/html',
            path: '/games/' + gameType
        }
        request(obj,
            function(res) {
                console.warn('success: ', res);
                board = document.createElement('div');
                board.classList.add('board');
                board.innerHTML = res;
                board.id = game.type + '_' + game.id;
                board.dataset.gameId = game.id;
                board.dataset.gameType = game.type;

                console.warn('_gameModules[' , gameType, ']: ', _gameModules[gameType]);

                if (!_gameModules[gameType]) {
                    var script = document.createElement('script');
                    script.src = '/javascripts/games/' + gameType + '.js';
                    script.type = 'text/javascript';
                    document.body.appendChild(script);
                }
                boards.appendChild(board);

                if (typeof callback === 'function') {
                    callback(board, null);
                }

            },
            function(err) {
                console.warn('error: ', err);
                if (typeof callback === 'function') {
                    callback(null, err);
                }
            }
        );

    }

}




