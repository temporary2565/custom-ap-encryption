const fs = require('fs')
const ld = require('lodash')
const path = require('path')
const cr = require('crypto')
const pr = require('process')
const mongodb = require('mongodb')
const { exec, spawnSync, execSync } = require('child_process')
const bcrypt = require('bcrypt')
const { PreferencesParser } = require('./preferences')
const {Communicator} = require('./communicator')

class Main {
    constructor(location) {
        // Class-wide enums
        this.enumNotificationType = Object.freeze({"rss":0})

        this.defaultConfig = {
            "api-connection": {
                "internal-session": true,
                "internal-address": "127.0.0.1",
                "internal-port": 80,
                "internal-notify": false,
                "session-file": path.join("/dev/shm", "emcKey.rkey"),
                "sync": {
                    "nodes": [],
                    "notify": false,
                    "notification-interval": 5,
                    "notification-type": this.enumNotificationType.rss,
                    "notification-rss-path": "alerts"
                },
                "stream": {
                    "enable": false,
                    "allowed": []
                }
            },
            "management": {
                "port": 19231,
                "users" : [
                    {"name": "admin",
                    "password": "admin",
                    "access": ["enclave_accounts", "global_accounts"]}
                ],
                "max-sessions": 100
            },
            "essential": {
                "enclaves": [],
                "beacons": [],
                "automatic-deployment": true
            }
        }
        this.mainConfigPath = location;
        this.mainConfigPath = path.join(location, "emc.json")
        this.defaultConfigPath = path.join(location, "emc-default.json")
        this.sessions = []
        this.errors = []
        this.log = []
        process.on("uncaughtException", function(x) {})
        //process.on("uncaughtException", function(x) {this.errors.push("Uncaught exception in the backend process, details: "+x.toString()+", origin: config")}.bind(this))
        this.initializeConfig()
        this.checkConfig()
        

        this.communicator = new Communicator(
            this.mainConfig["api-connection"]["sync"]["nodes"],
            this.mainConfig["api-connection"]["stream"]["enabled"] ? this.mainConfig["api-connection"]["stream"]["allowed"]: [],
            this.mainConfig["api-connection"]["sync"]["notification-interval"])
        this.communicator.data = this.mainConfig.essential.enclaves
        this.communicator.logObs.subscribe((x)=>{
            if(this.mainConfig["api-connection"]["sync"]["notify"]) {
                if(typeof x == "string") this.log.push(x + ", origin: communicator")
            }
        })
        this.communicator.errObs.subscribe(x=> {
            if(typeof x == "string") this.errors.push(x + ", origin: communicator")
        })
        this.communicator.beaconsObs.subscribe((x) => {
            if(typeof x[Symbol.iterator] != "undefined") {
                for(let item of x) {
                    let b=this.mainConfig.essential.beacons
                    if((typeof item.namespace != "undefined" && b.filter(y=>y.namespace==item.namespace&&y.instance==item.instance).length == 0) ||
                    (typeof item.uuid != "undefined" && b.filter(y=>y.uuid==item.uuid&&y.major==item.major&&y.minor==item.minor).length == 0)) {
                        this.mainConfig.essential.beacons.push(Object.assign({}, item, typeof item.uuid != "undefined" ? {type: "ibeacon"} : {type: "eddystone-uid"}))
                    }
                }
            }
            this.saveConfigAsync()
        })
    }
    initializeConfig() {
        if(!fs.existsSync(this.defaultConfigPath)) {
            fs.writeFileSync(this.defaultConfigPath, JSON.stringify(this.defaultConfig))
        }
        if(!fs.existsSync(this.mainConfigPath)) {
            fs.copyFileSync(this.defaultConfigPath, this.mainConfigPath)
        }
        this.mainConfig = JSON.parse(fs.readFileSync(this.mainConfigPath, "utf8"))
    }
    saveConfig() {
        fs.unlinkSync(this.mainConfigPath)
        fs.writeFileSync(this.mainConfigPath, JSON.stringify(this.mainConfig))
        this.communicator.data = this.mainConfig.essential.enclaves
    }
    async saveConfigAsync() {
        await fs.unlinkSync(this.mainConfigPath)
        fs.writeFileSync(this.mainConfigPath, JSON.stringify(this.mainConfig))
        this.communicator.data = this.mainConfig.essential.enclaves
    }
    checkConfig() {
        const structure = {
            "api-connection": {
                "internal-session": true,
                "internal-address": {
                    "condition": "internalSessionIsTrue"
                },
                "internal-port": {
                    "condition": "internalSessionIsTrue"
                },
                "session-file": {
                    "condition": "internalSessionIsTrue"
                },
                "sync": {
                    "required": true,
                    "self-construct": true,
                    "children": {
                        "nodes": true,
                        "notify": true,
                        "notification-interval": true,
                        "notification-type": {
                            "condition": "notifyIsTrue"
                        },
                        "notification-rss-path": {
                            "condition": "notifyIsTrue"
                        }
                    }
                },
                "stream": {
                    "required": true,
                    "self-construct": true,
                    "children": {
                        "enable": true,
                        "allowed": true,
                    }
                }
            },
            "management": {
                "port": true,
                "users" : {
                    "required": true,
                    "construct": "users",
                    "array": true
                },
                "max-sessions": true
            },
            "essential": {
                "enclaves": false,
                "beacons": false,
                "automatic-deployment": true
            },
        }
        let conditions = {}
        const constructs = {
            "users": {
                "name": true,
                "password": true,
                "access": true
            }
        }
        try {
            if(typeof this.mainConfig["api-connection"] == "undefined" || 
            typeof this.mainConfig["api-connection"]["internal-session"] == "undefined" || 
            typeof this.mainConfig["api-connection"] == "undefined" || 
            typeof this.mainConfig["api-connection"]["sync"] == "undefined" || 
            typeof this.mainConfig["api-connection"]["sync"]["notify"] == "undefined")
                throw "Some of the required properties are missing"
            conditions = {
                "internalSessionIsTrue": this.mainConfig["api-connection"]["internal-session"],
                "notifyIsTrue": this.mainConfig["api-connection"]["sync"]["notify"],
            }
            let included = ld.intersection(Object.keys(structure), Object.keys(this.mainConfig))
            if(included.length != Object.keys(structure).length) {
                throw "Some of the main sections of the config file are corrupted or not present"
            }
        } catch(error) {
            console.log("E: Main configuration file loading failed, Reason: " + error)
            pr.exit(1)
        }
        try {
            for(let itemlabel of Object.keys(this.mainConfig)) {
                if(structure[itemlabel] != "undefined")
                    Main.runChecks(this.mainConfig[itemlabel], structure[itemlabel], conditions, constructs)
            }
        } catch(error) {
            console.log("E: Main configuration file loading failed, Reason: " + error)
            pr.exit(1);
        }
    }

