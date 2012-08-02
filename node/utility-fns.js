exports.assertRequiredParameters = function(res, query, requiredParameters) {
  for (var i=0; i < requiredParameters.length; i++) {
    var propName = requiredParameters[i];
    if(!query.hasOwnProperty(propName) || query[propName] === "") {
      res.send({error: 'Missing parameter ' + propName});
      return false;
    }
  }
  return true;
}

