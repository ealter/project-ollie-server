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

  public static function hashPassword($password, $salt) {
    return sha1($salt . $password);
  }

  public static function generateAuthToken($username) {
    $token = openssl_random_pseudo_bytes(16);
    $table = Accounts::getAccountsTable();
    $table->update(array('username' => $username),
                   array('$set' => array('token'     => new MongoBinData(sha1($token)),
                                         'tokenDate' => new MongoDate())));
    return $token;
  }

  /* Checks the 'remember me' token for validity */
  public static function isAuthTokenValid($username, $token) {
    $table = Accounts::getAccountsTable();
    $user = $table->findOne(array('username' => $username));
    if($user === NULL)
      return false;
    //TODO: make the token expire if the date was too long ago
    return $user['token'] == sha1($token);
  }

  public static function getPasswordResetLink($email) {
    $token = base64_encode(openssl_random_pseudo_bytes(8));
    $m = new Mongo();
    $table = $m->ollie->accountRecovery;
    $resetEntry = $table->findOne(array('email' => $email));
    $expires = new MongoDate(strtotime('+1 hour'));
    $data = array('email' => $email, 'token' => $token, 'expires' => $expires);
    if($resetEntry === NULL) {
      $table->insert($data);
    }
    else {
      $table->update(array('email' => $email), $data);
    }
    $url_token = urlencode($token);
    //TODO: fix this url
    return "106.187.44.7/accounts/recoverPassword.php?email=$email&auth=$url_token";
  }

  public static function isPasswordResetTokenValid($email, $token) {
    $m = new Mongo();
    $table = $m->ollie->accountRecovery;
    $resetEntry = $table->findOne(array('email' => $email,
                                        'token' => $token));
    return $resetEntry !== NULL && $resetEntry['expires']->sec > time();
  }

  public static function resetPassword($email, $token, $unencryptedPassword) {
    assert(Accounts::isPasswordResetTokenValid($email, $token));
    $m = new Mongo();
    $table = $m->ollie->accountRecovery;
    $table->remove(array('email' => $email));
    $table = Accounts::getAccountsTable();
    $salt = Accounts::getSalt();
    $password = Accounts::hashPassword($unencryptedPassword, $salt);
    $table->update(array('email' => $email), 
                   array('$set' => array('password' => $password,
                                         'salt'     => $salt)));

    //Send an email
    $subject = "Your password has been reset";
    $body = "This is an automatic message from Gorilla Warefare informing you
             that your password for Gorilla Warefare has been reset.";
    $from = "eliot.alter@tufts.edu"; //TODO
    $headers = "From: $from\r\n";
    mail($email, $subject, $body, $headers);
  }
}

?>
