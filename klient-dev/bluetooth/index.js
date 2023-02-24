const {spawnSync} = require("child_process")
const {RetrievedTime} = require('./subclasses')
let noble = require('noble')
const interop = require('./build/Release/obj.target/module')
const {EventEmitter} = require('events')
const cr = require('crypto')
const {Connection} = require('./network')
const {Configuration} = require('../config')
const getmac = require('getmac')
const {bscanner} = require('./beacons')
let mutex = false

const stages = Object.freeze({scan: 0, sync: 1,beacons:2,key:3,auth:4, done:5})
const uuids = {
    service: "4fd3f22b6870873b8446eb14cb9b2a49",
    pubkey: "4fd3f22b6870873b8446eb14cb9b2a4a",
    promote: "4fd3f22b6870873b8446eb14cb9b2a4b",
    time: "4fd3f22b6870873b8446eb14cb9b2a4c",
    auth: "4fd3f22b6870873b8446eb14cb9b2a4d",
    eauth: "4fd3f22b6870873b8446eb14cb9b2a4e",
    pair: "4fd3f22b6870873b8446eb14cb9b2a4f",
}

class Scanning extends EventEmitter {
    constructor(_refreshTime = 10) {
        super();
        // Properties
        this.scanned = []
        this.devices = []
        this.beacons = []
        this.refreshTime = _refreshTime
        this.refreshInterval = null
        this.connectionTime = 30
        this.connectionTimeout = null
        this.uuids = uuids
        this.token = ""
        this.stage = stages.scan
        this.toConnect = null
        this.login = false
        this.toPeripheral = null
        this.generatorPath = "./gen.out"
        this.stationKey = ""
        this.vendorKey = `-----BEGIN PUBLIC KEY-----
        MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAu8Z3tlHMivhwuo0sekyf
        J5+kbmxG3RriPcA1vn0FayVZdBCGCkfb7L33xnPG9cfeBrJ6Rb7GZuJhf/nWKrWl
        Hmb4qv9szPWYVaWGvsKDjw1BjWtJmf2kViwF3zj/aEVtZ/AaDeBWeVnRzwyx19lo
        A0rYSoflSwsSLnz7IgP3yjrkFzNdWoyzQ4sIOhRp0dSExc1KXvfRTWaI2fX+jMax
        8oDbcUl0zKPwvUnY37vvNAwM40JQcTzAF0XqbQm3t95sd5O9IZDv6Ze1LEkB5ff9
        bLG4hxMmo7D2tu03l44GMi3pGfx/zPLrNhf5hUvfxnWBiCIohabZmKRrxOjrZT9f
        Gd7fhR+dEXnZvrTI6z1u7gyAuMm3W1wniIT891VTJN1kKHzacy4YNX0leiATshyc
        pI/ibo6NK0ZbuiaZvn7RjDQWHSzMib9veTqxY7O0tg4sOWjBeEzZN8dv+1l1o6DX
        chNUIAMYWWtrLelccdzJWdU8hLnmfoNk8aL9gAy6E9BPq0OElDm6vaqOc7y3jpP9
        v/7fHUoiWJUNa09ng0o8jSTU9+SyckJmlYvEMZB1JYcaUC/l9DguLaNNgwOcjV1h
        M2muQv3+dcmz9ugd0rW2DhGWd2UMtSe/CdXT3UhZ1hIILKazs3+aVaq8sFzgAweW
        qRx+cF00bdEs2ZTKVx1TPE0CAwEAAQ==
        -----END PUBLIC KEY-----`
        this.wifiInterfaces = []
        this.mac = ""
        this.challenge = ""
        this.encmode = 0
        this.enctype = 0
        this.username = ""
        this.password = ""
        this.on('hasInterfaces', (...args) => {
            try{
                if(!args[0].includes(this.config.data.interface) && args[0].length > 0) {
                    this.config.data.interface = args[0][0]
                    this.config.save()

                } else if(args[0].length < 1) {
                    this.emit('error', 'interfaces')
                }
                getmac.getMac({iface: this.interface}, (err, mac) => {
                    if(!err) this.mac = mac.toString().toUpperCase().replace(':', '')
                    else this.emit('error', 'interfaces-getmac')
                })
            } catch(err) {
                this.emit('error', 'interfaces-catch')
            }
            
        })

        // Instances

    }

