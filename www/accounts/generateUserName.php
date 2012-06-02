<?php
require('accounts.php');

function generateUserName() {
  $m = new Mongo();
  $table = $m->ollie->accountsMeta;
  $fieldName = 'highestAccountId';
  $field = $table->findOne(array(), array($fieldName => 1));
  $accountId = $field !== NULL ? $field[$fieldName] + 1 : 135821;
  while(Accounts::doesUserExist($userName = 'user' . $accountId)) {
    $accountId++;
  }
  $data = array($fieldName => $accountId);
  if($field !== NULL)
    $table->update(array(), $data);
  else
    $table->insert($data);

  return $userName;
}

echo json_encode(array('username' => generateUserName()));

