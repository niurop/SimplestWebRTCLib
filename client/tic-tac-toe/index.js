class Game {
  #scores = null;

  #controls = null;
  #infoBox = null;
  #controlButton = null;

  #logicBoard = ['', '', '', '', '', '', '', '', ''];
  #board = null;
  #cells = [];
  #marks = [];

  gameState = '';

  player_color = '';
  opponents_color = '';

  player_wins = 0;
  opponent_wins = 0;
  draws = 0;

  lastStart = 'x';
  currentColor = 'x';

  #webRTCConnection;

  constructor(object, initiating, webRTCConnection) {
    this.#constructBoard();
    object.append(this.#scores.container);
    object.append(this.#board);
    object.append(this.#controls);

    this.#webRTCConnection = webRTCConnection;

    this.setColor('ox'[initiating | 0]);

    this.setGameState('beforeGame');
  }

  setColor(color) {
    this.player_color = color;
    this.opponents_color = 'ox'[(color === 'o') | 0];
    for (let i = 0; i < 9; i++)
      if (this.#logicBoard[i] === '') this.#fill(color, i, false);
  }

  async setGameState(mode, responding = false) {
    this.gameState = mode;
    switch (mode) {
      case 'beforeGame':
        this.#controlButton.innerText = 'Start game';
        this.#updateScore();
        break;
      case 'startGame':
        if (
          !responding &&
          !(await this.#webRTCConnection.sendReq({
            req: 'startGame',
          }))
        )
          return false;
        this.#controlButton.innerText = 'Resign';
        this.reset();
        this.setGameState('nextRound');
        break;
      case 'yourMove':
        this.#board.classList.add('your-move');
        this.#infoBox.innerText = 'Your move';
        break;
      case 'opponentsMove':
        this.#board.classList.remove('your-move');
        this.#infoBox.innerText = "opponent's move";
        break;
      case 'checkForWin':
        this.#board.classList.remove('your-move');
        this.checkForWin();
        break;
      case 'nextRound':
        this.currentColor = 'ox'[(this.currentColor === 'o') | 0];
        if (this.currentColor === this.player_color)
          this.setGameState('yourMove');
        else this.setGameState('opponentsMove');
        break;
      case 'gameEnded':
        this.#controlButton.innerText = 'Reset';
        break;
    }
    return true;
  }

  #constructBoard() {
    const newSVGElement = (tag, id = '', className = '', attributes = {}) => {
      const element = document.createElementNS(
        'http://www.w3.org/2000/svg',
        tag
      );
      if (id) element.id = id;
      if (className) element.setAttribute('class', className);
      for (let attr in attributes) element.setAttribute(attr, attributes[attr]);
      return element;
    };

    const svg = newSVGElement('svg', 'board', '', { viewBox: '0 0 30 30' });
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++) {
        const i = x + 3 * y;
        const cell = newSVGElement('rect', `${i}`, 'cell empty', {
          x: 10 * x,
          y: 10 * y,
          width: '10',
          height: '10',
          rx: '1',
        });
        this.#cells.push(cell);
        svg.append(cell);

        cell.onmouseover = () => {
          if (this.#logicBoard[i] === '' && this.gameState === 'yourMove')
            this.#marks[i].setAttribute('stroke', 'lightgray');
        };
        cell.onmouseout = () => {
          if (this.#logicBoard[i] === '')
            this.#marks[i].setAttribute('stroke', 'none');
        };
      }

    for (let i = 0; i < 9; i++) {
      const mark = newSVGElement('path', '', 'mark', {
        'stroke-width': 0.2,
        'stroke-linecap': 'round',
        stroke: 'none',
        fill: 'none',
      });
      this.#marks.push(mark);
      svg.append(mark);
    }

    const lines_config = {
      'stroke-width': 0.1,
      'stroke-linecap': 'round',
      'stroke-dasharray': '1',
      stroke: 'black',
    };
    svg.append(
      newSVGElement('line', '', '', {
        x1: 10,
        x2: 10,
        y1: 1.5,
        y2: 28.5,
        ...lines_config,
      })
    );

    svg.append(
      newSVGElement('line', '', '', {
        x1: 20,
        x2: 20,
        y1: 1.5,
        y2: 28.5,
        ...lines_config,
      })
    );

    svg.append(
      newSVGElement('line', '', '', {
        y1: 10,
        y2: 10,
        x1: 1.5,
        x2: 28.5,
        ...lines_config,
      })
    );

    svg.append(
      newSVGElement('line', '', '', {
        y1: 20,
        y2: 20,
        x1: 1.5,
        x2: 28.5,
        ...lines_config,
      })
    );

    svg.onclick = event => {
      if (
        this.gameState === 'yourMove' &&
        event.target.tagName === 'rect' &&
        this.#logicBoard[event.target.id] === ''
      ) {
        this.#move(event.target.id);
      }
    };

    this.#board = svg;

    this.#scores = {
      container: document.createElement('div'),
      wins: document.createElement('span'),
      draws: document.createElement('span'),
      losses: document.createElement('span'),
    };

    this.#scores.container.append(this.#scores.wins);
    this.#scores.container.append(this.#scores.draws);
    this.#scores.container.append(this.#scores.losses);

    this.#scores.container.classList.add('score-container');
    this.#scores.wins.classList.add('score-wins');
    this.#scores.draws.classList.add('score-draws');
    this.#scores.losses.classList.add('score-losses');

    this.#controls = document.createElement('div');
    this.#controls.classList.add('controls');

    this.#infoBox = document.createElement('span');
    this.#infoBox.classList.add('info-box');
    this.#controls.append(this.#infoBox);

    this.#controlButton = document.createElement('button');
    this.#controlButton.classList.add('control-button');
    this.#controls.append(this.#controlButton);
    this.#controlButton.onclick = () => this.#controlButtonClicked();
  }

  #updateScore() {
    this.#scores.wins.innerText = this.player_wins;
    this.#scores.draws.innerText = this.draws;
    this.#scores.losses.innerText = this.opponent_wins;
  }

  reset() {
    this.lastStart = 'ox'[(this.lastStart === 'o') | 0];
    this.currentColor = this.lastStart;

    for (let i = 0; i < 9; i++) {
      this.#logicBoard[i] = '';
      this.#cells[i].classList.add('empty');
      this.#marks[i].classList.remove('o');
      this.#marks[i].classList.remove('x');
      this.#marks[i].setAttribute('stroke', 'none');
    }
    this.setColor(this.player_color);
    this.#board.classList.remove('your-move');
  }

  async #move(i, responding = false) {
    if (this.#logicBoard[i] !== '') return false;
    if (
      !responding &&
      !(await this.#webRTCConnection.sendReq({ req: 'move', i }))
    )
      return false;
    this.#fill(this.currentColor, i);
    this.checkForWin();
    return true;
  }

  #fill(color, i, permanent = true) {
    const x = (i % 3) * 10 + 5;
    const y = ((i / 3) | 0) * 10 + 5;
    const path =
      color === 'o'
        ? `M ${x} ${y} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`
        : `M ${x - 3} ${y - 3} L ${x + 3} ${y + 3} M ${x + 3} ${y - 3} L ${
            x - 3
          } ${y + 3}`;

    this.#marks[i].setAttribute('d', path);

    if (permanent) {
      this.#logicBoard[i] = color;
      this.#marks[i].setAttribute('stroke', 'black');
      this.#marks[i].classList.add(color);
      this.#cells[i].classList.remove('empty');
    }
  }

  checkForWin() {
    const c = this.currentColor;
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [2, 4, 6],
      [0, 4, 8],
    ];
    const b = this.#logicBoard;
    for (const l of lines)
      if (b[l[0]] === c && b[l[1]] === c && b[l[2]] === c) {
        return this.#endGame(c);
      }
    if (!b.includes('')) return this.#endGame('');
    this.setGameState('nextRound');
  }

  #controlButtonClicked() {
    switch (this.gameState) {
      case 'beforeGame':
        this.setGameState('startGame');
        break;
      case 'startGame':
      case 'yourMove':
      case 'opponentsMove':
      case 'checkForWin':
      case 'nextRound':
        this.#webRTCConnection.sendReq({ req: 'resign' });
        this.#endGame(this.opponents_color);
        break;
      case 'gameEnded':
        this.setGameState('startGame');
        break;
    }
  }

  #endGame(winner) {
    if (winner === '') {
      this.draws++;
      this.#infoBox.innerText = 'Draw (o_O)';
    } else if (winner === this.player_color) {
      this.player_wins++;
      this.#infoBox.innerText = 'You WON! \\(OO)/';
    } else if (winner === this.opponents_color) {
      this.opponent_wins++;
      this.#infoBox.innerText = 'You LOST! (o_o)';
    }
    this.#board.classList.remove('your-move');
    this.#updateScore();
    this.setGameState('gameEnded');
  }

  processRequests = async req => {
    switch (req.req) {
      case 'startGame':
        return this.setGameState('startGame', true);
      case 'move':
        const { i } = req;
        return this.#move(i, true);
      case 'resign':
        return this.#endGame(this.player_color);
    }
  };

  handleDisconnected = () => {
    this.#infoBox.innerText = 'DISCONNECTED';
  };
}

