const bleno = require('bleno')
const util = require('util')
const getmac = require('getmac')
const fs = require("fs");
const { spawnSync } = require('child_process')

const encTypes = Object.freeze({open: 0, personal: 1, enterprise: 2})
const encModes = Object.freeze([0])

let timeout = null

const blenoPrimaryService = bleno.PrimaryService,
    blenoCharacteristic = bleno.Characteristic,
    blenoDescriptor = bleno.Descriptor

class Advertising {
    set ifaceUpdate(value) {
        getmac.getMac({iface: value}, function(err, mac) {
            if(!err) {
                this.mac = mac
                this.iface = value
            }
        }.bind(this));
    }
    get ifaceUpdate() {
        return this.iface
    }
    constructor(_enctype, _encmode, _beacons, _pubkey = null, _iface = 'wlan0') {
        this.ifaceUpdate = _iface
        this.uuids = {
            service: "4fd3f22b6870873b8446eb14cb9b2a49",
            pubkey: "4fd3f22b6870873b8446eb14cb9b2a4a",
            promote: "4fd3f22b6870873b8446eb14cb9b2a4b",
            time: "4fd3f22b6870873b8446eb14cb9b2a4c",
            auth: "4fd3f22b6870873b8446eb14cb9b2a4d",
            eauth: "4fd3f22b6870873b8446eb14cb9b2a4e",
            pair: "4fd3f22b6870873b8446eb14cb9b2a4f",
        }
        this.enctype = _enctype
        this.encmode = _encmode
        this.beacons = _beacons
        this.vendorPubkey = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAv/7u9bT5faCy36kYtwgM
S34EXR85fSzn42bsl++IwpLCBr0e2oNjw7x0k0nXA2/87ak+Qxi5FwRhbMM32RJF
wMGeN51wadNlkL3C/Xc13h20YM5oY7rs1ohTXRwzPD1c58t8PxYSJh3xSNdGUQ6Q
jkVGtZProbP0ZwtioWo63fdlki+lVuwv3c6TD5v/7Mz63mHLrbJt9xLZ6crQ35p0
i7bK1NFVoVSbKpigxVpiIZngdFnup8lLy+dbDB9oxbVJ6psSbuUlag9d66y1vSzt
rPPiDMDb+tRTYP0A2yq05r23f8Q/RjmNLyy8pg9Hqj8I3IEn1gEZ4AxI6KYk17yC
6puYEg6LPqrXs5fcEhTRb0Woz5h3040ltYk9w44Cb+IlMMaHa3Ok76jCnOfMz04e
xIoB54lrVtZYTnlqjxk9qgqqenFC+HMZcoScjWvOdr5gIwgdaPpMWUW5rhAHzuCz
iEuP8GZtQeqIEGGit+5aa1GCTCJToFUxFtj5onWS8vbeiKIuzL4ZJCdZJ0jPubEW
f0Zbg1NZ6CYJAq15lLAEzc84DJMrvtPuEh9EeIExrTd1pURpVSh01TVMBNlUs8Ut
EMsxSDdH7ViIImK5Pp/NbvzGjlCEgLhUQgMG3wxOWPo4+1hwpjRqCEffog4t5iZA
/BfQLVJymKLPycJFBmisIYcCAwEAAQ==
-----END PUBLIC KEY-----`
        this.stationPubkey = _pubkey
        if(this.stationPubkey.length < 2) {
            this.loadPubkey()
        }
        this.generatorPath = "./gen.out"
        this.forgedTime = {}
        this.forgeTimeInterval = setInterval(function() {
            let tmp = this.forgeTime()
            this.forgedTime = tmp != null ? tmp : {}
        }.bind(this), 500)
    }

    loadPubkey() {
        let key
        try {
            key = fs.readFileSync("./pub.pem", {encoding: "utf8"})
        } catch(err) {}
        this.stationPubkey = key
    }

    parsePair(input) {
        let tmp
        let tmpjson
        try {
            tmp = spawnSync(this.generatorPath ,["pair_parse", "999999999"], {stdio:'pipe', encoding:'utf-8'}).output
            tmpjson = JSON.parse(tmp[1])
        } finally {
            if(typeof tmpjson.value == "undefined") return null
            return tmpjson.value.error ? null : {hash: tmpjson.value.hash}
        }
    }

    forgePromote() {
        return JSON.stringify({mac: this.mac, enctype: this.enctype, encmode: this.encmode, beacons: this.beacons})
    }
    forgePubkey() {
        return this.pubkey
    }
    forgeTime() {
        let tmp
        let tmpjson
        try {
            tmp = spawnSync(this.generatorPath ,["time_gen", "999999999"], {stdio:'pipe', encoding:'utf-8'}).output
            tmpjson = JSON.parse(tmp[1])
            console.log(tmpjson)
            if(typeof tmpjson == "undefined" || typeof tmpjson.value == "undefined") return null
            return tmpjson.value.error ? null : {hash: tmpjson.value.hash}
        } catch(err) {}
        return null
    }
    forgeAuth() {
    }
    parseAuth(value) {
        if(value) {}
    }
    forgeEAuth() {

    }
}

let advertiser = new Advertising(encTypes.open, encModes[0], [], "", "wlp2s0")

let promoteCharacteristic = function () {
    promoteCharacteristic.super_.call(this, {
        uuid: advertiser.uuids.promote,
        properties: ['read']
    })
}
util.inherits(promoteCharacteristic, blenoCharacteristic)

promoteCharacteristic.prototype.onReadRequest = function (offset, callback) {
    let result = this.RESULT_SUCCESS
    let tmp = advertiser.forgePromote()

    let data = new Buffer(tmp)

    if (offset > data.length) {
        result = this.INVALID_RESULT_OFFSET
        data = null
    } else {
        data = data.slice(offset)
    }

    callback(result, data)
}

let timeCharacteristic = function () {
    timeCharacteristic.super_.call(this, {
        uuid: advertiser.uuids.time,
        properties: ['read'],
    })
}
util.inherits(timeCharacteristic, blenoCharacteristic)

timeCharacteristic.prototype.onReadRequest = function (offset, callback) {
    let result = this.RESULT_SUCCESS
    let tmp = JSON.stringify(advertiser.forgedTime)

    let data = new Buffer(tmp)

    if (offset > data.length) {
        result = this.INVALID_RESULT_OFFSET
        data = null
    } else {
        data = data.slice(offset)
    }

    callback(result, data)
}

let pubkeyCharacteristic = function () {
    pubkeyCharacteristic.super_.call(this, {
        uuid: advertiser.uuids.pubkey,
        properties: ['read'],
    })
}
util.inherits(pubkeyCharacteristic, blenoCharacteristic)

pubkeyCharacteristic.prototype.onReadRequest = function(offset, callback) {
    let result = this.RESULT_SUCCESS

    let data = new Buffer(advertiser.stationPubkey)
console.log(advertiser.stationPubkey)
    if (offset > data.length) {
        result = this.INVALID_RESULT_OFFSET
        data = null
    } else {
        data = data.slice(offset)
    }

    callback(result, data)
}

let pairCharacteristic = function () {
    pairCharacteristic.super_.call(this, {
        uuid: advertiser.uuids.pair,
        properties: ['write', 'writeWithoutResponse', 'read'],
    })
}
util.inherits(pairCharacteristic, blenoCharacteristic)

pairCharacteristic.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
    
    callback(this.RESULT_SUCCESS)
}

function btService() {
    btService.super_.call(this, {
        uuid: advertiser.uuids.service,
        characteristics: [
            new promoteCharacteristic(),
            new timeCharacteristic(),
            new pubkeyCharacteristic(),
            new pairCharacteristic(),
        ]
    })
}
util.inherits(btService, blenoPrimaryService)

bleno.on('advertisingStart', function(error) {
    if(!error) {
        bleno.setServices([
            new btService()
        ])
    }
})

bleno.on('accept', function(clientAddress) {
    timeout = setTimeout(function() {
        bleno.startAdvertising(advertiser.mac, advertiser.uuids.service)
    }, 7000)
    bleno.updateRssi()
})

bleno.on('disconnect', function(clientAddress) {
    bleno.updateRssi()
    //clearTimeout(timeout)
    //timeout = null
    bleno.startAdvertising(advertiser.mac, advertiser.uuids.service)
})

bleno.on('advertisingStop', function() {
    if(timeout==null) {
        timeout = setTimeout(function() {
            bleno.startAdvertising(advertiser.mac, advertiser.uuids.service)
        }, 7000)
    }
})

bleno.on('stateChange', function(state) {
    if (state === 'poweredOn') {
        bleno.startAdvertising(advertiser.mac, advertiser.uuids.service)
    } else {
        bleno.stopAdvertising()
    }
})