const express = require("express");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
require("dotenv").config();
const app = express();
const turf = require('@turf/turf');
const multer = require('multer');


const path = require('path');
const PORT = process.env.PORT || 5000;

const initializePassport = require("./passportConfig");

initializePassport(passport);
const storage = multer.diskStorage({
  destination: './views/uploads/',
  filename: function(req, file, cb){
    cb(null,file.originalname);
  }
});

// Init Upload
const upload = multer({
  storage: storage,
  // limits:{fileSize: 1000000},
  // fileFilter: function(req, file, cb){
  //   checkFileType(file, cb);
  // }
}).single('myImage');


// Middleware

// Parses details from a form
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use( express.static( "./views" ) );

app.use(
  session({
    // Key we want to keep secret which will encrypt all of our information
    secret: process.env.SESSION_SECRET,
    // Should we resave our session variables if nothing has changes which we dont
    resave: false,
    // Save empty value if there is no vaue which we do not want to do
    saveUninitialized: false
  })
);
// Funtion inside passport which initializes passport
app.use(passport.initialize());
// Store our variables to be persisted across the whole session. Works with app.use(Session) above
app.use(passport.session());
app.use(flash());
var from = turf.point([-75.343, 39.984]);
var to = turf.point([-75.534, 39.123]);
var options = {units: 'kilometers'};
 
var distance = turf.distance(from, to, options);
console.log(distance);
app.get("/", (req, res) => {
  
  res.render("index1");
});
app.get("/users/uploadimg", (req, res) => {
  res.render("uploadfile");
});
app.get("/about", (req, res) => {
  res.render("about");
});
app.get("/contact", (req, res) => {
  res.render("contact");
});


app.get("/users/Adminregister", checkAuthenticated, (req, res) => {
  res.render("Adminregister.ejs");
});

app.get("/users/Adminlogin", checkAuthenticated, (req, res) => {
  // flash sets a messages variable. passport sets the error message
  console.log(req.session.flash.error);
  res.render("Adminlogin.ejs");
});
app.post('/upload',async(req,res)=>{
  
  upload(req,res,(err)=>{
      if(err)
      {
          res.render("indeximg",{msg:err});
      }
      else{
          console.log(req.file);
          
          pool.query(
            `select * from property
                `,
            (err, rs) => {
              if (err) {
                throw err;
              }
              errors=[];
              console.log("here");
              cv=rs.rows;
              console.log(rs.rows);
              pool.query(
                `INSERT INTO imgdb (iaddress,pid)
                    VALUES ($1,$2)
                    `,
                [req.file.filename,cv[cv.length-1].pid],
                (err, results) => {
                  if (err) {
                    throw err;
                  }
                  //console.log(results.rows);
                  console.log(cv[cv.length-1].pid);

                  u='/'+req.file.filename;

                  res.render("uploadfile",{msg:"added successfully"});
              
                }
              );
      
              
              
              
            }
          );
     
          

      }

  });
});

app.get("/dashboard",(req,res)=>
{
  req.flash("success_msg", "You successfully added a property");
  res.redirect("/users/dashboard");
});
app.post("/users/addproperty", async (req, res) => {
  let {area, rent, address} = req.body;
  
  let lat= req.body.add2;
  let long=req.body.add3;
  let bldg_name= req.body.bldg_name;
  let street= req.body.street;

  let food= req.body.food;
  let gender_allowed = req.body.gender_allowed;
  let no_of_people= req.body.no_of_people;
  console.log(long);
  console.log(bldg_name, street, no_of_people, food, gender_allowed );
  let owner = req.user.name;
  let contact = req.user.phone_no;
  errors = [];
  if (!area || !rent|| !address || !lat|| !long ) {
    console.log({area, rent, address,lat,long});
    errors.push({ message: "Please enter all fields" });
  }

  if(errors.length >0)
  {
  console.log(errors);
  res.render("dashboard", { errors,user: req.user.name });
  errors= [];
  }
  else{
    pool.query(
      `INSERT INTO property(address,area, rent,latitude,longitude,owner,bldg_name, street, no_of_people, food, gender_allowed,phone_no)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12)
          RETURNING pid`,
      [address,area, rent,lat,long,owner,bldg_name, street, no_of_people,food, gender_allowed,contact],
      
      (err, results) => {
        if (err) {
          throw err;
        }
        errors=[];
        console.log("here");
        //console.log(results.rows);
        let popid=results.rows;
        console.log(popid[0].pid);

        
        
        req.flash("success_msg", "You successfully added a property");
        res.render("uploadfile");
      }
    );

  }
  
    
  

  
  
});
var oname;
var oproperty;
app.get("/listmyproperty",async (req,res)=>{
//res.send("hiee"+oname+oproperty);
res.render("listprop",{ldata:oproperty});
});
app.get("/users/dashboard", checkNotAuthenticated,async (req, res) => {
  console.log(req.isAuthenticated());
 
  console.log(req.user.name);
  oname=req.user.name;
  
  pool.query(
    `SELECT * FROM property WHERE owner = $1`,
    [req.user.name],
    (err, results) => {
      if (err) {
        throw err;
      }
      const ldata = results.rows;
      //ldata.push();
      oproperty= results.rows;
      console.log(ldata);
      res.render("dashboard", { user: req.user.name,ldata });
    }
      );
      
});
app.post("/users/delete", async (req,res)=>{
  let pid=req.body.deleteprop
  pool.query(
    `delete  FROM property WHERE pid = $1`,
    [pid],
    (err, results) => {
      if (err) {
        throw err;
      }
      const ldata = results.rows;
      //ldata.push();
      
      console.log(ldata);
      
    }
      );

      pool.query(
        `SELECT * FROM property WHERE owner = $1`,
        [oname],
        (err, results) => {
          if (err) {
            throw err;
          }
          const ldata = results.rows;
          //ldata.push();
          oproperty= results.rows;
          console.log(ldata);
          res.render("listprop",{ldata});
          
        }
          );

//res.send("working"+pid);
});
var pid;
app.post("/users/update",async (req,res)=>{
   pid=req.body.updateprop;
  console.log(pid);
  pool.query(
    `SELECT * FROM property WHERE pid = $1`,
    [pid],
    (err, results) => {
      if (err) {
        throw err;
      }
      const ldata = results.rows;
      //ldata.push();
      
      console.log(ldata);
      res.render("update",{c:ldata});
      
    }
      );
    
});
app.post("/users/updateproperty", async (req, res) => {
  let {area, rent, address} = req.body;
  
  let lat= req.body.add2;
  let long=req.body.add3;
  let bldg_name= req.body.bldg_name;
  let street= req.body.street;

  let food= req.body.food;
  let gender_allowed = req.body.gender_allowed;
  let no_of_people= req.body.no_of_people;
  console.log(long);
  console.log(bldg_name, street, no_of_people, food, gender_allowed );
  let owner = req.user.name;
  let contact = req.user.phone_no;
  errors = [];
  if (!area || !rent|| !address || !lat|| !long ) {
    console.log({area, rent, address,lat,long});
    errors.push({ message: "Please enter all fields" });
  }

  if(errors.length >0)
  {
  console.log(errors);
  res.render("update");
  errors= [];
  }
  else{
    pool.query(
      `update  property set address=$1,area=$2, rent=$3,latitude=$4,longitude=$5,owner=$6,bldg_name=$7, street=$8, no_of_people=$9, food=$10, gender_allowed=$11,phone_no=$12
         where pid=$13
          RETURNING pid`,
      [address,area, rent,lat,long,owner,bldg_name, street, no_of_people,food, gender_allowed,contact,pid],
      
      (err, results) => {
        if (err) {
          throw err;
        }
        errors=[];
        console.log("here");
        //console.log(results.rows);
        let popid=results.rows;
        console.log(popid[0].pid);

       
        
       
        
      }
    );

  }
  
    
  
  pool.query(
    `SELECT * FROM property WHERE owner = $1`,
    [oname],
    (err, results) => {
      if (err) {
        throw err;
      }
      const ldata = results.rows;
      //ldata.push();
      oproperty= results.rows;
      console.log(ldata);
      res.render("listprop",{ldata});
      
    }
      );
  
  
});

app.get("/logout", (req, res) => {
  
  req.logOut();
  res.render("index1");
});


app.post("/users/Adminregister", async (req, res) => {
  let { name, email, password, password2, phone_no, address } = req.body;

  let errors = [];

  console.log({
    name,
    email,
    password,
    password2,
    phone_no, 
    address
  });

  if (!name || !email || !password || !password2|| !phone_no || !address) {
    errors.push({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "Password must be a least 6 characters long" });
  }
  if (phone_no.length != 10) {
    errors.push({ message: "Enter a valid 10 digit No." });
  }

  if (password !== password2) {
    errors.push({ message: "Passwords do not match" });
  }
  //errors.push({ message: "Passwords do not match" ,test: "we are working" });
  //errors.push({ message: "success" ,test: "hurray" });

  if (errors.length > 0) {
    console.log(errors);
    
    res.render("Adminregister", { errors, name, email, password, password2,phone_no,address });
  } else {
    hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    // Validation passed
    pool.query(
      `SELECT * FROM landlord
        WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
          errors.push({message: "Email already registered"});
          return res.render("Adminregister", {errors
        });
        } else {
          pool.query(
            `INSERT INTO landlord (name, email,phone_no, password,address)
                VALUES ($1, $2, $3,$4,$5)
                RETURNING uid, password`,
            [name, email,phone_no, hashedPassword,address],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash("success_msg", "You are now registered. Please log in");
              res.redirect("/users/Adminlogin");
            }
          );
        }
      }
    );
  }
});

app.post(
  "/users/Adminlogin",
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/Adminlogin",
    failureFlash: true
  })
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/Adminlogin");
}




//prap
app.get("/users/register", checkAuthenticated, (req, res) => {
  res.render("register.ejs");
});
app.get("/users/login", checkAuthenticated, (req, res) => {
  // flash sets a messages variable. passport sets the error message
  //console.log(req.session.flash.error);
  res.render("login.ejs");
  errors=[];
});
app.post("/users/register", async (req, res) => {
  let { name,gender,age,email, password, password2 } = req.body;

  let phone_no=req.body.phoneno;
  let college_name=req.body.collegename;
  let errors = [];

  console.log({
    name,
    gender,
    college_name,
    age,
    phone_no,
    email,
    password,
    password2
  });

  if (!name ||!gender|| !college_name|| !age || !phone_no || !email || !password || !password2) {
    errors.push({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "Password must be a least 6 characters long" });
  }

  if (password !== password2) {
    errors.push({ message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    res.render("register", { errors, name,gender,college_name,age,phone_no, email, password, password2 });
  } else {
    hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    // Validation passed
    pool.query(
      `SELECT * FROM users
        WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
          return res.render("register", {
            message: "Email already registered"
          });
        } else {
          pool.query(
            `INSERT INTO users (name,gender,college_name,age,phone_no,email, password)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, password`,
            [name,gender,college_name,age,phone_no, email, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash("success_msg", "You are now registered. Please log in");
              res.redirect("/users/login");
            }
          );
        }
      }
    );
  }
});
var uname;
var ucname;
app.post(
  "/users/login",async (req, res) =>{
    e=req.body.email;
    p=req.body.password;
    console.log(e,p);
    pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [e],
      (err, results) => {
        if (err) {
          throw err;
        }
        
        if (results.rows.length == 0)
        {
          errors=[];
          errors.push({ message: "email doesnot exist" });
          res.render("login",{errors});
        }
        else{
          const userss = results.rows[0];
          console.log(userss);
          bcrypt.compare(p, userss.password, (err, isMatch) => {
            if (err) {
              console.log(err);
            }
            if (isMatch) {
              console.log("corrext");
              pool.query(
                `SELECT * FROM imgdb
                  `,
                
                (err, results) => {
                  if (err) {
                    console.log(err);
                  }
                  console.log(results.rows);
                  imgurl=results.rows;
                  //res.render("displayallimg",imgurl);
                  pool.query(
                    `SELECT * FROM property 
                      `,
                    
                    (err, r) => {
                      if (err) {
                        console.log(err);
                      }
                      
                      pd=r.rows;
                      
                      
                      
                      uname = userss.name;
                      ucname= userss.college_name;
                      console.log(uname)
                      console.log(ucname)
                      res.render("dashboard1",{imgurl,op:pd,user:userss.name});
                    });
                });
                  
              
            } else {
              //password is incorrect
              console.log("incorrext");
              errors=[];
          errors.push({ message: "incorrect password" });
          res.render("login",{errors});
            }
          });
        }
      }
    );
  }
  //passport.authenticate("local", {
    //successRedirect: "/users/dashboard",
    //failureRedirect: "/users/login",
    //failureFlash: true
  //})
);
app.post("/users/filters", async (req, res) => {
  let rentPrice = req.body.rentPrice; 
  let rent = req.body.rent;


  let food= req.body.food_;
  let gender_allowed = req.body.gender;
  
  let d=req.body.distC
console.log(rentPrice )
console.log(gender_allowed)
console.log(food)
console.log(d)
  
  // let owner = req.user.name;
  errors = [];
  if ( !rentPrice )//|| !area || !address || !lat|| !long || !bldg_name || !street || !no_of_people || !food  || !gender_allowed) 
  { 
    // console.log({area, rent, address,lat,long, bldg_name, street, no_of_people, food, gender_allowed});
    errors.push({ message: "Please enter all fields" });
  }

  if(errors.length >0)
  {
  console.log(errors);
  res.render("dashboard1", { errors,user: req.user.name });
  errors= [];
  }
  else{
    
    if(food!="both" && gender_allowed=="both"){
      pool.query(
        `SELECT * FROM imgdb
          `,
        
        (err, results) => {
          if (err) {
            console.log(err);
          }
          console.log(results.rows);
          imgurl=results.rows;
          //res.render("displayallimg",imgurl);
          pool.query(
            `SELECT * FROM property where rent<=$1 and food=$2
              `,[rentPrice,food],
            
            (err, r) => {
              if (err) {
                console.log(err);
              }
              
              pd=r.rows;
              sd=[];
              //new
              pool.query(
                `SELECT * FROM college 
                  `,
                
                (err, results1) => {
                  if (err) {
                    console.log(err);
                  }
                  let c= results1.rows;
                  pool.query(
                    `SELECT * FROM college where college_name=$1
                      `,[ucname],
                    
                    (err, results2) => {
                      if (err) {
                        console.log(err);
                      }
                      let user_college= results2.rows[0];
                      console.log(results2.rows[0].latitude, results2.rows[0].longitude);
                      console.log(ucname,user_college.longitude,user_college.latitude)
                      let uc=turf.point([user_college.longitude,user_college.latitude]);
                      console.log(uc);
        
                      var from = uc;
                      var options = {units: 'kilometers'};
                      pd.forEach(i => {
                        //console.log(i.latitude,i.longitude);
                        
                      var to = turf.point([i.longitude, i.latitude]);
                      
                
                
                      var distance = turf.distance(from, to, options);
                      //console.log(i,distance)
                      if (distance<d) {
                        console.log(distance)
                        sd.push(i)
                      } 
                      
                        
                      });
                      //console.log(sd);
                      res.render("dashboard1",{imgurl,op:sd,user:uname});
                    });
                });
              
              
              
            });
        });


    }
    if(food=="both" && gender_allowed!="both"){
      pool.query(
        `SELECT * FROM imgdb
          `,
        
        (err, results) => {
          if (err) {
            console.log(err);
          }
          console.log(results.rows);
          imgurl=results.rows;
          //res.render("displayallimg",imgurl);
          pool.query(
            `SELECT * FROM property where rent<=$1 and gender_allowed=$2
              `,[rentPrice,gender_allowed],
            
            (err, r) => {
              if (err) {
                console.log(err);
              }
              
              pd=r.rows;
              sd=[];
              //new
              pool.query(
                `SELECT * FROM college 
                  `,
                
                (err, results1) => {
                  if (err) {
                    console.log(err);
                  }
                  let c= results1.rows;
                  pool.query(
                    `SELECT * FROM college where college_name=$1
                      `,[ucname],
                    
                    (err, results2) => {
                      if (err) {
                        console.log(err);
                      }
                      let user_college= results2.rows[0];
                      console.log(results2.rows[0].latitude, results2.rows[0].longitude);
                      console.log(ucname,user_college.longitude,user_college.latitude)
                      let uc=turf.point([user_college.longitude,user_college.latitude]);
                      console.log(uc);
        
                      var from = uc;
                      var options = {units: 'kilometers'};
                      pd.forEach(i => {
                        //console.log(i.latitude,i.longitude);
                        
                      var to = turf.point([i.longitude, i.latitude]);
                      
                
                
                      var distance = turf.distance(from, to, options);
                      //console.log(i,distance)
                      if (distance<d) {
                        console.log(distance)
                        sd.push(i)
                      } 
                      
                        
                      });
                      //console.log(sd);
                      res.render("dashboard1",{imgurl,op:sd,user:uname});
                    });
                });
              
              
              
            });
        });


    }
    if(food=="both" && gender_allowed=="both"){
      pool.query(
        `SELECT * FROM imgdb
          `,
        
        (err, results) => {
          if (err) {
            console.log(err);
          }
          console.log(results.rows);
          imgurl=results.rows;
          //res.render("displayallimg",imgurl);
          pool.query(
            `SELECT * FROM property where rent<=$1
              `,[rentPrice],
            
            (err, r) => {
              if (err) {
                console.log(err);
              }
              
              pd=r.rows;
              sd=[];
              //new
              pool.query(
                `SELECT * FROM college 
                  `,
                
                (err, results1) => {
                  if (err) {
                    console.log(err);
                  }
                  let c= results1.rows;
                  pool.query(
                    `SELECT * FROM college where college_name=$1
                      `,[ucname],
                    
                    (err, results2) => {
                      if (err) {
                        console.log(err);
                      }
                      let user_college= results2.rows[0];
                      console.log(results2.rows[0].latitude, results2.rows[0].longitude);
                      console.log(ucname,user_college.longitude,user_college.latitude)
                      let uc=turf.point([user_college.longitude,user_college.latitude]);
                      console.log(uc);
        
                      var from = uc;
                      var options = {units: 'kilometers'};
                      pd.forEach(i => {
                        //console.log(i.latitude,i.longitude);
                        
                      var to = turf.point([i.longitude, i.latitude]);
                      
                
                
                      var distance = turf.distance(from, to, options);
                      //console.log(i,distance)
                      if (distance<d) {
                        console.log(distance)
                        sd.push(i)
                      } 
                      
                        
                      });
                      //console.log(sd);
                      res.render("dashboard1",{imgurl,op:sd,user:uname});
                    });
                });
              
              
              
            });
        });


    }

    if(food!="both" && gender_allowed!="both"){
      pool.query(
        `SELECT * FROM imgdb
          `,
        
        (err, results) => {
          if (err) {
            console.log(err);
          }
          console.log(results.rows);
          imgurl=results.rows;
          //res.render("displayallimg",imgurl);
          pool.query(
            `SELECT * FROM property where food= $1 and gender_allowed=$2 and rent<=$3
              `,[food,gender_allowed,rentPrice],
            
            (err, r) => {
              if (err) {
                console.log(err);
              }
              
              pd=r.rows;
              sd=[];
              //new
              pool.query(
                `SELECT * FROM college 
                  `,
                
                (err, results1) => {
                  if (err) {
                    console.log(err);
                  }
                  let c= results1.rows;
                  pool.query(
                    `SELECT * FROM college where college_name=$1
                      `,[ucname],
                    
                    (err, results2) => {
                      if (err) {
                        console.log(err);
                      }
                      let user_college= results2.rows[0];
                      console.log(results2.rows[0].latitude, results2.rows[0].longitude);
                      console.log(ucname,user_college.longitude,user_college.latitude)
                      let uc=turf.point([user_college.longitude,user_college.latitude]);
                      console.log(uc);
        
                      var from = uc;
                      var options = {units: 'kilometers'};
                      pd.forEach(i => {
                        //console.log(i.latitude,i.longitude);
                        
                      var to = turf.point([i.longitude, i.latitude]);
                      
                
                
                      var distance = turf.distance(from, to, options);
                      //console.log(i,distance)
                      if (distance<d) {
                        console.log(distance)
                        sd.push(i)
                      } 
                      
                        
                      });
                      //console.log(sd);
                      res.render("dashboard1",{imgurl,op:sd,user:uname});
                    });
                });
              
              
              
            });
        });

    }
    

  } 
});
app.get("/cheapest", async (req, res) => {
  
  
    
    
      pool.query(
        `SELECT * FROM imgdb
          `,
        
        (err, results) => {
          if (err) {
            console.log(err);
          }
          console.log(results.rows);
          imgurl=results.rows;
          //res.render("displayallimg",imgurl);
          pool.query(
            `SELECT * FROM property 
              `,
            
            (err, r) => {
              if (err) {
                console.log(err);
              }
              
              pd=r.rows;
              sd=[];
              //new
              pool.query(
                `SELECT * FROM college 
                  `,
                
                (err, results1) => {
                  if (err) {
                    console.log(err);
                  }
                  let c= results1.rows;
                  pool.query(
                    `SELECT * FROM college where college_name=$1
                      `,[ucname],
                    
                    (err, results2) => {
                      if (err) {
                        console.log(err);
                      }
                      let user_college= results2.rows[0];
                      console.log(results2.rows[0].latitude, results2.rows[0].longitude);
                      console.log(ucname,user_college.longitude,user_college.latitude)
                      let uc=turf.point([user_college.longitude,user_college.latitude]);
                      console.log(uc);
        
                      var from = uc;
                      var options = {units: 'kilometers'};
                      pd.forEach(i => {
                        //console.log(i.latitude,i.longitude);
                        
                      var to = turf.point([i.longitude, i.latitude]);
                      
                
                
                      var distance = turf.distance(from, to, options);
                      //console.log(i,distance)
                      if (distance<5) {
                        console.log(distance)
                        sd.push(i)
                      } 
                      
                        
                      });
                      var i,j,t;
                      for(i=0;i<sd.length;i++)
                      {
                        for(j=0;j<sd.length-i-1;j++)
                        {
                          if(sd[j].rent>sd[j+1].rent)
                          {
                            t=sd[j];
                            sd[j]=sd[j+1];
                            sd[j+1]=t;
                          }
                        }
                      } 
                      console.log(sd);
                      res.render("dashboard1",{imgurl,op:sd,user:uname});
                    });
                });
              
              
              
            });
        });


    
  });

  app.get("/bestrated", async (req, res) => {
  
  
    
    
    pool.query(
      `SELECT * FROM imgdb
        `,
      
      (err, results) => {
        if (err) {
          console.log(err);
        }
        console.log(results.rows);
        imgurl=results.rows;
        //res.render("displayallimg",imgurl);
        pool.query(
          `SELECT * FROM property where gender_allowed='female'
            `,
          
          (err, r) => {
            if (err) {
              console.log(err);
            }
            
            pd=r.rows;
            sd=[];
            //new
            pool.query(
              `SELECT * FROM college 
                `,
              
              (err, results1) => {
                if (err) {
                  console.log(err);
                }
                let c= results1.rows;
                pool.query(
                  `SELECT * FROM college where college_name=$1
                    `,[ucname],
                  
                  (err, results2) => {
                    if (err) {
                      console.log(err);
                    }
                    let user_college= results2.rows[0];
                    console.log(results2.rows[0].latitude, results2.rows[0].longitude);
                    console.log(ucname,user_college.longitude,user_college.latitude)
                    let uc=turf.point([user_college.longitude,user_college.latitude]);
                    console.log(uc);
      
                    var from = uc;
                    var options = {units: 'kilometers'};
                    var dis=[]
                    pd.forEach(i => {
                      //console.log(i.latitude,i.longitude);
                      
                    var to = turf.point([i.longitude, i.latitude]);
                    
              
              
                    var distance = turf.distance(from, to, options);
                    //console.log(i,distance)
                    if (distance<5) {
                      console.log(distance)
                      dis.push(distance)
                      sd.push(i)
                    } 
                    
                      
                    });
                    var i,j,t,irating,jrating;
                    for(i=0;i<sd.length;i++)
                    {
                      
                      for(j=i;j<sd.length-i-1;j++)
                      {
                        irating=sd[j].rent/dis[j];
                        jrating=sd[j+1].rent/dis[j+1];
                        
                        if(irating>jrating)
                        {
                          t=sd[j];
                          sd[j]=sd[j+1];
                          sd[j+1]=t;
                        }
                      }
                    } 
                    console.log(sd);
                    console.log(dis);
                    res.render("dashboard1",{imgurl,op:sd,user:uname});
                  });
              });
            
            
            
          });
      });


  
});
let uc;
//map code
app.get("/getmap",async (req,res)=>{
  
  pool.query(
    `SELECT * FROM property 
      `,
    
    (err, results) => {
      if (err) {
        console.log(err);
      }
      //console.log(results.rows);
      
      pd=results.rows;
      sd=[];
      //pd.forEach(i => {
        //console.log(i.latitude,i.longitude);
        
     // var to = turf.point([i.longitude, i.latitude]);
      


      //var distance = turf.distance(from, to, options);
      //console.log(i,distance)
      // if (distance<5) {
        //console.log(distance,i)
      //   sd.push(i)
      // } 
      
        
      // });
      //console.log(sd)
      
      //res.render("loadmap",{x:a});
    //   let c=[ {
    //     pid: '22',
    //     address: 'qw',
    //     area: '12',
    //     rent: '121',
    //     latitude: '19.38951',
    //     longitude: '72.76422',
    //     owner: 'salvin'
    //   },
    //   {
    //     pid: '22',
    //     address: 'qw',
    //     area: '12',
    //     rent: '121',
    //     latitude: '19.38888',
    //     longitude: '72.81658',
    //     owner: 'salvin'
    //   }
    // ]
    pool.query(
      `SELECT * FROM college 
        `,
      
      (err, results1) => {
        if (err) {
          console.log(err);
        }
        let c= results1.rows;
        console.log(uname)
        console.log(ucname)
        
        pool.query(
          `SELECT * FROM college where college_name=$1
            `,[ucname],
          
          (err, results2) => {
            if (err) {
              console.log(err);
            }
            let user_college= results2.rows[0];
            console.log(user_college)
            console.log(results2.rows[0].latitude, results2.rows[0].longitude);
            console.log(ucname,user_college.longitude,user_college.latitude)
            let uc=turf.point([user_college.longitude,user_college.latitude]);
            console.log(uc)
            res.render("newmap",{x:pd,c:c,uc:uc});
          });
    
          //res.render("newmap",{x:sd,c:c});
        
      });

      //res.render("newmap",{x:sd,c:c});
    });

});
app.post("/distancemap",async (req,res)=>{
  d= req.body.distance;
  console.log(d);
  pool.query(
    `SELECT * FROM property 
      `,
    
    (err, results) => {
      if (err) {
        console.log(err);
      }
     
      sd=[];
     
      pool.query(
        `SELECT * FROM college 
          `,
        
        (err, results1) => {
          if (err) {
            console.log(err);
          }
          let c= results1.rows;
          pool.query(
            `SELECT * FROM college where college_name=$1
              `,[ucname],
            
            (err, results2) => {
              if (err) {
                console.log(err);
              }
              let user_college= results2.rows[0];
              console.log(results2.rows[0].latitude, results2.rows[0].longitude);
              console.log(ucname,user_college.longitude,user_college.latitude)
              let uc=turf.point([user_college.longitude,user_college.latitude]);
              console.log(uc);

              var from = uc;
              var options = {units: 'kilometers'};
              pd.forEach(i => {
                //console.log(i.latitude,i.longitude);
                
              var to = turf.point([i.longitude, i.latitude]);
              
        
        
              var distance = turf.distance(from, to, options);
              //console.log(i,distance)
              if (distance<d) {
                console.log(distance)
                sd.push(i)
              } 
              
                
              });
              console.log(sd);
              res.render("directions",{x:sd,c:c,uc:uc});
            });
        });
  
        //res.render("newmap",{x:sd,c:c});
      });

});

