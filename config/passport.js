var LocalStarategy = require('passport-local').Strategy;
var User = require('../model/user_m');

module.exports = function(passport){

  passport.serializeUser(function(user, done){
    done(null, user.id);
  });

  passport.deserializeUser(function(id,done){
    User.findById(id, function(err,user){
      done(err, user);
    });
  });

  passport.use('local-login', new LocalStarategy({
    usernameField:'username',
    passwordField:'password',
    passReqToCallback:true
    }, function(req, username, password, done){
      User.findOne({'username':username}, function(err,user){
        if(err) return done(err);
        if(!user){
          return done(null, false, req.flash('error_msg','User does not exist'));
        }
        if(!user.validPassword(password)){
          return done(null, false, req.flash('error_msg','Password does not match'));
        }
        return done(null, user);
      });
    }
  ));

  passport.use('local-signup', new LocalStarategy({
    usernameField:'username',
    passwordField:'password',
    passReqToCallback:true
  }, function(req, username, password, done){
    process.nextTick(function(){
      User.findOne({'username':username}, function(err,user){
        if(err) return done(err);
        if(user){
          return done(null, false,req.flash('error_msg','User already exists'));
        }else{
          var newUser = new User();
          newUser.username = username;
          newUser.password = newUser.generateHash(password);
          newUser.save(function(err){
            if(err) done(err);
            return done(null, newUser);
          });
        }
      })
    });
  }
  ))
}
