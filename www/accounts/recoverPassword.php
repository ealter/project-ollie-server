<?php
/* Used to recover passwords. Users are sent to this page from a recovery email. */

require('accounts.php');

function checkRecoveryLink($email, $auth) {
  if(!Accounts::isPasswordResetTokenValid($email, $auth)) {
    header("Status: 400 Bad Request");
    echo "Invalid email recovery link"; //TODO: make this nicer
    exit;
  }
}

$email = $_GET['email'];
$auth  = $_GET['auth'];
checkRecoveryLink($email, $auth);

//TODO: make the html look good

?>

<html>
<head>
  <title>Recover Password</title>
</head>
<body>
  <h1>Recover your password for Gorilla Warefare</h1>
  <form action="resetPassword.php" method="post">
    <input type="hidden" name="auth_token" value="<?php echo $auth ?>" /> <br />
    <input type="hidden" name="email" value="<?php echo $email ?>" />
    New password: <input type="password" name="password" />
    Confirm new password: <input type="password" name="password_repeat" />
  </form>
</body>
</html>
