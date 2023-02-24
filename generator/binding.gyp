{
    "targets": [{
        "target_name": "module",
        "include_dirs": [
            "<!(node -e \"require('napi-macros')\")"
        ],
        "sources": ["./main_napi.c"],
        "libraries": ["/home/m/Documents/router/generator/libproject.a", "-pthread", "-lm", "-lz", "-lssl", "-lcrypto"]
    }]
}