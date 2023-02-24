#define NAPI_VERSION 3
#include <node_api.h>
#include <napi-macros.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <time.h>
#include <sys/types.h>
#include <stdbool.h>
#include <dlfcn.h>
#include <pthread.h>
#include <semaphore.h>
#include <errno.h>
#include <math.h>
#include <signal.h>
#include <unistd.h>

#include <openssl/rsa.h>
#include <openssl/engine.h>
#include <openssl/pem.h>
#include <openssl/conf.h>
#include <openssl/evp.h>
#include <openssl/err.h>
#include <openssl/aes.h>
#include <openssl/rand.h>
#include <openssl/bio.h>
#include <openssl/ssl.h>
#include <openssl/x509.h>
#include <openssl/buffer.h>

#define error_out(v) {char tmpInScope1[70];\
sprintf(tmpInScope1, "{\"error_code\": \"%X\", \"error\": true}", v);\
napi_throw_error(env, v, tmpInScope1);}

//#include "base85.h"
#include "definitions.h"
#include "universal.h"
#include "libproject.h"
#include "napi_helpers.h"

void eg_execute(napi_env env, void *data) {
  puts("here");
    promise_data_t *resolved = (promise_data_t *)data;
    struct shared input = *resolved->data;
    char *argv = (char *)&input.params;
    unsigned int argc = 3;

    param_time_t params_time;
    char value[1024];
puts("here");
    //for (argc = 0;argv[argc]; argv[argc]==',' ? argc++ : *(argv)++);
    char operation[32];
    char params[512];
    sprintf(operation, "%s", input.operation);
    sprintf(params, "%s", input.params);
    if(argc < 3) error_out(ERROR_INPUT);
    if(strlen(operation) > 31) error_out(ERROR_INPUT);
    if(strlen(params) > 511) error_out(ERROR_INPUT);
    printf("\n\n%s\n%s\n", operation, params);
    if(strncmp(operation, "time_parse", strlen("time_parse")) == 0) {
        // params: hash, variance, difficulty
        char *tmp = malloc(512*sizeof(char));
        if(strlen(params) == SIZE_TIMEHASH + SIZE_TIMEVARIANCE + SIZE_DIFFICULTY + 2 && strlen(strtok(params, ",")) == 128) {
            clock_t start, end;
            memcpy(tmp, &params[0], SIZE_TIMEHASH);
            tmp[SIZE_TIMEHASH] = '\0';
            sprintf(params_time.hash, "%s", tmp);
            memcpy(tmp, &params[SIZE_TIMEHASH+1], SIZE_TIMEVARIANCE);
            tmp[SIZE_TIMEVARIANCE] = '\0';
            if(tmp == NULL || strlen(tmp) != SIZE_TIMEVARIANCE) {
                error_out(ERROR_TIMEPARSE);
            }
            for(int i=0;i<strlen(tmp);i++) {
                if(!isdigit(tmp[i])) {
                    error_out(ERROR_TIMEPARSE);
                }
            }
            params_time.variance = (unsigned int)atoi(tmp);
            memcpy(tmp, &params[SIZE_TIMEHASH+SIZE_TIMEVARIANCE+2], SIZE_DIFFICULTY);
            tmp[SIZE_DIFFICULTY] = '\0';
            if(tmp == NULL || strlen(tmp) != SIZE_DIFFICULTY) {
                error_out(ERROR_TIMEPARSE);
            }
            for(int i=0;i<strlen(tmp);i++) {
                if(!isdigit(tmp[i])) {
                    error_out(ERROR_TIMEPARSE);
                }
            }
            //printf("%d\n", (int)atoi(tmp));
            params_time.diff = (int)atoi(tmp);
            params_time.error = false;
            start = clock();
            u_int64_t ret = parse_time(params_time);
            if(ret != 0) {
                params_time.result = ret;
            } else {
                params_time.error = true;
            }
            end = clock();
            params_time.variance_local = (unsigned int)floorl(end - start);
            sprintf(value, "{\"hash\": \"%s\", \"variance-remote\": \"%d\", \"variance-local\": \"%d\", \"error\": %s, result: \"%lu\"}",
                params_time.hash, params_time.variance, params_time.variance_local, params_time.error ? "true" : "false", params_time.result);
        } else {
            error_out(ERROR_TIMEPARSE);
        }
    } else if(strncmp(operation, "time_gen", strlen("time_gen")) == 0) {
        if(strlen(params) != SIZE_TIMELIMIT) error_out(ERROR_TIMEGEN);
        clock_t start, end;
        int limit;

        for(int i=0;i<strlen(params);i++) {
            if(!isdigit(params[i])) {
                error_out(ERROR_TIMEGEN);
            }
        }
        limit = atoi(params);

        start = clock();
        char *hash = generate_time();
        end = clock();
        u_int64_t variance = (u_int64_t)floorl(end - start);
        sprintf(value, "{\"hash\": \"%s\", \"error\": false, \"variance\": \"%lu\"}", hash, variance);
    } else if(strncmp(operation, "authorize_device", strlen("authorize_device")) == 0) {
        char *tmp = malloc(512*sizeof(char));
        memcpy(tmp, &params[0], SIZE_TIMEHASH);
        
    } else if(strncmp(operation, "pair_gen", strlen("pair_gen")) == 0) {
        if(strlen(params) != SIZE_PHYSICALADDR) {
            error_out(ERROR_PAIRGEN);
        }
        char address[13];
        char *keyBuffer;
        char *output, *challenge;
        size_t vendorKeySize, stationKeySize;

        //keyBuffer = (char *)malloc(20000*sizeof(char));
        //memset(keyBuffer, 0, 20000*sizeof(char));
        //read(STDIN_FILENO, keyBuffer, 20000*sizeof(char));

        //memset(vendorKey, 0, 20000*sizeof(char));
        //memset(stationKey, 0, 20000*sizeof(char));

        sprintf(address, "%s", params);
        pair_gen(&output, address, input.station_key, input.vendor_key, &challenge);

        sprintf(value, "{\"data\": \"%s\", challenge: \"%s\"}", output, challenge);
        puts("last");
    } else if(strncmp(operation, "pair_parse", strlen("pair_parse")) == 0) {
        struct param_pair* output;
        char *challenge_85;
        memset(output, 0, sizeof(struct param_pair));

        bool success = pair_parse(&output, params, input.station_key, input.vendor_key);
        challenge_85 = malloc(30*sizeof(char));
        memset(challenge_85, 0, 30*sizeof(char));
        decode_85(challenge_85, output->challenge, sizeof(output->challenge));

        if(success) {sprintf(value, "{\"mac\": \"%s\", \"success\": true, \"challenge\": \"%s\"}");}
        else {sprintf(value, "{\"success\": false}");}
    } else if(strncmp(operation, "auth_parse", strlen("auth_parse")) == 0) {
        char *inputBuffer = (char *)malloc(20000*sizeof(char));
        struct param_auth* output = (struct param_auth *)malloc(sizeof(struct param_auth));
        
        memset(inputBuffer, 0, 20000*sizeof(char));
        memset(output, 0, sizeof(struct param_auth));

        read(STDIN_FILENO, inputBuffer, 20000*sizeof(char));
        if(!auth_parse(&output, inputBuffer)) error_out(ERROR_LIBPROJECT);
    } else if(strncmp(operation, "auth_gen", strlen("auth_gen")) == 0) {
        if(strlen(params) != SIZE_PHYSICALADDR) {
            error_out(ERROR_PAIRGEN);
        }
        char address[13];
        char *keyBuffer;
        char *vendorKey = (char*) malloc(20000*sizeof(char));
        char *stationKey = (char*) malloc(20000*sizeof(char));
        size_t vendorKeySize, stationKeySize;

        keyBuffer = (char *)malloc(20000*sizeof(char));
        memset(keyBuffer, 0, 20000*sizeof(char));
        read(STDIN_FILENO, keyBuffer, 20000*sizeof(char));

        memset(vendorKey, 0, 20000*sizeof(char));
        memset(stationKey, 0, 20000*sizeof(char));

        sprintf(address, "%s", params);

        free(keyBuffer);
    } else {
        error_out(ERROR_INPUT);
    }
    /*handle = dlopen("/usr/lib/libproject.so", RTLD_LAZY);
    action = dlsym(handle, "crypto");*/

    //printf("{\"value\": %s}", value);
    sprintf(resolved->output_json, "{\"value\": %s}", value);
    //return EXIT_SUCCESS;
}

