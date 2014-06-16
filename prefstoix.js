/**
 * @preserve Copyright (c) 2014 Alexandre Bento Freire. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, white: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function () {
    "use strict";
/** ------------------------------------------------------------------------
 *                               Closure
 ** ------------------------------------------------------------------------ */
    var PREFKEY = 'prefs';

    function _checkForHttp(text) {
        return (text.indexOf('http://') === 0) || (text.indexOf('https://') === 0);
    }

    // Copies from prefs to prefsio, and vice-versa. Used for load & save
    function _buildIo(prefs, prefsio, preftoio) {
        Object.keys(prefs).forEach(function (key) {
            var pref = prefs[key], prefio;
                        
            if (pref.value !== undefined) {
                prefio = prefsio[key];
                if (prefio === undefined) {
                    prefsio[key] = {};
                    prefio = prefsio[key];
                }

                if (preftoio) {
                    prefio.value = pref.value;
                } else {
                    if (prefio !== undefined && prefio.value !== undefined) {
                        pref.value = prefio.value;
                    }
                }
                if (pref.fields) {
                    if (!prefio.fields) {
                        prefio.fields = {};
                    }
                    _buildIo(pref.fields, prefio.fields, preftoio);
                }
            }
        });
        return prefsio;
    }

    return {
/** ------------------------------------------------------------------------
 *                               Functions
 ** ------------------------------------------------------------------------ */
    checkForHttp : function (text) {
        return _checkForHttp(text);
    },

    load : function (prefs, extprefs) {
        extprefs.definePreference(PREFKEY, 'object', _buildIo(prefs, {}, true));
        _buildIo(prefs, extprefs.get(PREFKEY), false);
    },

    save : function (prefs, extprefs) {
        extprefs.set(PREFKEY, _buildIo(prefs, {}, true));
        extprefs.save();
    },
/** ------------------------------------------------------------------------
 *                               Fields
 ** ------------------------------------------------------------------------ */
    OPTIONFIELDS: ['tabSize', 'webSearch', /*'grunt',*/ 'js6', 'scss'],

    // commands options (showinmenu, hotkey)
    commands: {
        value: { showinmenu: [], hotkeys: {} }        
    },
        
    // splitText command options
    splitMarker: {
        value: ',',
        label: 'Split Marker'
    },

    // numberText command options
    startNum: {
        value: 1,
        label: 'Initial Value',
        type: 'number'
    },
    numSep: {
        value : ".\\$",
        label: 'Separator after Number',
        canempty: true,
        type: 'spacetext'
    },
    // Tab To Space, Space To Tab command options
    tabSize: {
        value: 2,
        label: 'Tab Size',
        type: 'number'
    },
    // extractortoix command options
    findre : {
        value: '',
        label: 'Find',
        buttons: [{label: 'Regnize'}]
    },
        
    // replacetoix command options
    find : {
        value: '',
        label: 'Find',
        htmltext: 'autocomplete=on',
        buttons: [{label: 'Regnize'}]
    },
    replace : {
        value: '',
        label: 'Replace',
        htmltext: 'autocomplete=on',
        canempty: true,
    },
    iswordsonly : {
        value: false,
        label: 'Words Only',
        hint: 'Only works if is not a regular expression',
        type: 'boolean',
        canempty: true,
    },
    isregexpr : {
        value: true,
        label: 'Regular Expression',
        type: 'boolean',
        canempty: true,
    },
    isignorecase : {
        value: false,
        label: 'Ignore Case',        
        type: 'boolean',
        canempty: true,
    },

    isall : {
        value: true,
        label: 'Replace All',
        type: 'boolean',
        canempty: true,
    },
    isselonly : {
        value: true,
        label: 'Only Selection',
        hint: 'If there is a selected text only replaces the selected text',
        type: 'boolean',
        canempty: true,
    },
    
    // webSearch command options
    webSearch: {
        value: 'https://www.google.com/search?q=',
        label: 'Search Engine url',
        checkfunc:
            function (text) {
                return _checkForHttp(text) ? '' : 'It must start with http(s)://';
            }
    },    
    // Run grunt command options
    /* //TODO: Implement grunt
    grunt: {
        value: 'grunt',
        label: 'Grunt',
        hint: 'You must install grunt',
    },*/

    // js6 command options
    js6: {
        value: 'traceur --out "{{out}}" --script "{{in}}"',
        label: 'js6 Compiler',
        hint: 'You must install nodejs, and then "npm install -g traceur"',
        fields: {
            autosave : { value: false, type: 'boolean', hint: 'AutoSave', align: 'center', canempty: true}
        }
    },
    // scss command options
    scss: {
        value: 'sass --sourcemap "{{in}}" "{{out}}"',
        label: 'scss Compiler',
        hint: 'You Must install sass 1st. Goto http://sass-lang.com/',
        fields: {
            autosave : { value: false, type: 'boolean', hint: 'AutoSave', align: 'center', canempty: true}
        }
    }
};
});