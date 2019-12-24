window.addEventListener('load', () => new Terminal());

/** Terminal
 * Holds configs and procedures for terminal
 * */
class Terminal {
  /**
   * @constructor
   * @param {integer} lineHeight
   * @param {integer} widthOffset
   * @param {integer} cursorWidth
   * @param {integer} cursorHeight
   * @param {integer} fontColor - default font color
   * @param {integer} outputFont - default font
   * @param {integer} prompt_
   * @param {integer} promptPad
   * @param {integer} leftWindowMargin - left margin of terminal
   * @param {integer} cursorInterval - interval of cursor blinking
   * */
  constructor(
      lineHeight = 20,
      widthOffset = 2,
      cursorWidth = 8,
      cursorHeight = 3,
      fontColor = '#C0C0C0',
      outputFont = '12pt Consolas',
      prompt_ = 'c =\\>',
      promptPad = 3,
      leftWindowMargin = 2,
      cursorInterval = 300,
  ) {
    this.lineHeight = lineHeight;
    this.widthOffset = widthOffset;
    this.cursorWidth = cursorWidth;
    this.cursorHeight = cursorHeight;
    this.fontColor = fontColor;
    this.outputFont = outputFont;
    this.prompt_ = prompt_;
    this.promptPad = promptPad;
    this.leftWindowMargin = leftWindowMargin;
    this.cursorInterval = cursorInterval;

    this.cmd_list = [];
    this.currentCmd = '';

    this.canvas = null;
    this.ctx = null;
    this.cursor = null;

    this.init();
    this.draw();
  }

  /**
   * Terminal Initializer
   * */
  init() {
    this.canvas = document.getElementById('terminal');
    this.ctx = this.canvas.getContext('2d');

    this.charWidth = Math.ceil(this.ctx.measureText('W').width);
    this.promptWidth = this.charWidth * this.prompt_.length + this.promptPad;

    this.cursor = new Cursor(
        this.promptWidth, this.lineHeight,
        this.cursorWidth, this.cursorHeight, this.cursorInterval, this,
    );
    console.log('init x:' + this.cursor.x);
    console.log('init y:' + this.cursor.y);

    window.addEventListener('resize', this.draw.bind(this));
    // window.addEventListener("keydown", this.keyDownHandler.bind(this));
    // window.addEventListener("keydown", this.keyDownHandlerRemote.bind(this));
    // window.addEventListener("keypress", this.showKey.bind(this));
    window.addEventListener('keypress', this.keyDownHandlerRemote.bind(this));
    setInterval(this.receiveStdout.bind(this), this.cursorInterval);
  }

  /**
   * render a new line
   * */
  drawNewLine() {
    this.ctx.font = this.outputFont;
    this.ctx.fillStyle = this.fontColor;
    this.ctx.fillText(
        this.prompt_,
        this.leftWindowMargin,
        this.cursor.y + this.lineHeight,
    );
    this.cursor.x = this.promptWidth - this.charWidth;
    this.cursor.y += this.lineHeight;
  }

  /**
   * Receive stdout from the server
   * */
  receiveStdout() {
    const req = new XMLHttpRequest();
    req.open('GET', '/read');
    req.onload = function() {
      const content = JSON.parse(req.response);
      const stdout = content['stdout'];
      console.log('stdout: ' + stdout);
      this.printChars.bind(this)(stdout);
    }.bind(this);
    req.send();
  }

  /**
   * draw Prompt on a client side.
   * This is deprecated as prompts will also be sent from the server.
   * @param{integer} Yoffset - Y-axis offset
   * */
  drawPrompt(Yoffset) {
    this.ctx.font = this.outputFont;
    this.ctx.fillStyle = this.fontColor;
    this.ctx.fillText(
        this.prompt_,
        this.leftWindowMargin,
        Yoffset * this.lineHeight,
    );
  }

  /**
   * Remove the previous character
   * */
  blotPrevChar() {
    this.blotOutCursor();
    this.ctx.fillStyle = '#000000';
    this.cursor.x -= this.charWidth;
    this.ctx.fillRect(
        this.cursor.x,
        this.cursor.y - (this.charWidth + this.widthOffset),
        this.cursor.width + 3,
        15,
    );
  }

