const request = require('request')
const { BehaviorSubject } = require('rxjs')
const http = require("http")

class Communicator {
    constructor(syncArr, streamArr, interval, syncTime = 10) {
        this.syncArr = syncArr
        this.streamArr = streamArr
        this.beaconsSubject = new BehaviorSubject([])
        this.beaconsObs = this.beaconsSubject.asObservable()
        this.errSubject = new BehaviorSubject(null)
        this.errObs = this.errSubject.asObservable()
        this.logSubject = new BehaviorSubject(null)
        this.logObs = this.logSubject.asObservable()
        this.syncStatusArr = []
        this.failedRetBeacons = []
        this.failedSync = []
        this.retryTime = interval
        this.syncTime = syncTime
        this.retryInterval = null
        this.retryTimeout = null
        this.retrySyncInterval = null
        this.retrySyncTimeout = null
        this.data = []

        process.on("uncaughtException", function (x) { })
        //process.on("uncaughtException", function (x) { this.errSubject.next("Uncaught exception in the backend process, details: " + x.toString() + ", origin: config") }.bind(this))

        this.beaconFetchInterval = setInterval(() => this.retrieveBeacons(), 10000)
        this.syncInterval = setInterval(() => this.syncData(), this.syncTime * 1000)
    }
    retrieveBeacons() {
        this.failedRetBeacons = []
        for (let item of this.syncArr) {
            new Promise(function (resolve, reject) {
                request.get('http://' + item.address + ':' + item.port + '/emc?key=' + item.key + '&action=get-beacons&value=null'/*, function (res) {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk
                    })
                    res.on('end', function () {
                        this.logSubject.next("Retrieved beacons from " + item.address + ':' + item.port + ": " + data.toString())
                        resolve(JSON.parse(data))
                    }.bind(this))
                    res.on('error', () => { reject("download");request.abort(); })
                }.bind(this)*/).on('response', function(data) {
                    if(data.statusCode = 200) {
                        resolve(JSON.parse(data.body))
                    }
                    else reject('download')
                }.bind(this)).on('error', function(err) {
                    reject(err.toString())
                }.bind(this))
            }.bind(this)).then((result) => {
                if (typeof result.value != 'undefined' && typeof result.value[Symbol.iterator] != "undefined"){
                    this.logSubject.next("Retrieved beacons from " + item.address + ':' + item.port + ": " + data.toString())
                    this.beaconsSubject.next(result.value)
                }else {
                    this.failedRetBeacons.push({ item: item, error: "Parsing failed, bad response" })
                }
            }).catch(
                (err) => {
                    this.failedRetBeacons.push({ item: item, error: err.toString() })
                }
            )
        }

        this.retryInterval = setInterval(function () {
            for (let [index, { item, error }] of this.failedRetBeacons.entries()) {
                try {
                    new Promise(function (resolve, reject) {
                        request.get('http://' + item.address + ':' + item.port + '/emc?key=' + item.key + '&action=get-beacons&value=null'/*, function (res) {
                            let data = '';
                            res.on('data', (chunk) => {
                                data += chunk
                            })
                            res.on('end', function () { this.logSubject.next("Retrieved beacons from " + item.address + ':' + item.port + ": " + data.toString()); resolve(JSON.parse(data)) }.bind(this))
                            res.on('error', () => reject("download"))
                        }.bind(this)*/).on('response', function(data) {
                    if(data.statusCode = 200) resolve(JSON.parse(data.body))
                    else reject('download')
                }.bind(this)).on('error', function(err) {
                    reject(err.toString())
                }.bind(this))
                    }.bind(this)).then(function (result) {
                        if (typeof result.value != 'undefined' && typeof result.value[Symbol.iterator] != "undefined") {
                            this.failedRetBeacons = this.failedRetBeacons.splice(index, 1)
                            this.beaconsSubject.next(result.value)
                        }
                    }.bind(this))
                } catch (err) { }
            }
        }.bind(this), 200)
        this.retryTimeout = setTimeout(function () {
            clearInterval(this.retryInterval)
            this.retryInterval = null
            for (let item of this.failedRetBeacons) {
                if (typeof item.critical != "undefined" && item.critical) {
                    this.logSubject.next("Error retrieving beacons from " + item.address + ":" + item.port + ", reason:\n" + item.error)
                }
                this.errSubject.next("Error retrieving beacons from " + item.address + ":" + item.port + ", reason:\n" + item.error)
            }
            clearTimeout(this.retryTimeout)
            this.retryTimeout = null
        }.bind(this), this.retryTime * 1000)
    }
    syncData() {
        let tmpArr = []
        for (let item of this.data) {
            for (let subitem of item.value) {
                if (!tmpArr.map(x => x.username).includes(subitem.username))
                    tmpArr.push(subitem)
                else
                    this.errSubject.next("Database contains duplicates for " + item.username + ", from " + item.name)
            }
        }
        for (let item of this.syncArr) {
            try {
                new Promise(function (resolve, reject) {
                    request.get('http://' + item.address + ':' + item.port + '/emc?key=' + item.key + '&action=update-data&value=' + encodeURIComponent(JSON.stringify({ data: tmpArr, checksum: "NaN" })) + ''/*, function (res) {
                        let data = '';
                        res.on('data', (chunk) => {
                            data += chunk
                        })
                        res.on('end', function () {
                            this.logSubject.next("Synced with " + item.address + ':' + item.port + ": " + data.toString())
                            resolve(JSON.parse(data))
                        }.bind(this))
                        res.on('error', () => reject("download"))
                    }.bind(this)*/).on('response', function(data) {
                        if(data.statusCode < 200 || data.statusCode >= 300 ) reject('download')
                        this.logSubject.next("Synced with " + item.address + ':' + item.port + ": " + data.toString())
                        resolve(JSON.parse(data.body))
                    }.bind(this)).on('error', function(err) {
                        reject(err.toString())
                    }.bind(this))
                }.bind(this)).then((result) => {
                    if (!(typeof result.success != 'undefined' && result.success && typeof result.value[Symbol.iterator] != "undefined" && typeof result.updatedon != "undefined")) {
                        this.failedSync.push({ item: item, error: "Parsing failed, bad response" })
                    } else {
                        let updatedon = result.updatedon
                        if (this.syncStatusArr.filter(x => x.address == item.address && x.port == item.port).length == 0)
                            this.syncStatusArr.push(Object.assign({}, item, { error: false, updatedon: updatedon, seen: new Date().toUTCString() }))
                        else
                            this.syncStausArr.filter(x => x.address == item.address && x.port == item.port)[0] = Object.assign({}, this.syncStatusArr.filter(x => x.address == item.address && x.port == item.port)[0], { error: false, updatedon: updatedon, seen: new Date().toUTCString() })
                        console.log(this.syncStatusArr)
                    }
                }).catch(
                    (err) => {
                        this.failedSync.push({ item: item, error: err })
                    }
                )
            } catch (err) { }
        }
        this.retrySyncInterval = setInterval(function () {
            for (let [index, { item, error }] of this.failedSync.entries()) {
                try {
                    new Promise(function (resolve, reject) {
                        request.get('http://' + item.address + ':' + item.port + '/emc?key=' + item.key + '&action=update-data&value=' + encodeURI(JSON.stringify({ data: tmpArr, checksum: "NaN" })) + ''/*, function (res) {
                            let data = '';
                            res.on('data', (chunk) => {
                                data += chunk
                            })
                            res.on('end', function () { this.logSubject.next("Retrieved beacons from " + item.address + ':' + item.port + ": " + data.toString()); resolve(JSON.parse(data)) }.bind(this))
                            res.on('error', () => reject("download"))
                        }.bind(this)*/).on('response', function(data) {
                        if(data.statusCode != 200) reject('download')
                        this.logSubject.next("Synced with " + item.address + ':' + item.port + ": " + data.toString())
                        resolve(JSON.parse(data.body))
                    }.bind(this)).on('error', function(err) {
                        reject(err.toString())
                    }.bind(this))
                    }.bind(this)).then(function (result) {
                        if (typeof result.value != 'undefined' && typeof result.value[Symbol.iterator] != "undefined" && typeof result.updatedon != "undefined") {
                            this.failedSync = this.failedRetBeacons.splice(index, 1)
                            let updatedon = result.updatedon
                            if (this.syncStatusArr.filter(x => x.address == item.address && x.port == item.port).length == 0)
                                this.syncStatusArr.push(Object.assign({}, item, { error: false, updatedon: updatedon, seen: new Date().toUTCString() }))
                            else
                                this.syncStausArr.filter(x => x.address == item.address && x.port == item.port)[0] = Object.assign({}, this.syncStatusArr.filter(x => x.address == item.address && x.port == item.port)[0], { error: false, updatedon: updatedon, seen: new Date().toUTCString() })
                        }
                    }.bind(this))
                } catch (err) { }
            }
        }.bind(this), 200)
        this.retrySyncTimeout = setTimeout(function () {
            clearInterval(this.retrySyncInterval)
            this.retrySyncInterval = null
            for (let { item, error } of this.failedRetBeacons) {
                if (typeof item.critical != "undefined" && item.critical) {
                    this.logSubject.next("Error syncing with " + item.address + ":" + item.port + ", reason:\n" + item.error)
                }

                if (this.syncStatusArr.filter(x => x.address == item.address && x.port == item.port).length == 0)
                    this.syncStatusArr.push(Object.assign({}, item, { error: true, errmsg: error.toString() }))
                else
                    this.syncStausArr.filter(x => x.address == item.address && x.port == item.port)[0] = Object.assign({}, this.syncStatusArr.filter(x => x.address == item.address && x.port == item.port)[0], { error: true, errmsg: error.toString() })

                this.errSubject.next("Error syncing with " + item.address + ":" + item.port + ", reason:\n" + item.error)
            }
            clearTimeout(this.retrySyncTimeout)
            this.retrySyncTimeout = null
        }.bind(this), this.retryTime * 1000)
    }
}

