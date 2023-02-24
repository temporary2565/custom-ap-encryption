const cr2 = require("crypto-js")

class EMCCommunicator {
    constructor(internalKey, keys, data) {
        this.keys = keys
        this.internalKey = internalKey
        this.data = data
    }

    isAuthenticated(key) {
        if(key == this.internalKey) return true
        if(this.keys.map(x=>x.toString().trim()).includes(key.toString().trim())) return true
        return false
    }

    verifyKey(key) {
        if(this.isAuthenticated(key)) {
            return {authenticated: true, success: true}
        } else {
            return {authenticated: false}
        }
    }

    canOpenStream(key) {
        return this.isAuthenticated(key)
    }

    getBeacons(key, scanned, advertised) {
        console.log(["getBeacons",key])
        if(!this.isAuthenticated(key)) return {authenticated: false}
        let beacons = []
        for(let item of advertised) {
            if(item.active) {
                if(item.type == "ibeacon") {
                    let { uuid, major, minor, type} = item
                    beacons.push({uuid, major, minor, type, advertised: true})
                } else if(item.type == "eddystone-uid") {
                    let {uuid, namespace, type} = item
                    beacons.push({namespace, uuid, type, advertised: true})
                }
            }
        }
        for(let item of scanned) {
            if(item.type == "ibeacon") {
                let {uuid, major, minor, type} = item
                beacons.push({uuid, major, minor, advertised: false})
            } else if(item.type == "eddystone-uid") {
                let {uuid, namespace, type} = item
                beacons.push({namespace, uuid, type, advertised: false})
            }
        }
        return {authenticated: true, success: true, value: beacons}
    }

    updateData(key, value) {
        console.log(["updateData",key,value])
        let when = new Date().toUTCString()
        if(!this.isAuthenticated(key) || typeof value.data == "undefined") return {authenticated: false}
        else return {response: {authenticated: true, success: true, uptodate: false, updatedon: when}, data: Object.assign({}, {data: value.data, checksum: value.checksum, updatedOn: when})}
    }
}

class EMCStreamer {
    constructor() {
        this.streams = []
    }
    updateStream(address, port) {

    }
}

module.exports = {EMCCommunicator, EMCStreamer}

Object.prototype.patch = function(replacement, iterators = false) {
    if(typeof this == "undefined" || this == null || typeof this != "object"  || typeof this[Symbol.iterator] != "undefined") return null
    if(typeof this[Symbol.iterator] != "undefined" && iterators) {
        for(let [index, item] of Array.from(replacement).entries()) {
            if(typeof this[index] != "undefined") {
                this[index].patch(replacement[index], iterators)
            } else {
                this[index] = replacement[index]
            }
        }
    } else {
        for(let itemlabel of Object.keys(replacement)) {
            this[itemlabel] = replacement[itemlabel]
        }
    }
    return this
}

Array.prototype.patchAll = function(replacement, recursive = false) {
    if(typeof this == "undefined" || typeof this[Symbol.iterator] == "undefined" || this == null || typeof this != "object") return null
    for(let [index, item] of this.entries()) {
        for(let [subindex, subitemlabel] of Object.keys(replacement).entries()) {
            if(typeof replacement[subitemlabel] == "object" && recursive) {
                this[index][subitemlabel].patchAll(replacement[subitemlabel])
            } else {
                this[index][subitemlabel] = replacement[subitemlabel]
            }
        }
    }
    return this
}

Array.prototype.removeAll = function(toRemove, recursive = false) {
    if(typeof this == "undefined" || typeof toRemove[Symbol.iterator] == "undefined" || typeof this[Symbol.iterator] == "undefined" || this == null || typeof this != "object") return null
    Array.from(this.keys()).forEach((index) => {
        for(let subitemlabel of toRemove) {
            if(typeof subitemlabel == "object" && typeof subitemlabel != "undefined" && recursive) {
                for(let subitem3label of Object.keys(this[index]))
                    if(typeof this[index][subitem3label] != 'undefined' &&
                    typeof this[index][subitem3label][Symbol.iterator] != "undefined") this[index][subitem3label].removeAll(subitemlabel)
            } else {
                if(typeof this[index][subitemlabel] != 'undefined') delete this[index][subitemlabel]
            }
        }
    })
    return this
}

