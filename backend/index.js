const isProd = false

const cf = require('./config')
const sanitize = require('./sanitize')
const http = require('http')
const https = require('https')
const xp = require('express')
const cr = require('crypto')
const fs = require('fs')
const path = require('path')
const helmet = require('helmet')
const upload = require('express-fileupload')

// Konfigurační soubory ostatních služeb
let externalConfigs = {
  "hostapd": "/etc/hostapd/hostapd.conf",
  "interfaces": "/etc/network/interfaces",
//  "dhcpcd": "/etc/dhcpcd.conf",
  "dnsmasq": "/etc/dnsmasq.conf"
}

let config = new cf("./", externalConfigs, isProd)
config.startFirewall()

// Vytvoření serveru
const app = xp()
if(typeof config.config.tls.httpsonly == 'undefined' || !config.config.tls.httpsonly) {app.listen(80)}
if(config.config.tls.active) {
  if(typeof config.config.tls.httpsonly != 'undefined' &&  !config.config.tls.selfsigned) {
    app.use(helmet({
    //  contentSecurityPolicy: true,
      frameguard: true,
      hidePoweredBy: true,
      hpkp: {
        maxAge: 7776000,
        sha256s: [cr.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'ca/server.crt'))).digest('base64'),
        (typeof config.config.tls.hpkp_hash != 'undefined') ? config.config.tls.hpkp_hash : undefined],
        includeSubdomains: true,
        setIf: (req, res) => {return (config.config.tls.hpkp && req.secure)}
      },
      hsts: config.config.tls.hsts,
      ieNoOpen: true,
      noCache: false,
      noSniff: true,
      referrerPolicy: false,
      xssFilter: true
    }));
  }
	let server = https.createServer((config.config.tls.selfsigned) ? {
      key: fs.readFileSync(path.join(__dirname, "ca/server.key")),
      cert: fs.readFileSync(path.join(__dirname, "ca/server.crt"))
    } : {
      key: config.config.tls.key,
      cert: config.config.tls.cert
    }, app)
    server.listen(443)
}
app.use(xp.static(path.join(__dirname, '../webservice/dist/webservice')))
app.use(xp.json())
app.use(upload({
  limits: { fileSize: 2 * 1024 * 1024 },
}))

// Přihlášení
app.post('/auth', (req, resp) => {
  if((typeof req.body.user && typeof req.body.pwd) != 'undefined') {
    resp.status(200).send(JSON.stringify(config.authenticateUser(req.body.user, req.body.pwd)))
  } else {
    resp.status(200).send(JSON.stringify({ "authenticated": false }))
  }
})

// Odhlášení
app.post('/deauth', (req, resp) => {
  if(typeof req.body.session != 'undefined')
    resp.status(200).send(JSON.stringify(config.authenticateUser(req.body.session)))
})

// Zahájení relace
app.post('/session', (req, resp) => {
  if(typeof req.body.session != 'undefined') {
    resp.status(200).send(JSON.stringify({ "authenticated": config.isAuthenticated(req.body.session) }))
  } else {
    resp.status(200).send(JSON.stringify({ "authenticated": false }))
  }
})

// Provedení změn v nastavení
app.get('/apply', (req, resp) => {
  if(typeof req.query.session != 'undefined') {
    config.updateConfig(req.query, req.query.session)
    resp.status(200).sendFile(path.join(__dirname, 'apply.html'))
    config.restartServices()
  }
})

// Poskytnutí aktuální konfigurace ze serveru
app.post('/get', (req, resp) => {
  if(typeof req.body.session != 'undefined') {
    resp.status(200).send(JSON.stringify(config.getConfig(req.body.session)))
  } else {
    resp.status(200).send(JSON.stringify({ "authenticated": false }))
  }
})

// Poskytnutí informací o dostupných beaconech
app.post('/beacons', (req, resp) => {
  if(typeof req.body.session != 'undefined') {
    resp.status(200).send(JSON.stringify(config.getBeacons(req.body.session)))
  } else {
    resp.status(200).send(JSON.stringify({ "authenticated": false }))
  }
})

// Ověření přihlášení
app.post('/status', (req, resp) => {
  if(typeof req.body.session != 'undefined') {
    resp.status(200).send(JSON.stringify(config.getStatus(req.body.session)))
  } else {
    resp.status(200).send(JSON.stringify({ "authenticated": false }))
  }
})

app.post('/modify', (req, resp) => {
  if((typeof req.body.session && typeof req.body.action && typeof req.body.value) != 'undefined') {
    resp.status(200).send(JSON.stringify(config.modifyConfig(req.body.session, req.body.action, req.body.value)))
  } else {
    resp.status(200).send(JSON.stringify({ "authenticated": false }))
  }
})

app.post('/secure', (req, resp) => {
  if(typeof req.body.session != 'undefined') {
    config.tlsConfig(req.body, {
      key: (req.files !== null && typeof req.files.key != 'undefined') ? req.files.key.data.toString('utf8') : false,
      cert: (req.files !== null && typeof req.files.cert != 'undefined') ? req.files.cert.data.toString('utf8') : false
    }, req.body.session)
    resp.status(200).send(JSON.stringify({success: true}))
  }
})

app.post('/pair', (req,resp) => {
  if (typeof req.body.action != 'undefined' && typeof req.body.id != 'undefined' && typeof req.body.session != 'undefined') {
    resp.status(200).send(config.PairDevice(req.body.action, req.body.id, req.body.session))
  } else {
    resp.status(200).send(JSON.stringify({ "authenticated": false }))

  }
})

app.post('/get-pair', (req,resp) => {
  if(typeof req.body.session != 'undefined') {
    resp.status(200).send(config.GetPendingPairings(req.body.session));
  } else {
    resp.status(200).send(JSON.stringify({ "authenticated": false }))
  }
})

app.get('/emc', (req, resp) => {
  if((typeof req.query.session != 'undefined' || typeof req.query.key != 'undefined') && typeof req.query.action != 'undefined') {
    resp.status(200).send(config.EMCAction(req))
  }
  else resp.status(200).send({authenticated: false})
})