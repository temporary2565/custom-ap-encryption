// Skript pro práci s konfiguračními soubory

const fs = require('fs')
const path = require('path')
const cr = require('crypto')
const pr = require('process')
const { exec, spawnSync, execSync } = require('child_process')
const nm = require('netmask').Netmask
const vn = require('vnstat-dumpdb') ()
const ping = require('tcp-ping')
const forge = require('node-forge')
const sanitize = require('./sanitize')
let bl = require('./bluetooth').scanner
let bla = require('./bluetooth').advertiser
const {EMCCommunicator} = require('./communicator')
let EMCInternalSession;
let EMCInternalSessionCreated = false;

const getAverageWeeklyUsage = function(days) {
  let daySum = 0
  let count = -1
  let toReturn = 0.00
  for(let [i, day] of Object.keys(days).entries()) {
    daySum += parseInt(days[i]['tx']) + parseInt(days[i]['rx'])
    count = parseFloat(i)
  }
  if(Math.floor(count/7.00) < 1) {
    toReturn = parseFloat(daySum)
  } else {
    toReturn = Math.floor(parseFloat(daySum) / ((count+1.00)/7.00))
  }
  return (count != -1) ? parseFloat(toReturn / 1000000.00).toFixed(2) : 0.00
}


// Zjistí průměrné využití sítě
const getAverageUsage = function(days) {
  let daySum = 0.00;
  let count = -1;
  for(let [i, day] of Object.keys(days).entries()) {
    daySum += parseFloat(days[i]['tx']) + parseFloat(days[i]['rx'])
    count = i
  }
  return (count != -1) ? parseFloat(daySum / (count+1) / 1000000).toFixed(2) : 0.00
}

const getWeeklyUsage = function(days) {
  let daySum = 0.00;
  for(let i=0;i < 7;i++) {
    if(!(typeof days[i] == 'undefined')) {
      daySum += parseFloat(days[i]['tx']) + parseFloat(days[i]['rx'])
    }
  }
  return parseFloat(daySum / 1000000).toFixed(2).toString()
}

// Zjistí, zda existují konfigurační soubory, případně je vytvoří
const checkFiles = function(configPath, defaultConfig) {
  if(!fs.existsSync(path.join(configPath, 'routerBackend.json'))) {
    if(!fs.existsSync(path.join(configPath, 'routerBackend-default.json'))) {
      fs.writeFileSync(path.join(configPath, 'routerBackend-default.json'), JSON.stringify(defaultConfig), (err) => {
        if(err) throw 'Unable to write config file: ' + err
      })
      fs.copyFileSync(path.join(configPath, 'routerBackend-default.json'), path.join(configPath, 'routerBackend.json'))
    } else {
      fs.copyFileSync(path.join(configPath, 'routerBackend-default.json'), path.join(configPath, 'routerBackend.json'))
    }
  }
  return path.join(configPath, 'routerBackend.json');
}

// Zapisuje do konfiguračního souboru externí služby
const writeExternalConfig = function(externalConfigs, service, serviceConfig) {
  if (fs.existsSync(externalConfigs[service])) {
    fs.unlinkSync(externalConfigs[service], (err) => {
       if(err) throw `Unable to remove ${service} config file: ` + err
    })
  }
  fs.writeFileSync(externalConfigs[service], serviceConfig, (err) => {
    if(err) throw `Unable to write ${service} config file: ` + err
  })
}

