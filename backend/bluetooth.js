const bleacon = require('bleacon')
const noble = require('noble')
const bleno = require('bleno')
let eddystoneBeacon = require('eddystone-beacon');
let eddystoneScanner = require('eddystone-beacon-scanner')

class Advertiser {
  constructor() {
    this.counter = 0
    this.beaconArr = []
    /*setInterval(() => {console.log(this.beaconArr)
      if(this.beaconArr.length > 0) {
        let beacon = this.beaconArr[this.counter % (this.beaconArr.length+1)]
bleacon.stopAdvertising()
        if(typeof beacon != 'undefined' && beacon.active) {
          if(beacon.type == 'ibeacon') {
            bleacon.startAdvertising(beacon.uuid, beacon.major, beacon.minor, -60);
          } else if(beacon.type == 'eddystone-uid') {
            eddystoneBeacon.advertiseUid(beacon.namespace, beacon.instance)
          }
          this.counter++
        }
      }
    }, 1500)*/
  }

  update() {
	let beacon = this.beaconArr[0]
	bleacon.stopAdvertising()
	if(typeof beacon != 'undefined' && beacon.active) {
	  if(beacon.type == 'ibeacon') {
	    bleacon.startAdvertising(beacon.uuid, beacon.major, beacon.minor, -60);
	  } else if(beacon.type == 'eddystone-uid') {
	    eddystoneBeacon.advertiseUid(beacon.namespace, beacon.instance)
	  }
        }
  }
}

class Scanner {
  constructor() {
    this.timeout = 10
    this.scanned = {}
    this.state = false
    this.scan = 'ibeacon'
    setInterval(() => {this.expire()}, 1000)
    setInterval(() => {this.switchScan()}, 4000)
  }

  switchScan() {
    if(this.state) {
      if(this.scan == 'ibeacon') {
        eddystoneScanner.stopScanning()
        bleacon.startScanning()
        this.scan = 'eddystone'
      } else if(this.scan == 'eddystone') {
        bleacon.stopScanning()
        eddystoneScanner.startScanning(true)
        this.scan = 'ibeacon'
      }
    }
  }

  updateEddystone(beacon, event) {
    if(event == 'found' || event == 'updated') {
      if(!Object.keys(this.scanned).includes(beacon.namespace)) {this.scanned[beacon.namespace] = {}}
      this.scanned[beacon.namespace]['timeout'] = this.timeout
      this.scanned[beacon.namespace]['protocol'] = 'eddystone-'+beacon['type']
      let properties = JSON.parse(JSON.stringify(beacon))
      // Používám JSON.parse(JSON.stringify()) kvůli podivnému chování objektu
      delete properties.namespace
      this.scanned[beacon.namespace]['properties'] = properties

      if(typeof this.scanned[beacon.namespace]['properties'].distance == 'number' && this.scanned[beacon.namespace]['properties'].distance > 0) {
        if(this.scanned[beacon.namespace]['properties'].distance <= 0.06) {
          this.scanned[beacon.namespace]['properties']['proximity'] = 'immediate'
        } else if(this.scanned[beacon.namespace]['properties'].distance <= 0.16) {
          this.scanned[beacon.namespace]['properties']['proximity'] = 'near'
        } else if(this.scanned[beacon.namespace]['properties'].distance > 0.13) {
          this.scanned[beacon.namespace]['properties']['proximity'] = 'far'
        } else {
          this.scanned[beacon.namespace]['properties']['proximity'] = 'unknown'
        }
      } else {
        this.scanned[beacon.namespace]['properties']['proximity'] = 'unknown'
      }
    }
  }

  updateBeacon(beacon) {
    if(!Object.keys(this.scanned).includes(beacon.uuid + ',' + beacon.major + ',' + beacon.minor)) {this.scanned[beacon.uuid + ',' + beacon.major + ',' + beacon.minor] = {}}
    this.scanned[beacon.uuid + ',' + beacon.major + ',' + beacon.minor]['timeout'] = this.timeout
    this.scanned[beacon.uuid + ',' + beacon.major + ',' + beacon.minor]['protocol'] = 'ibeacon'
    let properties = JSON.parse(JSON.stringify(beacon))
    // Používám JSON.parse(JSON.stringify()) kvůli podivnému chování objektu
    delete properties.uuid
    this.scanned[beacon.uuid + ',' + beacon.major + ',' + beacon.minor]['properties'] = properties
  }

  async expire() {
    Object.keys(this.scanned).forEach((item) => {
      if(parseInt(this.scanned[item]['timeout']) > 0) {
        this.scanned[item]['timeout']--
      } else {
        delete this.scanned[item]
      }
    })
  }

  available(_timeout) {
    this.timeout = _timeout || 10
    return this.scanned
  }
}

let s = new Scanner()
noble.on('stateChange', function(_state) {
  if(_state == 'poweredOn') {
    s.state = true
  } else {
    s.state = false
  }
})
eddystoneScanner.on('found', (beacon) => s.updateEddystone(beacon, 'found'))
eddystoneScanner.on('updated', (beacon) => s.updateEddystone(beacon, 'updated'))
bleacon.on('discover', (beacon) => s.updateBeacon(beacon))

let a = new Advertiser()

module.exports = {scanner: s, advertiser: a}
