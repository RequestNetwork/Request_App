import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Web3Service } from '../../util/web3.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { PayDialogComponent } from '../../util/dialogs/pay-dialog.component';
import { SubtractDialogComponent } from '../../util/dialogs/subtract-dialog.component';
import { AdditionalDialogComponent } from '../../util/dialogs/additional-dialog.component';
import { RefundDialogComponent } from '../../util/dialogs/refund-dialog.component';

@Component({
  selector: 'app-request',
  templateUrl: './request.component.html',
  styleUrls: ['./request.component.scss']
})
export class RequestComponent implements OnInit, OnDestroy {
  objectKeys = Object.keys;
  account: string;
  mode: string;
  requestObject: any;
  request: any;
  progress: number;
  url = window.location.href;
  copyUrlTxt = 'Copy url';
  txHash: string;
  subscription: any;
  timerInterval: any;
  timeOuts = [];
  loading = false;

  constructor(
    public web3Service: Web3Service,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    if (!this.web3Service || !this.web3Service.web3Ready) {
      await new Promise(resolve =>
        this.timeOuts.push(setTimeout(resolve, 1000))
      );
      return this.ngOnInit();
    }
    this.watchAccount();

    this.subscription = this.web3Service.searchValue.subscribe(
      async searchValue => {
        if (searchValue && searchValue.length > 42) {
          this.requestObject = null;
          this.request = null;
          this.requestObject = await this.web3Service.getRequestByRequestId(
            searchValue
          );
          await this.setRequest(this.requestObject.requestData || {});
          this.loading = false;
        }
      }
    );

    if (this.route.snapshot.params['requestId']) {
      this.web3Service.setSearchValue(this.route.snapshot.params['requestId']);
    } else if (this.route.snapshot.params['txHash']) {
      this.txHash = this.route.snapshot.params['txHash'];
      this.watchRequestByTxHash();
    }

    // watch Request in background
    this.timerInterval = setInterval(async () => {
      if (
        !this.requestObject ||
        !this.requestObject.requestId ||
        this.loading
      ) {
        return;
      }
      const rd = await this.requestObject.getData();
      this.requestObject.requestData = rd;
      await this.setRequest(this.requestObject.requestData);
    }, 10000);
  }

  async watchTxHash(txHash) {
    const result = await this.web3Service.getRequestByTransactionHash(txHash);
    if (result.request && result.request.requestId) {
      this.timeOuts.push(
        setTimeout(async () => {
          if (result.request.requestId && this.requestObject.requestId) {
            const rd = await this.requestObject.getData();
            this.requestObject.requestData = rd;
            await this.setRequest(this.requestObject.requestData);
          }
          this.loading = false;
        }, 5000)
      );
    } else {
      await new Promise(resolve =>
        this.timeOuts.push(setTimeout(resolve, 5000))
      );
      this.watchTxHash(txHash);
    }
  }

  async watchRequestByTxHash() {
    if (this.requestObject) {
      return console.log('stopped watching txHash');
    }
    const result = await this.web3Service.getRequestByTransactionHash(
      this.txHash
    );
    if (result.request && result.request.requestId) {
      const blockNumber = await this.web3Service.getBlockNumber();
      // wait 1 confirmation
      console.log(blockNumber - result.transaction.blockNumber);
      if (blockNumber - result.transaction.blockNumber > 0) {
        return this.web3Service.setSearchValue(result.request.requestId);
      }
    } else if (result.message === 'Contract is not supported by request') {
      return await this.setRequest({
        errorTxHash:
          'Sorry, we are unable to locate any request matching this transaction hash'
      });
    } else if (result.transaction) {
      const request = await this.web3Service.buildRequestFromCreateRequestTransactionParams(
        result.transaction
      );
      await this.setRequest(request);
    } else if (this.route.snapshot.queryParams.request) {
      if (!this.request || !this.request.waitingMsg) {
        const queryParamRequest = JSON.parse(
          atob(this.route.snapshot.queryParams.request)
        );
        if (
          queryParamRequest.payee &&
          queryParamRequest.payee.address &&
          queryParamRequest.payee.balance &&
          queryParamRequest.payee.expectedAmount &&
          queryParamRequest.payer
        ) {
          const request = queryParamRequest;
          request.payee.balance = this.web3Service.BN(
            this.web3Service.toWei('0')
          );
          request.payee.expectedAmount = this.web3Service.BN(
            this.web3Service.toWei(queryParamRequest.payee.expectedAmount)
          );
          await this.setRequest(request);
        }
      }
    } else {
      return await this.setRequest({
        errorTxHash: 'Sorry, we are unable to locate this transaction hash'
      });
    }
    await new Promise(resolve => this.timeOuts.push(setTimeout(resolve, 5000)));
    this.watchRequestByTxHash();
  }

  async setRequest(request) {
    // if new search
    if (
      request &&
      request.requestId &&
      (((!this.request || !this.request.requestId) &&
        this.route.snapshot.params['txHash']) ||
        (this.request &&
          this.request.requestId &&
          this.request.requestId !== request.requestId))
    ) {
      // this.request = null;
      history.pushState(
        null,
        null,
        `/#/request/requestId/${request.requestId}`
      );
      this.url = `${window.location.protocol}//${
        window.location.host
      }/#/request/requestId/${request.requestId}`;
    }
    if (request && request.state !== undefined) {
      this.web3Service.setRequestStatus(request);
    }
    if (request && request.requestId && !request.events) {
      request.events = await this.web3Service.getRequestEvents(
        request.requestId
      );
    }
    if (request && request.currencyContract && !request.currency) {
      request.currency = this.web3Service.currencyFromContractAddress(
        request.currencyContract.address
      );
    }
    this.request = request;
    this.getRequestMode();
    if (request && request.payee) {
      this.progress =
        100 * this.request.payee.balance / this.request.payee.expectedAmount;
    }
  }

