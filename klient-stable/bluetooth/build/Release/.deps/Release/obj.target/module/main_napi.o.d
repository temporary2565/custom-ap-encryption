cmd_Release/obj.target/module/main_napi.o := cc '-DNODE_GYP_MODULE_NAME=module' '-DUSING_UV_SHARED=1' '-DUSING_V8_SHARED=1' '-DV8_DEPRECATION_WARNINGS=1' '-D_LARGEFILE_SOURCE' '-D_FILE_OFFSET_BITS=64' '-DBUILDING_NODE_EXTENSION' -I/usr/include/nodejs/include/node -I/usr/include/nodejs/src -I/usr/include/nodejs/deps/uv/include -I/usr/include/nodejs/deps/v8/include -I../node_modules/napi-macros  -fPIC -pthread -Wall -Wextra -Wno-unused-parameter -m64 -O3 -fno-omit-frame-pointer  -MMD -MF ./Release/.deps/Release/obj.target/module/main_napi.o.d.raw  -c -o Release/obj.target/module/main_napi.o ../main_napi.c
Release/obj.target/module/main_napi.o: ../main_napi.c \
 /usr/include/nodejs/src/node_api.h \
 /usr/include/nodejs/src/node_api_types.h \
 ../node_modules/napi-macros/napi-macros.h ../definitions.h \
 ../universal.h ../libproject.h ../napi_helpers.h
../main_napi.c:
/usr/include/nodejs/src/node_api.h:
/usr/include/nodejs/src/node_api_types.h:
../node_modules/napi-macros/napi-macros.h:
../definitions.h:
../universal.h:
../libproject.h:
../napi_helpers.h:
