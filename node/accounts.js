var db = require('mongojs').connect('ollie', ['accounts']);
var passwordHash = require('password-hash');
var url = require('url');

function doesUserExist (username, callback) {
  db.accounts.findOne({username: username}, function (err, result) {
    callback(result !== null);
  });
}

function doesEmailExist (email, callback) {
  db.accounts.findOne({email: email}, function (err, result) {
    callback(result !== null);
  });
}

function makeNormalAccount (username, unencryptedPassword, email, callback) {
  doesUserExist(username, function(userExists) {
    if(userExists) {
      callback({error: 'Username already exists'});
      return;
    }
    doesEmailExist(email, function(emailExists) {
      if(emailExists) {
        callback({error: 'Email already exists'});
        return;
      }
      var password = passwordHash.generate(unencryptedPassword);
      db.accounts.insert({username: username, password: password, email: email});
      callback({success: true});
    });
  });
}

exports.newAccount = function (req, res) {
  var query = url.parse(req.url.href, true).query;
  var requiredProperties = ['username', 'password', 'email'];
  for (var i=0; i < requiredProperties.length; i++) {
    var propName = requiredProperties[i];
    if(!query.hasOwnProperty(propName) || query[propName] === "") {
      res.send({error: 'Missing parameter ' + propName});
      return;
    }
  }
  makeNormalAccount(query.username, query.password, query.email, function (success) {
    res.send(success);
  });
};
