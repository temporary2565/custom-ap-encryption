let ed = require('eddystone-beacon-scanner')
let ib = require('bleacon')

class BeaconScanner {
    constructor() {
    }

    start(_time, _cb = (a) => {}) {
        this.beacons = []
        this.time = _time
        this.callback = (a) => {}
        this.stateEnum = Object.freeze({none: 0, ib: 1, ed:2, done: 3})
        this.state = 0
        this.switchState()
        this.interval = setInterval(function() {
            this.switchState()
        }.bind(this), this.time/2)
    }
    
    get done() {
        return this.state == 4
    }

    switchState() {
        this.state++
        if(this.state == this.stateEnum.ib) {
            ib.startScanning()
        }
        if(this.state == this.stateEnum.ed) {
            ib.stopScanning()
            ed.startScanning()
        }
        if(this.state == this.stateEnum.done) {
            ed.stopScanning()
            clearInterval(this.interval)
            this.interval = null
            this.callback(this.beacons)
        }
    }
}

ed.on('found', function(beacon, event) {
    let bscanner = module.exports.bscanner
    if(!bscanner.beacons.map(x=>x.data).includes(`${beacon.namespace},${beacon.instance}`))
    bscanner.beacons.push({
        type: `eddystone-${beacon['type']}`,
        data: `${beacon.namespace},${beacon.instance}`
    })
})

ib.on('discover', (beacon) => {
    let bscanner = module.exports.bscanner
    if(!bscanner.beacons.map(x=>x.data).includes(`${beacon.uuid},${beacon.major},${beacon.minor}`))
    bscanner.beacons.push({
        type: `ibeacon`,
        data: `${beacon.uuid},${beacon.major},${beacon.minor}`
    })
})


module.exports = { bscanner: new BeaconScanner }