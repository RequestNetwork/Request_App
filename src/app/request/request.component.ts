import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Web3Service } from '../util/web3.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import blockies from 'blockies';

import { PayDialogComponent } from '../util/dialogs/pay-dialog.component';
import { SubtractDialogComponent } from '../util/dialogs/subtract-dialog.component';
import { AdditionalDialogComponent } from '../util/dialogs/additional-dialog.component';

@Component({
  selector: 'app-request',
  templateUrl: './request.component.html',
  styleUrls: ['./request.component.scss'],
})
export class RequestComponent implements OnInit {
  blockies = blockies;
  objectKeys = Object.keys;
  account: string;
  mode: string;
  request: any;
  progress: number;
  url: string;
  copyUrlTxt: string = 'Copy url';
  txHash: string;

  constructor(public web3Service: Web3Service, private route: ActivatedRoute, private dialog: MatDialog) {
    this.url = window.location.href;
  }

  async ngOnInit() {
    // wait for web3 to be instantiated
    if (!this.web3Service || !this.web3Service.ready) {
      const delay = new Promise(resolve => setTimeout(resolve, 1000));
      await delay;
      return await this.ngOnInit();
    }

    this.web3Service.request.subscribe(async request => {
      this.setRequest(request);
      if (request.requestId) {
        history.pushState(null, null, `/#/request/requestId/${this.request.requestId}`);
      }
    })

    if (this.route.snapshot.params['requestId']) {
      this.web3Service.setSearchValue(this.route.snapshot.params['requestId']);
    } else if (this.route.snapshot.params['txHash']) {
      this.txHash = this.route.snapshot.params['txHash'];
      // if queryParams get Request from queryParams
      if (Object.keys(this.route.snapshot.queryParams).length > 0 && this.route.snapshot.queryParams.expectedAmount && this.route.snapshot.queryParams.payer && this.route.snapshot.queryParams.payee) {
        let queryRequest = {
          requestId: 'waiting for blockchain response...',
          expectedAmount: this.web3Service.BN(this.web3Service.toWei(this.route.snapshot.queryParams.expectedAmount)),
          balance: this.web3Service.BN(this.web3Service.toWei('0')),
          payer: this.route.snapshot.queryParams.payer,
          payee: this.route.snapshot.queryParams.payee,
          data: { data: {} }
        }
        Object.keys(this.route.snapshot.queryParams).forEach((key) => {
          if (!queryRequest[key])
            queryRequest.data.data[key] = this.route.snapshot.queryParams[key];
        })
        this.setRequest(queryRequest);
      }

      // get Request from txHash
      let result = await this.web3Service.getRequestByTransactionHashAsync(this.txHash);
      if (result && result.requestId) {
        this.setRequest(result);
        history.pushState(null, null, `/#/request/requestId/${this.request.requestId}`);
      }
    }
  }


  setRequest(request) {
    if (request.state && request.requestId) this.url = `${window.location.protocol}//${window.location.host}/#/request/requestId/${request.requestId}`;
    this.request = request;
    this.watchAccount();
    this.progress = 100 * this.request.balance / this.request.expectedAmount;
  }


  watchAccount() {
    if (!this.account && this.web3Service.accounts) {
      this.account = this.web3Service.accounts[0];
      this.getRequestMode()
    }
    this.web3Service.accountsObservable.subscribe(accounts => {
      this.account = accounts[0];
      this.getRequestMode()
    });
  }


  getRequestMode() {
    return this.mode = this.account && this.account == this.request.payee ? 'payee' : this.account && this.account == this.request.payer ? 'payer' : 'none';
  }


  copyToClipboard() {
    this.copyUrlTxt = 'Copied!';
    setTimeout(() => { this.copyUrlTxt = 'Copy url & share' }, 500);
  }


  callbackTx(response) {
    if (response.transactionHash) {
      this.txHash = response.transactionHash;
      this.web3Service.openSnackBar('Transaction in progress.', 'Ok', 'success-snackbar');
    } else if (response.message) {
      this.web3Service.openSnackBar(response.message);
    }
  };


  cancelRequest() {
    this.web3Service.cancel(this.request.requestId, response => this.callbackTx(response));
  }


  acceptRequest() {
    this.web3Service.accept(this.request.requestId, response => this.callbackTx(response));
  }


  subtractRequest() {
    let subtractDialogRef = this.dialog.open(SubtractDialogComponent, {
      hasBackdrop: true,
      width: '350px',
      data: {
        request: this.request
      }
    });

    subtractDialogRef
      .afterClosed()
      .subscribe(subtractValue => {
        if (subtractValue)
          this.web3Service.subtractAction(this.request.requestId, subtractValue, response => this.callbackTx(response));
      });
  }


  additionalRequest() {
    let additionalDialogRef = this.dialog.open(AdditionalDialogComponent, {
      hasBackdrop: true,
      width: '350px',
      data: {
        request: this.request
      }
    });

    additionalDialogRef
      .afterClosed()
      .subscribe(subtractValue => {
        if (subtractValue)
          this.web3Service.additionalAction(this.request.requestId, subtractValue, response => this.callbackTx(response));
      });
  }


  payRequest() {
    let payDialogRef = this.dialog.open(PayDialogComponent, {
      hasBackdrop: true,
      width: '350px',
      data: {
        request: this.request
      }
    });

    payDialogRef
      .afterClosed()
      .subscribe(amountValue => {
        if (amountValue)
          this.web3Service.paymentAction(this.request.requestId, amountValue, response => this.callbackTx(response));
      });
  }


}
