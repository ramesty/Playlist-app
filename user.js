const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

// Connection to database

mongoose.connect("mongodb://localhost:27017/SongsDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Creating the schema, as well as the model, for all items that will be inserted
// into the users collection

const Schema = mongoose.Schema;

const User = new Schema({
  name: String,
  password: String,
  playLists: {type: [String], sparse: true},
  songs: [{
    name: String,
    artist: [String],
    genre: [String],
    // sparse: true
  }]
});

const Song = new Schema({
  name: String,
  artist: [String],
  genre: [String]
});

// const User = mongoose.model('User', userSchema);
User.plugin(passportLocalMongoose);

module.exports = mongoose.model('userData', User, 'userData');
