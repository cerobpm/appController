'use strict'
const { exec } = require('child_process')
const fs = require('fs')
const http = require('http')
//~ var HttpsProxyAgent = require('https-proxy-agent');
const {spawn} = require('child_process')
var ps = require('ps-node');
const axios = require('axios')

const internal = {}
internal.controller = class {
	constructor(app_list,config) {
		this.app_list = (app_list) ? app_list : {}
		this.config = (config) ? config : {}
	}
	startApp(app,callback) {
		if(!app) {
			console.error("Error: falta nombre de app")
			return
		}
		if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			return
		}
		this.checkApp(app)
		.then(running=>{
			if(running) {
				console.error("La aplicación " + app + " ya está funcionando")
				if(callback) {
					callback()
				}
			} else {
				//~ var script = this.app_list[app].dir + "/" + this.app_list[app].script
				if(fs.existsSync(this.app_list[app].logfile)) {
					var old_log = fs.readFileSync(this.app_list[app].logfile,'utf8')
					if(old_log) {
						fs.appendFileSync(this.app_list[app].logfile + "." + new Date().toISOString().substring(0,10), old_log)
					}
				}
				var out = fs.openSync(this.app_list[app].logfile, 'w') // a')
				var err = fs.openSync(this.app_list[app].logfile, 'a')
				const ff = spawn('nodejs', [this.app_list[app].script], {
					cwd: this.app_list[app].dir,
					stdio: [ 'ignore', out, err ],
					detached: true
				})
				ff.unref();
				var pidFile = this.app_list[app].dir + "/logs/PID"
				fs.writeFileSync(pidFile, ff.pid+'\n', 'utf8')
				console.log("Se inició la app " + app + " con el PID " + ff.pid)
				if(callback) {
					callback()
				}
			}
		})
		.catch(e=>{
			console.error(e)
		})
	}

	checkApp(app) {
		// var test_url = server_url  + this.app_list[app].webdir
		return new Promise ( (resolve, reject) => {
			console.log("Realizando solicitud de prueba a localhost:" + this.app_list[app].port + this.app_list[app].testpath)
			const req = http.get({
				 hostname: 'localhost',
				 port: this.app_list[app].port,
				 path: this.app_list[app].testpath,
				 method: 'GET',
				 agent: false
			}, res=> {
				//~ console.log(`statusCode: ${res.statusCode}`)
				if(res.statusCode == 200) {
					//~ console.error("La aplicación " + app + " ya está funcionando")
					resolve(true)
				} else {
					resolve(false)
				}
			})
			req.on('error', error => {
			  //~ console.error(error)
			  resolve(false)
			})
			req.end()
		})
	}
		

	stopApp(app,callback) {  // usando PID
		if(!app) {
			console.error("Error: falta nombre de app")
			return
		}
		if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			return
		}
		return new Promise((resolve,reject)=>{
			fs.readFile(this.app_list[app].dir + "/logs/PID",'utf8', (err, pid) => {
				if(err) {
					// console.error("PID file not found")
					//~ console.error(err)
					reject("PID file not found")
					return
				}
				if(!pid) {
					// console.error("PID no encontrado")
					reject("PID no encontrado")
					return
				}
				console.log("found PID:"+pid)
				if(pid == "") {
					// console.error("PID vacío")
					reject("PID vacío")
					return 
				}
				ps.kill(pid, function(err) {
					if(err) {
					//~ console.error(err);
						console.error("PID " + pid + " not found")
						resolve()
					} else {
						console.log( 'Process %s has been killed!', pid );
						resolve()
					}
				})
			})
		})
		.then(()=>{
			if(callback) {
				callback()
			}
			return
		})
		.catch(err=>{
			console.error(err)
			return
		})
	}

	stopApp2(app) {  // usando /exit
		if(!app) {
			console.error("Error: falta nombre de app")
			return
		}
		if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			return
		}
		//~ return axios.post("http://localhost:" + this.app_list[app].port + "/login",{
			//~ username: config.user.username,
			//~ password: config.user.password
		//~ },{jar: cookieJar, withCredentials: true})
		//~ .then(response=>{
			//~ if(!response) {
				//~ throw("login failed")
			//~ } else if(response.status != 200) {
				//~ throw("login failed, statusCode:" + response.status)
			//~ }
			//~ return axios.get("http://localhost:" + this.app_list[app].port + "/exit",{jar: cookieJar, withCredentials: true})
		//~ })
		return axios.get("http://localhost:" + this.app_list[app].port + "/exit",{headers: {"Authorization": "Bearer " + this.config.user.token}})
		.then(response=>{
			//~ console.log(`statusCode: ${res.statusCode}`)
			if(!response) {
				throw("exit failed")
			}
			if(response.status == 200) {
				console.log("La aplicación " + app + " se detuvo exitosamente")
			} else {
				console.error("La aplicación " + app + " no se detuvo")
			}
			return
		})
		.catch(e=>{
			if(e) {
				console.error(e.toString())
			} else {
				console.error("stopApp2 error")
			}
			return
		})
	}
}

module.exports = internal
