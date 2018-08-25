/**
 * @file app.js
 * #ACQOL-DEUX project core service
 *
 */
//////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @dependencies
 */
/**
 * Module dependencies.
 */
var express = require('express'),
    routes = require('./routes'),
    user = require('./routes/user'),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    csv = require('fast-csv'), //Required for CSV Upload
    multer = require('multer'), //Required for CSV Upload
    upload = multer({dest: 'tmp/csv/'}); //Required for CSV Upload
//HTML Render engine
var ejs = require('ejs');

/////////////////////////////DATEBASE//////////////////////////////////////
/**
 * @DATEBASE
 *
 */
/* ADD MYSQL DB CONNECTION  WEI 07/08/2018*/
/*Edited var con to connection and added use acqol DB ANSLEY 08/08/2018*/
var mysql = require('mysql');
var con = mysql.createConnection({
    host: "sl-us-south-1-portal.31.dblayer.com",
    port: "52296",
    user: "admin",
    password: "EKTWRTIPDMTCEDLI",
    database: 'acqol'
});
con.connect();

var db;
var cloudant;
var fileToUpload;
///////////////////////////////////////////////////////////////////////////


/**
 * @Expressvalues
 *
 */
var app = express();
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var dbCredentials = {
    dbName: 'my_sample_db'
};

/**
 * @Configuration
 *
 */
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/public');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}


/**
 * @CloudAntDB
 *
 */
function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    // Pattern match to find the first instance of a Cloudant service in
    // VCAP_SERVICES. If you know your service key, you can access the
    // service credentials directly by using the vcapServices object.
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials.url;
        }
    }
}

function initDBConnection() {
    //When running on Bluemix, this variable will be set to a json object
    //containing all the service credentials of all the bound services
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    } else { //When running locally, the VCAP_SERVICES will not be set

        // When running this app locally you can get your Cloudant credentials
        // from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
        // Variables section for an app in the Bluemix console dashboard).
        // Once you have the credentials, paste them into a file called vcap-local.json.
        // Alternately you could point to a local database here instead of a
        // Bluemix service.
        // url will be in this format: https://username:password@xxxxxxxxx-bluemix.cloudant.com
        dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }

    cloudant = require('cloudant')(dbCredentials.url);

    // check if DB exists if not create
    cloudant.db.create(dbCredentials.dbName, function (err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
        }
    });

    db = cloudant.use(dbCredentials.dbName);
}

initDBConnection();

/**
 * @Encryption
 *
 */
var encrypt = require('./library/encryption');

//////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @Routes
 */
/*
*  Login Part
*  Note: The default backend should check session status, if fail (unlogin), then should go to here.
* */
app.get("/login", function (request, response) {
    response.sendFile(__dirname + '/public/backend/login.html');
});

app.post('/loginsubmit', function (req, res) {
    //Check the db if login confirmed
    //1. Get rid of BS submit
    //2. Return
    //console.log(req.body.username);
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.sendFile(__dirname + '/public/backend/login.html');
    }
    var username = req.body.username;
    var password = encrypt.sha1hash(req.body.password);

    con.query('SELECT * from user WHERE username = \"' + username + '\" AND password = \"' + password + '\"', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            if (rows.length > 0 && rows[0].username === username) {
                //Login fine
                //var username = username;
                var dateofbirth = rows[0].dateofbirth;
                var phoneno = rows[0].phoneno;
                var email = rows[0].email;

                res.render(__dirname + '/public/backend/dashboard.html', {
                    username: username,
                    dateofbirth: dateofbirth,
                    phoneno: phoneno,
                    email: email
                });
            }
            else {
                //Fail
                res.render(__dirname + '/public/backend/login.html');
            }
        }
        else {
            //ERROR
            res.render(__dirname + '/public/backend/login.html');
        }
    });

});

/*
*  Register Part
*  Note: The default backend should check session status, if fail (unlogin), then should go to here.
* */

app.get("/register", function (request, response) {
    response.sendFile(__dirname + '/public/backend/register.html');
});

