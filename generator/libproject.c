#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <sys/types.h>
#include <stddef.h>
#include <time.h>
#include <math.h>
#include <pthread.h>

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

struct bt_tree *global_time_tree;
u_int64_t globaltime;
char *globaltime_hash;

void error_out(unsigned int err) {
    //printf("{\"error_code\": \"%X\", \"error\": true}", err);
    exit(EXIT_FAILURE);
}

//#include "libproject.h"
#include "sha3.h"
#include "aes.h"
#include "definitions.h"
#include "universal.h"
#include "bruteforce.h"
#include "rsa.h"
#include "base85.h"

#include "sha3.c"
#include "aes.c"

char* generate_time() {
    struct timeval tmp;
    sha3_context c;
    u_int8_t *hash = malloc(sizeof(u_int8_t));
    u_int64_t now;
    char *buff = malloc(30*sizeof(char));
    char *hashstring = malloc(129*sizeof(char));
    char *nowstring = malloc(129*sizeof(char));

    memset(buff, 0, 30);
    memset(hash, 0, sizeof(u_int8_t));
    memset(hashstring, 0, 129*sizeof(char));
    memset(nowstring, 0, 129*sizeof(char));

    //clock_gettime(CLOCK_REALTIME, &tmp);
    //+ (int)tmp.tv_usec;
    now = floor(time(NULL) / 60);
    sprintf(nowstring, "%lu", now);
    sha3_Init512(&c);
    sha3_SetFlags(&c, SHA3_FLAGS_KECCAK);
    strcpy(buff, nowstring);
    sha3_Update(&c, buff, strlen(nowstring));
    hash = sha3_Finalize(&c);
    for(int i=0; i<512/8; i++) {
        char s[3];
        byte_to_hex(hash[i],s);
        strcat(hashstring, s);
    }
    hashstring[128] = '\0';
    return hashstring;
}

u_int64_t parse_time(struct param_time in) {
    global_time_tree = (bt_tree_t *)malloc(sizeof(bt_tree_t));
    globaltime = floor(time(NULL) / 60);
    globaltime_hash = (char *)malloc(sizeof(char)*129);

    sha3_context c;
    char *buff = malloc(30*sizeof(char));
    memset(buff, 0, 30*sizeof(char));
    u_int8_t *hash = malloc(sizeof(u_int8_t));
    memset(hash, 0, sizeof(u_int8_t));
    char *hashstring = malloc(129*sizeof(char));
    memset(hashstring, 0, 129*sizeof(char));
    pthread_t th[4];
    char globaltime_string[30];

    sha3_Init512(&c);
    sha3_SetFlags(&c, SHA3_FLAGS_KECCAK);
    sprintf(globaltime_string, "%lu", globaltime);
    strcpy(buff, globaltime_string);
    sha3_Update(&c, buff, strlen(buff));
    hash = sha3_Finalize(&c);
    for(int i=0; i<512/8; i++) {
        char s[3];
        byte_to_hex(hash[i],s);
        strcat(hashstring, s);
    }
    hashstring[128] = '\0';
    strcpy(globaltime_hash, hashstring);

    bool *done = malloc(sizeof(bool));
    done = false;
    struct param_bruteforce *out = (struct param_bruteforce *) malloc(sizeof(struct param_bruteforce));
    struct param_bruteforce *out_reverse = (struct param_bruteforce *) malloc(sizeof(struct param_bruteforce));
    u_int64_t *ret = (u_int64_t *)malloc(sizeof(u_int64_t));
    u_int64_t *ret_reverse = (u_int64_t *)malloc(sizeof(u_int64_t));
    memset(ret, 0, sizeof(u_int64_t));
    memset(ret_reverse, 0, sizeof(u_int64_t));

    out->params = in;
    out->reverse = false;
    out->done = (void*)done;
    out_reverse->params = in;
    out_reverse->reverse = true;
    out_reverse->done = (void*)done;
    pthread_create(&th[0], NULL, BF_crack_thread, (void*)out);
    pthread_create(&th[1], NULL, BF_crack_thread, (void*)out_reverse);
    pthread_join(th[1], (void *)ret_reverse);
    pthread_join(th[0], (void *)ret);
    free(buff);
    free(hashstring);
    if((u_int64_t)ret != 0) {
        return (u_int64_t)*ret;
    } else if((u_int64_t)ret_reverse != 0) {
        return (u_int64_t)*ret_reverse;
    } else {
        return 0;
    }
}

