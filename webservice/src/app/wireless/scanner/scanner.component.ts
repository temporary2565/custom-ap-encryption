import { Component, OnInit, OnDestroy } from '@angular/core';
import { LoginService } from '../../login.service';
import { BeaconsSharedService } from '../../beacons-shared.service';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['../../../styles/scanner.scss']
})
export class ScannerComponent implements OnInit, OnDestroy {
  beaconsArr: string[];
  beacons: any;
  savedBeaconsArr: string[];
  savedBeacons: any;

  bo: any;
  sbo: any;

  constructor(public _loginService: LoginService, public _beaconsShared: BeaconsSharedService) {
    this.bo = _loginService.beaconsObs.subscribe(e => {
      this.beaconsArr = Object.keys(e);
      this.beacons = e;
      this._beaconsShared.scannerObserver.next(e);
    })
    this.sbo = _loginService.savedBeaconsObs.subscribe(e => {
      this.savedBeaconsArr = Object.keys(e);
      this.savedBeacons = e;
      this._beaconsShared.savedObserver.next(e);
    });
    _loginService.getBeacons();
    setInterval(() => _loginService.getBeacons(), 1000);
    setInterval(() => _loginService.getSavedBeacons(), 1000);
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.bo.unsubscribe();
    this.sbo.unsubscribe();
  }
}