  /**
   * Remove the cursor
   * */
  blotOutCursor() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(
        this.cursor.x,
        this.cursor.y,
        this.cursor.width,
        this.cursor.height,
    );
  }

  /**
   * normal character handler.
   * this handler will just send a key to the server.
   * @param{key} e - key
   * */
  keyDownHandlerRemote(e) {
    let currentKey = null;
    console.log('current: ' + this.currentCmd);
    if (e.code !== undefined) {
      currentKey = e.code;
      console.log('e.code : ' + e.code);
    } else {
      currentKey = e.keyCode;
      console.log('e.keyCode : ' + e.keyCode);
    }
    console.log(currentKey);
    const req = new XMLHttpRequest();
    req.open('GET', '/stdin?key=' + String.fromCharCode(e.keyCode));
    req.send();
    console.log('sent');
  }

  /**
   * normal character handler.
   * this handler will attempt to handle a key on a client side.
   * @param{key} e - key
   * */
  keyDownHandler(e) {
    let currentKey = null;
    console.log('current: ' + this.currentCmd);
    if (e.code !== undefined) {
      currentKey = e.code;
      console.log('e.code : ' + e.code);
    } else {
      currentKey = e.keyCode;
      console.log('e.keyCode : ' + e.keyCode);
    }
    console.log(currentKey);
    // handle backspace key
    if (isBackspace(currentKey) && document.activeElement !== 'text') {
      e.preventDefault();
      // promptWidth is the beginning of the line with the c:\>
      if (this.cursor.x > this.promptWidth) {
        blotPrevChar();
        if (currentCmd.length > 0) currentCmd = currentCmd.slice(0, -1);
      }
    }
    // handle <ENTER> key
    if (isEnter(currentKey)) {
      this.blotOutCursor();
      if (this.currentCmd.length > 0) {
        this.cmd_list.push(this.currentCmd);
        this.currentCmd = '';
      }
    }
  }

  /**
   * Print a key to terminal
   * @param{key} e - key
   */
  showKey(e) {
    this.blotOutCursor();

    this.ctx.font = this.outputFont;
    this.ctx.fillStyle = this.fontColor;

    this.ctx.fillText(
        String.fromCharCode(e.charCode),
        this.cursor.x,
        this.cursor.y,
    );
    this.cursor.x += this.charWidth;
    console.log(this.cursor.x);
    console.log(this.cursor.y);
    this.currentCmd += String.fromCharCode(e.charCode);
  }

  /**
   * Print stdout into the terminal.
   * @param{string} content - content of stdout
   */
  printStdout(content) {
    console.log('enter');
    const lines = content.split('\n');
    lines.forEach((line) => {
      console.log('enter2');
      this.cursor.x = 0;
      this.cursor.y += this.lineHeight;
      this.blotOutCursor();

      this.ctx.font = this.outputFont;
      this.ctx.fillStyle = this.fontColor;

      this.ctx.fillText(line, this.cursor.x, this.cursor.y);
      this.cursor.x += this.charWidth * line.length;
      console.log(this.cursor.x);
      console.log(this.cursor.y);
    });
  }

  /**
   * SRG (Select Render Graphics) code handler.
   * @param{string} code - SRG code in string.
   */
  handleSRG(code) {
    console.log('SRG handler');
  }

  /**
   * Handle characters.
   * If a character is printable, then print.
   * If it's ascii esc code, then this will attempt to handle it.
   * @param{string} chars - string including ASCII escape codes.
   */
  printChars(chars) {
    console.log('entered');
    const CSIlookup = {
      'A': 'cursor_up',
      'B': 'cursor_down',
      'C': 'cursor_forward',
      'D': 'cursor_back',
      'E': 'cursor_next_line',
      'F': 'cursor_previous_line',
      'G': 'cursor_horizontal_absolute',
      'H': 'cursor_position',
      'J': 'erase_in_display',
      'K': 'erase_in_line',
      'S': 'scroll_up',
      'T': 'scroll_down',
      'f': 'horizontal_vertical_position',
      'm': 'select_graphic_rendition',
      'i': 'aux_port',
      'n': 'device_status_report',
      's': 'save_cursor_position',
      'u': 'restore_cursor_position',
    };

    for (let i = 0; i < chars.length; i++) {
      const current = chars[i];
      this.blotOutCursor();

      if (current == '\n') {
        this.newLine();
        console.log('processded newline');
        return;
      }

      if (current == '\x1b') {
        // Handle esc code
        if (chars[i + 1] == ']') {
          // handle OS command to report title
          // this will end with BELL(\x07)
          while (chars[++i] !== '\x07') {
            console.log('skipping os command');
          }
          continue;
        } else if (chars[i + 1] == '[') {
          // control sequence introducer(CSI)
          const indicators = Object.keys(CSIlookup);
          let positionsIndices = indicators.map(
              (c, idx) => [chars.slice(i+1).indexOf(c), idx],
          );
          positionsIndices = positionsIndices.filter(
              (posIdx) => posIdx[0] !== -1,
          );
          const positions = positionsIndices.map((posIdx) => posIdx[0]);
          const indices = positionsIndices.map((posIdx) => posIdx[1]);

          const indicatorIdx = indices[argMin(positions)];
          const position = positions[argMin(positions)];
          const command = CSIlookup[indicators[indicatorIdx]];
          if (command == 'select_graphic_rendition') {
            const sgrCommand = chars.slice(i + 2, i + 1 + position);
            this.handleSRG(sgrCommand);
            i += 1 + position;
          }
          continue;
        }
      }

      console.log('emit: ' + current);
      this.ctx.font = this.outputFont;
      this.ctx.fillStyle = this.fontColor;
      this.ctx.fillText(current, this.cursor.x, this.cursor.y);
      this.cursor.x += this.charWidth;
    }
  }

  /**
   * Insert new line without printing a new prompt.
   */
  newLine() {
    this.cursor.x = 0;
    this.cursor.y += this.lineHeight;
    this.blotOutCursor();
  }

  /**
   * Rerender the terminal screen.
   */
  draw() {
    this.ctx.canvas.width = window.innerWidth-5;
    this.ctx.canvas.height = window.innerHeight-5;

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.font = this.outputFont;
    this.ctx.fillStyle = this.fontColor;

    let xVal = null;
    for (let i=0; i<this.cmd_list.length; i++) {
      this.drawPrompt(i+1);
      if (i == 0) xVal = this.promptWidth;
      else xVal = this.promptWidth - this.charWidth;

      this.ctx.font = this.outputFont;
      this.ctx.fillStyle = this.fontColor;
      for (let idx = 0; idx < this.cmd_list[i].length; idx++) {
        this.ctx.fillText(this.cmd_list[i][idx], xVal, this.lineHeight * (i+1));
        xVal += this.charWidth;
      }
    }
    if (this.currentCmd != '') {
      this.drawPrompt(Math.ceil(this.cursor.y / this.lineHeight));
      this.ctx.font = this.outputFont;
      this.ctx.fillStyle = this.fontColor;
      xVal = this.promptWidth - this.charWidth;
      for (let idx = 0; idx < this.currentCmd.length; idx++) {
        this.ctx.fillText(this.currentCmd[idx], xVal, this.cursor.y);
        xVal += this.charWidth;
      }
    } else this.drawPrompt(Math.ceil(this.cursor.y / this.lineHeight));
  }
}

