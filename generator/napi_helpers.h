#ifndef __NAPI_HELPERS_H__
#define __NAPI_HELPERS_H__

typedef struct shared {
    char station_key[8400];
    char vendor_key[8400];
    char params[512];
    char operation[64];
} shared_t;

typedef struct {
    struct shared * data;
    char output_json[1024];
    napi_deferred deferred;
    napi_async_work work;
} promise_data_t;

#endif