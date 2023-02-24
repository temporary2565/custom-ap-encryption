import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../../login.service';
import { BeaconsSharedService } from '../../../beacons-shared.service';

@Component({
  selector: 'app-saved',
  templateUrl: './saved.component.html',
  styleUrls: ['../../../../styles/scanner.scss']
})
export class SavedComponent implements OnInit {
  saved: boolean = true;

  beaconsArr: string[];
  beacons: any;
  savedBeacons: any;
  supportedTypes: string[];

  sbo: any;

  constructor(public _loginService: LoginService, private _beaconsShared: BeaconsSharedService) {
    this._beaconsShared.savedObs.subscribe((_beacons) => {
      this.beaconsArr = Object.keys(_beacons);
      this.beacons = _beacons;
      if(this.saved) {
        for(let i of this.beaconsArr) {
          if(typeof this.beacons[this.beaconsArr[i]]['protocol'] == 'undefined') {
            this.beacons[this.beaconsArr[i]]['protocol'] = this.beacons[this.beaconsArr[i]]['type'];
          }
          this.beacons[this.beaconsArr[i]]['properties'] = {};
          let old = JSON.parse(JSON.stringify(this.beacons[this.beaconsArr[i]]));
          delete old.properties;
          this.beacons[this.beaconsArr[i]]['properties'] = old;
        }
      }
    });
    this.supportedTypes = ['eddystone-uid', 'ibeacon'];
    if(!this.saved) {
      this.sbo = _loginService.savedBeaconsObs.subscribe(e => {
        this.savedBeacons = e
      });
    }
    console.log(JSON.stringify(this.beacons));
  }

  isType(variable) {
    // Vrací typ hodnoty, nutný pro direktivy
    return typeof variable;
  }

  isAlreadyAdded(parameters) {
    let is = false;
    if(!this.saved) {
      for(let beacon of Object.keys(this.savedBeacons)) {
        if(this.savedBeacons[beacon].type == 'eddystone-uid') {
          if(this.savedBeacons[beacon].namespace == parameters[0] && this.savedBeacons[beacon].instance == parameters[1]) {
            is = true;
          }
        } else if(this.savedBeacons[beacon].type == 'ibeacon') {
          if(this.savedBeacons[beacon].uuid == parameters[0] && this.savedBeacons[beacon].major == parseInt(parameters[1]) && this.savedBeacons[beacon].minor == parseInt(parameters[2]))  {
            is = true;
          }
        }
      }
    }
    return is;
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if(typeof this.sbo != 'undefined') {
      this.sbo.unsubscribe();
    }
  }
}
