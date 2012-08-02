var gameConstants = require('./game-constants');
var db = require('mongojs').connect(gameConstants.databaseName,
                                   ['emailList']);
var assertRequiredParameters = require('./utility-fns').assertRequiredParameters;

function doesEmailExist(email, callback) {
  db.emailList.findOne({email: email.toLowerCase()}, function (err, result) {
    if(result === undefined) {
      console.error("The mongodb server might be down!");
    }
    callback(result !== null);
  });
}

function addEmail(email, callback) {
  doesEmailExist(email, function (emailExists) {
    if(!emailExists)
      db.emailList.insert({email: email.toLowerCase()}, callback);
    else
      callback();
  });
}

pages = {}
exports.pages = pages
//TODO: return html and make sure email is valid
pages.emailSignup = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['email']))
    return;
  addEmail(query.email, function(error) {
    if(error)
      res.send({error: error});
    else
      res.send({success: true});
  });
};

