const util = require('util')
const bleno = require('bleno')

let blenoPrimaryService = bleno.PrimaryService
let blenoCharacteristic = bleno.Characteristic
let blenoDescriptor = bleno.Descriptor

console.log('bleno initialized')

let staticReadOnlyCharacteristic = function () {
    staticReadOnlyCharacteristic.super_.call(this, {
        uuid: 'fffffffffffffffffffffffffffffff0',
        properties: ['read'],
        value: new Buffer('value'),
        descriptors: [
            new blenoDescriptor({
                uuid: '2901',
                value: 'user description',
            }),
        ],
    })
}
util.inherits(staticReadOnlyCharacteristic, blenoCharacteristic)

let dynamicReadOnlyCharacteristic = function () {
    dynamicReadOnlyCharacteristic.super_.call(this, {
        uuid: 'fffffffffffffffffffffffffffffff1',
        properties: ['read'],
    })
}
util.inherits(dynamicReadOnlyCharacteristic, blenoCharacteristic)

dynamicReadOnlyCharacteristic.prototype.onReadRequest = function (offset, callback) {
    let result = this.RESULT_SUCCESS
    let data = new Buffer('dynamic value')

    if (offset > data.length) {
        result = this.INVALID_RESULT_OFFSET
        data = null
    } else {
        data = data.slice(offset)
    }

    callback(result, data)
}

let longDynamicCharacteristic = function () {
    longDynamicCharacteristic.super_.call(this, {
        uuid: 'fffffffffffffffffffffffffffffff2',
        properties: ['read']
    })
}
util.inherits(longDynamicCharacteristic, blenoCharacteristic)

longDynamicCharacteristic.prototype.onReadRequest = function (offset, callback) {
    let result = this.RESULT_SUCCESS
    let data = new Buffer(512)

    for (let i = 0; i < data.length; i++) {
        data[i] = i % 256
    }

    if (offset > data.length) {
        result = this.INVALID_RESULT_OFFSET
        data = null
    } else {
        data = data.slice(offset)
    }

    callback(result, data)
}

let writeOnlyCharacteristic = function () {
    writeOnlyCharacteristic.super_.call(this, {
        uuid: 'fffffffffffffffffffffffffffffff3',
        properties: ['write', 'writeWithoutResponse'],
    })
}
util.inherits(writeOnlyCharacteristic, blenoCharacteristic)

writeOnlyCharacteristic.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
    console.log("Write only characteristic: " + data.toString('ascii') + ' ' + offset + ' ' + withoutResponse)
    callback(this.RESULT_SUCCESS)
}

let notifyOnlyCharacteristic = function () {
    notifyOnlyCharacteristic.super_.call(this, {
        uuid: 'fffffffffffffffffffffffffffffff4',
        properties: ['notify'],
    })
}
util.inherits(notifyOnlyCharacteristic, blenoCharacteristic)

notifyOnlyCharacteristic.prototype.onSubscribe = function (maxValueSize, updateValueCallback) {
    console.log('notifyOnlyCharacteristic subscribed')

    this.counter = 0
    this.changeInterval = setInterval(function () {
        let data = new Buffer(4)
        data.writeUInt32LE(this.counter, 0)
        this.counter++
        updateValueCallback(data)
    }.bind(this), 5000)
}

notifyOnlyCharacteristic.prototype.onUnsubscribe = function () {
    console.log('notifyOnlyCharacteristic unsubscribed')

    if (this.changeInterval) {
        clearInterval(this.changeInterval)
        this.changeInterval = null
    }
}

notifyOnlyCharacteristic.prototype.onNotify = function () {
    console.log('notified')
}

let indicateOnlyCharacteristic = function (maxValueSize, updateValueCallback) {
    indicateOnlyCharacteristic.super_.call(this, {
        uuid: 'fffffffffffffffffffffffffffffff5',
        properties: ['indicate'],
    })
}
util.inherits(indicateOnlyCharacteristic, blenoCharacteristic)

indicateOnlyCharacteristic.onSubscribe = function () {
    this.counter = 0
    console.log('indicateOnlyCharacteristic subscribed')
    this.changeInterval = setInterval(function () {
        let data = new Buffer(4)
        data.writeUInt32LE(this.counter, 0)
        this.counter++
    }.bind(this), 1000)
}

indicateOnlyCharacteristic.onUnsubscribe = function() {
    console.log('indicateOnlyCharacteristic unsubscribed')
    if(this.changeInterval) {
        clearInterval(this.changeInterval)
        this.changeInterval = null
    }
}

indicateOnlyCharacteristic.prototype.onIndicate = function() {
    console.log("indicateOnlyCharacteristic onIndicate event fired")
}

function sampleService() {
    sampleService.super_.call(this, {
        uuid: 'ffffffffffffffffffffffffffffffe0',
        characteristics: [
            new staticReadOnlyCharacteristic(),
            new dynamicReadOnlyCharacteristic(),
            new longDynamicCharacteristic(),
            new writeOnlyCharacteristic(),
            new notifyOnlyCharacteristic(),
            new indicateOnlyCharacteristic()
        ]
    })
}
util.inherits(sampleService, blenoPrimaryService)

// Protocol initialization
bleno.on('advertisingStart', function(error) {
    if(!error) {
        bleno.setServices([
            new sampleService()
        ])
    }
})
// Linux only events
bleno.on('mtuChange', function(mtu) {
    console.log('on -> mtuChange: ' + mtu)
})

bleno.on('advertisingStart', function(error) {
    if(!error) {
        bleno.setServices([
            new sampleService()
        ])
    }
})

bleno.on('advertisingStop', function() {
    console.log('on -> advertisingStop')
})

bleno.on('servicesSet', function(error) {
    console.log('on -> serviceSet: ' + error)
})