void eg_complete(napi_env env, napi_status status, void* data) {
  promise_data_t *resolved = (promise_data_t *)data;
  napi_value argv[1];
  status = napi_create_string_utf8(env, resolved->output_json, NAPI_AUTO_LENGTH, argv);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to create resloved message.");
  }

  napi_value global;
  status = napi_get_global(env, &global);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to get global data.");
  }

  promise_data_t* c = (promise_data_t*)data;

  if (1 == 1) {
    status = napi_resolve_deferred(env, c->deferred, argv[0]);
  } else {
    status = napi_reject_deferred(env, c->deferred, argv[0]);
  }
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to create promise result.");
  }

  napi_delete_async_work(env, c->work);
  free(c);
}


napi_value eg_promise(napi_env env, napi_callback_info info) {
  napi_status status;
  napi_value promise;

  size_t argc = 1;
  napi_value argv[1];
  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  printf("\n%X\n", argv[0]);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to get javacript data.");
  }

  promise_data_t* c = (promise_data_t*)malloc(sizeof(promise_data_t));
  memset(c, 0, sizeof(promise_data_t));
  size_t data_len;
  napi_get_buffer_info(env, argv[0], (void **)&c->data, &data_len);
  //napi_get_value_int32(env, argv[0], &c->data);

  status = napi_create_promise(env, &c->deferred, &promise);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to create promise.");
  }

  napi_valuetype valtype;
  napi_typeof(env, argv[0], &valtype);
  if (valtype != napi_object) {
    napi_value str[1];
    napi_create_string_utf8(env, "Promise rejected: Argument is not an object.", NAPI_AUTO_LENGTH, str);
    napi_reject_deferred(env, c->deferred, str[0]);
    free(c);  
  }
  else {
    napi_value resource_name;
    napi_create_string_utf8(env, "generator:promise", -1, &resource_name);
    napi_create_async_work(env, NULL, resource_name, eg_execute, eg_complete, c, &c->work);
    napi_queue_async_work(env, c->work);
  }

  return promise;  
}


napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = {
    {
      .utf8name = "generator",
      .method = eg_promise,
      .getter = NULL,
      .setter = NULL,
      .value = NULL,
      .attributes = napi_default,
      .data = NULL
    }
  };
  napi_status status = napi_define_properties(env, exports, 1, desc);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to populate exports");
  }

  napi_value sizeof_in;
  status = napi_create_int32(env, sizeof(struct shared), &sizeof_in);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to get the input size");
  }
  status = napi_set_named_property(env, exports, "sizeof_in", sizeof_in);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to populate exports");
  }

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)