var db = require('mongojs').connect('ollie', ['accounts', 'accountsMeta']);
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

function generateUserName(callback) {
  db.accountsMeta.findOne(function (err, result) {
    var fieldName = 'highestAccountId';
    var prefix = 'user';
    var accountId = result !== null ? result[fieldName] : 135821;
    var checkUserName = function(accountId, callback) {
      doesUserExist(prefix + accountId, function(userExists) {
        if(userExists)
          checkUserName(accountId + 1, callback);
        else
          callback(accountId);
      });
    };
    checkUserName(accountId, function(accountId) {
      console.log(accountId);
      var data = {};
      data[fieldName] = accountId + 1;
      if(result === null)
        db.accountsMeta.insert(data);
      else
        db.accountsMeta.update({}, {$set: data});
      callback(prefix + accountId);
    });
  });
};

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

exports.generateUserName = function (req, res) {
  generateUserName(function (name) {
    res.send({username: name});
  });
};

