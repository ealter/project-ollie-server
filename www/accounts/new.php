<?php
/* Adds a new account to the database. Fails if the information is invalid or
 * the account already exists.*/

function getAccountsTable() {
  $m = new Mongo();
  return $m->ollie->accounts;
}

function doesUserExist($username) {
  $collection = getAccountsTable();
  $user = $collection->findOne(array('username' => $username));
  return $user !== NULL;
}

function getSalt() {
  return mt_rand();
}

function returnError($message) {
  header("Status: 400 Bad Request");
  echo json_encode(array('error' => $message));
  exit;
}

function makeNormalAccount($username, $unencryptedPassword) {
  $username = $_GET['username'];
  $unencryptedPassword = $_GET['password'];
  if(doesUserExist($username)) {
    returnError("Username already exists");
  }

  $salt = getSalt();
  $password = sha1($salt . $unencryptedPassword);
  $collection = getAccountsTable();
  $collection->insert(array('username' => $username,
                            'password' => $password, 
                            'salt'     => $salt,
                            'type'     => 'none'));
}

$typeOfAccount = $_GET['type'];
if($typeOfAccount === 'none') {
  makeNormalAccount($_GET['username'], $_GET['password']);
}
else {
  returnError("Unknown type of account: $typeOfAccount");
}

?>
