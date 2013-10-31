//=============================================================================

// File: "intf.js"

// Copyright (c) 2013 by Marc Feeley, All Rights Reserved.

//=============================================================================

var Module = {};

Module.stdin_buffer = [];

Module.stdin_add = function (str) {
    var bytes = intArrayFromString(str);
    bytes.pop(); // remove NUL at end
    if (bytes.length === 1 && bytes[0] === 3) { // ctrl-C ?
        Module.terminal.new_data('^C');
        _user_interrupt();
    } else {
        Module.stdin_buffer = Module.stdin_buffer.concat(bytes);
    }
};

Module.stdin = function () {

    if (Module.stdin_buffer.length === 0) {
        return undefined;
    } else {
        return Module.stdin_buffer.shift();
    }
};

Module.stdout = function (val) {

    if (val !== null) {

        var str;

        if (val === 10) {
            str = '\r\n';
        } else {
            str = String.fromCharCode(val);
        }

        Module.terminal.new_data(str);
    }
};

Module.stderr = Module.stdout;

Module.setupTTYIO = function () {

    // redirect TTY I/O to stdin and stdout

    var ops = {
        get_char: function (tty) {
            return Module.stdin();
        },
        put_char: function (tty, val) {
            return Module.stdout(val);
        }
    };

    TTY.register(FS.makedev(5, 0), ops); // redirect /dev/tty
    TTY.register(FS.makedev(6, 0), ops); // redirect /dev/tty1
};

Module.preRun = [Module.setupTTYIO];

Module.setupTerminal = function (terminal, settings) {

    var self = Terminus.obj();

    self.setsize = function (nlines, ncols) { };

    self.send = function (str) {
        Module.stdin_add(str);
    };

//    setInterval(function () { terminal.adjust_size(); }, 500)

    return self;
};

// Scheme code execution driver

Module.schemeDriver = function () {

    function step_scheme() {
        _heartbeat_interrupt();
        var wait = _idle();
        if (wait < 0) {
            _cleanup();
        } else {
            //console.log('wait=' + wait);
            setTimeout(step_scheme, Math.max(1, Math.round(1000*wait)));
        }
    };

    _setup();
    step_scheme();
};

Module.schemeStart = function () {

    var setting_files = 'resources/settings/default.yaml'.split(':');

    Terminus.grab_settings({}, setting_files, function (settings) {

        var terminal = Terminus.Terminal($('#terminal'), settings);
        terminal.connect(Module.setupTerminal);
        Terminus.interact(terminal, settings.bindings);

        Module.terminal = terminal;

        setInterval(function () {
            // Blinking cursor
            $('.cursor').each (function () {
                var elem = $(this);
                var c = elem.css('color');
                var bgc = elem.css('background-color');
                elem.css('color', bgc);
                elem.css('background-color', c);
            })}, 400)

//        $(window).bind('resize', function (e) {
//            setTimeout(terminal.adjust_size, 10);
//        });

        Module.schemeDriver(); // run the Scheme code
    });

};

// Start the Scheme program when the page is ready

$(document).ready(Module.schemeStart);

//=============================================================================
