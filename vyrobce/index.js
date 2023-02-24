const express = require("express")
const fs = require("fs")
const cr = require("crypto")
const bp = require('body-parser')
const _ = require('lodash')

let app = express()
let sessions = []
let accounts = [{uid: "0",username: "user@domain", password: "password", config: {
	registeredOn: new Date(),
	prohibited: false,
	tokens: []
}}]
let apiKeys = [{enclave: "default", key: "bfdd9397-7bf0-48dd-a624-8769572f83ef"}]
let stations = []
let clients = []
let blackListed = []

app.use(express.json())
app.use(express.static("frontend/dist/frontend"))
app.use(bp.urlencoded({ extended: false }))

app.listen(4000)

app.post("/api", (req, resp) => {
	if(typeof req.body.action != "undefined" && typeof req.body.key != "undefined" && typeof req.body.value != "undefined") {
		let value = req.body.value
		if(apiKeys.map(x =>x.key).contains(req.body.key)) {
			switch(req.body.action) {
				case "station-register":
					try {
						let tmp = cr.privateDecrypt(value, fs.readFileSync("private.pem"));
						let tmpjson = JSON.parse(tmp);
						if(stations.map(x => x.enclave).includes(apiKeys.filter(x=>x.key==req.body.key)[0].enclave))
							stations = stations.splice(stations.map(x => x.enclave).indexOf(apiKeys.filter(x=>x.key==req.body.key)[0].enclave), 1);
						stations.push({enclave: apiKeys.filter(x=>x.key==req.body.key)[0].enclave, id: tmpjson.id, enctype: tmpjson.enctype, enctime: tmpjson.enctime, "alive-timeout":60})
						resp.send({success: true, authenticated: true})
						} catch(err) {
							resp.send({success: false, authenticated: true})
						}
					break;
				case "station-check":
					try {
						let tmp = cr.privateDecrypt(value, fs.readFileSync("private.pem"));
						let tmpjson = JSON.parse(tmp);
						let tmp2 = cr.privateDecrypt(tmp, fs.readFileSync("private.pem"));
						let tmpjson2 = JSON.parse(tmp2)
						if(tmpjson2) {}
					} catch(err) {}
					break;
				case "device-register":
					try {
						let tmp = cr.privateDecrypt(value, fs.readFileSync("private.pem"));
						let tmpjson = JSON.parse(tmp);
						if(stations.map(x => x.enclave).includes(apiKeys.filter(x=>x.key==req.body.key)[0].enclave))
							stations = stations.splice(stations.map(x => x.enclave).indexOf(apiKeys.filter(x=>x.key==req.body.key)[0].enclave), 1);
						stations.push({enclave: apiKeys.filter(x=>x.key==req.body.key)[0].enclave, id: tmpjson.id, enctype: tmpjson.enctype, enctime: tmpjson.enctime, "alive-timeout":60})
						resp.send({success: true, authenticated: true})
					} catch(err) {
						resp.send({success: false, authenticated: true})
					}
					break;
				default:
					resp.send({authenticated: true, success: false});
					break;
			}
		}
	} else {
		resp.send({authenticated: false});
	}
})

app.post("/login", (req, resp) => {
	let r = req.body
	console.log(JSON.stringify(r))
	if(accounts.filter(x=>x.username==r.username&&x.password==r.password).length ==1) {
		let session = cr.randomBytes(12).toString("hex")
		sessions.push({username: r.username, session: session})
		resp.status(200).send({authenticated: true, success: true, username: r.username, session: session})
	} else {
		resp.status(200).send({authenticated: false})
	}
})

app.post("/deauth", (req, resp) => {
	let r = req.body
	if(sessions.map(x=>x.session).includes(r.session)) {
		sessions = sessions.splice(sessions.map(x=>x.session).indexOf(r.session), 1)
		resp.status(200).send({authenticated:false, success:true})
	} else {
		resp.status(200).send({authenticated: false})
	}
})

app.post("/register", (req,resp)=>{
	let r = req.body
	if(r.username.length > 4 && r.username.length < 32 && !accounts.map(x=>x.username).includes(r.username) &&
		r.password.length > 5 && r.password.length < 64) {
			let uid = ""
			let first = true
			while(accounts.map(x=>x.uid).includes(uid) || first) {
				first = false
				uid = cr.randomBytes(14).toString("hex")
			}
			accounts.push({uid: uid, username: r.username, password: r.password, config: {
				registeredOn: new Date(),
				prohibited: false,
				tokens: []
			}})
			console.log(accounts)
			let session = cr.randomBytes(12).toString("hex")
			sessions.push({username: r.username, session: session})
			resp.status(200).send({authenticated: true, success: true, session: session})
		} else {
			resp.status(200).send({authenticated: false})
		}
})

