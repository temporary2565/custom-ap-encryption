#ifndef __ERRORLIST_H__
#define __ERRORLIST_H__

// Sizes
#define SIZE_TIMEHASH 128
#define SIZE_TIMEVARIANCE 9
#define SIZE_TIMELIMIT 9
#define SIZE_DIFFICULTY 2
#define SIZE_PHYSICALADDR 12

// Errors
#define ERROR_INPUT 1
#define ERROR_TIMEGEN 2
#define ERROR_TIMEPARSE 3
#define ERROR_LIBPROJECT 4
#define ERROR_PAIRGEN 5

// Operations
#define OPERATION_TIMEGEN 2
#define OPERATION_TIMEPARSE 3

// Enums
enum difficulty
{
    DIFFICULTY_FAST = 3,
    DIFFICULTY_SLOW = 2,
    DIFFICULTY_SLOWER = 1
};

// Structs
typedef struct param_time {
    int operation;
    char hash[129];
    unsigned int variance;
    unsigned int variance_local;
    u_int64_t result;
    bool error;
    int diff;
} param_time_t;
typedef struct bt_tree {
    struct bt_tree *lower;
    int index;
    u_int64_t time;
    char hash[129];
    struct bt_tree *higher;
} bt_tree_t;
typedef struct param_bruteforce {
    param_time_t params;
    bool reverse;
    void *done;
} param_bruteforce_t;
typedef struct param_pair {
    char challenge[14];
    char mac[13];
} param_pair_t;
typedef struct param_auth {
    char challenge[14];
    char apikey[13];
    char password[64];
    char wpa2en[32];
} param_auth_t;

// Others
#define CLOCKS_PER_NS 1

#endif