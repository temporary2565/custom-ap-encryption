#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <dlfcn.h>
#include <pthread.h>
#include <semaphore.h>
#include <time.h>

#include "universal.h"
#include "sha3.h"

typedef struct param_time {
    int operation;
    char hash[129];
    unsigned int variance;
} param_time_t;

int main(int argcc, char *argv[]) {
    /*printf("{size: %ld,len: %ld}", sizeof(char), strlen(strtok(argv[1], ",")));
    void **params;
    *params = malloc(sizeof(param_time_t));
    memset(*params, 0, sizeof(param_time_t));
    strcpy((*params).hash, argv[1]);
    printf("%s\n", (*params).hash);
    puts("here");*/
    /*struct timeval t;
    clock_gettime(CLOCK_REALTIME, &t);
    printf("%ld", t.tv_usec);
    sha3_context c;
    sha3_Init512(&c);
    sha3_SetFlags(&c, SHA3_FLAGS_KECCAK);
    char *buff = malloc(30);
    memset(buff, 0, 30);
    u_int8_t *hash = malloc(129*sizeof(char));
    memset(hash, 0, 129);
    strcpy(buff, "strer");
    sha3_Update(&c, buff, 5);
    hash = sha3_Finalize(&c);
    for(int i=0; i<512/8; i++) {
	    char s[3];
	    byte_to_hex(hash[i],s);
	    printf("%s", s);
    }*/
    unsigned int argc = 0;
    char *tmp = "ewgrefe,rfe,,rv,erv,r,";
    for (argc = 0;tmp[argc]; tmp[argc]==',' ? argc++ : *(tmp)++);
    printf("%d%s", argc, tmp);
    return 0;
}
