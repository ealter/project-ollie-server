<?php
class Accounts
{
  public static function returnError($message) {
    header("Status: 400 Bad Request");
    echo json_encode(array('error' => $message));
    exit;
  }

  public static function getAccountsTable() {
    $m = new Mongo();
    return $m->ollie->accounts;
  }

  public static function doesUserExist($username) {
    $collection = Accounts::getAccountsTable();
    $user = $collection->findOne(array('username' => $username));
    return $user !== NULL;
  }

  public static function getSalt() {
    return mt_rand();
  }

  public static function generateAuthToken($username) {
    $token = openssl_random_pseudo_bytes(16);
    $table = Accounts::getAccountsTable();
    $table->update(array('username' => $username),
                   array('$set' => array('token' => new MongoBinData(sha1($token)),
                                         'tokenDate' => new MongoDate())));
    return $token;
  }

  public static function isAuthTokenValid($username, $token) {
    $table = Accounts::getAccountsTable();
    $user = $table->findOne(array('username' => $username));
    if($user === NULL)
      return false;
    //TODO: make the token expire if the date was too long ago
    return $user['token'] == $token;
  }
}
?>
