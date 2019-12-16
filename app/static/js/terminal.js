window.addEventListener("load", () => new Terminal());

class Terminal{
    constructor(
        lineHeight = 20,
        widthOffset = 2,
        cursorWidth = 8,
        cursorHeight = 3,
        fontColor = "#C0C0C0",
        outputFont = "12pt Consolas",
        prompt_ = "c =\\>",
        promptPad = 3,
        leftWindowMargin = 2,
        cursorInterval = 300,
    ){
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
        this.currentCmd = "";

        this.canvas = null;
        this.ctx = null;
        this.cursor = null;

        this.init();
        this.draw();
    }

    init(){
        this.canvas = document.getElementById("terminal");
        this.ctx = this.canvas.getContext("2d");

        this.charWidth = Math.ceil(this.ctx.measureText('W').width)
        this.promptWidth = this.charWidth * this.prompt_.length + this.promptPad;

        this.cursor = new Cursor(
            this.promptWidth, this.lineHeight,
            this.cursorWidth, this.cursorHeight, this.cursorInterval, this,
        );
        console.log('init x:' + this.cursor.x)
        console.log('init y:' + this.cursor.y)

        window.addEventListener("resize", this.draw.bind(this));
        window.addEventListener("keydown", this.keyDownHandler.bind(this));
        window.addEventListener("keypress", this.showKey.bind(this));
    }

    drawNewLine(){
        this.ctx.font = this.outputFont;
        this.ctx.fillStyle = this.fontColor;
        this.ctx.fillText(this.prompt_, this.leftWindowMargin, this.cursor.y + this.lineHeight);
    }

    drawPrompt(Yoffset) {
        this.ctx.font = this.outputFont;
        this.ctx.fillStyle = this.fontColor;
        this.ctx.fillText(this.prompt_, this.leftWindowMargin, Yoffset * this.lineHeight);
    }

    blotPrevChar(){
        this.blotOutCursor();
        this.ctx.fillStyle = "#000000";
        this.cursor.x -= this.charWidth;
        this.ctx.fillRect(this.cursor.x, this.cursor.y - (this.charWidth + this.widthOffset), this.cursor.width + 3, 15);
    }

    blotOutCursor(){
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(this.cursor.x, this.cursor.y, this.cursor.width, this.cursor.height);
    }

    keyDownHandler(e){
        var currentKey = null;
        console.log("current: " + this.currentCmd)
        if (e.code !== undefined) {
            currentKey = e.code;
            console.log("e.code : " + e.code);
        } else {
            currentKey = e.keyCode;
            console.log("e.keyCode : " + e.keyCode);
        }
        console.log(currentKey);
        // handle backspace key
        if((currentKey === 8 || currentKey === 'Backspace') && document.activeElement !== 'text') {
                e.preventDefault();
                // promptWidth is the beginning of the line with the c:\>
                if (this.cursor.x > this.promptWidth) {
                    blotPrevChar();
                    if (currentCmd.length > 0) currentCmd = currentCmd.slice(0,-1);
                }
        }
        // handle <ENTER> key
        if (currentKey == 13 || currentKey == 'Enter') {
            this.blotOutCursor();
            this.drawNewLine();
            this.cursor.x = this.promptWidth - this.charWidth;
            this.cursor.y += this.lineHeight;
            if (this.currentCmd.length > 0) {
                this.cmd_list.push(this.currentCmd);
                this.currentCmd = "";
            }
        }
    }

    showKey(e){
        this.blotOutCursor();

        this.ctx.font = this.outputFont;
        this.ctx.fillStyle = this.fontColor;

        this.ctx.fillText(String.fromCharCode(e.charCode), this.cursor.x, this.cursor.y);
        this.cursor.x += this.charWidth;
        console.log(this.cursor.x)
        console.log(this.cursor.y)
        this.currentCmd += String.fromCharCode(e.charCode);
    }

    draw() {
        this.ctx.canvas.width  = window.innerWidth-5;
        this.ctx.canvas.height = window.innerHeight-5;
        
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.font = this.outputFont;
        this.ctx.fillStyle = this.fontColor;
        
        var xVal = null;
        for (var i=0; i<this.cmd_list.length; i++) {
            this.drawPrompt(i+1);
            if (i == 0) xVal = this.promptWidth;
            else xVal = this.promptWidth - this.charWidth;
                
            this.ctx.font = this.outputFont;
            this.ctx.fillStyle = this.fontColor;
            for (var letterCount = 0; letterCount < this.cmd_list[i].length; letterCount++) {
                this.ctx.fillText(this.cmd_list[i][letterCount], xVal, this.lineHeight * (i+1));
                xVal += this.charWidth;
            }
        }
        if (this.currentCmd != "") {
            this.drawPrompt(Math.ceil(this.cursor.y / this.lineHeight));
            this.ctx.font = this.outputFont;
            this.ctx.fillStyle = this.fontColor;
            xVal = this.promptWidth - this.charWidth;
            for (var letterCount = 0; letterCount < this.currentCmd.length; letterCount++) {
                this.ctx.fillText(this.currentCmd[letterCount], xVal, this.cursor.y);
                xVal += this.charWidth;
            }
        } else this.drawPrompt(Math.ceil(this.cursor.y / this.lineHeight));
    }
}

class Cursor {
    constructor(x, y, width, height, interval, terminal){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.terminal = terminal;
        this.flashCounter = 0;

        setInterval(this.flash.bind(this), interval);
    }

    flash(){
        var status_ = this.flashCounter % 3;

        switch (status_) {
            case 1 :
            case 2 : {
                this.terminal.ctx.fillStyle = this.terminal.fontColor;
                this.terminal.ctx.fillRect(this.x, this.y, this.width, this.height);
                this.flashCounter++;
                break;
            }
            default: {
                this.terminal.ctx.fillStyle = "#000000";
                this.terminal.ctx.fillRect(this.x, this.y, this.width, this.height);
                this.flashCounter= 1;
            }
        }
    }
}