  watchAccount() {
    // reload requestObject with its web3 if account has changed
    this.web3Service.accountObservable.subscribe(account => {
      if (this.account !== account && this.request && this.request.requestId) {
        this.web3Service.setSearchValue(this.request.requestId);
      }
      this.account = account;
    });
  }

  getAgeFromTimeStamp(timestamp) {
    if (!timestamp) {
      return '';
    }
    const date = new Date().getTime();
    const days = Math.floor((date - timestamp * 1000) / (1000 * 60 * 60 * 24));
    let msg = days === 1 ? `${days} day ` : days > 1 ? `${days} days ` : '';
    const hours = Math.floor(
      ((date - timestamp * 1000) / (1000 * 60 * 60)) % 24
    );
    msg += hours === 1 ? `${hours} hr ` : hours > 1 ? `${hours} hrs ` : '';
    const minutes = Math.floor(((date - timestamp * 1000) / (1000 * 60)) % 60);
    msg +=
      minutes === 1 ? `${minutes} min ` : minutes > 1 ? `${minutes} mins ` : '';
    return msg ? `${msg}ago` : 'less than 1 min ago';
  }

  getRequestMode() {
    if (!this.request || !this.request.payee) {
      return;
    }
    this.mode =
      this.account === this.request.payee.address
        ? 'payee'
        : this.account === this.request.payer
          ? 'payer'
          : 'none';
  }

  spaceBeforeCapital(name) {
    return name.replace(/([A-Z])/g, ' $1').trim();
  }

  copyToClipboard() {
    this.copyUrlTxt = 'Copied!';
    setTimeout(() => {
      this.copyUrlTxt = 'Copy url & share';
    }, 500);
  }

  refresh() {
    location.reload();
  }

  callbackTx(response, msg?) {
    if (response.transaction) {
      this.web3Service.openSnackBar(
        msg || 'Transaction in progress.',
        'Ok',
        'info-snackbar'
      );
      this.loading = response.transaction.hash;
      this.watchTxHash(this.loading);
    } else if (response.message) {
      if (response.message.includes('6985')) {
        this.web3Service.openSnackBar(
          'Invalid status 6985. User denied transaction.'
        );
      } else if (response.message.includes('newBlockHeaders')) {
        return;
      } else if (
        response.message.startsWith(
          'Returned error: Error: MetaMask Tx Signature'
        )
      ) {
        this.web3Service.openSnackBar(
          'MetaMask Tx Signature: User denied transaction signature.'
        );
      } else {
        console.error(response);
        this.web3Service.openSnackBar(response.message);
      }
    }
  }

  cancelRequest() {
    this.web3Service
      .cancel(this.requestObject)
      .on('broadcasted', response => {
        this.callbackTx(
          response,
          'The request is being cancelled. Please wait a few moments for it to appear on the Blockchain.'
        );
      })
      .then(
        response => {
          // setTimeout(() => {
          //   this.loading = false;
          //   this.web3Service.openSnackBar('Request successfully cancelled.', 'Ok', 'success-snackbar');
          // }, 5000);
        },
        err => {
          this.callbackTx(err);
        }
      );
  }

  acceptRequest() {
    this.web3Service
      .accept(this.requestObject)
      .on('broadcasted', response => {
        this.callbackTx(
          response,
          'The request is being accepted. Please wait a few moments for it to appear on the Blockchain.'
        );
      })
      .then(
        response => {
          // setTimeout(() => {
          //   this.loading = false;
          //   this.web3Service.openSnackBar(
          //     'Request successfully accepted.',
          //     'Ok',
          //     'success-snackbar'
          //   );
          // }, 5000);
        },
        err => {
          this.callbackTx(err);
        }
      );
  }

  subtractRequest() {
    this.dialog.open(SubtractDialogComponent, {
      hasBackdrop: true,
      width: '350px',
      data: {
        callbackTx: this.callbackTx.bind(this),
        requestObject: this.requestObject
      }
    });
  }

  additionalRequest() {
    this.dialog.open(AdditionalDialogComponent, {
      hasBackdrop: true,
      width: '350px',
      data: {
        callbackTx: this.callbackTx.bind(this),
        requestObject: this.requestObject
      }
    });
  }

  payRequest() {
    this.dialog.open(PayDialogComponent, {
      hasBackdrop: true,
      width: '350px',
      data: {
        callbackTx: this.callbackTx.bind(this),
        immutableAmount: false,
        requestObject: this.requestObject
      }
    });
  }

  refundRequest() {
    this.dialog.open(RefundDialogComponent, {
      hasBackdrop: true,
      width: '350px',
      data: {
        callbackTx: this.callbackTx.bind(this),
        immutableAmount: false,
        requestObject: this.requestObject
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.timeOuts) {
      this.timeOuts.forEach(id => clearTimeout(id));
    }
  }
}