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
   * @param {integer} leftWindowMargin - left margin of terminal
   * @param {integer} cursorInterval - interval of cursor blinking
   * @param {string} backgroundColor
   * */
  constructor(
      lineHeight = 20,
      widthOffset = 2,
      cursorWidth = 8,
      cursorHeight = 3,
      fontColor = '#C0C0C0',
      outputFont = '12pt Consolas',
      leftWindowMargin = 2,
      cursorInterval = 300,
      backgroundColor = '#000000',
  ) {
    this.lineHeight = lineHeight;
    this.widthOffset = widthOffset;
    this.cursorWidth = cursorWidth;
    this.cursorHeight = cursorHeight;
    this.fontColor = fontColor;
    this.defaultFontColor = fontColor;
    this.outputFont = outputFont;
    this.defaultOutputFont = outputFont;
    this.leftWindowMargin = leftWindowMargin;
    this.cursorInterval = cursorInterval;
    this.backgroundColor = backgroundColor;
    this.defaultBackgroundColor = backgroundColor;

    this.cmd_list = [];

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

    this.cursor = new Cursor(
        this.leftWindowMargin, this.lineHeight,
        this.cursorWidth, this.cursorHeight, this.cursorInterval, this,
    );
    console.log('init x:' + this.cursor.x);
    console.log('init y:' + this.cursor.y);

    window.addEventListener('keydown', this.keyDownHandlerRemote.bind(this));
    window.addEventListener('keypress', this.keyPressHandlerRemote.bind(this));

    /**
     * sleep
     * @param{integer} ms
     * @return{Promise} promise
     */
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Keep receiving data from the server
     * @param{context} context
     */
    async function keepReceiving(context) {
      console.log('loaded');
      while (true) {
        console.log('looping');
        context.receiveStdout();
        await sleep(100);
      }
    }
    keepReceiving(this);
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
  keyPressHandlerRemote(e) {
    let currentKey = null;
    if (e.code !== undefined) currentKey = e.code;
    else currentKey = e.keyCode;
    console.log(currentKey);
    this.sendKey(e.keyCode);
  }

  /**
   * Send string to the server as stdin.
   * @param{integer} keycode
   */
  sendKey(keycode) {
    const req = new XMLHttpRequest();
    req.open('GET', '/stdin?key=' + keycode);
    req.send();
  }

  /**
   * special key handler.
   * this handler will send keys to the server.
   * @param{key} e - key
   * */
  keyDownHandlerRemote(e) {
    let currentKey = null;
    if (e.code !== undefined) currentKey = e.code;
    else currentKey = e.keyCode;

    // handle backspace key
    if (isSpecial(currentKey) && document.activeElement !== 'text') {
      console.log('special key: ' + currentKey);
      e.preventDefault();
      this.sendKey(e.keyCode);
    }
  }


  /**
   * Print stdout into the terminal.
   * @param{string} content - content of stdout
   */
  printStdout(content) {
    const lines = content.split('\n');
    lines.forEach((line) => {
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
   * SGR (Select Graphic Rendition) code handler.
   * this func is capable of handling the packed codes such as '01;32'.
   * @param{string} code - SGR code in string.
   */
  handleSGR(code) {
    console.log('SGR handler: received code:' + code);
    const codeArray = code.split(';');
    codeArray.forEach(
        (codeString) => this.handleSingleSGR(parseInt(codeString)),
    );
  }

  /**
   * SGR (Select Graphic Rendition) code handler.
   * @param{integer} code - SGR code in integer.
   */
  handleSingleSGR(code) {
    const colorList = [
      'Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta',
      'Cyan', 'White', 'Bright Black', 'Bright Red', 'Bright Green',
      'Bright Yellow', 'Bright Blue', 'Bright Magenta',
      'Bright Cyan', 'Bright White',
    ];

    /**
     * covert color index
     * @param{integer} index
     * @return{integer} convertedIndex
     */
    function colorIndexConverter(index) {
      if (index >= 0 && index <= 7) {
        return index;
      } else if (index >= 60 && index <= 67) {
        return index - 60 + 8;
      } else {
        console.log('Unexpected color: ' + index);
        return -1;
      }
    }


    if (code >= 30 && code <= 37) {
      // set foreground color
      const newColor = colorList[colorIndexConverter(code - 30)];
      this.setFontColor(newColor);
      console.log('set foreground color: ' + newColor);
    } else if (code >= 40 && code <= 47) {
      // set backgroundColor
      const newColor = colorList[colorIndexConverter(code - 40)];
      this.setBackgroundColor(newColor);
      console.log('set background color: ' + newColor);
    } else if (code == 0) {
      // reset
      this.fontColor = this.defaultFontColor;
      this.backgroundColor = this.defaultBackgroundColor;
    } else {
      // unimplemented code
      console.log('Igonored unimplemented SGR code: ' + code);
    }
  }

  /**
   * change the background color
   * @param{string} newColor
   */
  setBackgroundColor(newColor) {
    this.backgroundColor = newColor;
    this.draw();
  }

  /**
   * change the font color
   * @param{string} newColor
   */
  setFontColor(newColor) {
    this.fontColor = newColor;
  }

  /**
   * Handle characters.
   * If a character is printable, then print.
   * If it's ascii esc code, then this will attempt to handle it.
   * @param{string} chars - string including ASCII escape codes.
   */
  printChars(chars) {
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
        continue;
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
            this.handleSGR(sgrCommand);
            i += 1 + position;
          }
          continue;
        }
      }

      console.log('char print: ' + current);
      this.ctx.font = this.outputFont;
      this.ctx.fillStyle = this.fontColor;
      this.ctx.fillText(current, this.cursor.x, this.cursor.y);
      this.cursor.x += this.getWidth(current);
    }
  }

  /**
   * get width of given character
   * @param{char} c
   * @return{integer} width
   */
  getWidth(c) {
    const width = Math.ceil(this.ctx.measureText(c).width);
    return width;
  }

  /**
   * Insert new line without printing a new prompt.
   */
  newLine() {
    this.cursor.x = this.leftWindowMargin;
    this.cursor.y += this.lineHeight;
    this.blotOutCursor();
  }

  /**
   * Rerender the terminal screen.
   */
  draw() {
    this.ctx.canvas.width = window.innerWidth-5;
    this.ctx.canvas.height = window.innerHeight-5;

    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.font = this.outputFont;
    this.ctx.fillStyle = this.fontColor;
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
  return (keycode === 8 || keycode === 'Backspace');
}


/**
 * checks if a keycode represents "enter"
 * @param{keycode} keycode
 * @return{bool} is_enter
 * */
function isEnter(keycode) {
  return keycode == 13 || keycode == 'Enter';
}


/**
 * checks if a keycode represents "special keys"
 * such as enter, backspace, etc...
 * @param{keycode} keycode
 * @return{bool} is_special
 * */
function isSpecial(keycode) {
  return isEnter(keycode) || isBackspace(keycode);
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
