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

#include "definitions.h"
#include "universal.h"

param_time_t params_time;
char value[1024];

void *handle;
char* (*generate_time)();
char* (*parse_time)(struct param_time);
u_int8_t* (*pair_gen)(char*, char*, char*, char*);
char* (*pair_parse)(struct param_pair **, char*);
char* (*auth_gen)(char *, char*);
char* (*auth_parse)(struct param_auth **, char*);
char* (*eauth_gen)(struct param_auth **, char*);
char* (*eauth_parse)(struct param_auth **, char*);



void error_out(unsigned int err);

int main(int argc, char ** argv) {
    signal(SIGPIPE, SIG_IGN);
    char params[512], operation[32];

    handle = dlopen("/usr/lib/libproject.so", RTLD_LAZY);
    generate_time = dlsym(handle, "generate_time");
    parse_time = dlsym(handle, "parse_time");
    pair_gen = dlsym(handle, "pair_gen");


    if(argc < 3) error_out(ERROR_INPUT);
    if(strlen(argv[1]) > 31) error_out(ERROR_INPUT);
    sprintf(operation, "%s", argv[1]);
    if(strlen(argv[2]) > 511) error_out(ERROR_INPUT);
    sprintf(params, "%s", argv[2]);
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
            printf("%d\n", (int)atoi(tmp));
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
        char *output;
        char *vendorKey = (char*) malloc(20000*sizeof(char));
        char *stationKey = (char*) malloc(20000*sizeof(char));
        size_t vendorKeySize, stationKeySize;

        keyBuffer = (char *)malloc(20000*sizeof(char));
        memset(keyBuffer, 0, 20000*sizeof(char));
        read(STDIN_FILENO, keyBuffer, 20000*sizeof(char));

        memset(vendorKey, 0, 20000*sizeof(char));
        memset(stationKey, 0, 20000*sizeof(char));

        sprintf(address, "%s", params);
        pair_gen(&output, address, keyBuffer, keyBuffer);

        sprintf(value, "{\"data\": \"%s\"}", output);

        free(keyBuffer);
    } else if(strncmp(operation, "pair_parse", strlen("pair_parse")) == 0) {
        char *inputBuffer = (char *)malloc(20000*sizeof(char));
        struct param_pair* output = (struct param_pair *)malloc(sizeof(struct param_pair));
        memset(inputBuffer, 0, 20000*sizeof(char));
        memset(output, 0, sizeof(struct param_pair));

        read(STDIN_FILENO, inputBuffer, 20000*sizeof(char));
        if(!pair_parse(&output, inputBuffer)) {
            error_out(ERROR_LIBPROJECT);
        }

        

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

    printf("{\"value\": %s}", value);
    return EXIT_SUCCESS;
}
