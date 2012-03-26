// @PLUGIN Captures touch events on mobile devices to reduce delay.
jQuery.event.special.tap = {
    setup: function (a, b) {
        var c = this,
            d = jQuery(c);
        if (window.Touch) {
            d.bind("touchstart", jQuery.event.special.tap.onTouchStart);
            d.bind("touchmove", jQuery.event.special.tap.onTouchMove);
            d.bind("touchend", jQuery.event.special.tap.onTouchEnd)
        } else {
            d.bind("click", jQuery.event.special.tap.click)
        }
    },
    click: function (a) {
        a.type = "tap";
        jQuery.event.handle.apply(this, arguments)
    },
    teardown: function (a) {
        if (window.Touch) {
            $elem.unbind("touchstart", jQuery.event.special.tap.onTouchStart);
            $elem.unbind("touchmove", jQuery.event.special.tap.onTouchMove);
            $elem.unbind("touchend", jQuery.event.special.tap.onTouchEnd)
        } else {
            $elem.unbind("click", jQuery.event.special.tap.click)
        }
    },
    onTouchStart: function (a) {
        this.moved = false
    },
    onTouchMove: function (a) {
        this.moved = true
    },
    onTouchEnd: function (a) {
        if (!this.moved) {
            a.type = "tap";
            jQuery.event.handle.apply(this, arguments)
        }
    }
};
// @PLUGIN Editor
var BLANKLINE = '';
var Wysiwym = {};
$.fn.wysiwym = function(markupSet, options) {
    this.EDITORCLASS = 'editor';           // Class to use for the wysiwym editor
    this.BUTTONCLASS = 'buttons';          // Class to use for the wysiwym buttons
    this.HELPCLASS = 'help';               // Class to use for the wysiwym help
    this.HELPTOGGLECLASS = 'help-toggle';  // Class to use for the wysiwym help
    this.textelem = this;                          // Javascript textarea element
    this.textarea = $(this);                       // jQuery textarea object
    this.editor = undefined;                       // jQuery div wrapper around this editor
    this.markup = new markupSet(this);             // Wysiwym Markup set to use
    this.defaults = {                              // Default option values
        containerButtons: undefined,               // jQuery elem to place buttons (makes one by default)
        containerHelp: undefined,                  // jQuery elem to place help (makes one by default)
        helpEnabled: true,                         // Set true to display the help dropdown
        helpToggle: true,                          // Set true to use a toggle link for help
        helpToggleElem: undefined,                 // jQuery elem to toggle help (makes <a> by default)
        helpTextShow: 'show markup syntax',        // Toggle text to display when help is not visible
        helpTextHide: 'hide markup syntax'         // Toggle text to display when help is visible
    };
    this.options = $.extend(this.defaults, options ? options : {});
    // Add the button container and all buttons
    this.initializeButtons = function() {
        var markup = this.markup;
        if (this.options.containerButtons == undefined)
            this.options.containerButtons = $("<div></div>").insertBefore(this.textarea);
        this.options.containerButtons.addClass(this.BUTTONCLASS);
        for (var i=0; i<markup.buttons.length; i++) {
            // Create the button and apply first / last classes
            var button = markup.buttons[i];
            var jqbutton = button.create();
            if (i == 0) { jqbutton.addClass('first'); }
            if (i == markup.buttons.length-1) { jqbutton.addClass('last'); }
            // Bind the button data and click event callback
            var data = $.extend({markup:this.markup}, button.data);
            jqbutton.bind('click', data, button.callback);
            this.options.containerButtons.append(jqbutton);
        }
    };
    // Initialize the AutoIndent trigger
    this.initializeAutoIndent = function() {
        if (this.markup.autoindents) {
            var data = {markup:this.markup};
            this.textarea.bind('keydown', data, Wysiwym.autoIndent);
        }
    };
    // Initialize the help syntax dropdown
    this.initializeHelp = function() {
        if (this.options.helpEnabled) {
            if (this.options.containerHelp == undefined)
                this.options.containerHelp = $("<div></div>").insertAfter(this.textarea);
            this.options.containerHelp.addClass(this.HELPCLASS);
            // Add the help table and items
            var helpBody = $('<tbody></tbody>');
            var helpTable = $('<table cellpadding="0" cellspacing="0" border="0"></table>').append(helpBody);
            for (var i=0; i<this.markup.help.length; i++) {
                var item = this.markup.help[i];
                helpBody.append('<tr><th>'+ item.label +'</th><td>'+ item.syntax +'</td></tr>');
            };
            this.options.containerHelp.append(helpTable);
        }
    };
    // Initialize the Help Toggle Button
    this.initializeHelpToggle = function() {
        if (this.options.helpToggle && this.options.helpEnabled) {
            var self = this;  // Required for use inside click callback
            if (this.options.helpToggleElem == undefined)
                this.options.helpToggleElem = $("<a href='#'>"+ this.options.helpTextShow +"</a>");
            this.options.helpToggleElem.addClass(this.HELPTOGGLECLASS);
            this.options.helpToggleElem.bind('click', function() {
                if (self.options.containerHelp.is(':visible')) {
                    self.options.containerHelp.slideUp('fast');
                    $(this).text(self.options.helpTextShow);
                } else {
                    self.options.containerHelp.slideDown('fast');
                    $(this).text(self.options.helpTextHide);
                }
                return false;
            });
            this.options.containerHelp.before(this.options.helpToggleElem).hide();
        }
    };
    // Initialize the Wysiwym Editor
    this.editor = $('<div class="'+ this.EDITORCLASS +'"></div>');
    this.textarea.wrap(this.editor);
    this.initializeButtons();
    this.initializeAutoIndent();
    this.initializeHelp();
    this.initializeHelpToggle();
};
Wysiwym.Selection = function(wysiwym) {
    this.lines = wysiwym.lines;                 // Reference to wysiwym.lines
    this.start = { line:0, position:0 },        // Current cursor start positon
    this.end = { line:0, position:0 },          // Current cursor end position
    // Return a string representation of this object.
    this.toString = function() {
        var str = 'SELECTION: '+ this.length() +' chars\n';
        str += 'START LINE: '+ this.start.line +'; POSITION: '+ this.start.position +'\n';
        str += 'END LINE: '+ this.end.line +'; POSITION: '+ this.end.position +'\n';
        return str;
    };
    // Add a line prefix, reguardless if it's already set or not.
    this.addLinePrefixes = function(prefix) {
        for (var i=this.start.line; i <= this.end.line; i++) {
            this.lines[i] = prefix + this.lines[i];
        }
        this.start.position += prefix.length;
        this.end.position += prefix.length;
    };
    // Add the specified prefix to the selection
    this.addPrefix = function(prefix) {
        var numlines = this.lines.length;
        var line = this.lines[this.start.line];
        var newline = line.substring(0, this.start.position) +
            prefix + line.substring(this.start.position, line.length);
        this.lines[this.start.line] = newline;
        this.start.position += prefix.length;
        if (this.start.line == this.end.line)
            this.end.position += prefix.length;
        // Check we need to update the scroll height;  This is very slightly
        // off because height != scrollHeight. A fix would be nice.
        if (prefix.indexOf('\n') != -1) {
            var scrollHeight = wysiwym.textelem.scrollHeight;
            var lineheight = parseInt(scrollHeight / numlines);
            wysiwym.scroll += lineheight;
        }
    };
    // Add the specified suffix to the selection
    this.addSuffix = function(suffix) {
        var line = this.lines[this.end.line];
        var newline = line.substring(0, this.end.position) +
            suffix + line.substring(this.end.position, line.length);
        this.lines[this.end.line] = newline;
    };
    // Append the specified text to the selection
    this.append = function(text) {
        var line = this.lines[this.end.line];
        var newline = line.substring(0, this.end.position) +
            text + line.substring(this.end.position, line.length);
        this.lines[this.end.line] = newline;
        this.end.position += text.length;
    };
    // Return an array of lines in the selection
    this.getLines = function() {
        var selectedlines = [];
        for (var i=this.start.line; i <= this.end.line; i++)
            selectedlines[selectedlines.length] = this.lines[i];
        return selectedlines;
    };
    // Return true if selected text contains has the specified prefix
    this.hasPrefix = function(prefix) {
        var line = this.lines[this.start.line];
        var start = this.start.position - prefix.length;
        if ((start < 0) || (line.substring(start, this.start.position) != prefix))
            return false;
        return true;
    };
    // Return true if selected text contains has the specified suffix
    this.hasSuffix = function(suffix) {
        var line = this.lines[this.end.line];
        var end = this.end.position + suffix.length;
        if ((end > line.length) || (line.substring(this.end.position, end) != suffix))
            return false;
        return true;
    };
    // Insert the line before the selection to the specified text. If force is
    // set to false and the line is already set, it will be left alone.
    this.insertPreviousLine = function(newline, force) {
        force = force !== undefined ? force : true;
        var prevnum = this.start.line - 1;
        if ((force) || ((prevnum >= 0) && (this.lines[prevnum] != newline))) {
            this.lines.splice(this.start.line, 0, newline);
            this.start.line += 1;
            this.end.line += 1;
        }
    };
    // Insert the line after the selection to the specified text. If force is
    // set to false and the line is already set, it will be left alone.
    this.insertNextLine = function(newline, force) {
        force = force !== undefined ? force : true;
        var nextnum = this.end.line + 1;
        if ((force) || ((nextnum < this.lines.length) && (this.lines[nextnum] != newline)))
            this.lines.splice(nextnum, 0, newline);
    };
    // Return true if selected text is wrapped with prefix & suffix
    this.isWrapped = function(prefix, suffix) {
        return ((this.hasPrefix(prefix)) && (this.hasSuffix(suffix)));
    };
    // Return the selection length
    this.length = function() {
        return this.val().length;
    };
    // Return true if all lines have the specified prefix. Optionally
    // specify prefix as a regular expression.
    this.linesHavePrefix = function(prefix) {
        for (var i=this.start.line; i <= this.end.line; i++) {
            var line = this.lines[i];
            if ((typeof(prefix) == 'string') && (!line.startswith(prefix))) {
                return false;
            } else if ((typeof(prefix) != 'string') && (!line.match(prefix))) {
                return false;
            }
        }
        return true;
    };
    // Prepend the specified text to the selection
    this.prepend = function(text) {
        var line = this.lines[this.start.line];
        var newline = line.substring(0, this.start.position) +
            text + line.substring(this.start.position, line.length);
        this.lines[this.start.line] = newline;
        // Update Class Variables
        if (this.start.line == this.end.line)
            this.end.position += text.length;
    };
    // Remove the prefix from each line in the selection. If the line
    // does not contain the specified prefix, it will be left alone.
    // Optionally specify prefix as a regular expression.
    this.removeLinePrefixes = function(prefix) {
        for (var i=this.start.line; i <= this.end.line; i++) {
            var line = this.lines[i];
            var match = prefix;
            // Check prefix is a regex
            if (typeof(prefix) != 'string')
                match = line.match(prefix)[0];
            // Do the replace
            if (line.startswith(match)) {
                this.lines[i] = line.substring(match.length, line.length);
                if (i == this.start.line)
                    this.start.position -= match.length;
                if (i == this.end.line)
                    this.end.position -= match.length;
            }
        }
    };
    // Remove the previous line. If regex is specified, it will
    // only be removed if there is a match.
    this.removeNextLine = function(regex) {
        var nextnum = this.end.line + 1;
        var removeit = false;
        if ((nextnum < this.lines.length) && (regex) && (this.lines[nextnum].match(regex)))
            removeit = true;
        if ((nextnum < this.lines.length) && (!regex))
            removeit = true;
        if (removeit)
            this.lines.splice(nextnum, 1);
    };
    // Remove the specified prefix from the selection
    this.removePrefix = function(prefix) {
        if (this.hasPrefix(prefix)) {
            var line = this.lines[this.start.line];
            var start = this.start.position - prefix.length;
            var newline = line.substring(0, start) +
                line.substring(this.start.position, line.length);
            this.lines[this.start.line] = newline;
            this.start.position -= prefix.length;
            if (this.start.line == this.end.line)
                this.end.position -= prefix.length;
        }
    };
    // Remove the previous line. If regex is specified, it will
    // only be removed if there is a match.
    this.removePreviousLine = function(regex) {
        var prevnum = this.start.line - 1;
        var removeit = false;
        if ((prevnum >= 0) && (regex) && (this.lines[prevnum].match(regex)))
            removeit = true;
        if ((prevnum >= 0) && (!regex))
            removeit = true;
        if (removeit) {
            this.lines.splice(prevnum, 1);
            this.start.line -= 1;
            this.end.line -= 1;
        }
    };
    // Remove the specified suffix from the selection
    this.removeSuffix = function(suffix) {
        if (this.hasSuffix(suffix)) {
            var line = this.lines[this.end.line];
            var end = this.end.position + suffix.length;
            var newline = line.substring(0, this.end.position) +
                line.substring(end, line.length);
            this.lines[this.end.line] = newline;
        }
    };
    // Set the prefix of each selected line. If the prefix is already and
    // set, the line willl be left alone.
    this.setLinePrefixes = function(prefix, increment) {
        increment = increment ? increment : false;
        for (var i=this.start.line; i <= this.end.line; i++) {
            if (!this.lines[i].startswith(prefix)) {
                // Check if prefix is incrementing
                if (increment) {
                    var num = parseInt(prefix.match(/\d+/)[0]);
                    prefix = prefix.replace(num, num+1);
                }
                // Add the prefix to the line
                var numspaces = this.lines[i].match(/^\s*/)[0].length;
                this.lines[i] = this.lines[i].lstrip();
                this.lines[i] = prefix + this.lines[i];
                if (i == this.start.line)
                    this.start.position += prefix.length - numspaces;
                if (i == this.end.line)
                    this.end.position += prefix.length - numspaces;
            }
        }
    };
    // Unwrap the selection prefix & suffix
    this.unwrap = function(prefix, suffix) {
        this.removePrefix(prefix);
        this.removeSuffix(suffix);
    };
    // Remove blank lines from before and after the selection.  If the
    // previous or next line is not blank, it will be left alone.
    this.unwrapBlankLines = function() {
        wysiwym.selection.removePreviousLine(/^\s*$/);
        wysiwym.selection.removeNextLine(/^\s*$/);
    };
    // Return the selection value
    this.val = function() {
        var value = '';
        for (var i=0; i < this.lines.length; i++) {
            var line = this.lines[i];
            if ((i == this.start.line) && (i == this.end.line)) {
                return line.substring(this.start.position, this.end.position);
            } else if (i == this.start.line) {
                value += line.substring(this.start.position, line.length) +'\n';
            } else if ((i > this.start.line) && (i < this.end.line)) {
                value += line +'\n';
            } else if (i == this.end.line) {
                value += line.substring(0, this.end.position)
            }
        }
        return value;
    };
    // Wrap the selection with the specified prefix & suffix
    this.wrap = function(prefix, suffix) {
        this.addPrefix(prefix);
        this.addSuffix(suffix);
    };
    // Wrap the selected lines with blank lines.  If there is already
    // a blank line in place, another one will not be added.
    this.wrapBlankLines = function() {
        if (wysiwym.selection.start.line > 0)
            wysiwym.selection.insertPreviousLine(BLANKLINE, false);
        if (wysiwym.selection.end.line < wysiwym.lines.length - 1)
            wysiwym.selection.insertNextLine(BLANKLINE, false);
    };
}
Wysiwym.Textarea = function(textarea) {
    this.textelem = textarea.get(0)                 // Javascript textarea element
    this.textarea = textarea;                       // jQuery textarea object
    this.lines = [];                                // Current textarea lines
    this.selection = new Wysiwym.Selection(this);   // Selection properties & manipulation
    this.scroll = this.textelem.scrollTop;          // Current cursor scroll position
    // Return a string representation of this object.
    this.toString = function() {
        var str = 'TEXTAREA: #'+ this.textarea.attr('id') +'\n';
        str += this.selection.toString();
        str += 'SCROLL: '+ this.scroll +'px\n';
        str += '---\n';
        for (var i=0; i<this.lines.length; i++)
            str += 'LINE '+ i +': '+ this.lines[i] +'\n';
        return str;
    };
    // Return the current text value of this textarea object
    this.getProperties = function() {
        var newtext = '';           // New textarea value
        var selectionStart = 0;     // Absolute cursor start position
        var selectionEnd = 0;       // Absolute cursor end position
        for (var i=0; i < this.lines.length; i++) {
            if (i == this.selection.start.line)
                selectionStart = newtext.length + this.selection.start.position;
            if (i == this.selection.end.line)
                selectionEnd = newtext.length + this.selection.end.position;
            newtext += this.lines[i];
            if (i != this.lines.length - 1)
                newtext += '\n';
        }
        return [newtext, selectionStart, selectionEnd];
    };
    // Return the absolute start and end selection postions
    // StackOverflow #1: http://goo.gl/2vSnF
    // StackOverflow #2: http://goo.gl/KHm0d
    this.getSelectionStartEnd = function() {
        if (typeof(this.textelem.selectionStart) == 'number') {
            var startpos = this.textelem.selectionStart;
            var endpos = this.textelem.selectionEnd;
        } else {
            this.textelem.focus();
            var text = this.textelem.value.replace(/\r\n/g, '\n');
            var textlen = text.length;
            var range = document.selection.createRange();
            var textrange = this.textelem.createTextRange();
            textrange.moveToBookmark(range.getBookmark());
            var endrange = this.textelem.createTextRange();
            endrange.collapse(false);
            if (textrange.compareEndPoints('StartToEnd', endrange) > -1) {
                var startpos = textlen;
                var endpos = textlen;
            } else {
                var startpos = -textrange.moveStart('character', -textlen);
                //startpos += text.slice(0, startpos).split('\n').length - 1;
                if (textrange.compareEndPoints('EndToEnd', endrange) > -1) {
                    var endpos = textlen;
                } else {
                    var endpos = -textrange.moveEnd('character', -textlen);
                    //endpos += text.slice(0, endpos).split('\n').length - 1;
                }
            }
        }
        return [startpos, endpos];
    };
    // Update the textarea with the current lines and cursor settings
    this.update = function() {
        var properties = this.getProperties();
        var newtext = properties[0];
        var selectionStart = properties[1];
        var selectionEnd = properties[2];
        this.textarea.val(newtext);
        if (this.textelem.setSelectionRange) {
            this.textelem.setSelectionRange(selectionStart, selectionEnd);
        } else if (this.textelem.createTextRange) {
            var range = this.textelem.createTextRange();
            range.collapse(true);
            range.moveStart('character', selectionStart);
            range.moveEnd('character', selectionEnd - selectionStart);
            range.select();
        }
        console.log('Set scroll: '+ this.scroll)
        this.textelem.scrollTop = this.scroll;
        this.textarea.focus();
    };
    // Initialize the Wysiwym.Textarea
    this.init = function() {
        var text = textarea.val().replace(/\r\n/g, '\n');
        var selectionInfo = this.getSelectionStartEnd(this.textelem);
        var selectionStart = selectionInfo[0];
        var selectionEnd = selectionInfo[1];
        var endline = 0;
        while (endline >= 0) {
            var endline = text.indexOf('\n');
            var line = text.substring(0, endline >= 0 ? endline : text.length);
            if ((selectionStart <= line.length) && (selectionEnd >= 0)) {
                if (selectionStart >= 0) {
                    this.selection.start.line = this.lines.length;
                    this.selection.start.position = selectionStart;
                }
                if (selectionEnd <= line.length) {
                    this.selection.end.line = this.lines.length;
                    this.selection.end.position = selectionEnd;
                }
            }
            this.lines[this.lines.length] = line;
            text = endline >= 0 ? text.substring(endline + 1, text.length) : '';
            selectionStart -= endline + 1;
            selectionEnd -= endline + 1;
        }
        // Tweak the selection end position if its on the edge
        if ((this.selection.end.position == 0) && (this.selection.end.line != this.selection.start.line)) {
            this.selection.end.line -= 1;
            this.selection.end.position = this.lines[this.selection.end.line].length;
        }
    };
    this.init();
};
Wysiwym.Button = function(name, callback, data, cssclass) {
    this.name = name;                  // Button Name
    this.callback = callback;          // Callback function for this button
    this.data = data ? data : {};      // Callback arguments
    this.cssclass = cssclass;          // CSS Class to apply to button
    // Return the CSS Class for this button
    this.getCssClass = function() {
        if (!this.cssclass)
            return this.name.toLowerCase().replace(' ', '');
        return this.cssclass;
    };
    // Create and return a new Button jQuery element
    this.create = function() {
        var text = $('<span class="text">'+ this.name +'</span>');
        var wrap = $('<span class="wrap"></span>').append(text);
        var button = $('<div class="button"></div>').append(wrap);
        // Apply the title, css, and click bind.
        button.attr('title', this.name);
        button.addClass(this.getCssClass());
        // Make everything 'unselectable' so IE doesn't freak out
        text.attr('unselectable', 'on');
        wrap.attr('unselectable', 'on');
        button.attr('unselectable', 'on');
        return button;
    };
}
Wysiwym.span = function(event) {
    var markup = event.data.markup;    // (required) Markup Language
    var prefix = event.data.prefix;    // (required) Text wrap prefix
    var suffix = event.data.suffix;    // (required) Text wrap suffix
    var text = event.data.text;        // (required) Default wrap text (if nothing selected)
    var wysiwym = new Wysiwym.Textarea(markup.textarea);
    if (wysiwym.selection.isWrapped(prefix, suffix)) {
        wysiwym.selection.unwrap(prefix, suffix);
    } else if (wysiwym.selection.length() == 0) {
        wysiwym.selection.append(text);
        wysiwym.selection.wrap(prefix, suffix);
    } else {
        wysiwym.selection.wrap(prefix, suffix);
    }
    wysiwym.update();
};
Wysiwym.list = function(event) {
    var markup = event.data.markup;    // (required) Markup Language
    var prefix = event.data.prefix;    // (required) Line prefix text
    var wrap = event.data.wrap;        // (optional) If true, wrap list with blank lines
    var regex = event.data.regex;      // (optional) Set to regex matching prefix to increment num
    var wysiwym = new Wysiwym.Textarea(markup.textarea);
    if (wysiwym.selection.linesHavePrefix(regex?regex:prefix)) {
        wysiwym.selection.removeLinePrefixes(regex?regex:prefix);
        if (wrap) { wysiwym.selection.unwrapBlankLines(); }
    } else {
        wysiwym.selection.setLinePrefixes(prefix, regex);
        if (wrap) { wysiwym.selection.wrapBlankLines(); }
    }
    wysiwym.update();
};
Wysiwym.block = function(event) {
    var markup = event.data.markup;    // (required) Markup Language
    var prefix = event.data.prefix;    // (required) Line prefix text
    var wrap = event.data.wrap;        // (optional) If true, wrap list with blank lines
    var wysiwym = new Wysiwym.Textarea(markup.textarea);
    var firstline = wysiwym.selection.getLines()[0];
    if (firstline.startswith(prefix)) {
        wysiwym.selection.removeLinePrefixes(prefix);
        if (wrap) { wysiwym.selection.unwrapBlankLines(); }
    } else {
        wysiwym.selection.addLinePrefixes(prefix);
        if (wrap) { wysiwym.selection.wrapBlankLines(); }
    }
    wysiwym.update();
};
Wysiwym.autoIndent = function(event) {
    // Only continue if keyCode == 13
    if (event.keyCode != 13)
        return true;
    // ReturnKey pressed, lets indent!
    var markup = event.data.markup;    // Markup Language
    var wysiwym = new Wysiwym.Textarea(markup.textarea);
    var linenum = wysiwym.selection.start.line;
    var line = wysiwym.lines[linenum];
    var postcursor = line.substring(wysiwym.selection.start.position, line.length);
    // Make sure nothing is selected & there is no text after the cursor
    if ((wysiwym.selection.length() != 0) || (postcursor))
        return true;
    // So far so good; check for a matching indent regex
    for (var i=0; i < markup.autoindents.length; i++) {
        var regex = markup.autoindents[i];
        var matches = line.match(regex);
        if (matches) {
            var prefix = matches[0];
            var suffix = line.substring(prefix.length, line.length);
            // NOTE: If a selection is made in the regex, it's assumed that the
            // matching text is a number should be auto-incremented (ie: #. lists).
            if (matches.length == 2) {
                var num = parseInt(matches[1]);
                prefix = prefix.replace(matches[1], num+1);
            }
            if (suffix) {
                // Regular auto-indent; Repeat the prefix
                wysiwym.selection.addPrefix('\n'+ prefix);
                wysiwym.update();
                return false;
            } else {
                // Return on blank indented line (clear prefix)
                wysiwym.lines[linenum] = BLANKLINE;
                wysiwym.selection.start.position = 0;
                wysiwym.selection.end.position = wysiwym.selection.start.position;
                if (markup.exitindentblankline) {
                    wysiwym.selection.addPrefix('\n');
                }
                wysiwym.update();
                return false;
            }
        }
    }
    return true;
}
Wysiwym.Markdown = function(textarea) {
    this.textarea = textarea;    // jQuery textarea object
    // Initialize the Markdown Buttons
    this.buttons = [
        new Wysiwym.Button('Headline',   Wysiwym.span,  {prefix:'#', suffix:'#', text:'标题'}),
        new Wysiwym.Button('Bold',   Wysiwym.span,  {prefix:'**', suffix:'**', text:'加粗'}),
        new Wysiwym.Button('Italic', Wysiwym.span,  {prefix:'_',  suffix:'_',  text:'斜体'}),
        new Wysiwym.Button('Link',   Wysiwym.span,  {prefix:'[',  suffix:'](http://example.com)', text:'链接'}),
        new Wysiwym.Button('Bullet List', Wysiwym.list, {prefix:'* ', wrap:true}),
        //new Wysiwym.Button('Number List', Wysiwym.list, {prefix:'0. ', wrap:true, regex:/^\s*\d+\.\s/}),
        new Wysiwym.Button('Quote',  Wysiwym.list,  {prefix:'> ',   wrap:true}),
        new Wysiwym.Button('Code',   Wysiwym.block, {prefix:'    ', wrap:true}),
    ];
    // Configure auto-indenting
    this.exitindentblankline = true;    // True to insert blank line when exiting auto-indent ;)
    this.autoindents = [                // Regex lookups for auto-indent
        /^\s*\*\s/,                     // Bullet list
        /^\s*(\d+)\.\s/,                // Number list (number selected for auto-increment)
        /^\s*\>\s/,                     // Quote list
        /^\s{4}\s*/                     // Code block
    ];
    // Syntax items to display in the help box
    this.help = [
        { label: 'Header', syntax: '## Header ##' },
        { label: 'Bold',   syntax: '**bold**' },
        { label: 'Italic', syntax: '_italics_' },
        { label: 'Link',   syntax: '[pk!](http://google.com)' },
        { label: 'Bullet List', syntax: '* list item' },
        { label: 'Number List', syntax: '1. list item' },
        { label: 'Blockquote', syntax: '&gt; quoted text' },
        { label: 'Large Code Block', syntax: '(Begin lines with 4 spaces)' },
        { label: 'Inline Code Block', syntax: '&lt;code&gt;inline code&lt;/code&gt;' }
    ];
};
String.prototype.strip = function() { return this.replace(/^\s+|\s+$/g, ''); };
String.prototype.lstrip = function() { return this.replace(/^\s+/, ''); };
String.prototype.rstrip = function() { return this.replace(/\s+$/, ''); };
String.prototype.startswith = function(str) { return this.substring(0, str.length) == str; };
String.prototype.endswith = function(str) { return this.substring(str.length, this.length) == str; };
// @PLUGIN Showdown - Markup generation
var Showdown = {};
Showdown.converter = function () {
    var _1;
    var _2;
    var _3;
    var _4 = 0;
    this.makeHtml = function (_5) {
        _1 = new Array();
        _2 = new Array();
        _3 = new Array();
        _5 = _5.replace(/~/g, "~T");
        _5 = _5.replace(/\$/g, "~D");
        _5 = _5.replace(/\r\n/g, "\n");
        _5 = _5.replace(/\r/g, "\n");
        _5 = "\n\n" + _5 + "\n\n";
        _5 = _6(_5);
        _5 = _5.replace(/^[ \t]+$/mg, "");
        _5 = _7(_5);
        _5 = _8(_5);
        _5 = _9(_5);
        _5 = _a(_5);
        _5 = _5.replace(/~D/g, "$$");
        _5 = _5.replace(/~T/g, "~");
        return _5;
    };
    var _8 = function (_b) {
            var _b = _b.replace(/^[ ]{0,3}\[(.+)\]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|\Z)/gm, function (_c, m1, m2, m3, m4) {
                m1 = m1.toLowerCase();
                _1[m1] = _11(m2);
                if (m3) {
                    return m3 + m4;
                } else {
                    if (m4) {
                        _2[m1] = m4.replace(/"/g, "&quot;");
                    }
                }
                return "";
            });
            return _b;
        };
    var _7 = function (_12) {
            _12 = _12.replace(/\n/g, "\n\n");
            var _13 = "p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del";
            var _14 = "p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math";
            _12 = _12.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del)\b[^\r]*?\n<\/\2>[ \t]*(?=\n+))/gm, _15);
            _12 = _12.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math)\b[^\r]*?.*<\/\2>[ \t]*(?=\n+)\n)/gm, _15);
            _12 = _12.replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g, _15);
            _12 = _12.replace(/(\n\n[ ]{0,3}<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g, _15);
            _12 = _12.replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g, _15);
            _12 = _12.replace(/\n\n/g, "\n");
            return _12;
        };
    var _15 = function (_16, m1) {
            var _18 = m1;
            _18 = _18.replace(/\n\n/g, "\n");
            _18 = _18.replace(/^\n/, "");
            _18 = _18.replace(/\n+$/g, "");
            _18 = "\n\n~K" + (_3.push(_18) - 1) + "K\n\n";
            return _18;
        };
    var _9 = function (_19) {
            _19 = _1a(_19);
            var key = _1c("<hr />");
            _19 = _19.replace(/^[ ]{0,2}([ ]?\*[ ]?){3,}[ \t]*$/gm, key);
            _19 = _19.replace(/^[ ]{0,2}([ ]?\-[ ]?){3,}[ \t]*$/gm, key);
            _19 = _19.replace(/^[ ]{0,2}([ ]?\_[ ]?){3,}[ \t]*$/gm, key);
            _19 = _1d(_19);
            _19 = _1e(_19);
            _19 = _1f(_19);
            _19 = _7(_19);
            _19 = _20(_19);
            return _19;
        };
    var _21 = function (_22) {
            _22 = _23(_22);
            _22 = _24(_22);
            _22 = _25(_22);
            _22 = _26(_22);
            _22 = _27(_22);
            _22 = _28(_22);
            _22 = _11(_22);
            _22 = _29(_22);
            _22 = _22.replace(/  +\n/g, " <br />\n");
            return _22;
        };
    var _24 = function (_2a) {
            var _2b = /(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;
            _2a = _2a.replace(_2b, function (_2c) {
                var tag = _2c.replace(/(.)<\/?code>(?=.)/g, "$1`");
                tag = _2e(tag, "\\`*_");
                return tag;
            });
            return _2a;
        };
    var _27 = function (_2f) {
            _2f = _2f.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, _30);
            _2f = _2f.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?(.*?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, _30);
            _2f = _2f.replace(/(\[([^\[\]]+)\])()()()()()/g, _30);
            return _2f;
        };
    var _30 = function (_31, m1, m2, m3, m4, m5, m6, m7) {
            if (m7 == undefined) {
                m7 = "";
            }
            var _39 = m1;
            var _3a = m2;
            var _3b = m3.toLowerCase();
            var url = m4;
            var _3d = m7;
            if (url == "") {
                if (_3b == "") {
                    _3b = _3a.toLowerCase().replace(/ ?\n/g, " ");
                }
                url = "#" + _3b;
                if (_1[_3b] != undefined) {
                    url = _1[_3b];
                    if (_2[_3b] != undefined) {
                        _3d = _2[_3b];
                    }
                } else {
                    if (_39.search(/\(\s*\)$/m) > -1) {
                        url = "";
                    } else {
                        return _39;
                    }
                }
            }
            url = _2e(url, "*_");
            var _3e = "<a target=\"_blank\" href=\"" + url + "\"";
            if (_3d != "") {
                _3d = _3d.replace(/"/g, "&quot;");
                _3d = _2e(_3d, "*_");
                _3e += " title=\"" + _3d + "\"";
            }
            _3e += ">" + _3a + "</a>";
            return _3e;
        };
    var _26 = function (_3f) {
            _3f = _3f.replace(/(!\[(.*?)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, _40);
            _3f = _3f.replace(/(!\[(.*?)\]\s?\([ \t]*()<?(\S+?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, _40);
            return _3f;
        };
    var _40 = function (_41, m1, m2, m3, m4, m5, m6, m7) {
            var _49 = m1;
            var _4a = m2;
            var _4b = m3.toLowerCase();
            var url = m4;
            var _4d = m7;
            if (!_4d) {
                _4d = "";
            }
            if (url == "") {
                if (_4b == "") {
                    _4b = _4a.toLowerCase().replace(/ ?\n/g, " ");
                }
                url = "#" + _4b;
                if (_1[_4b] != undefined) {
                    url = _1[_4b];
                    if (_2[_4b] != undefined) {
                        _4d = _2[_4b];
                    }
                } else {
                    return _49;
                }
            }
            _4a = _4a.replace(/"/g, "&quot;");
            url = _2e(url, "*_");
            var _4e = "<img src=\"" + url + "\" alt=\"" + _4a + "\"";
            _4d = _4d.replace(/"/g, "&quot;");
            _4d = _2e(_4d, "*_");
            _4e += " title=\"" + _4d + "\"";
            _4e += " />";
            return _4e;
        };
    var _1a = function (_4f) {
            _4f = _4f.replace(/^(.+)[ \t]*\n=+[ \t]*\n+/gm, function (_50, m1) {
                return _1c("<h1>" + _21(m1) + "</h1>");
            });
            _4f = _4f.replace(/^(.+)[ \t]*\n-+[ \t]*\n+/gm, function (_52, m1) {
                return _1c("<h2>" + _21(m1) + "</h2>");
            });
            _4f = _4f.replace(/^(\#{1,6})[ \t]*(.+?)[ \t]*\#*\n+/gm, function (_54, m1, m2) {
                var _57 = m1.length;
                return _1c("<h" + _57 + ">" + _21(m2) + "</h" + _57 + ">");
            });
            return _4f;
        };
    var _58;
    var _1d = function (_59) {
            _59 += "~0";
            var _5a = /^(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm;
            if (_4) {
                _59 = _59.replace(_5a, function (_5b, m1, m2) {
                    var _5e = m1;
                    var _5f = (m2.search(/[*+-]/g) > -1) ? "ul" : "ol";
                    _5e = _5e.replace(/\n{2,}/g, "\n\n\n");
                    var _60 = _58(_5e);
                    _60 = _60.replace(/\s+$/, "");
                    _60 = "<" + _5f + ">" + _60 + "</" + _5f + ">\n";
                    return _60;
                });
            } else {
                _5a = /(\n\n|^\n?)(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/g;
                _59 = _59.replace(_5a, function (_61, m1, m2, m3) {
                    var _65 = m1;
                    var _66 = m2;
                    var _67 = (m3.search(/[*+-]/g) > -1) ? "ul" : "ol";
                    var _66 = _66.replace(/\n{2,}/g, "\n\n\n");
                    var _68 = _58(_66);
                    _68 = _65 + "<" + _67 + ">\n" + _68 + "</" + _67 + ">\n";
                    return _68;
                });
            }
            _59 = _59.replace(/~0/, "");
            return _59;
        };
    _58 = function (_69) {
        _4++;
        _69 = _69.replace(/\n{2,}$/, "\n");
        _69 += "~0";
        _69 = _69.replace(/(\n)?(^[ \t]*)([*+-]|\d+[.])[ \t]+([^\r]+?(\n{1,2}))(?=\n*(~0|\2([*+-]|\d+[.])[ \t]+))/gm, function (_6a, m1, m2, m3, m4) {
            var _6f = m4;
            var _70 = m1;
            var _71 = m2;
            if (_70 || (_6f.search(/\n{2,}/) > -1)) {
                _6f = _9(_72(_6f));
            } else {
                _6f = _1d(_72(_6f));
                _6f = _6f.replace(/\n$/, "");
                _6f = _21(_6f);
            }
            return "<li>" + _6f + "</li>\n";
        });
        _69 = _69.replace(/~0/g, "");
        _4--;
        return _69;
    };
    var _1e = function (_73) {
            _73 += "~0";
            _73 = _73.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=~0))/g, function (_74, m1, m2) {
                var _77 = m1;
                var _78 = m2;
                _77 = _79(_72(_77));
                _77 = _6(_77);
                _77 = _77.replace(/^\n+/g, "");
                _77 = _77.replace(/\n+$/g, "");
                _77 = "<pre><code>" + _77 + "\n</code></pre>";
                return _1c(_77) + _78;
            });
            _73 = _73.replace(/~0/, "");
            return _73;
        };
    var _1c = function (_7a) {
            _7a = _7a.replace(/(^\n+|\n+$)/g, "");
            return "\n\n~K" + (_3.push(_7a) - 1) + "K\n\n";
        };
    var _23 = function (_7b) {
            _7b = _7b.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm, function (_7c, m1, m2, m3, m4) {
                var c = m3;
                c = c.replace(/^([ \t]*)/g, "");
                c = c.replace(/[ \t]*$/g, "");
                c = _79(c);
                return m1 + "<code>" + c + "</code>";
            });
            return _7b;
        };
    var _79 = function (_82) {
            _82 = _82.replace(/&/g, "&amp;");
            _82 = _82.replace(/</g, "&lt;");
            _82 = _82.replace(/>/g, "&gt;");
            _82 = _2e(_82, "*_{}[]\\", false);
            return _82;
        };
    var _29 = function (_83) {
            _83 = _83.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g, "<strong>$2</strong>");
            _83 = _83.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g, "<em>$2</em>");
            return _83;
        };
    var _1f = function (_84) {
            _84 = _84.replace(/((^[ \t]*>[ \t]?.+\n(.+\n)*\n*)+)/gm, function (_85, m1) {
                var bq = m1;
                bq = bq.replace(/^[ \t]*>[ \t]?/gm, "~0");
                bq = bq.replace(/~0/g, "");
                bq = bq.replace(/^[ \t]+$/gm, "");
                bq = _9(bq);
                bq = bq.replace(/(^|\n)/g, "$1  ");
                bq = bq.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function (_88, m1) {
                    var pre = m1;
                    pre = pre.replace(/^  /mg, "~0");
                    pre = pre.replace(/~0/g, "");
                    return pre;
                });
                return _1c("<blockquote>\n" + bq + "\n</blockquote>");
            });
            return _84;
        };
    var _20 = function (_8b) {
            _8b = _8b.replace(/^\n+/g, "");
            _8b = _8b.replace(/\n+$/g, "");
            var _8c = _8b.split(/\n{2,}/g);
            var _8d = new Array();
            var end = _8c.length;
            for (var i = 0; i < end; i++) {
                var str = _8c[i];
                if (str.search(/~K(\d+)K/g) >= 0) {
                    _8d.push(str);
                } else {
                    if (str.search(/\S/) >= 0) {
                        str = _21(str);
                        str = str.replace(/^([ \t]*)/g, "<p>");
                        str += "</p>";
                        _8d.push(str);
                    }
                }
            }
            end = _8d.length;
            for (var i = 0; i < end; i++) {
                while (_8d[i].search(/~K(\d+)K/) >= 0) {
                    var _91 = _3[RegExp.$1];
                    _91 = _91.replace(/\$/g, "$$$$");
                    _8d[i] = _8d[i].replace(/~K\d+K/, _91);
                }
            }
            return _8d.join("\n\n");
        };
    var _11 = function (_92) {
            _92 = _92.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, "&amp;");
            _92 = _92.replace(/<(?![a-z\/?\$!])/gi, "&lt;");
            return _92;
        };
    var _25 = function (_93) {
            _93 = _93.replace(/\\(\\)/g, _94);
            _93 = _93.replace(/\\([`*_{}\[\]()>#+-.!])/g, _94);
            return _93;
        };
    var _28 = function (_95) {
            _95 = _95.replace(/<((https?|ftp|dict):[^'">\s]+)>/gi, "<a target=\"_blank\" href=\"$1\">$1</a>");
            _95 = _95.replace(/<(?:mailto:)?([-.\w]+\@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi, function (_96, m1) {
                return _98(_a(m1));
            });
            return _95;
        };
    var _98 = function (_99) {
            function char2hex(ch) {
                var _9b = "0123456789ABCDEF";
                var dec = ch.charCodeAt(0);
                return (_9b.charAt(dec >> 4) + _9b.charAt(dec & 15));
            }
            var _9d = [function (ch) {
                return "&#" + ch.charCodeAt(0) + ";";
            }, function (ch) {
                return "&#x" + char2hex(ch) + ";";
            }, function (ch) {
                return ch;
            }];
            _99 = "mailto:" + _99;
            _99 = _99.replace(/./g, function (ch) {
                if (ch == "@") {
                    ch = _9d[Math.floor(Math.random() * 2)](ch);
                } else {
                    if (ch != ":") {
                        var r = Math.random();
                        ch = (r > 0.9 ? _9d[2](ch) : r > 0.45 ? _9d[1](ch) : _9d[0](ch));
                    }
                }
                return ch;
            });
            _99 = "<a target=\"_blank\" href=\"" + _99 + "\">" + _99 + "</a>";
            _99 = _99.replace(/">.+:/g, "\">");
            return _99;
        };
    var _a = function (_a3) {
            _a3 = _a3.replace(/~E(\d+)E/g, function (_a4, m1) {
                var _a6 = parseInt(m1);
                return String.fromCharCode(_a6);
            });
            return _a3;
        };
    var _72 = function (_a7) {
            _a7 = _a7.replace(/^(\t|[ ]{1,4})/gm, "~0");
            _a7 = _a7.replace(/~0/g, "");
            return _a7;
        };
    var _6 = function (_a8) {
            _a8 = _a8.replace(/\t(?=\t)/g, "    ");
            _a8 = _a8.replace(/\t/g, "~A~B");
            _a8 = _a8.replace(/~B(.+?)~A/g, function (_a9, m1, m2) {
                var _ac = m1;
                var _ad = 4 - _ac.length % 4;
                for (var i = 0; i < _ad; i++) {
                    _ac += " ";
                }
                return _ac;
            });
            _a8 = _a8.replace(/~A/g, "    ");
            _a8 = _a8.replace(/~B/g, "");
            return _a8;
        };
    var _2e = function (_af, _b0, _b1) {
            var _b2 = "([" + _b0.replace(/([\[\]\\])/g, "\\$1") + "])";
            if (_b1) {
                _b2 = "\\\\" + _b2;
            }
            var _b3 = new RegExp(_b2, "g");
            _af = _af.replace(_b3, _94);
            return _af;
        };
    var _94 = function (_b4, m1) {
            var _b6 = m1.charCodeAt(0);
            return "~E" + _b6 + "E";
        };
};
// @PLUGIN By Google Inc.
window['PR_SHOULD_USE_CONTINUATION'] = true;
window['PR_TAB_WIDTH'] = 8;
window['PR_normalizedHtml']
  = window['PR']
  = window['prettyPrintOne']
  = window['prettyPrint'] = void 0;
window['_pr_isIE6'] = function () {
  var ieVersion = navigator && navigator.userAgent &&
      navigator.userAgent.match(/\bMSIE ([678])\./);
  ieVersion = ieVersion ? +ieVersion[1] : false;
  window['_pr_isIE6'] = function () { return ieVersion; };
  return ieVersion;
};
(function () {
  // Keyword lists for various languages.
  var FLOW_CONTROL_KEYWORDS =
      "break continue do else for if return while ";
  var C_KEYWORDS = FLOW_CONTROL_KEYWORDS + "auto case char const default " +
      "double enum extern float goto int long register short signed sizeof " +
      "static struct switch typedef union unsigned void volatile ";
  var COMMON_KEYWORDS = C_KEYWORDS + "catch class delete false import " +
      "new operator private protected public this throw true try typeof ";
  var CPP_KEYWORDS = COMMON_KEYWORDS + "alignof align_union asm axiom bool " +
      "concept concept_map const_cast constexpr decltype " +
      "dynamic_cast explicit export friend inline late_check " +
      "mutable namespace nullptr reinterpret_cast static_assert static_cast " +
      "template typeid typename using virtual wchar_t where ";
  var JAVA_KEYWORDS = COMMON_KEYWORDS +
      "abstract boolean byte extends final finally implements import " +
      "instanceof null native package strictfp super synchronized throws " +
      "transient ";
  var CSHARP_KEYWORDS = JAVA_KEYWORDS +
      "as base by checked decimal delegate descending event " +
      "fixed foreach from group implicit in interface internal into is lock " +
      "object out override orderby params partial readonly ref sbyte sealed " +
      "stackalloc string select uint ulong unchecked unsafe ushort var ";
  var JSCRIPT_KEYWORDS = COMMON_KEYWORDS +
      "debugger eval export function get null set undefined var with " +
      "Infinity NaN ";
  var PERL_KEYWORDS = "caller delete die do dump elsif eval exit foreach for " +
      "goto if import last local my next no our print package redo require " +
      "sub undef unless until use wantarray while BEGIN END ";
  var PYTHON_KEYWORDS = FLOW_CONTROL_KEYWORDS + "and as assert class def del " +
      "elif except exec finally from global import in is lambda " +
      "nonlocal not or pass print raise try with yield " +
      "False True None ";
  var RUBY_KEYWORDS = FLOW_CONTROL_KEYWORDS + "alias and begin case class def" +
      " defined elsif end ensure false in module next nil not or redo rescue " +
      "retry self super then true undef unless until when yield BEGIN END ";
  var SH_KEYWORDS = FLOW_CONTROL_KEYWORDS + "case done elif esac eval fi " +
      "function in local set then until ";
  var ALL_KEYWORDS = (
      CPP_KEYWORDS + CSHARP_KEYWORDS + JSCRIPT_KEYWORDS + PERL_KEYWORDS +
      PYTHON_KEYWORDS + RUBY_KEYWORDS + SH_KEYWORDS);
  // token style names.  correspond to css classes
  /** token style for a string literal */
  var PR_STRING = 'str';
  /** token style for a keyword */
  var PR_KEYWORD = 'kwd';
  /** token style for a comment */
  var PR_COMMENT = 'com';
  /** token style for a type */
  var PR_TYPE = 'typ';
  /** token style for a literal value.  e.g. 1, null, true. */
  var PR_LITERAL = 'lit';
  /** token style for a punctuation string. */
  var PR_PUNCTUATION = 'pun';
  /** token style for a punctuation string. */
  var PR_PLAIN = 'pln';
  /** token style for an sgml tag. */
  var PR_TAG = 'tag';
  /** token style for a markup declaration such as a DOCTYPE. */
  var PR_DECLARATION = 'dec';
  /** token style for embedded source. */
  var PR_SOURCE = 'src';
  /** token style for an sgml attribute name. */
  var PR_ATTRIB_NAME = 'atn';
  /** token style for an sgml attribute value. */
  var PR_ATTRIB_VALUE = 'atv';
  
  var PR_NOCODE = 'nocode';
  var REGEXP_PRECEDER_PATTERN = function () {
      var preceders = [
          "!", "!=", "!==", "#", "%", "%=", "&", "&&", "&&=",
          "&=", "(", "*", "*=", /* "+", */ "+=", ",", /* "-", */ "-=",
          "->", /*".", "..", "...", handled below */ "/", "/=", ":", "::", ";",
          "<", "<<", "<<=", "<=", "=", "==", "===", ">",
          ">=", ">>", ">>=", ">>>", ">>>=", "?", "@", "[",
          "^", "^=", "^^", "^^=", "{", "|", "|=", "||",
          "||=", "~" /* handles =~ and !~ */,
          "break", "case", "continue", "delete",
          "do", "else", "finally", "instanceof",
          "return", "throw", "try", "typeof"
          ];
      var pattern = '(?:^^|[+-]';
      for (var i = 0; i < preceders.length; ++i) {
        pattern += '|' + preceders[i].replace(/([^=<>:&a-z])/g, '\\$1');
      }
      pattern += ')\\s*';  // matches at end, and matches empty string
      return pattern;
      // CAVEAT: this does not properly handle the case where a regular
      // expression immediately follows another since a regular expression may
      // have flags for case-sensitivity and the like.  Having regexp tokens
      // adjacent is not valid in any language I'm aware of, so I'm punting.
      // TODO: maybe style special characters inside a regexp as punctuation.
    }();
  // Define regexps here so that the interpreter doesn't have to create an
  // object each time the function containing them is called.
  // The language spec requires a new object created even if you don't access
  // the $1 members.
  var pr_amp = /&/g;
  var pr_lt = /</g;
  var pr_gt = />/g;
  var pr_quot = /\"/g;
  /** like textToHtml but escapes double quotes to be attribute safe. */
  function attribToHtml(str) {
    return str.replace(pr_amp, '&amp;')
        .replace(pr_lt, '&lt;')
        .replace(pr_gt, '&gt;')
        .replace(pr_quot, '&quot;');
  }
  /** escapest html special characters to html. */
  function textToHtml(str) {
    return str.replace(pr_amp, '&amp;')
        .replace(pr_lt, '&lt;')
        .replace(pr_gt, '&gt;');
  }
  var pr_ltEnt = /&lt;/g;
  var pr_gtEnt = /&gt;/g;
  var pr_aposEnt = /&apos;/g;
  var pr_quotEnt = /&quot;/g;
  var pr_ampEnt = /&amp;/g;
  var pr_nbspEnt = /&nbsp;/g;
  /** unescapes html to plain text. */
  function htmlToText(html) {
    var pos = html.indexOf('&');
    if (pos < 0) { return html; }
    // Handle numeric entities specially.  We can't use functional substitution
    // since that doesn't work in older versions of Safari.
    // These should be rare since most browsers convert them to normal chars.
    for (--pos; (pos = html.indexOf('&#', pos + 1)) >= 0;) {
      var end = html.indexOf(';', pos);
      if (end >= 0) {
        var num = html.substring(pos + 3, end);
        var radix = 10;
        if (num && num.charAt(0) === 'x') {
          num = num.substring(1);
          radix = 16;
        }
        var codePoint = parseInt(num, radix);
        if (!isNaN(codePoint)) {
          html = (html.substring(0, pos) + String.fromCharCode(codePoint) +
                  html.substring(end + 1));
        }
      }
    }
    return html.replace(pr_ltEnt, '<')
        .replace(pr_gtEnt, '>')
        .replace(pr_aposEnt, "'")
        .replace(pr_quotEnt, '"')
        .replace(pr_nbspEnt, ' ')
        .replace(pr_ampEnt, '&');
  }
  /** is the given node's innerHTML normally unescaped? */
  function isRawContent(node) {
    return 'XMP' === node.tagName;
  }
  var newlineRe = /[\r\n]/g;
  /**
   * Are newlines and adjacent spaces significant in the given node's innerHTML?
   */
  function isPreformatted(node, content) {
    // PRE means preformatted, and is a very common case, so don't create
    // unnecessary computed style objects.
    if ('PRE' === node.tagName) { return true; }
    if (!newlineRe.test(content)) { return true; }  // Don't care
    var whitespace = '';
    // For disconnected nodes, IE has no currentStyle.
    if (node.currentStyle) {
      whitespace = node.currentStyle.whiteSpace;
    } else if (window.getComputedStyle) {
      // Firefox makes a best guess if node is disconnected whereas Safari
      // returns the empty string.
      whitespace = window.getComputedStyle(node, null).whiteSpace;
    }
    return !whitespace || whitespace === 'pre';
  }
  function normalizedHtml(node, out) {
    switch (node.nodeType) {
      case 1:  // an element
        var name = node.tagName.toLowerCase();
        out.push('<', name);
        for (var i = 0; i < node.attributes.length; ++i) {
          var attr = node.attributes[i];
          if (!attr.specified) { continue; }
          out.push(' ');
          normalizedHtml(attr, out);
        }
        out.push('>');
        for (var child = node.firstChild; child; child = child.nextSibling) {
          normalizedHtml(child, out);
        }
        if (node.firstChild || !/^(?:br|link|img)$/.test(name)) {
          out.push('<\/', name, '>');
        }
        break;
      case 2: // an attribute
        out.push(node.name.toLowerCase(), '="', attribToHtml(node.value), '"');
        break;
      case 3: case 4: // text
        out.push(textToHtml(node.nodeValue));
        break;
    }
  }
  /**
   * Given a group of {@link RegExp}s, returns a {@code RegExp} that globally
   * matches the union o the sets o strings matched d by the input RegExp.
   * Since it matches globally, if the input strings have a start-of-input
   * anchor (/^.../), it is ignored for the purposes of unioning.
   * @param {Array.<RegExp>} regexs non multiline, non-global regexs.
   * @return {RegExp} a global regex.
   */
  function combinePrefixPatterns(regexs) {
    var capturedGroupIndex = 0;
    var needToFoldCase = false;
    var ignoreCase = false;
    for (var i = 0, n = regexs.length; i < n; ++i) {
      var regex = regexs[i];
      if (regex.ignoreCase) {
        ignoreCase = true;
      } else if (/[a-z]/i.test(regex.source.replace(
                     /\\u[0-9a-f]{4}|\\x[0-9a-f]{2}|\\[^ux]/gi, ''))) {
        needToFoldCase = true;
        ignoreCase = false;
        break;
      }
    }
    function decodeEscape(charsetPart) {
      if (charsetPart.charAt(0) !== '\\') { return charsetPart.charCodeAt(0); }
      switch (charsetPart.charAt(1)) {
        case 'b': return 8;
        case 't': return 9;
        case 'n': return 0xa;
        case 'v': return 0xb;
        case 'f': return 0xc;
        case 'r': return 0xd;
        case 'u': case 'x':
          return parseInt(charsetPart.substring(2), 16)
              || charsetPart.charCodeAt(1);
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7':
          return parseInt(charsetPart.substring(1), 8);
        default: return charsetPart.charCodeAt(1);
      }
    }
    function encodeEscape(charCode) {
      if (charCode < 0x20) {
        return (charCode < 0x10 ? '\\x0' : '\\x') + charCode.toString(16);
      }
      var ch = String.fromCharCode(charCode);
      if (ch === '\\' || ch === '-' || ch === '[' || ch === ']') {
        ch = '\\' + ch;
      }
      return ch;
    }
    function caseFoldCharset(charSet) {
      var charsetParts = charSet.substring(1, charSet.length - 1).match(
          new RegExp(
              '\\\\u[0-9A-Fa-f]{4}'
              + '|\\\\x[0-9A-Fa-f]{2}'
              + '|\\\\[0-3][0-7]{0,2}'
              + '|\\\\[0-7]{1,2}'
              + '|\\\\[\\s\\S]'
              + '|-'
              + '|[^-\\\\]',
              'g'));
      var groups = [];
      var ranges = [];
      var inverse = charsetParts[0] === '^';
      for (var i = inverse ? 1 : 0, n = charsetParts.length; i < n; ++i) {
        var p = charsetParts[i];
        switch (p) {
          case '\\B': case '\\b':
          case '\\D': case '\\d':
          case '\\S': case '\\s':
          case '\\W': case '\\w':
            groups.push(p);
            continue;
        }
        var start = decodeEscape(p);
        var end;
        if (i + 2 < n && '-' === charsetParts[i + 1]) {
          end = decodeEscape(charsetParts[i + 2]);
          i += 2;
        } else {
          end = start;
        }
        ranges.push([start, end]);
        // If the range might intersect letters, then expand it.
        if (!(end < 65 || start > 122)) {
          if (!(end < 65 || start > 90)) {
            ranges.push([Math.max(65, start) | 32, Math.min(end, 90) | 32]);
          }
          if (!(end < 97 || start > 122)) {
            ranges.push([Math.max(97, start) & ~32, Math.min(end, 122) & ~32]);
          }
        }
      }
      // [[1, 10], [3, 4], [8, 12], [14, 14], [16, 16], [17, 17]]
      // -> [[1, 12], [14, 14], [16, 17]]
      ranges.sort(function (a, b) { return (a[0] - b[0]) || (b[1]  - a[1]); });
      var consolidatedRanges = [];
      var lastRange = [NaN, NaN];
      for (var i = 0; i < ranges.length; ++i) {
        var range = ranges[i];
        if (range[0] <= lastRange[1] + 1) {
          lastRange[1] = Math.max(lastRange[1], range[1]);
        } else {
          consolidatedRanges.push(lastRange = range);
        }
      }
      var out = ['['];
      if (inverse) { out.push('^'); }
      out.push.apply(out, groups);
      for (var i = 0; i < consolidatedRanges.length; ++i) {
        var range = consolidatedRanges[i];
        out.push(encodeEscape(range[0]));
        if (range[1] > range[0]) {
          if (range[1] + 1 > range[0]) { out.push('-'); }
          out.push(encodeEscape(range[1]));
        }
      }
      out.push(']');
      return out.join('');
    }
    function allowAnywhereFoldCaseAndRenumberGroups(regex) {
      // Split into character sets, escape sequences, punctuation strings
      // like ('(', '(?:', ')', '^'), and runs of characters that do not
      // include any of the above.
      var parts = regex.source.match(
          new RegExp(
              '(?:'
              + '\\[(?:[^\\x5C\\x5D]|\\\\[\\s\\S])*\\]'  // a character set
              + '|\\\\u[A-Fa-f0-9]{4}'  // a unicode escape
              + '|\\\\x[A-Fa-f0-9]{2}'  // a hex escape
              + '|\\\\[0-9]+'  // a back-reference or octal escape
              + '|\\\\[^ux0-9]'  // other escape sequence
              + '|\\(\\?[:!=]'  // start of a non-capturing group
              + '|[\\(\\)\\^]'  // start/emd of a group, or line start
              + '|[^\\x5B\\x5C\\(\\)\\^]+'  // run of other characters
              + ')',
              'g'));
      var n = parts.length;
      // Maps captured group numbers to the number they will occupy in
      // the output or to -1 if that has not been determined, or to
      // undefined if they need not be capturing in the output.
      var capturedGroups = [];
      // Walk over and identify back references to build the capturedGroups
      // mapping.
      for (var i = 0, groupIndex = 0; i < n; ++i) {
        var p = parts[i];
        if (p === '(') {
          // groups are 1-indexed, so max group index is count of '('
          ++groupIndex;
        } else if ('\\' === p.charAt(0)) {
          var decimalValue = +p.substring(1);
          if (decimalValue && decimalValue <= groupIndex) {
            capturedGroups[decimalValue] = -1;
          }
        }
      }
      // Renumber groups and reduce capturing groups to non-capturing groups
      // where possible.
      for (var i = 1; i < capturedGroups.length; ++i) {
        if (-1 === capturedGroups[i]) {
          capturedGroups[i] = ++capturedGroupIndex;
        }
      }
      for (var i = 0, groupIndex = 0; i < n; ++i) {
        var p = parts[i];
        if (p === '(') {
          ++groupIndex;
          if (capturedGroups[groupIndex] === undefined) {
            parts[i] = '(?:';
          }
        } else if ('\\' === p.charAt(0)) {
          var decimalValue = +p.substring(1);
          if (decimalValue && decimalValue <= groupIndex) {
            parts[i] = '\\' + capturedGroups[groupIndex];
          }
        }
      }
      // Remove any prefix anchors so that the output will match anywhere.
      // ^^ really does mean an anchored match though.
      for (var i = 0, groupIndex = 0; i < n; ++i) {
        if ('^' === parts[i] && '^' !== parts[i + 1]) { parts[i] = ''; }
      }
      // Expand letters to groupts to handle mixing of case-sensitive and
      // case-insensitive patterns if necessary.
      if (regex.ignoreCase && needToFoldCase) {
        for (var i = 0; i < n; ++i) {
          var p = parts[i];
          var ch0 = p.charAt(0);
          if (p.length >= 2 && ch0 === '[') {
            parts[i] = caseFoldCharset(p);
          } else if (ch0 !== '\\') {
            // TODO: handle letters in numeric escapes.
            parts[i] = p.replace(
                /[a-zA-Z]/g,
                function (ch) {
                  var cc = ch.charCodeAt(0);
                  return '[' + String.fromCharCode(cc & ~32, cc | 32) + ']';
                });
          }
        }
      }
      return parts.join('');
    }
    var rewritten = [];
    for (var i = 0, n = regexs.length; i < n; ++i) {
      var regex = regexs[i];
      if (regex.global || regex.multiline) { throw new Error('' + regex); }
      rewritten.push(
          '(?:' + allowAnywhereFoldCaseAndRenumberGroups(regex) + ')');
    }
    return new RegExp(rewritten.join('|'), ignoreCase ? 'gi' : 'g');
  }
  var PR_innerHtmlWorks = null;
  function getInnerHtml(node) {
    // inner html is hopelessly broken in Safari 2.0.4 when the content is
    // an html description of well formed XML and the containing tag is a PRE
    // tag, so we detect that case and emulate innerHTML.
    if (null === PR_innerHtmlWorks) {
      var testNode = document.createElement('PRE');
      testNode.appendChild(
          document.createTextNode('<!DOCTYPE foo PUBLIC "foo bar">\n<foo />'));
      PR_innerHtmlWorks = !/</.test(testNode.innerHTML);
    }
    if (PR_innerHtmlWorks) {
      var content = node.innerHTML;
      // XMP tags contain unescaped entities so require special handling.
      if (isRawContent(node)) {
        content = textToHtml(content);
      } else if (!isPreformatted(node, content)) {
        content = content.replace(/(<br\s*\/?>)[\r\n]+/g, '$1')
            .replace(/(?:[\r\n]+[ \t]*)+/g, ' ');
      }
      return content;
    }
    var out = [];
    for (var child = node.firstChild; child; child = child.nextSibling) {
      normalizedHtml(child, out);
    }
    return out.join('');
  }
  /** returns a function that expand tabs to spaces.  This function can be fed
    * successive chunks of text, and will maintain its own internal state to
    * keep track of how tabs are expanded.
    * @return {function (string) : string} a function that takes
    *   plain text and return the text with tabs expanded.
    * @private
    */
  function makeTabExpander(tabWidth) {
    var SPACES = '                ';
    var charInLine = 0;
    return function (plainText) {
      // walk over each character looking for tabs and newlines.
      // On tabs, expand them.  On newlines, reset charInLine.
      // Otherwise increment charInLine
      var out = null;
      var pos = 0;
      for (var i = 0, n = plainText.length; i < n; ++i) {
        var ch = plainText.charAt(i);
        switch (ch) {
          case '\t':
            if (!out) { out = []; }
            out.push(plainText.substring(pos, i));
            // calculate how much space we need in front of this part
            // nSpaces is the amount of padding -- the number of spaces needed
            // to move us to the next column, where columns occur at factors of
            // tabWidth.
            var nSpaces = tabWidth - (charInLine % tabWidth);
            charInLine += nSpaces;
            for (; nSpaces >= 0; nSpaces -= SPACES.length) {
              out.push(SPACES.substring(0, nSpaces));
            }
            pos = i + 1;
            break;
          case '\n':
            charInLine = 0;
            break;
          default:
            ++charInLine;
        }
      }
      if (!out) { return plainText; }
      out.push(plainText.substring(pos));
      return out.join('');
    };
  }
  var pr_chunkPattern = new RegExp(
      '[^<]+'  // A run of characters other than '<'
      + '|<\!--[\\s\\S]*?--\>'  // an HTML comment
      + '|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>'  // a CDATA section
      // a probable tag that should not be highlighted
      + '|<\/?[a-zA-Z](?:[^>\"\']|\'[^\']*\'|\"[^\"]*\")*>'
      + '|<',  // A '<' that does not begin a larger chunk
      'g');
  var pr_commentPrefix = /^<\!--/;
  var pr_cdataPrefix = /^<!\[CDATA\[/;
  var pr_brPrefix = /^<br\b/i;
  var pr_tagNameRe = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/;
  /** split markup into chunks of html tags (style null) and
    * plain text (style {@link #PR_PLAIN}), converting tags which are
    * significant for tokenization (<br>) into their textual equivalent.
    *
    * @param {string} s html where whitespace is considered significant.
    * @return {Object} source code and extracted tags.
    * @private
    */
  function extractTags(s) {
    // since the pattern has the 'g' modifier and defines no capturing groups,
    // this will return a list of all chunks which we then classify and wrap as
    // PR_Tokens
    var matches = s.match(pr_chunkPattern);
    var sourceBuf = [];
    var sourceBufLen = 0;
    var extractedTags = [];
    if (matches) {
      for (var i = 0, n = matches.length; i < n; ++i) {
        var match = matches[i];
        if (match.length > 1 && match.charAt(0) === '<') {
          if (pr_commentPrefix.test(match)) { continue; }
          if (pr_cdataPrefix.test(match)) {
            // strip CDATA prefix and suffix.  Don't unescape since it's CDATA
            sourceBuf.push(match.substring(9, match.length - 3));
            sourceBufLen += match.length - 12;
          } else if (pr_brPrefix.test(match)) {
            // <br> tags are lexically significant so convert them to text.
            // This is undone later.
            sourceBuf.push('\n');
            ++sourceBufLen;
          } else {
            if (match.indexOf(PR_NOCODE) >= 0 && isNoCodeTag(match)) {
              // A <span class="nocode"> will start a section that should be
              // ignored.  Continue walking the list until we see a matching end
              // tag.
              var name = match.match(pr_tagNameRe)[2];
              var depth = 1;
              var j;
              end_tag_loop:
              for (j = i + 1; j < n; ++j) {
                var name2 = matches[j].match(pr_tagNameRe);
                if (name2 && name2[2] === name) {
                  if (name2[1] === '/') {
                    if (--depth === 0) { break end_tag_loop; }
                  } else {
                    ++depth;
                  }
                }
              }
              if (j < n) {
                extractedTags.push(
                    sourceBufLen, matches.slice(i, j + 1).join(''));
                i = j;
              } else {  // Ignore unclosed sections.
                extractedTags.push(sourceBufLen, match);
              }
            } else {
              extractedTags.push(sourceBufLen, match);
            }
          }
        } else {
          var literalText = htmlToText(match);
          sourceBuf.push(literalText);
          sourceBufLen += literalText.length;
        }
      }
    }
    return { source: sourceBuf.join(''), tags: extractedTags };
  }
  /** True if the given tag contains a class attribute with the nocode class. */
  function isNoCodeTag(tag) {
    return !!tag
        // First canonicalize the representation of attributes
        .replace(/\s(\w+)\s*=\s*(?:\"([^\"]*)\"|'([^\']*)'|(\S+))/g,
                 ' $1="$2$3$4"')
        // Then look for the attribute we want.
        .match(/[cC][lL][aA][sS][sS]=\"[^\"]*\bnocode\b/);
  }
  /**
   * Apply the given language handler to sourceCode and add the resulting
   * decorations to out.
   * @param {number} basePos the index of sourceCode within the chunk of source
   *    whose decorations are already present on out.
   */
  function appendDecorations(basePos, sourceCode, langHandler, out) {
    if (!sourceCode) { return; }
    var job = {
      source: sourceCode,
      basePos: basePos
    };
    langHandler(job);
    out.push.apply(out, job.decorations);
  }
  /** Given triples of [style, pattern, context] returns a lexing function,
    * The lexing function interprets the patterns to find token boundaries and
    * returns a decoration list of the form
    * [index_0, style_0, index_1, style_1, ..., index_n, style_n]
    * where index_n is an index into the sourceCode, and style_n is a style
    * constant like PR_PLAIN.  index_n-1 <= index_n, and style_n-1 applies to
    * all characters in sourceCode[index_n-1:index_n].
    *
    * The stylePatterns is a list whose elements have the form
    * [style : string, pattern : RegExp, DEPRECATED, shortcut : string].
    *
    * Style is a style constant like PR_PLAIN, or can be a string of the
    * form 'lang-FOO', where FOO is a language extension describing the
    * language of the portion of the token in $1 after pattern executes.
    * E.g., if style is 'lang-lisp', and group 1 contains the text
    * '(hello (world))', then that portion of the token will be passed to the
    * registered lisp handler for formatting.
    * The text before and after group 1 will be restyled using this decorator
    * so decorators should take care that this doesn't result in infinite
    * recursion.  For example, the HTML lexer rule for SCRIPT elements looks
    * something like ['lang-js', /<[s]cript>(.+?)<\/script>/].  This may match
    * '<script>foo()<\/script>', which would cause the current decorator to
    * be called with '<script>' which would not match the same rule since
    * group 1 must not be empty, so it would be instead styled as PR_TAG by
    * the generic tag rule.  The handler registered for the 'js' extension would
    * then be called with 'foo()', and finally, the current decorator would
    * be called with '<\/script>' which would not match the original rule and
    * so the generic tag rule would identify it as a tag.
    *
    * Pattern must only match prefixes, and if it matches a prefix, then that
    * match is considered a token with the same style.
    *
    * Context is applied to the last non-whitespace, non-comment token
    * recognized.
    *
    * Shortcut is an optional string of characters, any of which, if the first
    * character, gurantee that this pattern and only this pattern matches.
    *
    * @param {Array} shortcutStylePatterns patterns that always start with
    *   a known character.  Must have a shortcut string.
    * @param {Array} fallthroughStylePatterns patterns that will be tried in
    *   order if the shortcut ones fail.  May have shortcuts.
    *
    * @return {function (Object)} a
    *   function that takes source code and returns a list of decorations.
    */
  function createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns) {
    var shortcuts = {};
    var tokenizer;
    (function () {
      var allPatterns = shortcutStylePatterns.concat(fallthroughStylePatterns);
      var allRegexs = [];
      var regexKeys = {};
      for (var i = 0, n = allPatterns.length; i < n; ++i) {
        var patternParts = allPatterns[i];
        var shortcutChars = patternParts[3];
        if (shortcutChars) {
          for (var c = shortcutChars.length; --c >= 0;) {
            shortcuts[shortcutChars.charAt(c)] = patternParts;
          }
        }
        var regex = patternParts[1];
        var k = '' + regex;
        if (!regexKeys.hasOwnProperty(k)) {
          allRegexs.push(regex);
          regexKeys[k] = null;
        }
      }
      allRegexs.push(/[\0-\uffff]/);
      tokenizer = combinePrefixPatterns(allRegexs);
    })();
    var nPatterns = fallthroughStylePatterns.length;
    var notWs = /\S/;
    /**
     * Lexes job.source and produces an output array job.decorations of style
     * classes preceded by the position at which they start in job.source in
     * order.
     *
     * @param {Object} job an object like {@code
     *    source: {string} sourceText plain text,
     *    basePos: {int} position of job.source in the larger chunk of
     *        sourceCode.
     * }
     */
    var decorate = function (job) {
      var sourceCode = job.source, basePos = job.basePos;
      /** Even entries are positions in source in ascending order.  Odd enties
        * are style markers (e.g., PR_COMMENT) that run from that position until
        * the end.
        * @type {Array.<number|string>}
        */
      var decorations = [basePos, PR_PLAIN];
      var pos = 0;  // index into sourceCode
      var tokens = sourceCode.match(tokenizer) || [];
      var styleCache = {};
      for (var ti = 0, nTokens = tokens.length; ti < nTokens; ++ti) {
        var token = tokens[ti];
        var style = styleCache[token];
        var match = void 0;
        var isEmbedded;
        if (typeof style === 'string') {
          isEmbedded = false;
        } else {
          var patternParts = shortcuts[token.charAt(0)];
          if (patternParts) {
            match = token.match(patternParts[1]);
            style = patternParts[0];
          } else {
            for (var i = 0; i < nPatterns; ++i) {
              patternParts = fallthroughStylePatterns[i];
              match = token.match(patternParts[1]);
              if (match) {
                style = patternParts[0];
                break;
              }
            }
            if (!match) {  // make sure that we make progress
              style = PR_PLAIN;
            }
          }
          isEmbedded = style.length >= 5 && 'lang-' === style.substring(0, 5);
          if (isEmbedded && !(match && typeof match[1] === 'string')) {
            isEmbedded = false;
            style = PR_SOURCE;
          }
          if (!isEmbedded) { styleCache[token] = style; }
        }
        var tokenStart = pos;
        pos += token.length;
        if (!isEmbedded) {
          decorations.push(basePos + tokenStart, style);
        } else {  // Treat group 1 as an embedded block of source code.
          var embeddedSource = match[1];
          var embeddedSourceStart = token.indexOf(embeddedSource);
          var embeddedSourceEnd = embeddedSourceStart + embeddedSource.length;
          if (match[2]) {
            // If embeddedSource can be blank, then it would match at the
            // beginning which would cause us to infinitely recurse on the
            // entire token, so we catch the right context in match[2].
            embeddedSourceEnd = token.length - match[2].length;
            embeddedSourceStart = embeddedSourceEnd - embeddedSource.length;
          }
          var lang = style.substring(5);
          // Decorate the left of the embedded source
          appendDecorations(
              basePos + tokenStart,
              token.substring(0, embeddedSourceStart),
              decorate, decorations);
          // Decorate the embedded source
          appendDecorations(
              basePos + tokenStart + embeddedSourceStart,
              embeddedSource,
              langHandlerForExtension(lang, embeddedSource),
              decorations);
          // Decorate the right of the embedded section
          appendDecorations(
              basePos + tokenStart + embeddedSourceEnd,
              token.substring(embeddedSourceEnd),
              decorate, decorations);
        }
      }
      job.decorations = decorations;
    };
    return decorate;
  }
  /** returns a function that produces a list of decorations from source text.
    *
    * This code treats ", ', and ` as string delimiters, and \ as a string
    * escape.  It does not recognize perl's qq() style strings.
    * It has no special handling for double delimiter escapes as in basic, or
    * the tripled delimiters used in python, but should work on those regardless
    * although in those cases a single string literal may be broken up into
    * multiple adjacent string literals.
    *
    * It recognizes C, C++, and shell style comments.
    *
    * @param {Object} options a set of optional parameters.
    * @return {function (Object)} a function that examines the source code
    *     in the input job and builds the decoration list.
    */
  function sourceDecorator(options) {
    var shortcutStylePatterns = [], fallthroughStylePatterns = [];
    if (options['tripleQuotedStrings']) {
      // '''multi-line-string''', 'single-line-string', and double-quoted
      shortcutStylePatterns.push(
          [PR_STRING,  /^(?:\'\'\'(?:[^\'\\]|\\[\s\S]|\'{1,2}(?=[^\']))*(?:\'\'\'|$)|\"\"\"(?:[^\"\\]|\\[\s\S]|\"{1,2}(?=[^\"]))*(?:\"\"\"|$)|\'(?:[^\\\']|\\[\s\S])*(?:\'|$)|\"(?:[^\\\"]|\\[\s\S])*(?:\"|$))/,
           null, '\'"']);
    } else if (options['multiLineStrings']) {
      // 'multi-line-string', "multi-line-string"
      shortcutStylePatterns.push(
          [PR_STRING,  /^(?:\'(?:[^\\\']|\\[\s\S])*(?:\'|$)|\"(?:[^\\\"]|\\[\s\S])*(?:\"|$)|\`(?:[^\\\`]|\\[\s\S])*(?:\`|$))/,
           null, '\'"`']);
    } else {
      // 'single-line-string', "single-line-string"
      shortcutStylePatterns.push(
          [PR_STRING,
           /^(?:\'(?:[^\\\'\r\n]|\\.)*(?:\'|$)|\"(?:[^\\\"\r\n]|\\.)*(?:\"|$))/,
           null, '"\'']);
    }
    if (options['verbatimStrings']) {
      // verbatim-string-literal production from the C# grammar.  See issue 93.
      fallthroughStylePatterns.push(
          [PR_STRING, /^@\"(?:[^\"]|\"\")*(?:\"|$)/, null]);
    }
    if (options['hashComments']) {
      if (options['cStyleComments']) {
        // Stop C preprocessor declarations at an unclosed open comment
        shortcutStylePatterns.push(
            [PR_COMMENT, /^#(?:(?:define|elif|else|endif|error|ifdef|include|ifndef|line|pragma|undef|warning)\b|[^\r\n]*)/,
             null, '#']);
        fallthroughStylePatterns.push(
            [PR_STRING,
             /^<(?:(?:(?:\.\.\/)*|\/?)(?:[\w-]+(?:\/[\w-]+)+)?[\w-]+\.h|[a-z]\w*)>/,
             null]);
      } else {
        shortcutStylePatterns.push([PR_COMMENT, /^#[^\r\n]*/, null, '#']);
      }
    }
    if (options['cStyleComments']) {
      fallthroughStylePatterns.push([PR_COMMENT, /^\/\/[^\r\n]*/, null]);
      fallthroughStylePatterns.push(
          [PR_COMMENT, /^\/\*[\s\S]*?(?:\*\/|$)/, null]);
    }
    if (options['regexLiterals']) {
      var REGEX_LITERAL = (
          // A regular expression literal starts with a slash that is
          // not followed by * or / so that it is not confused with
          // comments.
          '/(?=[^/*])'
          // and then contains any number of raw characters,
          + '(?:[^/\\x5B\\x5C]'
          // escape sequences (\x5C),
          +    '|\\x5C[\\s\\S]'
          // or non-nesting character sets (\x5B\x5D);
          +    '|\\x5B(?:[^\\x5C\\x5D]|\\x5C[\\s\\S])*(?:\\x5D|$))+'
          // finally closed by a /.
          + '/');
      fallthroughStylePatterns.push(
          ['lang-regex',
           new RegExp('^' + REGEXP_PRECEDER_PATTERN + '(' + REGEX_LITERAL + ')')
           ]);
    }
    var keywords = options['keywords'].replace(/^\s+|\s+$/g, '');
    if (keywords.length) {
      fallthroughStylePatterns.push(
          [PR_KEYWORD,
           new RegExp('^(?:' + keywords.replace(/\s+/g, '|') + ')\\b'), null]);
    }
    shortcutStylePatterns.push([PR_PLAIN,       /^\s+/, null, ' \r\n\t\xA0']);
    fallthroughStylePatterns.push(
        // TODO(mikesamuel): recognize non-latin letters and numerals in idents
        [PR_LITERAL,     /^@[a-z_$][a-z_$@0-9]*/i, null],
        [PR_TYPE,        /^@?[A-Z]+[a-z][A-Za-z_$@0-9]*/, null],
        [PR_PLAIN,       /^[a-z_$][a-z_$@0-9]*/i, null],
        [PR_LITERAL,
         new RegExp(
             '^(?:'
             // A hex number
             + '0x[a-f0-9]+'
             // or an octal or decimal number,
             + '|(?:\\d(?:_\\d+)*\\d*(?:\\.\\d*)?|\\.\\d\\+)'
             // possibly in scientific notation
             + '(?:e[+\\-]?\\d+)?'
             + ')'
             // with an optional modifier like UL for unsigned long
             + '[a-z]*', 'i'),
         null, '0123456789'],
        [PR_PUNCTUATION, /^.[^\s\w\.$@\'\"\`\/\#]*/, null]);
    return createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns);
  }
  var decorateSource = sourceDecorator({
        'keywords': ALL_KEYWORDS,
        'hashComments': true,
        'cStyleComments': true,
        'multiLineStrings': true,
        'regexLiterals': true
      });
  /** Breaks {@code job.source} around style boundaries in
    * {@code job.decorations} while re-interleaving {@code job.extractedTags},
    * and leaves the result in {@code job.prettyPrintedHtml}.
    * @param {Object} job like {
    *    source: {string} source as plain text,
    *    extractedTags: {Array.<number|string>} extractedTags chunks of raw
    *                   html preceded by their position in {@code job.source}
    *                   in order
    *    decorations: {Array.<number|string} an array of style classes preceded
    *                 by the position at which they start in job.source in order
    * }
    * @private
    */
  function recombineTagsAndDecorations(job) {
    var sourceText = job.source;
    var extractedTags = job.extractedTags;
    var decorations = job.decorations;
    var html = [];
    // index past the last char in sourceText written to html
    var outputIdx = 0;
    var openDecoration = null;
    var currentDecoration = null;
    var tagPos = 0;  // index into extractedTags
    var decPos = 0;  // index into decorations
    var tabExpander = makeTabExpander(window['PR_TAB_WIDTH']);
    var adjacentSpaceRe = /([\r\n ]) /g;
    var startOrSpaceRe = /(^| ) /gm;
    var newlineRe = /\r\n?|\n/g;
    var trailingSpaceRe = /[ \r\n]$/;
    var lastWasSpace = true;  // the last text chunk emitted ended with a space.
    // A helper function that is responsible for opening sections of decoration
    // and outputing properly escaped chunks of source
    function emitTextUpTo(sourceIdx) {
      if (sourceIdx > outputIdx) {
        if (openDecoration && openDecoration !== currentDecoration) {
          // Close the current decoration
          html.push('</span>');
          openDecoration = null;
        }
        if (!openDecoration && currentDecoration) {
          openDecoration = currentDecoration;
          html.push('<span class="', openDecoration, '">');
        }
        // This interacts badly with some wikis which introduces paragraph tags
        // into pre blocks for some strange reason.
        // It's necessary for IE though which seems to lose the preformattedness
        // of <pre> tags when their innerHTML is assigned.
        // http://stud3.tuwien.ac.at/~e0226430/innerHtmlQuirk.html
        // and it serves to undo the conversion of <br>s to newlines done in
        // chunkify.
        var htmlChunk = textToHtml(
            tabExpander(sourceText.substring(outputIdx, sourceIdx)))
            .replace(lastWasSpace
                     ? startOrSpaceRe
                     : adjacentSpaceRe, '$1&nbsp;');
        // Keep track of whether we need to escape space at the beginning of the
        // next chunk.
        lastWasSpace = trailingSpaceRe.test(htmlChunk);
        // IE collapses multiple adjacient <br>s into 1 line break.
        // Prefix every <br> with '&nbsp;' can prevent such IE's behavior.
        var lineBreakHtml = window['_pr_isIE6']() ? '&nbsp;<br />' : '<br />';
        html.push(htmlChunk.replace(newlineRe, lineBreakHtml));
        outputIdx = sourceIdx;
      }
    }
    while (true) {
      // Determine if we're going to consume a tag this time around.  Otherwise
      // we consume a decoration or exit.
      var outputTag;
      if (tagPos < extractedTags.length) {
        if (decPos < decorations.length) {
          // Pick one giving preference to extractedTags since we shouldn't open
          // a new style that we're going to have to immediately close in order
          // to output a tag.
          outputTag = extractedTags[tagPos] <= decorations[decPos];
        } else {
          outputTag = true;
        }
      } else {
        outputTag = false;
      }
      // Consume either a decoration or a tag or exit.
      if (outputTag) {
        emitTextUpTo(extractedTags[tagPos]);
        if (openDecoration) {
          // Close the current decoration
          html.push('</span>');
          openDecoration = null;
        }
        html.push(extractedTags[tagPos + 1]);
        tagPos += 2;
      } else if (decPos < decorations.length) {
        emitTextUpTo(decorations[decPos]);
        currentDecoration = decorations[decPos + 1];
        decPos += 2;
      } else {
        break;
      }
    }
    emitTextUpTo(sourceText.length);
    if (openDecoration) {
      html.push('</span>');
    }
    job.prettyPrintedHtml = html.join('');
  }
  /** Maps language-specific file extensions to handlers. */
  var langHandlerRegistry = {};
  /** Register a language handler for the given file extensions.
    * @param {function (Object)} handler a function from source code to a list
    *      of decorations.  Takes a single argument job which describes the
    *      state of the computation.   The single parameter has the form
    *      {@code {
    *        source: {string} as plain text.
    *        decorations: {Array.<number|string>} an array of style classes
    *                     preceded by the position at which they start in
    *                     job.source in order.
    *                     The language handler should assigned this field.
    *        basePos: {int} the position of source in the larger source chunk.
    *                 All positions in the output decorations array are relative
    *                 to the larger source chunk.
    *      } }
    * @param {Array.<string>} fileExtensions
    */
  function registerLangHandler(handler, fileExtensions) {
    for (var i = fileExtensions.length; --i >= 0;) {
      var ext = fileExtensions[i];
      if (!langHandlerRegistry.hasOwnProperty(ext)) {
        langHandlerRegistry[ext] = handler;
      } else if ('console' in window) {
        console.warn('cannot override language handler %s', ext);
      }
    }
  }
  function langHandlerForExtension(extension, source) {
    if (!(extension && langHandlerRegistry.hasOwnProperty(extension))) {
      // Treat it as markup if the first non whitespace character is a < and
      // the last non-whitespace character is a >.
      extension = /^\s*</.test(source)
          ? 'default-markup'
          : 'default-code';
    }
    return langHandlerRegistry[extension];
  }
  registerLangHandler(decorateSource, ['default-code']);
  registerLangHandler(
      createSimpleLexer(
          [],
          [
           [PR_PLAIN,       /^[^<?]+/],
           [PR_DECLARATION, /^<!\w[^>]*(?:>|$)/],
           [PR_COMMENT,     /^<\!--[\s\S]*?(?:-\->|$)/],
           // Unescaped content in an unknown language
           ['lang-',        /^<\?([\s\S]+?)(?:\?>|$)/],
           ['lang-',        /^<%([\s\S]+?)(?:%>|$)/],
           [PR_PUNCTUATION, /^(?:<[%?]|[%?]>)/],
           ['lang-',        /^<xmp\b[^>]*>([\s\S]+?)<\/xmp\b[^>]*>/i],
           // Unescaped content in javascript.  (Or possibly vbscript).
           ['lang-js',      /^<script\b[^>]*>([\s\S]*?)(<\/script\b[^>]*>)/i],
           // Contains unescaped stylesheet content
           ['lang-css',     /^<style\b[^>]*>([\s\S]*?)(<\/style\b[^>]*>)/i],
           ['lang-in.tag',  /^(<\/?[a-z][^<>]*>)/i]
          ]),
      ['default-markup', 'htm', 'html', 'mxml', 'xhtml', 'xml', 'xsl']);
  registerLangHandler(
      createSimpleLexer(
          [
           [PR_PLAIN,        /^[\s]+/, null, ' \t\r\n'],
           [PR_ATTRIB_VALUE, /^(?:\"[^\"]*\"?|\'[^\']*\'?)/, null, '\"\'']
           ],
          [
           [PR_TAG,          /^^<\/?[a-z](?:[\w.:-]*\w)?|\/?>$/i],
           [PR_ATTRIB_NAME,  /^(?!style[\s=]|on)[a-z](?:[\w:-]*\w)?/i],
           ['lang-uq.val',   /^=\s*([^>\'\"\s]*(?:[^>\'\"\s\/]|\/(?=\s)))/],
           [PR_PUNCTUATION,  /^[=<>\/]+/],
           ['lang-js',       /^on\w+\s*=\s*\"([^\"]+)\"/i],
           ['lang-js',       /^on\w+\s*=\s*\'([^\']+)\'/i],
           ['lang-js',       /^on\w+\s*=\s*([^\"\'>\s]+)/i],
           ['lang-css',      /^style\s*=\s*\"([^\"]+)\"/i],
           ['lang-css',      /^style\s*=\s*\'([^\']+)\'/i],
           ['lang-css',      /^style\s*=\s*([^\"\'>\s]+)/i]
           ]),
      ['in.tag']);
  registerLangHandler(
      createSimpleLexer([], [[PR_ATTRIB_VALUE, /^[\s\S]+/]]), ['uq.val']);
  registerLangHandler(sourceDecorator({
          'keywords': CPP_KEYWORDS,
          'hashComments': true,
          'cStyleComments': true
        }), ['c', 'cc', 'cpp', 'cxx', 'cyc', 'm']);
  registerLangHandler(sourceDecorator({
          'keywords': 'null true false'
        }), ['json']);
  registerLangHandler(sourceDecorator({
          'keywords': CSHARP_KEYWORDS,
          'hashComments': true,
          'cStyleComments': true,
          'verbatimStrings': true
        }), ['cs']);
  registerLangHandler(sourceDecorator({
          'keywords': JAVA_KEYWORDS,
          'cStyleComments': true
        }), ['java']);
  registerLangHandler(sourceDecorator({
          'keywords': SH_KEYWORDS,
          'hashComments': true,
          'multiLineStrings': true
        }), ['bsh', 'csh', 'sh']);
  registerLangHandler(sourceDecorator({
          'keywords': PYTHON_KEYWORDS,
          'hashComments': true,
          'multiLineStrings': true,
          'tripleQuotedStrings': true
        }), ['cv', 'py']);
  registerLangHandler(sourceDecorator({
          'keywords': PERL_KEYWORDS,
          'hashComments': true,
          'multiLineStrings': true,
          'regexLiterals': true
        }), ['perl', 'pl', 'pm']);
  registerLangHandler(sourceDecorator({
          'keywords': RUBY_KEYWORDS,
          'hashComments': true,
          'multiLineStrings': true,
          'regexLiterals': true
        }), ['rb']);
  registerLangHandler(sourceDecorator({
          'keywords': JSCRIPT_KEYWORDS,
          'cStyleComments': true,
          'regexLiterals': true
        }), ['js']);
  registerLangHandler(
      createSimpleLexer([], [[PR_STRING, /^[\s\S]+/]]), ['regex']);
  function applyDecorator(job) {
    var sourceCodeHtml = job.sourceCodeHtml;
    var opt_langExtension = job.langExtension;
    // Prepopulate output in case processing fails with an exception.
    job.prettyPrintedHtml = sourceCodeHtml;
    try {
      // Extract tags, and convert the source code to plain text.
      var sourceAndExtractedTags = extractTags(sourceCodeHtml);
      /** Plain text. @type {string} */
      var source = sourceAndExtractedTags.source;
      job.source = source;
      job.basePos = 0;
      /** Even entries are positions in source in ascending order.  Odd entries
        * are tags that were extracted at that position.
        * @type {Array.<number|string>}
        */
      job.extractedTags = sourceAndExtractedTags.tags;
      // Apply the appropriate language handler
      langHandlerForExtension(opt_langExtension, source)(job);
      // Integrate the decorations and tags back into the source code to produce
      // a decorated html string which is left in job.prettyPrintedHtml.
      recombineTagsAndDecorations(job);
    } catch (e) {
      if ('console' in window) {
        console.log(e);
        console.trace();
      }
    }
  }
  function prettyPrintOne(sourceCodeHtml, opt_langExtension) {
    var job = {
      sourceCodeHtml: sourceCodeHtml,
      langExtension: opt_langExtension
    };
    applyDecorator(job);
    return job.prettyPrintedHtml;
  }
  function prettyPrint(opt_whenDone) {
    var isIE678 = window['_pr_isIE6']();
    var ieNewline = isIE678 === 6 ? '\r\n' : '\r';
    // See bug 71 and http://stackoverflow.com/questions/136443/why-doesnt-ie7-
    // fetch a list of nodes to rewrite
    var codeSegments = [
        document.getElementsByTagName('pre'),
        document.getElementsByTagName('code'),
        document.getElementsByTagName('xmp') ];
    var elements = [];
    for (var i = 0; i < codeSegments.length; ++i) {
      for (var j = 0, n = codeSegments[i].length; j < n; ++j) {
        elements.push(codeSegments[i][j]);
      }
    }
    codeSegments = null;
    var clock = Date;
    if (!clock['now']) {
      clock = { 'now': function () { return (new Date).getTime(); } };
    }
    // The loop is broken into a series of continuations to make sure that we
    // don't make the browser unresponsive when rewriting a large page.
    var k = 0;
    var prettyPrintingJob;
    function doWork() {
      var endTime = (window['PR_SHOULD_USE_CONTINUATION'] ?
                     clock.now() + 250 /* ms */ :
                     Infinity);
      for (; k < elements.length && clock.now() < endTime; k++) {
        var cs = elements[k];
        if (cs.className && cs.className.indexOf('prettyprint') >= 0) {
          // If the classes includes a language extensions, use it.
          // Language extensions can be specified like
          //     <pre class="prettyprint lang-cpp">
          // the language extension "cpp" is used to find a language handler as
          // passed to PR_registerLangHandler.
          var langExtension = cs.className.match(/\blang-(\w+)\b/);
          if (langExtension) { langExtension = langExtension[1]; }
          // make sure this is not nested in an already prettified element
          var nested = false;
          for (var p = cs.parentNode; p; p = p.parentNode) {
            if ((p.tagName === 'pre' || p.tagName === 'code' ||
                 p.tagName === 'xmp') &&
                p.className && p.className.indexOf('prettyprint') >= 0) {
              nested = true;
              break;
            }
          }
          if (!nested) {
            // fetch the content as a snippet of properly escaped HTML.
            // Firefox adds newlines at the end.
            var content = getInnerHtml(cs);
            content = content.replace(/(?:\r\n?|\n)$/, '');
            // do the pretty printing
            prettyPrintingJob = {
              sourceCodeHtml: content,
              langExtension: langExtension,
              sourceNode: cs
            };
            applyDecorator(prettyPrintingJob);
            replaceWithPrettyPrintedHtml();
          }
        }
      }
      if (k < elements.length) {
        // finish up in a continuation
        setTimeout(doWork, 250);
      } else if (opt_whenDone) {
        opt_whenDone();
      }
    }
    function replaceWithPrettyPrintedHtml() {
      var newContent = prettyPrintingJob.prettyPrintedHtml;
      if (!newContent) { return; }
      var cs = prettyPrintingJob.sourceNode;
      // push the prettified html back into the tag.
      if (!isRawContent(cs)) {
        // just replace the old html with the new
        cs.innerHTML = newContent;
      } else {
        // we need to change the tag to a <pre> since <xmp>s do not allow
        // embedded tags such as the span tags used to attach styles to
        // sections of source code.
        var pre = document.createElement('PRE');
        for (var i = 0; i < cs.attributes.length; ++i) {
          var a = cs.attributes[i];
          if (a.specified) {
            var aname = a.name.toLowerCase();
            if (aname === 'class') {
              pre.className = a.value;  // For IE 6
            } else {
              pre.setAttribute(a.name, a.value);
            }
          }
        }
        pre.innerHTML = newContent;
        // remove the old
        cs.parentNode.replaceChild(pre, cs);
        cs = pre;
      }
      // Replace <br>s with line-feeds so that copying and pasting works
      // on IE 6.
      // Doing this on other browsers breaks lots of stuff since \r\n is
      // treated as two newlines on Firefox, and doing this also slows
      // down rendering.
      if (isIE678 && cs.tagName === 'PRE') {
        var lineBreaks = cs.getElementsByTagName('br');
        for (var j = lineBreaks.length; --j >= 0;) {
          var lineBreak = lineBreaks[j];
          lineBreak.parentNode.replaceChild(
              document.createTextNode(ieNewline), lineBreak);
        }
      }
    }
    doWork();
  }
  window['PR_normalizedHtml'] = normalizedHtml;
  window['prettyPrintOne'] = prettyPrintOne;
  window['prettyPrint'] = prettyPrint;
  window['PR'] = {
        'combinePrefixPatterns': combinePrefixPatterns,
        'createSimpleLexer': createSimpleLexer,
        'registerLangHandler': registerLangHandler,
        'sourceDecorator': sourceDecorator,
        'PR_ATTRIB_NAME': PR_ATTRIB_NAME,
        'PR_ATTRIB_VALUE': PR_ATTRIB_VALUE,
        'PR_COMMENT': PR_COMMENT,
        'PR_DECLARATION': PR_DECLARATION,
        'PR_KEYWORD': PR_KEYWORD,
        'PR_LITERAL': PR_LITERAL,
        'PR_NOCODE': PR_NOCODE,
        'PR_PLAIN': PR_PLAIN,
        'PR_PUNCTUATION': PR_PUNCTUATION,
        'PR_SOURCE': PR_SOURCE,
        'PR_STRING': PR_STRING,
        'PR_TAG': PR_TAG,
        'PR_TYPE': PR_TYPE
      };
})();
var timer = null;
$.editor = function(textarea, preview, callback, text) {
    if(callback != undefined  || text != undefined) {       
        var textareaCon = $('<textarea />'),previewCon = $('<div class="preview">');
        
        $(textarea).html('');
        $(preview).html('');
        
        textareaCon.appendTo($(textarea));
        textarea = textareaCon;
        
        previewCon.appendTo($(preview));
        preview = previewCon;
        
        if(callback != undefined) {
            callback(textarea);
        } else {
            textarea.val(text);
        }
        
        
        textarea.wysiwym(Wysiwym.Markdown, {helpEnabled: false});
        
        if(preview!=undefined) {
            var showdown = new Showdown.converter();
            var prev_text = "";
            var update_live_preview = function() {
                var input_text = textarea.val();
                if (input_text != prev_text) {
                    var text = $(showdown.makeHtml(input_text));
                    text.find('pre').addClass('prettyprint linenums');
                    text.find('p code').addClass('prettyprint');
                    text.find('code').each(function() {
                        $(this).html(prettyPrintOne($(this).html()));
                    });
                    timer = setTimeout($.savePage, 3000);
                    preview.html(text);
                    prev_text = input_text;
                }
                
                if(input_text == '') {
                    preview.hide();
                } else {
                    preview.show();
                }
            }
            clearInterval(update_live_preview);
            setInterval(update_live_preview, 200);
        }
    } else {
        alert('wrong!')
        return false;
    }
};
$.slide = function($options) {
    var options = {
        slideId : 'hn-slide', //slide唯一标识ID
        autoPlay : false,
        width: 150,
        itemNode : 'a', //循环个体nodeName
        repeat : false, //是否循环
        direction : 'X', //方向 ，X轴和Y轴
        times : 300, //动画时间
        scrollItems : 6, //滚动个数
        showItems : 6,
        click : false,
        before : false,
        after : false
    };
    if(typeof $options === 'string') {
        options.slideId = $slideId;
    } else if( typeof $options == 'object') {
        $.extend(options, $options);
    }
    var s = $('#' + options.slideId), 
    con = s.children('div.hn-slide-con'), 
    box = con.children('.hn-slide-box'), 
    prev = s.find('.hn-slide-prev'), 
    next = s.find('.hn-slide-next'), 
    items = box.children(options.itemNode), 
    itemLen = items.length, 
    worh = options.direction == 'X' ? 'width' : 'height', 
    distance, 
    inAnim = false, 
    max = 0, t = null;
    !s.length &&  console.log('没有找到id为"' + options.slideId + '"的东东');
    distance = options[worh] || $(items[0])[worh]();
    max = distance * itemLen;
    //定义滚动个体的父容器宽度
    //var fixpx=0;
    //if(ie6){ fixpx=10;}
    box[worh](max);
    //点击个体的整体
    options.click && items.click(options.click);
    //自动
    options.autoPlay && ( t = setTimeout(function() {
        if(inAnim)
            return;
        options.repeat = true;
        scroll(true);
    }, options.autoPlay));
    if(next.length) {
        next.click(function() {
            scroll(true);
            return false;
        });
    }
    if(prev.length) {
        prev.click(function() {
            scroll(false);
            return false;
        });
    }
    function _refresh(){
        items = box.children(options.itemNode);
        itemLen = items.length;
        max = distance * itemLen;
        box[worh](max);
    }
    function scroll($isNext) {
        var Pos = options.direction == 'X' ? 'Left' : 'Top', pos = Pos.toLowerCase(), key = 'scroll' + Pos, old = con[0][key], attr = {}, newpos, elem;
        if( typeof $isNext === 'number') {
            newpos = $isNext * distance;
        } else {
            if($isNext) {
                newpos = (old + distance * options.showItems) >= max ? (options.repeat ? 0 : max) : (old + distance);
            } else {
                newpos = (old - distance) < 0 ? (options.repeat ? max : 0) : (old - distance);
            }
        }
        attr[key] = newpos;
        elem = $(items[(newpos / distance) > (itemLen - 1) ? (itemLen - 1) : (newpos / distance)]);
        if(options.before) {
            options.before(elem, function() {
                anim.call(con, attr, elem);
            });
        } else
            anim.call(con, attr, elem)
    }
    function anim($attr, elem) {
        inAnim = true;
        con.animate($attr, options.times, function() {
            inAnim = false;
            options.after && options.after.call(elem, elem);
            if(options.autoPlay) {
                clearTimeout(t);
                t = setTimeout(function() {
                    if(inAnim)
                        return;
                    scroll(true);
                }, options.autoPlay);
            }
        });
    }
    return {
        goTo : scroll,
        refresh : _refresh
    };
};
$.savePage = function() {
    clearTimeout(timer);
    timer = null;
    var code = $('#editor-textarea textarea').val();
    code = htmlspecialchars(code);
    
    $.ajax({
        url : '/savepage/',
        type : 'POST',
        dataType : 'text',
        data : {
            'sid' : sid,
            'id' : id,
            'code' : code
        },
        success : function(data) {
            if(data) {

            } else {
                alert('写文件错误!')
            }
        }
    });
}
$.webSlideInit = function() {
    var slide = new $.slide();
    $('#hn-slide').delegate('.page', 'tap', function() {
        id = +$.trim($(this).find('strong').text());
        $('.tile_on').find('.vector').text('\'');
        $('.tile_on').removeClass('tile_on');
        $(this).addClass('tile_on');
        $(this).find('.vector').text('C');
        $.editor('#editor-textarea', '#editor-presview', function(textarea) {
            $.ajax({
                url : '/showpage/',
                type : 'POST',
                dataType : 'text',
                data : {
                    'sid' : sid,
                    'id' : id
                },
                success : function(data) {
                    if(data) {
                        textarea.text(data);
                    } else {
                        textarea.text('读取文件错误!');
                    }
                }
            });
        });
    });
    $('.hn-add-item').bind("tap", function() {
        var html = '<a class="tile page" href="javascript:"><span class="vector">\'</span><span class="title">第 <strong>' + (++max) + '</strong> 页</span></a>';
        $(this).before(html);
        var prev = $(this).prev(), tile_on = $('.tile_on');
        slide.refresh();
        $('.hn-slide-next').trigger('click');
        id = max;
        tile_on.find('.vector').text('\'');
        tile_on.removeClass('tile_on');
        prev.addClass('tile_on');
        prev.find('.vector').text('C');
        $.editor('#editor-textarea', '#editor-presview', undefined, '#第' + id + '页#');
        $.savePage();
    });
    $.editor('#editor-textarea', '#editor-presview', function(textarea) {
        $.ajax({
            url : '/showpage/',
            type : 'POST',
            dataType : 'text',
            data : {
                'sid' : sid,
                'id' : id
            },
            success : function(data) {
                if(data) {
                    textarea.text(data);
                } else {
                    textarea.text('读取文件错误!');
                }
            }
        });
    });
    $('#online').click(function(){
        $.ajax({
            url : '/page/'+sid,
            type : 'GET',          
            success : function(data) {
                if(data) {
                } else {
                    alert('生成页面失败!');
                }
            }
        });
    });
    $('#download').click(function(){
        alert('功能还在开发中...');
    });
}
var htmlspecialchars = function(str){
    if (typeof(str) == "string") {
        str = str.replace(/&/g, "&amp;"); /* must do &amp; first */
        str = str.replace(/"/g, "&quot;");
        //str = str.replace(/'/g, "&#039;");
        str = str.replace(/</g, "&lt;");
        str = str.replace(/>/g, "&gt;");
        str = str.replace(/\|/g, '&brvbar;');
    }
    return str;
}
