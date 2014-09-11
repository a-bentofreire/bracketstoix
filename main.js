/**
 * @preserve Copyright (c) 2014 ApptoIX. All rights reserved.
 * @author Alexandre Bento Freire
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


/*jslint vars: true, plusplus: true, continue: true, devel: true, white: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, CodeMirror, $, document, window, appshell */

define(function (require, exports, module) {
    "use strict";
/** ------------------------------------------------------------------------
 *                               i18n
 ** ------------------------------------------------------------------------ */
    var /** @const */ VERSION = '2.0',    
        /** @const */ IXMENU = "IX",
        /** @const */ IXMENUTT = "IX TT",
        /** @const */ MODULENAME = 'bracketstoix',
        /** @const */ HELPLINK = 'http://www.apptoix.com/#bracketstoix',
        /** @const */ EXPANDTAGS = ';bu=button;d=div;sp=span;te=textarea;in=input',
        /** @const */ ABOUTTEXT = '<div style="font-size: 1.5em; padding-bottom: 20px">Brackets<sub>to</sub>IX</div>' +           
          '<div style="font-size: 1.2em; ">(c) 2014 App<sub>to</sub>IX</div>' + 
          '<div>Developed by Alexandre Bento Freire</div>' + 
          '<a href="' + HELPLINK + '">' + HELPLINK + '</a>',

        // FORCE policy must be the negative of the regular policy
        /** @const */ SP_FORCEALL = -1,
        /** @const */ SP_ALL = 1,
        /** @const */ SP_WORD = 2,
        /** @const */ SP_SENTENCE = 3,
        /** @const */ SP_LINE = 4,
        /** @const */ SP_NONE = 5,        
        /** @const */ __SP_FUNC = 5,
        /** @const */ SP_FORCELINE = -4;

    var CommandManager = brackets.getModule("command/CommandManager"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        ProjectManager = brackets.getModule('project/ProjectManager'),
        DocumentManager = brackets.getModule('document/DocumentManager'),
        NodeDomain = brackets.getModule("utils/NodeDomain"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        PanelManager = brackets.getModule('view/PanelManager'),
        LanguageManager = brackets.getModule("language/LanguageManager"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        KeyEvent = brackets.getModule("utils/KeyEvent"),
        FileUtils = brackets.getModule("file/FileUtils"),
        
        extprefs = PreferencesManager.getExtensionPrefs(MODULENAME),
        ui = require('uitoix'),
        tt = require('texttransformstoix'),
        ixDomains = new NodeDomain("IXDomains", ExtensionUtils.getModulePath(module, "node/IXDomains")),
        // WARNING: these field names are used in prefsinfo
        prefs = require('prefstoix'),
        // Snippets are only loaded after the 1st usage
        snippets;
/** ------------------------------------------------------------------------
 *                               Tools
 ** ------------------------------------------------------------------------ */
    function i18n(text) {
        //@TODO: Implement translations
        return text;
    }

    function logErr(msg) {
        console.error('[' + MODULENAME + ']' + msg);
    }

    function checkExt(file, ext) {
        return file.substr(file.length - ext.length) === ext;
    }

    function getspacetext(text) {
        return text.replace(/\\\$/g, ' ');
    }

    function strrepeat(ch, size) {
        var i = 0,
            res = new Array(size);
        for(; i < size; i++) { // Tip: forEach doesn't work with array of undefined
            res[i] = ch;
        }
        return res.join('');
    }

    function cmdToName(cmd) {
        return cmd.toLowerCase().replace(/\./g, '').replace(/ /g, '');
    }

    function cmdToLabel(cmd) {
        return cmd.replace(/\./g, '');
    }

    var
        REGNIZEFIND = /([\\.()[\]*+^$])/g,
        REGNIZEREPL = '\\$1';

    function getregnize(text, isfind) {
        return text.replace(isfind ? REGNIZEFIND : /(\$\d)/g, REGNIZEREPL);
    }
/** ------------------------------------------------------------------------
 *                               ExtPrefs
 ** ------------------------------------------------------------------------ */
    function loadextprefs() {
        prefs.load(prefs, extprefs);
        //Simple workaround to support versions < 1.4. TODO: Support subfield copy on prefs.load
        prefs.commands.value.showinctxmenu = prefs.commands.value.showinctxmenu || [];
    }

    function saveextprefs() {
        prefs.save(prefs, extprefs);
    }
/** ------------------------------------------------------------------------
 *                               Node Commads
 ** ------------------------------------------------------------------------ */
    function nodeOpenUrl(url) {
        appshell.app.openURLInDefaultBrowser(url);
    }

    function nodeExec(cmdline, cwd) {
        ixDomains.exec("exec", cmdline, cwd).fail(function (err) {
            logErr("failed to exec", err);
        });
    }

    function nodeClipbrdCopy(text) {
        /* Brackets has no support for: var copyEvent = new ClipboardEvent('copy', { dataType: 'text/plain', data: 'Data to be copied' } ); */      
        var d = document.createElement("textarea");
        d.contentEditable = true;
        document.body.appendChild(d);
        d.value = text;
        d.unselectable = "off";
        d.style.position = "absolute";
        d.focus();
        document.execCommand("SelectAll");
        document.execCommand("Copy", false, null);
        document.body.removeChild(d);          
    }
/** ------------------------------------------------------------------------
 *                               UI
 ** ------------------------------------------------------------------------ */
    function ask(title, fieldlist, callback, opts, fields) {
        return ui.ask(title, fieldlist, callback, opts, fields || prefs, i18n, Dialogs,
            opts && opts.nosaveprefs ? undefined : saveextprefs, prefs.historySize.value, KeyBindingManager, KeyEvent);
    } 
  
    function showMessage(title, message) {
      Dialogs.showModalDialog(
        "bracketstoix-dialog", i18n(title), message, 
        [{className: Dialogs.DIALOG_BTN_CLASS_PRIMARY, id: Dialogs.DIALOG_BTN_OK, text: 'Close'}], true);
    }
/** ------------------------------------------------------------------------
 *                               Controlers
 ** ------------------------------------------------------------------------ */
    function getSelObj(selpolicy) {
        var so = { cm: EditorManager.getActiveEditor()._codeMirror, selfunc: selpolicy, 
                  selpolicy: typeof selpolicy !== 'function' ? selpolicy : __SP_FUNC },
            len, inf;
        so.cursor = so.cm.getCursor();
        so.selected = (so.selpolicy >= 0) && so.cm.somethingSelected();
        if (so.selected) {
            so.cursel = so.cm.getSelection();
        } else {
            so.cursel = '';
            
            switch(so.selpolicy) {
            case SP_FORCELINE:
            case SP_LINE :
                so.cursel = so.cm.getLine(so.cursor.line);
                so.start = {ch: 0, line: so.cursor.line};
                so.end = {ch: so.cursel.length, line: so.cursor.line};
                break;
            case SP_SENTENCE :        
            case SP_WORD :
                so.cursel = so.cm.getLine(so.cursor.line);
                len = so.cursel.length;
                if (selpolicy === SP_WORD) {
                    so.cursel = so.cursel.replace(/(\W)/g, ' ');
                }
                so.start = {ch: so.cursor.ch, line: so.cursor.line};
                so.end = {ch: so.cursor.ch, line: so.cursor.line};
                while ((so.start.ch > 0) && (so.cursel[so.start.ch - 1] !== ' ')) {
                    so.start.ch--;
                }
                while ((so.end.ch < len) && (so.cursel[so.end.ch] !== ' ')) {
                    so.end.ch++;
                }
                so.cursel = so.cursel.substring(so.start.ch, so.end.ch);
                break;
                
            case SP_FORCEALL :
            case SP_ALL : 
                so.start = {ch:0, line: 0};
                so.end = {ch:0, line: so.cm.lineCount()};
                so.cursel = so.cm.getRange(so.start, so.end);  
                break;

            case SP_NONE:    
                so.start = {ch: so.cursor.ch, line: so.cursor.line};
                so.end = {ch: so.cursor.ch, line: so.cursor.line};
                break;
                    
            case __SP_FUNC : 
                //TODO: Support multiple lines
                // It executes a selfunc twice(left, right direction) for each caracter. It stops eating chars if it selfunc returns false 
                so.cursel = so.cm.getLine(so.cursor.line);
                so.start = {ch: so.cursor.ch, line: so.cursor.line};
                so.end = {ch: so.cursor.ch + 1, line: so.cursor.line};
                inf = {so: so, dir: -1};
                // the selfunc can reverse the direction to implement multiple passes, but careful since it cause an infinite loop    
                while(so.start.ch > 0) {
                    if (!so.selfunc(inf, so.cursel[so.start.ch])) {
                        so.start.ch -= inf.dir;
                        break;
                    }
                    so.start.ch += inf.dir;
                }
                inf.dir = 1;
                // the selfunc can add text to the so.cursel, so it's better to not place the end test in a var such as len = so.cursel.length
                while(so.end.ch < so.cursel.length) {
                    if (!so.selfunc(inf, so.cursel[so.end.ch - 1])) {
                        so.end.ch -= inf.dir;
                        break;
                    }
                    so.end.ch += inf.dir;
                }
                so.cursel = so.cursel.substring(so.start.ch, so.end.ch);
                break;
            }
        }
        // Disactivated due a brackets bug, that doesn't preventsDefault on ENTER key
         so.cm.focus();
        
        return so;
    }

    function changeSelection(callback, selpolicy, asarray, forceall) {
        var so = getSelObj(selpolicy),
            newsel;

        if(!so.cursel && selpolicy !== SP_NONE) {
            return;
        }
        if (!asarray) {
            newsel = callback(so.cursel, so);
        } else {
            newsel = callback(so.cursel.split("\n"), so).join("\n");
        }
        if (so.cursel !== newsel) {
            if (so.selected) {
                so.cm.replaceSelection(newsel, so);
            } else {
                so.cm.replaceRange(newsel, so.start, so.end);
                if(so.cursor) {
                    so.cm.setCursor(so.cursor);
                }
            }            
        }
    }

    function getSelection(callback, selpolicy) {
        var so = getSelObj(selpolicy);
        if(!so.cursel) {
            return;
        }
        callback(so.cursel, so);
    }

    function replaceSelection(regex, repl, selpolicy) {
        changeSelection(function (text, so) {
            return text.replace(regex, repl);
        }, selpolicy, false);
    }

    function sortSelection(sortfunc, selpolicy) {
        changeSelection(function (arr) {
            arr.sort(sortfunc);
            return arr;
        }, selpolicy, true);
    }
  
    function setRow(row, text, so) {
      so.cm.replaceRange(text + '\n', {ch: 0, line: row}, {ch: 0, line: row + 1});
    }

    function insertRow(row, text, so) {
      so.cm.replaceRange(text + '\n', {ch: 0, line: row}, {ch: 0, line: row});
    }

    /*function insertTextAtCursor(text) {
      so.cm.replaceRange(text + '\n', {ch: 0, line: row}, {ch: 0, line: row});
    }*/

    function getCurFileName() {
        var curfile = ProjectManager.getSelectedItem();
        return curfile._path || curfile.path;
    }

    function copyToClipboard(callback) {
        nodeClipbrdCopy(callback(ProjectManager.getSelectedItem()));
    }
/** ------------------------------------------------------------------------
 *                               Commands: Transforms
 ** ------------------------------------------------------------------------ */
    function upperCaseText() {
      changeSelection(function (text) {
            return text.toUpperCase();
        }, SP_WORD);
    }

    function lowerCaseText() {
        changeSelection(function (text) {
            return text.toLowerCase();
        }, SP_WORD);
    }


    function joinText() {
        replaceSelection(/\n/g, '', SP_ALL);
    }

    function splitText() {
        ask('Split Text', ['splitMarker'], function () {
            replaceSelection(new RegExp(prefs.splitMarker.value, 'g'), '\n');
        }, SP_ALL);
    }

    function numberText() {
        ask('Number Text', ['startNum', 'numSep'], function () {
           var num = prefs.startNum.value,
                numSep = getspacetext(prefs.numSep.value);
           replaceSelection(/^(.*)$/gm, function replacer(match, p1, offset, string) {
                return (num++) + numSep + p1;
            }, SP_ALL);
        });
    }

    function trimLeading() {
        replaceSelection(/^[ \t]+/gm, '', SP_ALL);
    }

    function trimTrailingex(selpolicy) {
        replaceSelection(/[ \t]+$/gm, '', selpolicy);
    }

    function trimTrailing(selpolicy) {
        trimTrailingex(SP_ALL);
    }

    function markdownTrimTrailing() {
        replaceSelection(/[ \t]+$/gm, '  ', SP_ALL);
    }

    function sortAscending() {
        sortSelection(function (a, b) {
            return a > b ? 1 : (a < b ? -1 : 0);
        }, SP_ALL);
    }

    function sortDescending() {
        sortSelection(function (a, b) {
            return a < b ? 1 : (a > b ? -1 : 0);
        }, SP_ALL);
    }

    function htmlEncode() {
        changeSelection(function (text) {
            var d = document.createElement('div');
            d.textContent = text;
            return d.innerHTML;
        }, SP_LINE);
    }

    function htmlDecode() {
        changeSelection(function (text) {
            var d = document.createElement('div');
            d.innerHTML = text;
            return d.textContent;
        }, SP_LINE);
    }

    function urlEncode() {
        changeSelection(function (text) {
            return window.encodeURIComponent(text);
        }, SP_LINE);
    }

    function removeDuplicates() {
        changeSelection(function (arr) {
            var i = arr.length - 1;
            for(;i >= 0; i--) {
                if(arr[i + 1] === arr[i]) {
                    arr.splice(i + 1, 1);
                }
            }
            return arr;
        }, SP_ALL, true);
    }

    function removeEmptyLines() {
        changeSelection(function (arr) {
            var i = arr.length - 1;
            for(;i >= 0; i--) {
                if(!arr[i].trim()) {
                    arr.splice(i, 1);
                }
            }
            return arr;
        }, SP_ALL, true);
    }


    function tabToSpace() {
        replaceSelection(/\t/gm, strrepeat(' ', prefs.tabSize.value), SP_ALL);
    }

    function spaceToTab() {
        replaceSelection(/^(\s+)/gm, function(spaces) {
            var len = spaces.length,
                tabs = Math.floor(len / prefs.tabSize.value);
            if (!tabs) {
                return spaces;
            } else {
                return strrepeat("\t", tabs) + strrepeat(' ', len - tabs * prefs.tabSize.value);
            }
        }, SP_ALL);
    }

    function regnize() {
        getSelection(function (text) {
            nodeClipbrdCopy(getregnize(text, true));
        }, SP_SENTENCE);
    }
    
    function rgbHex() {
        replaceSelection(/(?:#([a-f0-9]{2,2})([a-f0-9]{2,2})([a-f0-9]{2,2}))|(?:rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\))/ig, 
            function (text, h1, h2, h3, r1, r2, r3) { 
                function toHex2(v) {
                    var res = parseInt(v, 10).toString(16);
                    return res.length < 2 ? '0' + res : res;
                }
                
                if (h1 === undefined) { 
                    return '#' + toHex2(r1) + toHex2(r2) + toHex2(r3);
                } else {
                    return 'rgb(' + parseInt(h1, 16) + ',' + parseInt(h2, 16) + ',' + parseInt(h3, 16) + ')';
                }                
        }, SP_SENTENCE);
    }

    function untag() {
        replaceSelection(/<(\w+)(?:.*?)>(.*?)<\/(\1)\s*>/, "$2", 
            // function policy. 
            function(inf, ch) {
            if (inf.stop) {
                inf.stop = false;
                return false;
            } 
            inf.stop = ch === (inf.dir === -1 ? '<' : '>');                            
            return true;
        });
    }
    
    function tag() {
        changeSelection(function (text, so) {
            var tagname = text.split(' ', 1)[0];
            
            function getAttr(ch, prefix) {
                var attr = tagname.split(ch);
                if (attr.length > 1) {
                    tagname = attr[0];
                    attr = ' ' + prefix + '="' + attr[1] + '"';
                } else {
                    attr = '';
                }
                return attr;
            }
                        
            var id, cls, at, base, removelen;
            removelen = tagname.length + 1; // assumes a single space separator
            text = text.substr(removelen).trim();
            
            // TAG#ID.CLASS  -> 1st retrieve the class, then the id
            cls = getAttr('.', 'class');
            id = getAttr('#', 'id');
            at = EXPANDTAGS.indexOf(';' + tagname + '=');
            if (at !== -1) {
                tagname = EXPANDTAGS.substr(at + tagname.length + 2).split(';', 1)[0];
            }
            base = '<' + tagname + id + cls + '>';
            // readjust cursor
            if (so.start) {
                so.cursor = { ch: so.start.ch + base.length, line: so.start.line};
            }
                        
            return base + text + '</' + tagname + '>';
                        
        }, SP_SENTENCE);
    }
  
/** ------------------------------------------------------------------------
 *                               declJSLintGlobal
 ** ------------------------------------------------------------------------ */
  function declJSLintGlobal() {
    getSelection(function (ident, so) {      
      var row = 0, max = so.cm.lineCount(), line, trimline, tokens;
      ident = ident.trim();
      if (!ident) {
        return;
      }
      
      while (row < max) {
        line = so.cm.getLine(row);    
        trimline = line.trim();
        if (trimline) {
          tokens = line.match(/\/\*global\s*(\S.*\S)\s*\*\//);
          if (tokens) {
            // found a global
            if (tokens.length > 1) {
              if (tokens[1].replace(/ /g, '').split(',').indexOf(ident) > -1) {
                // already exists
                return;
              }
              setRow(row, line.replace(tokens[1], tokens[1] + ', ' + ident), so);
                     
            } else {
              // empty global statement
              setRow(row, line.replace('global', 'global ' + ident));
            }                
            return;
          } else {
            if (trimline[0] !== '/' && trimline[0] !== '*') {
              insertRow(row, '/*global ' + ident + ' */', so);
              break;
            }
          }
        }
        row++;
      }        
    }, SP_WORD);
  }
/** ------------------------------------------------------------------------
 *                               Commands: Quotes
 ** ------------------------------------------------------------------------ */
    var /** @const */ Q_SINGLE = 0,
        /** @const */ Q_DOUBLE = 1,
        /** @const */ Q_TOGGLE = 2;
    
    function quoteOp(op) {
        changeSelection(function (text) {
            var arr = text.split('');
            var i, ch, isin = false;
            
            for(i = 0; i <= arr.length; i++) {
                ch = arr[i];
                switch(ch) {
                //TODO: Slash the quote if the reverse quote already exists. Support \" and \'
                case "'" :
                    if ((op === Q_SINGLE) || (op === Q_TOGGLE)) {
                        arr[i] = '"';
                        isin = !isin;
                    }
                    break;
                case '"' :
                    if ((op === Q_DOUBLE) || (op === Q_TOGGLE)) {
                        arr[i] = "'";
                        isin = !isin;
                    }                        
                    break;
                }                
            }
            return arr.join('');
        }, 
            // function policy. it stops if the start(1st pass) and end(2nd pass) quote are the same.
            function(inf, ch) {
            if (inf.stop) {
                inf.stop = false;
                return false;
            } 
            
            if ((ch === "'" || ch === '"') && (ch === inf.quote || !inf.quote)) {
                inf.stop = true;                
                inf.quote = ch;                
            }
            return true;
        });
    }
    
    function singleToDoubleQuote() {
        quoteOp(Q_SINGLE);       
    }

    function doubleToSingleQuote() {
        quoteOp(Q_DOUBLE);               
    }    
    
    function toggleQuote() {
        quoteOp(Q_TOGGLE);               
    }    
/** ------------------------------------------------------------------------
 *                               Commands: External
 ** ------------------------------------------------------------------------ */
    function openUrl() {
        getSelection(function (text) {
            if (!prefs.checkForHttp(text)) {
                text = 'http://' + text;
            }
            nodeOpenUrl(text);
        }, SP_SENTENCE);
    }

    function webSearch() {
        getSelection(function (text) {
            nodeOpenUrl(prefs.webSearch.value + encodeURIComponent(text));
        }, SP_SENTENCE);
    }
  
    function browseFile() {
      nodeOpenUrl('file:///' + getCurFileName());
    }  
/** ------------------------------------------------------------------------
 *                               Commands: toIX
 ** ------------------------------------------------------------------------ */
   function extractortoix() {
        ask('ExtractortoIX', ['findre', 'isignorecase'], function () {
            getSelection(function (text) {
                var foundtext = text.match(new RegExp(prefs.findre.value, 'g' + (prefs.isignorecase.value ? 'i' : '')));
                nodeClipbrdCopy(foundtext.join('\n'));
            }, SP_ALL);
        }, {msg: 'Write a regular expression<br>All matches will be copy to the clipboard<br>'});
    }

    function replacetoix() {
        var text = getSelObj(SP_LINE).cursel.split('\n');
        prefs.find.value = text.length > 0 ? text[0].trim() : '';
        prefs.replace.value = '';
        ask('ReplacetoIX', ['find', 'replace', 'startValue', 'stepValue',
            'iswordsonly', 'isregexpr', 'isignorecase', 'isimultiline', 'isall', 'isselonly'], function () {
            var findtext = prefs.isregexpr.value ? prefs.find.value : getregnize(prefs.find.value, true),
                repltext = prefs.isregexpr.value ? prefs.replace.value : getregnize(prefs.replace.value, false),
                startValue = prefs.startValue.value ? parseInt(prefs.startValue.value) : undefined,
                stepValue = prefs.stepValue.value ? parseInt(prefs.stepValue.value) : undefined;
            if (prefs.iswordsonly.value && !prefs.isregexpr.value) {
                findtext = '\\b' + findtext + '\\b';
            }
            replaceSelection(new RegExp(findtext, (prefs.isall.value ? 'g' : '') + 
                (prefs.isignorecase.value ? 'i' : '') + (prefs.isimultiline.value ? 'm' : '')),
                startValue && stepValue ? 
                  function (data) {
                    var i, out = repltext;
                    for(i = 1; i < arguments.length - 2; i++) {
                      out = out.replace(new RegExp('\\$' + i, 'g'), arguments[i]);                      
                    }
                    out = out.replace(/\$NUM\$/, startValue);                      
                    startValue += stepValue;
                    return out;
                  }
                  : repltext, prefs.isselonly.value ? SP_ALL : SP_FORCEALL);
        });
    }
/** ------------------------------------------------------------------------
 *                               Command: Function JSDoc 
 ** ------------------------------------------------------------------------ */    
    function buildFuncJSDoc() {
        getSelection(function (text, so) {
            var match = text.match(/(?:(\w+)\s*[:=]\s*){0,1}function(?:\s+(\w+)){0,1}\s*\((.*?)\)/i), 
                jsdoc, vars, func, initialspace;
            if(match && match.length > 1) {
                func = match[1] || match[2];
                if (!func) {
                    return;
                }
                vars = match[3];
                initialspace = text.match(/^\s*/i)[0];
                jsdoc = '|/**\n' + (func[0] == '_' ? '|* @private\n' : '') + '|* ' + func + '\n';
                if(vars) {
                    vars.split(',').forEach(function (v) {
                        jsdoc += '|* @param {} ' + v.trim() + '\n';
                    });                                            
                }
                jsdoc += '|* @return {} \n';
                jsdoc += '|*/\n';
                jsdoc = jsdoc.replace(/\|/g, initialspace);
                so.cm.replaceRange(jsdoc, so.start, so.start);
            }
        }, SP_FORCELINE);        
    }
  
/** ------------------------------------------------------------------------
 *                               Commands: LoremIpsum & BreakLineAt
 ** ------------------------------------------------------------------------ */ 
    function execBreakLineAt(line, maxchars, tobreakwords) {
      var start = 0, at, stest;
      while (start + maxchars < line.length) {
        at = start + maxchars;
        if (!tobreakwords) {
          stest = line.substring(start, at).replace(/[\w_]/g, '0');
          at -= start;
          for (;at > 0 && stest[at - 1] === '0'; at--) {}
          if (!at && stest[0] === '0') {
            at = maxchars;
          } 
          at += start;
        }
        line = line.substr(0, at) + '\n' + line.substr(at);
        start = at + 1;
      }
      return line;
    }
  
    function breakLineAt() {
        ask('Break Line At', ['maxcharsperline', 'tobreakwords'], function () {
          var maxchars = Math.max(1, prefs.maxcharsperline.value.trim() >> 0),
            tobreakwords = prefs.tobreakwords.value;
          changeSelection(function (array, so) {       
            array.forEach(function (line, index) {
              array[index] = execBreakLineAt(line, maxchars, tobreakwords);
            });
            return array;
            }, SP_LINE, true);
      });
    }
  
    function LoremIpsum() {
      $.get(FileUtils.getNativeModuleDirectoryPath(module) + '/lorem.txt', function(data) {
          ask('Lorem Ipsum', ['linrparagraphs', 'limaxcharsperline', 'lihtmlparawrap'], function () {
            changeSelection(function (text, so) {       
              var lines = data.split('\n', Math.min(100, Math.max(prefs.linrparagraphs.value >> 0))),
                  wrap = prefs.lihtmlparawrap.value.trim(),
                  wrapst = '<' + wrap + '>',
                  wrapend = '</' + wrap.replace(/\s.+$/, '') + '>',
                  maxchars = prefs.limaxcharsperline.value >> 0;
            
              lines.forEach(function (line, index) {
                if (maxchars) {
                  line = execBreakLineAt(line, maxchars, false);
                }
                if (wrap) {
                  line =  wrapst + line + wrapend; 
                }
                lines[index] = line;
              });
              return lines.join('\n');
              }, SP_NONE);
        });
      });      
    }
/** ------------------------------------------------------------------------
 *                               Commands: Clipboard
 ** ------------------------------------------------------------------------ */
    function fileToClipboard() {
        copyToClipboard(function (curfile) {
            return curfile._name || curfile.name;
        });
    }

    function fullnameToClipboard() {
        copyToClipboard(function (curfile) {
            var fullname = curfile._path || curfile.path;
            return brackets.platform === 'win' ? fullname.replace(/\//g, "\\") : fullname;
        });
    }
    
    function buidHtmlReport() {
        getSelection(function (text) {
            var outp = [];
            [['link rel="stylesheet" href', 'stylesheet', true], ['id'], ['class']].forEach(function(item) {
                var token = item[0],
                    list = [], i;
                // although there is no text to replace, it's easier to use replace than using //.exec
                text.replace(new RegExp(token + '=(?:(\\w+)|(?:"(.+?)"))', "gi"), function (data, p1, p2) { 
                    list.push(p1 || p2); 
                    return data; 
                });
                if (!item[2]) {
                    list.sort();
                }
                // remove duplicates. this method is faster than use a indexOf during the push code
                for (i = list.length; i > 0; i--) {
                    if (list[i] === list[i - 1]) {
                        list.splice(i, 1);
                    }
                }
                outp.push('[' + (item[1] || token) + ']');
                outp = outp.concat(list);
                outp.push(''); // empty line
            });
            nodeClipbrdCopy(outp.join('\n'));
        }, SP_ALL);
    }
/** ------------------------------------------------------------------------
 *                               Js6
 ** ------------------------------------------------------------------------ */
    /*function showResultsPanel(err, stdout, stderr, iscompiler) { // Compiler callback isn't working
        var text = '';
        if (iscompiler) {
            text = stderr;
        } else {
            text = stderr + '\n' + stdout;
        }
        text = text.trim();
        if (text) {
            text = text.split('\n');
            text.forEach(function(line, index) {
                text[index] = '<p>' + htmlEncode(line) + '</p>';
            });
            text = text.join();
            PanelManager.createBottomPanel(MODULENAME, text);
        }
    }*/
    function runCompilerEx(autosave) {
        
        function addrepl(list, prefix, filename, root) {
            var parts = filename.match(/^(.*)\/([^/]*)$/),
                relfile = filename.indexOf(root) === 0 ? filename.substr(root.length) : filename;          
            list.push([prefix, filename]);
            list.push([prefix + 'file', parts[2]]);
            list.push([prefix + 'path', parts[1]]);
            list.push([prefix + 'relfile', relfile]);
        }
        
        var exts = [
            {inext: '.js6', outext: '.js'},
            {inext: '.scss', outext: '.css'}
            ],

            infile = getCurFileName(),
            outfile, i, ext, cmdline, pref, root, 
            repllist = [];
        
        for (i = 0; i < exts.length; i++) {
            ext = exts[i];
            if (checkExt(infile, ext.inext)) {
                pref = prefs[ext.inext.substr(1)];
                if (pref.fields.autosave.value || !autosave) {
                    cmdline = pref.value;
                    outfile = infile.substr(0, infile.length - ext.inext.length) + ext.outext;
                    root = ProjectManager.getProjectRoot()._path;
                    addrepl(repllist, 'in', infile, root);
                    addrepl(repllist, 'out', outfile, root);
                    repllist.forEach(function (macro) {
                        cmdline = cmdline.replace('{{' + macro[0] + '}}', macro[1]);
                    });
                    console.log(cmdline);
                    nodeExec(cmdline, root/*, showResultsPanel, true*/);
                    break;
                }
            }
        }
    }

    function runCompiler() {
        runCompilerEx(false);
    }

    /*function runGrunt() {
        nodeExec(prefs.grunt.value);
    }*/
    
/** ------------------------------------------------------------------------
 *                               Snippets
 ** ------------------------------------------------------------------------ */
/* Initial implementation, not finished.

function getSnippets(callback) {
    if(!snippets) {
        $.getJSON(FileUtils.getNativeModuleDirectoryPath(module) + '/snippets.json', function(data) {
            snippets = data;
            callback();
        });
    } else {
        callback();          
    }
}

function execSnippets() {
    getSnippets(function() {
        var so = getSelObj(SP_WORD);
        if (!so.cursel) {
            return;
        }
        
    });
}
*/
/** ------------------------------------------------------------------------
 *                               showOptions
 ** ------------------------------------------------------------------------ */
    function showHelp() {
        nodeOpenUrl(HELPLINK);
    }

  function showAbout() {
        showMessage('About', ABOUTTEXT);
    }

    function showOptions() {
        ask('Options', prefs.OPTIONFIELDS, undefined, {header: ['Field', 'Value', 'Exec On Save']});
    }

    function showCommands() {
        var cmds = getCommandList(),
            fields = {cmd: {value: '', type: 'dropdown', values: [] }};

        cmds.forEach(function(cmd) {
            if (cmd.name) {
                fields.cmd.values.push(cmdToLabel(cmd.name));
            }
        });
        fields.cmd.values.sort();

        ask('Commands', ['cmd'], function () {
            var selcmd = fields.cmd.value;
            cmds.every(function(cmd) {
                if (cmd.name && (selcmd === cmdToLabel(cmd.name))) {
                    runCommand(cmd);
                    return false;
                }
                return true;
            });
        }, {nosaveprefs : true}, fields);
    }


    function showCommandMapper() {
        var cmds = getCommandList(),
            fields = {},
            fieldlist = [],
            showinmenu = prefs.commands.value.showinmenu,
            showinctxmenu = prefs.commands.value.showinctxmenu,
            hotkeys = prefs.commands.value.hotkeys;

        cmds.forEach(function(cmd) {
            var key;
            if (cmd.name) {
                key = cmdToName(cmd.name);
                fields[key] = {value: hotkeys[key] || '', label: cmdToLabel(cmd.name), size: 15, canempty: true,
                               hint: 'Ex: Ctrl-Shift-U (win).  Cmd-Shift-U (mac)',
                    fields: {showinmenu: {value: showinmenu.indexOf(key) > -1, type: 'boolean', align: 'center', canempty: true},
                            showinctxmenu: {value: showinctxmenu.indexOf(key) > -1, type: 'boolean', align: 'center', canempty: true}}};
                fieldlist.push(key);
            }
        });

        ask('Commands', fieldlist, function () {
            showinmenu = [];
            showinctxmenu = [];
            hotkeys = {};
            cmds.forEach(function(cmd) {
                var key, field;
                if (cmd.name) {
                    key = cmdToName(cmd.name);
                    field = fields[key];
                    if (field.value) {
                        hotkeys[key] = field.value.replace(/(Cmd|Shift|Alt|Ctrl)\+/g, '$1-');
                    }
                    if (field.fields.showinmenu.value) {
                      showinmenu.push(key);
                    }
                    if (field.fields.showinctxmenu.value) {
                      showinctxmenu.push(key);
                    }
                }
            });
            prefs.commands.value.showinmenu = showinmenu;
            prefs.commands.value.showinctxmenu = showinctxmenu;
            prefs.commands.value.hotkeys = hotkeys;
            saveextprefs();

        }, {nosaveprefs : true, msg : 'Only takes effect after restart!', header: ['Command', 'Hotkey', 'Show on Menu', 'Show on CtxMenu']},
            fields);
    }
/** ------------------------------------------------------------------------
 *                               runLanguageMapper
 ** ------------------------------------------------------------------------ */
    function runLanguageMapper() {
        var lang = LanguageManager.getLanguage("javascript");
        lang.addFileExtension("js6");
    }
/** ------------------------------------------------------------------------
 *                               buildCommands
 ** ------------------------------------------------------------------------ */
    var SHOWONMENU = 1;

    function getCommandList() {
        return [
            {name: "UpperCase", f: upperCaseText, priority: SHOWONMENU},
            {name: "LowerCase", f: lowerCaseText, priority: SHOWONMENU},
            {name: "Capitalize", f: tt.capitalizeText, sp: SP_WORD, priority: SHOWONMENU},
            {name: "CamelCase", f: tt.camelCaseText, sp: SP_WORD, priority: SHOWONMENU},          
            {name: "HtmlEncode", f: htmlEncode, priority: SHOWONMENU},
            {name: "HtmlDecode", f: htmlDecode, priority: SHOWONMENU},
            {name: "UrlEncode", f: urlEncode, priority: SHOWONMENU},
            {name: "Join", f: joinText, priority: SHOWONMENU},
            {name: "Split...", f: splitText, priority: SHOWONMENU},
            {name: "Number...", f: numberText, priority: SHOWONMENU},
            {name: "Reverse", f: tt.reverse, sp: SP_SENTENCE, priority: SHOWONMENU},
            {name: "Trim Leading", f: trimLeading, priority: SHOWONMENU},
            {name: "Trim Trailing", f: trimTrailing, priority: SHOWONMENU},
            {name: "Markdown Trim Trailing", f: markdownTrimTrailing, priority: SHOWONMENU},
            {name: "Sort Ascending", f: sortAscending, priority: SHOWONMENU},
            {name: "Sort Descending", f: sortDescending, priority: SHOWONMENU},
            {name: "Remove Duplicates", f: removeDuplicates, priority: SHOWONMENU},
            {name: "Remove Empty Lines", f: removeEmptyLines, priority: SHOWONMENU},
            {},
            {name: "Unix To Win", f: tt.unixToWin, sp: SP_LINE, priority: SHOWONMENU},
            {name: "Win To Unix", f: tt.winToUnix, sp: SP_LINE, priority: SHOWONMENU},
            {name: "Single Slash To Double", f: tt.singleToDoubleSlash, sp: SP_LINE, priority: SHOWONMENU},
            {name: "Double To Single Slash", f: tt.doubleToSingleSlash, sp: SP_LINE, priority: SHOWONMENU},
            {name: "Single Quote To Double", f: singleToDoubleQuote, priority: SHOWONMENU},
            {name: "Double To Single Quote", f: doubleToSingleQuote, priority: SHOWONMENU},
            {name: "Toggle Quote", f: toggleQuote, priority: SHOWONMENU},
            {name: "Tab To Space", f: tabToSpace, priority: SHOWONMENU},
            {name: "Space To Tab", f: spaceToTab, priority: SHOWONMENU},
            {name: "rgb-hex", f: rgbHex, priority: SHOWONMENU},
            {name: "Untag", f: untag, priority: SHOWONMENU},
            {name: "Tag", f: tag, priority: SHOWONMENU},
            {menu: 1},
          
            {name: "Break Line At", f: breakLineAt, priority: SHOWONMENU},          
            {name: "Lorem ipsum", f: LoremIpsum, priority: SHOWONMENU},          
            {name: "Function JSDoc", f: buildFuncJSDoc, priority: SHOWONMENU},
            {name: "Declare JSLint Global", f: declJSLintGlobal, priority: SHOWONMENU},
            {},
            {name: "ExtractorToIX...", f: extractortoix, priority: SHOWONMENU},
            {name: "ReplaceToIX...", f: replacetoix, priority: SHOWONMENU},
            {},
            {name: "Open Url", f: openUrl, priority: SHOWONMENU},
            {name: "Web Search", f: webSearch, priority: SHOWONMENU},
            {name: "Browse File", f: browseFile, priority: SHOWONMENU},
            {},
            {name: "Copy Filename", f: fileToClipboard, priority: SHOWONMENU},
            {name: "Copy Fullname", f: fullnameToClipboard, priority: SHOWONMENU},
            {name: "Regnize", f: regnize, priority: SHOWONMENU},
            {name: "Html Report", f: buidHtmlReport, priority: SHOWONMENU},
            {},
            //{name: "Regex Tester", f: regexTester},
            {name: "Compiler", f: runCompiler, label: "Compile(js6, scss)", priority: SHOWONMENU}, //TODO: Implement "/Run(py, js)"
            //{name: "Snippets", f: execSnippets, priority: SHOWONMENU},
            /*{name: "Run grunt", f: runGrunt}, */
            {},
            {name: "Commands...", f: showCommands, priority: SHOWONMENU},
            {name: "Commands Mapper...", f: showCommandMapper, showalways: true, priority: SHOWONMENU},
            {name: "Options...", f: showOptions, priority: SHOWONMENU},
            {name: "Help", f: showHelp, priority: SHOWONMENU},
            {name: "About", f: showAbout, showalways: true, priority: SHOWONMENU}
        ];
    }

    function runCommand(cmd) {
        if(!cmd.sp) {
            cmd.f();
        } else {
            replaceSelection(cmd.f.pat, cmd.f.repl, cmd.sp);
        }
    }
    
    // This function must be a top level function to mimimize the closure
    function registerCommand(cmd, id) {        
        CommandManager.register(cmd.label || cmd.name, id,  function () { runCommand(cmd); });
    }
    

    function buildCommands() {
        
        function addToMenu(cmd, menu, lastid) {
            var opts, platform, hotkey, 
                id = MODULENAME + "." + cmdToName(cmd.name);
            // Register Command
            if (id !== lastid) {
                registerCommand(cmd, id);
            }    
            // Register Menu Items
            opts = [];
            hotkey = hotkeys[nm];
            if (hotkey) {
                opts.push({key: hotkey, platform: brackets.platform});
            }
            menu.addMenuItem(id, opts);
            return id;
        }
        
        var cmdlist = getCommandList(),
            menuidx = 0,
            Menus = brackets.getModule("command/Menus"),
            //menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU),
            // Since Brackets has no submenu support it's better to create a top menu
            menulist = [Menus.addMenu(IXMENUTT, IXMENUTT), Menus.addMenu(IXMENU, IXMENU)],
            ctxmenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU),            
            i, cmd, nm, lastid,
            showinmenu = prefs.commands.value.showinmenu,
            showinctxmenu = prefs.commands.value.showinctxmenu,
            hotkeys = prefs.commands.value.hotkeys,
            hasdiv = false;

        for (i = 0; i < cmdlist.length; i++) {
            cmd = cmdlist[i];
            if (!cmd.name) {
                if (cmd.menu) {
                  menuidx = cmd.menu;
                } else {
                  if (!hasdiv) {
                      menulist[menuidx].addMenuDivider();
                  }
                }
                hasdiv = true;
                continue;
            }
            nm = cmdToName(cmd.name);
            if (cmd.showalways || (showinmenu.indexOf(nm) > -1)) {
                hasdiv = false;
                lastid = addToMenu(cmd, menulist[menuidx], lastid);
            }
            
            if (showinctxmenu.indexOf(nm) > -1) {
                lastid = addToMenu(cmd, ctxmenu, lastid);
            }
        }
    }

    function fillshowonmenu() {
        getCommandList().forEach(function (cmd) {
            if (cmd.priority === SHOWONMENU) {
                prefs.commands.value.showinmenu.push(cmdToName(cmd.name));
            }
        });
    }
 
    function initprefbuttons() {
        prefs.find.buttons[0].f = function(text) { return getregnize(text, true); };
        prefs.findre.buttons[0].f = prefs.find.buttons[0].f;
        prefs.scss.buttons[0].f = function(text) { return prefs.scss.buttons[0].setvalue; };
        prefs.scss.buttons[1].f = function(text) { return prefs.scss.buttons[1].setvalue; };
    }
/** ------------------------------------------------------------------------
 *                               checkForVersion2
 ** ------------------------------------------------------------------------ */    
   function versionCheck() {
     var svver = prefs.version.value,
         i;
     if (svver !== VERSION) {
       if (!svver || ((svver.split('.')[0] >> 0) < 2)) {
         prefs.version.showwelcome = true;
         prefs.commands.value.showinmenu = prefs.commands.svshowinmenu;
       }           
       prefs.version.value = VERSION;
       saveextprefs();
     }
   }
  
  function posVersionCheck() {
    if (prefs.version.showwelcome) {
       showMessage('Information', '<h2>Welcome to Brackets<sub>to</sub>IX ' + VERSION + '</h2>' + 
          'The menus were reorganized so you can to have a quicker access to all the commands.<br>' +
          'Now there two top menus with all the commands<br>' + 
          'You can still remove commands from the Commands Mapper dialog');
    }
  }
/** ------------------------------------------------------------------------
 *                               Init
 ** ------------------------------------------------------------------------ */    
    console.log(window.navigator.userAgent);
    fillshowonmenu(); // must be before loadextprefs
    initprefbuttons();
    prefs.commands.svshowinmenu = prefs.commands.value.showinmenu;
    loadextprefs();
    versionCheck();
    buildCommands();
    runLanguageMapper();
    initprefbuttons();
    posVersionCheck();
/** ------------------------------------------------------------------------
 *                               Save Commands
 ** ------------------------------------------------------------------------ */
    function runSaveCommands() {
        //trimTrailing(true);  //@TODO: Implement trim on save
        runCompilerEx(true);
    }

    $(DocumentManager).on("documentSaved", runSaveCommands);
});