    checkDevice(error, characteristics, finished, peripheral) {
        if(!error)  {
            characteristics.forEach((element) => {
                if(element.uuid === uuids.promote) {
                    element.read((error, data) => {
                        let recv
                        try {
                            recv = JSON.parse(data.toString('ascii'))
                        } catch(err) {}
                        let tmp = []
                        for(let item of this.devices) {tmp.push(item.mac)}
                        if(typeof recv.enctype == 'undefined' || typeof recv.encmode == 'undefined' || typeof recv.mac == 'undefined') return
                        if(tmp.includes(recv.mac)) {
                            this.devices[tmp.indexOf(recv.mac)].updated = true
                            this.devices[tmp.indexOf(recv.mac)].enctype = recv.enctype
                            this.devices[tmp.indexOf(recv.mac)].encmode = recv.encmode
                            this.devices[tmp.indexOf(recv.mac)].peripheral = element._peripheralId
                            this.devices[tmp.indexOf(recv.mac)].rssi = peripheral.rssi
                        } else {
                            this.devices.push({mac: recv.mac, enctype: recv.enctype, encmode: recv.encmode, updated: true, peripheral: element._peripheralId, rssi: peripheral.rssi})
                        }
                    })
                }
            })
        }
        finished()
    }

    syncTime(error, characteristics, finished) {
        if(!error) {
            let success = false
            characteristics.forEach((element) => {
                if(element.uuid === uuids.pubkey) {
                    element.read((error, data) => {
                        if(!error) {
                            let tmp
                            try {tmp = JSON.parse(data.toString("ascii"))} catch(err) {}
                            let tmp2 = new RetrievedTime()
                            if(typeof tmp.hash != 'undefined') {
                                tmp2.hash = tmp
                                tmp2.hasHash = true
                                tmp2.computeTime()
                            }
                            if(tmp2.hasResult = true) {
                                console.log(tmp2.result)
                                this.emit('time-synced', tmp2.result)
                                clearTimeout(this.connectionTimeout)
                                this.connectionTimeout = null
                            }
                        }
                    })
                }
            })
            if(success) {
                clearTimeout(this.connectionTimeout)
                this.connectionTimeout = null
            }
        }
        finished()
    }

    startScanning() {
        this.stage = stages.scan
        try {spawnSync("hciconfig", ["hci0", "reset"])} catch(err) {}
        noble.startScanning()
        this.refreshInterval = setInterval(function() {
            // this.scanWifi()
            console.log(this.devices)
            console.log(this.scanned)
            this.emit("scanned", this.devices)
            noble.stopScanning()
            try {spawnSync("hciconfig", ["hci0", "reset"])} catch(err) {}
            for(let [index, item] of this.devices.entries()) {
                if(!this.devices[index].updated) {
                    this.devices = this.devices.splice(index, 1)
                } else {
                    this.devices[index].updated = false
                }
            }
            this.scanned = []
            noble.startScanning()
        }.bind(this), this.refreshTime*1000)
    }

    startConnecting() {
        try {spawnSync("hciconfig", ["hci0", "reset"])} catch(err) {}
        this.devices = []
        this.stage = stages.beacons
        this.getState()
        noble.startScanning()
        this.connectionTimeout = setTimeout(function() {
            this.stopConnecting(true)
        }.bind(this), this.connectionTime*1000)
    }
    
    stopConnecting(bytimeout = false) {
        if(!bytimeout) {
            clearInterval(this.connectionTimeout)
            this.connectionTimeout = null
        }
        this.toConnect = null
        this.toPeripheral = null
        this.stage = stages.scan
        this.getState()
        mutex = false
        this.scanned = []
        noble.stopScanning()
        this.startScanning()
    }

    stopScanning() {
        clearInterval(this.refreshInterval)
        noble.stopScanning()
        this.scanned = []
        mutex = false
    }