// Třída, která bude exportována
class MainConfig {
  constructor(_configPath, _externalConfigs, _isProd) {
    this.isProd = _isProd || false; // Zjistí, zda kód běži na konečném
    this.sessions = [] // Pole přihlášených uživatelů
    this.sessionsMax = 3
    this.streams = []
    this.configPath = _configPath
    this.status = {} // Stav připojení, přenesená data
    this.createStatus()
    this.externalConfigs = _externalConfigs
    this.develConfigs = {
      "hostapd": "/dev/shm/hostapd.conf",
      "interfaces": "/dev/shm/interfaces",
    //  "dhcpcd": "/dev/shm/dhcpcd.conf",
      "dnsmasq": "/dev/shm/dnsmasq.conf"
    }
    setInterval(() => {this.createStatus()}, 2000)
    // Výchozí nastavení
    this.defaultConfig = {
      "login": {
        "username": "admin",
        "password": "21232f297a57a5a743894a0e4a801fc3"
      },
      "wan": {
        "interface": "eth0",
        "wan-role": "nat",
        "wan-type": "dhcp",
        "wan-ip": "10.0.0.50",
        "wan-gateway": "10.0.0.1",
        "wan-subnet": "255.255.255.0",
        "wan-dns": ["8.8.8.8", "8.8.4.4"],
      },
      "lan":{
        "lan-ip": "192.168.1.1",
        "lan-gateway": "0.0.0.0",
        "lan-subnet": "255.255.255.0",
        "lan-dhcp-state": true,
        "lan-dhcp-timeout": 3,
        "lan-dhcp-range0": '192.168.1.100',
        "lan-dhcp-range1": '192.168.1.254'
      },
      "wifi": {
        "interface": "wlan1",
        "driver": "nl80211",
        "wifi-ssid": "Smart House",
        "wifi-hide": false,
        "wifi-hwmode": "n",
        "wifi-channel": 6,
        "wifi-channel-width": 40,
        "wifi-encryption": "wpa2psk",
        "wifi-wpa-key": "testtest",
        "wifi-proj-key": "testtest",
        "wifi-wpa-rotation": 3600,
        "wifi-proj-rotation": 3600,
        "wifi-proj-server": "127.0.0.1:4000",
        "wifi-wmm": true
      },
      "firewall_simple": {
        "firewall_simple-enabled": true,
        "firewall_simple-dos": true,
        "firewall_simple-ping": false,
        "firewall_simple-webservice": "lan",
        "firewall_simple-ssh": "none"
      },
      "beacons": {
        "timeout": 10,
        "saved": [],
        "advertised": []
      },
      "tls": {
        "active": false,
        "httpsonly": false,
        "selfsigned": true,
        "key": "",
        "cert": "",
        "hsts": true,
        "hpkp": true,
        "hpkp_hash": ""
      },
      "private": {
        "emc-enable": true,
        "emc-provider-verify": true,
        "emc-internal-session": true,
        "emc-session-file": path.join("/dev/shm", "emcKey.rkey"),
        "emc-data": {},
        "emc-api-keys": [],
        "open-paired-devices": {
          "local": []
        }
      },
      "updated": "never"
    }
    this.configName = 'routerBackend.json'
    // Aktualní konfigurace
    this.config = JSON.parse(fs.readFileSync(checkFiles(this.configPath, this.defaultConfig), 'utf8'))
    this.startBeaconAdvertisement()
    this.pairPending = [];
    this.GenerateInternalKey()
  }

