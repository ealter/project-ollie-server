<?php
/* Sends a recovery email to the person with a link that expires within a short
 * amount of time. */

require('accounts.php');

function doesEmailExist($email) {
  $collection = Accounts::getAccountsTable();
  $user = $collection->findOne(array('email' => $email));
  return $user !== NULL;
}

function sendRecoveryEmail($email, $recoveryLink) {
  //TODO: abstract out the game name into a constant
  $subject = "Recover password for Gorilla Warfare";
  $body = "This email has been sent to you automatically from Gorilla Warefare
  in response to a request to recover your password.\n
  If you did not ask to recover your password, please ignore this email.\n\n
  To reset your password, please click on this link
  <a href=\"$recoveryLink\">$recoveryLink</a>";
  $headers = "From: eliot.alter@tufts.edu\r\n"; //TODO: change this
  return mail($email, $subject, $body, $headers);
}

$email = $_GET['email']; //TODO: make this post?
if(!doesEmailExist($email)) {
  echo "Email does not exist"; //TODO: delete this
  exit;
}
$link = Accounts::getPasswordResetLink($email);
echo $link;
sendRecoveryEmail($email, $link);
