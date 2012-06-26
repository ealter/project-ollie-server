function getKFactor(ranking, numberOfGamesPlayed) {
  return 40; //TODO
}

function getNewRanking(elo, opponentElo, kFactor, matchResult) {
  var expectedScore = 1/(1 + pow(10, ((opponentElo - elo) / 400.0)));
  return elo + kFactor * (matchResult - expectedScore);
}

function getPlayerScores(winnerELO, loserELO, kFactor) {
  var newWinnerELO = getNewRanking(winnerELO, loserELO,  kFactor, 1);
  var newLoserELO  = getNewRanking(loserELO,  winnerELO, kFactor, 0);
  return {winner: newWinnerELO, loser: newLoserELO};
}

exports.getKFactor = getKFactor;
exports.getPlayerScores = getPlayerScores;

