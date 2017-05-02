var mongoose = require('mongoose');
var auth = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
  username:{type:String, required:true},
  password:{type:String, required:true},
  score:{type:Number, default:0}
});

userSchema.methods.generateHash = function(password){
  return auth.hashSync(password, auth.genSaltSync(8), null);
}

userSchema.methods.validPassword = function(password){
  return auth.compareSync(password, this.password);
}

var User = mongoose.model('users', userSchema);

module.exports = User;
