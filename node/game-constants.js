/* Exports various global constants about the game */
var mongojs = require('mongojs');

exports.hostname = 'gorillawarfaregame.com';
exports.gamename = 'Gorilla Warfare';
exports.noReplyEmail = 'no-reply@' + exports.hostname;
exports.minPasswordLength = 1;
exports.databaseName = 'ollie';
exports.connectToDatabase = function (tables) {
  return mongojs.connect(exports.databaseName, tables);
}

