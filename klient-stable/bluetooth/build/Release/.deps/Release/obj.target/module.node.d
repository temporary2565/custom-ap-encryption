cmd_Release/obj.target/module.node := g++ -shared -pthread -rdynamic -m64  -Wl,-soname=module.node -o Release/obj.target/module.node -Wl,--start-group Release/obj.target/module/main_napi.o -Wl,--end-group /home/m/Documents/router/generator/libproject.a -pthread -lm -lz -lssl -lcrypto
