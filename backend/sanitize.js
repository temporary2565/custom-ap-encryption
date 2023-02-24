const nm = require('netmask').Netmask
const cr = require('crypto')

// Skript obsahující funkce pro sanitizaci formulářů, validace není zatím implementována (a nevím zda bude potřeba)

let types = {
"login": {
"username": '/^[a-z]{3,16}$/i',
"password": '/^([a-z]|\d){4,32}$/i'
},
"wan": {
"wan-role": '/^(nat|bridge)$/',
"wan-type": '/^(dhcp|static)$/',
"wan-ip": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/',
"wan-gateway": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/',
"wan-subnet": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\d{1,3}$/',
"wan-dns": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/',
},
"lan":{
"lan-ip": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/',
"lan-gateway": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/',
"lan-subnet": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/',
"lan-dhcp-state": "boolean",
"lan-dhcp-timeout": '/^\\d{1,4}$/',
"lan-dhcp-range0": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/',
"lan-dhcp-range1": '/^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/'
},
"wifi": {
"wifi-ssid": '/^[\\da-z\\s]{1,16}$/i',
"wifi-hide": "boolean",
"wifi-hwmode": '/^[ng]$/',
"wifi-channel": '/^(((1[01])|\\d)|auto)$/',
"wifi-channel-width": '/^(20|40)$/',
"wifi-encryption": '/^(wpa2psk|proj\\-open|proj\\-open\\-pair|proj\\-personal|proj\\-enterprise|open)$/',
"wifi-wpa-key": '/^[\\da-z]{8,64}$/i',
"wifi-proj-key": '/^[\\da-z]{8,64}$/i',
"wifi-proj-server": '/[a-z\\d\\._\\/\\+\\%]+\\:\\d{1,5}/i',
"wifi-wpa-rotation": '/^\\d{1,5}$/',
"wifi-proj-rotation": '/^\\d{1,5}$/',
"wifi-wmm": "boolean"
},
"firewall_simple": {
"firewall_simple-enabled": "boolean",
"firewall_simple-dos": "boolean",
"firewall_simple-ping": "boolean",
"firewall_simple-webservice": '/^(both|lan)$/',
"firewall_simple-ssh": '/^(both|lan|none)$/'
}}

// Ověří zda je vstup platný
const match = function(_rgx, _resp, reject, _toreturn) {
    let toreturn = _toreturn || _resp
    let rgx = new RegExp(_rgx.split('/')[1], _rgx.split('/')[2])
    return (_rgx != "boolean") ? ((rgx.test(_resp)) ? toreturn : reject) : ((_resp == "on") ? true : false)
}

// Ověří zda je vstup ve tvaru pole platný
const matchArr = function(_rgx, resp) {
    let newArr= [];
    let rgxa = new RegExp(_rgx.split('/')[1], _rgx.split('/')[2])
    for(let i = 0;i<3;i++) {
        if(!(typeof resp[i] == ('undefined' || 'null'))) {
            newArr.push((rgxa != "boolean") ? ((rgxa.test(resp[i])) ? resp[i] : null) : ((resp[i] == "on") ? true : false))
        }
    }
    let rgx = new RegExp(_rgx.split('/')[1], _rgx.split('/')[2])
    return newArr
}

// Ověří, zda je možné vytvořit zadanou síť
const checkNetwork = function(ip, _gateway, subnet) {
  if(!((typeof ip || typeof _gateway || typeof subnet) == ('undefined' || 'null'))) {
    let gateway = (_gateway == '0.0.0.0') ? ip : _gateway
    let block = new nm(gateway, subnet)
    return block.contains(ip) && block.contains(gateway) && ip != _gateway;
  }
}

// Funkce, která vrátí novou a ověřenou konfiguraci
module.exports.conf = function(config, _response) {
    response = _response || { "subcategory":"none" }
    let newConfig = config
    let dnsArr = []
    if(!(typeof response == ('null' || 'undefined'))) {
        switch(response['subcategory']) {
            case "wifi":
                for(let l of ['ssid', 'hide', 'channel', 'encryption', 'wpa-key', 'proj-key', 'wpa-rotation', 'proj-rotation', 'proj-server']) {
                    // Nastavení a ověření všech hodnot
                    newConfig['wifi']['wifi-' + l] = match(types['wifi']['wifi-' + l], response['wifi-' + l], config['wifi']['wifi-' + l])
                }
                break
            case "wifi-advanced":
                for(let l of ['hwmode', 'channel-width', 'wmm']) {
                    // Nastavení a ověření všech hodnot
                    newConfig['wifi']['wifi-' + l] = match(types['wifi']['wifi-' + l], response['wifi-' + l], config['wifi']['wifi-' + l])
                }
                break
            case "firewall_simple":
                for(let l of ['enabled', 'dos', 'ping', 'webservice', 'ssh']) {
                    // Nastavení a o    věření všech hodnot
                    newConfig['firewall_simple']['firewall_simple-' + l] = match(types['firewall_simple']['firewall_simple-' + l], response['firewall_simple-' + l], config['firewall_simple']['firewall_simple-' + l])
                }
                break
            case "lan":
                if(config['wan']['wan-role'] == 'nat' && checkNetwork(response['lan-ip'], response['lan-gateway'], response['lan-subnet'])) {
                    for(let l of ['ip', 'subnet', 'gateway', 'dhcp-state', 'dhcp-timeout', 'dhcp-range0', 'dhcp-range1']) {
                        // Nastavení a ověření všech hodnot
                        newConfig['lan']['lan-' + l] = match(types['lan']['lan-' + l], response['lan-' + l], config['lan']['lan-' + l])
                    }
                }
                break
            case "wan":
              if(checkNetwork(response['wan-ip'], response['wan-gateway'], response['wan-subnet'])) {
                      for(let l of ['ip', 'subnet', 'gateway', 'role', 'type']) {
                          // Nastavení a ověření všech hodnot
                          newConfig['wan']['wan-' + l] = match(types['wan']['wan-' + l], response['wan-' + l], config['wan']['wan-' + l])
                      }
                  for(let i=0;i<3;i++) {
                      if(typeof response['wan-dns-' + i] != 'undefined') {
                          dnsArr.push(response['wan-dns-' + i])
                      }
                  }
                  newConfig['wan']['wan-dns'] = matchArr(types['wan']['wan-dns'], dnsArr)
                }
                break
            case "password":
                newConfig['login']['username'] = match(types['login']['username'], response['username'], config['login']['username'])
                newConfig['login']['password'] = match(types['login']['password'], response['password'], config['login']['password'], cr.createHash('md5').update(response['password']).digest("hex").toString())
                break
        }
    }
    return newConfig
}