const MATCHING_SERVER_URL =
  'https://webrtc-matching-server.netlify.app/.netlify/functions/';

let webRTC, matching, game;

const nameInfo_span = document.getElementById('nameInfo');
const name_textarea = document.getElementById('name');

name_textarea.innerText += '_' + Math.random().toString().slice(2);

document.getElementById('initiate').onclick = () => startConnecting(true);
document.getElementById('answer').onclick = () => startConnecting(false);

cancelConnecting_button = document.getElementById('stopConnecting').onclick =
  stopConnecting;

async function startConnecting(initiating) {
  const name = name_textarea.innerText.replace(/\s/g, '');

  nameInfo_span.innerText += ' to [' + name + ']';

  document.getElementById('connectionScreen').classList.add('hidden');
  document.getElementById('connectingScreen').classList.remove('hidden');

  webRTC = new SimplestWebRTCConnection();
  webRTC.handleConnected = initiating => {
    document.getElementById('connectingScreen').classList.add('hidden');
    if (!game) {
      game = new Game(
        document.getElementById('gameScreen'),
        initiating,
        webRTC
      );
      webRTC.processRequest = game.processRequests;
      webRTC.handleDisconnected = game.handleDisconnected;
    }
  };
  matching = new MatchingLib(name, webRTC, MATCHING_SERVER_URL);

  if (initiating)
    if (!(await matching.offer())) nameInfo_span.innerText = 'name taken';
    else {
      matching.awaitAnswerOnInterval();
    }
  else matching.awaitAnswerOnInterval();
}

async function stopConnecting() {
  await matching.clearOffer();
  window.location.reload();
}
