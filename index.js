var express = require('express');
var app = express();
var path = require('path');
var passport = require('passport');
var bodyParser = require('body-parser');
var session = require('express-session');
var flash = require('connect-flash');
var mongoose = require('./config/database');
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(3000, function(){
  console.log('app listening......');
})

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname,'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(session({
  secret:'secret_drawing',
  saveUninitialized:false,
  resave:false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

require('./config/passport')(passport);
require('./routes/user')(express, app, passport);
require('./routes/lobby')(express, app, passport,io);
require('./routes/room')(express, app, passport,io);

app.get('/', function(req,res){
  res.render('index');
});
