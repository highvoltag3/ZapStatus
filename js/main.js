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


var zapstatus = new Firebase("https://zapstatus.firebaseio.com");

var USERNAME_CONSTANT = "";

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
      $('#status, #report').fadeIn();
      USERNAME_CONSTANT = username;
      getUser(username);
      getYesterdaysInfo(username);
      report();
    }
  });

};

var getUser = function(username) {
  zapstatus.child("users").once("value", function(snapshot) {
    if( snapshot.child(username).exists() ) {
     console.log("found user!");
    } else {
      console.log("Can't find user, creating it!");
      var data = {};

      data[username] = {
        "status" : {
          "blocker" : "null",
          "today" : "null",
          "yesterday": "null"
        }
      };

      zapstatus.child("users").set(data);
    }
  });
  
};

var getYesterdaysInfo = function(username) {
  zapstatus.child("users/" + username + "/status").once("value", function(snapshot) {
    console.log(snapshot.val());
    var _data = snapshot.val(),
        _blocker = _data.blocker || "",
        _today = _data.today || "",
        _yesterday = _data.yesterday || "";

    //archive yesterdays info
    if( snapshot.exists() ) {
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

var saveStatus = function (username) {
  var usersRef = zapstatus.child("users/" + username);
  var yesterday = $('#yesterday').val(),
      today = $('#today').val(),
      blockers = $('#blockers').val();

  var currentDate = (function () {
        var fullDate = new Date();console.log(fullDate);
        var twoDigitMonth = fullDate.getMonth()+"";if(twoDigitMonth.length==1)  twoDigitMonth="0" +twoDigitMonth;
        var twoDigitDate = fullDate.getDate()+"";if(twoDigitDate.length==1) twoDigitDate="0" +twoDigitDate;
        var currentDate = twoDigitDate + "/" + twoDigitMonth + "/" + fullDate.getFullYear();

        return currentDate;
      })();

  usersRef.set({
    "status" : {
      "blocker" : blockers,
      "today" : today,
      "yesterday" : yesterday,
      "date": currentDate
    }
  });
};

// var register = function (username) {
//   var usersRef = zapstatus.child("users/" + username);
//   var name = $('#firstname').val(),
//       email = $('#email').val(),
//       lastname = $('#lastname').val(),
//       password = $('#password').val();

//   usersRef.set({
//     "info" : {
//       "name" : name,
//       "lastname" : lastname,
//       "email": email
//     }
//   });
// };


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

      var data = snapshot.val();

      var today = (function () {
        var fullDate = new Date();console.log(fullDate);
        var twoDigitMonth = fullDate.getMonth()+"";if(twoDigitMonth.length==1)  twoDigitMonth="0" +twoDigitMonth;
        var twoDigitDate = fullDate.getDate()+"";if(twoDigitDate.length==1) twoDigitDate="0" +twoDigitDate;
        var currentDate = twoDigitDate + "/" + twoDigitMonth + "/" + fullDate.getFullYear();

        return currentDate;
        //$('.today').text(currentDate);
      })();

      
      $("#report-content").empty();

      _.each( data.users, function( val, key ) {
        console.log(val.status.date == today, "IF IS");
        val.user = key;
        if( val.status.date == today ) {
          createStatus("report-content", val).done(function(){
            $('.today').text(today);
          });
        }
      });

      
      
    });

          

  });
};



//Scripts
$("#login-btn").on('click', function(e) {
  login();
});

$("#btnSubmit").on('click', function(e) {
  saveStatus(USERNAME_CONSTANT);
});

//check if I'm logged in if I am let me in!
$(function () {
  var isAuth = zapstatus.getAuth();
  
  if(isAuth) {
    console.log(isAuth);
    var _email = isAuth.password.email,
        _username = _email.substring(0, _email.indexOf('@'));

    $('#login').fadeOut();
    $('#status, #report').fadeIn();
    USERNAME_CONSTANT = _username;
    getUser(_username);
    getYesterdaysInfo(_username);
    report();
  }

  $("#logout-btn").on('click', function(e) {
    // Unauthenticate the client
    zapstatus.unauth();
    window.location.reload();
  });
});