var journey = require('journey');

exports.createRouter = function () {
  var router = new (journey.Router);
  router.get('/').bind(function (req, res) {
    res.send('Nothing to show here');
  });
  var paths = ['accounts', 'matchmaking', 'marketing', 'games'];
  for(var i=0; i<paths.length; i++) {
    var path = paths[i];
    router.path('/' + path + '/', function() {
      var pages = require('./' + path + '.js').pages;
      for(var page in pages) {
        if(pages.hasOwnProperty(page)) {
          this.post(page).bind(pages[page]);
          this.get(page).bind(pages[page]);
        }
      }
    });
  }

  return router;
};
