import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as hash from 'md5';
import { BehaviorSubject, Observable } from 'rxjs';

import { FormService } from './form.service';

// Služba ke komunikaci s nastavovacím serverem, který odpovídá pomocí express frameworku

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  public isProd = true; // Proměnná kvůli vypnutí přihlášení při testování
  public _sessionId: string = '';
  public _errors: string[] = [];
  public authenticated: boolean = false;
  public serverConfig: any = {};
  public defaultConfig: any = {};
  public hasConfig: boolean = false;
  public status: any = {};
  public hasStatus: boolean = false;
  public beacons: any = {};
  public tls: any = {};
  public apiKeys: string[] = [];
  public hasBeacons: boolean = false;
  public beaconsObserver = new BehaviorSubject<any>(this.beacons);
  public beaconsObs = this.beaconsObserver.asObservable();
  public savedBeaconsObserver = new BehaviorSubject<any>({});
  public savedBeaconsObs = this.savedBeaconsObserver.asObservable();
  public hasSavedBeacons: boolean = false;
  public advertisedBeaconsObserver = new BehaviorSubject<any[]>([]);
  public advertisedBeaconsObs = this.advertisedBeaconsObserver.asObservable();
  public hasAdvertisedBeacons: boolean = false;
  public updateAdvertisedBeacons: boolean = false;
  public successAdvertisedBeacons: boolean = false;
  public successTimeoutAdvertisedBeacons: number = 0;
  public errorAdvertisedBeacons: boolean = false;
  public errorTimeoutAdvertisedBeacons: number = 0;
  public pairPendingSubject = new BehaviorSubject<any[]>([]);
  public pairPendingObs = this.pairPendingSubject.asObservable();
  
  constructor(public http: HttpClient, public _formService: FormService, public _router: Router) {
    if(localStorage.getItem('auth') !== null) {
      this._sessionId = localStorage.getItem('auth');
    }
    this.verifySessionId();
    this.getConfig();
    this.getStatus();
    this.getBeacons();
    this.getPairings();
    this.getEMCKeys();
    setInterval(() => {
      if(this.successTimeoutAdvertisedBeacons > 0) {
        this.successTimeoutAdvertisedBeacons--;
      }
      if(this.successTimeoutAdvertisedBeacons == 0) {
        this.successAdvertisedBeacons = false;
      }
      if(this.errorTimeoutAdvertisedBeacons > 0) {
        this.errorTimeoutAdvertisedBeacons--;
      }
      if(this.errorTimeoutAdvertisedBeacons == 0) {
        this.errorAdvertisedBeacons = false;
      }
    }, 1000)
  }

  // Komunikace se serverem, uložení id přihlášení do localstorage a ověření přihlášení
  async getSessionId(_user, _pwd) {
    // Přihlášení k serveru
    if(this.isProd) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/auth", { "user":_user, "pwd":hash(_pwd) })
          .toPromise()
          .then(
            (res) => {
              jsondata = res;
              resolve();
            }
          )
          .catch(
            (err) => {
              this.authenticated = false;
            }
          );
        });
      if(jsondata['authenticated']) {
        await localStorage.setItem('auth', jsondata['session']);
        if(localStorage.getItem('auth') == jsondata['session']) {
          this._sessionId = await localStorage.getItem('auth');
          this.authenticated = true;
          this.getConfig();
        } else {
          this.authenticated = false;
          this.defaultConfig = {};
          this.serverConfig = {};
        }
      }
    } else {
      this.authenticated = true;
    }
  }

  async removeSessionId() {
    // Přihlášení k serveru
    let jsondata;
    await new Promise((resolve, reject) => {
      this.http.post("/deauth", { "session":this._sessionId })
        .toPromise()
        .then(
          (res) => {
            jsondata = res;
            resolve();
          }
        )
        .catch(
          (err) => {
            this.authenticated = false;
          }
        );
        ;
      });
    if(!jsondata['authenticated']) {
      await localStorage.clear();
      this._sessionId = '';
      this.authenticated = false;
      this._router.navigate(['']);
      this.serverConfig = {};
      this.defaultConfig = {};
    }
  }
  
  // Ověření příhlášení
  async verifySessionId() {
    if(this.isProd) {
      if(this._sessionId.length > 4) {
        let jsondata;
        await new Promise((resolve, reject) => {
          this.http.post("/session", { "session":this._sessionId })
            .toPromise()
            .then(
              (res) => {
                jsondata = res;
                resolve();
              }
            )
            .catch(
              (err) => {
                this.authenticated = false;
                this._router.navigate(['']);
                this.defaultConfig = {};
                this.serverConfig = {};
              }
            );
          });
        if(jsondata['authenticated']) {
          if(localStorage.getItem('auth') == this._sessionId) {
            this.authenticated = await true;
          } else {
            this.authenticated = false;
            this._router.navigate(['']);
            this.defaultConfig = {};
            this.serverConfig = {};
          }
        } else {
          this.authenticated = false;
          this._router.navigate(['']);
          this.defaultConfig = {};
          this.serverConfig = {};
        }
      }
    } else {
      this.authenticated = true;
    }
  }

  parseConfig() {
    if(this.authenticated) {
      this.savedBeaconsObserver.next(this.serverConfig['beacons']['saved']);
      this.hasAdvertisedBeacons = true;
      this.advertisedBeaconsObserver.next(this.serverConfig['beacons']['advertised']);
      this.tls = this.serverConfig.tls;
      delete this.serverConfig['beacons'];
      delete this.serverConfig['updated'];
      delete this.serverConfig['tls'];
      for(let category of Object.keys(this.serverConfig)) {
        if(typeof this.serverConfig[category] != ('string' && 'number' && 'undefined') && this.serverConfig[category] != "updated") {
          for(let item of Object.keys(this.serverConfig[category])) {
            this.defaultConfig[item] = this.serverConfig[category][item];
          }
        }
      }
    }
  }

  // Získání aktuální konfigurace ze serveru
  async getConfig() {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/get", { "session":this._sessionId })
          .toPromise()
          .then(
            (res) => {
              jsondata = JSON.parse(res.toString());
              if(jsondata['authenticated']) {
                delete jsondata.authenticated;
                this.serverConfig = jsondata;
                this.defaultConfig = jsondata;
                this.hasConfig = true;
                this._formService.dnsArr = this.defaultConfig['wan']['wan-dns'];
                this.parseConfig();
              } else {
                this.kickOut();
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut();
            }
          );
        }
      );
    }
  }

  async getStatus() {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/status", { "session":this._sessionId })
          .toPromise()
          .then(
            (res) => {
              jsondata = JSON.parse(res.toString());
              if(jsondata['authenticated']) {
                delete jsondata.authenticated;
                console.log(jsondata.beacons.advertised);
                this.advertisedBeaconsObserver.next(jsondata.beacons.advertised);
                delete jsondata.beacons;
                this.status = jsondata;
                this.hasStatus = true;
              } else {
                this.kickOut();
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut();
            }
          );
        }
      );
    }
  }

  async getBeacons() {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/beacons", { "session":this._sessionId })
          .toPromise()
          .then(
            (res) => {
              jsondata = JSON.parse(res.toString());
              if(jsondata['authenticated']) {
                delete jsondata.authenticated;
                this.beacons = jsondata;
                this.beaconsObserver.next(this.beacons);
                this.hasBeacons = true;
              } else {
                this.kickOut();
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut();
            }
          );
        }
      );
    }
  }

  async addSavedBeacons(value:any, namespace: string, _removal: boolean) {
    let removal = _removal || false;
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        let valueObj: any;
        if(value.protocol == 'ibeacon') {
          valueObj = {
            "uuid": namespace.split(',')[0],
            "minor": ((removal) ? value.minor : value.properties.minor),
            "major": ((removal) ? value.major : value.properties.major),
            "type": ((removal) ? value.type : value.protocol)
          }
        } else if(value.protocol == 'eddystone-uid') {
          valueObj = {
            "namespace": namespace.split(',')[0],
            "instance": ((removal) ? value.instance : value.properties.instance),
            "type": ((removal) ? value.type : value.protocol)
          }
        }
        this.http.post("/modify", {
          "session":this._sessionId,
          "action": "beacons-saved-" + ((removal) ? "rem" : "add"),
          "value": valueObj
        })
          .toPromise()
          .then(
            (res) => {
              jsondata = JSON.parse(res.toString());
              if(!jsondata['authenticated']) {
                //this.kickOut();
                // this.kickOut temporarily commented: Known Issue
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              //this.kickOut();
            }
          );
        }
      );
    }
  }

  async modifyAdvertisedBeacons(beacons: any[]) {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/modify", {
          "session":this._sessionId,
          "action": "beacons-advertised-update",
          "value": {current: beacons}
        })
          .toPromise()
          .then(
            (res) => {
              jsondata = JSON.parse(res.toString());
              console.log(jsondata)
              if(!jsondata['authenticated']) {
                this.kickOut();
              } else {
                if(jsondata['success']) {
                  this.updateAdvertisedBeacons = true;
                  this.successAdvertisedBeacons = true;
                  this.successTimeoutAdvertisedBeacons = 2;
                } else {
                  this.errorAdvertisedBeacons = true;
                  this.errorTimeoutAdvertisedBeacons = 2;
                }
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              this.errorAdvertisedBeacons = true;
              this.errorTimeoutAdvertisedBeacons = 2;
              this.kickOut();
            }
          );
        }
      );
    }
  }

  async getSavedBeacons() {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/modify", { "session": this._sessionId, "action": "beacons-saved-get", "value": "none" })
          .toPromise()
          .then(
            (res) => {
              jsondata = JSON.parse(res.toString());
              if(jsondata['authenticated']) {
                if(jsondata['success']) {
                  this.savedBeaconsObserver.next(jsondata['value']);
                  this.hasSavedBeacons = true;
                } else {
                  this.hasSavedBeacons = false;
                }
              } else {
                this.kickOut();
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut();
            }
          );
        }
      );
    }
  }

  getDefault(item) {
    return (typeof this.defaultConfig[item] != 'undefined') ? this.defaultConfig[item] : '';
  }

  async getPairings() {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/get-pair", { "session": this._sessionId })
          .toPromise()
          .then(
            (res) => {
              jsondata = Object.assign({}, res);
              if(jsondata['authenticated']) {
                if(jsondata['success']) {
                  this.pairPendingSubject.next(jsondata['value']);
                }
              } else {
                this.kickOut();
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              console.log(err);
              this.kickOut();
            }
          );
        }
      );
    }
  }

  async modifyPairings(id: string, action: string) {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.post("/pair", {
          "session": this._sessionId,
          "action": action,
          "id": id
        })
          .toPromise()
          .then(
            (res) => {
              jsondata = Object.assign({}, res);
              if(!jsondata['authenticated']) {
                this.kickOut();
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut();
            }
          );
        }
      );
    }
  }

  async getEMCKeys() {
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.get("/emc", { params: {"session": this._sessionId, "action": "get"} })
          .toPromise()
          .then(
            (res) => {
              jsondata = Object.assign({}, res);
              if(jsondata['authenticated']) {
                if(jsondata['success']) {
                  let i = 0;
                  for(let item of jsondata.value) {
                    this.apiKeys[i] = decodeURIComponent(item);
                    i++;
                  }
                }
              } else {
                this.kickOut();
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut();
            }
          );
        }
      );
    }
  }

  async addAPIKey() {
    /*let params = new HttpParams();
    params.append("session", this._sessionId);
    params.append("action", "generate");*/
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.get("/emc", {params: {session: this._sessionId, action: "generate"}})
          .toPromise()
          .then(
            (res) => {
              console.log(res)
              jsondata = Object.assign({}, res);
              if(!jsondata['authenticated']) {
                this.kickOut();
              }
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut();
            }
          );
        }
      );
    }
  }

  async deleteAPIKey(key: string) {
    /*let params = new HttpParams();
    params.append("session", this._sessionId);
    params.append("action", "delete");
    params.append("key", key);*/
    if(this._sessionId.length > 4) {
      let jsondata;
      await new Promise((resolve, reject) => {
        this.http.get("/emc", { params: {session: this._sessionId, action: "delete", key: key} })
          .toPromise()
          .then(
            (res) => {
              jsondata = Object.assign({}, res);
              if(!jsondata['authenticated']) {
                this.kickOut();
              }
              console.log(jsondata)
              resolve();
            }
          )
          .catch(
            (err) => {
              this.kickOut();
            }
          );
        }
      );
    }
  }

  public kickOut() {
    this.authenticated = false;
    this._router.navigate(['']);
    this.hasBeacons = false;
    this.hasSavedBeacons = false;
    this.hasStatus = false;
    this.hasConfig = false;
  }
}
