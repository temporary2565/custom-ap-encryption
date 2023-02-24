import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../login.service';

@Component({
  selector: 'app-advertiser',
  templateUrl: './advertiser.component.html',
  styleUrls: ['../../../styles/advertiser.scss']
})
export class AdvertiserComponent implements OnInit {
  beacons: any[] = [];
  beaconsRT: any[] = [];
  hasBeacons: boolean = false;
  beaconsArr: string[] = [];
  max: any = {
    'eddystone-uid': 1,
    'ibeacon': 1
  }
  maxTotal: number = 1;
  exceptions: any = {
    'EFULL': false,
    'EINVALID': false,
    'ERR': false,
    'SUCCESS': false
  }
  errmsg: string;
  validation: any = {
    'namespace': '/^[0-9a-f]{20}$/i',
    'instance': '/^\\d{12}$/',
    'type': '/^(eddystone\\-uid|ibeacon)$/',
    'uuid': '/^[0-9a-f]{32}$/i',
    'major': '@num-1-65535',
    'minor': '@num-1-65535'
  }
  invalid: string[] = [];

  constructor(public _loginService: LoginService) {
    this._loginService.advertisedBeaconsObs.subscribe(e => {
      if(_loginService.hasAdvertisedBeacons) {
        this.beaconsRT = Object.assign([], e);
        if(!this.hasBeacons || this._loginService.updateAdvertisedBeacons) {
          this.beacons = Object.assign([], e);
          this.beaconsArr = Object.keys(e);
          this._loginService.updateAdvertisedBeacons = false;
        }
        this.hasBeacons = true;
      }
    });
  }

  update() {
    this.beacons = Object.assign([], this.beaconsRT);
    this.beaconsArr = Object.keys(this.beacons);
  }

  addBeacon() {
    if(this.isAvailable('eddystone-uid') && Object.keys(this.beacons).length < this.maxTotal) {
      this.beacons.push({
        namespace: this.generateName('eddystone-uid'),
        instance: '0'.repeat(12),
        type: 'eddystone-uid',
        active: false,
        security: false
      });
      this.beaconsArr = Object.keys(this.beacons);
    } else if(this.isAvailable('ibeacon') && Object.keys(this.beacons).length < this.maxTotal) {
      this.beacons.push({
        uuid: this.generateName('ibeacon'),
        major: 0,
        minor: 0,
        type: 'ibeacon',
        active: false,
        security: false
      });
      this.beaconsArr = Object.keys(this.beacons);
    } else {
      if(Object.keys(this.beacons).length >= this.maxTotal) {
        this.except('EFULL', 'Unable to add any more beacons, maximum limit reached (maximum '+this.maxTotal+' beacon' + ((this.maxTotal == 1) ? '' : 's') + ')');
      } else {
        this.except('EFULL', 'Unable to add any more beacons, maximum limit reached (maximum '+this.max['ibeacon']+' iBeacons and '+this.max['eddystone-uid']+' Eddystone UIDs)');
      }
    }
  }

  updateType() {
    for(let beacon of Object.keys(this.beacons)) {
      if(this.beacons[beacon].type == "eddystone-uid") {
        if(typeof this.beacons[beacon]['uuid'] != 'undefined') {
          delete this.beacons[beacon]['uuid'];
          delete this.beacons[beacon]['major'];
          delete this.beacons['minor'];
          this.beacons[beacon]['namespace'] = this.generateName('eddystone-uid');
          this.beacons[beacon]['instance'] = '0'.repeat(12);
        }
      } else if(this.beacons[beacon].type == "ibeacon") {
        if(typeof this.beacons[beacon]['namespace'] != 'undefined') {
          delete this.beacons[beacon]['namespace'];
          delete this.beacons[beacon]['instance'];
          this.beacons[beacon]['uuid'] = this.generateName('ibeacon');
          this.beacons[beacon]['major'] = 0;
          this.beacons[beacon]['minor'] = 0;
        }
      }
    }
  }

  removeBeacon(item: string) {
    this.beacons.splice(this.beaconsArr.indexOf(item), 1);
    this.beaconsArr.splice(this.beaconsArr.indexOf(item), 1);
  }

