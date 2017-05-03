var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
// mongoose.connect(process.env.MONGO_DB);
mongoose.connect('mongodb://test:test@ds135800.mlab.com:35800/dongs8canvas');


var db = mongoose.connection;

db.once('open', function(err){
  if(err) console.log(err);
  console.log('DB connected');
});

db.on('error', function(err){
  if(err) console.log(err);
  console.log('DB Connection failed');
});

module.exports = mongoose;
