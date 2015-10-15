$(function () {

  //Scripts

  //check if I'm logged in if I am let me in!
  var isAuth = zapstatus.getAuth();
  
  if(isAuth) {
    console.log(isAuth);
    var _email = isAuth.password.email,
        _username = _email.substring(0, _email.indexOf('@'));

    $('#login').fadeOut();
    $('#nav, #status, #report').fadeIn();
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

  //fix .val from stripping line breaks from textarea
  $.valHooks.textarea = {
    get: function( elem ) {
      return elem.value.replace( /\r?\n/g, "<br />" );
    }
  };

  //assign events
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