    connect(mac) {
        let tmp = []
        let tmp2 = ""
        for(let item of this.devices) {
            tmp.push(item.mac)
            if(item.mac == mac) tmp2 = item.peripheral
        }
        if(!tmp.includes(mac)) return false
        this.stopScanning()
        this.beacons = []
        this.toConnect = mac
        this.toPeripheral = tmp2
        bscanner.start(2400, function(beacons) {
            this.beacons = Object.assign([], beacons)
            this.startConnecting()
        }.bind(this))
    }

    auth(error, characteristics, finished, peripheral) {
        if(!error) {
            characteristics.forEach((element) => {
                if(element.uuid === uuids.pubkey) {
                    let encrypted = null
                    element.read((error, data) => {
                        this.stationKey = data.toString('ascii')
                        this.challenge = cr.pseudoRandomBytes(14).toString("base64")
                        if(!error) {
                            try {encrypted = crypto.publicEncrypt(this.vendorKey, crypto.publicEncrypt(this.stationKey, Buffer.from(JSON.stringify({
                                mac: this.mac,
                                token: this.config.data,
                                challenge: this.challenge,
                                beacons: this.beacons,
                                customConnectionString: ""
                            })))) } catch(err) {this.emit('fail', 'connect-getkey-publicencrypt', err)}
                        } else {
                            this.emit('fail', 'connect-getkey-else', error)
                        }
                    })
                }
            })
        }
    }
    getKey(error, characteristics, finished, peripheral) {
        if(!error) {
            characteristics.forEach((element) => {
                let encrypted = null
                if(element.uuid === uuids.time) {
                    element.read((error, data) => {
                        this.stationKey = data.toString('ascii')
                        this.challenge = cr.pseudoRandomBytes(14).toString("base64")
                        if(!error) {
                            try {encrypted = crypto.publicEncrypt(this.vendorKey, crypto.publicEncrypt(this.stationKey, Buffer.from(JSON.stringify({
                                mac: this.mac,
                                token: this.token,
                                challenge: this.challenge,
                                beacons: this.beacons,
                                username: this.username,
                                password: this.password,
                                customConnectionString: "",
                                login: this.login
                            }), "utf8"))) } catch(err) {this.emit('fail', 'connect-getkey-publicencrypt', err)}
                        } else {
                            this.emit('fail', 'connect-getkey-else', error)
                        }
                    })
                    if(encrypted != null) element.write(new Buffer(encrypted.toString("base64"), "ascii"))
                    else this.emit('fail', 'connect-getkey-response', err)
                }
                if(element.uuid === uuids.pair) {
                    element.on('data', function(data, isNotification) {
                        
                      });
                }
            })
        }
    }

    wifiConnect(mac) {
        
    }

    getInterfaces() {
        let wifiInterfaceDetector = new Connection()
        wifiInterfaceDetector.on("hasInterfaces", (...args)=> {
            this.emit('hasInterfaces', ...args)
        })
        wifiInterfaceDetector.getNMInterfaces()
    }

/*    scanWifi() {
        let c = new Connection();
        c.toFind = this.devices.map(x=>x.mac)
        c.scan()
        for(let [index, item] of this.devices.toArray().entries()) {
            if(c.list.map(x=>x.toString().toUpperCase().replace(':', '')).includes(item.mac.toString().toUpperCase().replace(':', ''))) {
                item.wifiRssi = c.list.filter(x=>x.HwAddress.toString().toUpperCase().replace(':', '')==item.mac.toString().toUpperCase().replace(':', ''))[0].Strength
                item.wifiSsid = c.list.filter(x=>x.HwAddress.toString().toUpperCase().replace(':', '')==item.mac.toString().toUpperCase().replace(':', ''))[0].Ssid
                item.wifiScanner = c.list.filter(x=>x.HwAddress.toString().toUpperCase().replace(':', '')==item.mac.toString().toUpperCase().replace(':', ''))[0]
                item.wifiFound = true
            } else {
                if(typeof item.wifiFound == "undefined" || item.wifiFound) c.splice(index, 1)
            }
        }
    }*/
    