/**
 * Cursor class
 * Makes it easier to render a blinking cursor and manage position/status.
 */
class Cursor {
  /**
   * constructor
   * @param{integer} x
   * @param{integer} y
   * @param{integer} width
   * @param{integer} height
   * @param{integer} interval - blinking interval
   * @param{integer} terminal - terminal object
   */
  constructor(x, y, width, height, interval, terminal) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.terminal = terminal;
    this.flashCounter = 0;

    setInterval(this.flash.bind(this), interval);
  }

  /**
   * flush (blink) a cursor.
   */
  flash() {
    const status_ = this.flashCounter % 3;

    switch (status_) {
      case 1:
      case 2: {
        this.terminal.ctx.fillStyle = this.terminal.fontColor;
        this.terminal.ctx.fillRect(this.x, this.y, this.width, this.height);
        this.flashCounter++;
        break;
      }
      default: {
        this.terminal.ctx.fillStyle = '#000000';
        this.terminal.ctx.fillRect(this.x, this.y, this.width, this.height);
        this.flashCounter= 1;
      }
    }
  }
}


/**
 * checks if a keycode represents "backspace"
 * @param{keycode} keycode
 * @return{bool} is_backspace
 * */
function isBackspace(keycode) {
  return (currentKey === 8 || currentKey === 'Backspace');
}


/**
 * checks if a keycode represents "enter"
 * @param{keycode} keycode
 * @return{bool} is_enter
 * */
function isEnter(keycode) {
  return currentKey == 13 || currentKey == 'Enter';
}


/**
 * argmin function
 * @param{array} array
 * @return{integer} minimum idx
 */
function argMin(array) {
  return [].map
      .call(array, (x, i) => [x, i])
      .reduce((r, a) => (a[0] < r[0] ? a : r))[1];
}
