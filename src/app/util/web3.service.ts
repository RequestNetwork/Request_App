import { Injectable, HostListener } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { MatSnackBar } from '@angular/material';

import RequestNetwork from '@requestnetwork/request-network.js';
import Web3 from 'web3';
import ProviderEngine from 'web3-provider-engine';
import RpcSubprovider from 'web3-provider-engine/subproviders/rpc';
import LedgerWalletSubprovider from 'ledger-wallet-provider';

/* beautify preserve:start */
declare let window: any;
/* beautify preserve:end */

@Injectable()
export class Web3Service {
  private web3: Web3;
  private requestNetwork: RequestNetwork;
  private infuraNodeUrl = 'https://rinkeby.infura.io/BQBjfSi5EKSCQQpXebO';

  public metamask = false;
  public ledgerConnected = false;
  public ready = false;

  public etherscanUrl: string;

  public accountObservable = new BehaviorSubject < string > ('');
  public networkIdObservable = new BehaviorSubject < number > (null);
  public searchValue = new Subject < string > ();

  private web3NotReadyMsg = 'Error when trying to instanciate web3.';
  private requestNetworkNotReadyMsg = 'Request Network smart contracts are not deployed on this network. Please use Rinkeby Test Network.';
  private walletNotReadyMsg = 'Connect your Metamask or Ledger wallet to create or interact with a Request.';

  public fromWei;
  public toWei;
  public BN;
  public isAddress;

  constructor(private snackBar: MatSnackBar) {

    window.addEventListener('load', async event => {
      console.log('web3service instantiate web3');
      this.checkAndInstantiateWeb3();
      this.networkIdObservable.subscribe(networkId => this.setEtherscanUrl());
      setInterval(async _ => await this.refreshAccounts(), 1000);
    });
  }


  public checkLedger(networkId, derivationPath) {
    return new Promise(async(resolve, reject) => {
      const ledgerWalletSubProvider = await LedgerWalletSubprovider(() => networkId, derivationPath);
      const ledger = ledgerWalletSubProvider.ledger;

      if (!ledger.isU2FSupported) {
        reject('Ledger Wallet uses U2F which is not supported by your browser.');
      }

      ledger.getMultipleAccounts(derivationPath, 0, 10).then(
          async res => {
            const engine = new ProviderEngine();
            engine.addProvider(ledgerWalletSubProvider);
            engine.addProvider(new RpcSubprovider({ rpcUrl: this.infuraNodeUrl }));
            engine.start();
            const web3 = new Web3(engine);
            const addresses = Object.entries(res).map(e => ({ derivationPath: e[0], address: e[1], balance: 0 }));
            for (const address of addresses) {
              address.balance = this.fromWei(await web3.eth.getBalance(address.address.toString()));
            }
            resolve(addresses);
          })
        .catch(err => {
          if (err.metaData && err.metaData.code === 5) {
            reject('Timeout error. Please verify your ledger is connected and the Ethereum application opened.');
          } else if (err === 'Invalid status 6801') {
            reject('Invalid status 6801. Check to make sure the right application is selected on your ledger.');
          }
        });
    });
  }

  public async instanciateWeb3FromLedger(networkId, derivationPath) {
    const ledgerWalletSubProvider = await LedgerWalletSubprovider(() => networkId, derivationPath);
    const engine = new ProviderEngine();
    engine.addProvider(ledgerWalletSubProvider);
    engine.addProvider(new RpcSubprovider({ rpcUrl: this.infuraNodeUrl }));
    engine.start();

    this.checkAndInstantiateWeb3(new Web3(engine));
    this.openSnackBar('Ledger Wallet successfully connected on Rinkeby Test Network.', null, 'success-snackbar');
    this.ledgerConnected = true;
  }


  public async checkAndInstantiateWeb3(web3 ? ) {
    if (web3 || typeof window.web3 !== 'undefined') {
      console.log(`Using web3 detected from external source. If you find that your accounts don\'t appear, ensure you\'ve configured that source properly.`);

      if (web3) {
        // if Ledger wallet
        this.web3 = web3;
        this.refreshAccounts(true);
      } else {
        // if Web3 has been injected by the browser (Mist/MetaMask)
        this.metamask = window.web3.currentProvider.isMetaMask;
        this.ledgerConnected = false;
        this.web3 = new Web3(window.web3.currentProvider);
      }
      this.networkIdObservable.next(await this.web3.eth.net.getId());
    } else {
      console.warn(`No web3 detected. Falling back to ${this.infuraNodeUrl}.`);
      this.networkIdObservable.next(4);
      this.web3 = new Web3(new Web3.providers.HttpProvider(this.infuraNodeUrl));
    }
    // instanciate requestnetwork.js
    try {
      this.requestNetwork = new RequestNetwork(this.web3.currentProvider, this.networkIdObservable.value);
    } catch (err) {
      this.openSnackBar(this.requestNetworkNotReadyMsg);
      console.error(err);
    }

    this.fromWei = this.web3.utils.fromWei;
    this.toWei = this.web3.utils.toWei;
    this.isAddress = this.web3.utils.isAddress;
    this.BN = mixed => new this.web3.utils.BN(mixed);


    this.ready = this.requestNetwork ? true : false;
  }

