var crypto = require('crypto');
var mongodb = require('mongodb');
var passwordHash = require('password-hash');
var db = require('./game-constants').connectToDatabase(['accounts', 'accountRecovery']);
var accounts = require('./accounts');
var url = require('url');
var nodemailer = require('nodemailer');
nodemailer.sendmail = true;
var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail");
var fs = require('fs');
var mustache = require('mustache');
var constants = require('./game-constants.js');
var assertRequiredParameters = require('./utility-fns').assertRequiredParameters;

Date.prototype.addHours = function(h){
    this.setHours(this.getHours()+h);
    return this;
}

function getPasswordResetLink(email, callback) {
  email = email.toLowerCase();
  crypto.randomBytes(16, function(ex, buf) {
    db.accountRecovery.findOne({email: email}, function (err, result) {
      if(err) {
        callback(null);
        return;
      }
      var expires = new Date().addHours(6);
      var data = {email: email,
                  token: new mongodb.Binary(buf),
                expires: expires};
      if(result === null)
        db.accountRecovery.insert(data);
      else
        db.accountRecovery.update({email: email}, data);
      var encodedToken = encodeURIComponent(buf.toString('base64'));
      callback(url.format({protocol: 'http:',
                           hostname: constants.hostname,
                           pathname: '/accounts/recoverPassword',
                              query: {email: email, auth: encodedToken}}));
    });
  });
}

function isPasswordResetTokenValid(email, token, callback) {
  email = email.toLowerCase();
  var tokenBinary = new mongodb.Binary(new Buffer(decodeURIComponent(token), 'base64'));
  db.accountRecovery.findOne({email: email.toLowerCase(), token: tokenBinary}, function (err, result) {
    callback(result !== null && result.expires >= new Date());
  });
}

function resetPassword(email, token, unencryptedPassword, callback) {
  email = email.toLowerCase();
  isPasswordResetTokenValid(email, token, function(valid) {
    if(!valid) {
      callback(false);
      return;
    }
    db.accountRecovery.remove({email: email});
    var password = passwordHash.generate(unencryptedPassword);
    db.accounts.update({email: email}, {$set: {password: password}});
    //Send an email
    var message = {
         from: constants.noReplyEmail,
           to: email,
      subject: "Your password has been reset",
         text: "This is an automatic message from Gorilla Warefare informing "+
               "you that your password for " + constants.companyName +
               " has been reset."
    };
    transport.sendMail(message, function (error) {
      if(error)
        console.error("Sending email confirming a password change failed");
    });
    callback(true);
  });
}

exports.sendRecoveryEmail = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['email']))
    return;
  var email = query.email.toLowerCase();
  accounts.doesEmailExist(email, function (emailExists) {
    if(!emailExists) {
      console.log("email " + email + " does not exist");
      res.send({error: "The email does not exist"}); //TODO: give success msg
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

exports.recoverPassword = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['email', 'auth']))
    return;
  isPasswordResetTokenValid(query.email, query.auth, function (valid) {
    if(!valid) {
      res.send({error: "Invalid email recovery link"});
      return;
    }
    fs.readFile('./passwordRecoveryForm.html', 'ascii', function (err, template) {
      if(err) throw err;
      res.send(mustache.to_html(template, {email: query.email,
                                            auth: query.auth,
                                         company: constants.companyName}));
    });
  });
};

exports.resetPassword = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['email', 'auth', 'password', 'password_repeat']))
    return;
  var formError = function(message) {
    res.send(message);
  };
  var password = query.password;
  if(password !== query.password_repeat) {
    formError("The passwords do not match.");
    return;
  }
  if(strlen(password) < constants.minPasswordLength) {
    formError("The password must be at least " + constants.minPasswordLength +
              " characters long.");
    return;
  }
  var auth = decodeURIComponent(query.auth);
  resetPassword(query.email, auth, query.password, function (isValid) {
    if(!isValid) {
      formError("The password reset link is not valid.");
      return;
    }
    fs.readFile('./passwordResetSuccess.html', function (err, html) {
      if(err) throw err;
      res.send(html);
    });
  });
};

