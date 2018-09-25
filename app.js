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
    upload = multer({dest: 'tmp/csv/'}), //Required for CSV Upload
    Json2csvParser = require('json2csv').Parser; //Required to convert Json to csv
//HTML Render engine
var ejs = require('ejs');
var date = new Date();

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
       // dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }

    //cloudant = require('cloudant')(dbCredentials.url);

    // check if DB exists if not create
    /*
    cloudant.db.create(dbCredentials.dbName, function (err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
        }
    });

    db = cloudant.use(dbCredentials.dbName);
    */
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
    response.sendFile(__dirname + '/public/login.html');
});

app.post('/loginsubmit', function (req, res) {
    //Check the db if login confirmed
    //1. Get rid of BS submit
    //2. Return
    //console.log(req.body.username);
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.sendFile(__dirname + '/public/login.html');
    }
    var username = req.body.username;
    var password = encrypt.sha1hash(req.body.password);
    console.log(password);
    con.query('SELECT * from users WHERE username = \"' + username + '\" AND password = \"' + password + '\"', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            if (rows.length > 0) {
                //Login fine
                //var username = username;
                var dateofbirth = rows[0].dateofbirth;
                var phoneno = rows[0].phoneno;
                var email = rows[0].email;

                res.render(__dirname + '/public/data.html', {
                    username: username,
                    dateofbirth: dateofbirth,
                    phoneno: phoneno,
                    email: email
                });
            }
            else {
                //Fail
                //console.log(err.message);
                res.render(__dirname + '/public/login.html');
            }
        }
        else {
            //ERROR
            console.log(err.message);
            res.render(__dirname + '/public/login.html');
        }
    });

});

/*
*  Register Part
*  Note: The default backend should check session status, if fail (unlogin), then should go to here.
* */

app.get("/register", function (request, response) {
    response.sendFile(__dirname + '/public/register.html');
});

app.post('/registersubmit', function (req, res) {
    //Check the db if register confirmed
    //1. Get rid of BS submit
    //2. Get check existed
    //3. Register
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
        res.sendFile(__dirname + '/public/register.html');
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
                res.sendFile(__dirname + '/public/login.html');
            }
            else {
                console.log("Insert user");
                //INSERT INTO patients (phoneno, email, username, password)
                // VALUES (value1, value2, value3,...)
                con.query("INSERT INTO users (username,password,firstname,lastname," +
                    "dateofbirth,phoneno,email) VALUES ('" + username + "','" + password + "','" + firstname + "','" +
                    lastname + "','" + dateofbirth + "','" + phoneno + "','" + email + "')",
                    function (err, rows, fields) {
                        if (!err) {
                            res.sendFile(__dirname + '/public/login.html');
                        }
                        else {
                            //ERROR
                            console.log(err.message);
                            res.sendFile(__dirname + '/public/register.html');
                        }
                    });
            }
        }
        else {
            //ERROR
            console.log(err);
            res.sendFile(__dirname + '/public/register.html');
        }
    });

});

