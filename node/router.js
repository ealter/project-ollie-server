var journey = require('journey');

exports.createRouter = function () {
  var router = new (journey.Router);
  router.get('/').bind(function (req, res) {
    res.send('Nothing to show here');
  });
  router.path('/accounts/', function() {
    var accounts = require('./accounts.js');
    this.get('new').bind(accounts.newAccount);
  });
  return router;
};