module.exports = { Communicator }

Object.prototype.patch = function (replacement, iterators = false) {
    if (typeof this == "undefined" || this == null || typeof this != "object" || typeof this[Symbol.iterator] != "undefined") return null
    if (typeof this[Symbol.iterator] != "undefined" && iterators) {
        for (let [index, item] of Array.from(replacement).entries()) {
            if (typeof this[index] != "undefined") {
                this[index].patch(replacement[index], iterators)
            } else {
                this[index] = replacement[index]
            }
        }
    } else {
        for (let itemlabel of Object.keys(replacement)) {
            this[itemlabel] = replacement[itemlabel]
        }
    }
    return this
}

Array.prototype.patchAll = function (replacement, recursive = false) {
    if (typeof this == "undefined" || typeof this[Symbol.iterator] == "undefined" || this == null || typeof this != "object") return null
    for (let [index, item] of this.entries()) {
        for (let [subindex, subitemlabel] of Object.keys(replacement).entries()) {
            if (typeof replacement[subitemlabel] == "object" && recursive) {
                this[index][subitemlabel].patchAll(replacement[subitemlabel])
            } else {
                this[index][subitemlabel] = replacement[subitemlabel]
            }
        }
    }
    return this
}

Array.prototype.removeAll = function (toRemove, recursive = false) {
    if (typeof this == "undefined" || typeof toRemove[Symbol.iterator] == "undefined" || typeof this[Symbol.iterator] == "undefined" || this == null || typeof this != "object") return null
    Array.from(this.keys()).forEach((index) => {
        for (let subitemlabel of toRemove) {
            if (typeof subitemlabel == "object" && typeof subitemlabel != "undefined" && recursive) {
                for (let subitem3label of Object.keys(this[index]))
                    if (typeof this[index][subitem3label] != 'undefined' &&
                        typeof this[index][subitem3label][Symbol.iterator] != "undefined") this[index][subitem3label].removeAll(subitemlabel)
            } else {
                if (typeof this[index][subitemlabel] != 'undefined') delete this[index][subitemlabel]
            }
        }
    })
    return this
}

