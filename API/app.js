const express = require('express');
const app = express();
const port = 3003;
// var sqlite3 = require('sqlite3').verbose()
var fs = require('fs');
const cors = require('cors');
const multer  = require('multer')
const { v4: uuidv4 } = require('uuid');
const { randomUUID } = require('crypto');

var sqlite3 = require("sqlite3"),
    TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;

const DBSOURCE = "carsdb.sqlite";

var db = new TransactionDatabase(
    new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
      // Cannot open database
      console.error(err.message)
      throw err
    } 
    else {
        // ** EXAMPLE **
        // ** For a column with unique values **
        // email TEXT UNIQUE, 
        // with CONSTRAINT email_unique UNIQUE (email) 
        
        db.run(`CREATE TABLE Vehicles (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Year INTEGER,             
            Make TEXT,             
            Model TEXT,                         
            DateModified DATE,
            DateCreated DATE
            )`,
        (err) => {
            if (err) {
                // Table already created
            }else{
                // Table just created, creating some rows
                var insert = 'INSERT INTO Vehicles (Year, Make, Model, DateCreated) VALUES (?,?,?,?)'
                db.run(insert, [2020, "Lamborgini", "Hurucan Evo", Date('now')])
                db.run(insert, [2020, "Audi", "R8", Date('now')])
                db.run(insert, [2021, "Porsche", "911 Turbo S", Date('now')])
                db.run(insert, [2019, "Mclaren", "720s", Date('now')])
            }
        });  

        db.run(`CREATE TABLE VehicleImages (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            VehicleId INTEGER,                         
            Mimetype TEXT,                         
            Name TEXT,                         
            Size INTEGER,                         
            DateModified DATE,
            DateCreated DATE
            )`,
        (err) => {
            if (err) {
                // Table already created
            }else{
                // Table just created, creating some rows
                var insert = 'INSERT INTO VehicleImages (VehicleId, Mimetype, Name, Size, DateCreated) VALUES (?,?,?,?,?)'
                db.run(insert, [1, "jpeg", `${uuidv4()}.jpg`, 21000, Date('now')])
                db.run(insert, [1, "jpeg", `${uuidv4()}.jpg`, 21000, Date('now')])
                db.run(insert, [2, "jpeg", `${uuidv4()}.jpg`, 21000, Date('now')])
                db.run(insert, [2, "jpeg", `${uuidv4()}.jpg`, 21000, Date('now')])
                db.run(insert, [3, "jpeg", `${uuidv4()}.jpg`, 21000, Date('now')])
                db.run(insert, [3, "jpeg", `${uuidv4()}.jpg`, 21000, Date('now')])
            }
        });  

    }
  })
);

module.exports = db


app.use(
    express.urlencoded(),
    cors({
        origin: 'http://localhost:3000'
    })
);

app.get('/', (req, res) => res.send('API Root'));

