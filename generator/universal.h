static void byte_to_hex(u_int8_t b, char s[23]) {
    unsigned i=1;
    s[0] = s[1] = '0';
    s[2] = '\0';
    while(b) {
        unsigned t = b & 0x0f;
        if( t < 10 ) {
            s[i] = '0' + t;
        } else {
            s[i] = 'a' + t - 10;
        }
        i--;
        b >>= 4;
    }
}

/*void error_out(unsigned int err) {
    //printf("{\"error_code\": \"%X\", \"error\": true}", err);
    exit(EXIT_FAILURE);
}*/

// Alternative way of separating strings, faster than strtok
/*char **sepstr(const char *buf, const char *sep){
    int i = 0, j = 0, k = 0, l = 0, stringCount = 0;

    while (buf[i]) i++;
    while (sep[j]) j++;
    if (j > i) return NULL;

    char **strings = malloc(0);

    while (*(buf+k)){
        if (*(buf+k) == *(sep)){
            for (l = 0; l < j; l++){
                if (*(buf+k+l) != *(sep+l)) break;
                if (l == j-1 && k != 0){
                    strings = realloc(strings, (stringCount+1)*sizeof (char *));
                    strings[stringCount] = malloc(k+1);
                    memcpy(strings[stringCount++], buf, k);
                    buf += (j + k), k = -1;
                } else if (l == j-1 && k == 0) {
                    buf += j, k = -1;
                }
            }
        }
        k++;
    }
}*/