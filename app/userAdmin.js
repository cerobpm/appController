
module.exports = function (app,config,pool,auth) {
    
    const crypto = require('crypto')    
    
    // API

    module.getUsers = function() {
        return pool.query("SELECT id,name,role from users order by id")
        .then(result=>{
            res.send(result.rows)
        })
        .catch(e=>{
            console.error(e)
            res.status(400).send(e.toString())
        })
    }
    
    module.createUser = function(req,res) {    // ?password=&role=reader
        var password = (req.query && req.query.password) ? req.query.password : (req.body && req.body.password) ? req.body.password : undefined
        var role = (req.query && req.query.role) ? req.query.role : (req.body && req.body.role) ? req.body.role : undefined
        var token = (req.query && req.query.token) ? req.query.token : (req.body && req.body.token) ? req.body.token : undefined
        pool.query("SELECT name,encode(pass_enc,'escape') pass_enc_esc from users where name=$1",[req.params.username])
        .then(result=>{
            if(result.rows.length==0) {
                if(!password || !role || !token) {
                    throw "Falta password o role o token"
                }
                return pool.query("INSERT INTO users (name,pass_enc,role,token) VALUES ($1,$2,coalesce($3,'reader'),$4) RETURNING name,pass_enc,role,token",[req.params.username, crypto.createHash('sha256').update(password).digest('hex'), role,crypto.createHash('sha256').update(token).digest('hex')])
            } else {
                return pool.query("UPDATE users set pass_enc=coalesce($1,pass_enc), role=coalesce($2,role), token=coalesce($4,token) where name=$3 RETURNING name,pass_enc,role,token",[(password) ? crypto.createHash('sha256').update(req.query.password).digest('hex') : undefined, role, req.params.username, (token) ? crypto.createHash('sha256').update(req.query.token).digest('hex') : undefined])
            }
        })
        .then(result=>{
            if(req.headers['content-type'] == "multipart/form-data" || req.headers['content-type'] == "application/x-www-form-urlencoded") {
                if(result.rows[0]) {
                    console.log(result.rows[0])
                    res.render('user_updated',result.rows[0])
                } else {
                    res.status(400).send("Error: no user updated")
                }
            } else {
                res.send(result.rows)
            }
        })
        .catch(e=>{
            console.error(e)
            res.status(400).send(e.toString())
        })
    }
    
    module.getUser = function (req,res) {
        if(! req.params) {
            res.status(400).send("missing params")
            return
        }
        if(req.user.role!="admin" && req.params.username!=req.user.username) {
            res.status(408).send("Unauthorized")
            return
        }
        pool.query("SELECT id,name,role from users where name=$1",[req.params.username])
        .then(result=>{
            res.send(result.rows)
        })
        .catch(e=>{
            console.error(e)
            res.status(400).send(e.toString())
        })
    }

    module.userChangePassword = function (req,res) {
        if(!req.body) {
            res.status(400).send("missing parameters")
            return
        }
        if(!req.body.username) {
            res.status(400).send("username missing")
            return
        }
        if(req.user.role!="admin" && req.body.username!=req.user.username) {
            res.status(408).send("Unauthorized")
            return
        }
        pool.query("select * from users where name=$1",[req.body.username])
        .then(result=>{
            if(!result.rows || result.rows.length==0) {
                res.status(400).send("User not found")
                return
            }
            var old_user = result.rows[0]
            if(req.user.role!="admin" && old_user.protected) {
                res.status(401).send("User protected")
                return
            }
            var query
            if(!req.body.newpassword) {
                if(!req.body.newtoken) {
                    res.status(400).send("New password and/or token missing")
                    return
                }
                if(req.body.newtoken == "") {
                    res.status(400).send("New token is empty string")
                    return
                }
                query = pool.query("UPDATE users SET token=$1 WHERE name=$2 RETURNING name,pass_enc,token,role",[crypto.createHash('sha256').update(req.body.newtoken).digest('hex'),req.body.username])
            } else if (req.body.newtoken && req.body.newtoken != "") {
                query = pool.query("UPDATE users SET pas_enc=$1, token=$2 WHERE name=$3 RETURNING name,pass_enc,token,role",[crypto.createHash('sha256').update(req.body.newpassword).digest('hex'),crypto.createHash('sha256').update(req.body.newtoken).digest('hex'),req.body.username])
            } else {
                query = pool.query("UPDATE users set pass_enc=$1 where name=$2 RETURNING name,pass_enc,role",[crypto.createHash('sha256').update(req.body.newpassword).digest('hex'),req.body.username])
            }
            return query.then(result=>{
                if(!result) {
                    res.status(400).send("Input error")
                    return
                }
                if(result.rows.length==0) {
                    res.status(400).send("Nothing updated")
                    return
                }
                if(req.headers['content-type'] == "multipart/form-data" || req.headers['content-type'] == "application/x-www-form-urlencoded") {
                    res.render('user_updated',result.rows[0])
                } else {
                    //~ console.log({user:result.rows[0]})
                    res.send("Password y/o token actualizado")
                }
            })
        })
        .catch(e=>{
            console.error(e)
            res.status(400).send(e.toString())
        })
    }

    module.deleteUser = function (req,res) {
        if(!req.params || !req.params.username) {
            res.status(400).send("parameter username missing")
            return
        }
        pool.query("DELETE FROM users WHERE name=$1 RETURNING id,name,role",[req.params.username])
        .then(result=>{
            if(!result.rows || result.rows.length==0) {
                res.status(400).send("User " + req.params.username + " not found")
                return
            }
            console.log({deletedUsers:result.rows})
            res.send("User " + result.rows[0].name + " deleted")
            return
        })
    }

    // GUI

    module.viewUser = function (req,res) {
        var username = req.params.username
        if(username != req.user.username) {
            if(req.user.role!="admin") {
                res.status(408).send("Must be admin to enter this user's config")
                return
            }
            console.log("admin entering " + username + " config")
        } else {
            console.log("user " + username + " entering config")
        } 
        pool.query("SELECT id,name username,role,protected from users where name=$1",[username])
        .then(result=>{
            if(result.rows.length==0) {
                res.status(404).send("user not found")
                return
            }
            res.render('usuario',{user:result.rows[0],loggedAs: req.user.username, isAdmin: (req.user.role == "admin"), protected: (req.user.role != "admin" && result.rows[0].protected)})
        })
        .catch(e=>{
            console.error(e)
            res.status(400).send(e.toString())
        })
    }
    module.viewUsers = function (req,res) {
        pool.query("SELECT id,name username,role from users order by id")
        .then(result=>{
            if(result.rows.length==0) {
                res.status(404).send("users not found")
                return
            }
            res.render('usuarios',{users:result.rows,loggedAs: req.user.username})
        })
        .catch(e=>{
            console.error(e)
            res.status(400).send(e.toString())
        })
    }
    
    module.newUserForm = function(req,res) {
        res.render('usuarionuevo',{loggedAs: req.user.username})
    }

   
    return module
}