// G E T   A L L
app.get("/api/cars", async (req, res, next) => {
    var sql = "SELECT * FROM Vehicles"
    var params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

// G E T   S I N G L E   P R O D U C T
app.get("/api/car/:id", async (req, res, next) => {
    var sql = "SELECT * FROM Vehicles WHERE Id = ?"
    db.all(sql, req.params.id, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
})

// C R E A T E 
app.post("/api/car", async (req, res) => {
    var errors=[]
    
    if (!req.body.Make){
        errors.push("Make is missing");
    }
    if (!req.body.Model){
        errors.push("Model is missing");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    var data = {
        Make: req.body.Make,
        Model: req.body.Model,
        DateCreated: Date('now')
    }

    var sql ='INSERT INTO Vehicles (Make, Model, DateCreated) VALUES (?,?,?)'
    var params =[data.Make, data.Model, Date('now')]

    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({
            "message": "success",
            "data": data,
            "id" : this.lastID
        })
    });   
})

// U P D A T E
app.patch("/api/car/:id", async (req, res, next) => {
    var data = [req.body.Make, req.body.Model, Date('now'), req.params.id];
    
    let sql = `UPDATE Vehicles SET 
               Make = ?, 
               Model = ?, 
               DateModified = ?
               WHERE Id = ?`;
    
    db.run(sql, data, function(err) {
      if (err) {
        return console.error(err.message);
      }
      console.log(`Row(s) updated: ${this.changes}`);
    
    });
    
    res.json({
        message: "success",
        data: data,
        changes: this.changes
    })    
})

// D E L E T E
app.delete("/api/car/:id", async (req, res, next) => {
    console.log('request ', req.params.id);

    db.all('SELECT Name FROM VehicleImages WHERE VehicleId = ?', req.params.id, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })

        rows.forEach(item => {
            console.log(item.Name);
            var filePath = `./images/${req.params.id}/${item.Name}`;
            
            console.log('filePath', filePath);
            try {
                fs.unlinkSync(filePath)
                //file removed
            } catch(err) {
               console.error(err)
            }
            
        })  
        
        var dirPath = `./images/${req.params.id}`;
        fs.rmdir(dirPath, function(err) {
            if (err) {
              throw err
            } else {
              console.log("Successfully removed the empty directory!")
            }
          })

      }); 
    //db.beginTransaction(function(err, transaction) {

        // db.run(
        //     'SELECT Name FROM VehiclesImages WHERE VehicleId = ?',
        //     req.params.id,
        //     function (err, result) {
        //         if (err){
        //             res.status(400).json({"error": res.message})
        //             return;
        //         }          
        //         res.status(200).json({"succeess": res})
                // console.log(' result.rows[i] ',  result);
                // for (var i = 0; i < result.rowCount; i++) {

                //     console.log(' result.rows[i] ',  result.rows[i]);
                // }
                // result.forEach(item => {
                //   console.log(item.Name);
                // })                                
      
        // });

        // var dir = `./images/${req.body.VehicleId}/`;

        // var filePath = ``; 
        // fs.unlinkSync(filePath);
        // db.run(
        //     'DELETE FROM VehiclesImages WHERE VehicleId = ?',
        //     req.params.id,
        //     function (err, result) {
        //         if (err){
        //             res.status(400).json({"error": res.message})
        //             return;
        //         }
        //         res.json({"message":"Deleted", changes: this.changes})
        // });


        // db.run(
        //     'DELETE FROM Vehicles WHERE id = ?',
        //     req.params.id,
        //     function (err, result) {
        //         if (err){
        //             res.status(400).json({"error": res.message})
        //             return;
        //         }
        //         res.json({"message":"Deleted", changes: this.changes})
        // });

    //     transaction.commit(function(err) {
    //         if (err) return console.log("Sad panda :-( commit() failed.", err);
    //         console.log("Happy panda :-) commit() was successful.");
    //     });
    // });

})

const upload = multer({ dest: './images/' })
app.post('/api/upload-single-file', upload.single('files'), function async (req, res) {
    var dir = `./images/${req.body.VehicleId}/`;
    console.log('dir ', dir);
    console.log('req.body ', req.body);
    console.log('req.body ', req.file);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    var oldPath = `./images/${req.file.filename}`    
    var newPath = `./images/${req.body.VehicleId}/${req.file.filename}.jpg`;

    fs.rename(oldPath, newPath, function (err) {
      if (err) throw err
      console.log('Successfully Moved File')
    })

    var data = {
        VehicleId: req.body.VehicleId,
        Name: req.file.filename,
        Mimetype: req.file.mimetype,
        Size: req.file.size,
        DateCreated: Date('now')
    }

    var sql ='INSERT INTO VehicleImages (VehicleId, Name, Mimetype, Size, DateCreated) VALUES (?,?,?,?,?)'
    var params =[data.VehicleId, data.Name, data.Mimetype, data.Size, Date('now')]

    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
    });   


    res.status(200).json(req.file)
});




var uploads = multer();
app.post('/api/upload-multiple-files', uploads.array('files', 3), function async (req, res) {
    var file = req.files;

    var dir = `./images/${req.body.VehicleId}/`;
    file.forEach(element => {

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        var newFileName = `${uuidv4()}.jpg`;        
        var newPath = `./images/${req.body.VehicleId}/${newFileName}`;
        var imageBinary = element.buffer;
        try {
            fs.writeFile(newPath, imageBinary, 'base64', function(err){});    
            console.log("Success Creating New File");
        } catch (error) {
            console.log(error);
        }                
        var data = {
            VehicleId: req.body.VehicleId,
            Name: newFileName,
            Mimetype: element.mimetype,
            Size: element.size,
            DateCreated: Date('now')
        }

        db.beginTransaction(function(err, transaction) {
            var sql ='INSERT INTO VehicleImages (VehicleId, Name, Mimetype, Size, DateCreated) VALUES (?,?,?,?,?)'
            var params =[data.VehicleId, data.Name, data.Mimetype, data.Size, Date('now')]

            db.run(sql, params, function (err, result) {
                if (err){
                    res.status(400).json({"error": err.message})
                    return;
                }
            });   

            transaction.commit(function(err) {
                if (err) return console.log("Sad panda :-( commit() failed.", err);
                console.log("Happy panda :-) commit() was successful.");
            });
        });
    });

    res.status(200).json(req.file)
});



app.listen(port, () => console.log(`API listening on port ${port}!`));