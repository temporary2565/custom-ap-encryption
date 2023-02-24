import { Injectable } from '@angular/core';
import { LoginService } from './login.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StructureService {
  // Přepínání kategorií
  public highlighted = new BehaviorSubject<string>("none none");
  public highlightedObs = this.highlighted.asObservable();
  highlight(what: string) {
    this.highlighted.next(what);
  }

  // Dynamické skrývání
  public elementArr: string[] = []; // Skrývané prvky
  public shownArr: string[] = []; // Zobrazené prvky
  public fixedObj: any = {}; // Určí, zda se prvek automaticky aktualizuje

  constructor(public _loginService: LoginService) {
    this.initializeHiding();
  }

  // Funkce pro uskutečnění skrývání
  initializeHiding() {
    let type: string;
    // Skrývání bude probíhat pomocí prvku, který řídí skrývaní skrývaných prvků
    for(let category of Object.keys(this.appStructure)) {
      // Cykluje přes kategorie
      if(typeof this.appStructure[category]['children'] != 'undefined') {
        for(let subcategory of Object.keys(this.appStructure[category]['children'])) {
          // Cykluje přes podkategorie
          if(typeof this.appStructure[category]['children'][subcategory]['children'] != 'undefined') {
            for(let element of Object.keys(this.appStructure[category]['children'][subcategory]['children'])) {
              // Cykluje přes prvky
              if(typeof this.appStructure[category]['children'][subcategory]['children'][element]['type'] != 'undefined') {
                type = this.appStructure[category]['children'][subcategory]['children'][element]['type']; // Proměnná kvůli větší přehlednosti
                if(this.appStructure[category]['children'][subcategory]['children'][element]['show'] == true) {
                  // Hledá prvky pro řízení skrývání
                  this.elementArr.push(element);
                  // Zjistí výchozí hodnoty
                  if(type == 'select') {
                    for(let option of Object.keys(this.appStructure[category]['children'][subcategory]['children'][element][type]['children'])) {
                      if(this.appStructure[category]['children'][subcategory]['children'][element][type]['children'][option]['default'] === true) {
                        this.shownArr.splice(this.elementArr.indexOf(element), 1, option);
                      }
                    }
                  } else if(type == 'checkbox' && typeof this.appStructure[category]['children'][subcategory]['children'][element][type]['default'] != 'undefined') {
                    if(this.appStructure[category]['children'][subcategory]['children'][element][type]['default'] === true) {
                      this.shownArr.splice(this.elementArr.indexOf(element), 1, "enabled");
                    } else {
                      this.shownArr.splice(this.elementArr.indexOf(element), 1, "disabled");
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  isInteractive(item: string) {
    // Zjistí, zda daný element ovlivňuje skrývání
    return this.elementArr.includes(item);
  }

  updateHiding(event) {
    // Změna skrývaných objektů
    if(typeof this.lookFor(event.target.id)['showupdate'] == 'undefined' || this.lookFor(event.target.id)['showupdate']) {
      if(this.elementArr.includes(event.target.id)) {
        if(event.target.type == "checkbox") {
          this.shownArr.splice(this.elementArr.indexOf(event.target.id), 1, (event.target.checked) ? 'enabled' : 'disabled');
        } else {
          this.shownArr.splice(this.elementArr.indexOf(event.target.id), 1, event.target.value);
        }
      }
    }
  }

  preloadHiding(id, type, value) {
    // Skrytí objektů po načtení komponenty
    if(this.elementArr.includes(id)) {
      if(type == "checkbox") {
        this.shownArr.splice(this.elementArr.indexOf(id), 1, (value) ? 'enabled' : 'disabled');
      } else {
        this.shownArr.splice(this.elementArr.indexOf(id), 1, value);
      }
    }
  }

  isHidden(category: string, _subcategory: string, _item: string, _update: boolean) {
    let item = _item || "none";
    let subcategory = _subcategory || "none";
    let update = _update || true;
    // Zjistí, zda je objekt skrytý
    if(typeof this.appStructure[category]['children'] != 'undefined') {
      if((typeof this.appStructure[category]['children'][subcategory]['showgroup'] && typeof this.appStructure[category]['children'][subcategory]['showon']) != 'undefined' && item == "none") {
        if(typeof this.appStructure[category]['children'][subcategory]['showupdate'] != 'undefined' && !this.appStructure[category]['children'][subcategory]['showupdate']) {
          // Kvůli dynamicky a staticky skrývaným prvkům
          if(Object.keys(this.fixedObj).includes(subcategory)) {
            return this.fixedObj[subcategory];
          } else {
            this.fixedObj[subcategory] = this.shownArr[this.elementArr.indexOf(this.appStructure[category]['children'][subcategory]['showgroup'])] != this.appStructure[category]['children'][subcategory]['showon'];
            return this.fixedObj[subcategory];
          }
        } else {
          if(this.elementArr.includes(this.appStructure[category]['children'][subcategory]['showgroup'])) {
            return this.shownArr[this.elementArr.indexOf(this.appStructure[category]['children'][subcategory]['showgroup'])] != this.appStructure[category]['children'][subcategory]['showon'];
          }
        }
      } else {
        if(typeof this.appStructure[category]['children'][subcategory]['children'] != 'undefined' && typeof this.appStructure[category]['children'][subcategory]['children'][item] != 'undefined') {
          if((typeof this.appStructure[category]['children'][subcategory]['children'][item]['showgroup'] && typeof this.appStructure[category]['children'][subcategory]['children'][item]['showon']) != 'undefined') {
            // Vnořování podmínek, kvůli přehlednosti
            if(this.elementArr.includes(this.appStructure[category]['children'][subcategory]['children'][item]['showgroup'])) {
              return this.shownArr[this.elementArr.indexOf(this.appStructure[category]['children'][subcategory]['children'][item]['showgroup'])] != this.appStructure[category]['children'][subcategory]['children'][item]['showon'];
            }
          }
        }
      }
    }
  }

  isBtnHidden(category: string, subcategory: string) {
    // Zjistí, zda má být skryto tlačítko pro odeslání
    if(typeof this.appStructure[category]['children'][subcategory]['submit'] != 'undefined') {
      return !this.appStructure[category]['children'][subcategory]['submit'];
    } else {
      return false;
    }
  }

  detectComponent(category: string, subcategory: string) {
    // Zjistí zda je prvek ve struktuře komponenta
    if(typeof this.appStructure[category]['children'][subcategory]['component'] != 'undefined') {
      return {is: true, component: this.appStructure[category]['children'][subcategory]['component']};
    } else {
      return {is: false};
    }
  }

  // Celková struktura aplikace v JSON formátu
  public rawStructure: string = JSON.stringify(
{
    "network": {
      "label": "Síť",
      "type": "category",
      "img": "assets/network.png",
      "desc": "Nastavení sítě",
      "children": {
        "wan": {
          "label": "WAN",
          "desc": "Nastavení připojení k síti WAN",
          "type": "subcategory",
          "children": {
            "wan-role": {
              "type": "select",
              "label": "Funkce WAN portu: ",
              "desc": "Zvolte funkci WAN portu",
              "show": true,
              "showupdate": false,
              "select": {
                "children": {
                  "nat": {
                    "default": true,
                    "label": "NAT",
                    "show": "nat"
                  },
                  "bridge": {
                    "label": "Bridge",
                    "show": "none"
                  }
                }
              }
            },
            "wan-type": {
              "type": "select",
              "label": "Připojení k WAN: ",
              "desc": "Zvolte funkci WAN portu",
              "show": true,
              "select": {
                "children": {
                  "dhcp": {
                    "default": true,
                    "label": "Automaticky (DHCP)",
                    "show": "none"
                  },
                  "static": {
                    "label": "Statické adresy",
                    "show": "static"
                  }
                }
              }
            },
            "wan-ip": {
              "type": "textfield",
              "label": "IP adresa: ",
              "desc": "Zadejte IP adresu",
              "showgroup": "wan-type",
              "showon": "static",
              "textfield": {
                "default": "192.168.1.100",
                "type": "ip"
              }
            },
            "wan-subnet": {
              "type": "textfield",
              "label": "Maska podsítě: ",
              "desc": "Zadejte masku podsítě",
              "showgroup": "wan-type",
              "showon": "static",
              "textfield": {
                "default": "255.255.255.0",
                "type": "subnet"
              }
            },
            "wan-gateway": {
              "type": "textfield",
              "label": "Výchozi brána: ",
              "desc": "Zadejte IP adresu výchozí brány",
              "showgroup": "wan-type",
              "showon": "static",
              "textfield": {
                "default": "192.168.1.1",
                "type": "ip"
              }
            },
            "wan-dns": {
              "type": "array",
              "label": "DNS servery: ",
              "desc": "Zadejte adresy serverů DNS",
              "showgroup": "wan-type",
              "showon": "static",
              "array": {
                "children-count": 3,
                "type": "ip"
              }
            }
          }
        },
        "lan": {
          "label": "LAN",
          "desc": "Nastavení připojení k síti LAN",
          "type": "subcategory",
          "showgroup": "wan-role",
          "showon": "nat",
          "children": {
            "lan-ip": {
              "type": "textfield",
              "label": "IP adresa: ",
              "desc": "Zadejte IP adresu",
              "textfield": {
                "default": "192.168.1.100",
                "type": "ip"
              }
            },
            "lan-subnet": {
              "type": "textfield",
              "label": "Maska podsítě: ",
              "desc": "Zadejte masku podsítě",
              "textfield": {
                "default": "255.255.255.0",
                "type": "subnet"
              }
            },
            "lan-gateway": {
              "type": "textfield",
              "label": "Výchozi brána: ",
              "desc": "Zadejte IP adresu výchozí brány",
              "textfield": {
                "default": "192.168.1.1",
                "type": "ip"
              }
            },
            "lan-dhcp-state": {
              "type": "select",
              "label": "Zapnout DHCP server: ",
              "desc": "Používat DHCP k dynamickému přidělování adres",
              "show": true,
              "select": {
                "children": {
                  "on": {
                    "default": true,
                    "type": "bool",
                    "label": "Ano"
                  },
                  "off": {
                    "type": "bool",
                    "label": "Ne"
                  }
                }
              }
            },
            "lan-dhcp-timeout": {
              "type": "textfield",
              "label": "Doba platnosti DHCP (v hodinách): ",
              "desc": "Doba platnosti DHCP zapůjčení v hodinách",
              "showgroup": "lan-dhcp-state",
              "showon": "on",
              "textfield": {
                "default": "60",
                "type": "int",
                "minValue": "5",
                "maxValue": "60"
              }
            },
            "lan-dhcp-range": {
              "type": "dhcprange",
              "label": "Rozsah DHCP (od, do): ",
              "desc": "2 adresy IPv4 nacházející se v zadané síti",
              "showgroup": "lan-dhcp-state",
              "showon": "on"
            }
          }
        }
      }
    },
    "wireless": {
      "label": "Bezdrátové",
      "type": "category",
      "img": "assets/wireless.png",
      "desc": "Bezdrátové připojení Wi-Fi, Bluetooth",
      "children": {
        "wifi": {
          "label": "Nastavení WiFi",
          "desc": "Nastavení WiFi",
          "type": "subcategory",
          "children": {
            "wifi-band": {
              "label": "Frekvenční pásmo: ",
              "desc": "Pokud nevíte, zvolte 2.4 GHz",
              "type": "dummyselect",
              "dummyselect": {
                "children": {
                  "option": {
                    "default": "2.4 GHz",
                    "label": "2.4 GHz"
                  }
                }
              }
            },
            "wifi-ssid": {
              "label": "Název sítě (SSID): ",
              "desc": "Název sítě (SSID)",
              "type": "textfield",
              "textfield": {
                  "default": "Smart House",
                  "type": "string",
                  "minLen": 1,
                  "maxLen": 16
              }
            },
            "wifi-proj-server": {
              "label": "Server vaší organizace: ",
              "desc": "Tento server bude používaný pro zabezpečení projekt",
              "type": "textfield",
              "serverfield": {
                  "default": "127.0.0.1:4000",
                  "type": "textfield",
                  "minLen": 1,
                  "maxLen": 16
              }
            },
            "wifi-hide": {
              "label": "Skrytá SSID: ",
              "desc": "Bude potřeba znát název sítě k připojení",
              "type": "checkbox",
              "checkbox": {
                  "default": false,
                  "type": "bool"
              }
            },
            "wifi-channel": {
              "type": "selectrange",
              "label": "Hlavní kanál: ",
              "desc": "Pokud nevíte, zvolte Auto",
              "selectrange": {
                "range": "1-11",
                "prepend": {
                  "auto": {
                    "label": "Auto"
                  }
                }
              }
            },
            "wifi-encryption": {
              "type": "select",
              "label": "Metoda ověření a šifrování: ",
              "desc": "Pokud nevíte vyberte projekt",
              "show": true,
              "select": {
                "children": {
                  "open": {
                    "label": "Žádné"
                  },
                  "wpa2psk": {
                   "label": "WPA2-PSK (AES)",
                   "default": true
                  },
                  "proj-open": {
                    "label": "Projekt Open"
                   },
                   "proj-open-pair": {
                    "label": "Projekt Open s párováním"
                   },
                  "proj-personal": {
                   "label": "Projekt Personal"
                  },
                  "proj-enterprise": {
                    "label": "Projekt Enterprise"
                   },
                }
              }
            },
            "wifi-wpa-key": {
              "type": "textfield",
              "label": "Heslo: ",
              "desc": "Zadejte heslo k wifi AP",
              "showon": "wpa2psk",
              "showgroup": "wifi-encryption",
              "textfield": {
                  "default": "",
                  "minLen": 8,
                  "maxLen": 63
              }
            },
            "wifi-wpa-rotation": {
              "type": "textfield",
              "label": "Doba obnovy klíče: ",
              "desc": "Pokud nevíte, zadejte 7200",
              "showon": "wpa2psk",
              "showgroup": "wifi-encryption",
              "textfield": {
                  "default": 3600,
                  "type": "number",
                  "minValue": 300,
                  "maxValue": 8600
              }
            },
            "wifi-proj-key": {
              "type": "textfield",
              "label": "Heslo: ",
              "desc": "Zadejte heslo k wifi AP",
              "showon": "proj-personal",
              "showgroup": "wifi-encryption",
              "textfield": {
                  "default": "",
                  "minLen": 5,
                  "maxLen": 255
              }
            },
            "wifi-proj-rotation": {
              "type": "textfield",
              "label": "Doba obnovy klíče: ",
              "desc": "Pokud nevíte, zadejte 3600",
              "showon": "proj-personal",
              "showgroup": "wifi-encryption",
              "textfield": {
                  "default": "3600",
                  "type": "number",
                  "minValue": 300,
                  "maxValue": 8600
              }
            },
            "wifi-proj-esetup": {
              "type": "modal",
              "label": "Nastavení API: ",
              "showgroup": "wifi-encryption",
              "showon": "proj-enterprise",
              "desc": "Pokud nevíte, toto nastavení neměňte",
              "modal": {
                "component": "emc-settings",
                "width": 600,
                "height": 400
              }
            }
          }
        },
        "wifi-advanced": {
          "label": "Pokročilé nastavení WiFi",
          "desc": "Pokročilé nastavení WiFi",
          "type": "subcategory",
          "children": {
            "wifi-hwmode": {
              "label": "Wifi standard: ",
              "desc": "Určuje rychlost připojení wifi",
              "type": "select",
              "select": {
                "children": {
                  "auto": {
                    "label": "Auto"
                  },
                  "n": {
                    "label": "Pouze N"
                  },
                  "g": {
                    "label": "Starší"
                  }
                }
              }
            },
            "wifi-channel-width": {
              "label": "Šířka kanálu: ",
              "desc": "Pokud nevíte, zvolte 20MHz",
              "type": "select",
              "select": {
                "children": {
                  "20": {
                    "label": "20 MHz"
                  },
                  "40": {
                    "default": true,
                    "label": "40 MHz"
                  }
                }
              }
            },
            "wifi-wmm": {
              "label": "Povolit WMM",
              "desc": "Pomáhá šetřit elektrickou energii",
              "type": "checkbox",
              "checkbox": {
                "default": true,
                "type": "bool"
              }
            }
          }
        },
        "beacon": {
          "type": "subcategory",
          "label": "Vytvořit beacon",
          "desc": "Vytvořit beacon (Eddysonet-UID/iBeacon)",
          "component": "advertiser"
        },
        "scanner": {
          "type": "subcategory",
          "label": "Vyhledat beacon",
          "desc": "Vyhledá okolní dostupná zařízení",
          "component": "scanner"
        }
      }
    },
    "firewall": {
      "type": "category",
      "label": "Firewall",
      "img": "assets/firewall.png",
      "desc": "Filtrování a kontrola toku dat",
      "children": {
        "firewall_simple": {
          "label": "Základní nastavení",
          "desc": "Základní nastavení firewallu",
          "type": "subcategory",
          "children": {
            "firewall_simple-enabled": {
              "type": "checkbox",
              "label": "Povolit firewall: ",
              "desc": "Pokud nevíte, toto nastavení neměňte",
              "show": true,
              "checkbox": {
                "default": true
              }
            },
            "firewall_simple-dos": {
              "type": "checkbox",
              "label": "DoS ochrana: ",
              "desc": "Pokud nevíte, toto nastavení neměňte",
              "showgroup": "firewall_simple-enabled",
              "showon": "enabled",
              "checkbox": {
                "default": true
              }
            },
            "firewall_simple-ping": {
              "type": "checkbox",
              "label": "Blokovat ping z WAN: ",
              "desc": "Pokud nevíte, toto nastavení neměňte",
              "showgroup": "firewall_simple-enabled",
              "showon": "enabled",
              "checkbox": {
                "default": false
              }
            },
            "firewall_simple-webservice": {
              "type": "select",
              "label": "Povolit vzdálenou konfiguraci: ",
              "desc": "Pokud nevíte, toto nastavení neměňte",
              "showgroup": "firewall_simple-enabled",
              "showon": "enabled",
              "select": {
                "children": {
                  "lan": {
                    "label": "Ne",
                    "default": true
                  },
                  "both": {
                    "label": "Ano"
                  }
                }
              }
            },
            "firewall_simple-ssh": {
              "type": "select",
              "label": "Povolit SSH: ",
              "desc": "Pokud nevíte, toto nastavení neměňte",
              "showgroup": "firewall_simple-enabled",
              "showon": "enabled",
              "select": {
                "children": {
                  "none": {
                    "label": "Ne",
                    "default": true
                  },
                  "lan": {
                    "label": "Pouze pro LAN"
                  },
                  "both": {
                    "label": "Všude"
                  }
                }
              }
            },
            "firewall_tls": {
              "type": "modal",
              "label": "Nastavení TLS: ",
              "desc": "Pokud nevíte, toto nastavení neměňte",
              "modal": {
                "component": "certutil",
                "width": 600,
                "height": 400
              }
            }
          }
        }
      }
    },
    "management": {
      "type": "category",
      "label": "Správa",
      "img": "assets/management.png",
      "desc": "Aktualizace firmwaru, změna hesla",
      "children": {
        "password": {
          "type": "subcategory",
          "label": "Změna hesla",
          "desc": "Změna přihlašovacího jména a hesla",
          "download": false,
          "children": {
            "oldUsername": {
              "type": "textfield",
              "label": "Uživatelské jméno: ",
              "desc": "Zadejte současné uživatelské jméno",
              "showon": "proj",
              "textfield": {
                "default": "",
                "minLen": 4,
                "maxLen": 16
              }
            },
            "oldPassword": {
              "type": "password",
              "label": "Heslo: ",
              "desc": "Zadejte současné přihlašovací heslo",
              "showon": "proj",
              "password": {
                "default": "",
                "minLen": 4,
                "maxLen": 32
              }
            },
            "username": {
              "type": "textfield",
              "label": "Nové jméno: ",
              "desc": "Zadejte nové uživatelské jméno (pokud prázdné, heslo bude zachováno)",
              "showon": "proj",
              "textfield": {
                "default": "",
                "minLen": 4,
                "maxLen": 16
              }
            },
            "password": {
              "type": "password",
              "label": "Nové heslo: ",
              "desc": "Zadejte nové heslo (pokud prázdné, heslo bude zachováno)",
              "showon": "proj",
              "password": {
                "default": "",
                "minLen": 4,
                "maxLen": 32
              }
            }
          }
        },
        "firmware": {
          "type": "subcategory",
          "label": "Aktualizace firmwaru",
          "desc": "Aktualizuje všechny součásti systému pomocí APT",
          "component": "firmware"
        }
      }
    }
});
  public appStructure = JSON.parse(this.rawStructure);
  public getStructure(type: string, category: string) {
      let navigationCategories: string[] = [];
      switch(type) {
        case "category":
          for(let item in this.appStructure) {
            navigationCategories.push(item);
          }
          break;
        case "subcategory":
          if(typeof this.appStructure[category] != 'undefined') {
            for(let item in this.appStructure[category]["children"]) {
              if(this.appStructure[category]["children"][item]['type'] == 'subcategory') {
                navigationCategories.push(item);
              }
            }
          }
          break;
      }
      return navigationCategories;
  }
  public lookFor(item: string) {
    if(Object.keys(this.appStructure).includes(item)) {
      return this.appStructure[item];
    } else {
      for(let category of Object.keys(this.appStructure)) {
        for(let subcategory of Object.keys(this.appStructure[category]["children"])) {
          if(subcategory == item) {
            return this.appStructure[category]["children"][subcategory];
          } else {
            if(typeof this.appStructure[category]["children"][subcategory]["children"] != 'undefined') {
              for(let element of Object.keys(this.appStructure[category]["children"][subcategory]["children"])) {
                if(element == item) {
                  return this.appStructure[category]["children"][subcategory]["children"][element];
                }
              }
            }
          }
        }
      }
    }
    return null;
  }
}
