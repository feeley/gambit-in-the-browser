var Module = {};

Module.stdin_buffer = [];

Module.stdin_add = function (str) {
    var bytes = intArrayFromString(str);
    bytes.pop(); // remove NUL at end
    if (bytes.length === 1 && bytes[0] === 3) { // ctrl-C ?
        Module.terminal.new_data("^C");
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

Module.error = Module.output;

function emscripten_tty_io(terminal, settings) {

    var self = Terminus.obj();

    self.setsize = function (nlines, ncols) { };

    self.send = function (str) {
        Module.stdin_add(str);
    };

//    setInterval(function () { terminal.adjust_size(); }, 500)

    return self;
}

// Scheme code execution driver

function run_scheme() {

    function step_scheme() {
        _heartbeat_interrupt();
        var wait = _idle();
        if (wait < 0) {
            _cleanup();
        } else {
            //console.log("wait=" + wait);
            setTimeout(step_scheme, Math.max(1, Math.round(1000*wait)));
        }
    };

    _setup();
    step_scheme();
}

// Start the interpreter when the page is ready

$(document).ready(function() {

    var setting_files = "resources/settings/default.yaml".split(":");

    Terminus.grab_settings({}, setting_files, function (settings) {
        var terminal = Terminus.Terminal($("#terminal"), settings);
        terminal.connect(emscripten_tty_io);
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

        run_scheme(); // run the Gambit Scheme interpreter
    });

});
