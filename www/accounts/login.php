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
  $data = array('auth_token' => base64_encode(Accounts::generateAuthToken($username)));
  echo json_encode($data);
}
else {
  invalidLogin();
}

?>
