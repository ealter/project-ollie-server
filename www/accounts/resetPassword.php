<?php
/* Used to reset the password. Users are sent here from the form on
 * recoverPassword.php */

require('accounts.php');

function formError($message) {
  header("Status: 400 Bad Request");
  echo $message; //TODO: make this nicer
  exit;
}

$email           = $_POST['email'];
$auth            = $_POST['auth_token'];
$password        = $_POST['password'];
$password_repeat = $_POST['password_repeat'];

if($password !== $password_repeat) {
  formError("The passwords do not match");
}

if(strlen($password) < 6) {
  formError("The password must be at least 6 characters long");
}

if(!Accounts::isPasswordResetTokenValid($email, $auth)) {
  formError("The password reset link is not valid");
}

Accounts::resetPassword($email, $auth, $password);

?>

<html>
<head>
  <title>Password reset</title>
</head>
<body>
  <h1>Your password has successfully been reset</h1>
</body>
</html>
