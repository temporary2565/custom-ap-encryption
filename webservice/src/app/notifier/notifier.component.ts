import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { ModalDialogService } from 'ngx-modal-dialog';
import { NotificationComponent } from '../notification/notification.component';
import { LoginService } from '../login.service';

@Component({
  selector: 'app-notifier',
  templateUrl: './notifier.component.html',
  styleUrls: ['../../styles/notifier.scss']
})
export class NotifierComponent implements OnInit {
  public count: number = 0;
  constructor(public _modal: ModalDialogService, public _viewRef: ViewContainerRef, public _loginService: LoginService) {
    this._loginService.pairPendingObs.subscribe((x) => {
      this.count = Object.assign([], x).filter((x) => x.status == "requested").length;
    })
    setInterval(() => _loginService.getPairings(), 1000);
  }

  showModal(modal :string) {
    switch(modal) {
      case "notification":
        this._modal.openDialog(this._viewRef, {
          title: 'Oznámení',
          childComponent: NotificationComponent
        });
        break;
    }
  }

  ngOnInit() {
    
  }

}
