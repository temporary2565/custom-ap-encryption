#ifndef __LIBPROJECT_H__
#define __LIBPROJECT_H__
char* generate_time();
u_int64_t parse_time(struct param_time in);
u_int8_t pair_gen(char **return_buffer, char mac[], char key[], char vendor_key[], char **return_challenge);
bool pair_parse(param_pair_t **return_buffer, char input[], char key[], char vendor_key[]);
bool auth_parse(struct param_auth* ret, char *in);
#endif