module.exports = function(express, app, passport){
  var router = express.Router();

  router.get('/login', function(req,res){
    res.render('usr/login', {message:req.flash('error_msg')});
  });


  router.get('/signup', function(req,res){
    res.render('usr/signup', {message:req.flash('error_msg')});
  });

  router.get('/profile', isLoggedin, function(req,res){
    res.render('usr/profile', {user:req.user});
  });


  router.get('/logout', function(req,res){
    req.logout();
    res.redirect('../');
  });
  router.post('/login', passport.authenticate('local-login', {
      successRedirect:'/lobby',
      failureRedirect:'/usr/login'
    })
  );

  router.post('/signup', passport.authenticate('local-signup',{
    successRedirect:'/',
    failureRedirect:'/usr/signup'
  }));


  function isLoggedin(req,res,next){
    if(req.isAuthenticated()){
      return next();
    }
    res.redirect('/login');
  }
  app.use('/usr', router);
}
