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
        "status" : {
          "blocker" : "",
          "today" : "",
          "yesterday": "",
          "date": ""
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
  }, genPageAlert("We got your new status!", "success"));
};

var register = function (username) {

  var _email = $('#username').val(),
      _password = $('#password').val();
  
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
      setTimeout(function(){ window.location = "index.html"; }, 3000);
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
      
      $("#report-content").empty();

      _.each( data.users, function( val, key ) {
        val.user = key;
        val.profileImageURL = localStorage.getItem("profileImg") || PROFILE_IMAGE_URL;
        if( val.status.date == today ) {
          createStatus("report-content", val).done(function(){
            //nothing yet!
          });
        }
      });
      
    });

  });
};


$(function () {

  //Scripts
  $("#login-btn").on('click', function(e) {
    login();
  });

  $("#btnSubmit").on('click', function(e) {
    saveStatus(USERNAME_CONSTANT);
  });

  $("#register-btn").on('click', function(e) {
    // Unauthenticate the client
    console.log("click");
    register();
  });

  //check if I'm logged in if I am let me in!
  var isAuth = zapstatus.getAuth();
  
  if(isAuth) {
    console.log(isAuth);
    var _email = isAuth.password.email,
        _username = _email.substring(0, _email.indexOf('@'));

    $('#login').fadeOut();
    $('#status, #report').fadeIn();
    USERNAME_CONSTANT = _username;
    localStorage.setItem("profileImg", isAuth.password.profileImageURL);
    PROFILE_IMAGE_URL = isAuth.password.profileImageURL;
    getUser(_username);
    getYesterdaysInfo(_username);
    report();

    //load profile image
    if(PROFILE_IMAGE_URL !== "" || localStorage.getItem("profileImg").length) {
      $(".profile-img").attr("src", localStorage.getItem("profileImg")) ;
    }
  }

  $("#logout-btn").on('click', function(e) {
    // Unauthenticate the client
    zapstatus.unauth();
    window.location.reload();
  });

  var today = (function () {
      var fullDate = new Date();console.log(fullDate);
      var twoDigitMonth = fullDate.getMonth()+"";if(twoDigitMonth.length==1)  twoDigitMonth="0" +twoDigitMonth;
      var twoDigitDate = fullDate.getDate()+"";if(twoDigitDate.length==1) twoDigitDate="0" +twoDigitDate;
      var currentDate = twoDigitDate + "/" + twoDigitMonth + "/" + fullDate.getFullYear();

      return currentDate;
      //$('.today').text(currentDate);
    })();

  $('.today').text(today);

  $(".navbar-nav li").on('click', function(e) {
    $(this).siblings().removeClass("active");
    $(this).addClass("active");
  });
});