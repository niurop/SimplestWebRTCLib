# Simplest webRTC library v1.0

### Video Demo: https://youtu.be/_hMOFdtUWxw

## Basic instructions

Run any `.html` file from `client` folder.

You may want to start with the `local-tic-tac-toe.html` and then the `minimal.html`.

After that proceed in any order.

Links You can run online:

- [local-tic-tac-toe](https://niurop.github.io/SimplestWebRTCLib/client/local-tic-tac-toe)
- [minimal](https://niurop.github.io/SimplestWebRTCLib/client/minimal)
- [tic-tac-toe](https://niurop.github.io/SimplestWebRTCLib/client/tic-tac-toe)

## Description:

WebRTC enables You to create a peer to peer connection between browser tabs over the internet without a server. The only problem is that You still need some way of negotiating the connection. This library simplifies this process:

1. It deals with complexity of webRTC for You;
2. It reduces the negotiation to just 3 steps:
   - creating an `offer` (person A);
   - creating an `answer` (person B);
   - answering (person A);
3. You can do this negotiation by hand:
   - sending the `offer` and the `answer` as text using any DM;
4. Or You can use a server to facilitate the negotiation:
   - use full server (quickest but You need a server);
   - use AWS serverless functions with FaunaDB (100% free with small usage - up to a 100s negotiations per month);

The repository includes:

1. The client library with **SimplestWebRTCLib**: `library/SimplestWebRTCLib.js`;
2. The client library for negotiating using AWS serverless functions: `library/matchingLib.js`;
   > NOTE:\
   > The library requires `CryptoJS.AES` and `CryptoJS.SHA1` \
   > here provided by `https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js`
3. A minimal express.js implementation for negotiating: `expressjs/*`;
4. An implementation for AWS serverless functions: `netlify-lambda/*`;
   > NOTE:\
   > The implementation uses `.env` with `FAUNADB_SECRET_KEY="secret-key"`\
   > The same key **must** be present on deployed **AWS lambda**\
   > and need actual FaunaDB setup included in `netlify-lambda/fauna-db-setup.md`
5. A minimal example showing how to use the SimplestWebRTCLib: `client/minimal.html`;
6. A minimal example using local express.js server: `client/minimal_expressjs.html`;
   > NOTE:\
   > It expects the server to be running locally on `//localhost:8000`,\
   > and is prepared to work with the included **express.js** server
7. A minimal example using AWS serverless functions: `client/minimal_netlify.html`;
   > NOTE:\
   > It expects the server to be running locally on `http://localhost:8888`,\
   > and is prepared to work with the included **netlify-lambda** server run using `netlify dev`
8. A tic-tac-toe game for online multiplayer: `client/tic-tac-toe.html` and `client/tic-tac-toe/*`;
   > NOTE:\
   > It expects the server to be running on `https://webrtc-matching-server.netlify.app`.\
   > If the server is down, You can run _local-tic-tac-toe_ that runs the same code, but within one browser tab without needing the server,\
   > or You can run Your own instance of the server using the provided **netlify-lambda**
9. A local-tic-tac-toe game for online multiplayer: `client/local-tic-tac-toe.html` and `client/local-tic-tac-toe/*`;

## The libraries:

Project includes 2 libraries: `SimplestWebRTCLib.js` and `matchingLib.js`.

Both are written as simple `JavaScript` programs without modules and can be run on most browsers, but support for `webRTC` is required [check browser compatibility](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection#browser_compatibility).

### Library: **SimplestWebRTCLib.js**

Include:`<script src="SimplestWebRTCLib.js"></script>` in Your `HTML` to include the library.

After including the script You will have access to `SimplestWebRTCConnection` class.

To create a connection:

1. Create an instance of the class on both sides:
   ```javascript
   const webRTC = new SimplestWebRTCConnection();
   ```
2. Create an `offer` on one instance:
   ```javascript
   const offer = await webRTC.createOffer();
   ```
3. Send the `offer` to the other side and create an answer:
   ```javascript
   const offer = somehow_get_the_offer();
   const answer = await webRTC.createAnswer(offer);
   ```
4. Send the `answer` to the first instance and answer it:
   ```javascript
   const answer = somehow_get_the_answer();
   await webRTC.answerAnswer(answer);
   ```
5. Now You are connected!
   > NOTE:\
   > If You are just testing it locally, You can do it in one tab by:
   >
   > ```javascript
   > const localWebRTC_A = new SimplestWebRTCConnection();
   > const localWebRTC_B = new SimplestWebRTCConnection();
   >
   > (async () => {
   >   const offer = await localWebRTC_A.createOffer();
   >   const answer = await localWebRTC_B.createAnswer(offer);
   >   await localWebRTC_A.answerAnswer(answer);
   > })();
   > ```

**After successful connection** the `webRTC` instance will call a function `webRTC.handleConnected(initiating :boolean)` which You can override (by default it just `consol.log('CONNECTED: ', initiating)`).

Similarly **on disconnect** the `webRTC` instance will call a function `webRTC.handleDisconnected()`.

**To send data** to the connected instance use `webRTC.sendData(data :any)`. When receiving data the `webRTC` will call `async webRTC.processData(data :any)`.

**If You want to wait for a reply**, You can send request using `async webRTC.sendReq(req :any) => any`.When receiving request the `webRTC` will call `async webRTC.processRequest(req: any) => any`. This function returns what should be sent as a response.

> NOTE:\
> Both `data`, `req`, and `response` can be any JavaScript objects, but need to be `JSON.stringify`-able.

The instance also provides functions `webRTC.checkConnection() => boolean` and `webRTC.allDisconnected() => boolean` to **check if instances are connected**.

**To disconnect** use `webRTC.disconnect()`.

And if You need more **low level control** use `webRTC.connection :RTCPeerConnection`.

> NOTE:\
> data channels used: `request`, `response`, `data`.

**In case something goes wrong**, You may want to restart the page due to how garbage collection works.

### Library: **matchingLib.js**

Include some script implementing `CryptoJS.AES` and `CryptoJS.SHA1`. An example is `https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js`.
Include:`<script src="matchingLib.js"></script>`in Your`HTML` to include the library.

After including the script You will have access to `MatchingLib` class.

To create a connection:

1. Create `webRTC` instances from `SimplesWebRTCLib.js`:
   ```javascript
   const webRTC = new SimplestWebRTCConnection();
   ```
2. Then crate a unique `name` for the connection and make sure that it is the same on both sides:
   ```javascript
   const name = 'example_123';
   ```
3. Then one the first side create an instance of the `MatchingLib` and create an offer, and then await the answer:
   ```javascript
   const matching = new MatchingLib(name, webRTC);
   await matching.offer(); // will return false if the name is already taken
   matching.awaitAnswerOnInterval(); // This will ask the server if the answer is already given every 5s by default
   ```
4. On the other side create similar instance but this time don't send the offer:
   ```javascript
   const matching = new MatchingLib(name, webRTC);
   matching.awaitAnswerOnInterval(); // This will ask the server if the offer is already given every 5s by default
   ```
5. After waiting for a couple of seconds, You are now connected!

> NOTE:\
> The default endpoint for `MatchingLib` is a `http://localhost:8888` for using with `netlify dev`.\
> To point it to a different one, specify it as a 3rd argument when calling `new MatchingLib(name, webRTC, new_endpoint)`.\
> Remember to include a full path for the functions endpoint like: `https://webrtc-matching-server.netlify.app/.netlify/functions/`.

**In case something goes wrong**, You may want to restart the page due to how garbage collection works.
In case something goes wrong, You may want to restart the page due to how garbage collection works.

## The servers:

The repository includes 2 implementations for servers: `express.js` and `AWS serverless functions`.

Both can be run locally and using dedicated servers and both run using `node.js`.

### Server: **express.js**

**This is not memory safe** for running on an actual server, and should have an automatic deletion system for unanswered requests.

To run the server:

1. `cd` to the `expressjs` folder;
2. Install `expressjs` running `$npm install expressjs --save`;
3. Run `$node server.js`;
4. The server should be running on `//localhost:8000`.

The server exposes 3 `POST` endpoints:

- `/offer` for submitting the `id` and `offer` inside request `body`. Then the response is not sent until the offer is answered (potential memory leak);
- `/askforoffer` for asking for the offer with specified `id` in the `body;
- `/answer` for submitting the `id` and `answer` in the `body`. This function also sends a response to the request made to `/offer` with the same `id`.

### Server: **AWS serverless functions**

You can run this server locally, but then it is better to use the _express.js_ version.

1. For this You need to register for free accounts on [FaunaDB](https://fauna.com/) and [Netlify](https://www.netlify.com/);
2. After registering, create a new collection on FaunaDB using instructions from `netlify-lambda/fauna-db-setup.md`;
3. Create a **secret key** in `netlify-lambda/.env` with `FAUNADB_SECRET_KEY="secret-key"`;
4. Next install `netlify-cli` using `npm install netlify-cli -g` (or `npm install netlify-cli --save-dev` for using it per project);
5. Run `$npm install dotenv faundadb --save` to install dependencies;
6. Now You can run `$netlify dev` or `$netlify dev --live` to run the server locally or locally with online link;
7. If You want to deploy it to the `netlify` server use `$netlify deploy` which will ask You to login;
8. Next remember to also add the **secret key** for FaunaDB in the netlify project config and publish the project;
9. Now You should be able to use the server.

## **Security:**

The big issue with _webRTC_ is security.

During negotiations a lot of information about Your connection needs to be given to the other side. If not secured it can also be hijacked by a third party.

Unfortunately we cannot do anything about givin our information to the other side, but we can secure our data from third parties. That is where `CryptoJS` comes in.

1. We never send our data unencrypted;
2. We encrypt using `AES` it in browser using a `key`;
3. The key is generated from the `name` as a `SHA1(name)` (thus both sides end up with the same key);
4. The `id` for identifying the connection is generated as `SHA1(key) ≡ SHA1(SHA1(name))`;
   > NOTE:\
   > This is a potential vulnerability.
5. Due to how _serverless functions_ and _FaunaDB_ work the encrypted `offer` and `answers` are stored in a _FaunaDB_ database;
6. No further security is considered since the library is intended for small projects.
