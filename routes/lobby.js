var User = require('../model/user_m');

module.exports = function(express, app, passport, io){
  var router = express.Router();

  router.get('/',isLoggedin, function(req, res){
    User.find({}).sort('-score').limit(10).exec(function(err,list){
      if (err) console.log('error getting user list');
      res.render('lobby/lobby', {user:req.user, list:list});
    });

  });
  var users = [];
  var lobby = io.of('/lobby');

  lobby.on('connection', function(socket){
    console.log('user connected in lobby');

    socket.on('newMsg', function(data){
      lobby.emit('msg', {name:socket.name, msg:data});
    });

    socket.on('newUser', function(data,callback){
      console.log(data);
      socket.name = data;
      if(users.indexOf(socket.name) != -1){
        callback(false);
      }else{
        callback(true);
        users.push(socket.name);
        lobby.emit('list', users);
      }
    });

    socket.on('disconnect', function(){
      console.log('user disconnected');
      users.splice(users.indexOf(socket.name), 1);
      lobby.emit('list', users);

      // Uncomment below line to check current user list
      // for( var i in users){
      //   console.log('users in lobby ' + users[i]);
      // }
    });
  });



  //Check if user is logged in
  //Better make this as a module since the function needs to be reusable
  function isLoggedin(req,res,next){
    if(req.isAuthenticated()){
      return next();
    }
    res.redirect('/');
  }
  app.use('/lobby', router);
}
