if (
  !CryptoJS ||
  !CryptoJS?.AES.encrypt ||
  !CryptoJS?.AES.decrypt ||
  !CryptoJS.SHA1
)
  throw 'Please include scripts providing CryptoJS.AES.{decrypt, encrypt} and CryptoJS.SHA1';

if (!SimplestWebRTCConnection)
  throw 'Please include scripts providing SimplestWebRTCConnection';

const GET = endpoint =>
  fetch(endpoint)
    .then(res => res.json())
    .catch(error => undefined);

const POST = (endpoint, body) =>
  fetch(endpoint, {
    method: 'POST',
    body,
  })
    .then(res => res.json())
    .catch(error => undefined);

const DELETE = endpoint =>
  fetch(endpoint, {
    method: 'DELETE',
  })
    .then(res => res.json())
    .catch(error => undefined);

class MatchingLib {
  #matchingServerEndpoint = '';

  #id = '';
  #hash = '';
  #name = '';

  simplestWebRTCConnection;

  constructor(
    name,
    simplestWebRTCConnection,
    matchingServerEndpoint = 'http://localhost:8888/.netlify/functions/'
  ) {
    this.#matchingServerEndpoint = matchingServerEndpoint;

    if (!name) throw 'Please provide name for the matchmaking';

    if (!(simplestWebRTCConnection instanceof SimplestWebRTCConnection))
      throw 'simplestWebRTCConnection must be an instance of SimplestWebRTCConnection';
    this.simplestWebRTCConnection = simplestWebRTCConnection;

    const hash = data => CryptoJS.SHA1(data).toString();

    this.#name = name;
    this.#key = hash(this.#name);
    this.#id = hash(this.#key);
  }

  #initiating = false;

  #key = '';

  encrypt(data) {
    return CryptoJS.AES.encrypt(data, this.#key).toString();
  }

  decrypt(data) {
    return CryptoJS.AES.decrypt(data, this.#key).toString(CryptoJS.enc.Utf8);
  }

  async offer() {
    this.#initiating = true;

    const offer = await this.simplestWebRTCConnection.createOffer();

    const encryptedOffer = this.encrypt(offer, this.#hash);

    const res = await POST(
      this.#matchingServerEndpoint + 'offer?id=' + this.#id,
      `{"offer":"${encryptedOffer}"}`
    );

    return res;
  }

  async answer() {
    if (this.#initiating) {
      const answer = await GET(
        this.#matchingServerEndpoint + 'answer?id=' + this.#id
      );

      if (answer) {
        const decryptedAnswer = this.decrypt(answer, this.#hash);

        await this.simplestWebRTCConnection.answerAnswer(decryptedAnswer);

        DELETE(this.#matchingServerEndpoint + 'answer?id=' + this.#id);

        return true;
      }
    } else {
      const offer = await GET(
        this.#matchingServerEndpoint + 'offer?id=' + this.#id
      );

      if (offer) {
        const decryptedOffer = this.decrypt(offer, this.#hash);

        const answer = await this.simplestWebRTCConnection.createAnswer(
          decryptedOffer
        );

        const encryptedAnswer = this.encrypt(answer, this.#hash);

        const res = await POST(
          this.#matchingServerEndpoint + 'answer?id=' + this.#id,
          `{"offer":"${encryptedAnswer}"}`
        );

        return res;
      }
    }

    return false;
  }

  async clearOffer() {
    await DELETE(this.#matchingServerEndpoint + 'offer?id=' + this.#id);
    await DELETE(this.#matchingServerEndpoint + 'answer?id=' + this.#id);
  }

  timeout = null;

  async awaitAnswerOnInterval(interval = 5000) {
    try {
      await this.answer();
    } catch (error) {}

    if (!this.simplestWebRTCConnection.checkConnected())
      this.timeout = setTimeout(
        async () => await this.awaitAnswerOnInterval(interval),
        interval
      );
  }
}
