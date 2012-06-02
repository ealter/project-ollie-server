<?php
/* Logs into the account and returns a session id */

require('accounts.php');

function invalidLogin() {
  Accounts::returnError("Either the username or password is incorrect");
}

/* Attempts to login. Returns true on success */
function login($username, $unencryptedPassword) {
  $accounts = Accounts::getAccountsTable();
  $user = $accounts->findOne(array('username' => $username));
  if($user === NULL) {
    invalidLogin();
  }
  $password = sha1($user['salt'] . $unencryptedPassword);
  return $password == $user['password'];
}

$username = $_POST['username'];
$unencryptedPassword = $_POST['password'];
if(login($username, $unencryptedPassword)) {
  session_start();
  $_SESSION['username'] = $username;
  echo json_encode(array('session_id' => session_id()));
}
else {
  invalidLogin();
}

?>
