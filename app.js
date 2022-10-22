const express = require('express'); // server software
const bodyParser = require('body-parser'); // parser middleware
const session = require('express-session');  // session middleware
const passport = require('passport');  // authentication
const connectEnsureLogin = require('connect-ensure-login');// authorization

const User = require('./user.js'); // user model
const Song = require('./song.js'); // song model
const PlayList = require('./playlist.js'); // playlist model

const app = express();

// Only way I could pass the songs that matched the playlist requirements
// to be temporarily stored. Then the user can finish editing the playList
// and chose whether or not to save

var userPlay = [];
var userPlayName = "";
//var currUser = "";

// Boiler code needed sp that ejs works properly
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

// ----------------------------------------------------------
// For user authentication
// ----------------------------------------------------------

// Configure Sessions Middleware
app.use(session({
  secret: 'r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// Configure Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(User.createStrategy());

// To use with sessions
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req, res){
  res.redirect('/login');
})

app.get("/login", function(req, res){
  res.render('login.ejs');
})

app.post('/login', passport.authenticate('local', { failureRedirect: '/' }),  function(req, res) {
	res.redirect('/home');
});
//
// app.post("/login", function(req, res){
//   var username = req.body.username;
//
//   User.find({name: username}, function(err, users){
//     if(users.length !== 0){
//       currUser = users[0].name;
//       res.redirect('/home');
//     }else{
//       console.log("User or password was incorrect");
//       res.redirect('/login');
//     }
//   });
// });
//
app.get('/createUser', function(req, res){
  res.render('createUser.ejs');
})

app.post('/createUser', function(req, res){
  const userData = req.body;
  User.register({username: userData.user, active: true}, userData.password);
  res.redirect('/home');
})

// renders the home.ejs page, does not post any new data, simply
// renders the updated content. User redirected here after
// performing an action

app.get("/home", connectEnsureLogin.ensureLoggedIn(), function(req, res){

  // console.log();
  // Song.find({_id: req.user.songs}, function(err, foundSongs){ // do not know if this line is proper practice
  //       res.render('home', {foundSongs: foundSongs});
  // });

  User.find({}, 'songs', function(err, foundSongs){
    if(err){
      console.log(err);
    }
    console.log(foundSongs[0]);
  });

});

// Used for when the user wants to add a new song to their library,
// it formats their input to insert the document into the database

app.post("/home", function(req, res){

  const newSong = formatNewSong(req.body);

  const insert = {
    name: newSong[0],
    artist: newSong[1],
    genre: newSong[2]
  };

  // const insert = new Song({
  //   name: newSong[0],
  //   artist: newSong[1],
  //   genre: newSong[2]
  // });

  // insert.save(function(err){
  //   if(!err){
  //     console.log("Song saved to db successfully");
  //   }else{
  //     console.log(err);
  //   }
  // });
  //
  // // console.log(insert);
  var userID = req.user._id.toString()
  //  var songID = insert._id.toString();
  //
  User.updateOne({_id: userID}, {$push: {songs: insert}}, function(err){
    if(err){
      console.log(err);
    }
  });

  res.redirect("/home");
});

// Whenever the user wants to save a playlists, this get request is called.
// It saves then redirects to /playlist

app.get("/saveplaylist", function(req, res){

  const play = new PlayList ({
    name: userPlayName,
    songs: userPlay
  });
  play.save(function(err){
    if(!err){
      console.log('saved successfully');
    }else{
      console.log(err);
    }
  })

  const playListID = play._id.toString();
  const userID = req.user._id.toString();

  User.updateOne({_id: userID}, {$push: {playLists: playListID}}, function(err){
    if(err){
      console.log(err);
    }
  });
  res.redirect('/createPlaylist');
})

// Simply renders the songs the user currently has in their playlist

app.get("/createPlaylist", connectEnsureLogin.ensureLoggedIn(), function(req, res){
  res.render('createPlaylist', {playName: userPlayName, foundSongs: userPlay});
});

app.get("/playlists", connectEnsureLogin.ensureLoggedIn(), function(req, res){
  PlayList.find({_id: req.user.playLists}, function(err, foundPlayLists){
      res.render('playlists', {foundPlayLists: foundPlayLists});
  });
});


app.get("/playlists/:customPlayList", connectEnsureLogin.ensureLoggedIn(), function(req, res){

  var customPlayListName = req.params.customPlayList;
  PlayList.find({name: customPlayListName}, function(err, playList){
    // console.log(playList);
    if(!err){
      res.render('currPlay', {playName: playList[0].name, foundSongs: playList[0].songs })
    }else{//
      console.log(err);

    }
  })
})


app.post("/createPlaylist", function(req, res){
  const playListQuery = req.body;
  const matchedSongs = translateSong(playListQuery);
  var foundSongs = [];
  var songId = [];
  userPlayName = req.body.playName;

  // Basically this is a query into the db based on what the User
  // wants for their playlist. It checks if any songs match the
  // current requirement (name, artist or genre) the user wants.
  // It then goes through all the songs that matched the query to see if they have
  // already been added to the playlist (don't want the same song twice)


  Song.find({name: {$in: matchedSongs[0]}}, function(err, songs){
    if(!err){
      if(songs.length !== 0){
        for(var i = 0; i < songs.length; i++){

          // The section below is what checks if the song has already been
          // added to the playlist. If indexOf === -1 it means that the song id
          // doesnt match any of the songs id's in the playlist

          if(songId.indexOf(songs[i]._id.toString()) === -1){
            foundSongs.push(songs[i]);
            songId.push(songs[i]._id.toString());
          }
        }
      };
    }else{
      console.log(err);
    }
  });

  Song.find({artist: {$in: matchedSongs[1]}}, function(err, songs){
    if(!err){
      if(songs.length !== 0){
        for(var i = 0; i < songs.length; i++){
          if(songId.indexOf(songs[i]._id.toString()) === -1){
            foundSongs.push(songs[i]);
            songId.push(songs[i]._id.toString());
          }
        }
      };
    }else{
      console.log(err);
    }
  })

  Song.find({genre: {$in: matchedSongs[2]}}, function(err, songs){
    if(!err){
      if(songs.length !== 0){
        for(var i = 0; i < songs.length; i++){
          if(songId.indexOf(songs[i]._id.toString()) === -1){
            foundSongs.push(songs[i]);
            songId.push(songs[i]._id.toString());
          }
        }
      }
      userPlay = foundSongs;
      res.redirect('/createPlaylist');
    }else{
      console.log(err);
    };
  })
})

app.post("/deleteSong", function(req, res){
  const checkedItemId = req.body.checkbox;
  Song.findByIdAndRemove(checkedItemId, function(err){
    if(err){
      console.log('error deleting item from db');
    }else{
      console.log('successfully deleted item from db');
      res.redirect('/home');
    };
  });

  var userID = req.user._id.toString()
  // var songID = insert._id.toString();

  User.updateOne({_id: userID}, {$pull: {songs: checkedItemId}}, function(err){
    if(err){
      console.log(err);
    }
  });
});

app.post("/deletePlayList", function(req, res){
  const checkedItemId = req.body.checkbox;
  PlayList.findByIdAndRemove(checkedItemId, function(err){
    if(err){
      console.log('error deleting item from db');
    }else{
      console.log('successfully deleted item from db');
      res.redirect('/playlists');
    };
  });

  // const playListID = play._id.toString();
  const userID = req.user._id.toString();

  User.updateOne({_id: userID}, {$pull: {playLists: checkedItemId}}, function(err){
    if(err){
      console.log(err);
    }
  });

})

app.post("/deletePlaySong", function(req, res){
  const checkedItemId = req.body.checkbox;

  for(var i = 0; i < userPlay.length; i++){
    if(userPlay[i]._id == checkedItemId){
      userPlay.splice(i, 1);
      break;
    }
  }
  res.redirect("/createPlaylist");
});

app.listen(3000, function(){
  console.log("Server started on port 3000");
});

// --------------------------------------------
// Helper Functions
// --------------------------------------------

function formatString(input){
  var arr = input.split(',');
  for(var i = 0; i < arr.length; i++){
    arr[i] = arr[i].toUpperCase();
    arr[i] = arr[i].trim();
  }
  return arr;
}

function translateSong(input){
  var result = [];
  result.push(formatString(input.name));
  result.push(formatString(input.artist));
  result.push(formatString(input.genre));
  return result;
}

function formatNewSong(song){
  result = [];
  result.push(song.name.toUpperCase());
  result.push(formatString(song.artist));
  result.push(formatString(song.genre));
  return result;
}
