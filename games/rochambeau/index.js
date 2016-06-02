console.warn('\nrochambeau/index.js - __dirname: ', __dirname);

var express = require('express');

var gameSys = require('../../game/base.js');
console.warn('gameSys: ', gameSys);

var exports = module.exports = {};

var gameState = {

};

var gameDetails = {
	name: 'Rochambeau (Rock-Paper-Scissors)',
	description: 'Rock-paper-scissors is a zero-sum hand game usually played between two people, in which each player simultaneously forms one of three shapes with an outstretched hand. These shapes are "rock" (a simple fist), "paper" (a flat hand), and "scissors" (a fist with the index and middle fingers together forming a V). The game has only three possible outcomes other than a tie: a player who decides to play rock will beat another player who has chosen scissors ("rock crushes scissors") but will lose to one who has played paper ("paper covers rock"); a play of paper will lose to a play of scissors ("scissors cut paper"). If both players choose the same shape, the game is tied and is usually immediately replayed to break the tie. Other names for the game in the English-speaking world include roshambo and other orderings of the three items, sometimes with "rock" being called "stone"',
	minPlayers: 2,
	maxPlayers: 2,
	minRounds: 1,
	maxRounds: -1,
	resources: {
		javascripts: ['/static/javascripts/rochambeau.js'],
		stylesheets: ['/static/stylesheets/rochambeau.css']
	}
};

function init(app, callback) {
	console.warn('rochambeau.init');
/*
	app.get('/games/rochambeau', function(req, res) {
	    res.render(__dirname + '/views/index', {title: 'Rochambeau'});
	});

	app.use('/games/rochambeau/static', express.static(__dirname + '/public'));
*/
	if (typeof callback === 'function') {
		callback(gameDetails);
	}
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
	var gs = gameState[game.id];
	var round = gs.rounds[gs.rounds.length - 1];
	var winner = null;
	var player1 = null;
	var player2 = null;
	var result = 0;
	for (var playerId in round.rolls) {
		//console.warn('playerId: ', playerId, ' rolled: ', round.rolls[playerId]);
		player2 = player1;
		player1 = playerId;
		if (player1 && player2) {
			//console.warn('comparing: ', round.rolls[player1], round.rolls[player2]);
			result = compare(round.rolls[player1], round.rolls[player2]);
			//console.warn('result: ', result);
			if (result === 1) {
				winner = player1;
			} else if (result === 2) {
				winner = player2;
			}
		}
	}

	round.winner = winner;
	console.warn('\n\n !!! winner: ', winner);
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

	var message = null;
	if (winner !== null) {
		message = game.players[winner].alias + ' is the winner!';
	} else {
		message = 'The round is a tie.'
	}

	console.warn('\nmessage: ', message);

	sendGame(nsp.to(game.room), 'results', game);

	newRound(socket, req, nsp, game);
}

function play(socket, req, nsp, game, roll) {
	var player = gameSys.getPlayer(req);

	if (game.state !== 'running') {
		socket.emit('game_error', {error: 'game_not_in_play', msg: 'The game is not in play`.'});
	} else {
		var gs = gameState[game.id];
		var round = gs.rounds[gs.rounds.length - 1];
		round.rolls = round.rolls || {};
		round.rolls[player.id] = roll;
		round.count = Object.keys(round.rolls).length; // ++
		if (round.count === Object.keys(gs.players).length) {
			if (gs.judged !== true) {
				gs.judged = true;				
				judge(socket, req, nsp, game);
			}
		}
	}
}

var steps = ['ro', 'sham', 'bo', 'shoot'];
var _timer = null;

function newRound(socket, req, nsp, game) {
	console.warn('\n$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ newRound');

	var gs = gameState[game.id];
	gs.rounds.push({
		rolls: {},
		count: 0,
		winner: null
	});

	gs.step = null;


	var rolls = null;
	if (gs.rounds.length > 1) {
		rolls = gs.rounds[gs.rounds.length - 2].rolls;
	}

	sendGame(nsp.to(game.room), 'new_round', game);


	setTimeout(function() {

		var stepIndex = 0;
		var step = null;

		if (_timer) {
			clearInterval(_timer);
			delete _timer;
		}
		
		gs.judged = false;

		_timer = setInterval(function() {
			step = steps[stepIndex] || null;
			gs.step = step;
			sendGame(nsp.to(game.room), 'step', game);
			stepIndex++;
			if (stepIndex >= steps.length) {
				clearInterval(_timer);
				delete _timer;
				gs.step = null;
			}
		}, 1000);

	}, 2000);
}

function sendGame(sender, action, game) {

	var gs = gameState[game.id];

	sender.emit('game_update', {
		action: action,
		players: game.players,
		id: game.id,
		name: game.name,
		state: game.state,
		step: gs ? gs.step : null,
		rounds: gs ? gs.rounds : null,
		stats: gs ? gs.players : null
	});

}

function startGame(socket, req, nsp, game) {
	var gs = gameState[game.id];
	newRound(socket, req, nsp, game);
}

function setupGame(sock, req, nsp, game) {
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
}

function setupListeners(socket, req, nsp, game) {
	var player = gameSys.getPlayer(req);
	socket.on('play', function(roll) {
		play(socket, req, nsp, game, roll);
	});
}

function update(socket, req, nsp, game, action, callback) {
	console.warn('\n\nrochambeau.update: ', game.id, action);

	var player = gameSys.getPlayer(req);

	if (action === 'create') {
		setupGame(socket, req, nsp, game);
	} else if (action === 'join') {
		setupPlayer(socket, req, nsp, game);
		setupListeners(socket, req, nsp, game);	
	} if (action === 'ready' && game.players[player.id] !== null) {
		setupListeners(socket, req, nsp, game);	
	} else if (action === 'state') {
		if (game.state === 'running') {
			startGame(socket, req, nsp, game);

		}
	}

	var gs = gameState[game.id];

	sendGame(nsp.to(game.room), action, game);
}

exports.init = init;
exports.update = update;
exports.details = gameDetails;


