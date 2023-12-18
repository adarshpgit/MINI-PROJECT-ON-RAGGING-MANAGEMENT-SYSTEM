var express = require('express');
var router = express.Router();

var checkSignIn = function (req) {
    if(req.session.user){
        return true;     //If session exists, proceed to page
    } else {
        return false;
    }
};
login = function(email, password, req, res) {
    req.getConnection(function(err, connection) {

        if (err) {
            console.log("error occurred", err);
        } else {
            connection.query('SELECT * FROM login WHERE email = ?', [email], function(error, results) {
                if (error) {
                    console.log("error occurred", error);
                } else {
                    console.info("Actual Result", results);

                    if (results.length > 0) {
                        if (results[0].password === password) {
                            var type = results[0].type;
                            var id = results[0].id;
                            var status = results[0].status;
                            var sql = `Select name from volunteer_profile where id=?`;
                            if (type == 1) {
                                sql = `Select name from admin_profile where id=?`;
                            }
                            connection.query(sql, [id], (error, innerResults) => { // Use a different variable name here
                                if (error) {
                                    console.log("error occurred", error);
                                } else {
                                    if (status != 1) {
                                        res.redirect(`/?msg=not_approved`);
                                    } else {
                                        console.log("results", innerResults[0]);
                                        console.log("type", type); // Use 'type' from the outer query
                                        if (type == 1) {
                                            req.session.user = { email: email, password: password, type: type, name: innerResults[0].name, id: id };
                                            res.redirect(`/dashboard/volunteers`);
                                        } else if (type == 0) {
                                            req.session.user = { email: email, password: password, type: type, name: innerResults[0].name, id: id };
                                            res.redirect(`/dashboard`);
                                        } else {
                                            console.error("Something happened");
                                        }
                                    }
                                }
                            });
                        } else {
                            res.redirect(`/?msg=dont_match`);
                        }
                    } else {
                        res.redirect(`/?msg=doesnt_exist`);
                    }
                }
            });
        }
    });
};

