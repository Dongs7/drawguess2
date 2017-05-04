var User = require('../model/user_m');

module.exports = function(express, app, passport, io){
  var router = express.Router();
  var roomName;
  router.get('/:roomname',isLoggedin, function(req, res){
    roomName = req.params.roomname;
    // console.log(room);
    res.render('room/room', {user:req.user, roomname:roomName});
  });


  var roomUsers = {};
  var room = io.of('/room');
  var roomStatus={};
  var clients = {};
  var maxClient = 4;
  var playerIndex;
  var numClient;
  var answer={};
  var roomTimer = {};
  var drawer = {};
  var roomData = {};

  room.on('connection', function(socket){
    socket.room = roomName;

    socket.on('userName', function(username){
      socket.name = username;
      socket.join(socket.room);

      //Initialize user and room data if needed
      if(!roomUsers[socket.room] && !clients[socket.room] && !roomStatus[socket.room]){
        roomUsers[socket.room] = [];
        clients[socket.room] =[];
        roomStatus[socket.room] = 'waiting';
      }

      roomUsers[socket.room].push(socket);
      clients[socket.room].push(socket.name);

      updateUser(room, socket);

      if(roomStatus[socket.room] == 'waiting'){
        updateRoomStatus(room, socket);
      }else{
        if(roomData[socket.room]){
          for(var i in roomData[socket.room]){
            socket.emit('draw_Line', {line:roomData[socket.room][i]});
          }
        }
      }

      // console.log('Total num of Clients ' + numClient);
    });

    //Main chat function and check answers as well.
    //Condition: A drawer cannot type the answer.
    socket.on('newMsg', function(data){
      var sender = socket.name;
      var answerGuess = data.trim();
      if(answer[socket.room] != null){
        if (answerGuess == answer[socket.room]){
          if(drawer[socket.room] == sender){
            // console.log('drawer cant submit the answer');
            data='Drawer can\'t submit the answer';
          }else{
          room.to(socket.room).emit('winner',{msg:'We have winner!', winner:sender});
          updateScore(sender);
          stopTimer(socket,room,roomTimer);
          roomStatus[socket.room] = 'waiting';

          setTimeout(function(){
              updateRoomStatus(room,socket);
          },1000);
        }
        }
      }
      room.to(socket.room).emit('roomMsg', {name:sender, msg:data});
    });

    //Whenever the user connects the room,
    //send the current room status to the socket which is recently connected
    socket.on('roomStatus?', function(){
      // console.log('current Num Client?' + numClient);
      if(roomStatus[socket.room] === 'waiting'){
        updateRoomStatus(room, socket);
      }else{
        socket.emit('all:set',{status:1});
      }
    });

    //If the drawer is drawing something, get its data and
    //broadcast to others in the same room.
    //If users join during the game,
    //broadcast previous data of this round, so new users can catch up
    socket.on('draw_Line', function(data){
      if(roomStatus[socket.room] === 'playing'){
        if(socket.name == drawer[socket.room]){
          roomData[socket.room].push(data.line);
          room.to(socket.room).emit('draw_Line', {line:data.line});
        }else{
          console.log('Player can only draw the lines');
        }
      }
    });

    //If the drawer changes the color or size of brushes,
    //send these information to every client in the same room
    socket.on('canvas:change', function(data){
      if(socket.name === drawer[socket.room]){
        if(data.color || data.width){
          if(data.color){
            room.to(socket.room).emit('changes', {color:data.color});
          }else{
            room.to(socket.room).emit('changes', {width:data.width});
          }
        }
      };
    });

    //Select random drawer for the round and set an answer for the round
    socket.on('start:game', function(){
      var index = getPlayer(room,socket,numClient);
      drawer[socket.room] = roomUsers[socket.room][index].name;
      // console.log('This round drawer is ' + drawer);
      room.to(socket.room).emit('setup:answer', {status:100, msg:'The drawer is setting the answer..'});
      room.to(roomUsers[socket.room][index].id).emit('setup:answer', {status:99, msg:'You are the drawer'});

    });

    //Set an answer for the game then set room status as playing
    socket.on('round:answer', function(data){
      answer[socket.room] = data;
      console.log('This round\'s answer is ' + answer[socket.room]);
      if(answer[socket.room] != null){
        roomData[socket.room] = [];
        timer(room,socket,60);
        room.to(socket.room).emit('all:set',{status:1});
        roomStatus[socket.room] = 'playing';
      }
    });

    socket.on('clear:canvas', function(data){
      room.to(socket.room).emit('clear:canvas');
    });


    socket.on('disconnect', function(){

      updateUser(room, socket);
      if(clients[socket.room]){
        clients[socket.room].splice(clients[socket.room].indexOf(socket.name),1);
      }

      if(roomUsers[socket.room]){
        roomUsers[socket.room].splice(roomUsers[socket.room].indexOf(socket),1);
      }

      if(socket.name === drawer[socket.room]){
        room.to(socket.room).emit('draw_left', {msg:'Draw left the room. Game will reset'});
        console.log('After cancelled, room users are ' + clients[socket.room]);
        roomStatus[socket.room] = 'waiting';
        updateUser(room, socket);
        updateRoomStatus(room, socket);
        stopTimer(socket,room, roomTimer);
      }

      if(numClient <= 1){
        updateUser(room, socket);
        roomStatus[socket.room] = 'waiting';
        updateRoomStatus(room, socket);
        stopTimer(socket,room, roomTimer);
      }

      socket.leave(socket.room);

    });
  });

  //Update user status in real time
  function updateUser(room,socket){
    if(socket.adapter.rooms[socket.room]){
      numClient = socket.adapter.rooms[socket.room].length;
    }
    room.to(socket.room).emit('usersInfo', {list:clients[socket.room], num:numClient, maxClient:maxClient});
  }

  function updateRoomStatus(room,socket){
    resetRoom(room,socket, roomStatus);

    if(numClient <= 1){
      if(answer || drawer){
        delete answer[socket.room];
        delete drawer[socket.room];
      }
      room.to(socket.room).emit('updateRoomStatus', {msg:'waiting for players..'});
    }else{
      setTimeout(function(){
          if(answer || drawer){
            delete answer[socket.room];
            delete drawer[socket.room];
          }
          room.to(socket.room).emit('updateRoomStatus', {msg:'Waiting to start a game'});
          if(roomUsers[socket.room]){
            room.to(roomUsers[socket.room][0].id).emit('updateRoomStatus', {msg:'Press Start game'});
          }
      }, 500);
    }
  }

  //Get Random index for choosing the drawer
  function getPlayer(room, socket, numClient){
    var index = Math.floor(Math.random() * numClient);
    return index;
  }

  //Timer function
  function timer(room,socket, timer){
    roomTimer[socket.room] = setInterval(function(){
        room.to(socket.room).emit('timer', timer--);

      if(timer == -1){
        clearInterval(roomTimer[socket.room]);
        room.to(socket.room).emit('timer', 'time is up');
        setTimeout(function(){
          room.to(socket.room).emit('nowinner', {answer:answer[socket.room], msg:'No one got the answer'});
        },100);
        roomStatus[socket.room] = 'waiting';
        updateRoomStatus(room,socket);
      }
    },1000);
}


//Function to stop timer whenever it needs
function stopTimer(socket,room, roomTimer){
  clearInterval(roomTimer[socket.room]);
  room.to(socket.room).emit('timer', 'time is up');
}

function resetRoom(room,socket, roomStatus){
  // roomStatus[socket.room] = 'waiting';
  room.to(socket.room).emit('all:set',{status:0});
  if(roomData){
    delete roomData[socket.room];
  }
}

//If there is a winner, update database
function updateScore(winner){
  User.findOne({'username':winner}, function(err,user){
    if(err) console.log('User not found', err);
    user.score += 10;
    user.save(function(err){
      if(err) console.log('Score cannot be saved');
    })
  });
};

  //Check if user is logged in
  //Better make this as a module since the function needs to be reusable
  function isLoggedin(req,res,next){
    if(req.isAuthenticated()){
      return next();
    }
    res.redirect('/');
  }
  app.use('/room', router);
}
