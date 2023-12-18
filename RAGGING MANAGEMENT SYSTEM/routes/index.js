var express = require('express');
var router = express.Router();

var checkSignIn = function (req) {
    if(req.session.user){
        return true;     //If session exists, proceed to page
    } else {
        return false;
    }
};

/* GET home page. */
router.get('/', function(req, res, next) {
    var msg=req.query.msg;
    sgn=false;
    if(checkSignIn(req))
    {
        sgn=true;
    }
    if(typeof msg=="undefined")
     msg=null;
    res.render('index', { title: 'Express',sgn:sgn ,msg:msg,user:req.session.user});
});

module.exports = router;
