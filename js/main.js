require.config({
    paths: {
        'jQuery': 'jquery.min',
    },
    shim: {
        'jQuery': {
            exports: '$'
        }
    }
});

//core functions for jQuery stuff see ./scripts.js

var zapstatus = new Firebase("https://zapstatus.firebaseio.com");

var USERNAME_CONSTANT = "",
    PROFILE_IMAGE_URL = localStorage.getItem("profileImg") || "";

var login = function() {
  var email = $('#username').val(),
      password = $('#password').val(),
      username = email.substring(0, email.indexOf('@'));

  zapstatus.authWithPassword({
    "email": email,
    "password": password
  }, function(error, authData) {
    if (error) {
      alert("Login Failed!");
      console.log("Login Failed!", error);
    } else {
      console.log("Authenticated successfully with payload:", authData);
      $('#login').fadeOut();
      $('#nav, #status, #report').fadeIn();
      USERNAME_CONSTANT = username;
      localStorage.setItem("profileImg", authData.password.profileImageURL);
      PROFILE_IMAGE_URL = authData.password.profileImageURL;
      getUser(username);
      getYesterdaysInfo(username);
      report();

      if(PROFILE_IMAGE_URL !== "") {
        $(".profile-img").attr("src", PROFILE_IMAGE_URL);
      }
    }
  });

};

var genDefaultAvatar = function(username) {
  var _bgcolor = Math.floor(Math.random()*16777215).toString(16),
      _profileImg = "http://placehold.it/120/" + _bgcolor + "/ffffff?text=" + username.substr(0,2).toUpperCase();

      if (_bgcolor !== "ffffff" && _bgcolor.length == 6 ) {
        return _profileImg;
      } else {
        //there was an error run myself again
        return genDefaultAvatar(username);
      }
};

var setGravatar = function(profileImageURL) {

};

var getUser = function(username) {
    zapstatus.child("users").once("value", function(snapshot) {
      if( snapshot.child(username).exists() ) {
       console.log("found user!");
      } else {
        console.log("Can't find user, creating it!");
        var data = snapshot.val();

        data[username] = {
          "info": {
            "name": "John",
            "lastname": "Appleseed",
            "phone": "",
            "team": ""
          },
          "status" : {
            "blocker" : "",
            "today" : "",
            "yesterday": "",
            "date": "",
            "postedTime": ""
          }
        };

        zapstatus.child("users").set(data);
      }
    });
  
};

var getYesterdaysInfo = function(username) {
  zapstatus.child("users/" + username + "/status").once("value", function(snapshot) {
    console.log(snapshot.val());

    //archive yesterdays info
    if( snapshot.exists() ) {
      var _data = snapshot.val(),
        _blocker = _data.blocker || "",
        _today = _data.today || "",
        _yesterday = _data.yesterday || "";

      zapstatus.child("archives/" + username).push({
        "status" : {
          "blocker" : _blocker,
          "today" : _today,
          "yesterday" : _yesterday
        }
      });

      //return yesterday
      $("#yesterday-reminder").text(_data.yesterday);
      return _data.yesterday;
    }
  });
};

var genPageAlert = function(msg, type) {
  var dep = "";
  if (type == "success") {
    dep = "text!../templates/alerts/success.handlebars";
  }

  require([dep], function(alertTpl) {

    var doAlert =  (function() {
      var deferred = $.Deferred();
      var source  = alertTpl,
      template    = Handlebars.compile(source),
      placeholder = $('.main');

      
      deferred.resolve( placeholder.prepend(template({msg: msg})).hide().fadeIn('slow') );

      setTimeout(function(){ $(".alert").fadeOut("slow"); }, 2000);
      return deferred.promise();

    })();
  });
};

var saveStatus = function (username) {
  var usersRef = zapstatus.child("users/" + username);
  var userInfo = {};
  var userInfoRef = zapstatus.child("users/" + username + "/info").once("value", function(snapshot) {
    userInfo = snapshot.val();
  });

  var yesterday = $('#yesterday').val(),
      today = $('#today').val(),
      blockers = $('#blockers').val();

  var currentDate = (function () {
        var fullDate = new Date();
        var twoDigitMonth = fullDate.getMonth()+"";if(twoDigitMonth.length==1)  twoDigitMonth="0" +twoDigitMonth;
        var twoDigitDate = fullDate.getDate()+"";if(twoDigitDate.length==1) twoDigitDate="0" +twoDigitDate;
        var currentDate = twoDigitDate + "/" + twoDigitMonth + "/" + fullDate.getFullYear();

        return currentDate;
      })();

  var unixDate = $.now()/1000;

  usersRef.set({
    "info": userInfo,
    "status" : {
      "blocker" : blockers,
      "today" : today,
      "yesterday" : yesterday,
      "date": currentDate,
      "postedTime": unixDate
    }
  }, genPageAlert("We got your new status!", "success"));

  reportBlocker(blockers, username);
};

var numOfBlockers = 0,
    currentBlockerData = [];

