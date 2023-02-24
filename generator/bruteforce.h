/*void *BF_populate_list(struct param_time params, bool reverse, void *done) {
    struct bt_tree *ptr = &global_time_tree;
    bool *donebool = (bool *)&done;
    bool first = true;
    for(int i=0;i>=-(params.diff*60) && i<(params.diff*60);i++) {
        if(!(*donebool)) {
            if(reverse && first) {
                ptr->lower = malloc(sizeof(struct bt_tree));
                memset(ptr->lower, 0, sizeof(struct bt_tree));
                ptr->lower->higher = ptr;
                ptr = ptr->lower;
                i = -1;
            }
            first = false;
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
            now = reverse ? globaltime - i : globaltime + i;
            sprintf(nowstring, "%ld", now);
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
            ptr->index = i;
            ptr->time = now;
            hashstring[128] = '\0';
            sprintf(global_time_tree->hash, "%s", hashstring);
            printf("%s\n", ptr->hash);
            if(reverse) {
                ptr->lower = malloc(sizeof(struct bt_tree));
                memset(ptr->lower, 0, sizeof(struct bt_tree));
                ptr->lower->higher = ptr;
                i-=2;
            } else {
                ptr->higher = malloc(sizeof(struct bt_tree));
                memset(ptr->higher, 0, sizeof(struct bt_tree));
                ptr->higher->lower = ptr;
            }
            ptr = reverse ? ptr->lower : ptr->higher;
        } else {
            break;
        }
    }
}

void *BF_crack(struct param_time params, bool reverse, void *done) {
    struct bt_tree *ptr = (struct bt_tree *)&global_time_tree;
    bool *donebool = (bool *)&done;
    bool first = true;
    u_int64_t now;
    for(int i=0;i>=-(params.diff*60) && i<(params.diff*60);i++) {
        if(reverse && first) {
            i=-1;
        }
        first = false;
        if(!(*donebool)) {
            for(;;) {
                if(ptr != NULL) {
                    printf("%s\n", ptr->hash);
                    if(strncmp(ptr->hash, globaltime_hash, strlen(globaltime_hash)) == 0) {
                        donebool = true;
                        return ptr->time;
                    }
                    break;
                }
            }
            if(reverse) {
                i-=2;
                ptr = &ptr->lower;
            }
        } else {
            break;
        }
    }
    return 0;
}

void *BF_populate_list_thread(void *ptr) {
    struct param_bruteforce params = *(struct param_bruteforce *)ptr;
    BF_populate_list(params.params, params.reverse, params.done);
}
*/

u_int64_t BF_crack(struct param_time params, bool reverse, void *done) {
    bool *donebool = (bool *) done;
    bool first = true;
    int diff = params.diff;
    int i = 0;
    char *input = malloc(129*sizeof(char));
    memset(input, 0, 129*sizeof(char));
    sprintf(input, "%s", params.hash);
    for(i=0;i>=-(diff*60) && i<(diff*60);i++) {
        if(donebool) break;
        if(reverse && first) {
            i=-1;
        }
        first = false;
        u_int64_t now;
        u_int8_t *hash = (u_int8_t *)malloc(sizeof(u_int8_t)*129);
        char *hashstring = malloc(129*sizeof(char));
        char *nowstring = malloc(129*sizeof(char));
        memset(hashstring, 0, 129*sizeof(char));
        memset(nowstring, 0, 129*sizeof(char));
        sha3_context c;
        printf("%s\n", input);

        now = globaltime - i;
        sprintf(nowstring, "%lu", now);
        sha3_Init512(&c);
        sha3_SetFlags(&c, SHA3_FLAGS_KECCAK);
        sha3_Update(&c, nowstring, strlen(nowstring));
        hash = sha3_Finalize(&c);
        for(int i=0; i<512/8; i++) {
            char s[3];
            byte_to_hex(hash[i],s);
            strcat(hashstring, s);
        }
        hashstring[128] = '\0';

        if(strncmp(hashstring, input, strlen(input)) == 0) {
            donebool = true;
            return now;
        }

        free(hashstring);
        free(nowstring);
        if(reverse) i-=2;
    }
    free(input);
    return 0;
}

void *BF_crack_thread(void *ptr) {
    struct param_bruteforce *params = (struct param_bruteforce *)ptr;
    u_int64_t *now = malloc(sizeof(u_int64_t));
    now = BF_crack(params->params, params->reverse, params->done);
    printf("%lu - pm", now);
    return (void*)now;
}