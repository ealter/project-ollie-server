var db = require('./game-constants').connectToDatabase(['accounts', 'accountsMeta', 'games']);
var accounts = require('./accounts');

var assertRequiredParameters = accounts.assertRequiredParameters;

//Assumes that the challanger and opponent exist.
function startGame(challenger, opponent, callback) {
  db.games.insert({challenger: challenger,
                     opponent: opponent,
                    startDate: new Date(),
             turnIsChallenger: true, //If true, this means that the challenger is up next
                   gameIsOver: false},
                  function (err, result) {
                    if(err) {
                      console.error(err);
                      callback(false);
                    } else {
                      callback(result[0]._id);
                    }
                  });
}

var pages = {};
exports.pages = pages;

pages.challengePlayer = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['username', 'auth_token', 'opponentUsername']))
    return;
  var username = query.username;
  var opponentUsername = query.opponentUsername;
  accounts.isAuthTokenValid(username, query.auth_token, function (isValid) {
    if(!isValid) {
      res.send({error: "Invalid authorization token"});
      return;
    }
    accounts.doesUserExist(opponentUsername, function (opponentExists) {
      if(!opponentExists) {
        res.send({error: "The opponent username is invalid"});
      } else {
        startGame(username, opponentUsername, function (gameId) {
          if(gameId) {
            res.send({gameId: gameId});
          } else {
            res.send({error: "Unknown error when starting the game"});
          }
        });
      }
    });
  });
};

