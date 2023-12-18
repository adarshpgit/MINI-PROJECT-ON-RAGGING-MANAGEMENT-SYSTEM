var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('complaint', { title: 'Express', registered: false });
});

router.post('/', function(req, res, next) {
    var files = req.files;
    console.log(files);
    var nul_arr = [null, null];

    // Check if req.files exists and is an object
    if (files && typeof files === 'object') {
        for (var k of Object.keys(files)) {
            file = files[k];
            var new_file_name = file.name;
            file.mv('./public/file_upload/' + new_file_name, function(err) {
                console.log(err);
            });
            if (k == "attachmentName") {
                nul_arr[0] = new_file_name;
            } else {
                nul_arr[1] = new_file_name;
            }
        }
    }

    var body = req.body;
    // Validating mobile number
    if (!/^\d{10}$/.test(body.mobile)) {
        // Show alert for invalid mobile number
        return res.send('<script>alert("Invalid mobile number. Please enter a 10-digit number."); window.history.back();</script>');
    }
    for (var key in body) {
        if (body[key] == "") {
            body[key] = null;
        }
    }
    console.log(body);

    req.getConnection(function(err, connection) {
        if (err) {
            res.send({
                "code": 400,
                "failed": "error ocurred here"
            });
        } else {
            body_arr = Object.values(body);
            var sql = 'INSERT INTO complaint(`complainant`, `victim`, `email`, `mobile`, `batch`, `address`, `details`, `attachment1`, `attachment2`) values(?,?,?,?,?,?,?,?,?)';
            connection.query(sql, body_arr.concat(nul_arr), function(error, result) {
                if (error) {
                    console.log("Error inserting into 'complaint' table:", error);
                    res.send({
                        "code": 400,
                        "failed": "Error occurred while inserting into 'complaint' table"
                    });
                } else {
                    console.log("Inserted into 'complaint' table. Proceeding to create 'log' table...");
            
                    connection.query('SELECT LAST_INSERT_ID()', function(error, result) {
                        if (error) {
                            console.log("Error getting last insert ID:", error);
                            res.send({
                                "code": 400,
                                "failed": "Error getting last insert ID"
                            });
                        } else {
                            idd = result[0]['LAST_INSERT_ID()'];
                            var table_cr = "CREATE TABLE " + "log" + idd + " (" +
                                " id int(11) NOT NULL AUTO_INCREMENT," +
                                " data varchar(250) NOT NULL," +
                                " name varchar(250) NOT NULL," +
                                " volunteer_or_admin int(1) NOT NULL," +
                                " updater_id int(11) NOT NULL," +
                                " timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
                                " PRIMARY KEY (\`id`)" +
                                ") ENGINE=MyISAM DEFAULT CHARSET=latin1";
                            connection.query(table_cr, [], function(error, result) {
                                if (error) {
                                    console.log(error);
                                    res.send({
                                        "code": 400,
                                        "failed": "error ocurred"
                                    });
                                } else {
                                    res.render('complaint', {
                                        registered: true,
                                        id: idd,
                                        victim: body.victim,
                                        email: body.email,
                                        mobile: body.mobile
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});


router.get('/complaint_count', function(req, res, next) {
    req.getConnection(function (err,connection) {
        if (err) {
            console.log(err)
        }
        else {
            var sql="SELECT count(*) as count from complaint"
            connection.query(sql,'', function (error, result) {
                if (error) {
                    console.log(error);
                    // console.log("error ocurred",error);
                } else {
                    var tot_count=result[0].count;
                    console.log(tot_count);
                    var sql1="SELECT count(*) as count from complaint where status=3"
                    connection.query(sql1,'', function (error, result) {
                        if (error) {
                            console.log(error);
                            // console.log("error ocurred",error);
                        } else {
                            var closed=result[0].count;
                            res.send({
                                "error":false,
                                "total_complaints":tot_count,
                                "closed_complaints":closed
                            })
                        }
                    });
                }
            });
        }
    });
});

module.exports = router;