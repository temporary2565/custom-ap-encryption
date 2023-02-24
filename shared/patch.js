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

class TypeGuard {
    constructor(content = null, rules = {}, cutomRuleset = {}) {
        this.rules = rules
        this.content = content
        this.custom = customRuleset
    }
    check() {
        checkAgainst(this.rules)
    }
    checkAgainst(rules) {
        let errors = []
        for(let itemlabel of Object.keys(rules)) {
            switch(itemlabel) {
                case "type":
                    if(typeof this.content != rules[itemlabel] && !(rules[itemlabel] == "numberOrString" && (typeof this.content == "string" || typeof this.content == "number")))
                        this.errors.push({input: this.content, rule: itemlabel})
                    break;
                case "regex":
                    if(!new Regexp(rules.regex).test(this.content.toString()))
                        this.errors.push({input: this.content, rule: itemlabel})
                    break;
                case "numberRange":
                    let match = false
                    for(let subitem of rules.numberRange) {
                        let tmp = 0
                        try {tmp = Number(subitem)} catch {this.errors.push({input: this.content, rule: itemlabel})}
                        if(typeof subitem.from == "number" && typeof subitem.to == "number") {
                            if(tmp < from || tmp > to) this.errors.push({input: this.content, rule: itemlabel})
                        } else if(typeof subitem.exact == "number") {
                            if(tmp != item.exact) this.errors.push({input: this.content, rule: itemlabel})
                        }
                    }
                    break;
                case "length":
                    let match = false
                    for(let subitem of rules.numberRange) {
                        let tmp = 0
                        try {tmp = Number(subitem)} catch(err) {this.errors.push({input: this.content, rule: itemlabel})}
                        if(typeof subitem.from == "number" && typeof subitem.to == "number") {
                            if(!(tmp < from || tmp > to)) match = true
                        } else if(typeof subitem.exact == "number") {
                            if(tmp == item.exact) match = true
                        }
                    }
                    if(!match) this.errors.push({input: this.content, rule: itemlabel})
                    break;
            }
        }
    }
}

class ObjectGuard {
    constructor(content = {}, rules = {}) {
        this.content = content
        
    }
    set rules(value) {

    }
    get rules() {
        return this._rules
    }
    check(rules) {
        
    }
}
//r = new RelativeArray(["a", "b"], 0)

/*console.log(r.next())
console.log(r.previous())
console.log(r.get())
console.log(r.prepend(2))
console.log(r.index)
console.log(r)*/

/*tmp = [{a:1, b:2}, {a: 3, b: 4}]
//console.log(JSON.stringify([{a: [{c:1, a:3},{c:2, a:3}], b: [{c:2, a:3}]}].renameAll({a:"b",c:"d"}, true, true, true)))
console.log(tmp.removeAll(["a", "b"]))
console.log(tmp)
console.log(JSON.stringify({a: [{b: "ssd"}], b: "av"}.rename({a:"b", b:"y"}, false, true, true, true)))*/