  /* beautify preserve:start */
  private async refreshAccounts(force ?: boolean) {
  /* beautify preserve:end */
    if (this.ledgerConnected && !force) { return; }

    const accs = await this.web3.eth.getAccounts();
    if (!accs || accs.length === 0) {
      this.accountObservable.next(' ');
    } else if (this.accountObservable.value !== accs[0]) {
      this.accountObservable.next(accs[0]);
    }
  }


  private setEtherscanUrl() {
    switch (this.networkIdObservable.value) {
      case 1:
        this.etherscanUrl = 'https://etherscan.io/';
        break;
      case 3:
        this.etherscanUrl = 'https://ropsten.etherscan.io/';
        break;
      case 4:
        this.etherscanUrl = 'https://rinkeby.etherscan.io/';
        break;
      case 42:
        this.etherscanUrl = 'https://kovan.etherscan.io/';
        break;
      default:
        break;
    }
  }


  private watchDog() {
    const stop = !this.web3 || !this.requestNetwork || !this.accountObservable.value;
    if (stop) { this.openSnackBar(); }
    return stop;
  }


  /* beautify preserve:start */
  public openSnackBar(msg ?: string, ok ?: string, panelClass ?: string, duration ?: number) {
  /* beautify preserve:end */
    if (!msg) {
      msg = !this.web3 ? this.web3NotReadyMsg : !this.requestNetwork ? this.requestNetworkNotReadyMsg : !this.accountObservable.value ? this.walletNotReadyMsg : '';
      if (msg === '') { return; }
    }

    this.snackBar.open(msg, ok || 'Ok', {
      duration: duration || 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: panelClass || 'warning-snackbar',
    });
  }


  public setSearchValue(searchValue: string) {
    this.searchValue.next(searchValue);
  }


  public setRequestStatus(request) {
    if (request.state === 2) {
      request.status = 'cancelled';
    } else if (request.state === 1) {
      if (request.balance.isZero()) {
        request.status = 'accepted';
      } else if (request.balance.lt(request.expectedAmount)) {
        request.status = 'in progress';
      } else if (request.balance.eq(request.expectedAmount)) {
        request.status = 'complete';
      } else if (request.balance.gt(request.expectedAmount)) {
        request.status = 'overpaid';
      }
    } else {
      request.status = 'created';
    }
  }

  private confirmTxOnLedgerMsg() {
    if (this.ledgerConnected) {
      setTimeout(_ => { this.openSnackBar('Please confirm transaction on your ledger.', null, 'info-snackbar'); }, 1500);
    }
  }

  public createRequestAsPayee(payer: string, expectedAmount: string, data: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    if (!this.web3.utils.isAddress(payer)) { return callback({ message: 'payer\'s address is not a valid Ethereum address' }); }
    const expectedAmountInWei = this.toWei(expectedAmount, 'ether');
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.createRequestAsPayee(payer, expectedAmountInWei, data);
  }


  public cancel(requestId: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.cancel(requestId);
  }


  public accept(requestId: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.accept(requestId);
  }


  public subtractAction(requestId: string, amount: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    const amountInWei = this.toWei(amount.toString(), 'ether');
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.subtractAction(requestId, amountInWei);
  }


  public additionalAction(requestId: string, amount: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    const amountInWei = this.toWei(amount.toString(), 'ether');
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.additionalAction(requestId, amountInWei);
  }


  public paymentAction(requestId: string, amount: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    const amountInWei = this.toWei(amount.toString(), 'ether');
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.paymentAction(requestId, amountInWei, 0);
  }

  public refundAction(requestId: string, amount: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    const amountInWei = this.toWei(amount.toString(), 'ether');
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.refundAction(requestId, amountInWei, 0);
  }


  public async getRequestByRequestIdAsync(requestId: string) {
    try {
      const request = await this.requestNetwork.requestCoreService.getRequest(requestId);
      this.setRequestStatus(request);
      return request;
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }


  public async getRequestByTransactionHash(txHash: string) {
    try {
      const response = await this.requestNetwork.requestCoreService.getRequestByTransactionHash(txHash);
      return response;
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }


  public async getRequestEvents(requestId: string) {
    try {
      const events = await this.requestNetwork.requestCoreService.getRequestEvents(requestId);
      return events.sort((a, b) => b._meta.timestamp - a._meta.timestamp);
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }


  public async getRequestsByAddress(requestId: string) {
    try {
      const requests = await this.requestNetwork.requestCoreService.getRequestsByAddress(requestId);
      return requests;
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }

}