var reportBlocker = function(blockerText, username) {
  var lametriczap = new Firebase("https://lametriczap.firebaseio.com/");
  var blockers = lametriczap.child("lametriczap/frames");
  var _today = (function () {
        var fullDate = new Date();console.log(fullDate);
        var twoDigitMonth = fullDate.getMonth()+"";if(twoDigitMonth.length==1)  twoDigitMonth="0" +twoDigitMonth;
        var twoDigitDate = fullDate.getDate()+"";if(twoDigitDate.length==1) twoDigitDate="0" +twoDigitDate;
        var currentDate = twoDigitDate + "/" + twoDigitMonth + "/" + fullDate.getFullYear();

        return currentDate;
      })();

  //Read data
  blockers.on("value", function(snapshot) { //"lametriczap" === 'blockers'
    console.log(snapshot);
    var _data = snapshot.val();
    console.log(snapshot.numChildren());
    currentBlockerData = _data;
    numOfBlockers = snapshot.numChildren();
  });


  //write data
  var options = {
    index: 0, //always show as soon as we send it
    text: blockerText + " -- reported by: "+ username
  };

  if(!$.isArray(currentBlockerData)) {
    blockers.remove();
    blockers.set({
      "lametriczap" : {
        "frames" : [ {
          "icon" : ""
        } ]
      }
    });
    //alert("Please try again, I promise I will work next time!");
  }

  //if text is too short quit this function (Ex. None)
  if(blockerText.length < 5) {
    return false;
  }

  currentBlockerData.unshift(
    {
      "index" : options.index,
      "text" : options.text,
      "icon" : "i184", //Stop sign
      "date" : _today
    }
  );

  blockers.set( currentBlockerData );
};

var register = function (username) {

  var _email = $('#username').val(),
      _password = $('#password').val(),
      _firstName = $('#name').val(),
      _lastName = $('#lastname').val(),
      _phone = $('#phone').val(),
      _team = $('#team').val(),
      username = _email.substring(0, _email.indexOf('@'));
  
  zapstatus.createUser({
    email: _email,
    password: _password
  }, function(error, userData) {
    if (error) {
      switch (error.code) {
        case "EMAIL_TAKEN":
          alert("The new user account cannot be created because the email is already in use.");
          break;
        case "INVALID_EMAIL":
          alert("The specified email is not a valid email.");
          break;
        default:
          alert("Error creating user:", error);
      }
    } else {
      console.log("Successfully created user account with uid:", userData.uid);
      var _msg = '<div class="alert alert-success" role="alert">';
          _msg += '<strong>Awesome!</strong> Your account was created re-directing you to the login screen in 3 secs. <a href="index.html">Don\'t wanna wait? Click here</a>';
          _msg += '</div>';

      $("#register").prepend(_msg);
      setTimeout(function(){ 
        zapstatus.child("users").once("value", function(snapshot) {
          if( snapshot.child(username).exists() ) {
           console.log("found user!");
          } else {
            console.log("Can't find user, creating it!");
            var data = snapshot.val();

            data[username] = {
              "info": {
                "name": _firstName,
                "lastname": _lastName,
                "phone": _phone,
                "team": _team
              },
              "status" : {
                "blocker" : "",
                "today" : "",
                "yesterday": "",
                "date": "",
                "postedTime": ""
              }
            };

            zapstatus.child("users").set(data);
          }
        });

        window.location = "index.html";
        //login();

      }, 3000);
    }
  });
};


var report = function() {

  require(["text!../templates/status.handlebars", 'underscore', "jQuery"], function(statusTpl, _) {

    var createStatus =  function(placeholderId, data) {
      var deferred = $.Deferred();
      var source  = statusTpl,
      template    = Handlebars.compile(source),
      placeholder = $('#' + placeholderId);

      
      deferred.resolve( placeholder.append(template(data)).hide().fadeIn('slow') );

      return deferred.promise();
    };


    zapstatus.on("value", function(snapshot) {
      console.log(snapshot.val());

      var today = (function () {
        var fullDate = new Date();console.log(fullDate);
        var twoDigitMonth = fullDate.getMonth()+"";if(twoDigitMonth.length==1)  twoDigitMonth="0" +twoDigitMonth;
        var twoDigitDate = fullDate.getDate()+"";if(twoDigitDate.length==1) twoDigitDate="0" +twoDigitDate;
        var currentDate = twoDigitDate + "/" + twoDigitMonth + "/" + fullDate.getFullYear();

        return currentDate;
      })();
      var data = snapshot.val();
      var $reportContent = $("#report-content");
      //this is dupe in scripts we should clean it later to have only one
      var $filterType = $(".nav-pills .active").data("type");
      var newStatusHandler = function() {
        $(".statusbox").each(function( i ) {
          //filter by type (depending on what you click)
          if ( $(this).attr("data-team") === $filterType ) {
            $(this).fadeIn();
          } else {
            $(this).hide();
          }
          //if others hide anything else ("others" --> '' in firebase)
          if ( $(this).attr("data-team") === "others" ) {
            $(".statusbox").not("[data-team='']").hide();
            $(".statusbox[data-team='']").fadeIn();
          }

          //if All show all
          if ( $filterType === "all" ) {
            $(".statusbox").fadeIn();
          }
        });
      };
      //end dupe

      $reportContent.empty();

      _.each( data.users, function( val, key ) {
        val.user = key;
        //val.profileImageURL = localStorage.getItem("profileImg") || PROFILE_IMAGE_URL;
        val.profileImageURL = genDefaultAvatar(key);
        if( val.status.date == today ) {
          createStatus("report-content", val).done(function(){
            //console.log("New Status has been created");
            
            newStatusHandler();
          });
        }
      });
      
    });

  });
};

//load scripts file
define(function (require) {
    var scripts = require('scripts');
    var timeago = require('timeAgo');
});


