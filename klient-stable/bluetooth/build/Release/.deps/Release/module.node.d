cmd_Release/module.node := ln -f "Release/obj.target/module.node" "Release/module.node" 2>/dev/null || (rm -rf "Release/module.node" && cp -af "Release/obj.target/module.node" "Release/module.node")