app.post("/verify", (req, resp) => {
	let r = req.body
	if(typeof r.session != "undeifned"&&sessions.map(x=>x.session).includes(r.session)) {
		resp.status(200).send({authenticated:true, success:true, session: r.session, username: sessions.filter(x=>x.session==r.session)[0].username})
		
	}else resp.status(200).send({autheticated:false})
})

app.post("/getconfig", (req, resp) => {
	let r=req.body
	if(sessions.map(x=>x.session).includes(r.session)) {
		let u = sessions.filter(x=>x.session==r.session)[0].username
		let c = Object.assign({}, accounts.filter(x=>x.username==u)[0].config)
		c['username'] = u
		console.log(JSON.stringify(c))
		resp.status(200).send({authenticated:true, success:true, config:c, username: u})
	}
	else resp.status(200).send({autheticated:false})
})

app.post("/rm-token", (req, resp) => {
	let r=req.body
	console.log(r)
	if(sessions.map(x=>x.session).includes(r.session)) {
		let u = accounts.filter(y=> y.username == sessions.filter(x=>x.session==r.session)[0].username)[0]
		let i = accounts.map(y=> y.username).indexOf(sessions.filter(x=>x.session==r.session)[0].username)
		if(typeof r.token != "undefined" && accounts.map(x=>x.config.tokens)) {
			accounts[i].config.tokens.splice(accounts[i].config.tokens.map(x=>x.value).indexOf(r.roken),1)
			resp.status(200).send({authenticated:true, success:true})
		
		}else resp.status(200).send({authenticated:true, success:false})
	}
	else resp.status(200).send({autheticated:false})
})

app.post("/add-token", (req,resp) => {
	let r = req.body
	console.log(JSON.stringify(r))
	if(typeof r.session != "undefined" && sessions.map(x=>x.session).includes(r.session)) {
		let u = accounts.filter(y=> y.username == sessions.filter(x=>x.session==r.session)[0].username)[0]
		let i = accounts.map(y=> y.username).indexOf(sessions.filter(x=>x.session==r.session)[0].username)
		if(typeof r.name == "string") {
			if(typeof accounts[i].config.tokens == "undefined") accounts[i].config.tokens = []
			accounts[i].config.tokens.push({value: cr.randomBytes(12).toString("hex"), name: r.name})
			resp.status(200).send({authenticated:true, success:true})
		}else resp.status(200).send({authenticated:true, success:false})
	} else if(typeof r.client != "undefined" && ((typeof r.username != "undefined" && typeof r.password != "undefined") || (typeof r.key != "undefined"))) {
		 console.log("tegare")
		if(typeof r.username != "undefined" && typeof r.password != "undefined") {
			console.log("tbd")
			if(accounts.filter(x=>x.username==r.username&&x.password==r.password).length ==1) {
				console.log("bt")
				let u = accounts.filter(y=> y.username == r.username)[0]
				let i = accounts.map(y=> y.username).indexOf(r.username)
				let t =cr.randomBytes(12).toString("hex")
				console.log([u,i,t])
				accounts[i].config.tokens.push({value: t, name: r.username})
				resp.status(200).send({authenticated:true, success:true, token: t})
			} else {resp.status(200).send({authenticated: false,success: false})}
		} else if(typeof r.key != "undefined") {
			for(let item of accounts) {
				console.log(item)
				for(let subitem of item.config.tokens) {
					console.log(subitem)
					if(subitem.value == r.key) {
						console.log(r.key)
						resp.status(200).send({authenticated: true, success: true, username: subitem.name})
					}
				}
			}
			resp.status(200).send({authenticated: true, success: false})
		} else {resp.status(200).send({authenticated: false, success: false})}
	}
})

app.post("/change-pwd", (req,resp)=>{
	let r = req.body
	if(sessions.map(x=>x.session).includes(r.session)) {
		let u = accounts.filter(y=> y.username == sessions.filter(x=>x.session==r.session)[0].username)[0]
		let i = accounts.map(y=> y.username).indexOf(sessions.filter(x=>x.session==r.session)[0].username)
		if(typeof r.old == "string" && typeof r.newer == "string" && u.password == r.old) {
			accounts[i].password = r.newer
			resp.status(200).send({authenticated:true, success:true})
		}else resp.status(200).send({authenticated:true, success:false})
	} else resp.status(200).send({authenticated:false})
})

/*app.get("/api/station", (req, resp)=>{
	let r = req.body
	if(sessions.map())
})*/