    static runChecks(config, structure, conditions, constructs) {
        for(let subitemlabel of Object.keys(structure)) {
            if(typeof structure[subitemlabel] == "undefined" || config[subitemlabel] == "undefined") throw "Some structures are missing"
            let subitem = structure[subitemlabel]
            let subconfig = config[subitemlabel]
            if(typeof subitem["children"] != "undefined" && typeof subitem["self-construct"] != "undefined" && subitem["self-construct"]) {
                if(typeof structure[subitemlabel]["array"] != "undefined" && structure[subitemlabel]["array"]) {
                    if(typeof subconfig[Symbol.iterator] !== 'function') throw "The substructure ${subitemlabel} is supposed to be an array"
                    for(let subitem3 of subconfig)
                        Main.runChecks(subitem3, subitem["children"], conditions, constructs)
                } else {
                    Main.runChecks(subconfig, subitem["children"], conditions, constructs)
                }
            } else if(typeof subitem["condition"] != "undefined") {
                if(!((conditions[subitem.condition] && typeof config[subitemlabel] != "undefined") || !conditions[subitem.condition])) {
                    throw "The conditional item \"" + subitemlabel + "\" is missing"
                }
            } else if(typeof subitem["array"] != "undefined" && typeof subitem["construct"] != "undefined" && typeof subitem["required"] != "undefined") {
                if(typeof subitem["construct"] == "undefined" || typeof constructs[subitem["construct"]] == "undefined") throw "Unknown error"
                let construct = constructs[subitem["construct"]]
                if(typeof config[subitemlabel][Symbol.iterator] === 'function') {
                    /*for(let subitem3 of config[subitemlabel]) {
                        if(ld.differenceWith(Object.keys(construct).filter(x => construct[x]),
                            Object.keys(subitem3),
                            (x, y) => Object.keys(construct).filter(x => construct[x]).includes(y) ||
                            Object.keys(construct).filter(x => construct[x]).length == 0).length == 0) {
                            throw "Some substructures are incomplete"
                        }
                    }*/
                    if(typeof structure[subitemlabel]["array"] != "undefined" && structure[subitemlabel]["array"]) {
                        for(let subitem3 of subconfig)
                            Main.runChecks(subitem3, construct, conditions, constructs)
                    } else {
                        if(typeof config[subitemlabel][Symbol.iterator] === 'function')
                            throw `The substructure ${subitemlabel} is not supposed to be an array`
                        Main.runChecks(subconfig, construct, conditions, constructs)
                    }
                } else {
                    throw `The substructure ${subitemlabel} is supposed to be an array`
                }
            } else {
                if(subitem && typeof config[subitemlabel] == "undefined") {
                    throw `Some variables are missing`
                }
            }
        }
    }

