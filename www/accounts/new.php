<?php
/* Adds a new account to the database. Fails if the information is invalid or
 * the account already exists.*/

require('accounts.php');


function makeNormalAccount($username, $unencryptedPassword) {
  $username = $_POST['username'];
  $unencryptedPassword = $_POST['password'];
  if(Accounts::doesUserExist($username)) {
    Accounts::returnError("Username already exists");
  }

  $salt = Accounts::getSalt();
  $password = sha1($salt . $unencryptedPassword);
  $collection = Accounts::getAccountsTable();
  $collection->insert(array('username' => $username,
                            'password' => $password, 
                            'salt'     => $salt,
                            'type'     => 'none'));
}

$typeOfAccount = $_POST['type'];
if($typeOfAccount === 'none') {
  makeNormalAccount($_POST['username'], $_POST['password']);
}
else {
  Accounts::returnError("Unknown type of account: $typeOfAccount");
}

?>
