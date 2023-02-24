const {spawnSync} = require("child_process")
const {RetrievedTime} = require('./subclasses')
let noble = require('noble')
const interop = require('../../generator/build/Release/obj.target/module')
const {EventEmitter} = require('events')
let mutex = false
let nmready = false

const stages = Object.freeze({scan: 0, sync: 1})
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
        this.refreshTime = _refreshTime
        this.refreshInterval = null
        this.connectionTime = 30
        this.connectionTimeout = null
        this.uuids = uuids
        this.stage = stages.scan
        this.toConnect = null
        this.toPeripheral = null
        this.generatorPath = "./gen.out"

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
                if(element.uuid === uuids.time) {
                    element.read((error, data) => {
                        if(!error) {
                            let tmp
                            try {tmp = JSON.parse(data.toString("ascii"))} catch(err) {}
                            console.log(data.toString("ascii") + "here")
                            console.log(tmp)
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
        this.stage = stages.sync
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
        this.toConnect = mac
        this.toPeripheral = tmp2
        this.startConnecting()
    }
}

let scan = new Scanning()

noble.on('stateChange', function(state) {
    if(state == "poweredOn") {
        scan.startScanning()
    } else if(state == "poweredOff") {
        scan.stopScanning()
    }
})

noble.on('discover', function(peripheral) {
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
                    if(peripheral.address.replace(/\:/g, "").trim().toString() == scan.toPeripheral.trim().toString()) {
                        peripheral.disconnect()
                        peripheral.removeAllListeners("disconnect")
                        peripheral.connect(function(error) {
                            if(!error || error == null) {
                                peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                                    scan.syncTime(error, characteristics, function() {
                                        peripheral.removeAllListeners("connect")
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
            }
            resolve()
        }).then(function(value) {
            mutex = false
            noble.startScanning()
        })
    }
})