u_int8_t pair_gen(char **return_buffer, char mac[], char key[], char vendor_key[], char **return_challenge) {
    u_int32_t *length, *length2, *base64_length, *base64_length2;
    RSA* pubkey_rsa;
    char challenge[14], *protochallenge, *out, *pubkey;
    unsigned char *ciphertext, *ciphertext2;
    if(!RAND_bytes(challenge, sizeof(challenge))) error_out(ERROR_LIBPROJECT);

    struct param_pair pair;
    sprintf(pair.mac, "%s", mac);
    memcpy(&pair.challenge, &challenge, sizeof(challenge));
    puts("test1");
    out = malloc(100000*sizeof(char));
    memset(out, 0, 100000*sizeof(char));
    unsigned char *bytes = (unsigned char *)malloc(sizeof(pair)+6*sizeof(char));
    memset(bytes, 0, sizeof(pair)+6*sizeof(unsigned char));
    sprintf((char*)bytes, "pair__");
    memcpy(bytes+6*sizeof(unsigned char), &pair, sizeof(pair));
    puts("broekn");
    length = malloc(sizeof(unsigned int));
    length2 = malloc(sizeof(unsigned int));
    puts("dd");
    base64_length = (u_int32_t *)malloc(sizeof(u_int32_t));
    memset(length, 0, sizeof(u_int32_t));
    puts("3.1");
    memset(length2, 0, sizeof(u_int32_t));
    memset(base64_length, 0, sizeof(u_int32_t));
    puts("test 3.6");

    // pubkey = (char*)malloc((strlen(key)+1)*sizeof(char));
    // memset(pubkey, 0, (strlen(key)+1)*sizeof(char));
    /*memcpy(pubkey, &key[0], (strlen(key)+1)*sizeof(char));
    pubkey_rsa = getPublicKey(key);*/
    ciphertext = (unsigned char *)malloc(300000*sizeof(unsigned char));
    memset(ciphertext, 0, 300000*sizeof(char));
    ciphertext2 = (unsigned char *)malloc(300000*sizeof(unsigned char));
    memset(ciphertext2, 0, 300000*sizeof(char));

    puts("test3");
    encryptRSA(&ciphertext, length, pubkey_rsa, bytes);
    pubkey_rsa = getPublicKey(vendor_key);

    protochallenge = (char *)malloc(60*sizeof(char));
    memset(protochallenge, 0, 60*sizeof(char));
    encryptRSA(&ciphertext2, length2, pubkey_rsa, ciphertext);
    RSA_free(pubkey_rsa);
    puts("out-1");
    encode_85(out, ciphertext2, *length2);
    puts("out");
    printf("df%s\n", protochallenge);
    *return_buffer = out;
    printf("%s\n", protochallenge);
    encode_85(protochallenge, challenge, sizeof(challenge));
    printf("%s\n", protochallenge);
    **return_challenge = protochallenge;
    printf("%s\n", protochallenge);
    puts("out+3");
    return 0;
    /*struct AES_ctx ctx;
    struct AES_ctx ctxd;

    EVP_BytesToKey(EVP_aes_256_cbc(), EVP_sha1(), NULL, (unsigned char*)passphrase, strlen(passphrase), 1, key, iv);
    AES_init_ctx_iv(&ctx, key, iv);
    AES_CBC_encrypt_buffer(&ctx, plaintext, 64);*/
}

u_int64_t auth_gen(char mac[], char key[]) {
    /*u_int32_t *length;
    char challenge[14], *ciphertext, *out;
    if(!RAND_bytes(challenge, sizeof(challenge))) error_out(ERROR_LIBPROJECT);

    struct param_pair pair;
    sprintf(pair.mac, "%s", mac);
    memcpy(&pair.challenge, &challenge, sizeof(challenge));

    unsigned char *bytes = (unsigned char *)malloc(sizeof(pair)+6*sizeof(char));
    memset(bytes, 0, sizeof(pair)+6*sizeof(char));
    sprintf((char*)bytes, "pair__");
    memcpy(bytes+6*sizeof(char), &pair, sizeof(pair));

    pubkey = (char*)malloc((strlen(key)+1)*sizeof(char));
    memset(pubkey, 0, (strlen(key)+1)*sizeof(char));
    memcpy(pubkey, &key[0], (strlen(key)+1)*sizeof(char));
    pubkey_rsa = getPublicKey();
    ciphertext = malloc(2048*sizeof(char));
    memset(ciphertext, 0, 2048*sizeof(char));
    out = malloc(8192*sizeof(char));
    memset(out, 0, 8192*sizeof(char));
    encryptRSA(&ciphertext, length, pubkey_rsa, bytes);
    out = base64encode(ciphertext, *length);
    printf("%s", out);
    return 0;*/
    /*struct AES_ctx ctx;
    struct AES_ctx ctxd;

    EVP_BytesToKey(EVP_aes_256_cbc(), EVP_sha1(), NULL, (unsigned char*)passphrase, strlen(passphrase), 1, key, iv);
    AES_init_ctx_iv(&ctx, key, iv);
    AES_CBC_encrypt_buffer(&ctx, plaintext, 64);*/
}

bool pair_parse(param_pair_t **return_buffer, char input[], char key[], char vendor_key[]) {
    u_int32_t *length;
    RSA* pubkey_rsa; // is private key
    char *decoded, *check;
    struct param_pair *pair = (param_pair_t *)malloc(sizeof(param_pair_t));
    unsigned char *intermidiate_plaintext, *plaintext;
    decoded = malloc(100000000*sizeof(char));
    memset(decoded, 0, 100000000*sizeof(char));
    decode_85(decoded, input, strlen(input));
    plaintext = malloc(30000*sizeof(char));
    intermidiate_plaintext = malloc(30000*sizeof(char));
    length = malloc(sizeof(u_int32_t));
    memset(length, 0, sizeof(u_int32_t));
    memset(plaintext, 0, 30000*sizeof(char));
    memset(intermidiate_plaintext, 0, 30000*sizeof(char));

    pubkey_rsa = getPrivateKey(vendor_key);
    decryptRSA(&intermidiate_plaintext, pubkey_rsa, decoded);
    pubkey_rsa = getPrivateKey(key);
    decryptRSA(&plaintext, pubkey_rsa, intermidiate_plaintext);
    RSA_free(pubkey_rsa);
    printf("%s", plaintext);
    
    check=malloc(strlen("pair__")+1);
    memset(check, 0, strlen("pair__")+1);
    memcpy(check, &plaintext[0], strlen("pair__"));
    if(strncmp(check, plaintext, strlen("pair__")) != 0) {
        return false;
    }

    memset(pair, 0, sizeof(param_pair_t));
    memcpy(pair, &plaintext[strlen("pair__")], sizeof(param_pair_t));

    *return_buffer = pair;
    return true;
}

bool auth_parse(struct param_auth* ret, char *in) {
    return false;
}