app.get("/dashboard", function (request, response) {
    response.sendFile(__dirname + '/public/dashboard.html');
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
        //.fromStream(stream, {headers: ["survey","intro_consent","ID","Xsect_ID","gender","age","agegrp","alone32","partner32","children32","parents32","other32","hhold32","relationc32","workc32","workpt32","workvol32","studypt32","ptcas32","ptsemret32","unempl32","empldec32","paidempstat32","volstatus32","studystat32","ftwork32","seekwork32","ftseekwk32","incomeb32","postcode","partic","lifesate32","s1mate32","s2heae32","s3proe32","s4inte32","s5safe32","s6come32","s7sece32","austlifee32","a1ecoe32","a2enve32","a3soce32","a4gove32","a5buse32","a6nate32","le01b32","le02c32","attack1a32","attack2c32","livingarr32","rentown32","rentamount32","rentdist32","mortgamount32","mortgdist32"]})
        .on("data", function (data) {
            fileRows.push(data); // push each row
        })
        .on("end", function () {

        //console.log('This the array '+ fileRows);
       // console.log('ROW 1 '+ fileRows.slice(0,1));
//if (fileRows.slice(0,1).toString().includes("survey") == true ) {
    if (fileRows[0].toString().includes('survey') == true ) {
    fileRows.shift();
   try {
                        let query = 'INSERT INTO survey32 (survey,intro_consent,ID,Xsect_ID,gender,age,agegrp,alone32,partner32,children32,parents32,other32,hhold32,relationc32,workc32,workpt32,workvol32,studypt32,ptcas32,ptsemret32,unempl32,empldec32,paidempstat32,volstatus32,studystat32,ftwork32,seekwork32,ftseekwk32,incomeb32,postcode,partic,lifesate32,s1mate32,s2heae32,s3proe32,s4inte32,s5safe32,s6come32,s7sece32,austlifee32,a1ecoe32,a2enve32,a3soce32,a4gove32,a5buse32,a6nate32,le01b32,le02c32,attack1a32,attack2c32,livingarr32,rentown32,rentamount32,rentdist32,mortgamount32,mortgdist32) values ?';
                        con.query(query, [fileRows], (error, result) => {
                            console.log(error || result);
                            if (error == null){
                                response.send('CSV has been uploaded successfully with ' + result.affectedRows + ' affected rows');
                                response.end();
                            }
                            else if ((error.sqlMessage.includes('Column count doesn')) == true) {
                                response.send('Failed to upload data, please ensure the columns and rows are correct - ' + error.sqlMessage + '<br>' +'*Please note, the first line for the header was skipped*');
                                response.end();
                            }
                            else if ((error.sqlMessage.includes('Duplicate entry')) == true){
                                response.send('Duplicate data in csv file - ' + error.sqlMessage);
                                response.end();
                            }
                           else{
                            response.send('Unexpected error, please contact System Administrator');
                            response.end();
                           }
                        });
                    }
                    catch (err) {
                    }
    
}
else {
                    try {
                        let query = 'INSERT INTO survey32 (survey,intro_consent,ID,Xsect_ID,gender,age,agegrp,alone32,partner32,children32,parents32,other32,hhold32,relationc32,workc32,workpt32,workvol32,studypt32,ptcas32,ptsemret32,unempl32,empldec32,paidempstat32,volstatus32,studystat32,ftwork32,seekwork32,ftseekwk32,incomeb32,postcode,partic,lifesate32,s1mate32,s2heae32,s3proe32,s4inte32,s5safe32,s6come32,s7sece32,austlifee32,a1ecoe32,a2enve32,a3soce32,a4gove32,a5buse32,a6nate32,le01b32,le02c32,attack1a32,attack2c32,livingarr32,rentown32,rentamount32,rentdist32,mortgamount32,mortgdist32) values ?';
                        con.query(query, [fileRows], (error, result) => {
                            console.log(error || result);
                            if (error == null){
                                response.send('CSV has been uploaded successfully with ' + result.affectedRows + ' affected rows');
                                response.end();
                            }
                            else if ((error.sqlMessage.includes('Column count doesn')) == true) {
                                response.send('Failed to upload data, please ensure the columns and rows are correct - ' + error.sqlMessage);
                                response.end();
                            }
                            else if ((error.sqlMessage.includes('Duplicate entry')) == true){
                                response.send('Duplicate data in csv file - ' + error.sqlMessage);
                                response.end();
                            }
                           else{
                            response.send('Unexpected error, please contact System Administrator');
                            response.end();
                           }
                        });
                    }
                    catch (err) {
                    }
                }
        });

    stream.pipe(csvStream);
    fs.unlinkSync(request.file.path);   // remove temp file
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* SELECT  MYSQL DATA FOR PREVIEW ANSLEY 24/09/2018 */

app.post('/preview', function (request, response) {
  
    var filter = request.body.filter;
    var age = request.body.age; 
    var opage = request.body.opage; 
    var gender =  request.body.gender;
    var income = request.body.income;
    var maritalstatus = request.body.maritalstatus;
    var mortgageamount = request.body.mortgageamount;
    var rentamount = request.body.rentamount;
    var mortgagedist = request.body.mortgagedist;
    var rentdist = request.body.rentdist; 
    var workstatus = request.body.workstatus; 
    var livingarrangement = request.body.livingarrangement; 
    var household = request.body.household; 
    var personalsafetyrating = request.body.personalsafetyrating;
    var oppsr = request.body.oppsr; 
    var communityrating = request.body.communityrating;
    var opcr = request.body.opcr; 
    var futuresecurityrating = request.body.futuresecurityrating;
    var opfsr = request.body.opfsr; 
    var postcode = request.body.postcode;
    var postcodeRequired = request.body.postcodeRequired;

    var sqlage = '';
    var sqlgender = '';
    var sqlincome = '';
    var sqlmaritalstatus = '';
    var sqlmortgageamount = '';
    var sqlrentamount = '';
    var sqlmortgagedist = '';
    var sqlrentdist = '';
    var sqlworkstatus = '';
    var sqllivingarrangement = '';
    var sqlhousehold = '';
    var sqlpersonalsafetyrating = '';
    var sqlcommunityrating = '';
    var sqlfuturesecurityrating = '';
    var sqlpostcode = '';


if (opage != ''){
    var sqlage = ' age ' + opage + ' ' + '\"' + age + '\"';
}
if (gender != ''){
    var sqlgender = " AND gender = " + gender;
}
if (income != ''){
    var sqlincome = " AND incomeb32 = " + income;
}
if (maritalstatus != ''){
    var sqlmaritalstatus = " AND relationc32 = " + maritalstatus;
}
if (mortgageamount != ''){
    var sqlmortgageamount = " AND mortgamount32 = " + mortgageamount;
}
if (rentamount != ''){
    var sqlrentamount = " AND rentamount32 = " + rentamount;
}
if (mortgagedist != ''){
   var sqlmortgagedist = ' AND mortgdist32 = \"' + mortgagedist + '\"'
}
if (rentdist != ''){
   var sqlrentdist = ' AND rentdist32 = \"' + rentdist + '\"'
}
if (workstatus != ''){
    var sqlworkstatus = " AND workc32 = " +  workstatus;
}
if (livingarrangement != ''){
    var sqllivingarrangement = " AND livingarr32 = " + livingarrangement;
}
if (household != ''){
    var sqlhousehold = " AND hhold32 = " + household;
}
if (oppsr != ''){
    var sqlpersonalsafetyrating = " AND s5safe32 " + oppsr + " " + personalsafetyrating;
}
if (opcr != ''){
    var sqlcommunityrating = " AND s6come32 " + opcr + " " + communityrating;
}
if (opfsr != ''){
    var sqlfuturesecurityrating = " AND s7sece32 " + opfsr + " " + futuresecurityrating;
}
if (postcodeRequired != ''){
    var sqlpostcode = ' AND postcode in (' + '\"' + postcode + '\"' + ' )'
}


    var condition = sqlage + sqlgender + sqlincome + sqlmaritalstatus + sqlmortgageamount + sqlmortgagedist + sqlrentdist + sqlworkstatus + sqllivingarrangement + 
    sqlhousehold + sqlpersonalsafetyrating + sqlcommunityrating + sqlfuturesecurityrating + sqlpostcode;

    console.log('='+condition.slice(1,4)+'=');

    if ((condition.slice(1,4)) == 'AND'){
        var condition = condition.slice(4,condition.length);
        }

    var selectquery = 'SELECT survey, intro_consent, ID FROM survey32 WHERE ' + condition + 'limit 10'; 

    if (condition == ''){
    var selectquery = 'SELECT survey, intro_consent, ID FROM survey32 limit 10'
    }

    console.log('This is the conditions ==' + condition);
    console.log('This is the SQL query ==' + selectquery);

        con.query(selectquery, (error, result) => {
        console.log(error || result);
      
        console.log(JSON.stringify(result));
        
        response.send(JSON.stringify(result));
       // response.send(result);
            
        });

});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* DELETE MYSQL DATA  ANSLEY 26/08/2018 */

app.post('/delete', function (request, response) {
  
                    try {
                        let deletequery = 'delete from survey32'; 
                        con.query(deletequery, (error, result) => {
                        console.log(error || result);
                        if (error == null){
                            response.send('Data has been deleted successfully');
                            response.end();
                        }
                        else{
                            response.send('Unexpected error, please contact System Administrator');
                            response.end();
                           }
                        });
                    }
                   catch (err) {
                    }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* SELECT (DISABLE & ENABLE FILTERS) MYSQL DATA  ANSLEY 19/09/2018 */

app.post('/select2', function (request, response) {
  
    var filter = request.body.filter;
    var age = request.body.age; 
    var opage = request.body.opage; 
    var gender =  request.body.gender;
    var income = request.body.income;
    var maritalstatus = request.body.maritalstatus;
    var mortgageamount = request.body.mortgageamount;
    var rentamount = request.body.rentamount;
    var mortgagedist = request.body.mortgagedist;
    var rentdist = request.body.rentdist; 
    var workstatus = request.body.workstatus; 
    var livingarrangement = request.body.livingarrangement; 
    var household = request.body.household; 
    var personalsafetyrating = request.body.personalsafetyrating;
    var oppsr = request.body.oppsr; 
    var communityrating = request.body.communityrating;
    var opcr = request.body.opcr; 
    var futuresecurityrating = request.body.futuresecurityrating;
    var opfsr = request.body.opfsr; 
    var postcode = request.body.postcode;
    var postcodeRequired = request.body.postcodeRequired;

    var sqlage = '';
    var sqlgender = '';
    var sqlincome = '';
    var sqlmaritalstatus = '';
    var sqlmortgageamount = '';
    var sqlrentamount = '';
    var sqlmortgagedist = '';
    var sqlrentdist = '';
    var sqlworkstatus = '';
    var sqllivingarrangement = '';
    var sqlhousehold = '';
    var sqlpersonalsafetyrating = '';
    var sqlcommunityrating = '';
    var sqlfuturesecurityrating = '';
    var sqlpostcode = '';


if (opage != ''){
    var sqlage = ' age ' + opage + ' ' + '\"' + age + '\"';
}
if (gender != ''){
    var sqlgender = " AND gender = " + gender;
}
if (income != ''){
    var sqlincome = " AND incomeb32 = " + income;
}
if (maritalstatus != ''){
    var sqlmaritalstatus = " AND relationc32 = " + maritalstatus;
}
if (mortgageamount != ''){
    var sqlmortgageamount = " AND mortgamount32 = " + mortgageamount;
}
if (rentamount != ''){
    var sqlrentamount = " AND rentamount32 = " + rentamount;
}
if (mortgagedist != ''){
   // var sqlmortgagedist = " AND mortgdist32 = " + mortgagedist;
   var sqlmortgagedist = ' AND mortgdist32 = \"' + mortgagedist + '\"'
}
if (rentdist != ''){
   // var sqlrentdist = " AND rentdist32 = " + rentdist;
   var sqlrentdist = ' AND rentdist32 = \"' + rentdist + '\"'
}
if (workstatus != ''){
    var sqlworkstatus = " AND workc32 = " +  workstatus;
}
if (livingarrangement != ''){
    var sqllivingarrangement = " AND livingarr32 = " + livingarrangement;
}
if (household != ''){
    var sqlhousehold = " AND hhold32 = " + household;
}
if (oppsr != ''){
    var sqlpersonalsafetyrating = " AND s5safe32 " + oppsr + " " + personalsafetyrating;
}
if (opcr != ''){
    var sqlcommunityrating = " AND s6come32 " + opcr + " " + communityrating;
}
if (opfsr != ''){
    var sqlfuturesecurityrating = " AND s7sece32 " + opfsr + " " + futuresecurityrating;
}
if (postcodeRequired != ''){
    var sqlpostcode = ' AND postcode in (' + '\"' + postcode + '\"' + ' )'
}


    var condition = sqlage + sqlgender + sqlincome + sqlmaritalstatus + sqlmortgageamount + sqlmortgagedist + sqlrentdist + sqlworkstatus + sqllivingarrangement + 
    sqlhousehold + sqlpersonalsafetyrating + sqlcommunityrating + sqlfuturesecurityrating + sqlpostcode;

    console.log('='+condition.slice(1,4)+'=');

    if ((condition.slice(1,4)) == 'AND'){
        var condition = condition.slice(4,condition.length);
        }

    var selectquery = 'SELECT * FROM survey32 WHERE ' + condition; 

    if (condition == ''){
    var selectquery = 'SELECT * FROM survey32'
    }

    console.log('This is the conditions ==' + condition);
    console.log('This is the SQL query ==' + selectquery);

        con.query(selectquery, (error, result) => {
      //  console.log(error || result);
        if (error === null && result != ''){
           
            const fields = ['survey','intro_consent','ID','Xsect_ID','gender','age','agegrp','alone32','partner32','children32','parents32','other32','hhold32','relationc32','workc32','workpt32','workvol32','studypt32','ptcas32','ptsemret32','unempl32','empldec32','paidempstat32','volstatus32','studystat32','ftwork32','seekwork32','ftseekwk32','incomeb32','postcode','partic','lifesate32','s1mate32','s2heae32','s3proe32','s4inte32','s5safe32','s6come32','s7sece32','austlifee32','a1ecoe32','a2enve32','a3soce32','a4gove32','a5buse32','a6nate32','le01b32','le02c32','attack1a32','attack2c32','livingarr32','rentown32','rentamount32','rentdist32','mortgamount32','mortgdist32'];
            const json2csvParser = new Json2csvParser({ fields });
            const csv = json2csvParser.parse(result);
            response.attachment(date.getFullYear() + '_' + date.getMonth() + '_' + date.getDate() +'_acqoldata.csv');
            response.type('csv');
            response.send(csv);
            response.end();
        
        }
        else if (result == ''){
            //response.send('No data found');
            response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
            response.end();   
        }
        else{
           // response.send('Unexpected error, please contact System Administrator');
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
            response.end();
           }
        });

});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* SELECT MYSQL DATA  ANSLEY 26/08/2018 */

app.post('/select', function (request, response) {
  
    var filter = request.body.filter;

    var age = request.body.age; 
    var opage = request.body.opage; 

    var gender =  request.body.gender;
    var income = request.body.income;
    var maritalstatus = request.body.maritalstatus;
    var mortgageamount = request.body.mortgageamount;
    var rentamount = request.body.rentamount;
    var mortgagedist = request.body.mortgagedist;
    var rentdist = request.body.rentdist; 
    var workstatus = request.body.workstatus; 
    var livingarrangement = request.body.livingarrangement; 
    var household = request.body.household; 

    var personalsafetyrating = request.body.personalsafetyrating;
    var oppsr = request.body.oppsr; 

    var communityrating = request.body.communityrating;
    var opcr = request.body.opcr; 

    var futuresecurityrating = request.body.futuresecurityrating;
    var opfsr = request.body.opfsr; 

    var postcode = request.body.postcode;

        if (filter == 'YES') { 
       // let selectquery = 'select * from survey32 where age ' + opage + ' ' + age + ' and ' + 'gender = \"' + gender + '\" and incomeb32 = \"' + income + '\"'
        let selectquery = 'select * from survey32 where age ' + opage + ' ' + age + ' and gender = \"' + gender + '\" and incomeb32 = \"' + income + 
        '\" and relationc32 = \"' + maritalstatus +  '\" and mortgamount32 = \"' + mortgageamount + '\" and rentamount32 = \"' + rentamount + 
        '\" and mortgdist32 = \"' + mortgagedist + '\" and rentdist32 = \"' + rentdist + '\" and workc32 = \"' + workstatus + '\" and livingarr32 = \"' + livingarrangement +    
        '\" and hhold32 = \"' + household + '\" and s5safe32 ' + oppsr + ' ' + personalsafetyrating + ' and s6come32 ' + opcr + ' ' + communityrating + 
       ' and s7sece32 ' + opfsr + '\"' + futuresecurityrating +  '\" and postcode in ( \"' + postcode + '\")'
        
       console.log(selectquery)

        con.query(selectquery, (error, result) => {
        console.log(error || result);
        if (error === null && result != ''){
            console.log('this is the result - ' + result);
            const fields = ['survey','intro_consent','ID','Xsect_ID','gender','age','agegrp','alone32','partner32','children32','parents32','other32','hhold32','relationc32','workc32','workpt32','workvol32','studypt32','ptcas32','ptsemret32','unempl32','empldec32','paidempstat32','volstatus32','studystat32','ftwork32','seekwork32','ftseekwk32','incomeb32','postcode','partic','lifesate32','s1mate32','s2heae32','s3proe32','s4inte32','s5safe32','s6come32','s7sece32','austlifee32','a1ecoe32','a2enve32','a3soce32','a4gove32','a5buse32','a6nate32','le01b32','le02c32','attack1a32','attack2c32','livingarr32','rentown32','rentamount32','rentdist32','mortgamount32','mortgdist32'];
            const json2csvParser = new Json2csvParser({ fields });
            const csv = json2csvParser.parse(result);
            response.attachment(date.getFullYear() + '_' + date.getMonth() + '_' + date.getDate() +'_acqoldata.csv');
            response.type('csv');
            response.send(csv);
            response.end();
        
        }
        else if (result == ''){
            //response.send('No data found');
            response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
            response.end();   
        }
        else{
           // response.send('Unexpected error, please contact System Administrator');
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
            response.end();
           }
        });
    }
        else if (filter == 'NO') {
        let selectquery = 'select * from survey32';
        con.query(selectquery, (error, result) => {
        console.log(error || result);
        if (error === null && result != ''){
            console.log('this is the result - ' + result);
            const fields = ['survey','intro_consent','ID','Xsect_ID','gender','age','agegrp','alone32','partner32','children32','parents32','other32','hhold32','relationc32','workc32','workpt32','workvol32','studypt32','ptcas32','ptsemret32','unempl32','empldec32','paidempstat32','volstatus32','studystat32','ftwork32','seekwork32','ftseekwk32','incomeb32','postcode','partic','lifesate32','s1mate32','s2heae32','s3proe32','s4inte32','s5safe32','s6come32','s7sece32','austlifee32','a1ecoe32','a2enve32','a3soce32','a4gove32','a5buse32','a6nate32','le01b32','le02c32','attack1a32','attack2c32','livingarr32','rentown32','rentamount32','rentdist32','mortgamount32','mortgdist32'];
            const json2csvParser = new Json2csvParser({ fields });
            const csv = json2csvParser.parse(result);
            response.attachment(date.getFullYear() + '_' + date.getMonth() + '_' + date.getDate() +'_acqoldata.csv');
            response.type('csv');
            response.send(csv);
            response.end();
        }
        else if (result == ''){
            response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
            response.end();   
        }
        else{
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
            response.end();
           }
        });
    }

});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//THINK THIS

app.get("/preset", function (request, response) {

    var selectquery;
    switch(request.body.key)
    {
        case 0:
            selectquery = "select incomeb32, age from survey32 where age <= '65'";
            break;
        case 1:
            selectquery = "select incomeb32, age from survey32 where age <= '65'";
            break;
        default:
            selectquery = "select incomeb32, age from survey32 where age <= '65'";
            break;
    }
    con.query(selectquery, (error, result) => {
        console.log(error || result);
        if (error === null){
            response.attachment('dataset.csv');
            response.type('csv');
            response.send(result);
            response.end();
        }
        else{
            //thats basic error handle, use a HTML with value in it
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'})
            response.end();
        }
    });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* PREDEFINED DATASET 1 MYSQL DATA  ANSLEY 09/09/2018 */
/* ANNUAL INCOME FOR AGE 65+  */
app.get("/dataset1", function (request, response) {
    let selectquery = "select incomeb32, age from survey32 where age <= '65'";
    con.query(selectquery, (error, result) => {
        console.log(error || result);
        if (error === null && result != ''){
            const fields = ['incomeb32', 'age'];
            const json2csvParser = new Json2csvParser({ fields });
            const csv = json2csvParser.parse(result);
            response.attachment('dataset1.csv');
            response.type('csv');
            response.send(csv);
            response.end();
        }
        else if (result == ''){
            response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
            response.end();   
        }
        else{
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
            response.end();
        }
    });
});

app.post('/dataset1', function (request, response) {
    
        let selectquery = "select incomeb32, age from survey32 where age <= '65'"
        con.query(selectquery, (error, result) => {
        console.log(error || result);
        if (error === null && result != ''){
            response.send(result);
            response.end();
        }
        else if (result == ''){
            response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
            response.end();   
        }
        else{
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
            response.end();
           }
        });
    
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* PREDEFINED DATASET 2 MYSQL DATA  ANSLEY 09/09/2018 */
/* Annual Income for Single Age 60 - 65 */
app.get("/dataset2", function (request, response) {
    let selectquery = "select incomeb32, age, relationc32 from survey32 where age between '60' and '65' and relationc32 = '2'";
    con.query(selectquery, (error, result) => {
        console.log(error || result);
        if (error === null && result != ''){
            const fields = ['incomeb32', 'age', 'relationc32'];
            const json2csvParser = new Json2csvParser({ fields });
            const csv = json2csvParser.parse(result);
            response.attachment('dataset2.csv');
            response.type('csv');
            response.send(csv);
            response.end();
        }
        else if (result == ''){
            response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
            response.end();   
        }
        else{
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
            response.end();
        }
    });
});

app.post('/dataset2', function (request, response) {
    
    let selectquery = "select incomeb32, age, relationc32 from survey32 where age between '60' and '65' and relationc32 = '2'"
    con.query(selectquery, (error, result) => {
    console.log(error || result);
    if (error === null && result != ''){
        response.send(result);
        response.end();
    }
    else if (result == ''){
        response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
        response.end();   
    }
    else{
        response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
        response.end();
       }
    });

});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* PREDEFINED DATASET 3 MYSQL DATA  ANSLEY 09/09/2018 */
/* Annual Income for Male, Single */
app.get("/dataset3", function (request, response) {
    let selectquery = "select incomeb32, gender, relationc32 from survey32 where gender = '0' and relationc32 = '2'";
    con.query(selectquery, (error, result) => {
        console.log(error || result);
        if (error === null && result != ''){
            const fields = ['incomeb32', 'gender', 'relationc32'];
            const json2csvParser = new Json2csvParser({ fields });
            const csv = json2csvParser.parse(result);
            response.attachment('dataset3.csv');
            response.type('csv');
            response.send(csv);
            response.end();
        }
        else if (result == ''){
            response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
            response.end();   
        }
        else{
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
            response.end();
        }
    });
});
app.post('/dataset3', function (request, response) {
    
    let selectquery = "select incomeb32, gender, relationc32 from survey32 where gender = '0' and relationc32 = '2'"
    con.query(selectquery, (error, result) => {
    console.log(error || result);
    if (error === null && result != ''){
        response.send(result);
        response.end();
    }
    else if (result == ''){
        response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
        response.end();   
    }
    else{
        response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
        response.end();
       }
    });

});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* PREDEFINED DATASET 4 MYSQL DATA  ANSLEY 09/09/2018 */
/* Annual Income for Female, Single */
app.get("/dataset4", function (request, response) {
    let selectquery = "select incomeb32, gender, relationc32 from survey32 where gender = '1' and relationc32 = '2'";
    con.query(selectquery, (error, result) => {
        console.log(error || result);
        if (error === null && result != ''){
            const fields = ['incomeb32', 'age', 'relationc32'];
            const json2csvParser = new Json2csvParser({ fields });
            const csv = json2csvParser.parse(result);
            response.attachment('dataset4.csv');
            response.type('csv');
            response.send(csv);
            response.end();
        }
        else if (result == ''){
            response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
            response.end();   
        }
        else{
            response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
            response.end();
        }
    });
});
app.post('/dataset4', function (request, response) {

    let selectquery = "select incomeb32, gender, relationc32 from survey32 where gender = '1' and relationc32 = '2'"
    con.query(selectquery, (error, result) => {
    console.log(error || result);
    if (error === null && result != ''){
        response.send(result);
        response.end();
    }
    else if (result == ''){
        response.render('error.html', {message: 'NO DATA FOUND - PLEASE TRY AGAIN'});
        response.end();   
    }
    else{
        response.render('error.html', {message: 'UNEXPECTED ERROR, PLEASE CONTACT THE SYSTEM ADMINISTRATOR'});
        response.end();
       }
    });

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