Array.prototype.renameAll = function(dictionary, overwrite=false, recursive = false, keepAcrossIterations = true, keepOld = false) {
    if(typeof this == "undefined" || typeof this[Symbol.iterator] == "undefined" || this == null || typeof this != "object") return null
    for(let [index, item] of this.entries()) {
        for(let subitemlabel of Object.keys(dictionary)) {
            if(typeof this[index][subitemlabel] != "undefined") {
                console.log(dictionary)
                if((typeof this[index][dictionary[subitemlabel]] == "undefined" || overwrite) && typeof dictionary[subitemlabel] != "object") {
                    this[index][dictionary[subitemlabel]] = this[index][subitemlabel]
                    if(!keepOld) delete this[index][subitemlabel]
                }
            }
        }
        if(recursive) {
            for(let subitemlabel of Object.keys(item)) {
                if(typeof item[subitemlabel] == "object" && typeof item[subitemlabel][Symbol.iterator] != "undefined") {
                    if(keepAcrossIterations) {
                        this[index][subitemlabel].renameAll(dictionary, overwrite, recursive, keepAcrossIterations, keepOld)
                    } else {
                        if(typeof dictionary[subitemlabel] == "object")
                            this[index][subitemlabel].renameAll(dictionary[subitemlabel], overwrite, recursive, keepAcrossIterations, keepOld)
                    }
                }
            }
        }
    }
    return this
}

Object.prototype.rename = function(dictionary, overwrite = false, recursive = false, iterators = false, keepAcrossIterations = true, keepOld = false) {
    if(typeof this == "undefined" || this == null || typeof this != "object" || typeof this[Symbol.iterator] != "undefined") return null
    for(let [index, itemlabel] of Object.keys(this).entries()) {
        if(Object.keys(dictionary).filter(x => typeof dictionary[x] == "string" || typeof dictionary[x] == "number").includes(itemlabel)) {
            if(!Object.keys(this).includes(dictionary[itemlabel]) || overwrite){
                this[dictionary[itemlabel]] = this[itemlabel]
                if(!keepOld) delete this[itemlabel]
            }
        }
    }
    if(recursive) {
        for(let item of Object.keys(this)) {
            if(typeof this[item] == "object" && typeof this[item][Symbol.iterator] == "undefined") {
                if(keepAcrossIterations)
                    this[item].rename(dictionary, overwrite, recursive, iterators, keepAcrossIterations, keepOld)
                else if(typeof dictionary[item] != undefined)
                    this[item].rename(dictionary[item], overwrite, recursive, iterators, keepAcrossIterations, keepOld)
            } else if(iterators && typeof this[item] == "object" && typeof this[item][Symbol.iterator] != "undefined") {
                console.log("here")
                if(keepAcrossIterations)
                    this[item].renameAll(dictionary, overwrite, recursive, keepAcrossIterations, keepOld)
                else if(typeof dictionary[item] != "undefined")
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
        if(index >= 0 && index < this.length)this._index = Math.floor(index)
    }
    get index() {
        return this._index
    }
    get() {
        return this[this.index]
    }
    previous() {
        if(this.index > 0) {
            this.index--
            return true
        } else return false
    }
    next() {
        if(this.index < this.length - 1) {
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
        for(let subitem of item) {
            this.prepend(subitem)
        }
        return this
    }

    append(item) {
        this.index = this.splice(this.index+1, 0, item)
        return this
    }

    appendRange(item) {
        for(let subitem of item) {
            this.append(subitem)
        }
        return this
    }
}