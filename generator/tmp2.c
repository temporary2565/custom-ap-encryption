#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <stdbool.h>
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

#include "definitions.h"

#define PADDING RSA_PKCS1_PADDING
#define KEYSIZE 32
#define IVSIZE 32
#define BLOCKSIZE 256
#define SALTSIZE 8

const char privkey[6500] = "-----BEGIN RSA PRIVATE KEY-----\n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\n-----END RSA PRIVATE KEY-----";
const char ppubkey[1800] = "-----BEGIN PUBLIC KEY-----\nMIIEIjANBgkqhkiG9w0BAQEFAAOCBA8AMIIECgKCBAEAqC27CVBRL70522x31M9n\n1arnJABTJ4M2vJEpZWiWKP4H/faa23JmZI+pz88y4NTy1JRA/mmxKYG/i9iOpA74\nv0qIEku5zdW+4urYxUu8z8i6VSFTRZAy9p8IMAYWGZQ5AwCCK9AMX4USZ7ZS8Fmu\nKkRN3D518GWDExmwBHOKvoiYNjjuHQzedwimLBsaCEuSPFaf5+HJ1Na+H9e8mBAp\nSbFY1C4wCqB9+ohVdLUqlXAB9gbJZaeaudAOEQHnMLW6jd/6+97khV0OQyiH2lJW\nYkbnzplA3PFKum82GEvu8Dy2iH3FCpXs5ezdwkmCH4zFvXuocJAh04epnuVHcGs0\n9kAt6ain6FhVkIjAVtHhd4aImPcz9HKFGUVsYgEDCJ7PXtUhhI+K8oyWNuoI+vE5\noha2jF+uc3ef0tXnclkES3luXNfqOpUctxU2299yy1Iz8UXxUcbAmniD0NsAfeLp\n/jq3LK6nQ1I2kFOwvPyx+jmHNyE+EokLgkF48g9CHWk9GBiEEqOUuDeCgEyWrNnw\nwIl1fq6Gdl4H7nkdT+6/vVmvhtZliLzjmnKLHUVkmw7E3aUFc+eS8NbdL1fP+Q3I\nS/A9hArhdx+bCb1ANbDwb5HcoUBTwxmo36cyU3WNPbNNPHP5ewy8X4Cwdx54yRbf\nOuyv4WJvFp2agkD2kLZsjdsQGoA/mq9KyPgN/ERgS1+E0ke+5UVIPmYKOxzwRsD+\nDvFPEI3gXDVm4nH+1LzkorkJADNbwJU4qD5VAFmqv4OGjZYbx7W0z0Nq0rocqntx\nHh31GISChjKS2aI47sbIMig5nrOAqp91xcdvM/+ftlx8/wF11PhPZZlNjdWto7+v\nEi/tBObqObwd8KaoyQIJcZdu1rr9+oKpNxqHcK2lXVDSQNsrr6HJRjjBt/E7o9bu\n8Kdht9B1u+B5gWnZx1DdP6bRO27uiSACFuOkGiFgep3785VCe8D+16Fc6InV/PM/\nUGCWpUkVwiHoEDzlnbl2x27oXLoBcxByu/vTWqZgVgjSFA0YLr/w9C9cMDnGarrP\nebZDhBWthPPff39SHD1nNH5J1I7JxkYgVMlSDgorjYl2adEkn1rRaZqSmjkSjyzh\n+6swQvHmJ6j7EymN5zqJVdxgadnw1fJ6yQc+k24zh6BqxegrMatWsYo55NZyH0A2\nTSUSeFAINItOoIXAwTl3xwEZVhmOXTJHcslAeTGfg7UNP1ZhUl8AAs734ByCmdW9\nSkY4x/Cajn/rsZpKhMhzAIAOvEGzPvyTge4/pPIUZLdrLF3e1Q19sQruZOnIQAyz\n3Z7y6qQZ5lwP5A0BfbUB1cVKPmHEEWq4pxIlcqMcM4m32m/LLwqNM7s9YYriXmjz\n7QIDAQAB\n-----END PUBLIC KEY-----";

RSA* pubkey_rsa;
RSA* privkey_rsa;

void test_rsa();
void test_aes();
void initialize();
void finalize();
RSA *getPublicKey();
RSA *getPrivateKey();