  // Funkce, která generuje konfigurační soubory pro ostatní služby
  generateConfig(_externalConfigs, service) {
    let serviceConfig
    let externalConfigs
    if(this.isProd) {
      externalConfigs = _externalConfigs
    } else {
      externalConfigs = this.develConfigs
    }
    switch(service) {
      case "hostapd":
        serviceConfig = `interface=${this.config['wifi']['interface']}
${(this.config['wan']['wan-role'] == "bridge") ? "bridge=br0" : ""}
ssid=${this.config['wifi']['wifi-ssid']}
driver=${this.config['wifi']['driver']}
hw_mode=g
ieee80211n=${(this.config['wifi']['wifi-hwmode'] == ("n" || "auto")) ? "1" : "0"}
wmm_enabled=${(this.config['wifi']['wifi-wmm']) ? "1" : "0"}
channel=${(this.config['wifi']['wifi-channel'] === "auto") ? "6" : this.config['wifi']['wifi-channel'].toString()}
${(parseInt(this.config['wifi']['wifi-channel-width']) == 40) ? "ht_capab=[HT40][SHORT-GI-20][DSSS_CCK-40]" : ""}
macaddr_acl=0
ignore_broadcast_ssid=${(this.config['wifi']['wifi-hide']) ? "1" : "0"}
${(this.config['wifi']['wifi-encryption'] === "wpa2psk") ? "wpa=2\nauth_algs=1\nwpa_key_mgmt=WPA-PSK\nwpa_passphrase=" + this.config['wifi']['wifi-wpa-key'] + "\nrsn_pairwise=CCMP" : ""}`
        writeExternalConfig(externalConfigs, service, serviceConfig)
        break

      case "interfaces":
        if(this.config['wan']['wan-role'] == "bridge") {
		if(this.config['wan']['wan-type'] == "dhcp") {
          	serviceConfig = `auto br0
  iface br0 inet dhcp
  bridge_ports ${this.config['wan']['interface']} ${this.config['wifi']['interface']}
  iface br0 inet dhcp
  bridge_stp off
  bridge_fd 9`
		} else {
			serviceConfig = `auto br0
  iface br0 inet static
  bridge_ports ${this.config['wan']['interface']} ${this.config['wifi']['interface']}
  bridge_stp off
  bridge_fd 9`
}
        } else {
          let dns = ''
          for(let i = 0;i < this.config['wan']['wan-dns'].length;i++) {
            dns += this.config['wan']['wan-dns'][i] + ((this.config['wan']['wan-dns'].length > i+1) ? ' ' : '')
          }
          serviceConfig = `auto ${this.config['wifi']['interface']}
iface ${this.config['wifi']['interface']} inet static
hostapd ${externalConfigs['hostapd']}
address ${this.config['lan']['lan-ip']}
netmask ${this.config['lan']['lan-subnet']}${(this.config['lan']['lan-gateway'] == "0.0.0.0") ? "" : "\ngateway " + this.config['lan']['lan-gateway']}`

          if(this.config['wan']['wan-type'] == "static") {
          serviceConfig += `

auto ${this.config['wan']['interface']}
iface ${this.config['wan']['interface']} inet static
address ${this.config['wan']['wan-ip']}
netmask ${this.config['wan']['wan-subnet']}${(this.config['wan']['wan-gateway'] == "0.0.0.0") ? "" : "\ngateway " + this.config['wan']['wan-gateway']}
dns-nameservers ${dns}`
          } else {
            serviceConfig += `

auto ${this.config['wan']['interface']}
iface ${this.config['wan']['interface']} inet dhcp`
          }
        }
        writeExternalConfig(externalConfigs, service, serviceConfig)
        break

        // DHCPCD se už v raspbianu/armbianu nepoužívá, pro připad jsem jej odkomentoval
/*      case "dhcpcd":
        let lanConfig = ''
        let wanConfig = ''
        if(this.config['wan']['wan-role'] == "nat") {
          let netmask = new nm('0.0.0.0', this.config['lan']['lan-subnet'])
          let dns = ''
          for(let i = 0;i < this.config['wan']['wan-dns'].length;i++) {
            dns += this.config['wan']['wan-dns'][i] + ((this.config['wan']['wan-dns'].length > i+1) ? ' ' : '')
          }
          lanConfig = `interface ${this.config['wifi']['interface']}
    static ip_address=${this.config['lan']['lan-ip']}/${netmask.bitmask}${(this.config['lan']['lan-gateway'] != "0.0.0.0") ? "\n      static routers=" + this.config['lan']['lan-gateway'] + "\n" : ''}
    static domain_name_servers=${dns}
    nohook wpa_supplicant`
        }
        if(this.config['wan']['wan-type'] == 'static') {
          let netmaskWan = new nm('0.0.0.0', this.config['wan']['wan-subnet'])
          let dnsWan = ''
          for(let i = 0;i < this.config['wan']['wan-dns'].length;i++) {
            dnsWan += this.config['wan']['wan-dns'][i] + ((this.config['wan']['wan-dns'].length > i+1) ? ' ' : '')
          }
          wanConfig = `interface ${(this.config['wan']['wan-role'] == "nat") ? this.config['wan']['interface'] : "br0"}
  static ip_address=${this.config['wan']['wan-ip']}/${netmaskWan.bitmask}
  static routers=${this.config['wan']['wan-gateway']}
  static domain_name_servers=${dnsWan}`
        }
        writeExternalConfig(externalConfigs, service, lanConfig + (((lanConfig && wanConfig) != '') ? "\n\n" : "") + wanConfig)
        break */
      case 'dnsmasq':
        if(this.config['lan']['lan-dhcp-state'] && this.config['wan']['wan-role'] == 'nat') {
          let netmask = new nm(this.config['lan']['lan-ip'], this.config['lan']['lan-subnet'])
          let blockArr = []
          netmask.forEach(function(ip, long, index){
            blockArr.push(ip)
          })
          let dns = '';
          for(let i = 0;i < this.config['wan']['wan-dns'].length;i++) {
            dns += this.config['wan']['wan-dns'][i] + ((this.config['wan']['wan-dns'].length > i+1) ? ',' : '')
          }
          serviceConfig = `port=0
interface=${this.config['wifi']['interface']}
  dhcp-range=${this.config['lan']['lan-dhcp-range0']},${this.config['lan']['lan-dhcp-range1']},${this.config['lan']['lan-dhcp-timeout']}h
  dhcp-option=3,${(this.config['lan']['lan-gateway'] == "0.0.0.0") ? this.config['lan']['lan-ip'] : this.config['lan']['lan-gateway']}
  dhcp-option=6,${dns}
  dhcp-option=15,router.ssps.tzd
  dhcp-option=28,${netmask.broadcast}
  `
        } else {
          serviceConfig = ''
        }
        writeExternalConfig(externalConfigs, service, serviceConfig)
        break
      default:
        throw 'Unknown service'
    }
  }

  // Změna konfigurace
  updateConfig(response, session) {
    if(this.isAuthenticated(session)) {
      if(response.subcategory == 'password') {
        if(cr.createHash('md5').update(response.oldPassword).digest("hex").toString() == this.config['login']['password'] && response.oldUsername == this.config['login']['username']) {
          this.config = sanitize.conf(this.config, response)
          this.saveConfig()
        }
      } else {
        this.config = sanitize.conf(this.config, response)
        this.saveConfig()
      }
    }
  }

  // Uložení konfigurace
  saveConfig() {
    fs.unlinkSync(path.join(this.configPath, 'routerBackend.json'), (err) => {
       if(err) throw `Unable to modify main config file: ` + err
    })
    fs.writeFileSync(path.join(this.configPath, 'routerBackend.json'), JSON.stringify(this.config), (err) => {
      if(err) throw `Unable to modify main config file: ` + err
    })
  }

  // Přihlášení uživatele
  authenticateUser(user, hash) {
    if(hash == this.config['login']['password'] && user == this.config['login']['username'] && this.sessions.length < this.sessionsMax) {
      let session = cr.randomBytes(20).toString("hex")
      this.sessions.push(session)
      return { "session": session, "authenticated": true }
    } else {
      return { "authenticated": false }
    }
  }