app.post('/registersubmit', function (req, res) {
    //Check the db if register confirmed
    //1. Get rid of BS submit
    //2. Get check existed
    //3. Register
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.sendFile(__dirname + '/public/backend/register.html');
    }
    //General Information
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;

    var dateofbirth = req.body.dateofbirth;
    var phoneno = req.body.phoneno;
    //For later login
    var username = req.body.username;
    var password = encrypt.sha1hash(req.body.password);
    var email = req.body.email;

    con.query('SELECT * from users WHERE username = \"' + username + '\" OR email = \"' + email + '\"', function (err, rows, fields) {
        if (!err) {
            console.log(rows);
            if (rows.length > 0) {
                //duplicate username
                res.sendFile(__dirname + '/public/backend/login.html');
            }
            else {
                //INSERT INTO patients (phoneno, email, username, password)
                // VALUES (value1, value2, value3,...)
                con.query("INSERT INTO users (username,password,firstname,lastname," +
                    "dateofbirth,phoneno,email) VALUES ('" + username + "','" + password + "','" + firstname + "','" +
                    lastname + "','" + dateofbirth + "','" + phoneno + "','" + email + "')",
                    function (err, rows, fields) {
                        if (!err) {
                            console.log(rows[0]);
                            if (rows.length > 0 && rows[0].username === username) {
                                //Login fine
                                res.sendFile(__dirname + '/public/backend/dashboard.html');
                            }
                            else {
                                //Fail
                                res.sendFile(__dirname + '/public/backend/register.html');
                            }
                        }
                        else {
                            //ERROR
                            res.sendFile(__dirname + '/public/backend/register.html');
                        }
                    });
            }
        }
        else {
            //ERROR
            console.log(err);
            res.sendFile(__dirname + '/public/backend/register.html');
        }
    });

});

app.get("/dashboard", function (request, response) {
    response.sendFile(__dirname + '/public/backend/dashboard.html');
});


app.get('/', routes.index);

function createResponseData(id, name, value, attachments) {

    var responseData = {
        id: id,
        name: sanitizeInput(name),
        value: sanitizeInput(value),
        attachements: []
    };


    attachments.forEach(function (item, index) {
        var attachmentData = {
            content_type: item.type,
            key: item.key,
            url: '/api/favorites/attach?id=' + id + '&key=' + item.key
        };
        responseData.attachements.push(attachmentData);

    });
    return responseData;
}

