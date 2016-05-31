var gameSys = require('../game/base.js');
console.warn('gameSys: ', gameSys);

var exports = module.exports = {};

var gameState = {

};

function init(app, gameDef) {
	console.warn('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ rochambeau.init: ', gameDef);
	app.get('/games/rochambeau', function(req, res) {
		console.warn('::::::::::::::::::::::::::::::::::::::::::: render rochambeau');
	    res.render('partials/games/rochambeau', {title: 'Rochambeau'});
	});

}

var choices = ["rock", "paper", "scissors"];

function mod(a, b) {
	c = a % b
	return (c < 0) ? c + b : c
}

function compare(choice1, choice2) {
    x = choices.indexOf(choice1);
    y = choices.indexOf(choice2);
    if (x == y) {
        return 0;
    }
    if (mod((x - y), choices.length) < choices.length / 2) {
        return 1;
    } else {
        return 2;
    }
}

function judge(socket, req, nsp, game) {
	console.warn('\n\n !!! judge: ', game);
	var gs = gameState[game.id];
	var round = gs.rounds[gs.rounds.length - 1];
	var winner = null;
	var player1 = null;
	var player2 = null;
	var result = 0;
	for (var playerId in round.rolls) {
		console.warn('playerId: ', playerId, ' rolled: ', round.rolls[playerId]);
		player2 = player1;
		player1 = playerId;
		if (player1 && player2) {
			console.warn('comparing: ', round.rolls[player1], round.rolls[player2]);
			result = compare(round.rolls[player1], round.rolls[player2]);
			console.warn('result: ', result);
			if (result === 1) {
				winner = player1;
			} else if (result === 2) {
				winner = player2;
			}
		}
	}

	round.winner = winner;
	for (var playerId in gs.players) {
		gs.players[playerId].rounds++;
		if (winner === null) {
			gs.players[playerId].ties++;
		} else if (playerId === winner) {
			gs.players[playerId].wins++;
		} else {
			gs.players[playerId].losses++;
		}
	}

	console.warn('\n\n !!! winner: ', winner);

	var message = null;
	if (winner !== null) {
		message = game.players[winner].alias + ' is the winner!';
	} else {
		message = 'The round is a tie.'
	}

	console.warn('\nmessage: ', message);

	nsp.to(game.room).emit('game_update', {
		action: 'results',
		players: game.players,
		rolls: round.rolls,
		id: game.id,
		name: game.name,
		state: game.state,
		round: gs.rounds.length,		
		winner: winner,
		stats: gs.players,
		message: message
	});


	newRound(socket, req, nsp, game);
}

function play(socket, req, nsp, game, roll) {
	var player = gameSys.getPlayer(req);
	console.warn('player: ' + player.info.alias + '(' + player.id + ') selected ' + roll);

	if (game.state !== 'running') {
		socket.emit('game_error', {error: 'game_not_in_play', msg: 'The game is not in play`.'});
	} else {
		var gs = gameState[game.id];
		console.warn('gs: ', gs);
		var round = gs.rounds[gs.rounds.length - 1];
		round.rolls = round.rolls || {};
		round.rolls[player.id] = roll;
		round.count++;
		if (round.count === Object.keys(gs.players).length) {
			judge(socket, req, nsp, game);
		}
	}
}

function newRound(socket, req, nsp, game) {
	console.warn('>>>>> newRound');
	var gs = gameState[game.id];
	console.warn('gs: ', gs);
	gs.rounds.push({
		rolls: {},
		count: 0,
		winner: null
	});

	var rolls = null;
	if (gs.rounds.length > 1) {
		rolls = gs.rounds[gs.rounds.length - 2].rolls;
	}

	nsp.to(game.room).emit('game_update', {
		action: 'new_round',
		players: game.players,
		rolls: 	rolls,
		id: game.id,
		name: game.name,
		state: game.state,
		round: gs.rounds.length,
		stats: gs.players
	});
}

function startGame(socket, req, nsp, game) {
	console.warn('>>>>> startGame');
	var gs = gameState[game.id];
	console.warn('gs: ', gs);
	newRound(socket, req, nsp, game);
}

function setupGame(sock, req, nsp, game) {
	console.warn('>>>>> setupGame');
	var gs = gameState[game.id];
	if (!gs) {
		gs = {
			players: {},
			rounds: []
		};
		gameState[game.id] = gs;
	}
}

function setupPlayer(socket, req, nsp, game) {
	var player = gameSys.getPlayer(req);
	gameState[game.id].players[player.id] = {rounds: 0, wins: 0, losses: 0, ties: 0};
	console.warn(']]]]]]]]]]]]]]]]] calling socket on play');
	socket.on('play', function(roll) {
		console.warn('rochambeau.play: ', roll);
		play(socket, req, nsp, game, roll);
	});
}

function update(socket, req, nsp, game, action, callback) {
	console.warn('\n\n @@@@@ rochambeau.update: ', game.id, action);

	var player = gameSys.getPlayer(req);

	if (action === 'create') {
		setupGame(socket, req, nsp, game);
	} else if (action === 'join') {
		setupPlayer(socket, req, nsp, game);		
	} if (action === 'ready' && game.players[player.id] !== null) {
		// Need to handle refresh/reconnect!!!!!!!!!!!!!!!!!
		//setupPlayer(socket, req, nsp, game);
	} else if (action === 'state') {
		if (game.state === 'running') {
			startGame(socket, req, nsp, game);

		}
	}

	var gs = gameState[game.id];

	nsp.to(game.room).emit('game_update', {
		action: action,
		players: game.players,
		id: game.id,
		name: game.name,
		state: game.state,
		round: gs && gs.rounds ? gs.rounds.length : 0,
		stats: gs ? gs.players : null
	});
}

exports.init = init;
exports.update = update;
