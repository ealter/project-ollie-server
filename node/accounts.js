var db = require('mongojs').connect('ollie',
         ['accounts', 'accountsMeta', 'accountRecovery']);
var mongodb = require('mongodb');
var passwordHash = require('password-hash');
var url = require('url');
var crypto = require('crypto');
var constants = require('./game-constants.js');
var nodemailer = require('nodemailer');
nodemailer.sendmail = true;
var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail");
var mustache = require('mustache');
var fs = require('fs');

Date.prototype.addHours = function(h){
    this.setHours(this.getHours()+h);
    return this;
}

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

function generateAuthToken(username, callback) {
  crypto.randomBytes(16, function(ex, buf) {
    if (ex) throw ex;
    var token = new mongodb.Binary(buf);
    db.accounts.update({username: username},
                       {$set: {token: token, tokenDate: new Date()}});
    callback(buf);
  });
}

function login(username, unencryptedPassword, callback) {
  db.accounts.findOne({username: username}, function(err, result) {
    if(err || result === null) {
      callback(false);
      return;
    }
    callback(passwordHash.verify(unencryptedPassword, result.password));
  });
}

function assertRequiredParameters(query, requiredParameters) {
  for (var i=0; i < requiredParameters.length; i++) {
    var propName = requiredParameters[i];
    if(!query.hasOwnProperty(propName) || query[propName] === "") {
      return {error: 'Missing parameter ' + propName};
    }
  }
  return null;
}

/* Password Recovery */
function getPasswordResetLink(email, callback) {
  crypto.randomBytes(8, function(ex, buf) {
    db.accountRecovery.findOne({email: email}, function (err, result) {
      if(err) {
        callback(null);
        return;
      }
      var expires = new Date().addHours(2);
      var data = {email: email, token: new mongodb.Binary(buf), expires: expires};
      if(result === null)
        db.accountRecovery.insert(data);
      else
        db.accountRecovery.update({email: email}, data);
      var encodedToken = encodeURIComponent(buf.toString('base64'));
      callback(url.format({protocol: 'https:',
                         hostname: constants.hostname,
                         pathname: '/accounts/recoverPassword',
                         query: {email: email, auth: encodedToken}}));
    });
  });
}

/* Exported functions */
exports.newAccount = function (req, res) {
  var query = url.parse(req.url.href, true).query;
  assertRequiredParameters(query, ['username', 'password', 'email']);
  makeNormalAccount(query.username, query.password, query.email, function (success) {
    res.send(success);
  });
};

exports.generateUserName = function (req, res) {
  generateUserName(function (name) {
    res.send({username: name});
  });
};

exports.login = function (req, res) {
  var query = url.parse(req.url.href, true).query;
  assertRequiredParameters(query, ['username', 'password']);
  login(query.username, query.password, function (success) {
    if(success) {
      generateAuthToken(query.username, function (token) {
        res.send({auth_token: token.toString('base64')});
      });
    }
    else {
      res.send({error: "Invalid username or password"});
    }
  });
};

/* Password recovery exported functions */
exports.sendRecoveryEmail = function (req, res) {
  var query = url.parse(req.url.href, true).query;
  assertRequiredParameters(query, ['email']);
  var email = query.email;
  doesEmailExist(email, function (emailExists) {
    if(!emailExists) {
      console.log("email " + email + " does not exist");
      return;
    }
    getPasswordResetLink(email, function (link) {
      if(!link) {
        res.send({error: 'Password recovery link is invalid. Please try again'});
        return;
      }
      fs.readFile('./passwordRecoveryEmail.html', 'ascii', function (err, template) {
        if(err) throw err;
        var message = {
          from: constants.noReplyEmail,
          to: email,
          subject: "Recover password for " + constants.gamename,
          html: mustache.to_html(template, {companyName: constants.gamename,
                                            resetLink: link})
        };
        console.log(message);
        transport.sendMail(message, function (error) {
          if(error)
            console.error("Sending an email encountered an error");
          else
            console.log("message sent");
        });
        res.send("If the email address exists, the password recovery message " +
                 "has been sent");
      });
    });
  });
};