    authenticateUser(username, password) {
        if(this.sessions.length <= this.mainConfig.management["max-sessions"]) {
            for(let item of this.mainConfig.management.users) {
                if(item.name == username && item.password == password) {
                    for(let subitem in this.sessions) {
                        if(subitem.user == username) return { authenticated: true, session: subitem.session, admin: this.mainConfig.management.users.filter(x => x.access.includes("global_accounts") && x.name == item.name).length > 0 };
                    }
                    let token = cr.randomBytes(512).toString('base64');
                    let admin = false
                    this.sessions.push({user: username, session: token});
                    if(this.mainConfig.management.users.filter(x => x.access.includes("global_accounts") && x.name == item.name).length > 0) {
                        admin = true
                    }
                    return { authenticated: true, session: token, admin: admin }
                }
            }
        }
        return {authenticated: false}
    }

    deauthenticateUser(session) {
        if(this.isAuthenticated(session)) {
            for(let [index, item] of this.sessions.entries()) {
                if(item.session == session) {
                    this.sessions = this.sessions.splice(index, 1);
                    return {authenticated: false, success: true}
                }
            }
        }
        return {authenticated: false}
    }

    createUser(username, password, access) {
        for(let item in this.mainConfig.management.users) {
            if(item.name == username) return { authenticated: true, success: false }
        }
        this.mainConfig.management.users.push({"name": username,
        "password": password,
        "access": access})
        this.saveConfig()
        return { authenticated: true, success: true }
    }

    deleteUser(username) {
        for(let [index,item] in this.mainConfig.management.users.entries()) {
            if(item.name != username) continue;
            this.mainConfig.management.users = this.mainConfig.management.users.splice(index, 1)
            return { authenticated: true, success: true }
        }
        return { authenticated: true, success: false }
    }

