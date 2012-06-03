<?php
/* Adds a new account to the database. Fails if the information is invalid or
 * the account already exists.*/

require('accounts.php');

function makeNormalAccount($username, $unencryptedPassword, $email) {
  if(Accounts::doesUserExist($username)) {
    Accounts::returnError("Username already exists");
  }

  $salt = Accounts::getSalt();
  $password = Accounts::hashPassword($unencryptedPassword, $salt);
  $collection = Accounts::getAccountsTable();
  $collection->insert(array('username' => $username,
                            'password' => $password, 
                            'salt'     => $salt,
                            'email'    => $email,
                            'type'     => 'none'));
}

$typeOfAccount = $_POST['type'];
if($typeOfAccount === 'none') {
  makeNormalAccount($_POST['username'], $_POST['password'], $_POST['email']);
}
else {
  Accounts::returnError("Unknown type of account: $typeOfAccount");
}

?>
