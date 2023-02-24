const _ = require('lodash')
const fs = require('fs')

class PreferencesParser {
    constructor(preferences) {
        this.input = preferences
        this.output = {}
        this.error = false
        this.reason = ""
        this.sanitization = Object.freeze({
            sync: {
                syncArr: {
                    type: "array",
                    construct: {
                        key: {
                            type: "lengthString",
                            exactLength: 64
                        },
                        address: {
                            type: "addressString"
                        },
                        port: {
                            type: "rangeNumber",
                            from: 1,
                            to: 65534
                        },
                        critical: {
                            type: "boolean"
                        }
                    }
                },
                internal: {
                    type: "object",
                    children: {
                        internalKey: {
                            type: "boolean"
                        },
                        internalAddress: {
                            type: "addressString"
                        },
                        internalPort: {
                            type: "rangeNumber",
                            from: 1,
                            to: 65534
                        },
                        internalPath: {
                            type: "pathString"
                        },
                        internalCritical: {
                            type: "boolean"
                        }
                    }
                },
                notification: {
                    type: "object",
                    children: {
                        interval: {
                            type: "rangeNumber",
                            from: 1,
                            to: 2040
                        },
                        enable: {
                            type: "boolean"
                        },
                        type: {
                            type: "enum",
                            members: ["rss"],
                        },
                        rssendpoint: {
                            type: "rangeLengthString",
                            from: 1,
                            to: 32
                        }
                    }
                }
            },
            stream: {
                streamArr: {
                    type: "array",
                    construct: {
                        address: {
                            type: "addressString",
                        },
                        port: {
                            type: "rangeNumber",
                            from: 1,
                            to: 65534
                        },
                        key: {
                            type: "lengthString",
                            exactLength: 64
                        }
                    },
                },
                enable: {
                    type: "boolean"
                }
            },
            configuration: {
                port: {
                    type: "rangeNumber",
                    from: 1,
                    to: 65534
                },
                maxSessions: {
                    type: "rangeNumber",
                    from: 1,
                    to: 4294967294
                },
                users: {
                    type: "array",
                    construct: {
                        name: {
                            type: "regexString",
                            rule: /^[a-zA-Z0-9]{3,24}$/
                        },
                        password: {
                            type: "regexString",
                            rule: /^.{6,128}$/
                        },
                        access: {
                            type: "stringArray",
                            options: ["enclave-accounts", "global-accounts"]
                        }
                    }
                }
            }
        })
    }

    parseInput() {
        console.log(JSON.stringify(this.input))
        for(let item of Object.keys(this.sanitization)) {
            if(Object.keys(this.input).includes(item)) {
                if(_.difference(Object.keys(this.sanitization[item]), Object.keys(this.input[item])).length == 0) {
                    for(let subitem of Object.keys(this.sanitization[item])) {
                        if(typeof this.input[item] == "object" && typeof this.input[item][subitem] != "undefined") {
                            let tmp2 = PreferencesParser.sanitize(this.sanitization[item][subitem], this.input[item][subitem])
                            if(!tmp2.valid) {
                                this.error = true
                                if(typeof tmp2.reason == "string") this.reason = tmp2.reason
                                return
                            }
                        } else {
                            this.error = true
                            return
                        }
                    }
                } else {
                    this.error = true
                    return
                }
            } else {
                this.error = true
                return
            }
        }
        this.output = this.input
    }