    relayCommand(session, action, value) {
        if(this.isAuthenticated(session) || action == "authenticate") {
            switch(action) {
                case "authenticate":
                    if((typeof value.username == "undefined") || (typeof value.password == "undefined"))
                        return { authenticated: false };
                    return this.authenticateUser(value.username, value.password)
                    break;
                case "deauthenticate":
                    return this.deauthenticateUser(session)
                    break;
                case "verify":
                    let tmp = this.isAuthenticated(session)
                    let item = ld.filter(this.sessions, {session: session})[0]
                    return tmp ? { authenticated: true, session: session, success: true, username: item.user, admin: this.mainConfig.management.users.filter(x => x.access.includes("global_accounts") && x.name == item.user).length == 1 ? true : false } : { authenticated: false }
                    break;
                case "create":
                    if((typeof value.username == "undefined") || (typeof value.password == "undefined") || (typeof value.access == "undefined"))
                        return { authenticated: true, success: false };
                    return this.createUser(value.username, value.password, value.access)
                case "delete":
                    if(typeof value.username == "undefined")
                        return { authenticated: true, success: false };
                    return this.deleteUser(value.username)
                    break;
                case "get-config":
                    return {authenticated: true, success: true, value: { config: new PreferencesParser(null).parseConfig(this.mainConfig)}}
                    break;
                case "configure":
                    if(typeof value.preferences != "undefined") {
                        let tmp = new PreferencesParser(value.preferences)
                        tmp.parseInput()
                        if(tmp.error) {
                            if(typeof tmp.reason == "string") return {authenticated: true, success: false, error: true, reason: tmp.reason}
                            else return {authenticated: true, success: false, error: true, reason: "Vstup nelze zpracovat"}
                        } else {
                            this.mainConfig = tmp.updateConfig(this.mainConfig)
                            this.saveConfig()
                            this.communicator.syncArr = this.mainConfig["api-connection"].sync.nodes
                            this.communicator.streamArr = this.mainConfig["api-connection"].stream.allowed
                            return {authenticated: true, success: true }
                        }
                    }
                    break;
                case "update-enclave":
                    if((typeof value.username || typeof value.value) == "undefined")
                        return { authenticated: true, success: false };
                    return {};
                    break;
                case "get-global": 
                    return this.getGlobalData(session);
                    break;
                case "update-global":
                    if(typeof value.value != 'undefined') {
                        this.data = value.value
                        return { authenticated: true, success: true };
                    }
                    return { authenticated: true, success: false };
                case "export":
                    if(typeof value.format != 'undefined') {
                        
                    }
                default:
                    break;
            }
            return {authenticated: true, success: false}
        }
        return {authenticated: false}
    }

    isAuthenticated(session) {
        return this.sessions.filter(x=>x.session == session).length != 0
    }

    GetGlobalData(session) {
        if(!this.isAuthenticated(session)) return {authenticated: false}
        let username = this.sessions.filter(x => x.session == session)[0].user;
        let loaded = []
        for(let i=0;i<2;i++) {
        for(let [index, item] of this.mainConfig.essential.enclaves.entries()) {
            let allowed = false
            let enclave = false
            for(let subitem of this.mainConfig.management.users) {
                if(subitem["name"] == username && subitem["access"].includes("global_accounts")) {
                    allowed = true
                } else if(subitem["name"] == username && subitem["access"].includes("enclave_accounts")) {
                    enclave = true
                }
            }
            if(allowed || (enclave && item.name == username)) {
                loaded.push(this.mainConfig.essential.enclaves[index])
            }
        }
        if(loaded.length > 0) break;
        }
        return {authenticated: true, success: true, value: JSON.stringify(loaded), beacons: this.mainConfig.essential.beacons}
    }

    updateEnclave(username, value, session) {
        if(typeof value.beacons == "undefined" || typeof value.enclaves == "undefined" || !this.isAuthenticated(session)) return {authenticated: this.isAuthenticated(session),success: false}
        this.mainConfig.essential.beacons = value.beacons
        let end = true
        for(let item of this.sessions) {
           if(item.user == username && item.session == session) end = false
        }
        if(end) return {authenticated: true, success: false}
        for(let item of value.enclaves) {
            // get privileges
            let allowed = false
            let enclave = false
            for(let subitem of this.mainConfig.management.users) {
                if(subitem["name"] == username && subitem["access"].includes("global_accounts")) {
                    allowed = true
                } else if(subitem["name"] == username && subitem["access"].includes("enclave_accounts")) {
                    enclave = true
                }
            }
            if((item.user == username && enclave) || allowed) {
                if(!this.mainConfig.essential.enclaves.map(x=>x.name).includes(username)) {
                    this.mainConfig.essential.enclaves.push(item)
                } else {
                    let indexP = this.mainConfig.essential.enclaves.map(x=>x.name).indexOf(username)
                    this.mainConfig.essential.enclaves[indexP] = item
                }
            }
        }
        this.saveConfig();
        return {authenticated: true, success: true}
    }

    subaction(r) {
        if(typeof r.session != "undefined" && !this.isAuthenticated(r.session))
        switch(r.action) {
            case "update-beacons":
                this.communicator.retrieveBeacons()
                return {authenticated: true, success: true}
                break;
            case "update-data":
                return {authenticated: true, success: true, data: this.mainConfig["essential"]}
        }
    }

    
}

module.exports = Main
