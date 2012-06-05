var mongodb = require("mongodb"),
    mongoserver = new mongodb.Server('127.0.0.1', 27017, {}),
    db = new mongodb.Db('ollie', mongoserver);
var passwordHash = require('password-hash');
var url = require('url');

function getCollection (name, callback) {
  db.open(function(err, db) {
    if(!err) {
      db.collection(name, function(err, collection) {
        callback(collection);
      });
    }
    else {
      console.error("Could not open colletion " + name);
      console.error(err);
    }
  });
}

function doesUserExist (username, callback) {
  getCollection('accounts', function(collection) {
    collection.findOne({username: username}, function (err, result) {
      callback(result !== null);
    });
  });
}

function doesEmailExist (email, callback) {
  getCollection('accounts', function(collection) {
    collection.findOne({email: email}, function (err, result) {
      callback(result !== null);
    });
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
      getCollection('accounts', function(collection) {
        collection.insert({username: username, password: password, email: email});
        callback({success: true});
      });
    });
  });
}

function generateUserName(callback) {
  getCollection('accounts', function(collection) {
    console.log('got collection');
    collection.findOne(function (err, result) {
      var fieldName = 'highestAccountId';
      var prefix = 'user';
      var accountId = result !== null ? result[fieldName] : 135821;
      var checkUserName = function(accountId, callback) {
        console.log(accountId);
        doesUserExist(prefix + accountId, function(userExists) {
          if(userExists)
            checkUserName(accountId + 1);
          else
            callback(accountId);
        });
      };
      checkUserName(accountId, function(accountId) {
        console.log(accountId);
        var data = {};
        data[fieldName] = accountId;
        if(result === null)
          collection.insert(data);
        else
          collection.update({}, {$set: data});
        callback(prefix + accountId);
      });
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
