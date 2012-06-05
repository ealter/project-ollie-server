Installation
============
To install the required packages, run the init script located in init/init.sh.

Running on localhost
====================
Use node-supervisor to run the main.js file.
Run the mongodb server as well.

Setting up email sending
========================
The server uses sendmail to send the email. If the email is not sending, try
adding the following line to /etc/hosts (where foo is your computer name):
``127.0.1 foo.local foo``