void encryptRSA(char **return_buffer, RSA *key, char data[]) {
    char *buffer;
    size_t data_size = strlen(data);
    const unsigned char* str = (const unsigned char *)data;
    int rsaLen = RSA_size(key);
    unsigned char* ed = (unsigned char *) malloc(rsaLen);
    memset(ed, 0, rsaLen);
    int resultLen = RSA_public_encrypt(data_size, (const unsigned char*)str, ed, key, PADDING);
    if(resultLen == -1) exit(1);
    buffer = malloc(resultLen+1);
    memset(buffer, 0, resultLen);
    buffer = (char *)ed;
    buffer[resultLen] = '\0';
    *return_buffer = buffer;
}
void decryptRSA(char **returned_buffer, RSA *key, char data[]) {
    const unsigned char *encrypted = (const unsigned char *)data;
    //size_t data_size = strlen(data);
    int rsaLen = RSA_size(key);
    unsigned char *ed = (unsigned char *)malloc(rsaLen);
    memset(ed, 0, rsaLen);
    int resultLen = RSA_private_decrypt(rsaLen, encrypted, ed, key, PADDING);
    if(resultLen == -1) {
        exit(0);
    }
    *returned_buffer = (char *)ed;

}
void encryptAES(int *buffer_size, unsigned char **return_buffer, char passphrase[], char data[]) {
    unsigned char *salt = malloc(SALTSIZE);
    memset(salt, 0, SALTSIZE);
    unsigned char *msalt = malloc(SALTSIZE);
    memset(msalt, 0, SALTSIZE);
    RAND_bytes(salt, SALTSIZE);
    memcpy(msalt, &salt[0], SALTSIZE);
    printf(" -- %s\n", msalt);
    const int rounds = 14;

    unsigned char key[KEYSIZE];
    unsigned char iv[IVSIZE];

    int i=EVP_BytesToKey(EVP_aes_256_cbc(), EVP_sha1(), (const unsigned char *)msalt, (const unsigned char *)passphrase, strlen(passphrase), rounds, key, iv);
    printf("!! %s\n", (char *)key);
    if(i!=KEYSIZE) {
        error_out(ERROR_LIBPROJECT);
    }

    EVP_CIPHER_CTX en;
    EVP_CIPHER_CTX_init(&en);
    if(!EVP_EncryptInit_ex(&en, EVP_aes_256_cbc(), NULL, key, iv)) {
        error_out(ERROR_LIBPROJECT);
    }
    char *input = (char *)malloc(strlen(data)*sizeof(char));
    memset(input, 0, strlen(data)*sizeof(char));
    memcpy(input, &data[0], strlen(data)*sizeof(char));
    unsigned char *out;
    int len = strlen(data);

    int c_len = len + AES_BLOCK_SIZE, f_len = 0;
    unsigned char *ciphertext = (unsigned char *)malloc(c_len);

    if(!EVP_EncryptInit_ex(&en, NULL, NULL, NULL, NULL)) error_out(ERROR_LIBPROJECT);
    if(!EVP_EncryptUpdate(&en, ciphertext, &c_len, (unsigned char *)input, len)) error_out(ERROR_LIBPROJECT);
    if(!EVP_EncryptFinal(&en, ciphertext+c_len, &f_len)) error_out(ERROR_LIBPROJECT); // For bigger plaintext sizes unusable, recursion needed /s/

    out = ciphertext;

    len = c_len + f_len;
    EVP_CIPHER_CTX_cipher(&en);

    unsigned char *finished = (unsigned char *)malloc(sizeof(unsigned char)*SALTSIZE+sizeof(unsigned char)*len+6);
    memset(finished, 0, sizeof(unsigned char)*SALTSIZE+sizeof(unsigned char)*len+6);
    strcat(finished, "a637__");
    memcpy(finished+6, &msalt[0], sizeof(unsigned char)*SALTSIZE);
    memcpy(finished+sizeof(unsigned char)*SALTSIZE+6, &out[0], sizeof(unsigned char)*SALTSIZE+sizeof(unsigned char)*len+6);
    *return_buffer = malloc(sizeof(unsigned char)*SALTSIZE+sizeof(unsigned char)*len+6);
    memset(*return_buffer, 0, sizeof(unsigned char)*SALTSIZE+sizeof(unsigned char)*len+6);
    memcpy(*return_buffer, &finished[0], sizeof(unsigned char)*SALTSIZE+sizeof(unsigned char)*len+6);

    *buffer_size = sizeof(unsigned char)*SALTSIZE+sizeof(unsigned char)*len+6;

    printf("%s\n", msalt);
    printf("%s\n", input);
    printf("%s\n", *return_buffer);

    free(out);
    free(input);
    free(msalt);
}

