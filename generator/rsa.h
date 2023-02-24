#define PADDING RSA_PKCS1_PADDING
#define KEYSIZE 32
#define IVSIZE 32
#define BLOCKSIZE 256
#define SALTSIZE 8

RSA *getPublicKey(char input[]) {
    BIO *bioc = BIO_new_mem_buf((void *)input, -1);
    BIO_set_flags(bioc, BIO_FLAGS_BASE64_NO_NL);

    RSA *rsaPubKey = PEM_read_bio_RSA_PUBKEY(bioc, NULL, NULL, NULL);
    //if(!rsaPubKey) error_out(ERROR_LIBPROJECT);
    return rsaPubKey;
}

RSA *getPrivateKey(char input[]) {
    BIO *bioc = BIO_new_mem_buf((void *)input, -1);
    BIO_set_flags(bioc, BIO_FLAGS_BASE64_NO_NL);

    RSA *rsaPrivKey = PEM_read_bio_RSAPrivateKey(bioc, NULL, NULL, NULL);
    //if(!rsaPrivKey) error_out(ERROR_LIBPROJECT);
    return rsaPrivKey;
}

void encryptRSA(char **return_buffer, u_int32_t *length, RSA *key, char data[]) {
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
    *length = (u_int32_t)resultLen;
}

void decryptRSA(char **returned_buffer, RSA *key, char data[]) {
    const unsigned char *encrypted = (const unsigned char *)data;
    int rsaLen = RSA_size(key);
    unsigned char *ed = (unsigned char *)malloc(rsaLen);
    memset(ed, 0, rsaLen);
    int resultLen = RSA_private_decrypt(rsaLen, encrypted, ed, key, PADDING);
    if(resultLen == -1) {
    //    error_out(ERROR_LIBPROJECT);
    }
    *returned_buffer = (char *)ed;
}