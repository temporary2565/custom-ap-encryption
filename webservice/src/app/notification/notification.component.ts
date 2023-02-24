import { Component, OnInit, ComponentRef } from '@angular/core';
import { IModalDialog, IModalDialogOptions, IModalDialogButton } from 'ngx-modal-dialog';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['../../styles/notifier.scss']
})
export class NotificationComponent implements OnInit, IModalDialog {
  actionButtons: IModalDialogButton[];
  arr: any[] = [];
  iconSize: number = 16;
  constructor(public _notificationService: NotificationService) {
    this.actionButtons = [{ text: "Zavřít", onAction: () => true }];
    this._notificationService.PendingRequestsObs.subscribe((x) => {
      console.log(x)
      this.arr = x;
    });
  }

  ngOnInit() {
  }

  dialogInit(reference: ComponentRef<IModalDialog>, options: Partial<IModalDialogOptions<any>>) {
  }

}