function sanitizeInput(str) {
    return String(str).replace(/&(?!amp;|lt;|gt;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

var saveDocument = function (id, name, value, response) {

    if (id === undefined) {
        // Generated random id
        id = '';
    }

    db.insert({
        name: name,
        value: value
    }, id, function (err, doc) {
        if (err) {
            console.log(err);
            response.sendStatus(500);
        } else
            response.sendStatus(200);
        response.end();
    });

};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* ADD CSV UPLOAD TO MYSQL  ANSLEY 08/08/2018*/
/**
 * @CSV
 */
app.post('/upload', upload.single('file'), function (request, response, next) {

    //var stream = csv.fromPath(request.file.path);
    var stream = fs.createReadStream(request.file.path);
    var fileRows = [];

    let csvStream = csv
        .parse()
        //.format({headers: true,ignoreEmpty:true, delimiter: ',',objectMode: true, includeEndRowDelimiter:true})
        //.fromStream(stream, {headers: false,ignoreEmpty:true, delimiter: ',', includeEndRowDelimiter:true})
        // .fromStream(stream, {headers: ["survey","intro_consent","ID","Xsect_ID","gender","age","agegrp","alone32","partner32","children32","parents32","other32","hhold32","relationc32","workc32","workpt32","workvol32","studypt32","ptcas32","ptsemret32","unempl32","empldec32","paidempstat32","volstatus32","studystat32","ftwork32","seekwork32","ftseekwk32","incomeb32","postcode","partic","lifesate32","s1mate32","s2heae32","s3proe32","s4inte32","s5safe32","s6come32","s7sece32","austlifee32","a1ecoe32","a2enve32","a3soce32","a4gove32","a5buse32","a6nate32","le01b32","le02c32","attack1a32","attack2c32","livingarr32","rentown32","rentamount32","rentdist32","mortgamount32","mortgdist32"]})
        .on("data", function (data) {
            fileRows.push(data); // push each row
        })
        .on("end", function () {

            console.log('Array: ' + fileRows);
            //fileRows.shift();

            con.connect((error) => {
                if (error) {
                    console.error('MySQL connection error' + error);
                } else {
                  //  try {
                      //  let deletequery = 'delete from survey32'; //Not sure if we want to delete and upload from scratch
                     //   con.query(deletequery, (error, result) => {
                       //     console.log('Delete Error log: ' + error)
                     //       console.log('Delete Result log ' + result);
                   //     });

               //     }
                //    catch (err) {
                //    }

                    try {
                        let query = 'INSERT INTO survey32 (survey,intro_consent,ID,Xsect_ID,gender,age,agegrp,alone32,partner32,children32,parents32,other32,hhold32,relationc32,workc32,workpt32,workvol32,studypt32,ptcas32,ptsemret32,unempl32,empldec32,paidempstat32,volstatus32,studystat32,ftwork32,seekwork32,ftseekwk32,incomeb32,postcode,partic,lifesate32,s1mate32,s2heae32,s3proe32,s4inte32,s5safe32,s6come32,s7sece32,austlifee32,a1ecoe32,a2enve32,a3soce32,a4gove32,a5buse32,a6nate32,le01b32,le02c32,attack1a32,attack2c32,livingarr32,rentown32,rentamount32,rentdist32,mortgamount32,mortgdist32) values ?';
                        con.query(query, [fileRows], (error, result) => {
                            console.log(error || result);
                            if (error != null) {
                                response.send('Failed to upload data, please ensure the columns and rows are correct');
                                response.end();
                            }
                            else if (error == null) {
                                response.send('CSV has been uploaded successfully with ' + result.affectedRows + ' affected rows');
                                response.end();
                            }
                        });
                    }
                    catch (err) {
                    }
                    con.end();
                }
            });
        });
    stream.pipe(csvStream);
    fs.unlinkSync(request.file.path);   // remove temp file
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @favorites
 */
app.get('/api/favorites/attach', function (request, response) {
    var doc = request.query.id;
    var key = request.query.key;

    db.attachment.get(doc, key, function (err, body) {
        if (err) {
            response.status(500);
            response.setHeader('Content-Type', 'text/plain');
            response.write('Error: ' + err);
            response.end();
            return;
        }

        response.status(200);
        response.setHeader("Content-Disposition", 'inline; filename="' + key + '"');
        response.write(body);
        response.end();
        return;
    });
});

app.post('/api/favorites/attach', multipartMiddleware, function (request, response) {

    console.log("Upload File Invoked..");
    console.log('Request: ' + JSON.stringify(request.headers));

    var id;

    db.get(request.query.id, function (err, existingdoc) {

        var isExistingDoc = false;
        if (!existingdoc) {
            id = '-1';
        } else {
            id = existingdoc.id;
            isExistingDoc = true;
        }

        var name = sanitizeInput(request.query.name);
        var value = sanitizeInput(request.query.value);

        var file = request.files.file;
        var newPath = './public/uploads/' + file.name;

        var insertAttachment = function (file, id, rev, name, value, response) {

            fs.readFile(file.path, function (err, data) {
                if (!err) {

                    if (file) {

                        db.attachment.insert(id, file.name, data, file.type, {
                            rev: rev
                        }, function (err, document) {
                            if (!err) {
                                console.log('Attachment saved successfully.. ');

                                db.get(document.id, function (err, doc) {
                                    console.log('Attachements from server --> ' + JSON.stringify(doc._attachments));

                                    var attachements = [];
                                    var attachData;
                                    for (var attachment in doc._attachments) {
                                        if (attachment == value) {
                                            attachData = {
                                                "key": attachment,
                                                "type": file.type
                                            };
                                        } else {
                                            attachData = {
                                                "key": attachment,
                                                "type": doc._attachments[attachment]['content_type']
                                            };
                                        }
                                        attachements.push(attachData);
                                    }
                                    var responseData = createResponseData(
                                        id,
                                        name,
                                        value,
                                        attachements);
                                    console.log('Response after attachment: \n' + JSON.stringify(responseData));
                                    response.write(JSON.stringify(responseData));
                                    response.end();
                                    return;
                                });
                            } else {
                                console.log(err);
                            }
                        });
                    }
                }
            });
        }

        if (!isExistingDoc) {
            existingdoc = {
                name: name,
                value: value,
                create_date: new Date()
            };

            // save doc
            db.insert({
                name: name,
                value: value
            }, '', function (err, doc) {
                if (err) {
                    console.log(err);
                } else {

                    existingdoc = doc;
                    console.log("New doc created ..");
                    console.log(existingdoc);
                    insertAttachment(file, existingdoc.id, existingdoc.rev, name, value, response);

                }
            });

        } else {
            console.log('Adding attachment to existing doc.');
            console.log(existingdoc);
            insertAttachment(file, existingdoc._id, existingdoc._rev, name, value, response);
        }

    });

});

app.post('/api/favorites', function (request, response) {

    console.log("Create Invoked..");
    console.log("Name: " + request.body.name);
    console.log("Value: " + request.body.value);

    // var id = request.body.id;
    var name = sanitizeInput(request.body.name);
    var value = sanitizeInput(request.body.value);

    saveDocument(null, name, value, response);

});

app.delete('/api/favorites', function (request, response) {

    console.log("Delete Invoked..");
    var id = request.query.id;
    // var rev = request.query.rev; // Rev can be fetched from request. if
    // needed, send the rev from client
    console.log("Removing document of ID: " + id);
    console.log('Request Query: ' + JSON.stringify(request.query));

    db.get(id, {
        revs_info: true
    }, function (err, doc) {
        if (!err) {
            db.destroy(doc._id, doc._rev, function (err, res) {
                // Handle response
                if (err) {
                    console.log(err);
                    response.sendStatus(500);
                } else {
                    response.sendStatus(200);
                }
            });
        }
    });

});

app.put('/api/favorites', function (request, response) {

    console.log("Update Invoked..");

    var id = request.body.id;
    var name = sanitizeInput(request.body.name);
    var value = sanitizeInput(request.body.value);

    console.log("ID: " + id);

    db.get(id, {
        revs_info: true
    }, function (err, doc) {
        if (!err) {
            console.log(doc);
            doc.name = name;
            doc.value = value;
            db.insert(doc, doc.id, function (err, doc) {
                if (err) {
                    console.log('Error inserting data\n' + err);
                    return 500;
                }
                return 200;
            });
        }
    });
});

app.get('/api/favorites', function (request, response) {

    console.log("Get method invoked.. ")

    db = cloudant.use(dbCredentials.dbName);
    var docList = [];
    var i = 0;
    db.list(function (err, body) {
        if (!err) {
            var len = body.rows.length;
            console.log('total # of docs -> ' + len);
            if (len == 0) {
                // push sample data
                // save doc
                var docName = 'sample_doc';
                var docDesc = 'A sample Document';
                db.insert({
                    name: docName,
                    value: 'A sample Document'
                }, '', function (err, doc) {
                    if (err) {
                        console.log(err);
                    } else {

                        console.log('Document : ' + JSON.stringify(doc));
                        var responseData = createResponseData(
                            doc.id,
                            docName,
                            docDesc, []);
                        docList.push(responseData);
                        response.write(JSON.stringify(docList));
                        console.log(JSON.stringify(docList));
                        console.log('ending response...');
                        response.end();
                    }
                });
            } else {

                body.rows.forEach(function (document) {

                    db.get(document.id, {
                        revs_info: true
                    }, function (err, doc) {
                        if (!err) {
                            if (doc['_attachments']) {

                                var attachments = [];
                                for (var attribute in doc['_attachments']) {

                                    if (doc['_attachments'][attribute] && doc['_attachments'][attribute]['content_type']) {
                                        attachments.push({
                                            "key": attribute,
                                            "type": doc['_attachments'][attribute]['content_type']
                                        });
                                    }
                                    console.log(attribute + ": " + JSON.stringify(doc['_attachments'][attribute]));
                                }
                                var responseData = createResponseData(
                                    doc._id,
                                    doc.name,
                                    doc.value,
                                    attachments);

                            } else {
                                var responseData = createResponseData(
                                    doc._id,
                                    doc.name,
                                    doc.value, []);
                            }

                            docList.push(responseData);
                            i++;
                            if (i >= len) {
                                response.write(JSON.stringify(docList));
                                console.log('ending response...');
                                response.end();
                            }
                        } else {
                            console.log(err);
                        }
                    });

                });
            }

        } else {
            console.log(err);
        }
    });

});

/**
 * @start
 */
http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});
