const passport = require('passport');
const mongoose = require("mongoose");
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require("es6-promisify");
const mail = require("../handlers/mail");

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'Successfully Logged In!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out!');
  res.redirect('/login');
};

exports.isLoggedIn = (req,res,next) => {
  if(req.isAuthenticated()){
    next();
    return;
  }
  req.flash('error', 'You must be logged in!');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  // 1. See if a user with that email exists
  const user  = await User.findOne({ email: req.body.email });
  if(!user) {
    req.flash('error', 'No account with that email exists!');
    return res.redirect('back');
  }
  // 2. Set reset tokens and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  // 3. Send them an email with the token
  const resetURL = `https://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  });
  req.flash('success', `You have been emailed a password reset link.`);
  // 4. redirect to login page
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({ 
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  
  if(!user){
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  
  // if there is a user, show the password reset form
  res.render('reset', {title: 'Reset your password'});
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']){
    return next();
  }
  req.flash('error', 'Passwords do not match');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({ 
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  
  if(!user){
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  
  // nullify old token
  user.resetPasswordExpires = undefined;
  user.resetPasswordToken = undefined;
  
  const updatedUser = await user.save();
  
  // login after updating password
  await req.login(updatedUser);
  
  req.flash('success', 'Nice! Your password has been reset! You are now logged in!');
  res.redirect('/');
};