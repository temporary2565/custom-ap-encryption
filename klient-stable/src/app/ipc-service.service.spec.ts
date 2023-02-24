import { TestBed } from '@angular/core/testing';

import { IpcServiceService } from './ipc-service.service';

describe('IpcServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: IpcServiceService = TestBed.get(IpcServiceService);
    expect(service).toBeTruthy();
  });
});
