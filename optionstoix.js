'use strict';
// --------------------------------------------------------------------
// Copyright (c) 2016-2024 Alexandre Bento Freire. All rights reserved.
// Licensed under the MIT License
// --------------------------------------------------------------------
define(function () {
    var $dlg;
    var $curCat;
    var $curTab;
    var curTabName;
    var usableCmds;
    var usableTools;
    var storeIdMap = {};
    var projSettings;
    var projCompilersFlds = ['js6', 'scss', 'js'];
    var projSetsFlds = ['spaceUnits'].concat(projCompilersFlds);
    var prefs;
    var ix;
    var tools;
    var bs = {}; // beforesave
    var as = {}; // aftersave
    var ts = {}; // beforesave
    var buildOptionHtml = function (val, text) { return '<option value="' + val + '">' + tools.htmlEscape(text) + '</option>'; };
    function _fillEventSaveTargetExts(rec) {
        var html = '';
        rec.value.forEach(function (st, index) {
            html += buildOptionHtml(index, st.exts);
        });
        rec.$targetexts.html(html);
    }
    function _fillEventSaveTargetCmds(rec) {
        var html = '';
        if (rec.curextidx >= 0) {
            rec.value[rec.curextidx].cmds.forEach(function (storeid) {
                html += buildOptionHtml(storeid, storeIdMap[storeid].label);
            });
        }
        rec.$targetcmds.html(html);
    }
    function _fillTools() {
        var html = '';
        ts.value.forEach(function (tool, index) {
            html += buildOptionHtml(index, tool.name);
        });
        ts.$toollist.html(html);
    }
    function _listOp(delta, index, array, fillfunc, $list, rec) {
        var svitem;
        if ((index + delta) >= 0 && (index + delta) < array.length) {
            svitem = array[index];
            array.splice(index, 1);
            if (delta) {
                array.splice(index + delta, 0, svitem);
            }
            fillfunc(rec);
            if (delta) {
                $list[0].selectedIndex = index + delta;
            }
            $list.click();
            $list.focus();
        }
    }
    function _eventSaveTargetCmdsListOp(delta, rec) {
        if (rec.curextidx >= 0) {
            _listOp(delta, rec.curcmdidx, rec.value[rec.curextidx].cmds, _fillEventSaveTargetCmds, rec.$targetcmds, rec);
        }
    }
    function _toolsListOp(delta) {
        _listOp(delta, ts.curidx, ts.value, _fillTools, ts.$toollist);
    }
    function toolUItoValue() {
        var name = ts.$toolname.val().trim();
        var cmdline = ts.$toolcmdline.val().trim();
        var idx = ts.value.length;
        var showonmenu = ts.$toolshowonmenu.get(0).checked;
        var showoutput = ts.$toolshowoutput.get(0).checked;
        if (name && cmdline) {
            return { idx: idx, tool: { name: name, cmdline: cmdline, showonmenu: showonmenu, showoutput: showoutput } };
        }
        else {
            return null;
        }
    }
    function toolValtoUI(tool) {
        ts.$toolname.val(tool ? tool.name : '');
        ts.$toolcmdline.val(tool ? tool.cmdline : '');
        ts.$toolshowonmenu.get(0).checked = tool.showonmenu;
        ts.$toolshowoutput.get(0).checked = tool.showoutput;
    }
    function _buildEventSave(rec, htmlprefix, fillHandler, usableList) {
        var html = '';
        rec.$exts = $dlg.find(htmlprefix + 'saveexts');
        rec.$targetexts = $dlg.find(htmlprefix + 'savetargetexts');
        rec.$cmds = $dlg.find(htmlprefix + 'savecmds');
        rec.$targetcmds = $dlg.find(htmlprefix + 'savetargetcmds');
        rec.curextidx = -1;
        rec.curcmdidx = -1;
        fillHandler(rec);
        usableList.forEach(function (cmd) {
            html += buildOptionHtml(cmd.storeid, cmd.label);
        });
        rec.$cmds.html(html);
        $(htmlprefix + 'saveextadd').click(function () {
            var exts = rec.$exts.val().trim();
            var idx = rec.value.length;
            if (exts.length) {
                rec.value.push({ exts: exts, cmds: [] });
                rec.$targetexts.append(buildOptionHtml(idx, exts));
            }
        });
        $(htmlprefix + 'saveextremove').click(function () {
            _listOp(0, rec.curextidx, rec.value, fillHandler, rec.$targetexts, rec);
        });
        $(htmlprefix + 'saveextup').click(function () {
            _listOp(-1, rec.curextidx, rec.value, fillHandler, rec.$targetexts, rec);
        });
        $(htmlprefix + 'saveextdown').click(function () {
            _listOp(1, rec.curextidx, rec.value, fillHandler, rec.$targetexts, rec);
        });
        $(htmlprefix + 'saveextupdate').click(function () {
            var exts = rec.$exts.val().trim();
            if (exts.length && rec.curextidx >= 0) {
                rec.value[rec.curextidx].exts = exts;
                rec.$targetexts[0][rec.curextidx].label = exts;
            }
        });
        $(htmlprefix + 'savecmdadd').click(function () {
            var storeid = rec.$cmds.val();
            if (rec.curextidx < 0) {
                return;
            }
            rec.value[rec.curextidx].cmds.push(storeid);
            rec.$targetcmds.append(buildOptionHtml(storeid, storeIdMap[storeid].label));
        });
        $(htmlprefix + 'savecmdremove').click(function () {
            _eventSaveTargetCmdsListOp(0, rec);
        });
        $(htmlprefix + 'savecmdup').click(function () {
            _eventSaveTargetCmdsListOp(-1, rec);
        });
        $(htmlprefix + 'savecmddown').click(function () {
            _eventSaveTargetCmdsListOp(1, rec);
        });
        rec.$targetexts.click(function () {
            rec.curextidx = rec.$targetexts[0].selectedIndex >> 0;
            _fillEventSaveTargetCmds(rec);
            rec.curcmdidx = -1;
            if (rec.curextidx >= 0) {
                rec.$exts.val(rec.value[rec.curextidx].exts);
            }
            else {
                rec.$exts.val('');
            }
        });
        rec.$targetcmds.click(function () {
            rec.curcmdidx = rec.$targetcmds[0].selectedIndex >> 0;
        });
        if (rec.value.length) {
            rec.$targetexts[0].selectedIndex = 0;
            rec.$targetexts.click();
        }
    }
    return {
        dlgtemplate: 'options.html',
        // ------------------------------------------------------------------------
        //                               prepare
        // ------------------------------------------------------------------------
        prepare: function (aprefs, cmdlist, aix, atools, aprojSettings) {
            function eventPrepare(prefvar, rec) {
                rec.value = [];
                prefvar.value.forEach(function (st, index) {
                    rec.value.push({ exts: st.exts.join(';'), cmds: st.cmds });
                });
            }
            prefs = aprefs;
            tools = atools;
            projSettings = aprojSettings;
            eventPrepare(prefs.beforesave, bs);
            eventPrepare(prefs.aftersave, as);
            if (!usableCmds) {
                usableCmds = [];
                cmdlist.forEach(function (cmd) {
                    if (cmd.canonsave) {
                        usableCmds.push(cmd);
                        storeIdMap[cmd.storeid] = cmd;
                    }
                });
            }
            usableTools = [];
            prefs.tools.value.forEach(function (tool) {
                var tag = tool.name;
                var cmd = { storeid: '@' + tag, label: tag };
                usableTools.push(cmd);
                storeIdMap['@' + tag] = cmd;
            });
            ts.value = [];
            prefs.tools.value.forEach(function (tool) {
                ts.value.push(tool);
            });
            ix = aix;
        },
        // ------------------------------------------------------------------------
        //                               ProjSettings
        // ------------------------------------------------------------------------
        _buildProjSettings: function () {
            projSetsFlds.forEach(function (field) {
                if (projSettings.data[field]) {
                    $('#proj' + field).get(0).checked = true;
                }
            });
        },
        setPrefsFromProject: function (aPrefs, aProjSettings) {
            projCompilersFlds.forEach(function (field) {
                if (aProjSettings.data[field]) {
                    aPrefs[field].value = aProjSettings.data[field];
                }
            });
        },
        _saveProjSettings: function (dlgopts) {
            var projSetsData = projSettings.data;
            var isPrevNotEmpty = Object.keys(projSetsData).length;
            projSetsFlds.forEach(function (field) {
                var isSpaceUnits = field === 'spaceUnits';
                if ($('#proj' + field).get(0).checked) {
                    if (isSpaceUnits) {
                        dlgopts.setSpaceUnits(projSetsData, true);
                    }
                    else {
                        projSetsData[field] = prefs[field].value;
                    }
                }
                else {
                    delete projSetsData[field];
                    if (isSpaceUnits) {
                        dlgopts.setSpaceUnits(projSetsData, false);
                    }
                }
            });
            // Save settings
            if (isPrevNotEmpty || Object.keys(projSetsData).length) {
                dlgopts.saveProjSettings(projSetsData);
            }
        },
        // ------------------------------------------------------------------------
        //                               afterBuild
        // ------------------------------------------------------------------------
        afterBuild: function (self, $adlg) {
            $dlg = $adlg;
            $curCat = null;
            $curTab = null;
            curTabName = '';
            $dlg.find('#toixcats li').click(function (ev) {
                var $newcat = $(ev.target);
                if ($curCat) {
                    if ($newcat.get(0).id === curTabName) {
                        return;
                    }
                    $curCat.removeClass('toixselcat');
                    $curTab.removeClass('toixseltab');
                }
                $curCat = $newcat;
                curTabName = $newcat.get(0).id;
                $curTab = $dlg.find('#toix' + curTabName);
                $curCat.addClass('toixselcat');
                $curTab.addClass('toixseltab');
            });
            $dlg.find('#general').click();
            _buildEventSave(bs, '#before', _fillEventSaveTargetExts, usableCmds);
            _buildEventSave(as, '#after', _fillEventSaveTargetExts, usableTools);
            self._buildTools();
            self._buildProjSettings();
        },
        // ------------------------------------------------------------------------
        //                               Tools
        // ------------------------------------------------------------------------
        _buildTools: function () {
            var html = '';
            ts.$toollist = $dlg.find('#toollist');
            ts.$toolname = $dlg.find('#toolname');
            ts.$toolcmdline = $dlg.find('#toolcmdline');
            ts.$toolshowonmenu = $dlg.find('#toolshowonmenu');
            ts.$toolshowoutput = $dlg.find('#toolshowoutput');
            ts.$pdtools = $dlg.find('#pdtools');
            ts.curidx = -1;
            _fillTools();
            $('#toolsadd').click(function () {
                var val = toolUItoValue();
                if (val) {
                    ts.value.push(val.tool);
                    ts.$toollist.append(buildOptionHtml(val.idx, val.tool.name));
                }
            });
            $("#toolsupdate").click(function () {
                var val = toolUItoValue();
                if (val && ts.curidx >= 0) {
                    ts.value[ts.curidx] = val.tool;
                    ts.$toollist[0][ts.curidx].label = val.tool.name;
                }
            });
            $("#toolsremove").click(function () {
                _toolsListOp(0);
            });
            $("#toolsup").click(function () {
                _toolsListOp(-1);
            });
            $("#toolsdown").click(function () {
                _toolsListOp(1);
            });
            ts.$toollist.click(function () {
                ts.curidx = ts.$toollist[0].selectedIndex >> 0;
                toolValtoUI(ts.curidx >= 0 ? ts.value[ts.curidx] : null);
            });
            if (ts.value.length) {
                ts.$toollist[0].selectedIndex = 0;
                ts.$toollist.click();
            }
            html = '';
            ix.pdtools.forEach(function (tool, index) {
                html += buildOptionHtml(index, tool.name);
            });
            ts.$pdtools.html(html);
            $("#pdtoolsadd").click(function () {
                var idx = ts.$pdtools[0].selectedIndex >> 0;
                toolValtoUI(ix.pdtools[idx]);
                $("#toolsadd").click();
            });
        },
        // ------------------------------------------------------------------------
        //                               On Save
        // ------------------------------------------------------------------------
        onSave: function (self, dlgopts) {
            function eventSave(prefvar, rec) {
                prefvar.value = rec.value.map(function (st, index) { return ({ exts: st.exts.split(/;/), cmds: st.cmds }); });
            }
            eventSave(prefs.beforesave, bs);
            eventSave(prefs.aftersave, as);
            prefs.tools.value = ts.value.map(function (tool) { return tool; });
            self._saveProjSettings(dlgopts);
        },
    };
});
//# sourceMappingURL=optionstoix.js.map