  // Odhlášení uživatele
  async deauthenticateUser(session) {
    if(this.sessions.includes(session)) {
      this.sessions.splice(this.sessions.indexOf(session), 1)
    }
    return { "authenticated": false }
  }

  // Zjistí, zda je uživatel přihlášen
  isAuthenticated(session) {
    return this.sessions.includes(session)
  }

  // Vrátí aktuální konfiguraci přihlášenému uživateli
  getConfig(session) {
    let returned = JSON.parse(JSON.stringify(this.config))
    // Vyřazení objektů, ke kterým by klient neměl mít přístup
    delete returned['login']
    delete returned['beacons']['timeout']
    delete returned['wan']['interface']
    delete returned['wifi']['interface']
    delete returned['wifi']['driver']
    delete returned['private']
    returned['authenticated'] = this.isAuthenticated(session)
    return (this.isAuthenticated(session)) ? JSON.stringify(returned) : { "authenticated": false }
  }

  // Vrátí true pokud je uživatel přihlášen
  getStatus(session) {
    this.status['authenticated'] = this.isAuthenticated(session)
    return (this.isAuthenticated(session)) ? JSON.stringify(this.status) : { "authenticated": false }
  }

  // Vrátí aktuální stav AP pro síťovou mapu
  createStatus() {
    new Promise((res, reject) => {
      ping.probe("google.com", 80, (pingErr,pingAv) => {
        // Zjistí zda je AP připojeno k internetu
        let internet
        if (pingErr || !pingAv) {
          internet = false
        } else {
          internet = true
        }
        vn.getStats(this.config['wan']['interface'], (err, data) => {
            let updates
            let available
            let version
            if(this.isProd) {
	      version = spawnSync('uname', ['-r'], {stdio:'pipe', encoding:'utf-8'}).output
              available = spawnSync('apt', ['list', '--upgradable'], {stdio:'pipe', encoding:'utf-8'}).output
              updates = {
                "available": (available[2].length > 0) ? null : available[1],
                "version": (version[2].length > 0) ? null : version[1],
                "updated": this.config['updated']
              }
            } else {
              version = spawnSync('uname', ['-r'], {stdio:'pipe', encoding:'utf-8'}).output
              updates = {
                "available": 0,
                "version": (version[2].length > 0) ? null : version[1],
                "updated": this.config['updated']
              }
            }
            let networkMap = {
              "internet": {"value":internet},
              "network": {"value":true, "type":(this.config['wan']['wan-role'] == "nat") ? "NAT" : "Bridge", "host":(this.config['lan']['wan-gateway'] == "0.0.0.0") ? this.config['lan']['ip'] : this.config['lan']['wan-gateway']},
              "wifi": {"value":true, "ssid":this.config['wifi']['wifi-ssid']},
              "beacons": {"value":false,"count":0},
              "encryption": {"value":(this.config['wifi']['wifi-encryption'] != 'none'), "type":(this.config['wifi']['wifi-encryption'] == "wpa2psk") ? "WPA2" : "Projekt"},
            }
            let usage
            if(this.isProd) {
              usage = {
                "average": {
                  "daily": (!(typeof getAverageUsage(data.traffic.days) == ('undefined' || 'object'))) ? getAverageUsage(data.traffic.days).toString() + " Gb" : "0 Gb",
                  "weekly": (!(typeof getAverageWeeklyUsage(data.traffic.days) == ('undefined' || 'object'))) ? (parseFloat(getAverageWeeklyUsage(data.traffic.days))).toFixed(2).toString() + " Gb" : "0 Gb",
                  "monthly": (!(typeof getAverageUsage(data.traffic.months) == ('undefined' || 'object'))) ? getAverageUsage(data.traffic.months).toString() + " Gb" : "0 Gb"
                },
                "immediate": {
                  "daily": (!(typeof data.traffic.days[0] == ('undefined' || 'object'))) ? ((data.traffic.days[0]['tx'] + data.traffic.days[0]['rx'])/1000000).toFixed(2).toString() + " Gb" : "0 Gb",
                  "weekly": (!(typeof getWeeklyUsage(data.traffic.days) == ('undefined' || 'object'))) ? getWeeklyUsage(data.traffic.days).toString() + " Gb" : "0 Gb",
                  "monthly": (!(typeof data.traffic.days[0] == ('undefined' || 'object'))) ? ((data.traffic.months[0]['tx'] + data.traffic.months[0]['rx'])/1000000).toFixed(2).toString() + " Gb" : "0 Gb"
                },
                "limits": {
                  "limit-set": false
                }
              }
            } else {
              usage = {
                "average": {
                  "daily": "0 Gb",
                  "weekly": "0 Gb",
                  "monthly": "0 Gb"
                },
                "immediate": {
                  "daily": "0 Gb",
                  "weekly": "0 Gb",
                  "monthly": "0 Gb"
                },
                "limits": {
                  "limit-set": false
                }
              }
            }
          res({
            "network-map": networkMap,
            "usage": usage,
            "updates": updates,
            "beacons": {
              "advertised": this.config.beacons.advertised
            }
          })
        })
      })
    }).then((resp) => {
      this.status = resp
    }).catch((err) => {throw "Unable to get device usage: " + err})
  }

