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
  $body = "<html><body>
    <p>This email has been sent to you automatically from Gorilla Warefare
    in response to a request to recover your password.</p>
    <p>If you did not ask to recover your password, please ignore this email.</p>
    <p>To reset your password, please click on this link
  <a href=\"$recoveryLink\">$recoveryLink</a></p></body></html>";
  $from = 'eliot.alter@tufts.edu'; //TODO: change email address
  $headers = "MIME-Version: 1.0\r\n" .
             "Content-type: text/html\r\n" .
             "From: $from\r\n";
  return mail($email, $subject, $body, $headers);
}

$email = $_GET['email']; //TODO: make this post?
if(!doesEmailExist($email)) {
  echo "Email does not exist"; //TODO: delete this
  exit;
}
$link = Accounts::getPasswordResetLink($email);
sendRecoveryEmail($email, $link);