signup = function (name, email, password, confirm_password, req, res) {
    console.log("Received password:", password);
    console.log("Received confirm password:", confirm_password);
    if (password !== confirm_password) {
        res.redirect(`/?msg=password_mismatch`);
    } else {
        req.getConnection(function (err, connection) {
            if (err) {
                console.log("error ocurred", err);
            } else {
                connection.query('SELECT * FROM login WHERE email = ?', [email], function (error, results) {
                    if (error) {
                        console.log("error ocurred", error);
                    } else {
                        if (results.length > 0) {
                            res.redirect(`/?msg=already_present`);
                        } else {
                            var sql = 'INSERT INTO login(email,password) values(?,?)';
                            connection.query(sql, [email, password], function (error, result) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    connection.query('SELECT LAST_INSERT_ID()', function (error, result) {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            var login_id = result[0]['LAST_INSERT_ID()'];
                                            var sql1 = 'INSERT INTO volunteer_profile(name,login_id) values(?,?)';
                                            connection.query(sql1, [name, login_id], function (error, result) {
                                                if (error) {
                                                    console.log(error);
                                                } else {
                                                    res.redirect(`/?msg=registered`);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
        });
    }
};

logout = function (req,res) {
    req.session.destroy(function(){
        console.log("user logged out.")
    });
    res.redirect('/');
};

router.post('/', function (req, res, next) {
    var body = req.body;
    if (body.check == '1') {
        console.log("login");
        login(body.email, body.password, req, res);
    } else if (body.check == '2') {
        console.log("signup");
        signup(body.name, body.email, body.password, body.cnf_password, req, res); // Adjusted field name here
    }
    console.log(body);
});


router.get('/', function(req, res, next) {
    if(checkSignIn(req)) {
        req.getConnection(function (err, connection) {
            if (err) {
                res.send({
                    "code": 400,
                    "failed": "error ocurred"
                })
            }
            else {
                connection.query("Select id,complainant,victim,email,mobile,status from complaint", [], function (error, results) {
                    if (error) {
                        console.log("error ocurred", error);

                    } else {
                        res.render("dashboard", {users: results,profile_type:req.session.user.type});
                    }
                });
            }
        });
    }
    else {
        res.redirect(`/`);
    }
});


router.get('/complaint_view', function(req, res, next) {
    if (checkSignIn(req)) {
        let id = Number(req.query.im);
        req.getConnection(function (err, connection) {
            if (err) {
                res.send({
                    "code": 400,
                    "failed": "error ocurred"
                })
            }
            else {
                if (typeof req.query.mark != "undefined") {
                    connection.query("Update complaint set status = ? where id =?", [req.query.mark, id], function (error, results) {
                        if (error) {
                            console.log("error ocurred", error);
                        }
                    });
                }
                connection.query("Select * from complaint where id = ?", [id], function (error, results) {
                    if (error) {
                        console.log("error ocurred", error);

                    } else {
                        if (results.length > 0) {
                            result1 = results[0];
                            res.render("complaint_view", {
                                id: result1.id==null?"":result1.id,
                                complainant: result1.complainant==null?"":result1.complainant,
                                victim: result1.victim==null?"":result1.victim,
                                email: result1.email==null?"":result1.email,
                                mobile: result1.mobile==null?"":result1.mobile,
                                batch: result1.batch==null?"":result1.batch,
                                address: result1.address==null?"":result1.address,
                                details: result1.details==null?"":result1.details,
                                attachment1: result1.attachment1==null?"":result1.attachment1,
                                attachment2: result1.attachment2==null?"":result1.attachment2,
                                status: result1.status==null?"":result1.status,
                                profile_type: req.session.user.type // Pass profile_type here
                            });
                        }
                        else {
                            res.send({
                                "code": 204,
                                "success": "complaint doesnt exist"
                            });
                        }
                    }
                });
            }
        });
    } else {
        res.redirect(`/`);
    }
});



router.post('/log',function(req, res, next) {
        var body = req.body;
        req.getConnection(function (err, connection) {
            if (err) {
                res.send({
                    "code": 400,
                    "failed": "error ocurred"
                })
            }
            else {
                connection.query("Select * from " + body.table + " order by timestamp desc", [], function (error, results) {
                    if (error) {
                        res.send({
                            "code": 400,
                            "failed": "error ocurred"
                        })
                    } else {
                        res.send(results)
                    }
                });
            }
        });
});

router.post('/create_log', function (req, res, next) {
    if (checkSignIn(req)) {
        const body = req.body;
        const user = req.session.user;

        if (!body.table || !body.content) {
            return res.send({ "success": false, "error": "Missing required fields" });
        }

        const insertQuery = "INSERT INTO ?? (data, name, volunteer_or_admin, updater_id, timestamp) VALUES (?, ?, ?, ?, NOW())"; // Use NOW() for the timestamp
        const values = [body.table, body.content, user.name, user.type, user.id];

        req.getConnection(function (err, connection) {
            if (err) {
                return res.send({ "success": false, "error": err });
            }

            connection.query(insertQuery, values, function (error, results) {
                if (error) {
                    console.error("Error inserting data:", error);
                    return res.send({ "success": false, "error": "Error inserting data" });
                } else {
                    console.log("Rows affected:", results.affectedRows); // Log the number of affected rows
                    return res.send({ "success": true });
                }
            });
        });
    } else {
        res.redirect(`/`);
    }
});


router.get('/volunteers',function(req, res, next) {
    if (checkSignIn(req)) {
        req.getConnection(function (err, connection) {
            if (err) {
                res.send({
                    "code": 400,
                    "failed": "error ocurred"
                })
            }
            else {
                connection.query("Select id,email,status from login where `type`=0", [], function (error, results) {
                    if (error) {
                        console.log("error ocurred", error);

                    } else {
                        res.render("volunteers", {data: results,profile_type:req.session.user.type});
                    }
                });
            }
        });
    }
    else {
        res.redirect(`/`);
    }
});

router.post('/basic_complaint_detail',function(req, res, next) {
    var id = req.body.id;
    req.getConnection(function (err, connection) {
        if (err) {
            res.send({
                "code": 400,
                "failed": "error ocurred"
            })
        }
        else {
            connection.query("Select status from complaint where id = ?", [id], function (error, results) {
                if (error) {
                    console.log("error ocurred", error);
                } else {
                    if (results.length > 0) {
                        res.send({"error":false,
                            "status":results[0].status})
                    }
                    else {
                        res.send({
                            "error": true,
                            "reason": "complaint doesnt exist"
                        });
                    }
                }
            });
        }
    });
});


router.get('/profile', function (req, res, next) {
    if (checkSignIn(req)) {
        req.getConnection(function (err, connection) {
            if (err) {
                res.send({
                    "code": 400,
                    "failed": "error occurred"
                });
                var body = req.body;
        // Validating mobile number
        if (!/^\d{10}$/.test(body.mobile)) {
            // Show alert for invalid mobile number
            return res.send('<script>alert("Invalid mobile number. Please enter a 10-digit number."); window.history.back();</script>');
        }
            } else {
                var sql = `Select a.email,b.name,b.mobile,b.designation,b.id,b.login_id,b.profile_pic from login a inner join volunteer_profile b on(a.id=b.login_id) where a.id=?`;
                if (req.session.user.type == 1) {
                    sql = `Select a.email,b.name,b.mobile,b.designation,b.id,b.login_id,b.profile_pic from login a inner join admin_profile b on(a.id=b.login_id) where a.id=?`;
                }
                connection.query(sql, [req.session.user.id], function (error, results) {
                    if (error) {
                        console.log("error occurred", error);
                    } else {
                        if (results.length > 0) {
                            res.render("profile", { data: results[0], profile_type: req.session.user.type });
                        } else {
                            res.send({
                                "error": true,
                                "reason": "profile doesn't exist"
                            });
                        }
                    }
                });
            }
        });
    } else {
        res.redirect(`/`);
    }
});

router.post('/change_password', function (req, res, next) {
    if (checkSignIn(req)) {
        req.getConnection(function (err, connection) {
            if (err) {
                res.send({
                    "code": 400,
                    "failed": "error occurred"
                });
            } else {
                sql = `SELECT password from login where id =?`;
                connection.query(sql, [req.session.user.id], function (error, results) {
                    if (error) {
                        console.log("error occurred", error);
                    } else {
                        if (results.length > 0) {
                            if (results[0].password == req.body.old_password) {
                                sql1 = `UPDATE login set password=? where id=?`;
                                connection.query(sql1, [req.body.new_password, req.session.user.id], function (error, results) {
                                    if (error) {
                                        console.log("error occurred", error);
                                    } else {
                                        res.send({
                                            "error": false
                                        });
                                    }
                                });
                            } else {
                                res.send({
                                    "error": true,
                                    "error_message": "wrong password"
                                });
                            }
                        } else {
                            res.send({
                                "error": true,
                                "error_message": "no such user"
                            });
                        }
                    }
                });
            }
        });
    } else {
        res.send({
            "error": true,
            "error_message": "not in session"
        });
    }
});

router.post('/profile', function (req, res, next) {
    if (checkSignIn(req)) {
        req.getConnection(function (err, connection) {
            if (err) {
                res.send({
                    "code": 400,
                    "failed": "error occurred"
                });
            } else {
                var body = req.body;
        // Validating mobile number
        if (!/^\d{10}$/.test(body.mobile)) {
            // Show alert for invalid mobile number
            return res.send('<script>alert("Invalid mobile number. Please enter a 10-digit number."); window.history.back();</script>');
        }
                var file = req.files ? req.files.file : null;
                var profile_pic = null;

                if (file && typeof file === 'object') {
                    var originalFileName = file.name;
                    file.mv('./public/images/profile_pics/' + originalFileName, function (err) {
                        console.log(err);
                    });
                    profile_pic = originalFileName;
                }

                for (var key in body) {
                    if (body[key] == "") {
                        body[key] = null;
                    }
                }

                var sql = `Update volunteer_profile set name=?,mobile=?,designation=?,profile_pic=? where id=?`;
                if (req.session.user.type == 1) {
                    sql = `Update admin_profile set name=?,mobile=?,designation=?,profile_pic=? where id=?`;
                }

                connection.query(sql, [body.name, body.mobile, body.designation, profile_pic, body.id], function (error, results) {
                    if (error) {
                        console.log("error occurred", error);
                    } else {
                        res.render("profile", {
                            data: {
                                name: body.name,
                                mobile: body.mobile,
                                designation: body.designation,
                                profile_pic: profile_pic,
                                email: body.email,
                                id: body.id,
                                login_id: req.session.user.id,
                            },
                            profile_type: req.session.user.type
                        });
                    }
                });
            }
        });
    } else {
        res.redirect(`/`);
    }
});


router.post('/change_vol_status',function (req,res,next) {
   var id=req.body.id;
   var new_status = req.body.new_status;
    if (checkSignIn(req)) {
        req.getConnection(function (err, connection) {
            if (err) {
                res.send({
                    "code": 400,
                    "failed": "error ocurred"
                })
            }
            else {
                sql=`Update login set status = ? where id=?`
                connection.query(sql, [new_status,id], function (error, results) {
                    if (error) {
                        console.log("error ocurred", error);
                    } else {
                        res.send({
                            "error":false
                        })
                    }
                });
            }
        });
    }
    else {
        res.send({
            "error": true,
            "msg": "not in session"
        })
    }
});

router.get('/logout',function(req, res, next) {
    logout(req,res);
});

module.exports = router;