void decryptAES(unsigned char **buffer, char passphrase[], size_t passphrase_size, unsigned char salted_data[], size_t data_size) {
    char *msalt = (char *)malloc((SALTSIZE)*sizeof(char));
    memset(msalt, 0, SALTSIZE*sizeof(char));
    char *data = (char *)malloc((data_size-6-SALTSIZE +1)*sizeof(char));
    printf("%ld %s\n", data_size, data);
    memset(data, 0, (data_size-6-SALTSIZE)*sizeof(char));
    int rounds = 14;
    unsigned char key[KEYSIZE];
    unsigned char iv[KEYSIZE];

    if(strncmp(strtok(salted_data, "_"), "a637", strlen("a637")) == 0) {
        memcpy(data, &salted_data[6+SALTSIZE], data_size-6-SALTSIZE);
        memcpy(data, &salted_data[6], SALTSIZE);
    }

    int i = EVP_BytesToKey(EVP_aes_256_cbc(), EVP_sha1(), (unsigned char *)msalt, (const unsigned char *)passphrase, strlen(passphrase), rounds, key, iv);
    if(i != KEYSIZE) {
        error_out(ERROR_LIBPROJECT);
    }
    EVP_CIPHER_CTX de;
    EVP_CIPHER_CTX_init(&de);

    if(!EVP_DecryptInit_ex(&de, EVP_aes_256_cbc(), NULL, key, iv)) error_out(ERROR_LIBPROJECT);

    int p_len = data_size-6-SALTSIZE, f_len = 0;
    unsigned char *plaintext = (unsigned char *)malloc(data_size);

    memset(plaintext, 0, data_size);

    if(!EVP_DecryptUpdate(&de, plaintext, &p_len, (unsigned char *)data, data_size-6-SALTSIZE)) error_out(ERROR_LIBPROJECT);
    if(!EVP_DecryptFinal_ex(&de, plaintext+p_len, &f_len)) ERR_print_errors_fp(stderr);

    EVP_CIPHER_CTX_cleanup(&de);
    *buffer = (char *)malloc(strlen(plaintext)*sizeof(char));
    *buffer = (char *)plaintext;

    free(data);
    free(msalt);
}

void random_bytes(char **return_buffer, size_t size) {
    unsigned char arr[size];
    RAND_bytes(arr, size);
    *return_buffer = (char *)malloc(size);
    *return_buffer = (char *)arr;
}

void write_file(char filename[], char *data, size_t data_size);

int main(void) {
    // RSA
    test_rsa();
    // AES
    test_aes();
    /*char *buffer = (char *)malloc(1024);
    encryptAES(&buffer, "pass", "text");
    printf("%s", buffer);*/
    return 0;
}

RSA *getPublicKey() {
    BIO *bioc = BIO_new_mem_buf((void *)ppubkey, -1);
    BIO_set_flags(bioc, BIO_FLAGS_BASE64_NO_NL);

    RSA *rsaPubKey = PEM_read_bio_RSA_PUBKEY(bioc, NULL, NULL, NULL);
    if(!rsaPubKey) exit(1);
    return rsaPubKey;
}

RSA *getPrivateKey() {
    BIO *bioc = BIO_new_mem_buf((void *)privkey, -1);
    BIO_set_flags(bioc, BIO_FLAGS_BASE64_NO_NL);

    RSA *rsaPrivKey = PEM_read_bio_RSAPrivateKey(bioc, NULL, NULL, NULL);
    if(!rsaPrivKey) exit(1);
    return rsaPrivKey;
}

void initialize() {
    ERR_load_CRYPTO_strings();
    OpenSSL_add_all_algorithms();
    OPENSSL_config(NULL);
}

void finalize() {
    EVP_cleanup();
    ERR_free_strings();
}

void test_rsa() {
    initialize();
    pubkey_rsa = getPublicKey();
    privkey_rsa = getPrivateKey();

    char *plain = "A man killed himself with a gun";
    char *encrypted = malloc(1024*sizeof(char));
    char *decrypted = malloc(1024*sizeof(char));
    memset(encrypted, 0, 1024*sizeof(char));
    memset(decrypted, 0, 1024*sizeof(char));

    encryptRSA(&encrypted, pubkey_rsa, plain);
    decryptRSA(&decrypted, privkey_rsa, encrypted);

    printf("%s\n%s\n-----------------------------\n", encrypted, decrypted);

    finalize();
    RSA_free(privkey_rsa);
    RSA_free(pubkey_rsa);
}

void test_aes() {
    char plain[20] = "kill yourself?";
    unsigned char *encrypted = malloc(1024*sizeof(char));
    unsigned char *decrypted = malloc(1024*sizeof(char));

    int encrypted_size = 0;

    memset(encrypted, 0, 1024*sizeof(char));
    memset(decrypted, 0, 1024*sizeof(char));

    encryptAES(&encrypted_size, &encrypted, "password", plain);
    decryptAES(&decrypted, "password", strlen("password"), encrypted, encrypted_size);

    printf("%s\n", encrypted);
    printf("%s\n", decrypted);
}