    getState() {
        let state = 4
        if(this.stage != 4 && this.stage != 5) {
            switch(this.stage) {
                case 2:
                    state = 0
                case 3:
                    state = 0
                case 1:
                    state = 0
                case 0:
                    state = 4
            }
        } else if(this.wifiConnected && stage == 5) {
            state 
        } else {
            state = 1
        }
        this.emit('stateChanged', state)
    }
}

module.exports = {scan: new Scanning()}

noble.on('stateChange', function(state) {
    let scan = module.exports.scan
    if(state == "poweredOn") {
        scan.startScanning()
    } else if(state == "poweredOff") {
        scan.stopScanning()
    }
})

noble.on('discover', function(peripheral) {
    let scan = module.exports.scan
    if(!mutex && !scan.scanned.includes(peripheral.address)) {
        mutex = true
        noble.stopScanning()
        scan.scanned.push(peripheral.address)
        new Promise(function(resolve, reject) {
            switch(scan.stage) {
                case stages.scan:
                    /*peripheral.on("servicesDiscover", function(services) {
                        let i=0
                        let n=-1
                        services.forEach(e => {
                            if(e.uuid.strip("-") == scan.uuids.service) {
                                n = i
                            }
                            i++
                        })
                        console.log(services)
                        if(n!=-1) {
                            services[n].on('characteristicsDiscover', (characteristics) => scan.checkDevice(false, characteristics))
                        }
                    })*/
                    peripheral.disconnect()
                    peripheral.removeAllListeners("disconnect")
                    peripheral.connect(function(error) {
                        if(!error) {
                            peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                                scan.checkDevice(error, characteristics, function() {
                                    peripheral.removeAllListeners("connect")
                                    peripheral.removeAllListeners("discoverAllServicesAndCharacteristics")
                                    resolve()
                                }, peripheral)
                            })
                        } else {
                            peripheral.removeAllListeners("connect")
                            resolve()
                        }
                    })
                    break;
                case stages.sync:
                    if(peripheral.address.replace(/\:/g, "").trim().toString().toUpperCase() == scan.toPeripheral.trim().toString().toUpperCase()) {
                        peripheral.disconnect()
                        peripheral.removeAllListeners("disconnect")
                        peripheral.connect(function(error) {
                            if(!error || error == null) {
                                peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                                    scan.syncTime(error, characteristics, function() {
                                        peripheral.removeAllListeners("connect")
                                        peripheral.removeAllListeners("discoverAllServicesAndCharacteristics")
                                        resolve()
                                    })
                                })
                            } else {
                                peripheral.removeAllListeners("connect")
                                resolve()
                            }
                        })
                    }
                    break;
                case stages.key:
                    if(peripheral.address.replace(/\:/g, "").trim().toString().toUpperCase() == scan.toPeripheral.trim().toString().toUpperCase()) {
                        peripheral.disconnect()
                        peripheral.removeAllListeners("disconnect")
                        peripheral.connect(function(error) {
                            if(!error || error == null) {
                                peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                                    scan.getKey(error, characteristics, function() {
                                        peripheral.removeAllListeners("connect")
                                        peripheral.removeAllListeners("discoverAllServicesAndCharacteristics")
                                        resolve()
                                    }, peripheral)
                                })
                            } else {
                                peripheral.removeAllListeners("connect")
                                resolve()
                            }
                        })
                    }
                    break;
                case stages.auth:
                    if(peripheral.address.replace(/\:/g, "").trim().toString().toUpperCase() == scan.toPeripheral.trim().toString().toUpperCase()) {
                        peripheral.disconnect()
                        peripheral.removeAllListeners("disconnect")
                        peripheral.connect(function(error) {
                            if(!error || error == null) {
                                peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                                    scan.auth(error, characteristics, function() {
                                        peripheral.removeAllListeners("connect")
                                        peripheral.removeAllListeners("discoverAllServicesAndCharacteristics")
                                        resolve()
                                    }, peripheral)
                                })
                            } else {
                                peripheral.removeAllListeners("connect")
                                resolve()
                            }
                        })
                    }
                    break;
            }
            resolve()
        }).then(function(value) {
            mutex = false
            noble.startScanning()
        })
    }
})
