function User(){

};

core.user.user();

User.config = {
    useCaptcha : false
};

User.requirements = {
    confirmed_email: [],
};

User.defaultRoot = "/~~/user";

core.core.routes();
User.routes = new Routes();
var urls = ['login', 'doLogin', 'register', 'confirm_send', 'confirm_receive',
    'checkUsername', 'captchaIMG', 'logout'];

for(var i = 0; i < urls.length; i++){
    User.routes[urls[i]] = User.defaultRoot + '/' + urls[i];
}

User.findMyLocation = function(){
    if ( ! routes )
        return User.defaultRoot;
    
    var f = routes.find( User.routes );
    if ( ! f )
        return User.defaultRoot;

    return f;
};