app.get("/topcollege",async(req,res)=>{
  pool.query(
    `SELECT * FROM property 
      `,
    
    (err, results) => {
      if (err) {
        console.log(err);
      }
     
      sd=[];
      cc=[];
      pool.query(
        `SELECT * FROM college 
          `,
        
        (err, results1) => {
          if (err) {
            console.log(err);
          }
              let c= results1.rows;
              console.log(c);
              c.forEach(j => {

                let uc=turf.point([j.longitude,j.latitude]);
              console.log(j.college_name);
              let count=0;
              var from = uc;
              var options = {units: 'kilometers'};
              pd.forEach(i => {
                //console.log(i.latitude,i.longitude);
                
              var to = turf.point([i.longitude, i.latitude]);
              
        
        
              var distance = turf.distance(from, to, options);
              //console.log(i,distance)
              if (distance<0.3) {
                console.log(distance)
                sd.push(i)
                count=count+1;
              } 
              
                
              });

               cc.push({college:j.college_name,count:count});
               console.log("college:"+j.college_name+"count:"+count);
               count=0; 
              });
              

          
          var i,j,t;
          for(i=0;i<cc.length;i++)
          {
            for(j=0;j<cc.length-i-1;j++)
            {
              if(cc[j].count<cc[j+1].count)
              {
                t=cc[j];
                cc[j]=cc[j+1];
                cc[j+1]=t;
              }
            }
          }


              
          console.log(cc);  

          res.render("topcollege",{ldata:cc});
           
        });
  
        //res.render("newmap",{x:sd,c:c});
      });


});
app.get("/directions",async (req,res)=>{
  pool.query(
    `SELECT * FROM college 
      `,
    
    (err, results1) => {
      if (err) {
        console.log(err);
      }
      let c= results1.rows;
      //console.log(pd);
      res.render("directions",{c:c,x:pd});
    });

});
app.get("/users/addcollege",async (req,res)=>{
res.render("alogin");
});
app.post("/alogin",async (req,res)=>{
  let e=req.body.email;
  let p=req.body.password;

  console.log(e,p);
  errors=[]
  if (!e ||!p ) {
    errors.push({ message: "Please enter all fields" });
    res.render("alogin",{errors});
  }
  if(e=="admin@gmail.com" && p=="admin")
  {
    res.render("college");
  }
  else{
    errors.push({message:"invalid admin"});
    res.render("alogin",{errors});
  }
  errors=[]
  
  });
  app.get("/users/college", (req, res) => {
  
    res.render("college");
  });
  app.post("/users/college", async (req, res) => {
    let {college_name, address} = req.body;
    
    let lat= req.body.add2;
    let long=req.body.add3;
    console.log(college_name);
    console.log(address);
    console.log(lat);
    console.log(long);
    //let owner = req.user.name;
    errors = [];
    if (!college_name|| !address || !lat|| !long ) {
      console.log({college_name, address,lat,long});
      errors.push({ message: "Please enter all fields" });
    }
  
    if(errors.length >0)
    {
    console.log(errors);
    res.render("college", { errors,user: req.user.name });
    errors= [];
    }
    else{
      pool.query(
        `INSERT INTO college(college_name,address,latitude,longitude)
            VALUES ($1, $2, $3,$4)
            RETURNING c_id`,
        [college_name,address,lat,long],
        (err, results) => {
          if (err) {
            throw err;
          }
          errors=[];
          console.log(results.rows);
          req.flash("success_msg", "You successfully added a property");
          res.redirect("/users/college");
        }
      );
  
    }
      
  });
  app.post("/contact1", async (req, res) => {
    let email=req.body.email;
    let queryselect=req.body.queryselect;
    let concern_msg=req.body.concern_msg;
  
    console.log("hey00");
    console.log(email);
    console.log(queryselect);
    console.log(concern_msg);
    
    //let owner = req.user.name;
    errors = [];
    if (!email|| !queryselect||!concern_msg ) {
      console.log({email,queryselect,concern_msg});
      errors.push({ message: "Please enter all fields" });
    }
  
    if(errors.length >0)
    {
    console.log(errors);
    res.render("contact", { errors,user: req.user.name });
    errors= [];
    }
    else{
      pool.query(
        `INSERT INTO contact(email_add,type_of_query,msg_concern)
            VALUES ($1, $2, $3)
            RETURNING q_id`,
        [email,queryselect,concern_msg],
        (err, results) => {
          if (err) {
            throw err;
          }
          errors=[];
          console.log(results.rows);
          req.flash("success_msg", "You successfully added a query");
          res.redirect("/contact");
        }
      );
  
    }
      
  });
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
