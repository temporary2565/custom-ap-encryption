#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "aes.h"

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
#include <openssl/pem.h>

int main(void) {
    char *plaintext = malloc(64);
    char *ciphertext = malloc(64);
    char *passphrase = malloc(12);
    memset(plaintext, 0, 64);
    memset(passphrase, 0, 12);

    uint8_t *key = (uint8_t *)malloc(sizeof(uint8_t));
    uint8_t *iv = (uint8_t *)malloc(sizeof(uint8_t));
    memset(key, 0, sizeof(uint8_t));
    memset(iv, 0, sizeof(uint8_t));

    strcpy(plaintext, "fucjsdvergst gregsreb kjjnhoubuj");
    strcpy(passphrase, "msndgenpal\0");

    struct AES_ctx ctx;
    struct AES_ctx ctxd;

    EVP_BytesToKey(EVP_aes_256_cbc(), EVP_sha1(), NULL, (unsigned char*)passphrase, strlen(passphrase), 1, key, iv);
    AES_init_ctx_iv(&ctx, key, iv);
    AES_CBC_encrypt_buffer(&ctx, plaintext, 64);

    printf("%s\n", plaintext);

    AES_init_ctx_iv(&ctxd, key, iv);
    AES_CBC_decrypt_buffer(&ctxd, plaintext, 64);

    printf("%s\n", plaintext);

    return 0;
}