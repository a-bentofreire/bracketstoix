# --------------------------------------------------------------------
# Copyright (c) 2024 Alexandre Bento Freire. All rights reserved.
# Licensed under the GPL-2.0 license
# --------------------------------------------------------------------

from toix_proxy import ToIXProxy

from gi.repository import Gtk  # noqa

MENU_PATH = "/MenuBar/ToolsMenu/ToolsOps_1"

class ToIXProxyPluma(ToIXProxy):

    def editorId(self):
        return "Pluma"
    
    def do_update_state(self):
        self._action_group.set_sensitive(self.plugin.window.get_active_document() != None)

    def _insert_menu(self):
        info = self.plugin.info()
        id = info["Id"]
        manager = self.plugin.window.get_ui_manager()

        self._action_group = Gtk.ActionGroup(name=f"{self.editorId()}{id}PluginActions")
        self._action_group.add_actions(
            [(f"{id}Action", None, "IX: " + self._(info["Caption"]), info.get("ShortCut") or None, self._(info["Hint"]),
              lambda w: self.exec_action())])

        manager.insert_action_group(self._action_group)

        self._ui_id = manager.new_merge_id()

        manager.add_ui(self._ui_id,
                       MENU_PATH,
                       f"{id}Action",
                       f"{id}Action",
                       Gtk.UIManagerItemType.MENUITEM,
                       True)

    def _remove_menu(self):
        manager = self.plugin.window.get_ui_manager()
        manager.remove_ui(self._ui_id)
        manager.remove_action_group(self._action_group)
        manager.ensure_update()