    static sanitize(rule, input) {
        let valid = true
        let reason = null
        if(typeof rule.type != "undefined") {
            switch(rule.type) {
                case "lengthString":
                    console.log(input.toString().length)
                    if(typeof input != "string" || input.toString().length != rule.exactLength) {
                        valid = false
                    }
                    break;
                case "rangeLengthString":
                    if(typeof input != "string" || input.toString().length > rule.to || input.toString().length < rule.from) {
                        valid = false
                    }
                    break;
                case "addressString":
                    if(typeof input != "string" || input.toString().length < 1 || input.toString().length > 1024) {
                        valid = false
                    }
                    break;
                case "rangeNumber":
                    if(typeof input != "number" || input < rule.from || input > rule.to) {
                        valid = false
                    }
                    break;
                case "boolean":
                    if(typeof input != "boolean") {
                        valid = false
                    }
                    break;
                case "pathString":
                    if(input != "" && (typeof input != "string" || !fs.existsSync(input))) {
                        if(!fs.existsSync(input)) reason = "Nepodařilo se najít zadanou cestu"
                        valid = false
                    }
                    break;
                case "enum":
                    if(!rule.members.includes(input)) {
                        valid = false
                    }
                case "regexString":
                    if(typeof input != "string" ||
                        !(new RegExp(rule.rule).test(input))) {
                        valid = false
                    }
                    break;
                case "stringArray":
                    if(typeof input != "object" || typeof input[Symbol.iterator] == "undefined") valid = false
                    else {
                        if(_.differenceWith(input, rule.options, (x, y) => y.includes(x)).length > 0) {
                            valid = false
                        }
                    }
                    break;
                case "array":
                    console.log(input)
                    if(valid) {
                        if(typeof input != "object" || typeof input[Symbol.iterator] == "undefined") valid = false
                        else if(input.length > 0) for(let item of input) {
                            if(_.difference(Object.keys(item), Object.keys(rule.construct)).length != 0) valid = false
                            if(valid) {
                                for(let subitem of Object.keys(rule.construct)) {
                                    if(!PreferencesParser.sanitize(rule.construct[subitem], item[subitem])) {
                                        valid = false
                                    }
                                }
                            }
                        }
                    }
                    break;
                case "object":
                    if(valid) {
                        if(typeof input != "object" ||
                            _.difference(Object.keys(input), Object.keys(rule.children)).length != 0) valid = false
                        for(let item of Object.keys(rule.children)) {
                            if(valid && !PreferencesParser.sanitize(rule.children[item], input[item])) {
                                valid = false
                            }
                        }
                    }
                    break;
                default:
                    valid = false
                    break;
            }
        }
        return { valid: valid, reason: reason }
    }

    updateConfig(input) {
        console.log(JSON.stringify(this.output))
        let config = Object.assign({}, input)
        config['api-connection']['sync']['nodes'] = this.output.sync.syncArr
        config['api-connection']['internal-session'] = this.output.sync.internal.internalKey
        config['api-connection']['internal-address'] = this.output.sync.internal.internalAddress
        config['api-connection']['internal-port'] = this.output.sync.internal.internalPort
        config['api-connection']['session-file'] = this.output.sync.internal.internalPath
        config['api-connection']['internal-notify'] = this.output.sync.internal.internalCritical

        config['api-connection']['sync']['notification-interval'] = this.output.sync.notification.interval
        config['api-connection']['sync']['notify'] = this.output.sync.notification.enable
        config['api-connection']['sync']['notification-type'] = this.output.sync.notification.type == "rss" ? 0 : 0
        config['api-connection']['sync']['notification-rss-path'] = this.output.sync.notification.rssendpoint

        config['api-connection']['stream']['enable'] = this.output.stream.enable
        config['api-connection']['stream']['allowed'] = this.output.stream.streamArr

        config['management']['port'] = this.output.configuration.port
        config['management']['max-sessions'] = this.output.configuration.maxSessions
        config['management']['users'] = this.output.configuration.users
        return config
    }

    parseConfig(config) {
        return {
            sync: {
                syncArr: config['api-connection']['sync']['nodes'],
                internal: {
                    internalKey: config['api-connection']['internal-session'],
                    internalAddress: config['api-connection']['internal-address'],
                    internalPort: Number(config['api-connection']['internal-port']),
                    internalPath: config['api-connection']['session-file'],
                    internalCritical: config['api-connection']['internal-notify']
                },
                notification: {
                    interval: config['api-connection']['sync']['notification-interval'],
                    enable: config['api-connection']['sync']['notify'],
                    type: config['api-connection']['sync']['notification-type'] == "rss" ? "rss" : "rss",
                    rssendpoint: config['api-connection']['sync']['notification-rss-path']
                }
            },
            stream: {
                enable: config['api-connection']['stream']['enable'],
                streamArr: config['api-connection']['stream']['allowed']
            },
            configuration: {
                port: Number(config['management']['port']),
                maxSessions: config['management']['max-sessions'],
                users: config['management']['users']
            }
        }
    }
}

module.exports = {PreferencesParser}