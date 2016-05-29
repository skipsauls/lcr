// rochambeau.js
// Simple Rochambeau / Rock, Paper, Scissors game
console.warn('rochambeau.js');

var rochambeau = (function () {

	function showMessage(obj, msg) {
		var board = getGameBoard(obj);
		console.warn('showMessage: ', obj, msg, board);
		var msgEl = board.querySelector('[name="message"]');
		console.warn('msgEl: ', msgEl);
		msgEl.innerHTML = msg;

	}

	function update(obj) {
		console.warn('rochambeau.update: ', obj);
		showMessage(obj, 'action: ' + obj.action);
	}

    // The public API
    return {
        update: update
    };

}());

registerGameModule('rochambeau', rochambeau);
	