Array.prototype.renameAll = function (dictionary, overwrite = false, recursive = false, keepAcrossIterations = true, keepOld = false) {
    if (typeof this == "undefined" || typeof this[Symbol.iterator] == "undefined" || this == null || typeof this != "object") return null
    for (let [index, item] of this.entries()) {
        for (let subitemlabel of Object.keys(dictionary)) {
            if (typeof this[index][subitemlabel] != "undefined") {
                if ((typeof this[index][dictionary[subitemlabel]] == "undefined" || overwrite) && typeof dictionary[subitemlabel] != "object") {
                    this[index][dictionary[subitemlabel]] = this[index][subitemlabel]
                    if (!keepOld) delete this[index][subitemlabel]
                }
            }
        }
        if (recursive) {
            for (let subitemlabel of Object.keys(item)) {
                if (typeof item[subitemlabel] == "object" && typeof item[subitemlabel][Symbol.iterator] != "undefined") {
                    if (keepAcrossIterations) {
                        this[index][subitemlabel].renameAll(dictionary, overwrite, recursive, keepAcrossIterations, keepOld)
                    } else {
                        if (typeof dictionary[subitemlabel] == "object")
                            this[index][subitemlabel].renameAll(dictionary[subitemlabel], overwrite, recursive, keepAcrossIterations, keepOld)
                    }
                }
            }
        }
    }
    return this
}

