// Function that logs out the data with a fixed prefix and then returns the data
// Useful when You want to see data passing as an argument
const SHOW =
  (prefix = 'SHOW:') =>
  data => {
    console.log(prefix, data);
    return data;
  };

class SimplestWebRTCConnection {
  constructor(config) {
    if (typeof config === 'object')
      for (const key of [
        'processRequest',
        'processData',
        'handleConnected',
        'handleDisconnected',
      ])
        if (key in config) this[key] = config[key];
  }

  processRequest = SHOW('REQUEST: ');
  processData = SHOW('DATA: ');

  handleConnected = SHOW('CONNECTED: ');
  handleDisconnected = SHOW('DISCONNECTED: ');

  #offer = '';

  createOffer = async (timeout_us = 1000) => {
    if (this.#answer) throw 'This instance is already initialized as answering';
    if (this.#offer) return this.#offer;

    this.#addChannel('request');
    this.#addChannel('response');
    this.#addChannel('data');

    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    await this.#timeoutIceGathering(timeout_us);
    this.#offer = JSON.stringify(this.connection.localDescription);
    return this.#offer;
  };

  #answer = '';

  createAnswer = async (offer, timeout_us = 1000) => {
    if (this.#offer) throw 'This instance is already initialized as offering';
    if (this.#answer) return this.#answer;

    this.connection.ondatachannel = event => this.#addChannel(event.channel);
    this.connection.setRemoteDescription(JSON.parse(offer));
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    await this.#timeoutIceGathering(timeout_us);
    this.#answer = JSON.stringify(this.connection.localDescription);
    return this.#answer;
  };

  answerAnswer = async answer => {
    if (!this.#offer || this.#answer)
      throw 'This instance must be initialized as offering';
    if (!this.connection.currentRemoteDescription)
      this.connection.setRemoteDescription(JSON.parse(answer));
  };

  sendReq = data => {
    const id = this.#reqId++;
    this.#reqChannel.send(JSON.stringify({ id, data }));
    return new Promise((resolve, reject) => {
      this.#reqStack[id] = { resolve, reject };
    });
  };

  sendData = data => {
    this.#dataChannel.send(JSON.stringify(data));
  };

  checkConnected = () =>
    this.#reqChannel?.readyState === 'open' &&
    this.#resChannel?.readyState === 'open' &&
    this.#dataChannel?.readyState === 'open';

  disconnect = () => {
    this.#reqChannel?.close();
    this.#resChannel?.close();
    this.#dataChannel?.close();
  };

  allDisconnected = () =>
    this.#reqChannel?.readyState === 'closed' &&
    this.#resChannel?.readyState === 'closed' &&
    this.#dataChannel?.readyState === 'closed';

  connection = new RTCPeerConnection({
    iceServers: [{ urls: ['stun:stun1.l.google.com:19302'] }],
  });

  #reqChannel;
  #resChannel;
  #dataChannel;

  #reqId = 0;
  #reqStack = {};

  #addChannel = channel => {
    const label = channel.label || channel;
    switch (label) {
      case 'request':
        this.#reqChannel ||=
          typeof channel === 'string'
            ? this.connection.createDataChannel('request')
            : channel;

        this.#reqChannel.onmessage = async event => {
          const { id, data } = JSON.parse(event.data);

          const response = !!this.processRequest
            ? await this.processRequest(data)
            : data;

          this.#resChannel.send(JSON.stringify({ id, response }));
        };

        this.#reqChannel.onopen = () => {
          if (this.checkConnected()) this.handleConnected(!!this.#offer);
        };

        this.#reqChannel.onclose = () => {
          if (this.allDisconnected()) this.handleDisconnected();
          this.disconnect();
        };

        break;

      case 'response':
        this.#resChannel ||=
          typeof channel === 'string'
            ? this.connection.createDataChannel('response')
            : channel;

        this.#resChannel.onmessage = event => {
          const { id, response } = JSON.parse(event.data);
          const resolve = this.#reqStack[id].resolve;
          delete this.#reqStack[id];
          resolve(response);
        };

        this.#resChannel.onopen = () => {
          if (this.checkConnected()) this.handleConnected(!!this.#offer);
        };

        this.#resChannel.onclose = () => {
          if (this.allDisconnected()) this.handleDisconnected();
          this.disconnect();
        };

        break;

      case 'data':
        this.#dataChannel ||=
          typeof channel === 'string'
            ? this.connection.createDataChannel('data')
            : channel;

        this.#dataChannel.onmessage = event => {
          if (!!this.processData) this.processData(JSON.parse(event.data));
        };

        this.#dataChannel.onopen = () => {
          if (this.checkConnected()) this.handleConnected(!!this.#offer);
        };

        this.#dataChannel.onclose = () => {
          if (this.allDisconnected()) this.handleDisconnected();
          this.disconnect();
        };

        break;
    }

    if (this.checkConnected()) this.handleConnected(!!this.#offer);
  };

  #timeoutIceGathering = (timeout_us = 1000) =>
    new Promise((resolve, reject) => {
      if (this.connection.iceGatheringState === 'complete') resolve(true);
      else {
        const timeout = setTimeout(() => reject(false), timeout_us);
        this.connection.onicegatheringstatechange = () => {
          if (this.connection.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve(true);
          }
        };
      }
    });
}