  // Restartuje všechny potřebné služby
  restartServices() {
    this.generateConfig(this.externalConfigs, 'hostapd')
    this.generateConfig(this.externalConfigs, 'interfaces')
    this.generateConfig(this.externalConfigs, 'dnsmasq')
    if(this.isProd) {
      setTimeout(() => {
        execSync('systemctl restart networking')
        execSync('systemctl restart dnsmasq')
        execSync('systemctl restart hostapd')
        pr.exit(0)
      }, 1500)
    }
  }

  // Nastaví firewall
  startFirewall() {
    if(this.isProd) {
	execSync('iptables -F')
      let rules = []
      if(this.config['wan']['wan-role'] == "nat") {
        exec("iptables -t nat -A POSTROUTING -o " + this.config['wan']['interface'] + " -j MASQUERADE")
        exec("iptables -A FORWARD -i " + this.config['wan']['interface'] + " -o " + this.config['wifi']['interface'] + " -m state --state RELATED,ESTABLISHED -j ACCEPT")
        exec("iptables -A FORWARD -i " + this.config['wifi']['interface'] + " -o " + this.config['wan']['interface'] + " -j ACCEPT")
        //exec("iptables -t nat -A PREROUTING -i lo -p tcp --dport 80 -j DNAT --to-destination 127.0.0.1")
	//exec("iptables -t nat -A POSTROUTING -o " + this.config['wifi']['interface'] + " -p tcp --dport 80 -d 127.0.0.1 -j SNAT --to-source " + + this.config['lan']['lan-ip'])
	if(this.config['firewall_simple']['firewall_simple-enabled']) {
          // Pravidla pro ochranu před některými jednoduchými DoS útoky
          if(this.config['firewall_simple']['firewall_simple-dos']) {
            //Zatim nefunguje
          }
          if(this.config['firewall_simple']['firewall_simple-ping']) {
            rules.push('iptables -t mangle -A PREROUTING -p icmp -j DROP -i ' + this.config['wan']['interface'])
          }
          switch(this.config['firewall_simple']['firewall_simple-ssh']) {
            case "lan":
              rules.push('iptables -A INPUT -p tcp --dport 22 -j DROP -i ' + this.config['wan']['interface'])
              rules.push('iptables -A INPUT -p udp --dport 22 -j DROP -i ' + this.config['wan']['interface'])
              break
            case "none":
              rules.push('iptables -A INPUT -p tcp --dport 22 -j DROP -i ' + this.config['wan']['interface'])
              rules.push('iptables -A INPUT -p tcp --dport 22 -j DROP -i ' + this.config['wifi']['interface'])
              rules.push('iptables -A INPUT -p udp --dport 22 -j DROP -i ' + this.config['wan']['interface'])
              rules.push('iptables -A INPUT -p udp --dport 22 -j DROP -i ' + this.config['wifi']['interface'])
              break
          }
          if(this.config['firewall_simple']['firewall_simple-webservice'] == "lan") { 
            rules.push('iptables -A INPUT -p tcp --dport 80 -j DROP -i ' + this.config['wan']['interface'])
            rules.push('iptables -A INPUT -p tcp --dport 443 -j DROP -i ' + this.config['wan']['interface'])
            rules.push('iptables -A INPUT -p tcp --dport 19231 -j DROP -i ' + this.config['wan']['interface'])
          }
          rules.forEach((rule) => exec(rule))
        }
      }
    }
  }

  // Vrátí aktuálně dostupná okolní zařízení
  getBeacons(session) {
    if(this.isAuthenticated(session)) {
      let beacons = bl.available(this.config['beacons']['timeout'])
      beacons['authenticated'] = true
      return JSON.stringify(beacons)
    } else {
      return { 'authenticated': false }
    }
  }

  startBeaconAdvertisement() {
    bla.beaconArr = this.config.beacons.advertised
    bla.update()
  }

  // Provede určitou akci, která čte a zapisuje do konfiguračního souboru
  modifyConfig(session, action, value) {
    let toReturn = { authenticated: true, success: false }
    if(this.isAuthenticated(session)) {
      switch(action) {
        case "beacons-saved-add":
          let rgx = new RegExp('^[0-9a-f]{32}$')
          let rgxuid = new RegExp('^[0-9a-f]{20}$')
          let rgxuidins = new RegExp('^\\d{12}$')
          if((rgx.test(value.uuid) || rgxuid.test(value.namespace)) && (((typeof value.minor && typeof value.major) == 'number' && 0 < parseInt(value.minor) < 65535 && 0 < parseInt(value.major) < 65535) || rgxuidins.test(value.instance)) && (value.type == 'eddystone-uid' || value.type == 'ibeacon')) {
            let not = false
            for(let beacon of this.config.beacons['saved']) {
              if(beacon.type == 'ibeacon') {
                if(beacon.uuid == value.uuid && beacon.major == value.major && beacon.minor == value.minor && beacon.type == value.type) {
                  not = true
                }
              } else if(beacon.type == 'eddystone-uid') {
                if(beacon.namespace == value.namespace && beacon.instance == value.instance && beacon.type == value.type) {
                  not = true
                }
              }
            }
            if(!not) {
              if(value.type == 'eddystone-uid') {
                this.config.beacons.saved.push({namespace: value.namespace, instance: parseInt(value.instance), type: value.type})
                toReturn = { authenticated: true, success: true }
                this.saveConfig()
              } else if(value.type == 'ibeacon') {
                this.config.beacons.saved.push({uuid: value.uuid, minor: parseInt(value.minor), major: parseInt(value.major), type: value.type})
                toReturn = { authenticated: true, success: true }
                this.saveConfig()
              }
            }
          }
          break
        case "beacons-saved-rem":
          let success = false
          let beacon
          for(let index of Object.keys(this.config.beacons['saved'])) {
            beacon = this.config.beacons['saved'][index]
            if(value.type == 'ibeacon') {
              if(typeof value.uuid != 'undefined' && value.uuid == beacon.uuid && value.type == beacon.type && parseInt(value.minor) == beacon.minor && parseInt(value.major) == beacon.major) {
                this.config.beacons['saved'].splice(index, 1)
                this.saveConfig()
                success = true
              }
            } else if(value.type == 'eddystone-uid') {
              if(value.namespace == beacon.namespace && value.type == beacon.type && value.instance == beacon.instance) {
                this.config.beacons['saved'].splice(index, 1)
                this.saveConfig()
                success = true
              }
            }
          }
          toReturn = { authenticated: true, success: success }
          break
        case "beacons-saved-get":
          toReturn = { authenticated: true, success: true, value: this.config.beacons.saved }
          break
        case "beacons-advertised-update":
          let not = false
          if(typeof value.current != 'undefined' && value.current !== null && value.current.length >= 1) {
            for(let item of Object.keys(value.current)) {
              if(!((Object.keys(value.current[item]).length == 5 && value.current[item].type == 'eddystone-uid') || (Object.keys(value.current[item]).length == 6 && value.current[item].type == 'ibeacon'))) {
                not = true
              }
            }
            let notSanitization = true
            if(!not) {
              notSanitization = false
              let sanitization = {
                'namespace': '/^[0-9a-f]{20}$/i',
                'instance': '/^\\d{12}$/',
                'type': '/^(eddystone\\-uid|ibeacon)$/',
                'uuid': '/^[0-9a-f]{32}$/i',
                'major': '@num-0-65535',
                'minor': '@num-0-65535',
                'active': 'boolean',
                'security': 'boolean'
              }
              let verify = []
              for(let item of Object.keys(value.current)) {
                if(value.current[item].type == 'ibeacon') {
                  verify = ['uuid', 'type', 'major', 'minor', 'active', 'security']
                } else if(value.current[item].type == 'eddystone-uid') {
                  verify = ['namespace', 'type', 'instance', 'active', 'security']
                }
                for(let rule of verify) {
                  if(!sanitization[rule].toString().startsWith('@num') && sanitization[rule] != 'boolean') {
                    if(!((new RegExp(rule.split('/')[1], rule.split('/')[2])).test(value.current[item][rule]))) {
                      notSanitization = true
                    }
                  } else if(sanitization[rule].toString().startsWith('@num')) {
                    if(!(parseInt(value.current[item][rule]) >= parseInt(sanitization[rule].split('-')[1]) && parseInt(value.current[item][rule]) <= parseInt(sanitization[rule].split('-')[2]))) {
                      notSanitization = true
                    }
                  } else if(sanitization[rule] == 'boolean') {
                    if(typeof value.current[item][rule] != 'boolean') {
                      notSanitization = true
                    }
                  } else {
                    notSanitization = true
                  }
                }
              }
            }
            let notDuplicateCheck = true
            if(!notSanitization) {
              notDuplicateCheck = false
              let found = {
                'ibeacon': [],
                'eddystone-uid': []
              }
              for(let item of Object.keys(value.current)) {
                if(value.current[item].type == 'ibeacon') {
                  if(!found[value.current[item]['type']].includes(value.current[item].uuid+','+value.current[item].major+','+value.current[item].minor)) {
                    found[value.current[item]['type']].push(value.current[item].uuid+','+value.current[item].major+','+value.current[item].minor)
                  } else {
                    notDuplicateCheck = true
                  }
                } else if(value.current[item].type == 'eddystone-uid') {
                  if(!found[value.current[item]['type']].includes(value.current[item].namespace+','+value.current[item].instance)) {
                    found[value.current[item]['type']].push(value.current[item].namespace+','+value.current[item].instance)
                  } else {
                    notDuplicateCheck = true
                  }
                } else {
                  notDuplicateCheck = true
                }
              }
            }
            if(!notDuplicateCheck) {
              this.config.beacons.advertised = value.current
              toReturn = { authenticated: true, success: true }
this.saveConfig()
              this.startBeaconAdvertisement()
            } else {
              toReturn = { authenticated: true, success: false }
            }
          } else {
            this.config.beacons.advertised.length = 0;
this.saveConfig()
this.startBeaconAdvertisement()
            toReturn = { authenticated: true, success: true }
          }
          break
        case "beacons-advertised-get":
          toReturn = { authenticated:true, success: true, value: this.config.beacons.advertised }
          break
      }
    } else {
      toReturn = { authenticated: false }
    }
    return JSON.stringify(toReturn);
  }

  tlsConfig(response, files, session) {
    if(this.isAuthenticated(session)) {
      let sanitization = {
        active: 'stringboolean',
        httpsonly: 'stringboolean',
        selfsigned: 'stringboolean',
        hsts: 'stringboolean',
        hpkp: 'stringboolean',
        "hpkp_hash": '/^[a-z0-9\\/\\/\\+]{43}\\=$/i'
      }
      let dependencies = {
        active: ['httpsonly', 'selfsigned', 'hsts', 'hpkp', 'key', 'cert', 'hpkp_hash'],
        selfsigned: ['key', 'cert', 'hsts', 'hpkp', 'hpkp_hash'],
        hpkp: ['hpkp_hash']
      } // dependency: dependent[]
      let err = false
      let stop = false
      let newConf = {}
      let dependson = []
      for(let item of Object.keys(sanitization)) {
        dependson = []
        for(let dependency of Object.keys(dependencies)) {
          for(let dependent of dependencies[dependency]) {
            if(dependent == item && !dependson.includes(dependency)) {
              dependson.push(dependency)
            }
          }
        }
        stop = false
        for(let dependency of dependson) {
          if((typeof response[dependency] == 'boolean' && !response[dependency]) || (typeof response[dependency] == 'string' && response[dependency] == 'false' && dependency != 'selfsigned') || (dependency == 'selfsigned' && response[dependency] == 'true')) {
            stop = true
          }
        }
        if(!stop) {
          if(sanitization[item] == 'boolean') {
            if(!(typeof response[item] == 'boolean')) {
              err = true
            }
          } else if (sanitization[item] == 'stringboolean') {
            if(!(typeof response[item] == 'string') && (response[item] == "true" || response[item] == "false")) {
              err = true
            }
          } else {
            let rgx = new RegExp(sanitization[item].replace(/\\\/\\\//g, 'PRO32*#').split('/')[1].replace(/PRO32\*\#/g, '/'), sanitization[item].replace(/\\\/\\\//g, 'PRO32*#').split('/')[2].replace(/PRO32\*\#/g, '/'))
            if(!rgx.test(response[item])) {err = true}
          }
        }
      }
      if(!err) {
        for(let item of Object.keys(sanitization)) {
          if(typeof response[item] != 'undefined') {newConf[item] = (response[item] != "true" && response[item] != "false") ? response[item] : (response[item] == "true")}
        }
        if(typeof response.selfsigned != 'undefined' && response.selfsigned == "false") {
          if(typeof files.key == 'string' && typeof files.cert == 'string') {
            newConf['key'] = files.key
            newConf['cert'] = files.cert
          } else {err=true}
        }
      }
      if(!err) {
        this.config.tls = newConf
        this.saveConfig()
	this.restartServices()
      }
    }
  }

  GenerateInternalKey() {
    this.EMCInternalSession = cr.randomBytes(512).toString('base64');
    this.EMCInternalSessionCreated = true;
    if(fs.existsSync(this.config.private["emc-session-file"])) {
      fs.unlinkSync(this.config.private["emc-session-file"])
    }
    fs.writeFileSync(this.config.private["emc-session-file"], this.EMCInternalSession, (err) => {
      if(err) console.log("Error while creating EMC session key, some features may not work");
    });
  }


  /*ProvideManagement(apikey, action, params) {
    if(this.EMCIsAuthenticated(apikey)) {
      if(typeof action != "undefined") {
        switch(action) {
          case "retrieve":
            toReturn = this.config.beacons.saved;
            toReturn = toReturn.concat(this.config.beacons.advertised);
            
            break;
          case "enforce":
            break;
        }
      }
    }
  }*/

  // Overi prihlaseni pro EMC
  EMCIsAuthenticated(apikey) {
    let toReturn = false;
    if(this.EMCInternalSession == apikey) {
      toReturn = true;
    } else if(typeof this.config.private["emc-api-keys"] != "undefined" && this.config.private["emc-api-keys"].includes(apikey)) {
      toReturn = true;
    }
    return toReturn;
  }

  // Parovani, mazani, odmitani
  PairDevice(action, id, session) {
    if(this.isAuthenticated(session)) {
      let idArr = []
      if(action == "accept") {
        for(let item of this.pairPending) {
          idArr.push(item.id);
        }
        if(idArr.includes(id)) {
          console.log("here")
          this.config.private["open-paired-devices"]["local"].push({
            id: this.pairPending[idArr.indexOf(id)].id,
            name: this.pairPending[idArr.indexOf(id)].name,
            status: "paired"
          })
          this.pairPending = this.pairPending.splice(idArr.indexOf(id), 1)
          return { "authenticated": true, "success": true }
        } else {
          return { "authenticated": true, "success": false }
        }
      } else if(action == "reject") {
        let idArr = []
        console.log("reject")
        for(let item of this.pairPending) {
          idArr.push(item.id);
        }
        this.pairPending = this.pairPending.splice(idArr.indexOf(id), 1)
        console.log(this.pairPending)
        return { "authenticated": true, "success": true }
      } else if(action == "delete") {
        let idArr = []
        for(let item of this.config.private["open-paired-devices"]["local"]) {
          idArr.push(item.id);
        }
        if(idArr.includes(id)) {
          delete this.config.private["open-paired-devices"]["local"][idArr.indexOf(item.id)]
          return { "authenticated": true, "success": true }
        } else {
          return { "authenticated": true, "success": false }
        }
      } else {
        return { "authenticated": true, "success": false }
      }
    } else {
      return { "authenticated": false }
    }
  }

  // Vrati sparovana zarizeni
  GetPendingPairings(session) {
    if(this.isAuthenticated(session)) {
      return {authenticated: true, success: true, value: this.config.private["open-paired-devices"]["local"].concat(this.pairPending)};
    } else {
      return { "authenticated": false }
    }
  }

  EMCGenerateAPIKey(session) {
    if(!this.isAuthenticated(session)) return {authenticated: false};
    let key = cr.randomBytes(64).toString('hex')
    this.config.private["emc-api-keys"].push(key)
    this.saveConfig()
    return {authenticated:true, success:true}
  }

  EMCGetAPIKeys(session) {
    if(!this.isAuthenticated(session)) return {authenticated: false};
    return {authenticated:true, success:true, value:this.config.private["emc-api-keys"]}
  }

  EMCDeleteAPIKey(session, key) {
    if(!this.isAuthenticated(session)) return {authenticated: false};
    if(!this.config.private["emc-api-keys"].includes(key)) return {authenticated: true, success: false};
    this.config.private["emc-api-keys"] = Object.assign([], this.config.private["emc-api-keys"].splice(this.config.private["emc-api-keys"].indexOf(key), 1));
    this.saveConfig()
    if(!this.config.private["emc-api-keys"].includes(key)) return {authenticated: true, success: true}
    else return {authenticated: true, success: false}
  }

  EMCAction(req) {
    console.log(req.query)
    if(req.query.action == "generate")
      return this.EMCGenerateAPIKey(req.query.session);
    if(req.query.action == "get")
      return this.EMCGetAPIKeys(req.query.session);
    if(req.query.action == "delete" && req.query.key.toString().length > 16)
      return this.EMCDeleteAPIKey(req.query.session, req.query.key);
    if(req.query.action == "get-beacons") {
      let c = new EMCCommunicator(this.EMCInternalSession, this.config.private["emc-api-keys"], this.config.private["emc-data"])
      return c.getBeacons(req.query.key, this.config.beacons.saved, this.config.beacons.advertised)
    }
    if(req.query.action == "update-data" && typeof JSON.parse(req.query.value).data != "undefined") {
      let tmp = null
      try {
        let c = new EMCCommunicator(this.EMCInternalSession, this.config.private["emc-api-keys"], this.config.private["emc-data"])
        tmp = c.updateData(req.query.key, JSON.parse(req.query.value))
        if(typeof this.config.private["emc-data"].checksum != "undefined" && typeof tmp.data.checksum != "undefined" && tmp.data.checksum == this.config.private["emc-data"].checksum)
          return c.isAuthenticated(req.query.key) ? {authenticated:true, success: true, uptodate: true, updatedon: this.config.private["emc-data"].updatedOn} : {authenticated: false}
        if(tmp.response.authenticated)
          this.config.private["emc-data"] = Object.assign({}, tmp.data)
      } catch(err) {return { "authenticated": false, "success": false, "error": true }}
      this.saveConfig()
      return tmp != null ? tmp.response : { "authenticated": false, "success": false, "error": true }
    }
    if(req.query.action == "open-stream") {
      
    }
    return { "authenticated": false, "success": false, "error": true }
  }

  EMCConfigurator(req) {
    if(this.isAuthenticated(req.session)) {
      let communicator = new EMCommunicator(Internal)

    } else {
      return {authenticated: true, success: false}
    }
  }

  EMCOpenStream(req) {
    if(this.isAuthenticated(req.session)) {
      if(this.streams.includes(req.value.key)) return {authenticated: true, success: true}
    } else {
      return {authenticated: true, success: false}
    }
  }

  // IMPORTANT
  EMCCreateStream(r) {

  }
}

module.exports = MainConfig;