Object.prototype.rename = function (dictionary, overwrite = false, recursive = false, iterators = false, keepAcrossIterations = true, keepOld = false) {
    if (typeof this == "undefined" || this == null || typeof this != "object" || typeof this[Symbol.iterator] != "undefined") return null
    for (let [index, itemlabel] of Object.keys(this).entries()) {
        if (Object.keys(dictionary).filter(x => typeof dictionary[x] == "string" || typeof dictionary[x] == "number").includes(itemlabel)) {
            if (!Object.keys(this).includes(dictionary[itemlabel]) || overwrite) {
                this[dictionary[itemlabel]] = this[itemlabel]
                if (!keepOld) delete this[itemlabel]
            }
        }
    }
    if (recursive) {
        for (let item of Object.keys(this)) {
            if (typeof this[item] == "object" && typeof this[item][Symbol.iterator] == "undefined") {
                if (keepAcrossIterations)
                    this[item].rename(dictionary, overwrite, recursive, iterators, keepAcrossIterations, keepOld)
                else if (typeof dictionary[item] != undefined)
                    this[item].rename(dictionary[item], overwrite, recursive, iterators, keepAcrossIterations, keepOld)
            } else if (iterators && typeof this[item] == "object" && typeof this[item][Symbol.iterator] != "undefined") {
                if (keepAcrossIterations)
                    this[item].renameAll(dictionary, overwrite, recursive, keepAcrossIterations, keepOld)
                else if (typeof dictionary[item] != "undefined")
                    this[item].renameAll(dictionary[item], overwrite, recursive, keepAcrossIterations, keepOld)
            }
        }
    }
    return this
}

class RelativeArray extends Array {
    constructor(array, index = 0) {
        super()
        Array.from(array).forEach(x => this.push(x))
        this.index = index
    }
    set index(index) {
        if (index >= 0 && index < this.length) this._index = Math.floor(index)
    }
    get index() {
        return this._index
    }
    get() {
        return this[this.index]
    }
    previous() {
        if (this.index > 0) {
            this.index--
            return true
        } else return false
    }
    next() {
        if (this.index < this.length - 1) {
            this.index++
            return true
        } else return false
    }
    revert() {
        this.reverse()
        this.index = this.length - this.index - 1
        return this
    }
    prepend(item) {
        this.splice(this.index, 0, item)
        this.index++
        return this
    }

    prependRange(item) {
        for (let subitem of item) {
            this.prepend(subitem)
        }
        return this
    }

    append(item) {
        this.index = this.splice(this.index + 1, 0, item)
        return this
    }

    appendRange(item) {
        for (let subitem of item) {
            this.append(subitem)
        }
        return this
    }
}