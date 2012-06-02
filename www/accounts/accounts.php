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
}
?>