  isAvailable(type) {
    let count: any = {
      'ibeacon': 0,
      'eddystone-uid': 0
    }
    let usable: any = {
      'ibeacon': false,
      'eddystone-uid': false
    }
    for(let beacon of this.beaconsArr) {
      if(Object.keys(count).includes(this.beacons[beacon].type)) {
        count[this.beacons[beacon].type]++;
      }
    }
    for(let item of Object.keys(count)) {
      if(this.max[item] > count[item]) {
        usable[item] = true;
      }
    }
    return usable[type];
  }

  generateName(type) {
    let toReturn: string = '';
    switch(type) {
      case "eddystone-uid":
        for(let i=0;i<20;i++)
          toReturn += Math.floor(Math.random()*16).toString(16);
        break;
      case "ibeacon":
        for(let i=0;i<32;i++)
          toReturn += Math.floor(Math.random()*16).toString(16);
        break;
    }
    return toReturn;
  }

  except(_error, msg) {
    if(_error != 'SUCCESS') {
      this.errmsg = msg;
      this.exceptions[_error] = true;
      this.exceptions['ERR'] = true;
    } else {
      this.exceptions['SUCCESS'] = true;
    }
    setTimeout(() => {this.exceptions[_error]=false;this.exceptions['ERR']=false}, 4000);
  }

  checkField(event) {
    let params = event.target.name.toString().split(',');
    let type = params[params.length-1];
    if(!this.isValid(event.target.value, type)) {
      if(!this.invalid.includes(params)) {
        this.invalid.push(event.target.name.toString());
        this.except('EINVALID', 'Nebyla zadána platná hodnota');
        setTimeout(() => this.invalid.splice(this.invalid.indexOf(event.target.name.toString()), 1), 2000)
      }
    } else {
      if(this.invalid.includes(params))
        this.invalid.splice(this.invalid.indexOf(event.target.name.toString()), 1);
    }
  }

  isValid(text: any, type: string) {
    if(type != 'apply') {
      let condition = this.validation[type];
      if(!condition.toString().startsWith('@num')) {
        let rgx = new RegExp(condition.toString().split('/')[1], condition.toString().split('/')[2]);
        return rgx.test(text);
      } else {
        return (parseInt(text) >= parseInt(condition.toString().split('-')[1]) && parseInt(condition.toString().split('-')[2]) >= parseInt(text));
      }
    } else {
      if(typeof text == 'boolean') {
        return true;
      } else {
        return false;
      }
    }
  }

  duplicateCheck(newBeacon) {
    let toReturn = true;
    for(let beacon of this.beaconsArr) {
      if(this.beacons[beacon].type == newBeacon.type) {
        if((this.beacons[beacon].type == 'ibeacon' && this.beacons[beacon].major == newBeacon.major && this.beacons[beacon].minor == newBeacon.minor && this.beacons[beacon].uuid == newBeacon.uuid)
          || (this.beacons[beacon].type == 'eddystone-uid' && this.beacons[beacon].namespace == newBeacon.namespace && this.beacons[beacon].instance == newBeacon.instance)) {
            toReturn = false;
          }
      }
    }
    return toReturn;
  }

  updateView(event, index) {
    let key = event.target.name.toString().split(',')[1];
    let value = event.target.value;
    if(event.target.type == 'text') {
      let newBeacon = JSON.parse(JSON.stringify(this.beacons[index]));
      newBeacon[key] = value;
      if(this.duplicateCheck(newBeacon) && this.isValid(value, key)) {
        this.beacons[index][key] = value;
      } else {
        event.target.value = this.beacons[index][key];
        this.beaconsArr = Object.keys(this.beacons);
      }
    } else if (event.target.type == 'checkbox') {
      this.beacons[index][key] = event.target.checked;
    } else if (event.target.tagName == 'SELECT') {
      if(this.isAvailable(value)) {
        this.beacons[index][key] = event.target.value;
        this.updateType();
        this.beaconsArr = Object.keys(this.beacons);
      } else {
        event.target.value = this.beacons[index][key];
        this.beaconsArr = Object.keys(this.beacons);
      }
    }
  }

  ngOnInit() {
  }

}
