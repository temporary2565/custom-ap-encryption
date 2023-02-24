CC=clang
CFLAGS=-Wall -g
BINS=libproject.o libproject.a

all: $(BINS)

%.o: %.c
	$(CC) $(CFLAGS) -c -fPIC sha3.c aes.c $^ -pthread -lm -lz -lssl -lcrypto
#	sudo cp ./libproject.so /usr/lib/libproject.so

%.a: %.o
	ar rcs $@ $^

#gen.out: main.c
#	$(CC) $(CFLAGS) -o $@ $^ -pthread -ldl -lm -v

clean:
	rm -rf $(BINS)
	rm -rf *.o *.a
